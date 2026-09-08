'use client';

import { ListChecks } from 'lucide-react';
import type { OrderStage, OrderStageTone } from '@/lib/store-settings';
import { AddRowButton, RowDeleteButton, SettingsCard } from '../kit';
import { SortableList } from '../SortableList';
import { inputCls, type SettingsCardProps } from './shared';

/** Order stage checklist (round 15) — drag & drop pipeline (round 16). */
export function OrderStagesCard({ s, setS, baseline, t, lang, save, saveBtn }: SettingsCardProps) {
  return (
    <SettingsCard icon={ListChecks} title={t('orderStages')} description={t('orderStagesBody')}>
      <div className="mt-4">
        <SortableList
          items={s.orderStages}
          getId={(st) => st.id}
          ariaLabel={t('orderStages')}
          t={t}
          onReorder={(next) => setS((p) => ({ ...p, orderStages: next }))}
          className="space-y-2"
          renderItem={(st, i) => {
            const setStage = (patch: Partial<OrderStage>) =>
              setS((p) => ({
                ...p,
                orderStages: p.orderStages.map((x, idx) => (idx === i ? { ...x, ...patch } : x)),
              }));
            const warn = st.tone === 'warn';
            return (
              <div
                className={`rounded-none border p-3 transition-colors ${
                  warn ? 'border-orange-200 bg-orange-50/40' : 'border-sadn-plum-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-none text-[10px] font-bold ${
                      warn ? 'bg-orange-500 text-white' : 'bg-sadn-plum-800 text-white'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <input
                    value={lang === 'ar' ? st.ar : st.en}
                    onChange={(e) => setStage(lang === 'ar' ? { ar: e.target.value } : { en: e.target.value })}
                    placeholder={lang === 'ar' ? 'اسم المرحلة' : 'Stage label'}
                    className={`${inputCls} h-10 min-w-0 flex-1`}
                  />
                  <div className="w-24 shrink-0 sm:w-36">
                    <select
                      value={st.tone}
                      onChange={(e) => setStage({ tone: (e.target.value === 'warn' ? 'warn' : 'ok') as OrderStageTone })}
                      aria-label={t('stageTone')}
                      className={`${inputCls} h-10 text-xs ${warn ? 'text-orange-600' : ''}`}
                    >
                      <option value="ok">{t('toneOk')}</option>
                      <option value="warn">{t('toneWarn')}</option>
                    </select>
                  </div>
                  <RowDeleteButton
                    label={t('delete')}
                    onClick={() =>
                      setS((p) => ({ ...p, orderStages: p.orderStages.filter((_, idx) => idx !== i) }))
                    }
                    disabled={s.orderStages.length <= 1}
                    className="shrink-0"
                  />
                </div>
                {/* the second-language label lives on the second row */}
                <input
                  value={lang === 'ar' ? st.en : st.ar}
                  onChange={(e) => setStage(lang === 'ar' ? { en: e.target.value } : { ar: e.target.value })}
                  placeholder={lang === 'ar' ? t('stageLabelEn') : t('stageLabelAr')}
                  className={`${inputCls} mt-2 h-9 text-xs`}
                />
              </div>
            );
          }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <AddRowButton
          label={t('addStage')}
          disabled={s.orderStages.length >= 10}
          onClick={() =>
            setS((p) => ({
              ...p,
              orderStages: [
                ...p.orderStages,
                {
                  id: `stage-${Date.now().toString(36)}`,
                  en: lang === 'ar' ? '' : 'New stage',
                  ar: lang === 'ar' ? 'مرحلة جديدة' : '',
                  tone: 'ok' as const,
                },
              ],
            }))
          }
        />
        {saveBtn(
          JSON.stringify(s.orderStages) === JSON.stringify(baseline.orderStages),
          () => void save(['orderStages'], 'savedToast', 'stages'),
          'stages'
        )}
      </div>
    </SettingsCard>
  );
}
