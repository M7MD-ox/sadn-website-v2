import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /robots.txt (round 16) — search engines welcome, dashboard + APIs +
 * the bag excluded, the sitemap referenced, and the AI crawlers the owner
 * asked for granted explicit rules (GPTBot, OAI-SearchBot, Google-Extended
 * — plus the other common assistants) so their behaviour is deliberate,
 * not implied.
 */
export async function GET(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const base = `${proto}://${host}`;

  const txt = `# SADN (سدن) — loose abayas & modest fashion
User-agent: *
Allow: /
Disallow: /admin
Disallow: /bag
Disallow: /api/

# ── AI crawlers (explicit rules, owner-directed) ──
User-agent: GPTBot
Allow: /
Disallow: /admin
Disallow: /api/

User-agent: OAI-SearchBot
Allow: /
Disallow: /admin
Disallow: /api/

User-agent: Google-Extended
Allow: /
Disallow: /admin
Disallow: /api/

User-agent: ChatGPT-User
Allow: /
Disallow: /admin
Disallow: /api/

User-agent: PerplexityBot
Allow: /
Disallow: /admin
Disallow: /api/

User-agent: ClaudeBot
Allow: /
Disallow: /admin
Disallow: /api/

User-agent: Applebot-Extended
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${base}/sitemap.xml
`;

  return new NextResponse(txt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
