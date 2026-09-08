'use client';

import { Truck } from 'lucide-react';
import { Field, SettingsCard } from '../kit';
import { inputCls, type SettingsCardProps } from './shared';

/**
 * Delivery fee + free-shipping threshold (round 13/29). The threshold is
 * the AOV lever from the retention research: a subtotal at/above it ships
 * free, and the bag shows the "كم باقي للشحن المجاني" progress bar.
 * 0 = the rule and the bar are both off.
 */
export function DeliveryCard({ s, setS, baseline, t, save, saveBtn }: SettingsCardProps) {
  const dirty =
    s.shippingFee !== baseline.shippingFee ||
    s.freeShippingThreshold !== baseline.freeShippingThreshold;
  return (
    <SettingsCard icon={Truck} title={t('deliveryTitle')} description={t('deliveryBody')}>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field label={t('deliveryFeeLabel')} className="block flex-1">
          <input
            type="number"
            min={0}
            max={1000}
            value={s.shippingFee}
            onChange={(e) => setS((p) => ({ ...p, shippingFee: Number(e.target.value) }))}
            dir="ltr"
            className={inputCls}
          />
        </Field>
        <Field label={t('freeShipThresholdLabel')} className="block flex-1">
          <input
            type="number"
            min={0}
            max={100000}
            step={50}
            value={s.freeShippingThreshold}
            onChange={(e) => setS((p) => ({ ...p, freeShippingThreshold: Number(e.target.value) }))}
            dir="ltr"
            className={inputCls}
          />
        </Field>
        {saveBtn(
          dirty,
          () =>
            void save(
              ['shippingFee', 'freeShippingThreshold'],
              'deliverySaved',
              'ship'
            ),
          'ship'
        )}
      </div>
      <p className="mt-2 text-[11px] text-sadn-ink-soft">{t('freeShipThresholdHint')}</p>
    </SettingsCard>
  );
}
