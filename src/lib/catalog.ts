/**
 * Server-side catalog readers (round 16) — the SEO refactor's data layer.
 *
 * Pages are now SERVER components: the product/category/review/config data
 * is queried straight from Prisma and passed into the client screens as
 * props, so the initial HTML response always contains the real content
 * (SSR — a hard requirement; no more skeleton-only first paint for crawlers).
 *
 * The shapes mirror the API DTOs exactly (same parsers, same field names),
 * so the client screens render identically whether the data arrived from
 * the server or from a background re-validation.
 */

import { db } from '@/lib/db';
import { ensureBootstrap } from '@/lib/bootstrap';
import { serializeProduct, type SerializedProduct } from '@/lib/products';
import { parseStoreConfig, type StoreConfig } from '@/lib/store-settings';

export type CategoryData = {
  id: string;
  slug: string;
  labelEn: string;
  labelAr: string;
  order: number;
};

export type ReviewData = {
  id: string;
  image: string;
  caption: string;
  order: number;
};

export type BannerData = {
  visible: boolean;
  textEn: string;
  textAr: string;
};

/** Active products only (storefront), owner drag-ordered (round 16). */
export async function getProducts(): Promise<SerializedProduct[]> {
  await ensureBootstrap();
  const rows = await db.product.findMany({
    where: { active: true },
    // Same ordering as /api/products and the admin list (18-2 alignment):
    // the drag & drop order is canonical, createdAt breaks ties.
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    take: 48,
  });
  return rows.map(serializeProduct);
}

/** Every active slug — sitemap + generateStaticParams. */
export async function getActiveProductSlugs(): Promise<string[]> {
  await ensureBootstrap();
  const rows = await db.product.findMany({
    where: { active: true },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

export async function getProductBySlug(slug: string): Promise<SerializedProduct | null> {
  await ensureBootstrap();
  const row = await db.product.findUnique({ where: { slug } });
  if (!row || !row.active) return null;
  return serializeProduct(row);
}

export async function getCategories(): Promise<CategoryData[]> {
  await ensureBootstrap();
  const rows = await db.category.findMany({ orderBy: { order: 'asc' } });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    labelEn: r.labelEn,
    labelAr: r.labelAr,
    order: r.order,
  }));
}

export async function getReviews(): Promise<ReviewData[]> {
  await ensureBootstrap();
  const rows = await db.review.findMany({
    where: { active: true },
    orderBy: { order: 'asc' },
    take: 12,
  });
  return rows.map((r) => ({ id: r.id, image: r.image, caption: r.caption, order: r.order }));
}

/** Store-wide config + banner in one read (same parse as /api/storefront). */
export async function getStoreConfig(): Promise<{
  config: StoreConfig;
  banner: BannerData;
}> {
  await ensureBootstrap();
  const s = await db.setting.findUnique({ where: { id: 'singleton' } });
  return {
    config: parseStoreConfig(s),
    banner: {
      visible: Boolean(s?.bannerVisible),
      textEn: String(s?.bannerTextEn ?? ''),
      textAr: String(s?.bannerTextAr ?? ''),
    },
  };
}

/** Everything a storefront page needs, in parallel — one round-trip. */
export async function getStorefrontData() {
  const [products, categories, reviews, { config, banner }] = await Promise.all([
    getProducts(),
    getCategories(),
    getReviews(),
    getStoreConfig(),
  ]);
  return { products, categories, reviews, config, banner };
}
