'use client';

import { Ruler } from 'lucide-react';
import type { SizeRow } from '@/lib/store-settings';
import { AddRowButton, Field, RowDeleteButton, SettingsCard } from '../kit';
import { SortableList } from '../SortableList';
import { inputCls, type SettingsCardProps } from './shared';

/** Round 16: size guide (cm rows, drag to reorder). */
export function SizeGuideCard({ s, setS, baseline, t, save, saveBtn }: SettingsCardProps) {
  return (
    <SettingsCard icon={Ruler} title={t('sizeGuideTitle')} description={t('sizeGuideBody')}>
      <div className="mt-4">
        <SortableList
          items={s.sizeGuide}
          getId={(row) => row.id}
          ariaLabel={t('sizeGuideTitle')}
          t={t}
          onReorder={(next) => setS((p) => ({ ...p, sizeGuide: next }))}
          className="space-y-2"
          renderItem={(row, i) => {
            const setRow = (patch: Partial<SizeRow>) =>
              setS((p) => ({
                ...p,
                sizeGuide: p.sizeGuide.map((x, idx) => (idx === i ? { ...x, ...patch } : x)),
              }));
            const cell = (key: keyof SizeRow, label: string, w: string, ph = '—') => (
              <Field
                label={label}
                className={`block ${w}`}
                spanClassName="mb-1 block text-[10px] font-medium text-sadn-ink-soft"
              >
                <input
                  value={String(row[key])}
                  onChange={(e) => setRow({ [key]: e.target.value } as Partial<SizeRow>)}
                  placeholder={ph}
                  className={`${inputCls} h-9 py-0 text-xs`}
                  dir="ltr"
                  inputMode="text"
                />
              </Field>
            );
            return (
              <div className="rounded-none border border-sadn-plum-100 p-3">
                <div className="flex items-end gap-2">
                  {cell('size', t('sgSize'), 'w-20')}
                  {cell('length', t('sgLength'), 'w-24')}
                  <RowDeleteButton
                    label={t('delete')}
                    onClick={() =>
                      setS((p) => ({ ...p, sizeGuide: p.sizeGuide.filter((_, idx) => idx !== i) }))
                    }
                    disabled={s.sizeGuide.length <= 1}
                    size={9}
                    className="ms-auto shrink-0"
                  />
                </div>
                <div className="mt-2 flex items-end gap-2">
                  {cell('bust', t('sgBust'), 'flex-1')}
                  {cell('waist', t('sgWaist'), 'flex-1')}
                  {cell('hip', t('sgHip'), 'flex-1')}
                </div>
              </div>
            );
          }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <AddRowButton
          label={t('addSizeRow')}
          disabled={s.sizeGuide.length >= 12}
          onClick={() =>
            setS((p) => ({
              ...p,
              sizeGuide: [
                ...p.sizeGuide,
                {
                  id: `row-${Date.now().toString(36)}`,
                  size: '',
                  bust: '',
                  waist: '',
                  hip: '',
                  length: '',
                },
              ],
            }))
          }
        />
        {saveBtn(
          JSON.stringify(s.sizeGuide) === JSON.stringify(baseline.sizeGuide),
          () => void save(['sizeGuide'], 'savedToast', 'sg'),
          'sg'
        )}
      </div>
    </SettingsCard>
  );
}
