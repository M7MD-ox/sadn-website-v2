'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BellRing,
  Check,
  Copy,
  Gift,
  MapPin,
  MessageCircle,
  RotateCcw,
} from 'lucide-react';
import { money, useSadnStore } from '@/lib/sadn-store';
import { localName, useLang, useT } from '@/lib/i18n';
import { cityLabel } from '@/lib/cities';
import { copyToClipboard } from '@/lib/ui';
import { WA_GREEN_BTN } from './whatsapp';
import { EYEBROW_SM } from './primitives';
import type { OrderLine } from '@/lib/orders';
import type { PaymentMethod } from '@/lib/store-settings';

/**
 * Post-purchase screen (round 31, research item 5). Reached immediately
 * after the checkout sheet registers the order: confirmation + WhatsApp
 * hand-off fallback, the next-order coupon gift, one-tap re-order and the
 * WhatsApp opt-in card ("سيبي رقمك"). Round 38: the tracking link is gone
 * — the order number doubles as the WhatsApp reference.
 */

export type ThankYouOrder = {
  number: string;
  phone: string;
  customerName: string;
  city: string;
  address: string;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  promoCode: string | null;
  items: OrderLine[];
};

type Props = {
  order: ThankYouOrder | null;
  whatsappUrls: { en: string; ar: string } | null;
  transfer: { instapayNumber: string; vodafoneNumber: string };
  coupon: { code: string; kind: 'percent' | 'fixed'; value: number; minSubtotal: number } | null;
};

export function ThankYouScreen({ order, whatsappUrls, transfer, coupon }: Props) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const addToCart = useSadnStore((s) => s.addToCart);

  const [copied, setCopied] = useState<'code' | 'number' | null>(null);
  const [reordered, setReordered] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const waUrl = whatsappUrls ? (lang === 'ar' ? whatsappUrls.ar : whatsappUrls.en) : null;

  // Complimentary shipping → 3–5 days, otherwise 5–7 (same rule as checkout).
  const eta = order ? (order.shipping === 0 ? t('etaFast') : t('etaSlow')) : '';

  const couponLabel = useMemo(() => {
    if (!coupon) return '';
    return coupon.kind === 'percent' ? `${coupon.value}%` : money(coupon.value, lang);
  }, [coupon, lang]);

  const copy = async (kind: 'code' | 'number', value: string) => {
    if (!(await copyToClipboard(value))) return;
    setCopied(kind);
    setTimeout(() => setCopied(null), 1600);
  };

  const reorder = () => {
    if (!order) return;
    for (const line of order.items) {
      addToCart(
        {
          slug: line.slug,
          name: line.name,
          nameAr: line.nameAr,
          image: line.image,
          price: line.price,
          size: line.size,
          color: line.color,
        },
        line.qty
      );
    }
    setReordered(true);
    setTimeout(() => router.push('/bag'), 800);
  };

  const subscribe = async () => {
    if (!order || subscribing || subscribed) return;
    setSubscribing(true);
    try {
      const res = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: order.phone,
          name: order.customerName,
          source: 'thankyou',
        }),
      });
      if (res.ok) setSubscribed(true);
    } catch {
      /* silent — the card stays, she can tap again */
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-5 lg:px-8 pb-24 pt-8 lg:pt-14">
      {/* ── Hero ── */}
      <div className="flex flex-col items-center text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-none bg-sadn-plum-800 ring-8 ring-sadn-plum-50">
          <Check className="h-9 w-9 text-white" strokeWidth={2.5} />
        </span>
        <h1 className="sadn-fade-up fade-up-d1 mt-6 font-sadn-display text-3xl text-sadn-ink">
          {t('tyTitle')}
        </h1>
        <p className="sadn-fade-up fade-up-d1 mx-auto mt-2 max-w-[36ch] text-[13px] leading-relaxed text-sadn-ink-soft">
          {t('tySub')}
        </p>

        {order && (
          <div className="sadn-fade-up fade-up-d2 mt-5 w-full">
            <p className={`${EYEBROW_SM} justify-center`}>{t('tyOrderNo')}</p>
            <button
              type="button"
              onClick={() => copy('number', order.number)}
              aria-label={t('tyCouponCopy')}
              className="press mt-1.5 inline-flex items-center gap-2 rounded-none border border-dashed border-sadn-plum-300 bg-sadn-plum-50/60 px-4 py-2 font-mono text-base font-bold tracking-widest text-sadn-ink"
            >
              {order.number}
              {copied === 'number' ? (
                <Check className="h-4 w-4 text-emerald-600" strokeWidth={2.5} />
              ) : (
                <Copy className="h-4 w-4 text-sadn-plum-600" strokeWidth={2} />
              )}
            </button>
            <p className="mt-1.5 text-[11px] text-sadn-ink-soft">{t('tySaveHint')}</p>
          </div>
        )}
      </div>

      {order && (
        <>
          {/* ── Order summary ── */}
          <div className="sadn-fade-up fade-up-d2 mt-6 w-full rounded-none bg-sadn-plum-50/80 p-4 text-start text-[13px] leading-relaxed text-sadn-ink-soft ring-1 ring-inset ring-sadn-plum-100">
            <p>
              <span className="font-medium text-sadn-ink">{t('deliveringTo')}</span> — {order.address},{' '}
              {cityLabel(order.city, lang)}
            </p>
            <p className="mt-1">
              <span className="font-medium text-sadn-ink">{t('eta')}</span> — {eta}
            </p>
            <p className="mt-1">
              <span className="font-medium text-sadn-ink">{t('total')}</span> — {money(order.total, lang)} ·{' '}
              {order.paymentMethod === 'cod'
                ? t('codSuffix')
                : order.paymentMethod === 'instapay'
                  ? t('instapay')
                  : t('vodafoneCash')}
            </p>
            {/* Transfer orders: the numbers stay reachable from here too. */}
            {order.paymentMethod === 'instapay' && transfer.instapayNumber && (
              <p className="mt-1 font-mono text-xs text-sadn-ink">InstaPay: {transfer.instapayNumber}</p>
            )}
            {order.paymentMethod === 'vodafone' && transfer.vodafoneNumber && (
              <p className="mt-1 font-mono text-xs text-sadn-ink">Vodafone Cash: {transfer.vodafoneNumber}</p>
            )}
          </div>

          {/* ── WhatsApp hand-off fallback (popup blockers) ── */}
          {waUrl && (
            <div className="sadn-fade-up fade-up-d3 mt-4 w-full space-y-1.5">
              <button
                type="button"
                onClick={() => window.open(waUrl, '_blank', 'noopener')}
                className={`press flex h-13 w-full items-center justify-center gap-2 rounded-none py-3.5 text-sm font-semibold tracking-wide text-white shadow-lg transition-colors active:scale-[0.98] ${WA_GREEN_BTN}`}
              >
                <MessageCircle className="h-4.5 w-4.5" strokeWidth={2} />
                {t('tyWhatsapp')}
              </button>
              <p className="text-center text-[11px] leading-snug text-sadn-ink-soft">{t('tyWhatsappHint')}</p>
            </div>
          )}

          {/* ── Next-order coupon gift ── */}
          {coupon && (
            <div className="sadn-fade-up fade-up-d3 mt-5 w-full rounded-none border border-dashed border-sadn-plum-300 bg-white p-4 text-center shadow-sm">
              <p className={`inline-flex items-center gap-1.5 ${EYEBROW_SM}`}>
                <Gift className="h-3.5 w-3.5" strokeWidth={2} />
                {t('tyCouponTitle')}
              </p>
              <p className="mt-1.5 text-[12px] text-sadn-ink-soft">{t('tyCouponSub')}</p>
              <div className="mt-2.5 flex items-center justify-center gap-2">
                <span className="rounded-none bg-sadn-plum-800 px-4 py-2 font-mono text-base font-bold tracking-widest text-white">
                  {coupon.code}
                </span>
                <span className="rounded-none bg-sadn-plum-50 px-2.5 py-2 text-xs font-semibold text-sadn-plum-700 ring-1 ring-inset ring-sadn-plum-100">
                  {couponLabel}
                  {coupon.kind === 'percent' ? ' OFF' : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copy('code', coupon.code)}
                className="press mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-sadn-plum-700 underline-offset-2 hover:underline"
              >
                {copied === 'code' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.5} />
                ) : (
                  <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                )}
                {copied === 'code' ? t('tyCouponCopied') : t('tyCouponCopy')}
              </button>
              {coupon.minSubtotal > 0 && (
                <p className="mt-1 text-[11px] text-sadn-ink-soft">
                  {t('tyCouponMin', { money: money(coupon.minSubtotal, lang) })}
                </p>
              )}
            </div>
          )}

          {/* ── Your pieces ── */}
          <div className="mt-6">
            <p className={EYEBROW_SM}>{t('tyItems')}</p>
            <ul className="mt-2.5 space-y-2.5">
              {order.items.map((it, i) => (
                <li
                  key={`${it.slug}-${it.size}-${it.color}-${i}`}
                  className="flex items-center gap-3 rounded-none border border-sadn-plum-100 bg-white p-2.5"
                >
                  { }
                  <img
                    src={it.image}
                    alt={localName(it, lang)}
                    className="h-14 w-14 shrink-0 rounded-none border border-sadn-plum-100 object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-sadn-ink">
                      {localName(it, lang)}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-sadn-ink-soft">
                      {it.size} · {it.color} · ×{it.qty}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold text-sadn-ink">
                    {money(it.price * it.qty, lang)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Actions ── */}
          <div className="mt-5 space-y-2.5">
            <button
              type="button"
              onClick={reorder}
              className="btn-primary flex h-12 w-full items-center justify-center gap-2 text-sm font-medium tracking-wide shadow-lg shadow-sadn-plum-800/25"
            >
              {reordered ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <RotateCcw className="h-4 w-4" strokeWidth={2} />}
              {reordered ? t('tyReordered') : t('tyReorder')}
            </button>
            {/* Round 38 (owner): the /track link is gone entirely — the
                WhatsApp chat above IS the order-support channel. */}
          </div>

          {/* ── WhatsApp opt-in ("سيبي رقمك") ── */}
          {!subscribed ? (
            <div className="mt-6 rounded-none border border-sadn-plum-100 bg-sadn-plum-50/50 p-4 text-center">
              <p className={`inline-flex items-center gap-1.5 ${EYEBROW_SM}`}>
                <BellRing className="h-3.5 w-3.5" strokeWidth={2} />
                {t('tySubscribeTitle')}
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-sadn-ink-soft">{t('tySubscribeSub')}</p>
              <button
                type="button"
                onClick={subscribe}
                disabled={subscribing}
                className="press mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-none border border-sadn-plum-800 bg-white text-sm font-semibold text-sadn-plum-800 transition-colors hover:bg-sadn-plum-50 disabled:opacity-60"
              >
                <MessageCircle className="h-4 w-4" strokeWidth={2} />
                {t('tySubscribeCta')}
              </button>
            </div>
          ) : (
            <p
              role="status"
              className="mt-6 flex items-center justify-center gap-2 rounded-none bg-emerald-50 px-3 py-3 text-[13px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100"
            >
              <Check className="h-4 w-4" strokeWidth={2.5} />
              {t('tySubscribeDone')}
            </p>
          )}
        </>
      )}

      <Link
        href="/"
        className="btn-primary mt-6 flex h-12 w-full items-center justify-center text-sm font-medium tracking-wide shadow-lg shadow-sadn-plum-800/25"
      >
        {t('tyBackHome')}
      </Link>
    </div>
  );
}
