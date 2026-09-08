import type { Metadata } from 'next';
import { getStorefrontData } from '@/lib/catalog';
import { StoreChrome } from '@/components/sadn/StoreChrome';
import { PolicyAccordion } from '@/components/sadn/PolicyAccordion';
import { pickBi } from '@/lib/pick-bi';

/**
 * /policies — all policies on ONE page (round 38, owner ask): each policy
 * (shipping / returns / privacy) is a tappable accordion row, so the user
 * taps e.g. سياسة الاسترجاع to unfold it. Content is owner-editable from
 * the dashboard and server-rendered here (SEO requirement).
 */
export const metadata: Metadata = {
  title: 'Policies — SADN | السياسات · سدن',
  description:
    'SADN policies — shipping & purchase, returns & exchange, privacy. سياسات سدن: الشراء والشحن، الاستبدال والاسترجاع، الخصوصية.',
  alternates: { canonical: '/policies' },
};

export default async function PoliciesPage() {
  const { products, categories, reviews, config, banner } = await getStorefrontData();
  const policies = (config.policies ?? []).filter((p) => p.enabled && p.slug);

  return (
    <StoreChrome products={products} categories={categories} reviews={reviews} config={config} banner={banner}>
      <article className="max-w-4xl mx-auto px-5 lg:px-8 pb-16 pt-8 lg:pt-12">
        <h1 className="font-sadn-display text-3xl lg:text-4xl leading-tight text-sadn-ink">
          {pickBi('en', 'Policies', 'السياسات')}
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-sadn-ink-soft">
          {pickBi(
            'en',
            'Everything you need to know — tap any policy to read it.',
            'كل اللي محتاجة تعرفيه — دوسي على أي سياسة عشان تفتح.'
          )}
        </p>
        <div className="mt-6 h-px w-10 bg-sadn-plum-200" />
        <PolicyAccordion policies={policies} />
      </article>
    </StoreChrome>
  );
}
