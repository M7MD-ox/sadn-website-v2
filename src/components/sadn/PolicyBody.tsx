'use client';

import { useLang } from '@/lib/i18n';

/**
 * Policy body renderer (round 16) — bilingual paragraphs straight from the
 * dashboard. Blank lines split paragraphs; the owner's text is trusted.
 */
export function PolicyBody({ bodyEn, bodyAr }: { bodyEn: string; bodyAr: string }) {
  const lang = useLang();
  const body = (lang === 'ar' ? bodyAr || bodyEn : bodyEn || bodyAr).trim();
  const paragraphs = body.split(/\n+/).filter((p) => p.trim().length > 0);

  return (
    <div className="mt-8 space-y-5">
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className="text-[14px] leading-[1.9] text-pretty text-sadn-ink-soft"
        >
          {p}
        </p>
      ))}
    </div>
  );
}
