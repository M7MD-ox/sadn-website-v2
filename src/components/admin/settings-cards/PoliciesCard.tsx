'use client';

import { FileText } from 'lucide-react';
import type { PolicyPage } from '@/lib/store-settings';
import { Switch } from '@/components/ui/switch';
import { Field, SettingsCard } from '../kit';
import { inputCls, type SettingsCardProps } from './shared';

/** Round 16: policy pages (fixed slugs). */
export function PoliciesCard({ s, setS, baseline, t, save, saveBtn }: SettingsCardProps) {
  return (
    <SettingsCard icon={FileText} title={t('policiesTitle')} description={t('policiesBody')}>
      <div className="mt-4 space-y-3">
        {s.policies.map((pol) => {
          const setPol = (patch: Partial<PolicyPage>) =>
            setS((p) => ({
              ...p,
              policies: p.policies.map((x) => (x.slug === pol.slug ? { ...x, ...patch } : x)),
            }));
          const title =
            pol.slug === 'shipping'
              ? t('policyShipping')
              : pol.slug === 'returns'
                ? t('policyReturns')
                : pol.slug === 'privacy'
                  ? t('policyPrivacy')
                  : /* Round 39: terms/contact/legal rows surface their own
                       dashboard-managed titles instead of admin labels. */
                    pol.titleAr || pol.titleEn || pol.slug;
          return (
            <div key={pol.slug} className="rounded-none border border-sadn-plum-100 p-3.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-sadn-ink-soft" dir="ltr">
                  /policies/{pol.slug}
                </span>
                <span className="text-xs font-semibold text-sadn-ink">{title}</span>
                <label className="ms-auto flex shrink-0 cursor-pointer items-center gap-1.5 text-[10px] text-sadn-ink-soft">
                  <Switch
                    checked={pol.enabled}
                    onCheckedChange={(v) => setPol({ enabled: v })}
                    aria-label={t('policyEnabled')}
                  />
                  {t('policyEnabled')}
                </label>
              </div>
              <div className="mt-2.5 grid gap-2">
                <input
                  value={pol.titleEn}
                  onChange={(e) => setPol({ titleEn: e.target.value })}
                  placeholder={t('sectionTitleEn')}
                  dir="ltr"
                  className={`${inputCls} h-9 py-0 text-xs`}
                />
                <input
                  value={pol.titleAr}
                  onChange={(e) => setPol({ titleAr: e.target.value })}
                  placeholder={t('sectionTitleAr')}
                  dir="rtl"
                  className={`${inputCls} h-9 py-0 text-xs`}
                />
                <Field label={t('bodyEn')} spanClassName="mb-1 block text-[10px] font-medium text-sadn-ink-soft">
                  <textarea
                    value={pol.bodyEn}
                    onChange={(e) => setPol({ bodyEn: e.target.value })}
                    rows={4}
                    dir="ltr"
                    className={`${inputCls} h-auto resize-none py-2 text-xs`}
                  />
                </Field>
                <Field label={t('bodyAr')} spanClassName="mb-1 block text-[10px] font-medium text-sadn-ink-soft">
                  <textarea
                    value={pol.bodyAr}
                    onChange={(e) => setPol({ bodyAr: e.target.value })}
                    rows={4}
                    dir="rtl"
                    className={`${inputCls} h-auto resize-none py-2 text-xs`}
                  />
                </Field>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-end">
        {saveBtn(
          JSON.stringify(s.policies) === JSON.stringify(baseline.policies),
          () => void save(['policies'], 'savedToast', 'policies'),
          'policies'
        )}
      </div>
    </SettingsCard>
  );
}
