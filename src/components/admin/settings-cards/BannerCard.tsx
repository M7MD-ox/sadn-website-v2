'use client';

import { Megaphone } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Field, SettingsCard } from '../kit';
import { inputCls, type SettingsCardProps } from './shared';

/** Announcement banner (round 11) with a live preview strip. */
export function BannerCard({ s, setS, baseline, t, lang, save, saveBtn }: SettingsCardProps) {
  return (
    <SettingsCard
      icon={Megaphone}
      title={t('bannerTitle')}
      description={t('bannerBody')}
      action={
        <Switch
          checked={s.bannerVisible}
          onCheckedChange={(v) => setS((p) => ({ ...p, bannerVisible: v }))}
          aria-label={t('bannerVisible')}
        />
      }
    >
      {/* Live preview strip (mirrors the storefront banner) */}
      {s.bannerVisible && (s.bannerTextEn || s.bannerTextAr) && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-none bg-sadn-plum-800 px-3 py-2 text-white" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <Megaphone className="h-3.5 w-3.5 shrink-0 text-white/80" strokeWidth={1.75} />
          <span className="truncate text-[11px] font-medium tracking-wide">
            {lang === 'ar' ? s.bannerTextAr : s.bannerTextEn}
          </span>
        </div>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label={t('bannerTextEn')}>
          <input
            value={s.bannerTextEn}
            onChange={(e) => setS((p) => ({ ...p, bannerTextEn: e.target.value }))}
            dir="ltr"
            maxLength={140}
            placeholder="10% OFF your first order · code SADN10"
            className={inputCls}
          />
        </Field>
        <Field label={t('bannerTextAr')}>
          <input
            value={s.bannerTextAr}
            onChange={(e) => setS((p) => ({ ...p, bannerTextAr: e.target.value }))}
            dir="rtl"
            maxLength={140}
            placeholder="خصم ١٠٪ على أول طلب · كود SADN10"
            className={inputCls}
          />
        </Field>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px] text-sadn-ink-soft">{t('bannerVisible')}</p>
        {saveBtn(
          // Round 19 fix: the switch and the two texts are ONE combined
          // baseline check — the old `switchUnchanged || textsUnchanged` OR
          // kept the button permanently disabled for toggle-only and
          // text-only edits alike.
          (s.bannerVisible === baseline.bannerVisible &&
            s.bannerTextEn === baseline.bannerTextEn &&
            s.bannerTextAr === baseline.bannerTextAr) ||
            !s.bannerTextEn.trim() ||
            !s.bannerTextAr.trim(),
          () => void save(['bannerVisible', 'bannerTextEn', 'bannerTextAr'], 'bannerSaved', 'banner'),
          'banner'
        )}
      </div>
    </SettingsCard>
  );
}
