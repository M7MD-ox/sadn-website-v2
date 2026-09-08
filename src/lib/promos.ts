/**
 * SADN promo code (round 13) — the single owner-controlled code lives in the
 * Setting row and is editable from the dashboard. `applyPromo` is imported by
 * BOTH the client (instant feedback in the cart) and the server-side order
 * API (authoritative recomputation, so a tampered client can never grant
 * itself a bigger discount).
 */

import type { PromoConfig } from '@/lib/store-settings';

export type PromoResult =
  | { ok: true; code: string; discount: number; percent: number }
  | { ok: false; reason: 'invalid' | 'min-subtotal'; message: string };

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

/** Apply the owner's promo config to a subtotal. Pure — no side effects. */
export function applyPromo(
  rawCode: string,
  subtotal: number,
  cfg: PromoConfig | null | undefined
): PromoResult {
  const code = normalizeCode(rawCode);
  if (!code) {
    return { ok: false, reason: 'invalid', message: 'Enter a promo code' };
  }
  if (!cfg || !cfg.enabled || !cfg.code) {
    return {
      ok: false,
      reason: 'invalid',
      message: `“${code}” is not a valid code`,
    };
  }
  if (code !== cfg.code) {
    return {
      ok: false,
      reason: 'invalid',
      message: `“${code}” is not a valid code`,
    };
  }
  if (subtotal < cfg.min) {
    return {
      ok: false,
      reason: 'min-subtotal',
      message: `${cfg.code} needs an EGP ${cfg.min.toLocaleString('en-US')} subtotal`,
    };
  }
  const discount = Math.round(subtotal * cfg.percent) / 100;
  return { ok: true, code: cfg.code, discount, percent: cfg.percent };
}
