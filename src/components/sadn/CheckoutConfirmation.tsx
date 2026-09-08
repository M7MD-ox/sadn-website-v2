'use client';

import { Check, MessageCircle } from 'lucide-react';
import { money } from '@/lib/sadn-store';
import { useLang, useT } from '@/lib/i18n';
import { cityLabel } from '@/lib/cities';
import type { PaymentMethod } from '@/lib/store-settings';
import { WA_GREEN_BTN } from './whatsapp';

export type PlacedOrder = {
  number: string;
  total: number;
  city: string;
  address: string;
  eta: string;
  paymentMethod: PaymentMethod;
};

/**
 * Placed-order confirmation — the sheet's success step. Purely
 * presentational; extracted verbatim from CheckoutSheet (18-3a2).
 */
export function CheckoutConfirmation({
  placed,
  whatsappUrl,
  isTransfer,
  onDone,
}: {
  placed: PlacedOrder;
  whatsappUrl: string | null;
  isTransfer: boolean;
  onDone: () => void;
}) {
  const t = useT();
  const lang = useLang();
  return (
    <div className="sadn-step-fade flex flex-col items-center py-6 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-none bg-sadn-plum-800 ring-8 ring-sadn-plum-50">
        <Check className="h-9 w-9 text-white" strokeWidth={2.5} />
      </span>
      <h2 className="sadn-fade-up fade-up-d1 mt-6 font-sadn-display text-3xl text-sadn-ink">
        {t('orderPlaced')}
      </h2>
      <p className="sadn-fade-up fade-up-d1 mt-1 text-sm font-semibold tracking-wide text-sadn-plum-700">
        {t('orderNo', { n: placed.number })}
      </p>
      {isTransfer && (
        <p className="sadn-fade-up fade-up-d1 mt-2 flex items-center gap-1.5 rounded-none bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
          <span className="h-1.5 w-1.5 rounded-none bg-amber-500" />
          {t('payReviewNote')}
        </p>
      )}
      <div className="sadn-fade-up fade-up-d2 mt-4 w-full rounded-none bg-sadn-plum-50/80 p-4 text-start text-[13px] leading-relaxed text-sadn-ink-soft ring-1 ring-inset ring-sadn-plum-100">
        <p>
          <span className="font-medium text-sadn-ink">{t('deliveringTo')}</span> —{' '}
          {placed.address}, {cityLabel(placed.city, lang)}
        </p>
        <p className="mt-1">
          <span className="font-medium text-sadn-ink">{t('eta')}</span> —{' '}
          {placed.eta}
        </p>
        <p className="mt-1">
          <span className="font-medium text-sadn-ink">{t('total')}</span> —{' '}
          {money(placed.total, lang)} ·{' '}
          {placed.paymentMethod === 'cod'
            ? t('codSuffix')
            : placed.paymentMethod === 'instapay'
              ? t('instapay')
              : t('vodafoneCash')}
        </p>
      </div>
      <div className="sadn-fade-up fade-up-d3 mt-5 w-full space-y-3">
        {whatsappUrl && (
          <>
            <button
              type="button"
              onClick={() => window.open(whatsappUrl, '_blank', 'noopener')}
              className={`press flex h-13 w-full items-center justify-center gap-2 rounded-none py-3.5 text-sm font-semibold tracking-wide text-white shadow-lg transition-colors active:scale-[0.98] ${WA_GREEN_BTN}`}
            >
              <MessageCircle className="h-4.5 w-4.5" strokeWidth={2} />
              {isTransfer ? t('paySendProof') : t('sendWhatsapp')}
            </button>
            <p className="text-center text-[11px] leading-snug text-sadn-ink-soft">
              {isTransfer ? t('payScreenshotHint') : t('whatsappHint')}
            </p>
          </>
        )}
        <button
          type="button"
          onClick={onDone}
          className="btn-primary h-12 w-full text-sm font-medium tracking-wide shadow-lg shadow-sadn-plum-800/25"
        >
          {t('backHome')}
        </button>
      </div>
    </div>
  );
}
