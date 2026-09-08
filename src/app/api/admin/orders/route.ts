import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureBootstrap } from '@/lib/bootstrap';
import { guard, readJson } from '@/lib/api-helpers';
import { shippingDue } from '@/lib/pricing';
import {
  createOrderWithRetry,
  initialStageFor,
  resolveOrderLines,
  serializeOrder,
  settleOrderStock,
  stagesDoneBefore,
  stagesUpTo,
  stripPhoneChars,
  validateOrderPayload,
} from '@/lib/orders';
import { PAYMENT_METHODS, parseOrderStages, type PaymentMethod } from '@/lib/store-settings';

/**
 * GET /api/admin/orders?status=&q= — newest first, items decoded.
 * `q` searches order number, customer name and phone.
 */
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  try {
    await ensureBootstrap();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const q = (searchParams.get('q') || '').trim();

    const orders = await db.order.findMany({
      where: {
        ...(status && status !== 'all' ? { status } : {}),
        ...(q
          ? {
              OR: [
                { number: { contains: q } },
                { customerName: { contains: q } },
                { phone: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({ ok: true, count: orders.length, orders: orders.map(serializeOrder) });
  } catch (error) {
    console.error('GET /api/admin/orders failed:', error);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/orders — MANUAL order registration (owner request:
 * "نظام تسجيل ومتابعة الطلبات بشكل يدوي" — orders arrive on WhatsApp, the
 * owner registers them here by hand and tracks their status in the dashboard).
 *
 * Body: { customer: {...}, items: [{ slug, size?, color?, qty }], status?, discount? }
 * Prices/names/images resolve SERVER-SIDE from the Product table (inactive
 * products are allowed here — the owner may register an order for a hidden
 * piece); totals are recomputed, never trusted from the client.
 */
export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  await ensureBootstrap();

  const parsedBody = await readJson(req);
  if (!parsedBody.ok) return parsedBody.res;
  const body = parsedBody.data;

  const parsed = validateOrderPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: 'Validation failed', errors: parsed.errors }, { status: 422 });
  }

  const b = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;

  // The manual pipeline follows the owner's editable stage checklist.
  // (One Setting read feeds both the stage list and the delivery fee.)
  const settingsRow = await db.setting.findUnique({ where: { id: 'singleton' } });
  const stages = parseOrderStages(settingsRow?.orderStages);
  // Optional initial stage — a known stage id progresses the checklist up to
  // it. Default: a fresh COD order (payment review pre-checked as N/A).
  const requested = typeof b.status === 'string' ? b.status : '';
  const stageIdx = stages.findIndex((s) => s.id === requested);
  let status: string;
  let initial: string[];
  if (stageIdx >= 0) {
    status = stages[stageIdx].id;
    initial = stagesUpTo(stages, stageIdx);
  } else {
    const start = initialStageFor('cod', stages);
    status = start.id;
    initial = stagesDoneBefore(stages, start.id);
  }

  try {
    // requireActive: false — the owner may register an order for a hidden piece.
    const resolved = await resolveOrderLines(parsed.data.items, { requireActive: false });
    if (!resolved.ok) {
      return NextResponse.json({ ok: false, error: resolved.error }, { status: 422 });
    }
    const lines = resolved.lines;

    const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0);
    // Optional owner-given discount (e.g. negotiated on WhatsApp), capped at subtotal.
    const rawDiscount = Number(b.discount);
    const discount = Number.isFinite(rawDiscount)
      ? Math.min(Math.max(Math.round(rawDiscount), 0), subtotal)
      : 0;
    // Flat owner-set delivery fee, waived at/above the free-shipping
    // threshold (round 29) — same rule as the storefront checkout.
    const shipping = shippingDue(
      settingsRow?.shippingFee ?? 60,
      subtotal,
      Number(settingsRow?.freeShippingThreshold ?? 0)
    );
    const total = Math.max(subtotal - discount + shipping, 0);

    const order = await createOrderWithRetry({
      customerName: parsed.data.customer.name,
      phone: parsed.data.customer.phone,
      city: parsed.data.customer.city,
      address: parsed.data.customer.address,
      notes: parsed.data.customer.notes || null,
      items: JSON.stringify(lines),
      subtotal,
      discount,
      promoCode: null,
      shipping,
      total,
      paymentMethod:
        typeof b.paymentMethod === 'string' &&
        (PAYMENT_METHODS as readonly string[]).includes(b.paymentMethod)
          ? (b.paymentMethod as PaymentMethod)
          : 'cod',
      paymentSenderPhone:
        typeof b.paymentSenderPhone === 'string'
          ? stripPhoneChars(b.paymentSenderPhone).slice(0, 16)
          : '',
      status,
      stagesDone: JSON.stringify(initial),
      source: 'manual',
    });

    // Inventory (round 16) — manual WhatsApp/phone registrations drain stock
    // exactly like storefront orders (owner: "ومع كل اوردر بيطلع بينقص").
    await settleOrderStock(lines, order.number);

    return NextResponse.json({ ok: true, order: serializeOrder(order) }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/orders failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not register the order' }, { status: 500 });
  }
}
