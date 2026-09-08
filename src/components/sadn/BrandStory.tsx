'use client';

import { useT } from '@/lib/i18n';

/**
 * Brand story — the editorial close above the footer. Round 38 (owner): the
 * section is her verbatim copy — the old «واسعة في القصّة… قريبة من
 * القلب.» sentence is gone. Structure: the title, the origin line, the
 * "as if we wear it ourselves" lead, three quiet lines (colours / fabrics /
 * loose cuts) between hairlines, and the close.
 */
export function BrandStory() {
  const t = useT();
  return (
    <section id="story" className="px-8 py-24 text-center">
      <p className="text-[10px] font-medium uppercase tracking-luxe text-sadn-plum-600 eyebrow-rule">
        {t('storyTitle')}
      </p>
      <p className="mx-auto mt-6 max-w-[40ch] font-sadn-display text-[22px] leading-relaxed text-pretty text-sadn-ink">
        {t('storyIntro')}
      </p>
      <p className="mx-auto mt-6 max-w-[36ch] text-[13px] leading-relaxed text-pretty text-sadn-ink-soft">
        {t('storyLead')}
      </p>

      {/* The three brand lines — quiet stacked rows between hairlines */}
      <ul className="mx-auto mt-7 max-w-[30ch] space-y-3">
        {[t('storyL1'), t('storyL2'), t('storyL3')].map((line) => (
          <li
            key={line}
            className="border-b border-sadn-plum-100 pb-3 text-[14px] font-medium text-sadn-ink last:border-0 last:pb-0"
          >
            {line}
          </li>
        ))}
      </ul>

      <p className="mx-auto mt-8 max-w-[36ch] text-[13px] leading-relaxed text-pretty text-sadn-ink-soft">
        {t('storyClose')}
      </p>
      <div className="mx-auto mt-8 h-px w-10 bg-sadn-plum-200" />
      <p className="mt-5 text-[10px] uppercase tracking-luxe text-sadn-plum-600">
        SADN
      </p>
    </section>
  );
}
