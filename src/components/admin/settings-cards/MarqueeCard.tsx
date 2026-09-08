'use client';

import { useState } from 'react';
import { MoveHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Field, SettingsCard } from '../kit';
import { inputCls, type SettingsCardProps } from './shared';

/** Round 16: home marquee strip. */
export function MarqueeCard({ s, setS, baseline, t, save, saveBtn }: SettingsCardProps) {
  const [marqueeErr, setMarqueeErr] = useState(false);

  return (
    <SettingsCard
      icon={MoveHorizontal}
      title={t('marqueeTitle')}
      description={t('marqueeBody')}
      action={
        <Switch
          checked={s.marquee.enabled}
          onCheckedChange={(v) => setS((p) => ({ ...p, marquee: { ...p.marquee, enabled: v } }))}
          aria-label={t('marqueeEnabled')}
        />
      }
    >
      <div className="mt-4 space-y-3">
        <Field label={t('bannerTextEn')}>
          <input
            value={s.marquee.textEn}
            onChange={(e) => setS((p) => ({ ...p, marquee: { ...p.marquee, textEn: e.target.value } }))}
            dir="ltr"
            maxLength={280}
            className={inputCls}
          />
        </Field>
        <Field label={t('bannerTextAr')}>
          <input
            value={s.marquee.textAr}
            onChange={(e) => setS((p) => ({ ...p, marquee: { ...p.marquee, textAr: e.target.value } }))}
            dir="rtl"
            maxLength={280}
            className={inputCls}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('marqueeCtaHref')} className="block sm:col-span-1">
            <input
              value={s.marquee.ctaHref}
              onChange={(e) => {
                setMarqueeErr(false);
                setS((p) => ({ ...p, marquee: { ...p.marquee, ctaHref: e.target.value } }));
              }}
              dir="ltr"
              placeholder={t('marqueeCtaHrefPh')}
              className={`${inputCls} font-mono text-xs ${marqueeErr ? 'ring-1 ring-red-400' : ''}`}
            />
            {marqueeErr && <span className="mt-1 block text-[11px] text-red-600">{t('ctaHrefInvalid')}</span>}
          </Field>
          <Field label={t('marqueeCtaLabelEn')}>
            <input
              value={s.marquee.ctaLabelEn}
              onChange={(e) => setS((p) => ({ ...p, marquee: { ...p.marquee, ctaLabelEn: e.target.value } }))}
              dir="ltr"
              maxLength={40}
              className={inputCls}
            />
          </Field>
          <Field label={t('marqueeCtaLabelAr')}>
            <input
              value={s.marquee.ctaLabelAr}
              onChange={(e) => setS((p) => ({ ...p, marquee: { ...p.marquee, ctaLabelAr: e.target.value } }))}
              dir="rtl"
              maxLength={40}
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px] text-sadn-ink-soft">{t('marqueeEnabled')}</p>
        {saveBtn(
          JSON.stringify(s.marquee) === JSON.stringify(baseline.marquee) ||
            (!s.marquee.textEn.trim() && !s.marquee.textAr.trim()) ||
            (s.marquee.ctaHref.trim() !== '' && !s.marquee.ctaHref.trim().startsWith('/')),
          () => {
            const href = s.marquee.ctaHref.trim();
            if (href !== '' && !href.startsWith('/')) {
              setMarqueeErr(true);
              toast.error(t('ctaHrefInvalid'));
              return;
            }
            void save(['marquee'], 'marqueeSaved', 'marquee');
          },
          'marquee'
        )}
      </div>
    </SettingsCard>
  );
}
