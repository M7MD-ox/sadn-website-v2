'use client';

import { useLayoutEffect } from 'react';
import { gsap, prefersReducedMotion, revealOnScroll } from '@/lib/gsap-setup';
import type { ProductDTO } from '@/lib/sadn-store';

/**
 * Home-screen motion (extracted verbatim from HomeScreen, 18-3a2) — hero
 * entrance, scroll reveals, collections tile parallax and the hero cinematic
 * scrub. Round 23 (owner): the headline unmask and the brand-story word
 * reveal were REMOVED — headlines and the story text now render statically.
 */
export function useHomeMotion(
  scope: React.RefObject<HTMLDivElement | null>,
  products: ProductDTO[]
) {
  // Hero entrance (parallax dropped — the slideshow owns the frame now)
  useLayoutEffect(() => {
    if (!scope.current || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from('[data-hero]', {
        y: 26,
        opacity: 0,
        duration: 0.85,
        ease: 'power3.out',
        stagger: 0.09,
        delay: 0.05,
      });
    }, scope.current);
    return () => ctx.revert();
  }, []);

  // Scroll reveals (re-run once products arrive)
  useLayoutEffect(() => {
    const ctx = revealOnScroll(scope.current);
    return () => ctx?.revert();
  }, [products]);

  // Collections inner-image parallax (the headline unmask was removed —
  // round 23, owner: no more headline animation).

  useLayoutEffect(() => {
    if (!scope.current || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      // Collections tiles: the photo drifts inside its frame as the page
      // scrolls (taller than the tile → real parallax room, hover zoom kept).
      gsap.utils.toArray<HTMLElement>('[data-tile-parallax]').forEach((el) => {
        gsap.fromTo(
          el,
          { yPercent: -5 },
          {
            yPercent: 5,
            ease: 'none',
            scrollTrigger: {
              trigger: el.parentElement,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          }
        );
      });
    }, scope.current);
    return () => ctx.revert();
  }, []);

  // 17-d — hero cinematic settle: the photo breathes wider and drifts down
  // a touch as it leaves the viewport (scrubbed — tied to the scrollbar).
  useLayoutEffect(() => {
    if (!scope.current || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.to('[data-hero-frame] img', {
        scale: 1.08,
        yPercent: 5,
        ease: 'none',
        scrollTrigger: {
          trigger: '[data-hero-frame]',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
    }, scope.current);
    return () => ctx.revert();
  }, []);
}
