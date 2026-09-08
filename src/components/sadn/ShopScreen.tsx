'use client';

import { useLayoutEffect, useEffect, useRef } from 'react';
import { Scissors } from 'lucide-react';
import { ScrollTrigger, revealOnScroll } from '@/lib/gsap-setup';
import { type ProductDTO } from '@/lib/sadn-store';
import { useT } from '@/lib/i18n';
import { EYEBROW } from './primitives';
import { ProductCard } from './ProductCard';
import { useChromeHandlers } from './chrome-hooks';

type Props = {
  products: ProductDTO[];
  category: string;
};

export function ShopScreen({ products, category }: Props) {
  const t = useT();
  const { onAdd, onOpen } = useChromeHandlers();
  const scope = useRef<HTMLDivElement>(null);
  const filtered =
    category === 'all' ? products : products.filter((p) => p.category === category);

  useLayoutEffect(() => {
    const ctx = revealOnScroll(scope.current);
    return () => ctx?.revert();
  }, [category, products]);

  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 420);
    return () => clearTimeout(t);
  }, [category]);

  // Category chips stay on /shop (the global strip renders them on this
  // route only — removed from home per the owner, round 16).

  return (
    <div ref={scope} className="max-w-7xl mx-auto">
      <section className="px-5 pt-8 lg:px-8 lg:pt-12">
        <p className={EYEBROW}>
          {t('catalogue')}
        </p>
        <h1 className="mt-1 font-sadn-display text-4xl lg:text-5xl text-sadn-ink">{t('shopTitle')}</h1>
        <p className="price-num mt-1.5 text-xs lg:text-sm text-sadn-ink-soft">
          {filtered.length === 1 ? t('countOne') : t('countOther', { n: filtered.length })}
        </p>
      </section>

      {filtered.length === 0 ? (
        <div className="px-5 py-24 text-center">
          <span
            aria-hidden="true"
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-none bg-sadn-plum-50"
          >
            <Scissors className="h-5 w-5 text-sadn-plum-600" strokeWidth={1.5} />
          </span>
          <p className="mt-5 font-sadn-display text-2xl text-sadn-ink">{t('comingSoon')}</p>
          <p className="mt-2 text-sm text-sadn-ink-soft">
            {t('comingSoonBody')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 sm:gap-x-6 lg:gap-x-8 gap-y-8 sm:gap-y-10 lg:gap-y-14 px-5 lg:px-8 pb-16 pt-7 lg:pt-10">
          {filtered.map((p, i) => (
            <ProductCard
              key={p.slug}
              product={p}
              onAdd={onAdd}
              onOpen={onOpen}
              priority={i < 4}
            />
          ))}
        </div>
      )}
    </div>
  );
}
