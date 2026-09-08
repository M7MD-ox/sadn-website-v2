'use client';

import { AlertCircle, Check, Copy } from 'lucide-react';
import { money } from '@/lib/sadn-store';
import { useLang, useT } from '@/lib/i18n';

/**
 * Transfer instructions — the InstaPay / Vodafone Cash number + amount copy
 * rows and the sender-phone field. Extracted verbatim from CheckoutSheet
 * (18-3a2); the copied/senderPhone state stays with the sheet.
 */
export function TransferPanel({
  transferNumber,
  total,
  copied,
  onCopy,
  senderPhone,
  onSenderPhoneChange,
  senderError,
}: {
  transferNumber: string;
  total: number;
  copied: 'number' | 'amount' | null;
  onCopy: (kind: 'number' | 'amount', value: string) => void;
  senderPhone: string;
  onSenderPhoneChange: (value: string) => void;
  senderError?: string;
}) {
  const t = useT();
  const lang = useLang();
  return (
    <div className="mt-2.5 sadn-step-fade space-y-2.5 rounded-none border border-sadn-plum-100 bg-sadn-canvas p-3.5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-sadn-ink-soft">
          {t('paySendTo')}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <span dir="ltr" className="min-w-0 flex-1 truncate rounded-none bg-sadn-plum-50/80 px-3 py-2 font-mono text-sm font-semibold tracking-wide text-sadn-ink">
            {transferNumber}
          </span>
          <button
            type="button"
            onClick={() => void onCopy('number', transferNumber)}
            aria-label={t('copyNumber')}
            className={`press inline-flex h-10 shrink-0 items-center gap-1.5 rounded-none px-3 text-xs font-semibold transition-colors ${
              copied === 'number'
                ? 'bg-emerald-600 text-white'
                : 'bg-sadn-plum-800 text-white hover:bg-sadn-plum-700'
            }`}
          >
            {copied === 'number' ? (
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            ) : (
              <Copy className="h-3.5 w-3.5" strokeWidth={2} />
            )}
            {copied === 'number' ? t('copiedToast') : t('copyNumber')}
          </button>
        </div>
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-sadn-ink-soft">
          {t('payAmountLabel')}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate rounded-none bg-sadn-plum-50/80 px-3 py-2 text-sm font-semibold text-sadn-ink">
            {money(total, lang)}
          </span>
          <button
            type="button"
            onClick={() =>
              void onCopy(
                'amount',
                String(total)
              )
            }
            aria-label={t('copyAmount')}
            className={`press inline-flex h-10 shrink-0 items-center gap-1.5 rounded-none px-3 text-xs font-semibold transition-colors ${
              copied === 'amount'
                ? 'bg-emerald-600 text-white'
                : 'bg-sadn-plum-800 text-white hover:bg-sadn-plum-700'
            }`}
          >
            {copied === 'amount' ? (
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            ) : (
              <Copy className="h-3.5 w-3.5" strokeWidth={2} />
            )}
            {copied === 'amount' ? t('copiedToast') : t('copyAmount')}
          </button>
        </div>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-sadn-ink">
          {t('paySenderLabel')}
        </span>
        <input
          type="tel"
          value={senderPhone}
          onChange={(e) => onSenderPhoneChange(e.target.value)}
          placeholder={t('paySenderPh')}
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          aria-invalid={Boolean(senderError) || undefined}
          aria-describedby={
            senderError ? 'err-pay-sender' : undefined
          }
          className="sadn-input"
        />
        {senderError && (
          <span id="err-pay-sender" role="alert" className="sadn-field-error">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {senderError}
          </span>
        )}
      </label>
    </div>
  );
}
