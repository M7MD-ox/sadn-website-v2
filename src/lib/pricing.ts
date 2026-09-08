/**
 * SADN shared pricing rules — imported by BOTH the client store and the
 * server-side order API so the two can never drift apart.
 *
 * Currency: Egyptian pound (EGP / ج.م) — owner directive ("العملة الجنيه").
 * Payment: cash on delivery, InstaPay transfer, or Vodafone Cash (round 15).
 *
 * Round 13: the delivery fee is owner-controlled from the dashboard
 * (Setting.shippingFee) — a flat fee applied to any non-empty cart.
 */

/** Flat owner-set delivery fee; 0 fee → free. */
export function computeShipping(shippingFee: number): number {
  return shippingFee > 0 ? shippingFee : 0;
}

/**
 * Round 29 — free-shipping threshold rule. A subtotal at or above the
 * owner's threshold ships free; 0 threshold = the rule is off and the flat
 * fee applies. Shared by the storefront bag math and both order APIs.
 */
export function shippingDue(
  shippingFee: number,
  subtotal: number,
  freeShippingThreshold: number
): number {
  if (freeShippingThreshold > 0 && subtotal >= freeShippingThreshold) return 0;
  return computeShipping(shippingFee);
}

/**
 * EGP money label shared by the storefront and the WhatsApp order message —
 * "EGP 1,250" (EN) / "1,250 ج.م" (AR); non-integers keep 2 decimals.
 */
export function formatEgp(n: number, lang: 'en' | 'ar'): string {
  const value = Number.isInteger(n) ? n.toLocaleString('en-US') : n.toFixed(2);
  return lang === 'ar' ? `${value} ج.م` : `EGP ${value}`;
}
