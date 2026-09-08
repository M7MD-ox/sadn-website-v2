import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { guard, prismaCode, readJson, serverError } from '@/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/admin/coupons/[id] — { active?, value?, minSubtotal?, usageLimit?, expiresAt?, note? }. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = guard(req);
  if (denied) return denied;
  const { id } = await params;

  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.res;
  const body = (typeof parsed.data === 'object' && parsed.data !== null ? parsed.data : {}) as Record<string, unknown>;

  const data: Record<string, unknown> = {};
  if (typeof body.active === 'boolean') data.active = body.active;

  if (body.value !== undefined) {
    const raw = Number(body.value);
    if (!Number.isFinite(raw) || raw <= 0) {
      return NextResponse.json({ ok: false, error: 'Validation failed', errors: { value: 'Enter the discount value' } }, { status: 422 });
    }
    // Kind decides the clamp — read the current row first.
    const current = await db.coupon.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ ok: false, error: 'Coupon not found' }, { status: 404 });
    }
    data.value = current.kind === 'percent' ? Math.min(90, Math.max(1, raw)) : Math.min(100_000, raw);
  }

  if (body.minSubtotal !== undefined) {
    data.minSubtotal = Math.min(100_000, Math.max(0, Number(body.minSubtotal) || 0));
  }

  if (body.usageLimit !== undefined) {
    if (body.usageLimit === null || body.usageLimit === '') {
      data.usageLimit = null; // unlimited
    } else {
      const n = Math.round(Number(body.usageLimit));
      if (!Number.isFinite(n) || n < 1) {
        return NextResponse.json({ ok: false, error: 'Validation failed', errors: { usageLimit: 'Usage limit must be 1 or more' } }, { status: 422 });
      }
      data.usageLimit = Math.min(100_000, n);
    }
  }

  if (body.expiresAt !== undefined) {
    if (body.expiresAt === null || body.expiresAt === '') {
      data.expiresAt = null; // never expires
    } else if (typeof body.expiresAt === 'string') {
      const d = new Date(body.expiresAt);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ ok: false, error: 'Validation failed', errors: { expiresAt: 'Invalid expiry date' } }, { status: 422 });
      }
      data.expiresAt = d;
    }
  }

  if (typeof body.note === 'string') data.note = body.note.slice(0, 140);

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: 'Nothing to update' }, { status: 422 });
  }

  try {
    const coupon = await db.coupon.update({ where: { id }, data });
    return NextResponse.json({ ok: true, coupon });
  } catch (error) {
    if (prismaCode(error) === 'P2025') {
      return NextResponse.json({ ok: false, error: 'Coupon not found' }, { status: 404 });
    }
    console.error('PATCH /api/admin/coupons/[id] failed:', error);
    return serverError();
  }
}

/** DELETE /api/admin/coupons/[id]. */
export async function DELETE(req: NextRequest, { params }: Params) {
  const denied = guard(req);
  if (denied) return denied;
  const { id } = await params;
  try {
    await db.coupon.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (prismaCode(error) === 'P2025') {
      return NextResponse.json({ ok: false, error: 'Coupon not found' }, { status: 404 });
    }
    console.error('DELETE /api/admin/coupons/[id] failed:', error);
    return serverError();
  }
}
