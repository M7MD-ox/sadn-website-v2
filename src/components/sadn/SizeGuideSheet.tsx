'use client';

import { useRef } from 'react';
import { Ruler, X } from 'lucide-react';
import { useEscapeToClose, useSheetEntrance } from '@/lib/ui';
import { useLang, useT } from '@/lib/i18n';
import type { SizeRow } from '@/lib/store-settings';

/**
 * Size-guide bottom sheet (round 16) — the rows come from the dashboard
 * (Settings → size guide), centimetres ONLY (the owner removed inches).
 * An empty dashboard table renders as an empty frame — the owner always
 * keeps at least one row saved.
 */

type Props = {
  onClose: () => void;
  rows?: SizeRow[];
  /** Localized fit note under the table. */
  note?: string;
};

export function SizeGuideSheet({ onClose, rows = [], note }: Props) {
  const t = useT();
  const lang = useLang();
  const sheetRef = useRef<HTMLDivElement>(null);

  useSheetEntrance(sheetRef);

  // Escape to close
  useEscapeToClose(onClose);

  const table = rows;
  const hasLength = table.some((r) => r.length.trim());

  return (
    <div
      className="fixed inset-0 z-70 mx-auto flex w-full max-w-[430px] flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={t('sizeGuide')}
    >
      <div
        className="absolute inset-0 animate-in fade-in duration-300 bg-sadn-plum-950/35 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0">
        <div
          ref={sheetRef}
          className="sheet-grab rounded-none border-t border-sadn-plum-100 bg-sadn-canvas px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 shadow-2xl shadow-sadn-plum-950/20"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-sadn-display text-xl text-sadn-ink">
              <Ruler className="h-4.5 w-4.5 text-sadn-plum-600" strokeWidth={1.6} />
              {t('sizeGuide')}
            </p>
            <button
              type="button"
              aria-label={t('sgClose')}
              onClick={onClose}
              className="tap-target flex items-center justify-center rounded-none text-sadn-ink-soft transition-colors hover:bg-sadn-plum-50 active:scale-90"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="sadn-fade-up fade-up-d1 mt-4 flex items-center justify-between">
            <p className="text-[11px] text-sadn-ink-soft">{t('sgMeasure')}</p>
            <span className="rounded-none border border-sadn-plum-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-luxe-tight text-sadn-plum-700">
              {t('sgUnitCm')}
            </span>
          </div>

          {/* Table — dashboard-managed rows, centimetres only */}
          <div className="sadn-fade-up fade-up-d2 mt-3 overflow-hidden rounded-none border border-sadn-plum-100">
            <table className="sg-table w-full text-start text-[13px]">
              <thead>
                <tr className="bg-grain bg-sadn-plum-50/80 text-[10px] uppercase tracking-luxe-tight text-sadn-plum-600">
                  <th scope="col" className="py-2.5 ps-4 text-start font-semibold">
                    {t('sgColSize')}
                  </th>
                  <th scope="col" className="py-2.5 text-start font-semibold">
                    {t('sgColBust')}
                  </th>
                  <th scope="col" className="py-2.5 text-start font-semibold">
                    {t('sgColWaist')}
                  </th>
                  <th scope="col" className="py-2.5 text-start font-semibold">
                    {t('sgColHip')}
                  </th>
                  {hasLength && (
                    <th scope="col" className="py-2.5 pe-4 text-start font-semibold">
                      {t('sgColLength')}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="price-num">
                {table.map((row) => (
                  <tr key={row.id} className="border-t border-sadn-plum-50 bg-sadn-canvas">
                    <th
                      scope="row"
                      className="py-2.5 ps-4 text-start text-xs font-bold tracking-wider text-sadn-plum-800"
                    >
                      {row.size}
                    </th>
                    <td className="py-2.5 text-sadn-ink">{row.bust}</td>
                    <td className="py-2.5 text-sadn-ink">{row.waist}</td>
                    <td className="py-2.5 text-sadn-ink">{row.hip}</td>
                    {hasLength && <td className="py-2.5 pe-4 text-sadn-ink">{row.length}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Fit note */}
          <div className="sadn-fade-up fade-up-d3 mt-4 bg-sadn-plum-50/60 px-4 py-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-luxe-tight text-sadn-plum-600">
              {t('sgFitTitle')}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-pretty text-sadn-ink-soft">
              {note ?? (lang === 'ar' ? 'القصّة واسعة — راجعي الجدول لقياسات دقيقة بالسنتيمتر.' : 'A generous, loose cut — check the table for exact centimetre measurements.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
