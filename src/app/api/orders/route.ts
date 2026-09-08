import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureBootstrap } from '@/lib/bootstrap';
import { readJson } from '@/lib/api-helpers';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import {
  buildWhatsAppUrl,
  createOrderWithRetry,
  initialStageFor,
  resolveOrderLines,
  serializeOrder,
  settleOrderStock,
  stagesDoneBefore,
  validateOrderPayload,
} from '@/lib/orders';
import { shippingDue } from '@/lib/pricing';
import { resolveDiscount } from '@/lib/coupons';
import { parseOrderStages } from '@/lib/store-settings';

/**
 * POST /api/orders — place an order.
 * Prices, names and images are resolved SERVER-SIDE from the Product table;
 * the client only submits slugs + sizes + quantities (never trusted prices).
 */
export async function POST(req: NextRequest) {
  // Rate limit: max 5 order placements per 10 minutes per IP
  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(`order_${ip}`, { max: 5, windowSeconds: 600 });
  if (!rateCheck.success) {
    return NextResponse.json(
      { ok: false, error: 'عدد المحاولات تجاوز الحد المسموح. يرجى المحاولة لاحقاً / Too many orders placed. Please try again later.' },
      { status: 429 }
    );
  }

  // Bootstrap FIRST — its actual purpose is guaranteeing the Setting row
  // exists before this handler reads it (the old post-creation call was
  // dead weight).
  await ensureBootstrap();

  // Round 19 hardening — reject oversized bodies before parsing them.
  const contentLength = Number(req.headers.get('content-length') ?? 0);
  if (contentLength > 1_000_000) {
    return NextResponse.json({ ok: false, error: 'Request too large' }, { status: 413 });
  }

  const parsedBody = await readJson(req);
  if (!parsedBody.ok) return parsedBody.res;
  const body = parsedBody.data;

  const parsed = validateOrderPayload(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', errors: parsed.errors },
      { status: 422 }
    );
  }

  // Phone debounce guard: prevent duplicate orders from the same phone within 60s
  const phoneLimit = checkRateLimit(`order_phone_${parsed.data.customer.phone}`, { max: 1, windowSeconds: 60 });
  if (!phoneLimit.success) {
    return NextResponse.json(
      { ok: false, error: 'تم استلام طلبك للتو! يرجى الانتظار دقيقة قبل إنشاء طلب جديد / An order was just received for this number. Please wait a moment.' },
      { status: 429 }
    );
  }

  try {
    // Message language for the WhatsApp hand-off (storefront UI language).
    const lang: 'en' | 'ar' =
      typeof body === 'object' && body !== null && (body as Record<string, unknown>).lang === 'ar'
        ? 'ar'
        : 'en';

    // Owner settings in one read — promo, delivery fee, transfer numbers,
    // WhatsApp number and the editable stage checklist.
    const settings = await db.setting.findUnique({ where: { id: 'singleton' } });

    // Resolve line items against the live catalog — active products only.
    const resolved = await resolveOrderLines(parsed.data.items, { requireActive: true });
    if (!resolved.ok) {
      return NextResponse.json({ ok: false, error: resolved.error }, { status: 422 });
    }
    const lines = resolved.lines;

    // Totals are computed here — the client's numbers are display-only.
    // Discount + delivery fee come from the owner's dashboard (round 13/29).
    const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0);
    // The code is re-resolved SERVER-SIDE (coupon table first, then the
    // legacy promo) — never trusted from the client.
    const discountResult = await resolveDiscount(parsed.data.promoCode ?? '', subtotal, db);
    const discount = discountResult.ok ? discountResult.discount : 0;
    const promoCode = discountResult.ok ? discountResult.code : null;
    // Flat owner-set delivery fee, waived at/above the free-shipping
    // threshold when the owner set one (round 29).
    const shipping = shippingDue(
      settings?.shippingFee ?? 60,
      subtotal,
      Number(settings?.freeShippingThreshold ?? 0)
    );
    const total = Math.max(subtotal - discount + shipping, 0);

    // ── Payment (round 15): cod | instapay | vodafone ──
    const instapayNumber = (settings?.instapayNumber ?? '').trim();
    const vodafoneNumber = (settings?.vodafoneNumber ?? '').trim();
    const method = parsed.data.paymentMethod;
    if (method === 'instapay' && !instapayNumber) {
      return NextResponse.json(
        { ok: false, error: 'InstaPay is not available right now' },
        { status: 422 }
      );
    }
    if (method === 'vodafone' && !vodafoneNumber) {
      return NextResponse.json(
        { ok: false, error: 'Vodafone Cash is not available right now' },
        { status: 422 }
      );
    }

    // Fresh orders join the owner's editable checklist: transfer payments
    // land on "مراجعة الدفع"; COD pre-checks the payment-review stage as N/A.
    const stages = parseOrderStages(settings?.orderStages);
    const initialStage = initialStageFor(method, stages);

    // Create the order (shared P2002 retry on the number collision — the
    // number is generated per attempt inside createOrderWithRetry).
    const order = await createOrderWithRetry({
      customerName: parsed.data.customer.name,
      phone: parsed.data.customer.phone,
      city: parsed.data.customer.city,
      address: parsed.data.customer.address,
      notes: parsed.data.customer.notes || null,
      items: JSON.stringify(lines),
      subtotal,
      discount,
      promoCode,
      shipping,
      total,
      paymentMethod: method,
      paymentSenderPhone: parsed.data.paymentSenderPhone,
      status: initialStage.id,
      stagesDone: JSON.stringify(stagesDoneBefore(stages, initialStage.id)),
    });

    // ── Inventory (round 16): every sale drains the stock ledger ──
    await settleOrderStock(lines, order.number);

    // ── WhatsApp opt-in (round 31, research item 6): the checkout checkbox
    // ("سيبي رقمك") adds the ordering phone to the broadcast list. Placed
    // AFTER the order row exists — a failed order must never subscribe.
    if ((body as Record<string, unknown>).subscribe === true) {
      try {
        await db.subscriber.upsert({
          where: { phone: parsed.data.customer.phone },
          create: {
            phone: parsed.data.customer.phone,
            name: parsed.data.customer.name,
            source: 'checkout',
            active: true,
          },
          update: { active: true, name: parsed.data.customer.name },
        });
      } catch (e) {
        console.error('checkout opt-in upsert failed:', e); // never block the order
      }
    }

    // ── Coupons (round 29): a redeemed dashboard coupon burns one use.
    // Atomic guard keeps concurrent orders from overshooting usageLimit.
    if (discountResult.ok && discountResult.source === 'coupon' && discountResult.couponId) {
      try {
        await db.coupon.updateMany({
          where: {
            id: discountResult.couponId,
            OR: [{ usageLimit: null }, { usedCount: { lt: db.coupon.fields.usageLimit } }],
          },
          data: { usedCount: { increment: 1 } },
        });
      } catch (e) {
        console.error('coupon usage increment failed:', e);
      }
    }

    // WhatsApp hand-off — the structured order goes to the owner's number
    // (editable from the dashboard). Empty number → no URL, checkout proceeds.
    let whatsappUrl: string | undefined;
    if (settings?.whatsappNumber) {
      whatsappUrl = buildWhatsAppUrl(serializeOrder(order), settings.whatsappNumber, lang);
    }

    return NextResponse.json(
      {
        ok: true,
        order: serializeOrder(order),
        // Payment hand-off data for the checkout success panel (round 15):
        // the transfer numbers the customer copies, plus the amount.
        payment: {
          method,
          amount: total,
          instapayNumber: method === 'instapay' ? instapayNumber : '',
          vodafoneNumber: method === 'vodafone' ? vodafoneNumber : '',
        },
        ...(whatsappUrl ? { whatsappUrl } : {}),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/orders failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Could not place your order. Please try again.' },
      { status: 500 }
    );
  }
}
