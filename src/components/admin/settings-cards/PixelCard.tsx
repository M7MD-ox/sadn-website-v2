'use client';

import { BarChart3 } from 'lucide-react';
import { Field, SettingsCard } from '../kit';
import { inputCls, type SettingsCardProps } from './shared';

/**
 * Facebook Pixel card (round 27) — the owner pastes her Meta Pixel ID from
 * Events Manager; the storefront loads the pixel only after a shopper
 * accepts cookies. Empty field = tracking fully off.
 */
export function PixelCard({ s, setS, baseline, t, lang, save, saveBtn }: SettingsCardProps) {
  return (
    <SettingsCard icon={BarChart3} title={t('pixelCard')} description={t('pixelCardBody')}>
      <div className="mt-4">
        <Field label={t('fbPixelId')}>
          <input
            value={s.fbPixelId}
            onChange={(e) => setS((p) => ({ ...p, fbPixelId: e.target.value }))}
            dir="ltr"
            inputMode="numeric"
            placeholder="1234567890123456"
            className={`${inputCls} font-mono`}
          />
        </Field>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px] leading-relaxed text-sadn-ink-soft">
          {lang === 'ar'
            ? 'البيكسل بيشتغل بس للزوار اللي وافقت على الكوكيز — تفريغ الحقل = إيقاف التتبع نهائيًا.'
            : 'Tracking fires only for cookie-accepting visitors — clearing the field turns the pixel off.'}
        </p>
        {saveBtn(
          s.fbPixelId === baseline.fbPixelId,
          () => void save(['fbPixelId'], 'savedToast', 'pixel'),
          'pixel'
        )}
      </div>
    </SettingsCard>
  );
}
