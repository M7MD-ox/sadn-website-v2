'use client';

import { BadgePercent } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Field, SettingsCard } from '../kit';
import { inputCls, type SettingsCardProps } from './shared';

/** Promo code (round 13). */
export function PromoCard({ s, setS, baseline, t, lang, save, saveBtn }: SettingsCardProps) {
  return (
    <SettingsCard
      icon={BadgePercent}
      title={t('promoTitle')}
      description={t('promoBody')}
      action={
        <Switch
          checked={s.promoEnabled}
          onCheckedChange={(v) => setS((p) => ({ ...p, promoEnabled: v }))}
          aria-label={t('promoEnabled')}
        />
      }
    >
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Field label={t('promoCodeLabel')}>
          <input
            value={s.promoCode}
            onChange={(e) => setS((p) => ({ ...p, promoCode: e.target.value.toUpperCase() }))}
            dir="ltr"
            maxLength={24}
            placeholder="SADN10"
            className={`${inputCls} uppercase tracking-wider`}
          />
        </Field>
        <Field label={t('promoPercentLabel')}>
          <input
            type="number"
            min={1}
            max={90}
            value={s.promoPercent}
            onChange={(e) => setS((p) => ({ ...p, promoPercent: Number(e.target.value) }))}
            dir="ltr"
            className={inputCls}
          />
        </Field>
        <Field label={t('promoMinLabel')}>
          <input
            type="number"
            min={0}
            value={s.promoMin}
            onChange={(e) => setS((p) => ({ ...p, promoMin: Number(e.target.value) }))}
            dir="ltr"
            className={inputCls}
          />
        </Field>
      </div>
      {/* Live preview of the storefront chip */}
      {s.promoEnabled && s.promoCode && (
        <div className="mt-4 flex items-center gap-2.5 rounded-none border border-dashed border-sadn-plum-400 bg-sadn-plum-50/60 px-3.5 py-3">
          <BadgePercent className="h-4 w-4 text-sadn-plum-700" strokeWidth={1.75} />
          <div>
            <p className="text-xs font-semibold tracking-wider text-sadn-plum-800">{s.promoCode}</p>
            <p className="text-[11px] text-sadn-ink-soft">
              {lang === 'ar' ? `خصم ${s.promoPercent}٪ على طلبك` : `${s.promoPercent}% off your order`}
            </p>
          </div>
        </div>
      )}
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px] text-sadn-ink-soft">{t('promoEnabled')}</p>
        {saveBtn(JSON.stringify([s.promoEnabled, s.promoCode, s.promoPercent, s.promoMin]) === JSON.stringify([baseline.promoEnabled, baseline.promoCode, baseline.promoPercent, baseline.promoMin]), () => void save(['promoEnabled', 'promoCode', 'promoPercent', 'promoMin'], 'promoSaved', 'promo'), 'promo')}
      </div>
    </SettingsCard>
  );
}
