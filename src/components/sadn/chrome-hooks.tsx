'use client';

import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import anime from 'animejs';
import { prefersReducedMotion, ScrollTrigger } from '@/lib/gsap-setup';
import { hapticConfirm } from '@/lib/haptic';
import { navigate } from '@/lib/router';
import { setChrome, useChrome } from './chrome-store';
import { useSadnStore, type AddOptions, type ProductDTO } from '@/lib/sadn-store';
import type { StoreConfig } from '@/lib/store-settings';

/**
 * Storefront chrome hooks (extracted verbatim from StoreChrome, 18-3a2) —
 * the background catalog revalidation, the add-to-bag flow and the screen
 * transition. StoreChrome keeps the render tree and wires these in.
 */

let lastAddedTimer: ReturnType<typeof setTimeout> | null = null;

/** ── Live dashboard sync (background revalidation) ── */
export function useCatalogSync(
  products: ProductDTO[],
  nextRouter: ReturnType<typeof useRouter>
) {
  const signature = useRef('');
  const revalidate = useCallback(async () => {
    try {
      const bust = `v=${Date.now()}`;
      const [pr, cr, rr, sr] = await Promise.all([
        fetch(`/api/products?limit=48&${bust}`).then((r) => r.json()),
        fetch(`/api/categories?${bust}`).then((r) => r.json()),
        fetch(`/api/reviews?${bust}`).then((r) => r.json()),
        fetch(`/api/storefront?${bust}`).then((r) => r.json()),
      ]);
      const nextProducts: ProductDTO[] = pr.products ?? [];
      const sig = nextProducts
        .map((p: ProductDTO) => `${p.slug}:${p.price}:${p.images.length}:${p.sizes.length}:${p.stock}`)
        .join('|');
      useChrome.getState().set({
        products: nextProducts,
        categories: cr.categories ?? [],
        reviews: rr.reviews ?? [],
        config: sr.shippingFee !== undefined ? (sr as StoreConfig) : useChrome.getState().config,
      });
      if (sig !== signature.current) {
        signature.current = sig;
        nextRouter.refresh(); // pull fresh server-rendered content
      }
    } catch {
      /* offline — keep showing the last known catalog */
    }
  }, [nextRouter]);

  useEffect(() => {
    signature.current = products
      .map((p) => `${p.slug}:${p.price}:${p.images.length}:${p.sizes.length}:${p.stock}`)
      .join('|');
    // Round 19: skip the tick entirely while the tab is hidden — the
    // visibilitychange handler refetches the moment the tab comes back.
    const poll = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void revalidate();
    }, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void revalidate();
    };
    const onChanged = () => void revalidate();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('sadn:catalog-changed', onChanged);
    return () => {
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('sadn:catalog-changed', onChanged);
    };
  }, [revalidate]);
}

/** ── Add-to-bag flow: badge bounce + fly-to-bag ghost + cart write ── */
export function useAddToBagFlow() {
  const addToCart = useSadnStore((s) => s.addToCart);

  const bounceBadge = useCallback(() => {
    if (prefersReducedMotion()) return;
    anime({
      targets: '[data-cart-badge]',
      scale: [1, 1.4, 1],
      duration: 480,
      easing: 'easeOutElastic(1, .45)',
    });
  }, []);

  const flyToBag = useCallback(
    (source: HTMLElement | null) => {
      const badges = document.querySelectorAll('[data-cart-badge]');
      const target = badges[badges.length - 1] as HTMLElement | undefined;
      if (!source || !target || prefersReducedMotion()) {
        bounceBadge();
        return;
      }
      const s = source.getBoundingClientRect();
      const t = target.getBoundingClientRect();
      if (s.width === 0 || t.width === 0) {
        bounceBadge();
        return;
      }
      const ghost = document.createElement('img');
      if (source instanceof HTMLImageElement) {
        ghost.src = source.currentSrc || source.src;
      }
      Object.assign(ghost.style, {
        position: 'fixed',
        left: `${s.left}px`,
        top: `${s.top}px`,
        width: `${s.width}px`,
        height: `${s.height}px`,
        objectFit: 'cover',
        borderRadius: '0',
        zIndex: '90',
        pointerEvents: 'none',
        boxShadow: '0 12px 32px rgba(42, 28, 40, 0.25)',
      });
      document.body.appendChild(ghost);
      anime({
        targets: ghost,
        translateX: t.left + t.width / 2 - (s.left + s.width / 2),
        translateY: t.top + t.height / 2 - (s.top + s.height / 2),
        scale: [1, 0.08],
        opacity: [1, 0.35],
        duration: 680,
        easing: 'easeInOutCubic',
        complete: () => {
          ghost.remove();
          bounceBadge();
        },
      });
    },
    [bounceBadge]
  );

  const handleAdd = useCallback(
    (p: ProductDTO, opts?: AddOptions) => {
      const size = opts?.size ?? (p.sizes.includes('M') ? 'M' : p.sizes[0] ?? 'M');
      const color = opts?.color ?? p.colors[0]?.name ?? 'Default';
      const qty = opts?.qty ?? 1;
      addToCart(
        {
          slug: p.slug,
          name: p.name,
          nameAr: p.nameAr,
          image: p.images[0] ?? '',
          price: p.price,
          size,
          color,
        },
        qty
      );
      setChrome({
        lastAdded: {
          id: '',
          slug: p.slug,
          name: p.name,
          nameAr: p.nameAr,
          image: p.images[0] ?? '',
          price: p.price,
          size,
          color,
          qty,
        },
      });
      hapticConfirm();
      flyToBag(opts?.source ?? null);
      if (lastAddedTimer) clearTimeout(lastAddedTimer);
      lastAddedTimer = setTimeout(
        () => useChrome.getState().set({ lastAdded: null }),
        4500
      );
    },
    [addToCart, flyToBag]
  );

  return handleAdd;
}

/**
 * Screen transition — rebuilt round 38 (owner: "اعد انشاء الانميشن بتاع
 * التنقل بين الصفحات باستخدام anime.js"). One anime.js timeline carries
 * the incoming screen: a vertical rise (16px) with a whisper of scale
 * (0.992 → 1) inside the fade — direction-agnostic, so RTL and LTR feel
 * identical. Inline styles are cleared afterwards so fixed overlays
 * (bottom nav, sheets) keep their stacking context.
 */
export function useScreenTransition(
  screenRef: React.RefObject<HTMLDivElement | null>,
  path: string,
  lang: string
) {
  const prevPath = useRef<string>('/');
  useEffect(() => {
    if (prevPath.current === path) return;
    prevPath.current = path;
    window.scrollTo({ top: 0 });
    const el = screenRef.current;
    if (!el || prefersReducedMotion()) return;
    void lang; // direction-agnostic now — kept for call-site stability
    anime({
      targets: el,
      opacity: [0, 1],
      translateY: [16, 0],
      scale: [0.992, 1],
      duration: 460,
      easing: 'easeOutQuart',
      complete: () => {
        // Leftover inline transform would flatten z-index of fixed overlays.
        el.style.transform = '';
        el.style.opacity = '';
      },
    });
    const t = setTimeout(() => ScrollTrigger.refresh(), 400);
    return () => clearTimeout(t);
  }, [path, lang, screenRef]);
}

/**
 * The server pages hand us their rendered screen; we inject the add-to-bag
 * / open-product handlers through a React context so screens stay clean of
 * prop-drilling boilerplate. (A context is used instead of cloning because
 * server components cannot receive function props.)
 */

type Handlers = {
  onAdd: (p: ProductDTO, opts?: AddOptions) => void;
  onOpen: (p: ProductDTO) => void;
};

const ChromeHandlers = createContext<Handlers>({ onAdd: () => {}, onOpen: () => {} });
export const useChromeHandlers = () => useContext(ChromeHandlers);

export function childrenWithHandlers(children: React.ReactNode, handlers: Handlers) {
  return (
    <ChromeHandlers.Provider value={handlers}>
      {children}
    </ChromeHandlers.Provider>
  );
}
