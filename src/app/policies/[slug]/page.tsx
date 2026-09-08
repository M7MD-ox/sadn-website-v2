import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { POLICY_SLUGS, type PolicySlug } from '@/lib/store-settings';
import { getStorefrontData } from '@/lib/catalog';
import { pickBi } from '@/lib/pick-bi';
import { StoreChrome } from '@/components/sadn/StoreChrome';
import { PolicyBody } from '@/components/sadn/PolicyBody';

/**
 * /policies/<slug> — shipping & purchase / returns / privacy (round 16).
 * Content is owner-editable from the dashboard and server-rendered here
 * (real content in the initial HTML — SEO requirement).
 */

const TITLES: Record<PolicySlug, { en: string; ar: string }> = {
  shipping: { en: 'Shipping & Purchase', ar: 'الشراء والشحن' },
  returns: { en: 'Returns & Exchange', ar: 'الاستبدال والاسترجاع' },
  privacy: { en: 'Privacy Policy', ar: 'سياسة الخصوصية' },
  // Round 39 — the three new sections (dashboard titles win at runtime).
  terms: { en: 'Terms of service', ar: 'شروط الخدمه' },
  contact: { en: 'Contact information', ar: 'التواصل' },
  legal: { en: 'Legal notice', ar: 'الإشعار القانوني' },
};

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  if (!POLICY_SLUGS.includes(slug as PolicySlug)) return { title: 'Not found — SADN' };
  const { config } = await getStorefrontData();
  const page = config.policies.find((p) => p.slug === slug);
  const title = page
    ? `${pickBi('en', page.titleEn, TITLES[page.slug].en)} — SADN | سدن`
    : `${TITLES[slug as PolicySlug].en} — SADN | سدن`;
  return {
    title,
    description: page
      ? pickBi('en', page.bodyEn, page.bodyAr).split('\n')[0].slice(0, 155)
      : `SADN ${TITLES[slug as PolicySlug].en}.`,
    alternates: { canonical: `/policies/${slug}` },
  };
}

export default async function PolicyPage({ params }: Params) {
  const { slug } = await params;
  if (!POLICY_SLUGS.includes(slug as PolicySlug)) notFound();

  const { products, categories, reviews, config, banner } = await getStorefrontData();
  const page = config.policies.find((p) => p.slug === slug);
  if (!page || !page.enabled) notFound();

  return (
    <StoreChrome products={products} categories={categories} reviews={reviews} config={config} banner={banner}>
      <article className="px-5 pb-10 pt-8">
        <nav aria-label="Breadcrumb" className="mb-6 text-[11px] text-sadn-ink-soft">
          <ol className="flex items-center gap-1.5">
            <li><Link href="/" className="transition-colors hover:text-sadn-plum-800">Home</Link></li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-sadn-plum-700">
              {pickBi('en', page.titleEn, TITLES[page.slug].en)}
            </li>
          </ol>
        </nav>
        <h1 className="font-sadn-display text-3xl leading-tight text-sadn-ink">
          {pickBi('en', page.titleEn, TITLES[page.slug].en)}
        </h1>
        <p className="mt-1 font-sadn-display text-lg text-sadn-plum-600" dir="rtl">
          {pickBi(
            'ar',
            page.titleEn || TITLES[page.slug].en,
            page.titleAr || TITLES[page.slug].ar
          )}
        </p>
        <div className="mt-6 h-px w-10 bg-sadn-plum-200" />
        <PolicyBody bodyEn={page.bodyEn} bodyAr={page.bodyAr} />
      </article>
    </StoreChrome>
  );
}
