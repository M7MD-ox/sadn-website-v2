import { Prisma, type Order } from '@prisma/client';
import { db } from '@/lib/db';
import {
  DEFAULT_ORDER_STAGES,
  PAYMENT_METHODS,
  PAYMENT_REVIEW_STAGE,
  parseOrderStages,
  type OrderStage,
  type PaymentMethod,
} from '@/lib/store-settings';
import { formatEgp } from '@/lib/pricing';
import { EG_MOBILE_RE, stripPhoneChars } from '@/lib/eg-phone';

export type { OrderStage, PaymentMethod };

/** A single order line, as persisted in Order.items (JSON string). */
export type OrderLine = {
  slug: string;
  name: string;
  nameAr?: string;
  image: string;
  price: number;
  size: string;
  color: string;
  qty: number;
};

/** What the client is allowed to send when placing an order — slugs + quantities ONLY. */
export type OrderItemInput = {
  slug: string;
  size: string;
  color?: string;
  qty: number;
};

export type OrderCustomerInput = {
  name: string;
  phone: string;
  city: string;
  address: string;
  notes?: string;
};

export type SerializedOrder = Omit<Order, 'items' | 'stagesDone'> & {
  items: OrderLine[];
  stagesDone: string[];
};

/* ── Egyptian phone helpers (single source, round 18-3a1) ──
 *
 * 17-b/c — Egyptian mobiles only (courier requirement): 010/011/012/015,
 * optionally with a +2 / 2 country prefix. The implementations live in
 * @/lib/eg-phone (client-safe, no @prisma/client); they are re-exported
 * here so existing server imports keep compiling. Client code must import
 * from '@/lib/eg-phone' directly.
 */
export { EG_MOBILE_RE, stripPhoneChars };

/** Decode the JSON-encoded items/stages columns at the API boundary. */
export function serializeOrder(row: Order): SerializedOrder {
  let items: OrderLine[] = [];
  try {
    items = JSON.parse(row.items) as OrderLine[];
  } catch {
    items = [];
  }
  let stagesDone: string[] = [];
  try {
    const raw = JSON.parse(row.stagesDone);
    if (Array.isArray(raw)) stagesDone = raw.filter((x): x is string => typeof x === 'string');
  } catch {
    stagesDone = [];
  }
  return { ...row, items, stagesDone };
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export type ValidatedOrder = {
  customer: Required<OrderCustomerInput>;
  items: OrderItemInput[];
  promoCode?: string;
  paymentMethod: PaymentMethod;
  /** Required for instapay/vodafone — the number the transfer was sent FROM. */
  paymentSenderPhone: string;
};

/**
 * Which stage a fresh order starts from:
 *  • instapay/vodafone → "مراجعة الدفع" (payment review) — the owner must
 *    verify the transfer before anything else happens (owner directive).
 *  • cod → the review step is skipped when it is the first stage.
 */
export function initialStageFor(method: PaymentMethod, stages: OrderStage[]): OrderStage {
  const list = stages.length > 0 ? stages : DEFAULT_ORDER_STAGES;
  if (method === 'cod' && list[0]?.id === PAYMENT_REVIEW_STAGE && list.length > 1) {
    return list[1];
  }
  return list[0];
}

/** stagesDone for a checklist clicked up to and including stage index `i`. */
export function stagesUpTo(stages: OrderStage[], index: number): string[] {
  return stages.slice(0, Math.max(0, Math.min(index + 1, stages.length))).map((s) => s.id);
}

/**
 * stagesDone for a FRESH order placed at stage `stageId` — every stage BEFORE
 * it arrives pre-checked; the stage itself is still open. Shared by the
 * storefront checkout and the dashboard's manual-order default.
 */
export function stagesDoneBefore(stages: OrderStage[], stageId: string): string[] {
  const idx = stages.findIndex((s) => s.id === stageId);
  return stages.slice(0, Math.max(idx, 0)).map((s) => s.id);
}

/** Normalize a client-sent stagesDone array against the owner's stage list. */
export function normalizeStagesDone(raw: unknown, stages: OrderStage[]): string[] {
  const ids = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
  const known = new Set(stages.map((s) => s.id));
  return stages.filter((s) => ids.includes(s.id) && known.has(s.id)).map((s) => s.id);
}

/**
 * Validate + normalize the order payload. Returns a list of field errors
 * (keyed like `customer.name`) so the client can render inline messages.
 */
export function validateOrderPayload(
  body: unknown
): { ok: true; data: ValidatedOrder } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (typeof body !== 'object' || body === null) {
    return { ok: false, errors: { body: 'Invalid request body' } };
  }
  const b = body as Record<string, unknown>;
  const c = (typeof b.customer === 'object' && b.customer !== null
    ? b.customer
    : {}) as Record<string, unknown>;
  const rawItems = Array.isArray(b.items) ? b.items : [];

  // Round 19 hardening — a runaway payload can't be a real cart. Reject
  // (don't silently truncate — that would ship an order missing items).
  if (rawItems.length > 30) errors.items = 'Too many items in the order';

  // ── Customer ──
  const name = str(c.name);
  if (name.length < 2) errors['customer.name'] = 'Please enter your full name';

  const phone = stripPhoneChars(str(c.phone));
  if (!EG_MOBILE_RE.test(phone))
    errors['customer.phone'] = 'Enter a valid Egyptian mobile number (e.g. 01012345678)';

  const city = str(c.city);
  if (city.length < 2) errors['customer.city'] = 'City is required';

  const address = str(c.address);
  if (address.length < 5) errors['customer.address'] = 'Please enter your full address';

  const notes = str(c.notes).slice(0, 300);

  // ── Payment (round 15) ──
  const method = str(b.paymentMethod) as PaymentMethod;
  const paymentMethod: PaymentMethod = PAYMENT_METHODS.includes(method) ? method : 'cod';
  const senderRaw = stripPhoneChars(str(b.paymentSenderPhone));
  let paymentSenderPhone = '';
  if (paymentMethod === 'instapay' || paymentMethod === 'vodafone') {
    // 17-c — Egyptian mobiles only, same rule as the customer phone.
    if (!EG_MOBILE_RE.test(senderRaw)) {
      errors['payment.sender'] =
        'Enter a valid Egyptian mobile number (e.g. 01012345678)';
    } else {
      paymentSenderPhone = senderRaw;
    }
  }

  // ── Items ──
  const items: OrderItemInput[] = [];
  rawItems.forEach((raw, idx) => {
    if (typeof raw !== 'object' || raw === null) return;
    const r = raw as Record<string, unknown>;
    const slug = str(r.slug);
    const size = str(r.size) || 'M';
    const color = str(r.color) || 'Default';
    const qty = Math.max(1, Math.min(9, Math.round(Number(r.qty) || 0)));
    if (!slug) {
      errors[`items.${idx}.slug`] = 'Unknown item';
      return;
    }
    items.push({ slug, size, color, qty });
  });
  if (items.length === 0 && !errors['items.0.slug']) {
    errors.items = 'Your cart is empty';
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      customer: { name, phone, city, address, notes },
      items,
      promoCode: str(b.promoCode).slice(0, 24) || undefined,
      paymentMethod,
      paymentSenderPhone,
    },
  };
}

/**
 * Resolve validated order items against the live catalog: prices, names and
 * first images are taken from the Product table — the client is never
 * trusted. `requireActive` preserves each route's own semantics:
 *  • storefront checkout → only active products are sellable ("no longer
 *    available");
 *  • the owner's manual pipeline (dashboard) may register an order for a
 *    hidden piece ("Unknown product").
 */
export async function resolveOrderLines(
  items: ReadonlyArray<OrderItemInput>,
  opts: { requireActive: boolean }
): Promise<{ ok: true; lines: OrderLine[] } | { ok: false; error: string }> {
  const slugs = [...new Set(items.map((i) => i.slug))];
  const products = await db.product.findMany({
    where: { slug: { in: slugs }, ...(opts.requireActive ? { active: true } : {}) },
  });
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const lines: OrderLine[] = [];
  for (const item of items) {
    const p = bySlug.get(item.slug);
    if (!p) {
      return {
        ok: false,
        error: opts.requireActive
          ? `Product "${item.slug}" is no longer available`
          : `Unknown product "${item.slug}"`,
      };
    }
    let image = '';
    try {
      image = (JSON.parse(p.images) as string[])?.[0] ?? '';
    } catch {
      image = '';
    }
    lines.push({
      slug: p.slug,
      name: p.name,
      nameAr: p.nameAr,
      image,
      price: p.price,
      size: item.size,
      color: item.color ?? 'Default',
      qty: item.qty,
    });
  }
  return { ok: true, lines };
}

/**
 * Create an order, retrying up to 3 attempts on a "SADN-######" number
 * collision (P2002 unique constraint on Order.number). The number is
 * generated HERE — per attempt — so a collision actually gets a fresh
 * number on the retry (round 19: it used to be baked in by the caller,
 * which made every retry hit the same collision). Shared by the storefront
 * checkout and the dashboard's manual-order registration.
 */
export async function createOrderWithRetry(
  data: Omit<Prisma.OrderUncheckedCreateInput, 'number'>
): Promise<Order> {
  let order: Order | null = null;
  for (let attempt = 0; attempt < 3 && !order; attempt++) {
    try {
      order = await db.order.create({ data: { ...data, number: generateOrderNumber() } });
    } catch (e) {
      // P2002 = unique constraint violation on `number`
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') || attempt === 2) {
        throw e;
      }
    }
  }
  if (!order) throw new Error('Failed to create order');
  return order;
}

/** "SADN-######" — six digits, retried on the (unlikely) unique collision. */
function generateOrderNumber(): string {
  return `SADN-${Math.floor(100000 + Math.random() * 900000)}`;
}

/* ── Inventory auto-deduct (round 16) ───────────────────────────────────
 * Owner request: "ومع كل اوردر بيطلع بينقص من المخزن" — every placed order
 * drains Product.stock and writes an append-only StockMovement ledger row
 * (reason "order"). stock is floored at 0 (an oversell can never make it
 * negative) and the movement records the delta actually applied so the
 * ledger balance always matches Product.stock.
 */
export type StockSettleLine = {
  slug: string;
  name?: string;
  color?: string;
  qty: number;
};

export async function settleOrderStock(
  lines: ReadonlyArray<StockSettleLine>,
  orderNumber: string
): Promise<void> {
  // Collapse duplicate lines (same slug + colour — sizes share stock) so
  // each variant is settled exactly once with the summed quantity.
  const perVariant = new Map<string, { slug: string; name: string; color: string; qty: number }>();
  for (const line of lines) {
    const key = `${line.slug}__${line.color ?? ''}`;
    const prev = perVariant.get(key);
    if (prev) prev.qty += line.qty;
    else
      perVariant.set(key, {
        slug: line.slug,
        name: line.name ?? '',
        color: line.color ?? '',
        qty: line.qty,
      });
  }

  for (const { slug, name, color, qty } of perVariant.values()) {
    try {
      // Read + update run INSIDE one transaction (round 19) so two orders
      // settling the same variant can't both compute "next" from the same
      // stale stock read.
      await db.$transaction(async (tx) => {
        const product = await tx.product.findUnique({
          where: { slug },
          select: { name: true, stock: true },
        });
        if (!product) return;
        const applied = Math.min(qty, product.stock); // what actually leaves the shelf
        const nextStock = Math.max(0, product.stock - qty);
        await tx.product.update({ where: { slug }, data: { stock: nextStock } });
        if (applied > 0) {
          await tx.stockMovement.create({
            data: {
              productSlug: slug,
              productName: name || product.name,
              color,
              qty: -applied,
              reason: 'order',
              orderNumber,
            },
          });
        }
      });
    } catch (error) {
      // Stock bookkeeping must never fail an already-created order.
      console.error(`settleOrderStock failed for "${slug}":`, error);
    }
  }
}

/**
 * Statuses the owner can set from the dashboard — SINCE round 15 the pipeline
 * is the owner's EDITABLE stage checklist (Setting.orderStages); status = the
 * furthest checked stage id. PAYMENT_METHODS remains the payment vocabulary.
 */
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, { en: string; ar: string }> = {
  cod: { en: 'Cash on delivery', ar: 'الدفع عند الاستلام' },
  instapay: { en: 'InstaPay transfer', ar: 'تحويل انستا باي' },
  vodafone: { en: 'Vodafone Cash transfer', ar: 'تحويل فودافون كاش' },
};

/* ── WhatsApp order hand-off (round 10) ─────────────────────────────────
 * The owner receives every order as a structured wa.me message. The phone
 * number lives in the Setting row and is editable from the admin dashboard.
 */

/** EGP money inside the WhatsApp message — the shared formatEgp formatter. */
const waMoney = (n: number, lang: 'en' | 'ar' = 'en') => formatEgp(n, lang);

export function normalizeWhatsAppNumber(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  // Local Egyptian mobile form (0XXXXXXXXXX) → international 20XXXXXXXXXX.
  if (digits.startsWith('0') && digits.length === 11) digits = `20${digits.slice(1)}`;
  return digits;
}

export function isValidWhatsAppNumber(digits: string): boolean {
  return /^\d{8,15}$/.test(digits);
}

/** Structured, human-readable order message (EN or AR).
 *
 * Round 15: WhatsApp is the COMMUNICATION channel, never a payment method.
 * The payment line reflects the chosen method; transfer orders include the
 * sender's number and a line telling the owner a transfer screenshot follows
 * in the chat (the customer attaches it manually).
 */
export function buildWhatsAppMessage(order: SerializedOrder, lang: 'en' | 'ar'): string {
  const L = lang === 'ar';
  const line = '────────────';
  const items = order.items
    .map((it, i) => {
      const name = L && it.nameAr ? it.nameAr : it.name;
      const variant = [it.size, it.color].filter(Boolean).join(' / ');
      return `${i + 1}) ${name}\n${L ? '   المقاس/اللون' : '   Size/Color'}: ${variant} × ${it.qty} — ${waMoney(it.price * it.qty, L ? 'ar' : 'en')}`;
    })
    .join('\n');

  const method = (PAYMENT_METHODS as readonly string[]).includes(order.paymentMethod)
    ? (order.paymentMethod as PaymentMethod)
    : 'cod';
  const mLabel = PAYMENT_METHOD_LABEL[method][L ? 'ar' : 'en'];
  const isTransfer = method !== 'cod';

  const totals = [
    `${L ? 'المجموع الفرعي' : 'Subtotal'}: ${waMoney(order.subtotal, L ? 'ar' : 'en')}`,
    order.discount > 0
      ? `${L ? 'الخصم' : 'Discount'}${order.promoCode ? ` (${order.promoCode})` : ''}: -${waMoney(order.discount, L ? 'ar' : 'en')}`
      : null,
    `${L ? 'الشحن' : 'Shipping'}: ${order.shipping === 0 ? (L ? 'مجاني' : 'FREE') : waMoney(order.shipping, L ? 'ar' : 'en')}`,
    `${L ? 'الإجمالي' : 'Total'}: ${waMoney(order.total, L ? 'ar' : 'en')}`,
  ]
    .filter(Boolean)
    .join('\n');

  const payment = [
    `${L ? 'طريقة الدفع' : 'Payment'}: ${mLabel}`,
    ...(isTransfer && order.paymentSenderPhone
      ? [`${L ? 'رقم الحساب اللي حوّلت منه' : 'Transferred from'}: ${order.paymentSenderPhone}`]
      : []),
    ...(isTransfer
      ? [L ? 'دي صورة سكرين شوت لتحويل المبلغ 📸' : 'The transfer screenshot is attached in this chat 📸']
      : []),
  ].join('\n');

  const customer = [
    `${L ? 'الاسم' : 'Name'}: ${order.customerName}`,
    `${L ? 'الهاتف' : 'Phone'}: ${order.phone}`,
    `${L ? 'المحافظة' : 'City'}: ${order.city}`,
    `${L ? 'العنوان' : 'Address'}: ${order.address}`,
    order.notes ? `${L ? 'ملاحظات' : 'Notes'}: ${order.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return [
    L ? 'طلب جديد — سدن 🕊️' : 'NEW ORDER — SADN 🕊️',
    `#${order.number}`,
    line,
    items,
    line,
    totals,
    line,
    payment,
    line,
    customer,
  ].join('\n');
}

/** Short owner→customer opener for the dashboard WhatsApp button (round 15). */
export function buildOwnerChatUrl(phone: string, orderNumber: string): string {
  const text = `مرحباً 🌿 معاكي سدن بخصوص أوردرك #${orderNumber}`;
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}

export function buildWhatsAppUrl(order: SerializedOrder, number: string, lang: 'en' | 'ar'): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(buildWhatsAppMessage(order, lang))}`;
}
