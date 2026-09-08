'use client';

import { Phone } from 'lucide-react';
import { Field, SettingsCard } from '../kit';
import { inputCls, type SettingsCardProps } from './shared';

/** Footer contacts (round 13). */
export function ContactsCard({ s, setS, baseline, t, save, saveBtn }: SettingsCardProps) {
  return (
    <SettingsCard icon={Phone} title={t('footerTitle')} description={t('footerBody')}>
      <div className="mt-4 space-y-3">
        <Field label={t('phonesLabel')}>
          <textarea
            value={s.phones.join('\n')}
            onChange={(e) =>
              setS((p) => ({
                ...p,
                phones: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 5),
              }))
            }
            dir="ltr"
            rows={2}
            placeholder={'+20 100 123 4567\n+20 100 123 4568'}
            className={`${inputCls} h-auto resize-none py-2.5`}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('socialInstagram')}>
            <input
              value={s.socials.instagram}
              onChange={(e) => setS((p) => ({ ...p, socials: { ...p.socials, instagram: e.target.value } }))}
              dir="ltr"
              placeholder="https://instagram.com/…"
              className={inputCls}
            />
          </Field>
          <Field label={t('socialFacebook')}>
            <input
              value={s.socials.facebook}
              onChange={(e) => setS((p) => ({ ...p, socials: { ...p.socials, facebook: e.target.value } }))}
              dir="ltr"
              placeholder="https://facebook.com/…"
              className={inputCls}
            />
          </Field>
          <Field label={t('socialTiktok')}>
            <input
              value={s.socials.tiktok}
              onChange={(e) => setS((p) => ({ ...p, socials: { ...p.socials, tiktok: e.target.value } }))}
              dir="ltr"
              placeholder="https://tiktok.com/@…"
              className={inputCls}
            />
          </Field>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end">
        {saveBtn(
          JSON.stringify([s.phones, s.socials]) === JSON.stringify([baseline.phones, baseline.socials]),
          () => void save(['phones', 'socials'], 'footerSaved', 'footer'),
          'footer'
        )}
      </div>
    </SettingsCard>
  );
}
