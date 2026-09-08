'use client';

import { LayoutList } from 'lucide-react';
import type { ProductSection, ProductSectionKind } from '@/lib/store-settings';
import { Switch } from '@/components/ui/switch';
import { AddRowButton, Field, RowDeleteButton, SettingsCard } from '../kit';
import { SortableList } from '../SortableList';
import { inputCls, type SettingsCardProps } from './shared';

/** Round 16: product-page collapsible sections (drag to reorder). */
export function ProductSectionsCard({ s, setS, baseline, t, lang, save, saveBtn }: SettingsCardProps) {
  return (
    <SettingsCard icon={LayoutList} title={t('sectionsTitle')} description={t('sectionsBody')}>
      <div className="mt-4">
        <SortableList
          items={s.productSections}
          getId={(sec) => sec.id}
          ariaLabel={t('sectionsTitle')}
          t={t}
          onReorder={(next) => setS((p) => ({ ...p, productSections: next }))}
          className="space-y-2"
          renderItem={(sec, i) => {
            const setSec = (patch: Partial<ProductSection>) =>
              setS((p) => ({
                ...p,
                productSections: p.productSections.map((x, idx) => (idx === i ? { ...x, ...patch } : x)),
              }));
            return (
              <div className="rounded-none border border-sadn-plum-100 p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={lang === 'ar' ? sec.titleAr : sec.titleEn}
                    onChange={(e) =>
                      setSec(lang === 'ar' ? { titleAr: e.target.value } : { titleEn: e.target.value })
                    }
                    placeholder={lang === 'ar' ? t('sectionTitleAr') : t('sectionTitleEn')}
                    className={`${inputCls} h-10 min-w-0 flex-1`}
                  />
                  <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[10px] text-sadn-ink-soft">
                    <Switch
                      checked={sec.enabled}
                      onCheckedChange={(v) => setSec({ enabled: v })}
                      aria-label={t('sectionEnabled')}
                    />
                    {t('sectionEnabled')}
                  </label>
                  <RowDeleteButton
                    label={t('delete')}
                    onClick={() =>
                      setS((p) => ({
                        ...p,
                        productSections: p.productSections.filter((_, idx) => idx !== i),
                      }))
                    }
                    className="shrink-0"
                  />
                </div>

                <input
                  value={lang === 'ar' ? sec.titleEn : sec.titleAr}
                  onChange={(e) =>
                    setSec(lang === 'ar' ? { titleEn: e.target.value } : { titleAr: e.target.value })
                  }
                  placeholder={lang === 'ar' ? t('sectionTitleEn') : t('sectionTitleAr')}
                  className={`${inputCls} mt-2 h-9 text-xs`}
                />

                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={sec.kind}
                    onChange={(e) => setSec({ kind: e.target.value as ProductSectionKind })}
                    aria-label={t('sectionKind')}
                    className={`${inputCls} h-9 flex-1 py-0 text-xs`}
                  >
                    <option value="description">{t('kindDescription')}</option>
                    <option value="sizes">{t('kindSizes')}</option>
                    <option value="custom">{t('kindCustom')}</option>
                  </select>
                </div>

                {/* Bodies only make sense for custom text — the description
                    section renders the product's own copy, sizes renders the table */}
                {sec.kind === 'custom' && (
                  <div className="mt-2 space-y-2">
                    <Field label={t('bodyEn')} spanClassName="mb-1 block text-[10px] font-medium text-sadn-ink-soft">
                      <textarea
                        value={sec.bodyEn}
                        onChange={(e) => setSec({ bodyEn: e.target.value })}
                        rows={3}
                        dir="ltr"
                        className={`${inputCls} h-auto resize-none py-2 text-xs`}
                      />
                    </Field>
                    <Field label={t('bodyAr')} spanClassName="mb-1 block text-[10px] font-medium text-sadn-ink-soft">
                      <textarea
                        value={sec.bodyAr}
                        onChange={(e) => setSec({ bodyAr: e.target.value })}
                        rows={3}
                        dir="rtl"
                        className={`${inputCls} h-auto resize-none py-2 text-xs`}
                      />
                    </Field>
                  </div>
                )}
                {sec.kind === 'description' && (
                  <p className="mt-2 text-[10px] leading-relaxed text-sadn-ink-soft">
                    {lang === 'ar'
                      ? 'النص بيتجاب تلقائياً من وصف المنتج.'
                      : 'The body comes from the product description automatically.'}
                  </p>
                )}
              </div>
            );
          }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <AddRowButton
          label={t('addSection')}
          disabled={s.productSections.length >= 8}
          onClick={() =>
            setS((p) => ({
              ...p,
              productSections: [
                ...p.productSections,
                {
                  id: `sec-${Date.now().toString(36)}`,
                  kind: 'custom' as const,
                  titleEn: 'New section',
                  titleAr: 'قسم جديد',
                  bodyEn: '',
                  bodyAr: '',
                  enabled: true,
                },
              ],
            }))
          }
        />
        {saveBtn(
          JSON.stringify(s.productSections) === JSON.stringify(baseline.productSections),
          () => void save(['productSections'], 'savedToast', 'sections'),
          'sections'
        )}
      </div>
    </SettingsCard>
  );
}
