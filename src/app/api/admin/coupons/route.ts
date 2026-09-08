import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureBootstrap } from '@/lib/bootstrap';
import { guard, prismaCode, readJson, serverError, str } from '@/lib/api-helpers';
import { normalizeCode } from '@/lib/promos';

/** GET /api/admin/coupons — full coupon list (newest first). */
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  try {
    await ensureBootstrap();
    const coupons = await db.coupon.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });
    return NextResponse.json({ ok: true, coupons });
  } catch (error) {
    console.error('GET /api/admin/coupons failed:', error);
    return serverError();
  }
}

/** POST /api/admin/coupons — create one code. */
export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  await ensureBootstrap();

  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.res;
  const body = (typeof parsed.data === 'object' && parsed.data !== null ? parsed.data : {}) as Record<string, unknown>;

  const code = normalizeCode(str(body.code));
  if (!code || code.length > 24) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', errors: { code: 'Code is required (max 24 characters)' } },
      { status: 422 }
    );
  }

  const kind = body.kind === 'fixed' ? 'fixed' : 'percent';
  const rawValue = Number(body.value);
  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', errors: { value: 'Enter the discount value' } },
      { status: 422 }
    );
  }
  const value = kind === 'percent' ? Math.min(90, Math.max(1, rawValue)) : Math.min(100_000, rawValue);

  const minSubtotal = Math.min(100_000, Math.max(0, Number(body.minSubtotal) || 0));

  let usageLimit: number | null = null;
  if (body.usageLimit !== undefined && body.usageLimit !== null && body.usageLimit !== '') {
    const n = Math.round(Number(body.usageLimit));
    if (!Number.isFinite(n) || n < 1) {
      return NextResponse.json(
        { ok: false, error: 'Validation failed', errors: { usageLimit: 'Usage limit must be 1 or more' } },
        { status: 422 }
      );
    }
    usageLimit = Math.min(100_000, n);
  }

  let expiresAt: Date | null = null;
  if (typeof body.expiresAt === 'string' && body.expiresAt.trim()) {
    const d = new Date(body.expiresAt);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json(
        { ok: false, error: 'Validation failed', errors: { expiresAt: 'Invalid expiry date' } },
        { status: 422 }
      );
    }
    expiresAt = d;
  }

  const note = str(body.note).slice(0, 140);

  try {
    const coupon = await db.coupon.create({
      data: { code, kind, value, minSubtotal, usageLimit, expiresAt, note },
    });
    return NextResponse.json({ ok: true, coupon }, { status: 201 });
  } catch (error) {
    if (prismaCode(error) === 'P2002') {
      return NextResponse.json(
        { ok: false, error: 'Validation failed', errors: { code: 'This code already exists' } },
        { status: 422 }
      );
    }
    console.error('POST /api/admin/coupons failed:', error);
    return serverError();
  }
}
