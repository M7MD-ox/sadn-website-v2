import type { Metadata } from 'next';
import { getStorefrontData } from '@/lib/catalog';
import { StoreChrome } from '@/components/sadn/StoreChrome';
import { HomeScreen } from '@/components/sadn/HomeScreen';

/**
 * / — the home page (round 16 SEO refactor). Server-rendered: the hero,
 * product cards, reviews and brand story are all in the initial HTML.
 */
export const metadata: Metadata = {
  title: 'SADN — Loose Abayas & Modest Fashion in Egypt | سدن',
  description:
    'SADN (سدن) — loose, flowing abayas cut from honest, non-sheer fabrics. Small-batch atelier quality, cash on delivery / InstaPay / Vodafone Cash across Egypt. Cut loose, worn close.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'SADN — Loose Abayas & Modest Fashion in Egypt | سدن',
    description:
      'Loose, flowing abayas cut from honest fabrics. Cash on delivery across Egypt.',
    url: '/',
    type: 'website',
  },
};

export default async function HomePage() {
  const { products, categories, reviews, config, banner } = await getStorefrontData();

  // Organization + WebSite JSON-LD — the store's identity for search engines.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': '#organization',
        name: 'SADN',
        alternateName: 'سدن',
        url: '/',
        slogan: 'Cut loose, worn close.',
        ...(config.phones.length > 0
          ? { contactPoint: config.phones.map((phone) => ({ '@type': 'ContactPoint', telephone: phone, contactType: 'customer service' })) }
          : {}),
        ...(config.socials.instagram ? { sameAs: [config.socials.instagram, config.socials.tiktok, config.socials.facebook].filter(Boolean) } : {}),
      },
      {
        '@type': 'WebSite',
        '@id': '#website',
        name: 'SADN',
        alternateName: 'سدن',
        url: '/',
        inLanguage: ['en', 'ar'],
      },
    ],
  };

  return (
    <StoreChrome products={products} categories={categories} reviews={reviews} config={config} banner={banner}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeScreen
        products={products}
        categories={categories}
        heroImages={config.heroImages}
        heroInterval={config.heroInterval}
        marquee={config.marquee}
        chatThreads={config.chatThreads}
        reviews={reviews}
      />
    </StoreChrome>
  );
}
