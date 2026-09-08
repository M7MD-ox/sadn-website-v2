/**
 * Public store configuration (round 13) — everything the owner controls from
 * the dashboard and the storefront reads live: promo code, delivery fee,
 * hero slideshow and footer contacts. Shared by the client (components) and
 * the server (order pricing) so both sides can never drift apart.
 */

export type StoreSocials = {
  instagram: string;
  facebook: string;
  tiktok: string;
};

export type PromoConfig = {
  enabled: boolean;
  code: string; // normalized (uppercase)
  percent: number; // 1–90
  min: number; // minimum pre-discount subtotal (EGP)
};

export type StoreConfig = {
  /** Flat delivery fee in EGP (0 = free). */
  shippingFee: number;
  /** Free-shipping threshold in EGP (round 29) — 0 = off. */
  freeShippingThreshold: number;
  promo: PromoConfig;
  /** Hero slideshow images (/products/*, /uploads/* or absolute URLs). */
  heroImages: string[];
  /** Seconds between hero crossfades (2–60). */
  heroInterval: number;
  /** Footer phone numbers (display + tel: link). */
  phones: string[];
  /** The owner's WhatsApp number for the floating chat chip (17-c).
   * Public business contact info by nature — wa.me links expose it anyway. */
  whatsappNumber: string;
  /** Footer brand-page URLs — empty string hides the icon. */
  socials: StoreSocials;
  /** InstaPay transfer number shown at checkout (empty = method hidden). */
  instapayNumber: string;
  /** Vodafone Cash number shown at checkout (empty = method hidden). */
  vodafoneNumber: string;
  /** The owner's editable order-stage checklist (dashboard Settings). */
  orderStages: OrderStage[];
  /** Home marquee strip under the hero — text + optional CTA (round 16). */
  marquee: MarqueeConfig;
  /** Size-guide rows, cm only — owner-editable (round 16). */
  sizeGuide: SizeRow[];
  /** Product-page collapsible sections — visibility/titles/bodies (round 16). */
  productSections: ProductSection[];
  /** Policy pages: shipping & purchase / returns / privacy (round 16). */
  policies: PolicyPage[];
  /** Separate WhatsApp review chats — one card per customer (round 17). */
  chatThreads: ChatThread[];
  /** Meta (Facebook) Pixel ID — owner-set from the dashboard (round 27).
   * Digits only; empty string = tracking stays off entirely. */
  fbPixelId: string;
};

/* ── Order stage checklist (round 15) ────────────────────────────────────
 * Every order walks an owner-defined pipeline shown as a green-check
 * checklist in the dashboard. "warn"-tone stages (e.g. مرتجع / Returned)
 * render in orange. The list itself is editable in dashboard Settings.
 */
export type OrderStageTone = 'ok' | 'warn';

export type OrderStage = {
  id: string;
  en: string;
  ar: string;
  tone: OrderStageTone;
};

/** Owner's requested defaults: payment review → confirm → delivered → returned. */
export const DEFAULT_ORDER_STAGES: OrderStage[] = [
  { id: 'payment_review', en: 'Payment review', ar: 'مراجعة الدفع', tone: 'ok' },
  { id: 'order_confirm', en: 'Confirmed with customer', ar: 'تأكيد الأوردر مع العميل', tone: 'ok' },
  { id: 'delivered', en: 'Delivered', ar: 'تسليم الأوردر', tone: 'ok' },
  { id: 'returned', en: 'Returned', ar: 'مرتجع', tone: 'warn' },
];

/** Stage id convention: transfer orders start at "payment_review"; COD skips it. */
export const PAYMENT_REVIEW_STAGE = 'payment_review';

export type PaymentMethod = 'cod' | 'instapay' | 'vodafone';
export const PAYMENT_METHODS: PaymentMethod[] = ['cod', 'instapay', 'vodafone'];

/* ── Round 16 content blocks ────────────────────────────── */

/** Home marquee strip — hidden entirely when disabled or both texts empty. */
export type MarqueeConfig = {
  enabled: boolean;
  textEn: string;
  textAr: string;
  /** Optional button after the text — internal href (e.g. /shop, /policies/returns). */
  ctaHref: string;
  ctaLabelEn: string;
  ctaLabelAr: string;
};

/** One size-guide row — centimetres ONLY (owner removed inches). */
export type SizeRow = {
  id: string;
  size: string;
  bust: string;
  waist: string;
  hip: string;
  length: string;
};

/**
 * Product-page collapsible sections. kind drives the body source:
 *  - 'description' → the product's own description
 *  - 'sizes'        → the inline size-guide table (SizeRow rows)
 *  - 'custom'       → the owner's bilingual body text
 */
export type ProductSectionKind = 'description' | 'sizes' | 'custom';

export type ProductSection = {
  id: string;
  kind: ProductSectionKind;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  enabled: boolean;
};

/* Round 39 (owner): the policies grew from 3 to 6 sections — terms,
   contact and the legal notice joined; the dashboard PoliciesCard renders
   whatever rows the settings carry, so the union is the source of truth. */
export type PolicySlug =
  | 'shipping'
  | 'returns'
  | 'privacy'
  | 'terms'
  | 'contact'
  | 'legal';
export const POLICY_SLUGS: PolicySlug[] = [
  'shipping',
  'returns',
  'privacy',
  'terms',
  'contact',
  'legal',
];

export type PolicyPage = {
  slug: PolicySlug;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  enabled: boolean;
};

/* ── WhatsApp review chats (round 17) ──────────────────────────────
 * Separate, dashboard-managed conversations — each thread is one
 * customer with her own messages, rendered as its own WhatsApp-style
 * card so it is obvious these are different people.
 */
export type ChatMsg = {
  id: string;
  from: 'customer' | 'store';
  text: string;
  /** Decorative clock label as shown on WhatsApp (e.g. "8:40 PM"). */
  time: string;
  /** Optional reaction badge pinned to the bubble (❤️ / 🤍 / …). */
  reaction?: string;
};

export type ChatThread = {
  id: string;
  /** Display name in the thread's WhatsApp header — editable in Settings. */
  customerName: string;
  /** Date chip inside the thread (e.g. "أمس"). */
  dateLabel: string;
  enabled: boolean;
  messages: ChatMsg[];
};

export const DEFAULT_MARQUEE: MarqueeConfig = {
  enabled: true,
  textEn: 'Cut loose, worn close · Loose by design · New season',
  textAr: 'واسعة في القصّة… قريبة من القلب · واسعة وقصّتها مريحة · موسم جديد',
  ctaHref: '',
  ctaLabelEn: '',
  ctaLabelAr: '',
};

/** Real, accurate abaya sizing in centimetres — inches removed per owner. */
export const DEFAULT_SIZE_GUIDE: SizeRow[] = [
  { id: 's', size: 'S', bust: '84 – 90', waist: '70 – 76', hip: '90 – 96', length: '132' },
  { id: 'm', size: 'M', bust: '90 – 96', waist: '76 – 82', hip: '96 – 102', length: '137' },
  { id: 'l', size: 'L', bust: '96 – 102', waist: '82 – 88', hip: '102 – 108', length: '140' },
  { id: 'xl', size: 'XL', bust: '102 – 110', waist: '88 – 96', hip: '108 – 116', length: '142' },
];

export const DEFAULT_PRODUCT_SECTIONS: ProductSection[] = [
  {
    id: 'description',
    kind: 'description',
    titleEn: 'Details',
    titleAr: 'تفاصيل العباية',
    bodyEn: '',
    bodyAr: '',
    enabled: true,
  },
  {
    id: 'size-fit',
    kind: 'sizes',
    titleEn: 'Size & Fit',
    titleAr: 'المقاس والقصّة',
    bodyEn: 'Loose, flowing cut — true to size. Check the table for exact measurements.',
    bodyAr: 'قصّة واسعة منسدلة — المقاس مطابق. راجع الجدول لقياسات دقيقة بالسنتيمتر.',
    enabled: true,
  },
  {
    id: 'shipping-returns',
    kind: 'custom',
    titleEn: 'Shipping & Returns',
    titleAr: 'الشحن والاستبدال',
    bodyEn: 'Delivery across Egypt in 2–5 working days. Unworn pieces can be exchanged or returned within 14 days.',
    bodyAr: 'التوصيل لكل محافظات مصر في 2–5 أيام عمل. القطع غير المستخدمة تُستبدل أو تُرجع خلال 14 يوم.',
    enabled: true,
  },
  {
    id: 'care',
    kind: 'custom',
    titleEn: 'Fabric & Care',
    titleAr: 'القماش والعناية',
    bodyEn: 'Gentle machine cycle or hand wash cold. Iron on low, hang to keep the drape.',
    bodyAr: 'غسيل خفيف أو غسيل يدوي بماء بارد. كي على حرارة منخفضة، وتعليق للحفاظ على الانسدال.',
    enabled: true,
  },
];

/**
 * Real customer conversations (round 16-f, split into separate threads in
 * round 17-a per owner: "كل محادثة تكون منفصلة بحيث يبان إن دي أشخاص مختلفة").
 * Transcribed verbatim — Egyptian dialect, typos and all — from the owner's
 * WhatsApp screenshots; do not "polish" the wording. Store-side replies are
 * minimal heart/thanks bubbles only.
 *
 * The three customer names below are PLACEHOLDERS — the real names live in
 * the owner's phone; rename them from Dashboard → Settings → المحادثات.
 */
export const DEFAULT_CHAT_THREADS: ChatThread[] = [
  {
    id: 'chat-1',
    customerName: 'نور',
    dateLabel: 'أمس',
    enabled: true,
    messages: [
      { id: 'm1', from: 'customer', text: 'بصي انا اول مره في حياتي اطلب لبس اون لاين وبصراحه السوت تحفه والله ان شاء مش آخر تعامل معاكي', time: '8:40 PM', reaction: '❤️' },
      { id: 'm2', from: 'store', text: '❤️', time: '8:40 PM' },
      { id: 'm3', from: 'customer', text: 'كنت عايزه اقول لك بجد تسلمي لي الاوردر وصل والخامه تحفه جدا والموديل جميل جداً', time: '8:40 PM' },
      { id: 'm4', from: 'customer', text: 'طاب والله مش بالغلى احلى ما في الصور وفي الفيديو', time: '8:40 PM' },
      { id: 'm5', from: 'customer', text: 'بجد يعني ما شاء الله طلعتى قد الثقه', time: '8:40 PM' },
      { id: 'm6', from: 'customer', text: 'ان شاء الله ده اول تعامل ومش اخر مره برده', time: '8:40 PM' },
      { id: 'm7', from: 'customer', text: '❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️🥹', time: '8:41 PM' },
      { id: 'm8', from: 'store', text: 'تسلميلي حبيبتي 🤍', time: '8:41 PM' },
    ],
  },
  {
    id: 'chat-2',
    customerName: 'سلمى',
    dateLabel: 'أمس',
    enabled: true,
    messages: [
      { id: 'm9', from: 'customer', text: 'لا والفيديو نفس الحقيقة دي حاجه مش ف الاونلاين كتير', time: '8:52 PM', reaction: '❤️' },
      { id: 'm10', from: 'customer', text: 'مش عارفه اكلمك ع الخامه ولا الديزاين ولا القصه ولا ايه ولا ايه', time: '8:53 PM' },
      { id: 'm11', from: 'customer', text: 'خطير بجد الله يبارك', time: '8:53 PM' },
      { id: 'm12', from: 'customer', text: 'بقالي كتر مجبتش اونلاين تحفه كدا', time: '8:53 PM' },
      { id: 'm13', from: 'store', text: '❤️', time: '8:54 PM' },
    ],
  },
  {
    id: 'chat-3',
    customerName: 'مريم',
    dateLabel: 'أمس',
    enabled: true,
    messages: [
      { id: 'm14', from: 'customer', text: 'تسلميلي والله', time: '9:05 PM', reaction: '❤️' },
      { id: 'm15', from: 'customer', text: 'إن شاء الله مش آخر تعامل اعملينا موديلات جديده كتير 🙈', time: '9:06 PM', reaction: '❤️' },
      { id: 'm16', from: 'customer', text: 'بجد مش هيكون آخر تعامل بينا إن شاء الله، الخامة تحفة جدًا وكل حاجة perfect حرفيًا. شكرًا ليكي على ذوقك واهتمامك، تسلم إيديكي، ومستنية أتعامل معاكي تاني أكيد', time: '9:07 PM', reaction: '🤍' },
      { id: 'm17', from: 'customer', text: 'بس بجد ايه الجمل دهه', time: '9:07 PM' },
    ],
  },
];

/** Real, specific policy content — the SEO "real content" requirement. */
export const DEFAULT_POLICIES: PolicyPage[] = [
  {
    slug: 'shipping',
    titleEn: 'Shipping & Purchase',
    titleAr: 'الشراء والشحن',
    bodyEn:
      'Ordering from SADN takes less than two minutes. Pick your abaya, choose your size and colour, and check out with one of three payment methods: cash on delivery, InstaPay, or Vodafone Cash.\n\nCash on delivery (COD): you pay the courier when your parcel arrives — no prepayment needed.\n\nInstaPay and Vodafone Cash: after checkout you get our transfer number with a copy button for both the number and the amount. Send the transfer, register the number you paid from, and hand us the transfer screenshot on WhatsApp. Your order lands in our dashboard under “payment review”, and we confirm with you before it ships.\n\nDelivery takes 2–5 working days inside Egypt, with a flat 60 EGP shipping fee. Every parcel is wrapped in the atelier before it leaves us.',
    bodyAr:
      'الشراء من سدن بياخد أقل من دقيقتين: اختاري العباية، حددي المقاس واللون، وادفعي بأحد ثلاث طرق: الدفع عند الاستلام، انستا باي، أو فودافون كاش.\n\nالدفع عند الاستلام: تدفعين للمندوب عند وصول الطلب — بدون أي مقدم.\n\nانستا باي وفودافون كاش: بعد تأكيد الطلب هيظهرلك رقم التحويل مع زرار نسخ للرقم والمبلغ. بعدين حوّلي، وسّجلي الرقم اللي حوّلتِ منه، وابعتيلنا صورة سكرين شوت للتحويل على واتساب. الأوردر يتسجل عندنا تحت “مراجعة الدفع” ونأكد معك قبل الشحن.\n\nالتوصيل داخل مصر من 2 إلى 5 أيام عمل برسوم شحن ثابتة 60 جنيه، وكل أوردر بيتغلف بعناية في الأتيليه قبل ما يخرج ليكِ.',
    enabled: true,
  },
  {
    slug: 'returns',
    titleEn: 'Returns & Exchange',
    titleAr: 'الاستبدال والاسترجاع',
    bodyEn:
      'We want every piece to feel right. You can exchange or return any abaya within 14 days of delivery, as long as it is unworn and unwashed with its tags attached.\n\nTo start a return or exchange, message us on WhatsApp with your order number — we arrange the pickup and walk you through the steps.\n\nReturned pieces are refunded through Vodafone Cash or InstaPay, or exchanged for another size or colour at no extra shipping cost. Pieces with a manufacturing fault are always exchanged or refunded in full, shipping included.',
    bodyAr:
      'عايزين كل قطعة تِحس براحتك. تقدري تستبدلي أو ترجّعي أي عباية خلال 14 يوم من الاستلام، بشرط تكون غير مستخدمة وغير مغسولة وبها التايج بتاعها.\n\nلبدء الاستبدال أو الاسترجاع، كلّمينا على واتساب برقم الأوردر — وهنرتب الاستلام من عندك ونمشي معاكي الخطوات.\n\nقطع الاسترجاع بتُرد عبر فودافون كاش أو انستا باي، أو تُستبدل بمقاس أو لون تاني بدون رسوم شحن إضافية. والقطع اللي فيها عيب صناعة بيتم استبدالها أو رد قيمتها كاملة، بما فيه مصاريف الشحن.',
    enabled: true,
  },
  {
    slug: 'privacy',
    titleEn: 'Privacy Policy',
    titleAr: 'سياسة الخصوصية',
    bodyEn:
      'Your trust matters as much as the fit. When you order from SADN we collect only what delivery needs: your name, phone number, city and address, plus the order details.\n\nWe never sell or share your data with anyone outside the delivery process. Your WhatsApp conversations are used only to confirm and follow up on your order. Payment screenshots you send are deleted once the payment is verified.\n\nYou can ask us to delete your data any time via WhatsApp — we confirm within 24 hours.',
    bodyAr:
      'ثقتك أهم عندنا زي المقاس نفسه. لما تطلبي من سدن بنجمع بس البيانات اللي التوصيل يحتاجها: اسمك، رقم تليفونك، المدينة والعنوان، وتفاصيل الأوردر.\n\nعموماً ما بنبيعش بياناتك ولا نشاركها مع أي حد برة عملية التوصيل. محادثات الواتساب بنستخدمها بس لتأكيد ومتابعة أوردرك، وسكرين شوتات الدفع بتتحذف بعد التحقق من التحويل.\n\nوتقدري في أي وقت تطلبينا نحذف بياناتك عبر واتساب — ونأكد لك خلال 24 ساعة.',
    enabled: true,
  },
];

/** Defensive parse — a tampered/legacy row must never crash the storefront. */
export function parseOrderStages(raw: unknown): OrderStage[] {
  let list: unknown[] = [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) list = parsed;
  } catch {
    list = [];
  }
  const stages: OrderStage[] = [];
  for (const item of list) {
    if (typeof item !== 'object' || item === null) continue;
    const r = item as Record<string, unknown>;
    const en = String(r.en ?? '').trim();
    const ar = String(r.ar ?? '').trim();
    if (!en && !ar) continue;
    stages.push({
      id: String(r.id ?? '').trim().slice(0, 40) || `stage-${stages.length + 1}`,
      en: en.slice(0, 48),
      ar: ar.slice(0, 48),
      tone: r.tone === 'warn' ? 'warn' : 'ok',
    });
  }
  return stages.length > 0 ? stages.slice(0, 10) : DEFAULT_ORDER_STAGES;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** Defensive parse — a tampered/legacy row must never crash the storefront. */
export function parseMarquee(raw: unknown): MarqueeConfig {
  const fallback = { ...DEFAULT_MARQUEE };
  let r: Record<string, unknown> = {};
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw || '{}') : raw;
    if (typeof parsed === 'object' && parsed !== null) r = parsed as Record<string, unknown>;
  } catch {
    /* keep defaults */
  }
  const enabled = typeof r.enabled === 'boolean' ? r.enabled : fallback.enabled;
  // Owner-saved EMPTY text must stay empty (strip then hides itself) — the
  // default tagline only applies when the field is ABSENT (fresh install).
  const textEn = r.textEn === undefined ? fallback.textEn : str(r.textEn).slice(0, 280);
  const textAr = r.textAr === undefined ? fallback.textAr : str(r.textAr).slice(0, 280);
  const ctaHref = str(r.ctaHref).trim().slice(0, 200);
  return {
    enabled,
    textEn,
    textAr,
    ctaHref,
    ctaLabelEn: str(r.ctaLabelEn).slice(0, 40),
    ctaLabelAr: str(r.ctaLabelAr).slice(0, 40),
  };
}

/** Defensive parse for the cm-only size guide. */
export function parseSizeGuide(raw: unknown): SizeRow[] {
  let list: unknown[] = [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw || '[]') : raw;
    if (Array.isArray(parsed)) list = parsed;
  } catch {
    list = [];
  }
  const rows: SizeRow[] = [];
  for (const item of list) {
    if (typeof item !== 'object' || item === null) continue;
    const r = item as Record<string, unknown>;
    const size = str(r.size).trim();
    if (!size) continue;
    rows.push({
      id: str(r.id).trim().slice(0, 40) || `row-${rows.length + 1}`,
      size: size.slice(0, 12),
      bust: str(r.bust).slice(0, 24),
      waist: str(r.waist).slice(0, 24),
      hip: str(r.hip).slice(0, 24),
      length: str(r.length).slice(0, 24),
    });
  }
  return rows.length > 0 ? rows.slice(0, 12) : DEFAULT_SIZE_GUIDE;
}

/** Defensive parse for product-page sections. */
export function parseProductSections(raw: unknown): ProductSection[] {
  let list: unknown[] = [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw || '[]') : raw;
    if (Array.isArray(parsed)) list = parsed;
  } catch {
    list = [];
  }
  const sections: ProductSection[] = [];
  for (const item of list) {
    if (typeof item !== 'object' || item === null) continue;
    const r = item as Record<string, unknown>;
    const titleEn = str(r.titleEn).trim();
    const titleAr = str(r.titleAr).trim();
    if (!titleEn && !titleAr) continue;
    const kind = r.kind === 'sizes' || r.kind === 'custom' ? r.kind : 'description';
    sections.push({
      id: str(r.id).trim().slice(0, 40) || `sec-${sections.length + 1}`,
      kind,
      titleEn: titleEn.slice(0, 60),
      titleAr: titleAr.slice(0, 60),
      bodyEn: str(r.bodyEn).slice(0, 2000),
      bodyAr: str(r.bodyAr).slice(0, 2000),
      enabled: typeof r.enabled === 'boolean' ? r.enabled : true,
    });
  }
  return sections.length > 0 ? sections.slice(0, 8) : DEFAULT_PRODUCT_SECTIONS;
}

/** Defensive parse for WhatsApp review chats (round 17). */
export function parseChatThreads(raw: unknown): ChatThread[] {
  let list: unknown[] = [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw || '[]') : raw;
    if (Array.isArray(parsed)) list = parsed;
  } catch {
    list = [];
  }
  const threads: ChatThread[] = [];
  for (const item of list.slice(0, 12)) {
    if (typeof item !== 'object' || item === null) continue;
    const r = item as Record<string, unknown>;
    const messages: ChatMsg[] = [];
    if (Array.isArray(r.messages)) {
      for (const mi of r.messages.slice(0, 40)) {
        if (typeof mi !== 'object' || mi === null) continue;
        const m = mi as Record<string, unknown>;
        const text = str(m.text).trim().slice(0, 500);
        if (!text) continue;
        const reaction = str(m.reaction).slice(0, 4);
        messages.push({
          id: str(m.id).trim().slice(0, 40) || `m-${messages.length + 1}`,
          from: m.from === 'store' ? 'store' : 'customer',
          text,
          time: str(m.time).slice(0, 12),
          reaction: reaction || undefined,
        });
      }
    }
    const name = str(r.customerName).trim().slice(0, 32);
    if (!name && messages.length === 0) continue; // drop fully-empty threads
    threads.push({
      id: str(r.id).trim().slice(0, 40) || `chat-${threads.length + 1}`,
      customerName: name || 'عميلة',
      dateLabel: str(r.dateLabel).trim().slice(0, 16) || 'أمس',
      enabled: typeof r.enabled === 'boolean' ? r.enabled : true,
      messages,
    });
  }
  return threads.length > 0 ? threads : DEFAULT_CHAT_THREADS;
}

/** Defensive parse for the policy pages. */
export function parsePolicies(raw: unknown): PolicyPage[] {
  let list: unknown[] = [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw || '[]') : raw;
    if (Array.isArray(parsed)) list = parsed;
  } catch {
    list = [];
  }
  const pages: PolicyPage[] = [];
  for (const item of list) {
    if (typeof item !== 'object' || item === null) continue;
    const r = item as Record<string, unknown>;
    const slug = str(r.slug) as PolicySlug;
    if (!POLICY_SLUGS.includes(slug)) continue;
    pages.push({
      slug,
      titleEn: str(r.titleEn).slice(0, 80) || POLICY_SLUGS.join(''),
      titleAr: str(r.titleAr).slice(0, 80),
      bodyEn: str(r.bodyEn).slice(0, 8000),
      bodyAr: str(r.bodyAr).slice(0, 8000),
      enabled: typeof r.enabled === 'boolean' ? r.enabled : true,
    });
  }
  if (pages.length === 0) return DEFAULT_POLICIES;
  // Guarantee every slug exists — an owner removing one row shouldn't 404 the footer.
  for (const slug of POLICY_SLUGS) {
    if (!pages.some((p) => p.slug === slug)) {
      const d = DEFAULT_POLICIES.find((p) => p.slug === slug);
      if (d) pages.push(d);
    }
  }
  return pages;
}

/** Defensive parse — a tampered/legacy row must never crash the storefront.
 * Accepts anything (typically a Prisma Setting row or null) and coerces
 * non-objects to an empty record so every field falls back to its default. */
export function parseStoreConfig(s: unknown): StoreConfig {
  const row = (typeof s === 'object' && s !== null ? s : {}) as Record<string, unknown>;
  let heroImages: string[] = [];
  try {
    const raw = JSON.parse(str(row.heroImages) || '[]');
    if (Array.isArray(raw)) {
      heroImages = raw
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .map((x) => x.trim())
        .slice(0, 8);
    }
  } catch {
    heroImages = [];
  }

  let phones: string[] = [];
  try {
    const raw = JSON.parse(str(row.phones) || '[]');
    if (Array.isArray(raw)) {
      phones = raw
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .map((x) => x.trim().slice(0, 32))
        .slice(0, 5);
    }
  } catch {
    phones = [];
  }

  let socials: StoreSocials = { instagram: '', facebook: '', tiktok: '' };
  try {
    const raw = JSON.parse(str(row.socials) || '{}') as Record<string, unknown>;
    socials = {
      instagram: str(raw.instagram).slice(0, 200),
      facebook: str(raw.facebook).slice(0, 200),
      tiktok: str(raw.tiktok).slice(0, 200),
    };
  } catch {
    /* keep defaults */
  }

  return {
    shippingFee: Math.max(0, num(row.shippingFee, 60)),
    freeShippingThreshold: Math.max(0, num(row.freeShippingThreshold, 0)),
    promo: {
      enabled: Boolean(row.promoEnabled),
      code: str(row.promoCode).toUpperCase().replace(/\s+/g, '').slice(0, 24),
      percent: Math.min(90, Math.max(1, num(row.promoPercent, 10))),
      min: Math.max(0, num(row.promoMin, 0)),
    },
    heroImages: heroImages.length > 0 ? heroImages : ['/products/hero-abaya.png'],
    heroInterval: Math.min(60, Math.max(2, Math.round(num(row.heroInterval, 6)))),
    phones,
    whatsappNumber: str(row.whatsappNumber).replace(/\D/g, '').slice(0, 20),
    socials,
    instapayNumber: str(row.instapayNumber).replace(/[\s-]/g, '').slice(0, 40),
    vodafoneNumber: str(row.vodafoneNumber).replace(/[\s-]/g, '').slice(0, 40),
    fbPixelId: str(row.fbPixelId).replace(/\D/g, '').slice(0, 25),
    orderStages: parseOrderStages(row.orderStages),
    marquee: parseMarquee(row.marquee),
    sizeGuide: parseSizeGuide(row.sizeGuide),
    productSections: parseProductSections(row.productSections),
    policies: parsePolicies(row.policies),
    chatThreads: parseChatThreads(row.chatThreads),
  };
}

/**
 * The owner's single promo code, assembled from a raw Setting row — same
 * clamps as parseStoreConfig's promo block (one sanitizer; the order API
 * used to re-assemble this by hand).
 */
export function promoConfigFromSettings(s: unknown): PromoConfig {
  const row = (typeof s === 'object' && s !== null ? s : {}) as Record<string, unknown>;
  return {
    enabled: Boolean(row.promoEnabled),
    code: str(row.promoCode).toUpperCase().replace(/\s+/g, '').slice(0, 24),
    percent: Math.min(90, Math.max(1, num(row.promoPercent, 10))),
    min: Math.max(0, num(row.promoMin, 0)),
  };
}
