'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Elegant fade + rise reveal for every [data-animate] element inside a scope.
 * Returns a gsap context so callers can revert on unmount.
 */
export const revealOnScroll = (scope: HTMLElement | null) => {
  if (!scope || prefersReducedMotion()) return undefined;
  return gsap.context(() => {
    gsap.utils.toArray<HTMLElement>('[data-animate]').forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%' },
        }
      );
    });
  }, scope);
};

