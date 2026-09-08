import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureBootstrap } from '@/lib/bootstrap';
import { guard, prismaCode, readJson, serverError, str } from '@/lib/api-helpers';

/** GET /api/admin/categories — full list (same shape as the public route). */
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  try {
    await ensureBootstrap();
    const categories = await db.category.findMany({ orderBy: [{ order: 'asc' }, { labelEn: 'asc' }] });
    return NextResponse.json({ ok: true, categories });
  } catch (error) {
    console.error('GET /api/admin/categories failed:', error);
    return serverError();
  }
}

/** POST /api/admin/categories — { slug, labelEn, labelAr, order? }. */
export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  await ensureBootstrap();

  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.res;
  const body = (typeof parsed.data === 'object' && parsed.data !== null ? parsed.data : {}) as Record<string, unknown>;

  const errors: Record<string, string> = {};
  const slug = str(body.slug).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const labelEn = str(body.labelEn);
  const labelAr = str(body.labelAr);
  // Round 19: garbage/absent order falls back to 99 — an EXPLICIT 0 stays 0
  // (0 || 99 collapsed it before, so the first created row sorted last).
  const rawOrder = Number(body.order);
  const order = Math.max(0, Number.isFinite(rawOrder) ? Math.round(rawOrder) : 99);

  if (slug.length < 2) errors.slug = 'Slug must be at least 2 characters';
  if (labelEn.length < 2) errors.labelEn = 'English label is required';
  if (labelAr.length < 2) errors.labelAr = 'التسمية العربية مطلوبة';
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ ok: false, error: 'Validation failed', errors }, { status: 422 });
  }

  try {
    const category = await db.category.create({ data: { slug, labelEn, labelAr, order } });
    return NextResponse.json({ ok: true, category }, { status: 201 });
  } catch (error) {
    if (prismaCode(error) === 'P2002') {
      return NextResponse.json(
        { ok: false, error: 'Validation failed', errors: { slug: 'This slug is already in use' } },
        { status: 409 }
      );
    }
    console.error('POST /api/admin/categories failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not create the category' }, { status: 500 });
  }
}
