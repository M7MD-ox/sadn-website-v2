/**
 * Facebook Pixel consent gate (round 20-a, dashboard-driven since 27-a).
 *
 * The cookie banner (CookieConsent.tsx) calls `triggerFbPixelConsent()` the
 * moment a shopper taps "موافقة" — and re-calls it automatically on load for
 * returning visitors whose stored choice is already "accepted".
 *
 * Until that call, NOTHING Meta-owned runs: no fbevents.js script, no
 * cookies, no network requests.
 *
 * Round 27-a: the Pixel ID no longer comes from a deploy env var — the owner
 * sets it from Dashboard → Settings → Facebook Pixel (Setting.fbPixelId, a
 * normal DB field she can change or clear at any time). The ID resolves at
 * activation time from the chrome store's storefront config, falling back to
 * a direct /api/storefront fetch when the shell hasn't hydrated yet. An
 * empty ID = tracking stays a no-op (clearing the field disables the pixel).
 */

import { useChrome } from '@/components/sadn/chrome-store';

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

let activated = false;

/** Resolve the owner-set Pixel ID: chrome store first (already hydrated by
 * the shell), else one direct storefront fetch. Empty string = disabled. */
async function resolvePixelId(): Promise<string> {
  const cached = useChrome.getState().config?.fbPixelId;
  if (cached) return cached;
  try {
    const res = await fetch('/api/storefront', { cache: 'no-store' });
    if (!res.ok) return '';
    const data = (await res.json()) as { fbPixelId?: unknown };
    return typeof data.fbPixelId === 'string' ? data.fbPixelId : '';
  } catch {
    return '';
  }
}

/**
 * Activate Meta Pixel tracking — call only after an explicit consent.
 * Safe to call repeatedly (idempotent per session); async because the ID
 * may need one storefront round-trip. Fire-and-forget from the banner.
 */
export async function triggerFbPixelConsent(): Promise<void> {
  if (activated || typeof window === 'undefined') return;

  const pixelId = (await resolvePixelId()).trim();
  if (!pixelId) {
    // Consent is recorded by the banner either way — the pixel simply stays
    // off until the owner saves a Pixel ID in the dashboard.
    if (process.env.NODE_ENV !== 'production') {
      console.info(
        '[fb-pixel] Consent granted — save a Facebook Pixel ID in Dashboard → Settings to activate Meta tracking.'
      );
    }
    return;
  }

  activated = true;

  // Standard Meta bootstrap (typed) — queue early calls until fbevents.js
  // lands, exactly like the official snippet.
  if (!window.fbq) {
    const fbq: Fbq = (...args: unknown[]) => {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    };
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = '2.0';
    window.fbq = fbq;
    window._fbq = fbq;

    const script = document.createElement('script');
    script.async = true;
    script.id = 'fb-pixel';
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }

  window.fbq?.('init', pixelId);
  window.fbq?.('track', 'PageView');
}
