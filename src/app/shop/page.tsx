import type { Metadata } from 'next';
import { getStorefrontData } from '@/lib/catalog';
import { StoreChrome } from '@/components/sadn/StoreChrome';
import { ShopScreen } from '@/components/sadn/ShopScreen';

/**
 * /shop — the catalogue (round 16 SEO refactor). Server-rendered with the
 * full product grid in the initial HTML; ?cat=<slug> deep-links a section.
 */
export const metadata: Metadata = {
  title: 'Shop Abayas — Every SADN Piece | سدن · المتجر',
  description:
    'Browse every SADN abaya: loose, flowing cuts in honest, non-sheer fabrics. Ivory Bloom, Noir Flow, Charcoal Mist and more — cash on delivery across Egypt.',
  alternates: { canonical: '/shop' },
  openGraph: {
    title: 'Shop SADN Abayas | سدن · المتجر',
    description: 'Every SADN piece — loose abayas cut from honest fabrics.',
    url: '/shop',
    type: 'website',
  },
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const [{ products, categories, reviews, config, banner }, params] = await Promise.all([
    getStorefrontData(),
    searchParams,
  ]);
  const category = typeof params.cat === 'string' ? params.cat : 'all';

  return (
    <StoreChrome products={products} categories={categories} reviews={reviews} config={config} banner={banner}>
      <ShopScreen products={products} category={category} />
    </StoreChrome>
  );
}
