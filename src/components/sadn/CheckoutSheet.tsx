'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Banknote,
  BellRing,
  Loader2,
  MapPin,
  Smartphone,
  Wallet,
  X,
} from 'lucide-react';
import anime from 'animejs';
import { money, type CartItem } from '@/lib/sadn-store';
import { useLang, useT } from '@/lib/i18n';
import type { PaymentMethod, StoreConfig } from '@/lib/store-settings';
import { EG_MOBILE_RE, stripPhoneChars } from '@/lib/eg-phone';
import { copyToClipboard, useEscapeToClose } from '@/lib/ui';
import { prefersReducedMotion } from '@/lib/gsap-setup';
import { EYEBROW_SM, OrderSummary } from './primitives';
import { CityField } from './CityField';
import { TransferPanel } from './TransferPanel';
import { CheckoutConfirmation, type PlacedOrder } from './CheckoutConfirmation';

type Props = {
  items: CartItem[];
  subtotal: number;
  discount: number;
  promoCode: string | null;
  shipping: number;
  /** Live dashboard config — supplies the InstaPay / Vodafone Cash numbers. */
  config: StoreConfig | null;
  onClose: () => void;
  onOrderPlaced: () => void;
  onDone: () => void;
};

type FormState = {
  name: string;
  phone: string;
  city: string;
  address: string;
};

const EMPTY_FORM: FormState = { name: '', phone: '', city: '', address: '' };

/**
 * Checkout details memory (17-b) — a successful order persists the customer's
 * name/phone/city/address; the next checkout opens prefilled, so repeat
 * customers confirm in seconds instead of retyping everything.
 */
const CHECKOUT_MEMORY_KEY = 'sadn-checkout-v1';
const loadCheckoutMemory = (): FormState => {
  if (typeof window === 'undefined') return EMPTY_FORM;
  try {
    const raw = window.localStorage.getItem(CHECKOUT_MEMORY_KEY);
    if (!raw) return EMPTY_FORM;
    const saved = JSON.parse(raw) as Partial<FormState>;
    return {
      name: typeof saved.name === 'string' ? saved.name : '',
      phone: typeof saved.phone === 'string' ? saved.phone : '',
      city: typeof saved.city === 'string' ? saved.city : '',
      address: typeof saved.address === 'string' ? saved.address : '',
    };
  } catch {
    return EMPTY_FORM;
  }
};
const saveCheckoutMemory = (form: FormState) => {
  try {
    window.localStorage.setItem(CHECKOUT_MEMORY_KEY, JSON.stringify(form));
  } catch {
    /* private mode / storage full — memory is a bonus, never a blocker */
  }
};

const FIELDS: Array<{
  key: keyof FormState;
  labelKey: 'fName' | 'fPhone' | 'fCity' | 'fAddress';
  phKey: 'phName' | 'phPhone' | 'phCity' | 'phAddress';
  type: string;
  autoComplete: string;
  half?: boolean;
}> = [
  { key: 'name', labelKey: 'fName', phKey: 'phName', type: 'text', autoComplete: 'name', half: true },
  { key: 'phone', labelKey: 'fPhone', phKey: 'phPhone', type: 'tel', autoComplete: 'tel', half: true },
  { key: 'city', labelKey: 'fCity', phKey: 'phCity', type: 'text', autoComplete: 'address-level2', half: true },
  { key: 'address', labelKey: 'fAddress', phKey: 'phAddress', type: 'text', autoComplete: 'street-address' },
];

export function CheckoutSheet({
  items,
  subtotal,
  discount,
  promoCode,
  shipping,
  config,
  onClose,
  onOrderPlaced,
  onDone,
}: Props) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => loadCheckoutMemory());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  /** WhatsApp opt-in (round 31, research item 6) — unchecked by default. */
  const [subscribe, setSubscribe] = useState(false);
  /** Transfer numbers, echoed from the server after the order is created. */
  const [payInfo, setPayInfo] = useState<{ instapayNumber: string; vodafoneNumber: string } | null>(null);
  /** wa.me URL built server-side from the owner's dashboard number. */
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const total = Math.max(subtotal - discount + shipping, 0);

  // 18-3a2 — Escape closes the sheet. The city combobox stops propagation
  // while its dropdown is open, so its own Escape keeps winning. Round 19:
  // never mid-POST (an unmount would orphan the in-flight order — it still
  // registers server-side but the customer never sees the confirmation)
  // and never on the placed view, where the WhatsApp hand-off lives.
  useEscapeToClose(() => {
    if (!placing && !placed) onClose();
  });

  // ── Payment method (round 15): WhatsApp is communication, never payment ──
  const instapayNo = config?.instapayNumber ?? '';
  const vodafoneNo = config?.vodafoneNumber ?? '';
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cod');
  const [senderPhone, setSenderPhone] = useState('');
  const [copied, setCopied] = useState<'number' | 'amount' | null>(null);
  // Derived (never effect-corrected): a method whose number the owner cleared
  // mid-checkout silently falls back to COD.
  const method: PaymentMethod =
    payMethod === 'instapay' && !instapayNo
      ? 'cod'
      : payMethod === 'vodafone' && !vodafoneNo
        ? 'cod'
        : payMethod;
  const isTransfer = method === 'instapay' || method === 'vodafone';
  const transferNumber = method === 'instapay' ? instapayNo : vodafoneNo;

  const copyText = async (kind: 'number' | 'amount', value: string) => {
    // ui.ts owns the clipboard logic (incl. the execCommand fallback);
    // on failure the number stays visible for a manual copy.
    if (!(await copyToClipboard(value))) return;
    setCopied(kind);
    setTimeout(() => setCopied(null), 1600);
  };

  const setField = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    // Clear the field error as soon as the user starts fixing it.
    setErrors((e) => {
      if (!e[`customer.${key}`]) return e;
      const next = { ...e };
      delete next[`customer.${key}`];
      return next;
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs['customer.name'] = t('errName');
    if (!EG_MOBILE_RE.test(stripPhoneChars(form.phone)))
      errs['customer.phone'] = t('errPhone');
    if (form.city.trim().length < 2) errs['customer.city'] = t('errCity');
    if (form.address.trim().length < 5) errs['customer.address'] = t('errAddress');
    if (isTransfer && !EG_MOBILE_RE.test(stripPhoneChars(senderPhone)))
      errs['payment.sender'] = t('errPaySender');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const shakeSheet = () => {
    if (sheetRef.current && !prefersReducedMotion()) {
      anime({
        targets: sheetRef.current,
        translateX: [0, -7, 6, -4, 3, 0],
        duration: 420,
        easing: 'easeOutQuad',
      });
    }
  };

  const placeOrder = async () => {
    setServerError(null);
    if (!validate()) {
      shakeSheet();
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang,
          customer: {
            name: form.name,
            phone: form.phone,
            city: form.city,
            address: form.address,
          },
          items: items.map((i) => ({
            slug: i.slug,
            size: i.size,
            color: i.color,
            qty: i.qty,
          })),
          promoCode: promoCode || undefined,
          paymentMethod: method,
          paymentSenderPhone: isTransfer ? stripPhoneChars(senderPhone) : undefined,
          subscribe: subscribe || undefined,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        order?: { number: string; total: number; city: string; address: string; paymentMethod?: PaymentMethod };
        payment?: { instapayNumber: string; vodafoneNumber: string };
        whatsappUrl?: string;
        error?: string;
        errors?: Record<string, string>;
      };

      if (!res.ok || !data.ok || !data.order) {
        if (data.errors) setErrors(data.errors);
        setServerError(
          data.error && data.error !== 'Validation failed'
            ? data.error
            : t('reviewFields')
        );
        shakeSheet();
        setPlacing(false);
        return;
      }

      // Complimentary shipping → 3–5 days, otherwise 5–7.
      const eta = shipping === 0 ? t('etaFast') : t('etaSlow');
      setPlaced({
        number: data.order.number,
        total: data.order.total,
        city: data.order.city,
        address: data.order.address,
        eta,
        paymentMethod: method,
      });
      setPayInfo(data.payment ?? null);
      setPlacing(false);
      setWhatsappUrl(data.whatsappUrl ?? null);
      saveCheckoutMemory(form); // 17-b — next checkout opens prefilled
      onOrderPlaced(); // clear the cart — the sheet survives via stable root
      // Auto-open the hand-off for COD orders; transfer orders keep the
      // customer on the panel (they may want to copy the number first) and
      // reach WhatsApp through the big confirmation button below.
      if (data.whatsappUrl && method === 'cod') {
        window.open(data.whatsappUrl, '_blank', 'noopener');
      }
      // Round 31 (research item 5): hand the moment to the dedicated
      // thank-you page — coupon gift, re-order, tracking + opt-in. The
      // in-sheet confirmation below only flashes while the route changes.
      router.push(`/thank-you?order=${encodeURIComponent(data.order.number)}`);
      // (round 13: the elastic check-pop was removed — the owner asked for a
      // SIMPLE transition between the data-entry panel and this one.)
    } catch {
      setPlacing(false);
      setServerError(t('errNetwork'));
      shakeSheet();
    }
  };

  const methodCards: Array<{
    id: PaymentMethod;
    label: string;
    desc: string;
    icon: typeof Banknote;
    available: boolean;
  }> = [
    { id: 'cod', label: t('cod'), desc: t('codSoon'), icon: Banknote, available: true },
    ...(instapayNo
      ? [{ id: 'instapay' as const, label: t('instapay'), desc: t('instapayDesc'), icon: Wallet, available: true }]
      : []),
    ...(vodafoneNo
      ? [{ id: 'vodafone' as const, label: t('vodafoneCash'), desc: t('vodafoneDesc'), icon: Smartphone, available: true }]
      : []),
  ];

  const activeMethod = method;

  return (
    <div className="fixed inset-0 z-70 flex items-end md:items-center justify-center p-0 md:p-4" role="dialog" aria-label={t('checkoutTitle')}>
      <div
        className="fixed inset-0 animate-in fade-in duration-300 bg-sadn-plum-950/45 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-[430px] md:max-w-xl lg:max-w-2xl animate-in slide-in-from-bottom duration-300 md:animate-in md:fade-in md:zoom-in-95">
        <div
          ref={sheetRef}
          className="sheet-grab max-h-[88dvh] md:max-h-[85dvh] overflow-y-auto rounded-none md:rounded-sm border border-sadn-plum-100 bg-sadn-canvas p-5 md:p-8 shadow-2xl shadow-sadn-plum-950/20 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sadn-sheet-scroll"
        >
          {placed ? (
            <CheckoutConfirmation
              placed={placed}
              whatsappUrl={whatsappUrl}
              isTransfer={isTransfer}
              onDone={onDone}
            />
          ) : (
            <>
              <div className="sadn-step-fade">
              <div className="flex items-center justify-between">
                <h2 className="font-sadn-display text-2xl text-sadn-ink">{t('checkoutTitle')}</h2>
                <button
                  type="button"
                  aria-label={t('ariaCloseCheckout')}
                  onClick={onClose}
                  className="tap-target flex items-center justify-center rounded-none text-sadn-ink-soft transition-colors hover:bg-sadn-plum-50 active:scale-90"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* ── Delivery details ── */}
              <div className="mt-5">
                <p className={`flex items-center gap-1.5 ${EYEBROW_SM}`}>
                  <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
                  {t('deliveryDetails')}
                </p>
                <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                  {FIELDS.map((f) => {
                    const err = errors[`customer.${f.key}`];
                    const invalid = Boolean(err);
                    if (f.key === 'city') {
                      // Governorate combobox — bilingual EN/AR matching with
                      // keyboard navigation (round 7-a); extracted 18-3a2.
                      return (
                        <CityField
                          key={f.key}
                          value={form.city}
                          onChange={(v) => setField('city', v)}
                          invalid={invalid}
                          error={err}
                        />
                      );
                    }
                    return (
                      <label
                        key={f.key}
                        className={`block ${f.half ? 'col-span-1' : 'col-span-2'}`}
                      >
                        <span className="mb-1 block text-xs font-medium text-sadn-ink">
                          {t(f.labelKey)}
                        </span>
                        <input
                          type={f.type}
                          value={form[f.key]}
                          onChange={(e) => setField(f.key, e.target.value)}
                          placeholder={t(f.phKey)}
                          autoComplete={f.autoComplete}
                          aria-invalid={invalid || undefined}
                          aria-describedby={invalid ? `err-${f.key}` : undefined}
                          enterKeyHint={f.key === 'address' ? 'done' : 'next'}
                          className="sadn-input"
                        />
                        {invalid && (
                          <span
                            id={`err-${f.key}`}
                            role="alert"
                            className="sadn-field-error"
                          >
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            {err}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ── Payment method (round 15) — COD / InstaPay / Vodafone Cash ── */}
              <div className="mt-5">
                <p className={`flex items-center gap-1.5 ${EYEBROW_SM}`}>
                  <Wallet className="h-3.5 w-3.5" strokeWidth={2} />
                  {t('payMethod')}
                </p>
                <div className="mt-2.5 space-y-2" role="radiogroup" aria-label={t('payMethod')}>
                  {methodCards.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        role="radio"
                        aria-checked={activeMethod === m.id}
                        onClick={() => {
                          setPayMethod(m.id);
                          setErrors((e) => {
                            if (!e['payment.sender']) return e;
                            const next = { ...e };
                            delete next['payment.sender'];
                            return next;
                          });
                        }}
                        className={`press flex w-full items-center gap-3 rounded-none border p-3.5 text-start transition-colors ${
                          activeMethod === m.id
                            ? 'border-sadn-plum-800 bg-sadn-plum-50/70'
                            : 'border-sadn-plum-100 hover:border-sadn-plum-200'
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-none ${
                            activeMethod === m.id ? 'bg-sadn-plum-800 text-white' : 'bg-sadn-plum-50 text-sadn-plum-600'
                          }`}
                        >
                          <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 text-sm font-medium text-sadn-ink">
                            {m.label}
                            {activeMethod === m.id && (
                              <span className="rounded-none bg-sadn-plum-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                                {t('selected')}
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-xs leading-snug text-sadn-ink-soft">
                            {m.desc}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Transfer instructions — number + amount copy + sender field */}
                {isTransfer && (
                  <TransferPanel
                    transferNumber={transferNumber}
                    total={total}
                    copied={copied}
                    onCopy={copyText}
                    senderPhone={senderPhone}
                    onSenderPhoneChange={(value) => {
                      setSenderPhone(value);
                      setErrors((err0) => {
                        if (!err0['payment.sender']) return err0;
                        const next = { ...err0 };
                        delete next['payment.sender'];
                        return next;
                      });
                    }}
                    senderError={errors['payment.sender']}
                  />
                )}
              </div>

              {/* ── Summary ── */}
              <div className="mt-5 rounded-none bg-sadn-plum-50/80 p-4 text-sm">
                <OrderSummary
                  variant="checkout"
                  subtotal={subtotal}
                  discount={discount}
                  shipping={shipping}
                  total={total}
                  itemsCount={items.reduce((n, i) => n + i.qty, 0)}
                  promoCode={promoCode}
                />
              </div>

              {serverError && (
                <p
                  role="alert"
                  className="mt-3 flex items-center gap-1.5 rounded-none bg-red-50 px-3 py-2 text-xs text-red-700"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {serverError}
                </p>
              )}

              {/* ── WhatsApp opt-in (round 31, research item 6) — unchecked by
                  default; the number joins the dashboard broadcast list. ── */}
              <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-none border border-sadn-plum-100 bg-sadn-plum-50/50 p-3">
                <input
                  type="checkbox"
                  checked={subscribe}
                  onChange={(e) => setSubscribe(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-sadn-plum-800"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[13px] font-medium text-sadn-ink">
                    <BellRing className="h-3.5 w-3.5 shrink-0 text-sadn-plum-700" strokeWidth={2} />
                    {t('optinLabel')}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-sadn-ink-soft">
                    {t('optinHint')}
                  </span>
                </span>
              </label>

              <button
                type="button"
                onClick={placeOrder}
                disabled={placing}
                className="btn-primary mt-5 flex h-13 w-full items-center justify-center gap-2 py-3.5 text-sm font-medium tracking-wide disabled:cursor-not-allowed disabled:opacity-70"
              >
                {placing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('placing')}
                  </>
                ) : (
                  <>{isTransfer ? t('paySendProof') : t('placeOrder', { money: money(total, lang) })}</>
                )}
              </button>
              <p className="mt-3.5 text-center text-[11px] text-sadn-ink-soft">
                {isTransfer ? t('payScreenshotHint') : t('previewNotePayment')}
              </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
