'use client';

import { useEffect, useState } from 'react';
import anime from 'animejs';
import { prefersReducedMotion } from '@/lib/gsap-setup';

/**
 * Product-screen motion (extracted verbatim from ProductScreen, 18-3a2) —
 * the app-style push-in entrance, the staggered content rise, the
 * Escape-to-close wiring and the slide-out close. Identical deps, cleanup
 * (none) and reduced-motion gating as the originals.
 */
export function useProductMotion(
  rootRef: React.RefObject<HTMLDivElement | null>,
  contentRef: React.RefObject<HTMLDivElement | null>,
  rtl: boolean,
  slug: string,
  close: () => void
) {
  const [closing, setClosing] = useState(false);

  // App-style push-in entrance, then staggered content rise
  useEffect(() => {
    if (!rootRef.current) return;
    if (prefersReducedMotion()) return;
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    // On mobile, the sheet pushes in from the edge (mirrored in RTL). On desktop, it is an inline page.
    if (!isDesktop) {
      anime({
        targets: rootRef.current,
        translateX: [rtl ? '-100%' : '100%', '0%'],
        duration: 460,
        easing: 'easeOutExpo',
      });
    }
    if (contentRef.current) {
      anime({
        targets: contentRef.current.querySelectorAll('[data-rise]'),
        opacity: [0, 1],
        translateY: [18, 0],
        delay: anime.stagger(70, { start: isDesktop ? 60 : 180 }),
        duration: 620,
        easing: 'easeOutCubic',
      });
    }
  }, [slug, rtl]);

  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    const root = rootRef.current;
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    if (!root || prefersReducedMotion() || isDesktop) {
      close();
      return;
    }
    anime({
      targets: root,
      translateX: rtl ? '-100%' : '100%',
      duration: 380,
      easing: 'easeInCubic',
      complete: close,
    });
  };

  const closeInstant = () => {
    setClosing(true);
    close();
  };

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && requestClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);

  }, [closing]);

  return { closing, requestClose, closeInstant };
}
