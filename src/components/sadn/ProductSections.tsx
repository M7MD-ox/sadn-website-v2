'use client';

import { useState } from 'react';
import { ChevronDown, Ruler } from 'lucide-react';
import { pickBi } from '@/lib/pick-bi';
import { useLang, useT } from '@/lib/i18n';
import type { ProductDTO } from '@/lib/sadn-store';
import type { ProductSection, SizeRow } from '@/lib/store-settings';

/**
 * Dashboard-controlled collapsible sections (round 16; extracted verbatim
 * from ProductScreen, 18-3a2) — the owner decides which sections exist,
 * their titles, and their bodies. Slow, quiet motion rhythm (16-b). Hidden
 * (disabled) sections and the description fallback are resolved in
 * activeSections (16-g).
 */
export function ProductSections({
  product,
  sections,
  sizeGuide,
  onOpenSizeGuide,
}: {
  product: ProductDTO;
  sections: ProductSection[];
  sizeGuide: SizeRow[];
  onOpenSizeGuide: () => void;
}) {
  const t = useT();
  const lang = useLang();

  // Owner (round 16-g): the long story now lives ONLY inside the details
  // accordion. Two guarantees here:
  //   1. sections the dashboard hid (enabled=false) finally stop rendering —
  //      the toggle existed but the storefront silently ignored it;
  //   2. if the owner's section list carries no description-kind row, a
  //      fallback "تفاصيل العباية / Details" accordion hosts the long text
  //      so it never vanishes from the page.
  const activeSections = (() => {
    const enabled = sections.filter((sec) => sec.enabled);
    if (product.description.trim() && !enabled.some((sec) => sec.kind === 'description')) {
      return [
        ...enabled,
        {
          id: 'description-auto',
          kind: 'description' as const,
          titleEn: 'Details',
          titleAr: 'تفاصيل العباية',
          bodyEn: '',
          bodyAr: '',
          enabled: true,
        },
      ];
    }
    return enabled;
  })();

  // Owner (round 16-g): every accordion starts collapsed — the page leads
  // with ONE short line under the title and the long story is a tap away.
  const [openAcc, setOpenAcc] = useState<string | null>(null);

  if (activeSections.length === 0) return null;

  /** Body of one dashboard-controlled accordion section. */
  const sectionBody = (sec: ProductSection) => {
    if (sec.kind === 'description') {
      return <p className="pb-4 pe-2 ps-7 text-[13px] leading-relaxed whitespace-pre-line text-sadn-ink-soft">{product.description}</p>;
    }
    if (sec.kind === 'sizes') {
      const rows = sizeGuide.filter((r) => !(product.hiddenSizes ?? []).includes(r.size));
      return (
        <div className="pb-4 pe-2 ps-7">
          {pickBi(lang, sec.bodyEn, sec.bodyAr).trim() && (
            <p className="mb-3 text-[13px] leading-relaxed text-sadn-ink-soft">
              {pickBi(lang, sec.bodyEn, sec.bodyAr)}
            </p>
          )}
          {rows.length > 0 ? (
            <div>
              <table className="sg-table w-full text-[12px]">
                <thead>
                  <tr className="text-[9px] uppercase tracking-luxe-tight text-sadn-plum-600">
                    <th scope="col" className="py-2 ps-3 text-start font-semibold">{t('sgColSize')}</th>
                    <th scope="col" className="py-2 text-start font-semibold">{t('sgColBust')}</th>
                    <th scope="col" className="py-2 text-start font-semibold">{t('sgColWaist')}</th>
                    <th scope="col" className="py-2 pe-3 text-start font-semibold">{t('sgColHip')}</th>
                  </tr>
                </thead>
                <tbody className="price-num">
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-sadn-plum-50">
                      <th scope="row" className="py-2 ps-3 text-start text-[11px] font-bold text-sadn-plum-800">{row.size}</th>
                      <td className="py-2 text-sadn-ink">{row.bust}</td>
                      <td className="py-2 text-sadn-ink">{row.waist}</td>
                      <td className="py-2 pe-3 text-sadn-ink">{row.hip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => onOpenSizeGuide()}
            className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-sadn-plum-800 underline-offset-4 hover:underline"
          >
            <Ruler className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
            {t('sizeGuide')}
          </button>
        </div>
      );
    }
    return (
      <p className="pb-4 pe-2 ps-7 text-[13px] leading-relaxed whitespace-pre-line text-sadn-ink-soft">
        {pickBi(lang, sec.bodyEn, sec.bodyAr)}
      </p>
    );
  };

  return (
    <div data-rise className="mt-8 border-t border-sadn-plum-100">
      {activeSections.map((sec) => {
        const open = openAcc === sec.id;
        const title = pickBi(lang, sec.titleEn, sec.titleAr);
        return (
          <div key={sec.id} className="border-b border-sadn-plum-100">
            <button
              type="button"
              onClick={() => setOpenAcc(open ? null : sec.id)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 py-4 text-start"
            >
              <span className="flex-1 text-sm font-medium text-sadn-ink">
                {title}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-sadn-ink-soft transition-transform duration-300 ${
                  open ? 'rotate-180' : ''
                }`}
              />
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-500 ease-out ${
                open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">{sectionBody(sec)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
