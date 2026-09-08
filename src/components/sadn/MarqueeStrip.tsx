'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { pickBi } from '@/lib/pick-bi';
import { useLang } from '@/lib/i18n';
import type { MarqueeConfig } from '@/lib/store-settings';

/**
 * Hero marquee strip (round 16) — the owner controls everything from the
 * dashboard: the text (bilingual), on/off, and an optional CTA button that
 * opens any internal page. Rules:
 *  - the strip renders ONLY when enabled AND at least one language has text;
 *  - the loop animation runs only when there is text to scroll;
 *  - the CTA renders only when the owner filled a label + href.
 *
 * Round 38 (owner): "خلي الشريط يبدا من اليمين و يكون loop مايتعادش" — the
 * crawl now always enters from the RIGHT edge and glides leftward (the RTL
 * reverse override is gone), and the loop is seamless: the track is exactly
 * two identical halves, each half repeating the text enough times to cover
 * the widest shell, so −50% lands the second half precisely where the first
 * one started — no gap, no restart jump.
 */
const COPIES_PER_HALF = 6;

export function MarqueeStrip({ marquee }: { marquee: MarqueeConfig }) {
  const lang = useLang();
  const text = pickBi(lang, marquee.textEn, marquee.textAr);
  const ctaLabel = pickBi(lang, marquee.ctaLabelEn, marquee.ctaLabelAr);

  if (!marquee.enabled || !text.trim()) return null;
  const ctaHref = marquee.ctaHref.trim();
  const hasCta = Boolean(ctaLabel.trim() && ctaHref);
  const CtaIcon = lang === 'ar' ? ArrowLeft : ArrowRight;
  const isInternal = ctaHref.startsWith('/');
  const externalProps = isInternal
    ? {}
    : { target: '_blank' as const, rel: 'noopener noreferrer' };

  /** One half of the track: the text repeated to out-cover the viewport.
   *  The second half is always aria-hidden (screen readers read it once). */
  const half = (hidden: boolean) => (
    <span className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {Array.from({ length: COPIES_PER_HALF }).map((_, i) => (
        <span key={i} className="px-2 text-[11px] uppercase tracking-luxe text-sadn-plum-600">
          {`${text} · `}
        </span>
      ))}
    </span>
  );

  return (
    <div className="border-y border-sadn-plum-100">
      <div className="flex items-stretch">
        <div className="sadn-marquee-wrap min-w-0 flex-1 overflow-hidden py-3" aria-hidden={hasCta || undefined}>
          <div className="sadn-marquee flex w-max whitespace-nowrap">
            {half(hasCta)}
            {half(true)}
          </div>
        </div>
        {hasCta && (
          <Link
            href={ctaHref}
            {...externalProps}
            className="flex shrink-0 items-center gap-1.5 border-s border-sadn-plum-100 px-4 text-[11px] font-semibold uppercase tracking-luxe-tight text-sadn-plum-800 transition-colors hover:bg-sadn-plum-50"
          >
            {ctaLabel}
            <CtaIcon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}
