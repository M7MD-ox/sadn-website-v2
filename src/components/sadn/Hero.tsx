'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { prefersReducedMotion } from '@/lib/gsap-setup';
import { useT } from '@/lib/i18n';

/**
 * Home hero (extracted verbatim from HomeScreen, 18-3a2) — the dashboard-
 * managed crossfade slideshow, its dots and the CTA row. The [data-hero]
 * entrance and the [data-hero-frame] scrub live in useHomeMotion and target
 * this markup by selector inside the HomeScreen gsap scope, so extraction
 * does not affect them.
 */
export function Hero({
  heroImages,
  heroInterval,
}: {
  heroImages: string[];
  heroInterval: number;
}) {
  const t = useT();
  // ── Hero slideshow (round 13) ──
  // The owner shrunk the hero and added dashboard-managed images that
  // crossfade on a dashboard-set interval (smooth fade/dissolve, no slide).
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (heroImages.length <= 1) return;
    if (prefersReducedMotion()) return;
    const id = setInterval(
      () => setSlide((s) => (s + 1) % heroImages.length),
      Math.max(2, heroInterval) * 1000
    );
    return () => clearInterval(id);
  }, [heroImages.length, heroInterval]);
  // If the owner trims the list while a high index is active
  const safeSlide = heroImages.length > 0 ? slide % heroImages.length : 0;

  return (
    <section className="pb-4">
      {/* Owner (round 16-e): wordmark + tagline block removed from under the
          header — the hero image now leads. The single <h1> lives on as
          sr-only so every page still keeps exactly one heading + brand text
          for SEO/screen readers (SEO spec: one h1 per page). */}
      <h1 className="sr-only">SADN سدن</h1>
      <div
        data-hero
        data-hero-frame
        className="img-frame relative h-[52dvh] min-h-[300px] max-h-[480px] lg:h-[70vh] lg:max-h-[720px] overflow-hidden rounded-none bg-sadn-stone"
      >
        {heroImages.map((src, i) => (
          <Image
            key={src + i}
            src={src}
            alt={i === 0 ? t('heroAlt') : t('viewGalleryImage', { name: 'SADN', n: i + 1 })}
            fill
            priority={i === 0}
            sizes="100vw"
            className={`object-cover transition-opacity duration-[1400ms] ease-in-out ${
              i === safeSlide ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        {heroImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
            {heroImages.map((src, i) => (
              <button
                key={src + i}
                type="button"
                aria-label={t('ariaViewImage', { n: i + 1 })}
                onClick={() => setSlide(i)}
                className={`h-1.5 rounded-none transition-all duration-300 ${
                  i === safeSlide ? 'w-6 bg-white' : 'w-1.5 bg-white/45'
                }`}
              />
            ))}
          </div>
        )}
      </div>
      <div data-hero className="mt-6 flex gap-4 px-5 lg:px-8 max-w-lg mx-auto">
        <Link
          href="/shop"
          className="h-12 lg:h-13 flex-1 rounded-none bg-sadn-plum-800 text-sm font-medium tracking-wide text-white transition-colors hover:bg-sadn-plum-700 active:scale-[0.98] shadow-sm flex items-center justify-center"
        >
          {t('ctaExplore')}
        </Link>
        <button
          type="button"
          onClick={() =>
            document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' })
          }
          className="h-12 lg:h-13 rounded-none border border-sadn-plum-200 px-6 lg:px-8 text-sm font-medium text-sadn-ink transition-colors hover:bg-sadn-plum-50 active:scale-[0.98]"
        >
          {t('ctaStory')}
        </button>
      </div>
    </section>
  );
}
