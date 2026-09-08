import { NextRequest, NextResponse } from 'next/server';
import { getActiveProductSlugs } from '@/lib/catalog';
import { POLICY_SLUGS } from '@/lib/store-settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /sitemap.xml (round 16) — a COMPLETE sitemap: static pages + every
 * live product page + the three policy pages. The base URL is derived from
 * the request host, so it is correct on any deployment domain.
 */
export async function GET(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const base = `${proto}://${host}`;

  let productUrls = '';
  try {
    const slugs = await getActiveProductSlugs();
    productUrls = slugs
      .map((slug) => `  <url><loc>${base}/product/${encodeURIComponent(slug)}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`)
      .join('\n');
  } catch {
    // A database hiccup must never 500 the sitemap — ship the static set.
    productUrls = '';
  }

  const policies = POLICY_SLUGS.map(
    (slug) => `  <url><loc>${base}/policies/${slug}</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>`
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${base}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${base}/shop</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
${productUrls}
${policies}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
