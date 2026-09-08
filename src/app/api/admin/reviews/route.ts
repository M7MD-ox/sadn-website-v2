import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureBootstrap } from '@/lib/bootstrap';
import { guard, readJson, serverError, str } from '@/lib/api-helpers';

/** GET /api/admin/reviews — full list (active + hidden). */
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  try {
    await ensureBootstrap();
    const reviews = await db.review.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json({ ok: true, reviews });
  } catch (error) {
    console.error('GET /api/admin/reviews failed:', error);
    return serverError();
  }
}

/** POST /api/admin/reviews — { image, caption?, order?, fitFeedback?, productSlug? }. */
export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  await ensureBootstrap();

  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.res;
  const body = (typeof parsed.data === 'object' && parsed.data !== null ? parsed.data : {}) as Record<string, unknown>;

  const image = str(body.image).slice(0, 600);
  const caption = str(body.caption).slice(0, 120);
  // Round 19: garbage/absent order falls back to 99 — an EXPLICIT 0 stays 0
  // (0 || 99 collapsed it before, so the first created row sorted last).
  const rawOrder = Number(body.order);
  const order = Math.max(0, Number.isFinite(rawOrder) ? Math.round(rawOrder) : 99);

  // Round 29 — optional fit verdict + product link for the fit chips.
  const FIT_VALUES = ['tight', 'true', 'loose'] as const;
  const fitRaw = typeof body.fitFeedback === 'string' ? body.fitFeedback : '';
  const fitFeedback = (FIT_VALUES as readonly string[]).includes(fitRaw) ? fitRaw : null;
  const productSlug = typeof body.productSlug === 'string' && body.productSlug.trim()
    ? body.productSlug.trim().slice(0, 80)
    : null;

  if (!image) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', errors: { image: 'Upload a screenshot or paste an image URL' } },
      { status: 422 }
    );
  }

  try {
    const review = await db.review.create({ data: { image, caption, order, fitFeedback, productSlug } });
    return NextResponse.json({ ok: true, review }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/reviews failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not create the review' }, { status: 500 });
  }
}
