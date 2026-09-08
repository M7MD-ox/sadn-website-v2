'use client';

import { useEffect, useState } from 'react';
import { Ruler } from 'lucide-react';
import { useT } from '@/lib/i18n';

type FitCounts = { tight: number; trueToSize: number; loose: number };

/**
 * Fit-feedback chips (round 29) — the sizing-returns lever from the
 * retention research: display real customer verdicts ("runs small / true /
 * large") on the product page, next to the size selector. The data comes
 * from reviews the owner linked to this product in the dashboard. Renders
 * nothing until at least one linked verdict exists.
 */
export function FitFeedbackChips({ slug }: { slug: string }) {
  const t = useT();
  const [counts, setCounts] = useState<FitCounts | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/reviews')
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const list: Array<{ productSlug?: string | null; fitFeedback?: string | null }> = Array.isArray(
          d?.reviews
        )
          ? d.reviews
          : [];
        const c: FitCounts = { tight: 0, trueToSize: 0, loose: 0 };
        for (const r of list) {
          if (r.productSlug !== slug) continue;
          if (r.fitFeedback === 'tight') c.tight += 1;
          else if (r.fitFeedback === 'true') c.trueToSize += 1;
          else if (r.fitFeedback === 'loose') c.loose += 1;
        }
        setCounts(c);
      })
      .catch(() => {
        /* chips are a nice-to-have — a failed fetch stays silent */
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  if (!counts) return null;
  const total = counts.tight + counts.trueToSize + counts.loose;
  if (total === 0) return null;

  const chips: Array<{ key: string; label: string; n: number; lead: boolean }> = [
    { key: 'tight', label: t('fitTight'), n: counts.tight, lead: counts.tight >= total / 2 },
    { key: 'true', label: t('fitTrue'), n: counts.trueToSize, lead: counts.trueToSize >= total / 2 },
    { key: 'loose', label: t('fitLoose'), n: counts.loose, lead: counts.loose >= total / 2 },
  ].filter((c) => c.n > 0);

  return (
    <div data-fit-chips className="mt-3">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-luxe text-sadn-plum-600">
        <Ruler className="h-3 w-3" strokeWidth={1.8} aria-hidden />
        {t('fitTitle')}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {chips.map((c) => (
          <span
            key={c.key}
            className={`inline-flex items-center gap-1.5 rounded-none border px-2.5 py-1 text-[11px] ${
              c.lead
                ? 'border-sadn-plum-400 bg-sadn-plum-50 font-semibold text-sadn-plum-800'
                : 'border-sadn-plum-100 text-sadn-ink-soft'
            }`}
          >
            {c.label}
            <span className="price-num text-[10px]">{c.n}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
