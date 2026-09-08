'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Banknote,
  Check,
  MessageCircle,
  Phone,
  Plus,
  Receipt,
  Search,
  Smartphone,
  Trash2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { money, type ProductDTO } from '@/lib/sadn-store';
import { fmtDate, fmtTime } from '@/lib/i18n';
import {
  buildOwnerChatUrl,
  stagesUpTo,
  type OrderStage,
  type PaymentMethod,
} from '@/lib/orders';
import { PAYMENT_METHODS } from '@/lib/store-settings';
import { shippingDue } from '@/lib/pricing';
import type { AdminKey, AdminLang } from './admin-i18n';
import { AdminSheet } from './kit';
import { useAdminData } from './useAdminData';
import { useOrderStages } from './useOrderStages';

type TT = (k: AdminKey) => string;

type OrderLine = {
  slug: string;
  name: string;
  nameAr?: string;
  image: string;
  price: number;
  size: string;
  color: string;
  qty: number;
};

type AdminOrder = {
  id: string;
  number: string;
  customerName: string;
  phone: string;
  city: string;
  address: string;
  notes: string | null;
  items: OrderLine[];
  subtotal: number;
  discount: number;
  promoCode: string | null;
  shipping: number;
  total: number;
  currency: string;
  status: string;
  stagesDone?: string[];
  paymentMethod?: string;
  paymentSenderPhone?: string;
  source?: string;
  createdAt: string;
};

/** Payment badge meta — WhatsApp is communication only, never a payment. */
const PAY_META: Record<PaymentMethod, { labelKey: AdminKey; icon: typeof Banknote; className: string }> = {
  cod: { labelKey: 'payCod', icon: Banknote, className: 'bg-sadn-plum-50 text-sadn-plum-700' },
  instapay: { labelKey: 'payInstapay', icon: Wallet, className: 'bg-violet-50 text-violet-700' },
  vodafone: { labelKey: 'payVodafone', icon: Smartphone, className: 'bg-red-50 text-red-600' },
};

function payMeta(method: string | undefined) {
  return PAY_META[(method ?? 'cod') as PaymentMethod] ?? PAY_META.cod;
}

/** Stage chip/label styling by tone — "returned"-type stages render orange. */
function stageChipClass(stage: OrderStage | undefined, done: boolean) {
  if (!stage) return { className: 'bg-sadn-plum-50 text-sadn-plum-700 ring-sadn-plum-200', dot: 'bg-sadn-plum-500' };
  return stage.tone === 'warn'
    ? {
        className: done
          ? 'bg-orange-50 text-orange-700 ring-orange-200'
          : 'bg-orange-50/60 text-orange-600 ring-orange-200',
        dot: 'bg-orange-500',
      }
    : {
        className: done
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-sadn-plum-50 text-sadn-plum-700 ring-sadn-plum-200',
        dot: done ? 'bg-emerald-500' : 'bg-sadn-plum-500',
      };
}

/** Subtotal/Discount/Shipping/Total block — shared by OrderDetail + ManualOrderSheet (R12). */
function OrderTotals({
  subtotal,
  discount,
  promoCode,
  shipping,
  total,
  lang,
  t,
}: {
  subtotal: number;
  discount: number;
  promoCode?: string | null;
  shipping: number;
  total: number;
  lang: AdminLang;
  t: TT;
}) {
  return (
    <div className="rounded-none bg-sadn-plum-50/70 p-4 text-sm">
      <div className="flex justify-between text-sadn-ink-soft">
        <span>{lang === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
        <span className="price-num">{money(subtotal, lang)}</span>
      </div>
      {discount > 0 && (
        <div className="mt-1 flex justify-between text-sadn-plum-700">
          <span>
            {lang === 'ar' ? 'الخصم' : 'Discount'}
            {promoCode ? ` · ${promoCode}` : ''}
          </span>
          <span className="price-num">−{money(discount, lang)}</span>
        </div>
      )}
      <div className="mt-1 flex justify-between text-sadn-ink-soft">
        <span>{lang === 'ar' ? 'الشحن' : 'Shipping'}</span>
        <span className="price-num">{shipping === 0 ? (lang === 'ar' ? 'مجاني' : 'FREE') : money(shipping, lang)}</span>
      </div>
      <div className="my-2 h-px bg-sadn-plum-100" />
      <div className="flex justify-between font-semibold text-sadn-ink">
        <span>{t('total')}</span>
        <span className="price-num">{money(total, lang)}</span>
      </div>
    </div>
  );
}

export function AdminOrdersTab({ t, lang }: { t: TT; lang: AdminLang }) {
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  // The owner's editable stage checklist drives filters, chips and the detail view.
  const { stages } = useOrderStages();

  const params = new URLSearchParams();
  if (status !== 'all') params.set('status', status);
  if (q.trim()) params.set('q', q.trim());
  const { data: orders, setData: setOrders, reload: load } = useAdminData<AdminOrder[]>(
    `/api/admin/orders?${params.toString()}`,
    (d) => d.orders,
    []
  );

  /* Poll lightly so new storefront orders appear without a manual refresh. */
  useEffect(() => {
    const poll = setInterval(load, 30_000);
    return () => clearInterval(poll);
  }, [load]);

  const open = useMemo(() => orders.find((o) => o.id === openId) ?? null, [orders, openId]);

  /** Checklist toggle: clicking stage i marks everything up to it (green). */
  const setStagesDoneFor = async (order: AdminOrder, index: number) => {
    const next = stagesUpTo(stages, index);
    const done = JSON.stringify(next) === JSON.stringify(order.stagesDone ?? []);
    const final = done ? stagesUpTo(stages, index - 1) : next; // tap last done → undo
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? {
              ...o,
              stagesDone: final,
              status: final.length > 0 ? final[final.length - 1] : (stages[0]?.id ?? o.status),
            }
          : o
      )
    );
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stagesDone: final }),
      });
      if (!res.ok) {
        toast.error(t('errorToast'));
        load();
      } else {
        toast.success(t('savedToast'));
      }
    } catch {
      // Round 19: network failure now toasts + resyncs instead of rejecting.
      toast.error(t('errorToast'));
      load();
    }
  };

  const remove = async (order: AdminOrder) => {
    if (!window.confirm(`${t('confirmDelete')} (${order.number})`)) return;
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('deletedToast'));
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
        setOpenId(null);
      } else {
        toast.error(t('errorToast'));
      }
    } catch {
      toast.error(t('errorToast'));
    }
  };

  const stageById = (id: string) => stages.find((s) => s.id === id);

  return (
    <div className="space-y-4">
      {/* Filters + manual order registration */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {[{ value: 'all', label: t('all') }, ...stages.map((s) => ({ value: s.id, label: lang === 'ar' ? s.ar : s.en }))].map(
            (chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => setStatus(chip.value)}
                aria-pressed={status === chip.value}
                className={`shrink-0 rounded-none px-3.5 py-2 text-xs font-medium transition-colors ${
                  status === chip.value
                    ? 'bg-sadn-plum-800 text-white'
                    : 'bg-white text-sadn-ink-soft ring-1 ring-sadn-plum-100 hover:text-sadn-plum-800'
                }`}
              >
                {chip.label}
              </button>
            )
          )}
        </div>
        <div className="relative ms-auto w-full sm:w-56">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sadn-plum-300" strokeWidth={1.75} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('searchOrders')}
            className="sadn-input ps-9"
          />
        </div>
        <button
          type="button"
          data-register-order
          onClick={() => setRegisterOpen(true)}
          className="press inline-flex h-10 shrink-0 items-center gap-1.5 rounded-none bg-sadn-plum-800 px-4 text-xs font-semibold text-white shadow-md shadow-sadn-plum-800/25 transition-colors hover:bg-sadn-plum-700 active:scale-95"
        >
          <Plus className="h-4 w-4" strokeWidth={2.25} />
          {t('newOrder')}
        </button>
      </div>

      {/* Orders list */}
      <div className="overflow-hidden rounded-none border border-sadn-plum-100 bg-white">
        <ul className="divide-y divide-sadn-plum-50">
          {orders.map((o) => {
            const stage = stageById(o.status);
            const chip = stageChipClass(stage, true);
            const pay = payMeta(o.paymentMethod);
            const PayIcon = pay.icon;
            const waHref = buildOwnerChatUrl(o.phone, o.number);
            return (
              <li key={o.id} className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => setOpenId(o.id)}
                  className="flex min-w-0 flex-1 flex-wrap items-center gap-3 px-4 py-3.5 text-start transition-colors hover:bg-sadn-plum-50/40"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-sadn-plum-50 text-sadn-plum-700">
                    <Receipt className="h-4.5 w-4.5" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-sadn-ink">
                      <span dir="ltr" className="font-mono text-[13px]">{o.number}</span>
                      <span className="ms-2 font-normal">{o.customerName}</span>
                      <span className="ms-2 inline-flex items-center gap-1 rounded-none bg-sadn-plum-50 px-1.5 py-0.5 align-middle text-[9px] font-semibold uppercase tracking-wide text-sadn-plum-600">
                        {o.source === 'manual' ? t('sourceManual') : t('sourceWhatsapp')}
                      </span>
                      <span
                        className={`ms-1 inline-flex items-center gap-1 rounded-none px-1.5 py-0.5 align-middle text-[9px] font-semibold uppercase tracking-wide ${pay.className}`}
                      >
                        <PayIcon className="h-2.5 w-2.5" />
                        {t(pay.labelKey)}
                      </span>
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-sadn-ink-soft">
                      {fmtDate(o.createdAt, lang)} · {fmtTime(o.createdAt, lang)} · {o.items.reduce((n, i) => n + i.qty, 0)} {lang === 'ar' ? 'قطعة' : 'pcs'} · {o.city}
                    </p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-none px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${chip.className}`}>
                    <span className={`h-1.5 w-1.5 rounded-none ${chip.dot}`} />
                    {stage ? (lang === 'ar' ? stage.ar : stage.en) : t('statusReceived')}
                  </span>
                  <span className="price-num w-20 text-end text-sm font-semibold text-sadn-ink">
                    {money(o.total, lang)}
                  </span>
                </button>
                {/* One-tap WhatsApp chat with this customer (owner request r15) */}
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t('contactWhatsapp')}
                  aria-label={`${t('contactWhatsapp')} — ${o.customerName}`}
                  onClick={(e) => e.stopPropagation()}
                  className="press flex w-12 shrink-0 items-center justify-center border-s border-sadn-plum-50 text-[#25D366] transition-colors hover:bg-[#25D366]/10"
                >
                  <MessageCircle className="h-4.5 w-4.5" strokeWidth={2} />
                </a>
              </li>
            );
          })}
          {orders.length === 0 && (
            <li className="py-12 text-center text-sm text-sadn-ink-soft">{t('noResults')}</li>
          )}
        </ul>
      </div>

      {/* Detail dialog */}
      {open && (
        <OrderDetail
          order={open}
          t={t}
          lang={lang}
          stages={stages}
          onClose={() => setOpenId(null)}
          onStagesDone={(index) => void setStagesDoneFor(open, index)}
          onDelete={() => void remove(open)}
        />
      )}

      {/* Manual order registration (WhatsApp/phone order book) */}
      {registerOpen && (
        <ManualOrderSheet
          t={t}
          lang={lang}
          stages={stages}
          onClose={() => setRegisterOpen(false)}
          onCreated={(order) => {
            setOrders((prev) => [order, ...prev]);
            setOpenId(order.id);
            // Nudge the storefront + other tabs (overview KPIs) to refresh.
            window.dispatchEvent(new CustomEvent('sadn:catalog-changed'));
          }}
        />
      )}
    </div>
  );
}

function OrderDetail({
  order,
  t,
  lang,
  stages,
  onClose,
  onStagesDone,
  onDelete,
}: {
  order: AdminOrder;
  t: TT;
  lang: AdminLang;
  stages: OrderStage[];
  onClose: () => void;
  onStagesDone: (index: number) => void;
  onDelete: () => void;
}) {
  const done = order.stagesDone ?? [];
  const doneIdx = done.reduce((acc, id) => Math.max(acc, stages.findIndex((s) => s.id === id)), -1);
  const pay = payMeta(order.paymentMethod);
  const PayIcon = pay.icon;
  const waHref = buildOwnerChatUrl(order.phone, order.number);
  const isTransfer = order.paymentMethod === 'instapay' || order.paymentMethod === 'vodafone';

  return (
    <AdminSheet
      onClose={onClose}
      label={order.number}
      panelClassName="sadn-sheet-scroll relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-none-3xl bg-white shadow-2xl sm:rounded-none"
    >
        {/* header */}
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-sadn-plum-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="font-mono text-sm font-semibold text-sadn-ink" dir="ltr">{order.number}</p>
            <p className="text-[11px] text-sadn-ink-soft">
              {fmtDate(order.createdAt, lang)} · {fmtTime(order.createdAt, lang)}
              {order.source === 'manual' ? ` · ${t('sourceManual')}` : ` · ${t('sourceWhatsapp')}`}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-none px-3 py-1.5 text-[11px] font-semibold ring-1 ring-inset ${pay.className}`}>
            <PayIcon className="h-3 w-3" />
            {t(pay.labelKey)}
          </span>
        </div>

        <div className="space-y-5 p-5">
          {/* ── Stage checklist (round 15) — green checks; return stages orange ── */}
          <div>
            <p className="mb-1 flex items-center justify-between text-xs font-medium text-sadn-ink">
              {t('checklist')}
            </p>
            <p className="mb-2.5 text-[11px] text-sadn-ink-soft">{t('checklistHint')}</p>
            <ol className="space-y-1.5">
              {stages.map((s, i) => {
                const isDone = done.includes(s.id);
                const warn = s.tone === 'warn';
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => onStagesDone(i)}
                      aria-pressed={isDone}
                      className={`press flex w-full items-center gap-3 rounded-none border p-3 text-start transition-colors ${
                        isDone
                          ? warn
                            ? 'border-orange-200 bg-orange-50/70'
                            : 'border-emerald-200 bg-emerald-50/70'
                          : 'border-sadn-plum-100 hover:border-sadn-plum-200'
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-none ring-2 transition-colors ${
                          isDone
                            ? warn
                              ? 'bg-orange-500 text-white ring-orange-200'
                              : 'bg-emerald-500 text-white ring-emerald-200'
                            : 'bg-white text-transparent ring-sadn-plum-200'
                        }`}
                      >
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </span>
                      <span
                        className={`min-w-0 flex-1 text-sm font-medium ${
                          isDone ? (warn ? 'text-orange-700' : 'text-emerald-700') : 'text-sadn-ink'
                        }`}
                      >
                        {lang === 'ar' ? s.ar : s.en}
                      </span>
                      {warn && (
                        <span className="rounded-none bg-orange-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-orange-600">
                          {lang === 'ar' ? 'مرتجع' : 'return'}
                        </span>
                      )}
                      {!isDone && i === doneIdx + 1 && (
                        <span className="rounded-none bg-sadn-plum-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sadn-plum-600">
                          {lang === 'ar' ? 'الحالي' : 'current'}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Transfer proof info (instapay/vodafone orders) */}
          {isTransfer && (
            <div className="rounded-none bg-amber-50/70 p-4 text-[13px] ring-1 ring-inset ring-amber-200">
              <p className="flex items-center gap-1.5 font-medium text-amber-700">
                <Wallet className="h-3.5 w-3.5" />
                {t('paymentSender')}: <span dir="ltr" className="font-mono">{order.paymentSenderPhone || '—'}</span>
              </p>
              <p className="mt-1 text-[11px] text-amber-600">
                {lang === 'ar'
                  ? 'المفروض العميل يبعت سكرين شوت التحويل في شات الواتساب.'
                  : 'The customer should attach the transfer screenshot in the WhatsApp chat.'}
              </p>
            </div>
          )}

          {/* Items */}
          <div>
            <p className="mb-2 text-xs font-medium text-sadn-ink">
              {t('items')} ({order.items.reduce((n, i) => n + i.qty, 0)})
            </p>
            <ul className="space-y-2">
              {order.items.map((it, i) => (
                <li key={`${it.slug}-${i}`} className="flex items-center gap-3 rounded-none bg-sadn-plum-50/60 p-2.5">
                  <div className="h-14 w-11 shrink-0 overflow-hidden rounded-none bg-white">
                    {it.image ? (
                      <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-sadn-ink">
                      {lang === 'ar' && it.nameAr ? it.nameAr : it.name}
                    </p>
                    <p className="text-[11px] text-sadn-ink-soft">
                      {it.size} / {it.color} × {it.qty}
                    </p>
                  </div>
                  <span className="price-num text-sm font-semibold text-sadn-ink">
                    {money(it.price * it.qty, lang)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Totals */}
          <OrderTotals
            subtotal={order.subtotal}
            discount={order.discount}
            promoCode={order.promoCode}
            shipping={order.shipping}
            total={order.total}
            lang={lang}
            t={t}
          />

          {/* Customer */}
          <div>
            <p className="mb-2 text-xs font-medium text-sadn-ink">{t('deliveryInfo')}</p>
            <div className="rounded-none p-4 text-[13px] leading-relaxed ring-1 ring-inset ring-sadn-plum-100">
              <p>
                <span className="font-medium">{t('customer')}:</span> {order.customerName}
              </p>
              <p className="mt-1 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-sadn-plum-400" />
                <span dir="ltr">{order.phone}</span>
              </p>
              <p className="mt-1">
                <span className="font-medium">{t('city')}:</span> {order.city}
              </p>
              <p className="mt-1">
                <span className="font-medium">{lang === 'ar' ? 'العنوان' : 'Address'}:</span> {order.address}
              </p>
              {order.notes && (
                <p className="mt-1">
                  <span className="font-medium">{t('notes')}:</span> {order.notes}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-none bg-[#25D366] text-sm font-semibold text-white shadow-md shadow-[#25D366]/25 transition-colors hover:bg-[#1fb959]"
            >
              <MessageCircle className="h-4 w-4" strokeWidth={2} />
              {t('contactWhatsapp')}
            </a>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex h-11 items-center gap-2 rounded-none px-4 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              {t('delete')}
            </button>
          </div>
        </div>
    </AdminSheet>
  );
}

/* ── Manual order registration sheet ──────────────────────────────────
 * The order book for WhatsApp/phone orders: the owner picks products
 * (prices resolved server-side on save), fills the customer block and
 * the order joins the same checklist pipeline as storefront orders.
 */
function ManualOrderSheet({
  t,
  lang,
  stages,
  onClose,
  onCreated,
}: {
  t: TT;
  lang: AdminLang;
  stages: OrderStage[];
  onClose: () => void;
  onCreated: (order: AdminOrder) => void;
}) {
  const [catalog, setCatalog] = useState<ProductDTO[]>([]);
  const [customer, setCustomer] = useState({ name: '', phone: '', city: '', address: '', notes: '' });
  const [lines, setLines] = useState<Array<OrderLine>>([]);
  const [pickSlug, setPickSlug] = useState('');
  const [pickSize, setPickSize] = useState('');
  const [pickQty, setPickQty] = useState(1);
  const [discount, setDiscount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cod');
  const [senderPhone, setSenderPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* The owner-configured flat fee (Setting.shippingFee) — 60 is only the
     fallback while the storefront config hasn't resolved (or failed). */
  const [shippingFee, setShippingFee] = useState<number | null>(null);
  const [freeThreshold, setFreeThreshold] = useState(0);

  useEffect(() => {
    fetch('/api/admin/products')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setCatalog(d.products);
          const first = d.products[0];
          if (first) {
            setPickSlug(first.slug);
            setPickSize(first.sizes?.[0] ?? '');
          }
        }
      })
      .catch(() => {});
  }, []);

  /* The sheet registers manual orders against the SAME delivery rules as the
     storefront — read the public config once when it opens. GET /api/storefront
     answers {ok, banner, whatsappReady, ...parseStoreConfig} so the flat fee
     sits at the top level. 0 fee → free delivery, like computeShipping. */
  useEffect(() => {
    let alive = true;
    fetch('/api/storefront')
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const fee = Number(d?.shippingFee);
        if (d?.ok && Number.isFinite(fee) && fee >= 0) setShippingFee(fee);
        const th = Number(d?.freeShippingThreshold);
        if (d?.ok && Number.isFinite(th) && th >= 0) setFreeThreshold(th);
      })
      .catch(() => {
        /* keep the 60 fallback */
      });
    return () => {
      alive = false;
    };
  }, []);

  const product = catalog.find((p) => p.slug === pickSlug) ?? null;
  const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0);
  const discountNum = Math.min(Math.max(Math.round(Number(discount) || 0), 0), subtotal);
  const shipping =
    subtotal <= 0 ? 0 : shippingDue(shippingFee ?? 60, subtotal, freeThreshold);
  const total = Math.max(subtotal - discountNum + shipping, 0);

  const addLine = () => {
    if (!product || !pickSize) return;
    setLines((prev) => {
      const existing = prev.find((l) => l.slug === product.slug && l.size === pickSize);
      if (existing) {
        return prev.map((l) =>
          l === existing ? { ...l, qty: Math.min(l.qty + pickQty, 99) } : l
        );
      }
      return [
        ...prev,
        {
          slug: product.slug,
          name: product.name,
          nameAr: product.nameAr,
          image: product.images?.[0] ?? '',
          price: product.price,
          size: pickSize,
          color: product.colors?.[0]?.name ?? 'Default',
          qty: pickQty,
        },
      ];
    });
    setPickQty(1);
  };

  const submit = async () => {
    setError(null);
    if (lines.length === 0) {
      setError(t('noLines'));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            name: customer.name,
            phone: customer.phone,
            city: customer.city,
            address: customer.address,
            notes: customer.notes || undefined,
          },
          items: lines.map((l) => ({ slug: l.slug, size: l.size, color: l.color, qty: l.qty })),
          paymentMethod: payMethod,
          paymentSenderPhone:
            payMethod !== 'cod' ? senderPhone.replace(/[\s-()]/g, '') || undefined : undefined,
          discount: discountNum > 0 ? discountNum : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? t('errorToast'));
        setBusy(false);
        return;
      }
      toast.success(`${data.order.number} — ${t('orderCreated')}`);
      onCreated(data.order);
      setBusy(false);
      onClose();
    } catch {
      setError(t('errorToast'));
      setBusy(false);
    }
  };

  return (
    <AdminSheet
      onClose={onClose}
      label={t('newOrderTitle')}
      panelClassName="sadn-sheet-scroll relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-none-3xl bg-white shadow-2xl sm:rounded-none"
    >
        <div className="sticky top-0 z-10 border-b border-sadn-plum-100 bg-white/95 px-5 py-4 backdrop-blur">
          <p className="font-sadn-display text-lg text-sadn-ink">{t('newOrderTitle')}</p>
          <p className="mt-0.5 text-xs text-sadn-ink-soft">{t('newOrderBody')}</p>
        </div>

        <div className="space-y-5 p-5">
          {/* Customer */}
          <div className="grid grid-cols-2 gap-2.5">
            <input
              value={customer.name}
              onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
              placeholder={lang === 'ar' ? 'اسم العميل' : 'Customer name'}
              className="sadn-input col-span-2"
            />
            <input
              value={customer.phone}
              onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
              placeholder={lang === 'ar' ? 'الهاتف' : 'Phone'}
              inputMode="tel"
              dir="ltr"
              className="sadn-input col-span-1"
            />
            <input
              value={customer.city}
              onChange={(e) => setCustomer((c) => ({ ...c, city: e.target.value }))}
              placeholder={lang === 'ar' ? 'المحافظة' : 'City'}
              className="sadn-input col-span-1"
            />
            <input
              value={customer.address}
              onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))}
              placeholder={lang === 'ar' ? 'العنوان بالكامل' : 'Full address'}
              className="sadn-input col-span-2"
            />
            <input
              value={customer.notes}
              onChange={(e) => setCustomer((c) => ({ ...c, notes: e.target.value }))}
              placeholder={`${t('notes')} — ${lang === 'ar' ? 'اختياري' : 'optional'}`}
              className="sadn-input col-span-2"
            />
          </div>

          {/* Payment method (round 15) */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-sadn-ink">{t('paymentMethod')}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENT_METHODS.map((m) => {
                const meta = payMeta(m);
                const Icon = meta.icon;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPayMethod(m)}
                    aria-pressed={payMethod === m}
                    className={`press flex h-14 flex-col items-center justify-center gap-1 rounded-none border text-[11px] font-semibold transition-colors ${
                      payMethod === m
                        ? 'border-sadn-plum-800 bg-sadn-plum-50 text-sadn-plum-800'
                        : 'border-sadn-plum-100 text-sadn-ink-soft hover:border-sadn-plum-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                    {t(meta.labelKey)}
                  </button>
                );
              })}
            </div>
            {payMethod !== 'cod' && (
              <input
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                placeholder={`${t('paymentSender')} — ${lang === 'ar' ? '01xxxxxxxxx' : '01xxxxxxxxx'}`}
                dir="ltr"
                inputMode="tel"
                className="sadn-input mt-2"
              />
            )}
          </div>

          {/* Item picker */}
          <div className="rounded-none bg-sadn-plum-50/60 p-3">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <select
                value={pickSlug}
                onChange={(e) => {
                  setPickSlug(e.target.value);
                  const p = catalog.find((x) => x.slug === e.target.value);
                  setPickSize(p?.sizes?.[0] ?? '');
                }}
                className="sadn-input"
                aria-label={t('pickProduct')}
              >
                {catalog.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {lang === 'ar' && p.nameAr ? p.nameAr : p.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1 rounded-none border border-sadn-plum-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setPickQty((n) => Math.max(1, n - 1))}
                  className="h-8 w-8 rounded-none text-sadn-ink transition-colors hover:bg-sadn-plum-50"
                  aria-label="−"
                >
                  −
                </button>
                <span className="w-5 text-center text-sm font-semibold">{pickQty}</span>
                <button
                  type="button"
                  onClick={() => setPickQty((n) => Math.min(99, n + 1))}
                  className="h-8 w-8 rounded-none text-sadn-ink transition-colors hover:bg-sadn-plum-50"
                  aria-label="+"
                >
                  +
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(product?.sizes ?? []).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPickSize(s)}
                  aria-pressed={pickSize === s}
                  className={`h-9 min-w-9 rounded-none border px-3 text-xs font-medium transition-colors ${
                    pickSize === s
                      ? 'border-sadn-plum-800 bg-sadn-plum-800 text-white'
                      : 'border-sadn-plum-200 bg-white text-sadn-ink hover:border-sadn-plum-800'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={addLine}
              className="press mt-2.5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-none border border-sadn-plum-800 text-xs font-semibold text-sadn-plum-800 transition-colors hover:bg-sadn-plum-800 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
              {t('addLine')}
            </button>
          </div>

          {/* Lines */}
          {lines.length > 0 ? (
            <ul className="space-y-1.5">
              {lines.map((l, i) => (
                <li key={`${l.slug}-${l.size}`} className="flex items-center gap-2 rounded-none bg-sadn-plum-50/60 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {lang === 'ar' && l.nameAr ? l.nameAr : l.name}
                    <span className="ms-1.5 text-[11px] text-sadn-ink-soft">
                      {l.size} × {l.qty}
                    </span>
                  </span>
                  <span className="price-num text-xs font-semibold text-sadn-ink">{money(l.price * l.qty, lang)}</span>
                  <button
                    type="button"
                    onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                    className="flex h-7 w-7 items-center justify-center rounded-none text-sadn-ink-soft transition-colors hover:bg-white hover:text-red-500"
                    aria-label={t('delete')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-xs text-sadn-ink-soft">{t('noLines')}</p>
          )}

          {/* Discount */}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-sadn-ink">{t('discountEgp')}</span>
            <input
              value={discount}
              onChange={(e) => setDiscount(e.target.value.replace(/[^\d]/g, ''))}
              inputMode="numeric"
              placeholder="0"
              className="sadn-input"
            />
          </label>

          {/* Totals preview */}
          <OrderTotals subtotal={subtotal} discount={discountNum} shipping={shipping} total={total} lang={lang} t={t} />

          {error && (
            <p role="alert" className="rounded-none bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="press inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-none bg-sadn-plum-800 text-sm font-semibold text-white shadow-lg shadow-sadn-plum-800/25 transition-colors hover:bg-sadn-plum-700 disabled:opacity-70"
            >
              <BadgeCheck className="h-4 w-4" strokeWidth={2} />
              {busy ? t('creatingOrder') : t('createOrder')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-12 items-center rounded-none px-4 text-sm font-medium text-sadn-ink-soft transition-colors hover:bg-sadn-plum-50"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
    </AdminSheet>
  );
}
