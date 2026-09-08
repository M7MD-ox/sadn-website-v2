/**
 * SADN coupons (round 29) — dashboard-managed discount codes for the
 * retention program (thank-you codes, winback, VIP). Shared pure math used
 * by BOTH the client (instant cart feedback) and the server APIs
 * (authoritative recomputation at /api/coupons/validate and /api/orders).
 *
 * The legacy single promo code (Setting.promo*) stays as a fallback —
 * resolveDiscount tries the Coupon table first, then the legacy code, so
 * the existing banner (SADN10) keeps working with zero migration.
 */

import { applyPromo, normalizeCode } from '@/lib/promos';
import { promoConfigFromSettings } from '@/lib/store-settings';

export type CouponKind = 'percent' | 'fixed';

/** The dashboard's coupon row shape (as returned by /api/admin/coupons). */
export type CouponRow = {
  id: string;
  code: string;
  kind: CouponKind;
  value: number;
  minSubtotal: number;
  active: boolean;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | null;
  note: string;
};

/** Discount amount for a subtotal — capped at the subtotal itself. Pure. */
export function couponDiscount(
  kind: CouponKind,
  value: number,
  subtotal: number
): number {
  if (subtotal <= 0) return 0;
  const raw = kind === 'percent' ? Math.round(subtotal * value) / 100 : value;
  return Math.min(Math.max(raw, 0), subtotal);
}

export type DiscountResolution =
  | {
      ok: true;
      source: 'coupon' | 'promo';
      code: string;
      kind: CouponKind;
      value: number;
      minSubtotal: number;
      discount: number;
      couponId?: string;
    }
  | { ok: false; reason: 'invalid' | 'min-subtotal' | 'expired' | 'usage-limit'; message: string };

/** A raw Prisma Setting row (or null) — typed loosely on purpose. */
type SettingLike = unknown;

function couponIsActive(c: {
  active: boolean;
  expiresAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
}): 'ok' | 'expired' | 'usage-limit' {
  if (!c.active) return 'usage-limit'; // inactive reads as unavailable, not expired
  if (c.expiresAt && c.expiresAt.getTime() < Date.now()) return 'expired';
  if (c.usageLimit !== null && c.usedCount >= c.usageLimit) return 'usage-limit';
  return 'ok';
}

/**
 * The authoritative code resolver — Coupon table first, then the legacy
 * single promo code. Used by /api/coupons/validate (no side effects) and
 * POST /api/orders (increments the usage counter afterwards).
 */
export async function resolveDiscount(
  rawCode: string,
  subtotal: number,
  db: {
    coupon: {
      findUnique: (args: { where: { code: string } }) => Promise<{
        id: string;
        code: string;
        kind: string;
        value: number;
        minSubtotal: number;
        active: boolean;
        usageLimit: number | null;
        usedCount: number;
        expiresAt: Date | null;
      } | null>;
    };
    setting: { findUnique: (args: { where: { id: string } }) => Promise<SettingLike> };
  }
): Promise<DiscountResolution> {
  const code = normalizeCode(rawCode);
  if (!code) {
    return { ok: false, reason: 'invalid', message: 'Enter a promo code' };
  }

  const coupon = await db.coupon.findUnique({ where: { code } });
  if (coupon) {
    const state = couponIsActive(coupon);
    if (state === 'expired') {
      return { ok: false, reason: 'expired', message: `“${code}” has expired` };
    }
    if (state === 'usage-limit') {
      return { ok: false, reason: 'usage-limit', message: `“${code}” is no longer available` };
    }
    if (subtotal < coupon.minSubtotal) {
      return {
        ok: false,
        reason: 'min-subtotal',
        message: `${code} needs an EGP ${coupon.minSubtotal.toLocaleString('en-US')} subtotal`,
      };
    }
    const kind: CouponKind = coupon.kind === 'fixed' ? 'fixed' : 'percent';
    return {
      ok: true,
      source: 'coupon',
      code: coupon.code,
      kind,
      value: coupon.value,
      minSubtotal: coupon.minSubtotal,
      discount: couponDiscount(kind, coupon.value, subtotal),
      couponId: coupon.id,
    };
  }

  // Legacy fallback — the single owner promo code from Settings (round 13).
  const settings = await db.setting.findUnique({ where: { id: 'singleton' } });
  const promo = applyPromo(code, subtotal, promoConfigFromSettings(settings));
  if (promo.ok) {
    return {
      ok: true,
      source: 'promo',
      code: promo.code,
      kind: 'percent',
      value: promo.percent,
      minSubtotal: 0,
      discount: promo.discount,
    };
  }
  return { ok: false, reason: 'invalid', message: promo.message };
}

/**
 * The thank-you page's "next order" gift (round 31, research item 5) —
 * the newest still-redeemable dashboard coupon. Prefers a code the owner
 * flagged as a thank-you code (note mentions شكر/thank); falls back to the
 * newest available one; null when every coupon is spent/expired so the
 * card simply doesn't render.
 */
export async function thankYouCoupon(
  db: {
    coupon: {
      findMany: (args: {
        where: { active: boolean };
        orderBy: { createdAt: 'desc' }[];
        take?: number;
      }) => Promise<
        Array<{
          active: boolean;
          code: string;
          kind: string;
          value: number;
          minSubtotal: number;
          usageLimit: number | null;
          usedCount: number;
          expiresAt: Date | null;
          note: string;
        }>
      >;
    };
  }
): Promise<{ code: string; kind: CouponKind; value: number; minSubtotal: number; note: string } | null> {
  const rows = await db.coupon.findMany({ where: { active: true }, orderBy: [{ createdAt: 'desc' }], take: 20 });
  const alive = rows.filter((c) => couponIsActive(c) === 'ok');
  if (alive.length === 0) return null;
  const picked =
    alive.find((c) => /شكر|thank/i.test(c.note)) ?? alive[0];
  return {
    code: picked.code,
    kind: picked.kind === 'fixed' ? 'fixed' : 'percent',
    value: picked.value,
    minSubtotal: picked.minSubtotal,
    note: picked.note,
  };
}
