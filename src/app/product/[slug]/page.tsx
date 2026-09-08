import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductBySlug, getStorefrontData } from '@/lib/catalog';
import { relatedFor } from '@/lib/related';
import { StoreChrome } from '@/components/sadn/StoreChrome';
import { ProductScreen } from '@/components/sadn/ProductScreen';

/**
 * /product/<slug> — every product's own server-rendered page (round 16).
 * The full content (gallery, description, sections, structured data) is in
 * the initial HTML response; unknown or deactivated slugs return a REAL
 * HTTP 404 via notFound() — no soft 404s.
 *
 * NOTE: intentionally NO generateStaticParams — the route renders fully
 * dynamically so a deleted/unknown slug always gets a true 404 status
 * (a prerendered fallback would stream not-found content with a 200).
 * Product pages are still indexable server-rendered HTML for crawlers.
 */

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ edit?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(decodeURIComponent(slug));
  // A missing/deactivated product must 404 — metadata resolves before the
  // response starts streaming, so notFound() here guarantees a true HTTP
  // 404 status code (no soft 404 for crawlers).
  if (!product) notFound();
  const name = product.nameAr || product.name;
  const title = `${name} — SADN | سدن`;
  const description =
    product.tagline ||
    `${name} — loose SADN abaya in honest, non-sheer fabric. Cash on delivery across Egypt.`;
  return {
    title,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title,
      description,
      url: `/product/${product.slug}`,
      type: 'website',
      images: product.images.slice(0, 2).map((url) => ({ url })),
    },
  };
}

export default async function ProductPage({ params, searchParams }: Params) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const product = await getProductBySlug(decodeURIComponent(slug));
  if (!product) notFound();

  // The chrome needs the storefront context (nav, search, overlays, config).
  const { products, categories, reviews, config, banner } = await getStorefrontData();
  const related = relatedFor(product, products);

  const editId = typeof query.edit === 'string' ? query.edit : '';

  const name = product.nameAr || product.name;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        name,
        alternateName: product.name,
        description: product.tagline || product.description,
        image: product.images,
        sku: product.slug,
        category: product.category,
        color: product.colors.map((c) => c.name).join(', '),
        brand: { '@type': 'Brand', name: 'SADN', alternateName: 'سدن' },
        aggregateRating:
          product.reviewsCount > 0
            ? {
                '@type': 'AggregateRating',
                ratingValue: product.rating,
                reviewCount: product.reviewsCount,
              }
            : undefined,
        offers: {
          '@type': 'Offer',
          price: product.price,
          priceCurrency: product.currency || 'EGP',
          availability:
            product.stock > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
          { '@type': 'ListItem', position: 2, name: 'Shop', item: '/shop' },
          { '@type': 'ListItem', position: 3, name },
        ],
      },
    ],
  };

  return (
    <StoreChrome products={products} categories={categories} reviews={reviews} config={config} banner={banner}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductScreen
        key={product.slug + editId}
        product={product}
        related={related}
        editId={editId}
        sections={config.productSections}
        sizeGuide={config.sizeGuide}
      />
    </StoreChrome>
  );
}
