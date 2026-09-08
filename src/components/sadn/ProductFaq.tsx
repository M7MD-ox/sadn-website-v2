'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { pickBi } from '@/lib/pick-bi';
import { useLang, useT } from '@/lib/i18n';
import { PRODUCT_FAQ } from '@/lib/product-faq';

/**
 * Product FAQ (round 39 — owner): a section on the product page where she
 * taps a question and the answer unfolds in place. Visual language matches
 * the ProductSections accordions exactly (brand hairlines, quiet chevron
 * spin, the grid-rows height trick). Unlike those, every row here opens
 * INDEPENDENTLY — a customer comparing the exchange window with the
 * shipping time keeps both visible.
 */
export function ProductFaq() {
  const t = useT();
  const lang = useLang();
  const [openIdx, setOpenIdx] = useState<Record<number, boolean>>({});

  const toggle = (i: number) => setOpenIdx((m) => ({ ...m, [i]: !m[i] }));

  return (
    <div data-rise className="mt-9">
      <h2 className="font-sadn-display text-xl text-sadn-ink">{t('faqTitle')}</h2>
      <div className="mt-2 border-t border-sadn-plum-100">
        {PRODUCT_FAQ.map((f, i) => {
          const open = Boolean(openIdx[i]);
          const q = pickBi(lang, f.q.en, f.q.ar);
          const a = pickBi(lang, f.a.en, f.a.ar);
          return (
            <div key={i} className="border-b border-sadn-plum-100">
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 py-4 text-start"
              >
                <span className="flex-1 text-sm font-medium text-sadn-ink">{q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-sadn-ink-soft transition-transform duration-300 ${
                    open ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-500 ease-out ${
                  open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">
                  <p className="pb-4 pe-2 ps-7 text-[13px] leading-relaxed whitespace-pre-line text-sadn-ink-soft">
                    {a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
