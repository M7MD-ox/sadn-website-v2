'use client';

import { useEffect, useSyncExternalStore } from 'react';
import anime from 'animejs';

/**
 * Client UI micro-primitives (round 18-3a1) — the small hooks/consts that
 * were copy-pasted across the storefront chrome and sheets. One canonical
 * copy each; behaviour is ported verbatim.
 */

const emptySubscribe = () => () => {};

/**
 * True only after hydration — the SSR render and the first client render
 * agree (false), then it flips to true without a hydration mismatch.
 * (Ported from StoreChrome/TopBar's local copies, verbatim.)
 */
export function useMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

/**
 * Clipboard write with the legacy `document.execCommand('copy')` fallback
 * for non-secure contexts / older WebViews (ported verbatim from
 * CheckoutSheet's copy helper, round 18-3a1).
 *
 * Resolves `true` when the value is on the clipboard, `false` when the
 * browser blocked it — callers keep the value visible for a manual copy.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    return true;
  } catch {
    return false;
  }
}

/** Hearts/emoji-only messages don't read as review quotes / chat bubbles. */
export const EMOJI_ONLY =
  /^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\uFE0F|\u200D|\s)+$/u;

/**
 * Sheet entrance — the anime.js rise every bottom sheet opens with.
 * Defaults are the SizeGuideSheet rhythm (translateY 64 → 0, 420ms);
 * MiniCartSheet passes its own lighter values so each keeps its exact
 * motion. Runs once on mount.
 */
export function useSheetEntrance(
  ref: React.RefObject<HTMLElement | null>,
  opts: { translateY?: number; duration?: number } = {}
) {
  const { translateY = 64, duration = 420 } = opts;
  useEffect(() => {
    if (ref.current) {
      anime({
        targets: ref.current,
        opacity: [0, 1],
        translateY: [translateY, 0],
        duration,
        easing: 'easeOutCubic',
      });
    }
  }, [ref, translateY, duration]);
}

/**
 * Escape closes the sheet — window keydown listener, ported verbatim from
 * SizeGuideSheet (round 18-3a1).
 */
export function useEscapeToClose(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
}
