/**
 * SADN service worker (round 7-a) — offline-capable app shell.
 *
 * Strategy map:
 *   • Navigations            → network-first, cache fallback, then a branded
 *                              inline offline skeleton (no extra route needed).
 *   • /api/products (GET)    → stale-while-revalidate so the catalogue opens
 *                              instantly and still works fully offline.
 *   • Product images, icons, → cache-first (immutable-ish; revalidated on
 *     fonts, hashed _next      fetch when idle).
 *   • Dev hot-update traffic → untouched passthrough so HMR keeps working.
 *
 * Cache names are versioned; activation clears anything older.
 *
 * Round 35-b (touch-scroll freeze follow-up): VERSION bumped v1 → v2 to
 * invalidate every cache a returning phone holds. The storefront code was
 * fixed in round 34 (SideDrawer scroll lock gated behind `open`, 8414a40),
 * but every existing mobile client still served the PRE-fix HTML + chunks
 * out of the never-invalidated `sadn-v1-pages` / `sadn-v1-assets` caches —
 * navigations are network-first ONLY while fetch resolves, so on a flaky
 * mobile network the SW kept replaying the frozen pre-fix page site-wide.
 * Bumping the version renames all four caches (fresh build gets cached) and
 * the activate handler below deletes every older cache. Bump this
 * string again whenever a critical client fix ships.
 *
 * Round 36 (identity colour + product-page cleanup): VERSION bumped v2 → v3
 * so returning phones replay the new UI immediately instead of any cached
 * pre-round-36 pages/chunks.
 */
const VERSION = 'sadn-v7';
const SHELL_CACHE = `${VERSION}-shell`;
const PAGE_CACHE = `${VERSION}-pages`;
const ASSET_CACHE = `${VERSION}-assets`;
const API_CACHE = `${VERSION}-api`;

const SHELL_ASSETS = [
  '/',
  '/manifest.json',
  '/sadn-logo.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/fonts/thmanyah/thmanyah-sans-400.otf',
  '/fonts/thmanyah/thmanyah-sans-500.otf',
  '/fonts/thmanyah/thmanyah-sans-700.otf',
  '/fonts/thmanyah/thmanyah-display-400.otf',
  '/fonts/thmanyah/thmanyah-display-700.otf',
];

/** Branded bilingual offline skeleton served when a navigation fails. */
const OFFLINE_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>SADN — Offline</title><style>
body{margin:0;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#fff;color:#52314e;font-family:'Thmanyah Sans',system-ui,-apple-system,sans-serif;text-align:center;padding:24px}
.logo{font-size:15px;letter-spacing:.35em;font-weight:700;color:#52314e;opacity:.35}
.ring{width:84px;height:84px;border-radius:9999px;background:#F4EFF3;display:flex;align-items:center;justify-content:center}
h1{font-size:22px;margin:0;font-weight:600}
p{font-size:13.5px;margin:0;max-width:30ch;color:#8a7488;line-height:1.7}
button{margin-top:10px;border:0;border-radius:9999px;background:#52314e;color:#fff;padding:13px 34px;font-size:14px;letter-spacing:.02em;cursor:pointer}
</style></head><body>
<div class="logo">SADN · سدن</div>
<div class="ring"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#52314e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a7 7 0 0 0-7 7c0 2.4 1.2 4.1 2.6 5.5.7.7 1.1 1.6 1.2 2.5h6.4c.1-.9.5-1.8 1.2-2.5C17.8 13.1 19 11.4 19 9a7 7 0 0 0-7-7Z"/><path d="M9.5 21h5"/></svg></div>
<h1>You're offline · أنت غير متصل</h1>
<p>The atelier is out of reach right now — saved pages and pieces are still here.</p>
<p style="direction:rtl">لا يمكن الوصول إلى الأتيليه الآن — الصفحات والقطع المحفوظة لا تزال متاحة.</p>
<button onclick="location.reload()">Try again · حاول مجدداً</button>
</body></html>`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // allSettled: one missing shell file must not break installation.
      await Promise.allSettled(SHELL_ASSETS.map((u) => cache.add(u)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

const isDevTraffic = (pathname) =>
  pathname.startsWith('/_next/webpack-hmr') ||
  pathname.includes('.hot-update.') ||
  pathname.startsWith('__nextjs');

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isDevTraffic(url.pathname)) return; // let HMR flow untouched

  // ── Navigations: network-first → cache → offline skeleton ──
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(PAGE_CACHE);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cached =
            (await caches.match(request)) ||
            (await caches.match('/', { cacheName: SHELL_CACHE })) ||
            (await caches.match('/'));
          return (
            cached ||
            new Response(OFFLINE_HTML, {
              status: 200,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
          );
        }
      })()
    );
    return;
  }

  // ── Product API: stale-while-revalidate (offline catalogue) ──
  // Round 10: requests carrying ?v= (explicit dashboard-sync refreshes and
  // the storefront poll) are NETWORK-FIRST so owner edits reach the customer
  // immediately; their responses are written to the CANONICAL cache key so
  // the offline catalogue stays warm. Plain requests keep SWR semantics.
  if (url.pathname.startsWith('/api/products')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(API_CACHE);
        const canonical = '/api/products?limit=48';
        if (url.searchParams.has('v')) {
          try {
            const fresh = await fetch(request);
            if (fresh.ok) cache.put(canonical, fresh.clone());
            return fresh;
          } catch {
            return (
              (await cache.match(canonical, { ignoreSearch: false })) ||
              (await cache.match(request)) ||
              Response.error()
            );
          }
        }
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })()
    );
    return;
  }

  // ── Static assets: cache-first with background fill ──
  const cacheable =
    url.pathname.startsWith('/products/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.startsWith('/_next/static/') ||
    url.pathname === '/sadn-logo.svg' ||
    url.pathname === '/logo.svg' ||
    url.pathname === '/manifest.json';

  if (cacheable) {
    event.respondWith(
      (async () => {
        const cached =
          (await caches.match(request, { cacheName: ASSET_CACHE })) ||
          (await caches.match(request, { cacheName: SHELL_CACHE }));
        if (cached) {
          // Refresh in the background; never block the response.
          fetch(request)
            .then((res) => {
              if (res.ok)
                caches.open(ASSET_CACHE).then((c) => c.put(request, res.clone()));
            })
            .catch(() => {});
          return cached;
        }
        try {
          const fresh = await fetch(request);
          if (fresh.ok)
            (await caches.open(ASSET_CACHE)).put(request, fresh.clone());
          return fresh;
        } catch {
          return new Response('', { status: 504 });
        }
      })()
    );
  }
});
