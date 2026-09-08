'use client';

import { useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster } from '@/components/ui/sonner';
import { TopBar } from '@/components/sadn/TopBar';
import { AnnouncementBanner } from '@/components/sadn/AnnouncementBanner';
import { CategoryStrip } from '@/components/sadn/CategoryStrip';
import { SadnFooter } from '@/components/sadn/SadnFooter';
import { BottomNav } from '@/components/sadn/BottomNav';
import { FloatingWhatsApp } from '@/components/sadn/FloatingWhatsApp';
import { CookieConsent } from '@/components/sadn/CookieConsent';
import { MiniCartSheet } from '@/components/sadn/MiniCartSheet';
import { useMounted } from '@/lib/ui';
import {
  navigate,
  parseRoute,

  setRouterBridge,
  useRoute,
} from '@/lib/router';
import {
  cartCount,
  useSadnStore,
  type ProductDTO,
} from '@/lib/sadn-store';
import { useLang } from '@/lib/i18n';
import { setChrome, useChrome, type StoreChromeProps } from './chrome-store';
import {
  childrenWithHandlers,
  useAddToBagFlow,
  useCatalogSync,
  useScreenTransition,
} from './chrome-hooks';

/**
 * Storefront chrome (round 16 SEO refactor) — every page is a real server
 * route now; this client shell carries the shared furniture (header, nav,
 * overlays, live dashboard sync) around server-rendered page content.
 *
 *   /                     home          (server)
 *   /shop(?cat=)          catalogue     (server)
 *   /product/<slug>       product page  (server, per-slug metadata + JSON-LD)
 *   /bag                  bag/checkout  (client cart state)
 *   /policies/<slug>      policy pages  (server)
 *   /admin                dashboard     (client app)
 */
export function StoreChrome({
  products,
  categories,
  reviews,
  config,
  banner,
  children,
}: StoreChromeProps) {
  // Lend the App Router to the imperative navigate()/routeBack() helpers.
  const nextRouter = useRouter();
  useEffect(() => {
    setRouterBridge(nextRouter);
  }, [nextRouter]);

  const mounted = useMounted();
  const lastAdded = useChrome((s) => s.lastAdded);

  const cart = useSadnStore((s) => s.cart);
  const lang = useLang();

  const route = useRoute();
  const { path } = parseRoute(route);
  const isHome = path === '/';

  // Seed the module store from the server render (runs on every navigation —
  // always beats stale client data with fresh RSC content).
  useEffect(() => {
    useChrome.getState().set({ products, categories, reviews, config });
  }, [products, categories, reviews, config]);

  // Bilingual shell: mirror the whole document when the UI language is Arabic.
  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  // ── Live dashboard sync (background revalidation) — extracted 18-3a2 ──
  useCatalogSync(products, nextRouter);

  // ── Add-to-bag flow (badge bounce + fly-to-bag ghost) — extracted 18-3a2 ──
  const handleAdd = useAddToBagFlow();

  // Screen transition + scroll reset (mirrored direction in RTL) — hook 18-3a2
  const screenRef = useRef<HTMLDivElement>(null);
  useScreenTransition(screenRef, path, lang);

  const onOpenProduct = useCallback((p: ProductDTO) => {
    navigate(`/product/${p.slug}`);
  }, []);

  // Stable context identity — a fresh object here re-renders all four
  // screens through the Handlers context on every store tick.
  const ctx = useMemo(() => ({ onAdd: handleAdd, onOpen: onOpenProduct }), [handleAdd, onOpenProduct]);

  return (
    <div
      data-screen-shell
      className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col border-x border-sadn-plum-100 bg-sadn-canvas"
      data-add-context
    >
      {banner.visible && (
        <AnnouncementBanner textEn={banner.textEn} textAr={banner.textAr} onCta={() => navigate('/shop')} />
      )}
      <TopBar />

      {/* Category chips live on /shop only — removed from the home page
          (owner request, round 16). */}
      {path === '/shop' && <CategoryStrip categories={categories} />}

      <div ref={screenRef} className="flex-1" data-children>
        {/* Server-rendered page content — cloned with the add/open handlers */}
        {childrenWithHandlers(children, ctx)}
      </div>

      {!path.startsWith('/product/') && <SadnFooter config={config} />}

      <BottomNav count={mounted ? cartCount(cart) : 0} />

      {/* Small floating WhatsApp chip — owner's number from the dashboard;
          renders nothing while the number is empty (17-c). */}
      {mounted && config.whatsappNumber.trim().length > 0 && (
        <FloatingWhatsApp phone={config.whatsappNumber} />
      )}

      {/* Cookie consent → Meta Pixel gate (20-a) — asks once, then stays
          silent forever; holds its ground across client-side navigation. */}
      <CookieConsent />

      {lastAdded && (
        <MiniCartSheet
          item={lastAdded}
          onViewCart={() => {
            setChrome({ lastAdded: null });
            navigate('/bag');
          }}
          onClose={() => setChrome({ lastAdded: null })}
        />
      )}

      <Toaster position="top-center" />
    </div>
  );
}
