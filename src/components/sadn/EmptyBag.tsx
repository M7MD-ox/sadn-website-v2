'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { revealOnScroll } from '@/lib/gsap-setup';
import { useT } from '@/lib/i18n';
import type { AddOptions, ProductDTO } from '@/lib/sadn-store';
import { ProductCard } from './ProductCard';

/**
 * Empty-bag state (extracted verbatim from BagScreen, 18-3a2) — the empty
 * message + the "while you decide" featured grid, including the reveal-on-
 * scroll scope which is fully self-contained (the gsap scope root is this
 * component's own root div).
 */
export function EmptyBag({
  products,
  onAdd,
  onOpen,
}: {
  products: ProductDTO[];
  onAdd: (p: ProductDTO, opts?: AddOptions) => void;
  onOpen: (p: ProductDTO) => void;
}) {
  const t = useT();
  const emptyScope = useRef<HTMLDivElement>(null);

  // "While you decide" — featured pieces for the empty-bag state (round 9)
  const recs = useMemo(() => {
    const featured = products.filter((p) => p.featured);
    return featured.length > 0 ? featured : products.slice(0, 4);
  }, [products]);

  useLayoutEffect(() => {
    const ctx = revealOnScroll(emptyScope.current);
    return () => ctx?.revert();
  }, [products]);

  return (
    <div ref={emptyScope} className="max-w-7xl mx-auto">
      <div
        className={`flex flex-col items-center justify-center px-8 text-center ${
          recs.length > 0 ? 'min-h-[48dvh]' : 'min-h-[70dvh]'
        }`}
      >
        <span className="flex h-20 w-20 items-center justify-center rounded-none bg-sadn-plum-50">
          <ShoppingBag className="h-8 w-8 text-sadn-plum-600" strokeWidth={1.5} />
        </span>
        <h1 className="mt-7 font-sadn-display text-3xl lg:text-4xl text-sadn-ink">
          {t('bagEmptyTitle')}
        </h1>
        <p className="mt-3 max-w-[36ch] text-sm leading-relaxed text-sadn-ink-soft">
          {t('bagEmptyBody')}
        </p>
        <Link
          href="/shop"
          className="btn-primary mt-9 h-12 px-8 text-sm font-medium tracking-wide inline-flex items-center justify-center"
        >
          {t('ctaDiscover')}
        </Link>
      </div>

      {recs.length > 0 && (
        <section className="border-t border-sadn-plum-100 px-5 lg:px-8 pb-16 pt-12">
          <h2 className="font-sadn-display text-3xl lg:text-4xl text-sadn-ink">
            {t('emptyRecsTitle')}
          </h2>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 sm:gap-x-6 lg:gap-x-8 gap-y-8 sm:gap-y-10">
            {recs.slice(0, 4).map((p, i) => (
              <ProductCard key={p.slug} product={p} onAdd={onAdd} onOpen={onOpen} priority={i < 4} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
