'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useT } from '@/lib/i18n';
import type { ReviewDTO } from '@/lib/sadn-store';
import type { ChatThread } from '@/lib/store-settings';
import { ReviewStack, buildReviewItems } from './ReviewStack';

/**
 * Testimonials section — 38 redesign, 39 rename.
 *
 * Round 38: "اعد تصميم قسم التقيمات خلي اسمه الريفيوز" + "شيل كلمات من القلب
 * و النجوم" — the header became a big display word over a thin
 * verified-count line; the eyebrow and the five-star row are gone.
 * Round 39 (owner): the word is now «عملاءنا بيقولو ايه» / "What our
 * customers say" (3xl — the longer bilingual title needs the calmer size).
 * The dashboard still manages both sources: the screenshots (التقييمات tab)
 * and the chat threads (Settings → المحادثات). The section stands down
 * only when neither source yields a single card.
 */
export function TestimonialsChat({
  reviews,
  threads,
}: {
  reviews: ReviewDTO[];
  threads: ChatThread[];
}) {
  const t = useT();
  const reduced = useReducedMotion();
  const visible = threads.filter((th) => th.enabled);

  // One unified content model (screenshots lead, chats fall back, cap 12)
  // shared by the header count and the carousel — they can never disagree.
  const items = useMemo(() => buildReviewItems(reviews, visible), [reviews, visible]);

  if (items.length === 0) return null;

  return (
    <section aria-label={t('reviewsTitle')} className="pt-16">
      {/* Header — the section word + a hairline + the verified count.
          framer-motion owns the entrance (the GSAP [data-animate] layer is
          deliberately not used here so the two systems never double-fire). */}
      <motion.header
        className="px-5"
        initial={reduced ? false : { opacity: 0, y: 18 }}
        whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '0px 0px -40px 0px' }}
        transition={reduced ? { duration: 0 } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-sadn-display text-3xl font-bold tracking-tight text-sadn-ink">
            {t('reviewsTitle')}
          </h2>
          <p className="price-num whitespace-nowrap text-[11px] font-medium text-sadn-ink-soft">
            {t('reviewsCount', { n: items.length })}
          </p>
        </div>
        <span aria-hidden className="mt-3.5 block h-px w-10 bg-sadn-plum-200" />
      </motion.header>

      {/* The carousel (pt room inside the track keeps the quote cards'
          oversized decorative mark from clipping against the scroll box). */}
      <div className="mt-4">
        <ReviewStack items={items} />
      </div>
    </section>
  );
}
