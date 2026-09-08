'use client';

import { Wallet } from 'lucide-react';
import { Field, SettingsCard } from '../kit';
import { inputCls, type SettingsCardProps } from './shared';

/** Payment methods (round 15) — transfer numbers shown at checkout. */
export function PaymentsCard({ s, setS, baseline, t, lang, save, saveBtn }: SettingsCardProps) {
  return (
    <SettingsCard icon={Wallet} title={t('payMethods')} description={t('payMethodsBody')}>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label={t('instapayNumber')}>
          <input
            value={s.instapayNumber}
            onChange={(e) => setS((p) => ({ ...p, instapayNumber: e.target.value }))}
            dir="ltr"
            inputMode="tel"
            placeholder="01xxxxxxxxx"
            className={`${inputCls} font-mono`}
          />
        </Field>
        <Field label={t('vodafoneNumber')}>
          <input
            value={s.vodafoneNumber}
            onChange={(e) => setS((p) => ({ ...p, vodafoneNumber: e.target.value }))}
            dir="ltr"
            inputMode="tel"
            placeholder="010xxxxxxxx"
            className={`${inputCls} font-mono`}
          />
        </Field>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px] text-sadn-ink-soft">
          {lang === 'ar' ? 'واتساب للتواصل فقط — مش طريقة دفع.' : 'WhatsApp stays a communication channel only.'}
        </p>
        {saveBtn(
          s.instapayNumber === baseline.instapayNumber && s.vodafoneNumber === baseline.vodafoneNumber,
          () => void save(['instapayNumber', 'vodafoneNumber'], 'savedToast', 'pay'),
          'pay'
        )}
      </div>
    </SettingsCard>
  );
}
