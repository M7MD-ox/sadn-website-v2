'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import type { PolicyPage } from '@/lib/store-settings';

/**
 * Policies accordion (round 38 — owner): every dashboard policy is one
 * tappable row — tap the title (e.g. سياسة الاسترجاع) and the body unfolds
 * in place. Round 39 (owner): NOTHING starts open — the page opens as a
 * clean closed list; smooth height animation, square corners, brand
 * hairlines.
 */

export function PolicyAccordion({ policies }: { policies: PolicyPage[] }) {
  const lang = useLang();
  const reduced = useReducedMotion();
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  return (
    <div className="mt-8 flex flex-col">
      {policies.map((p, i) => {
        const title = lang === 'ar' ? p.titleAr || p.titleEn : p.titleEn || p.titleAr;
        const body = lang === 'ar' ? p.bodyAr || p.bodyEn : p.bodyEn || p.bodyAr;
        const paragraphs = body.split(/\n+/).filter((x) => x.trim().length > 0);
        const open = openSlug === p.slug;
        return (
          <div key={p.slug} className="border-b border-sadn-plum-100 first:border-t">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenSlug(open ? null : p.slug)}
              className="press flex w-full items-center justify-between gap-3 py-5 text-start"
            >
              <span className="flex items-baseline gap-3">
                <span
                  aria-hidden
                  className="price-num text-[10px] font-semibold text-sadn-plum-300"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-sadn-display text-lg font-medium text-sadn-ink transition-colors group-hover:text-sadn-plum-800">
                  {title}
                </span>
              </span>
              <motion.span
                animate={{ rotate: open ? 180 : 0 }}
                transition={reduced ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
                className="flex h-8 w-8 shrink-0 items-center justify-center border border-sadn-plum-200 text-sadn-plum-700"
                aria-hidden
              >
                <ChevronDown className="h-4 w-4" strokeWidth={1.75} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  key="body"
                  initial={reduced ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={reduced ? { height: 'auto', opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={
                    reduced ? { duration: 0 } : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
                  }
                  className="overflow-hidden"
                >
                  <div className="space-y-4 pb-6 pe-10 ps-8">
                    {paragraphs.map((para, pi) => (
                      <p
                        key={pi}
                        className="text-[14px] leading-[1.9] text-pretty text-sadn-ink-soft"
                      >
                        {para}
                      </p>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
