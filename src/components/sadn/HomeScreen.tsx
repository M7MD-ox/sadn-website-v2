'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ProductCard } from './ProductCard';
import { MarqueeStrip } from './MarqueeStrip';
import { useChromeHandlers } from './chrome-hooks';
import { useSadnStore, money, type CategoryDTO, type ProductDTO, type ReviewDTO } from '@/lib/sadn-store';
import { TestimonialsChat } from './TestimonialsChat';
import { localName, useLang, useT, type TKey } from '@/lib/i18n';
import type { MarqueeConfig, ChatThread } from '@/lib/store-settings';
import { Hero } from './Hero';
import { BrandStory } from './BrandStory';
import { useHomeMotion } from './useHomeMotion';

// Round 39 (owner): ONE collection — Butterfly Bloom (شيل باقي
// الكولكشنات). The tile still only renders while the dashboard category
// exists, so renaming/removing it in the dashboard drops the tile.
const COLLECTIONS: { key: string; labelKey: TKey }[] = [
  { key: 'butterfly-bloom', labelKey: 'catButterfly' },
];

type Props = {
  products: ProductDTO[];
  /** Dashboard-managed sections — curated tiles filter against them. */
  categories?: CategoryDTO[];
  /** Hero slideshow from the dashboard (round 13): images + interval. */
  heroImages: string[];
  heroInterval: number;
  /** Dashboard-controlled marquee strip under the hero (round 16). */
  marquee: MarqueeConfig;
  /** Dashboard-managed WhatsApp review chats — quote-card fallback (round 17). */
  chatThreads: ChatThread[];
  /** Owner-uploaded review screenshots — the deck's primary cards (17-e). */
  reviews: ReviewDTO[];
};

export function HomeScreen({
  products,
  categories = [],
  heroImages,
  heroInterval,
  marquee,
  chatThreads,
  reviews,
}: Props) {
  const t = useT();
  const lang = useLang();
  const { onAdd, onOpen } = useChromeHandlers();
  const scope = useRef<HTMLDivElement>(null);
  const recentSlugs = useSadnStore((s) => s.recent);
  // Keep order of recently-viewed, resolve to live products, hide missing
  const recent = recentSlugs
    .map((slug) => products.find((p) => p.slug === slug))
    .filter((p): p is ProductDTO => Boolean(p));
  // Curated collections only render while the section still exists in the
  // dashboard — a renamed/removed category drops its tile automatically.
  const collections =
    categories.length > 0
      ? COLLECTIONS.filter((c) => categories.some((x) => x.slug === c.key))
      : COLLECTIONS;

  // All gsap layout effects — extracted verbatim (18-3a2).
  useHomeMotion(scope, products);

  const arrivals =
    products.filter((p) => p.isNew).length > 0
      ? products.filter((p) => p.isNew)
      : products.slice(0, 4);

  return (
    <div ref={scope}>
      {/* ── Hero — dashboard-managed crossfade ──
          Round 17-a (owner): the hero now touches the header — the top
          gutter is gone and the frame grew taller. Still edge-to-edge
          horizontally (16-f); CTAs keep the page grid. */}
      <Hero heroImages={heroImages} heroInterval={heroInterval} />

      {/* ── Marquee — dashboard-controlled text + optional CTA (round 16) ── */}
      <div className="mt-12">
        <MarqueeStrip marquee={marquee} />
      </div>

      {/* ── New Arrivals — owner (round 22): the "وصل حديثاً 01" eyebrow
          above the title is gone; the section opens on its headline. ── */}
      {/* ── New Arrivals ── */}
      {arrivals.length > 0 && (
      <section className="pt-14 lg:pt-20">
        <div className="flex items-end justify-between px-5 lg:px-8" data-animate>
          <div>
            <h2 className="font-sadn-display text-3xl lg:text-4xl text-sadn-ink">
              {t('newArrivals')}
            </h2>
          </div>
          <Link
            href="/shop"
            className="text-xs lg:text-sm font-medium uppercase tracking-luxe-tight text-sadn-plum-700 underline-offset-4 transition-colors hover:text-sadn-plum-800 hover:underline"
          >
            {t('viewAll')}
          </Link>
        </div>
        <div className="no-scrollbar mt-6 flex lg:grid lg:grid-cols-4 snap-x snap-mandatory gap-4 lg:gap-8 overflow-x-auto lg:overflow-visible px-5 lg:px-8 pb-2">
          {arrivals.map((p, i) => (
            <div key={p.slug} className="w-[68%] lg:w-auto shrink-0 snap-start">
              <ProductCard
                product={p}
                onAdd={onAdd}
                onOpen={onOpen}
                priority={i < 4}
              />
            </div>
          ))}
        </div>
      </section>
      )}

      {/* ── Collections ── */}
      <section className="px-5 lg:px-8 pt-16 lg:pt-24">
        <div data-animate>
          <h2 className="font-sadn-display text-3xl lg:text-4xl text-sadn-ink">{t('collectionTiles')}</h2>
        </div>
        <div className={`mt-6 grid gap-4 lg:gap-8 ${collections.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {collections.map((c) => {
            const img = products.find((p) => p.category === c.key)?.images[0];
            const label = t(c.labelKey);
            const single = collections.length === 1;
            return (
              <Link
                key={c.key}
                href={`/shop?cat=${encodeURIComponent(c.key)}`}
                data-animate
                className={`group press relative overflow-hidden rounded-none bg-sadn-stone ${
                  single ? 'aspect-[16/10] lg:aspect-[21/9] lg:max-h-[500px]' : 'aspect-[4/5]'
                }`}
              >
                {img && (
                  <span data-tile-parallax className="absolute inset-x-0 -inset-y-[10%]">
                    <Image
                      src={img}
                      alt={t('collectionAlt', { label })}
                      fill
                      sizes={single ? '100vw' : '(max-width: 1024px) 50vw, 33vw'}
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  </span>
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-sadn-plum-950/60 via-sadn-plum-950/15 to-transparent" />
                <span className="absolute bottom-6 start-6 text-xs lg:text-sm font-semibold uppercase tracking-luxe text-white">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Recently viewed ── */}
      {recent.length >= 2 && (
        <section className="pt-16 lg:pt-24 px-5 lg:px-8" data-animate>
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-sadn-display text-3xl lg:text-4xl text-sadn-ink">
                {t('recentlyViewed')}
              </h2>
            </div>
          </div>
          <div className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
            {recent.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => onOpen(p)}
                className="group w-28 lg:w-36 shrink-0 snap-start text-start"
              >
                <span className="img-frame relative block aspect-[3/4] overflow-hidden rounded-none bg-sadn-stone">
                  <Image
                    src={p.images[0] ?? '/products/hero-abaya.png'}
                    alt={localName(p, lang)}
                    fill
                    sizes="144px"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                </span>
                <span className="mt-2 block truncate text-xs font-medium text-sadn-ink">
                  {localName(p, lang)}
                </span>
                <span className="price-num text-xs font-semibold text-sadn-plum-800">
                  {money(p.price, lang)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Reviews (35-a redesign) — the owner's WhatsApp screenshots ride
          a premium horizontal snap carousel (quote cards from the dashboard
          chats are the fallback when every image is hidden). */}
      <TestimonialsChat reviews={reviews} threads={chatThreads} />

      {/* ── Brand story — quote reveals word-by-word with the scrollbar
          (17-d); the supporting lines fade in after it. */}
      <BrandStory />

      {/* Perks row removed (round 13, owner request) — the global footer
          (contacts + brand pages + © 2026) now closes every page. */}
    </div>
  );
}
