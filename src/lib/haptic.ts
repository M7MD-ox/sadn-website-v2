/**
 * Tiny haptic micro-feedback for the app-shell feel (round 8).
 *
 * Fire-and-forget `navigator.vibrate` pulses — silently ignored on
 * desktop browsers / iOS Safari (where the API is unavailable), and
 * guarded against prefers-reduced-motion so users who opted out of
 * motion also opt out of tactile chatter.
 */
export function haptic(pattern: number | number[] = 8): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('vibrate' in navigator) || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* some engines throw on unsupported patterns — never surface it */
  }
}

/** Pre-tuned pulses: keep the vocabulary small and consistent. */
export const hapticTap = () => haptic(8);
/** Slightly springier double-pulse for "saved/added" confirmations. */
export const hapticConfirm = () => haptic([10, 40, 6]);
