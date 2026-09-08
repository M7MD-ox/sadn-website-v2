import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureBootstrap } from '@/lib/bootstrap';
import { readJson } from '@/lib/api-helpers';
import { resolveDiscount } from '@/lib/coupons';

/**
 * POST /api/coupons/validate — the cart applies a code here before checkout.
 * Coupon table first, then the legacy single promo code (round 13). The
 * answer is advisory: POST /api/orders re-resolves the code authoritatively
 * server-side, so a tampered client can never grant itself a discount.
 */
export async function POST(req: NextRequest) {
  await ensureBootstrap();

  // Same body-size hardening as the order API (round 19).
  const contentLength = Number(req.headers.get('content-length') ?? 0);
  if (contentLength > 10_000) {
    return NextResponse.json({ ok: false, error: 'Request too large' }, { status: 413 });
  }

  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.res;
  const body = (typeof parsed.data === 'object' && parsed.data !== null ? parsed.data : {}) as Record<string, unknown>;

  const code = typeof body.code === 'string' ? body.code : '';
  const n = Number(body.subtotal);
  const subtotal = Number.isFinite(n) ? Math.min(Math.max(n, 0), 10_000_000) : 0;

  if (!code.trim()) {
    return NextResponse.json({ ok: false, reason: 'invalid', message: 'Enter a promo code' }, { status: 200 });
  }

  try {
    const result = await resolveDiscount(code, subtotal, db);
    if (!result.ok) {
      return NextResponse.json(result, { status: 200 });
    }
    return NextResponse.json({
      ok: true,
      source: result.source,
      code: result.code,
      kind: result.kind,
      value: result.value,
      minSubtotal: result.minSubtotal,
      discount: result.discount,
    });
  } catch (error) {
    console.error('POST /api/coupons/validate failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not validate the code' }, { status: 500 });
  }
}
