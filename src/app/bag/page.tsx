import type { Metadata } from 'next';
import { getStorefrontData } from '@/lib/catalog';
import { StoreChrome } from '@/components/sadn/StoreChrome';
import { BagScreen } from '@/components/sadn/BagScreen';

/**
 * /bag — the bag + checkout entry (round 16: "السلة" became "الشنطة").
 * The bag itself is client state (localStorage), so this page is noindex —
 * everything else on it (chrome, recommendations) still server-renders.
 */
export const metadata: Metadata = {
  title: 'Your Bag — SADN | شنطتك · سدن',
  description: 'Review your SADN bag and check out — cash on delivery, InstaPay or Vodafone Cash.',
  alternates: { canonical: '/bag' },
  robots: { index: false, follow: true },
};

export default async function BagPage() {
  const { products, categories, reviews, config, banner } = await getStorefrontData();

  return (
    <StoreChrome products={products} categories={categories} reviews={reviews} config={config} banner={banner}>
      <BagScreen products={products} config={config} />
    </StoreChrome>
  );
}
