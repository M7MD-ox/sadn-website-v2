'use client';

import Link from 'next/link';
import { useRoute, parseRoute } from '@/lib/router';
import { type CategoryDTO } from '@/lib/sadn-store';
import { useLang, useT } from '@/lib/i18n';

/**
 * Categories strip (round 13) — the chips bar. Since the round-16 owner
 * pass it mounts on /shop only (StoreChrome renders it above ShopScreen);
 * chips deep-link to /shop?cat=<slug>, so a category added in the
 * dashboard appears here automatically.
 * Round 40 (SEO): chips are real <Link>s — crawlable, middle-clickable,
 * prefetched by the App Router.
 */
export function CategoryStrip({ categories }: { categories: CategoryDTO[] }) {
  const t = useT();
  const lang = useLang();
  const route = useRoute();
  const { path, query } = parseRoute(route);
  const active = path === '/shop' ? query.get('cat') ?? 'all' : null;

  const chips = [
    { key: 'all', label: t('catAll'), href: '/shop' },
    ...categories.map((c) => ({
      key: c.slug,
      label: lang === 'ar' ? c.labelAr : c.labelEn,
      href: `/shop?cat=${encodeURIComponent(c.slug)}`,
    })),
  ];

  return (
    <div
      data-category-strip
      className="hairline-b no-scrollbar sticky top-12 lg:top-20 z-30 flex gap-2 overflow-x-auto bg-sadn-canvas/90 px-5 lg:px-8 py-3 backdrop-blur-lg"
    >
      {chips.map((c) => {
        const isActive = active === c.key;
        return (
          <Link
            key={c.key}
            href={c.href}
            aria-pressed={isActive}
            aria-current={isActive ? 'true' : undefined}
            className={`shrink-0 rounded-none border px-4 lg:px-5 py-2 lg:py-2.5 text-xs font-medium transition-all active:scale-95 ${
              isActive ? 'chip-active' : 'chip-inactive'
            }`}
          >
            {c.label}
          </Link>
        );
      })}
    </div>
  );
}
