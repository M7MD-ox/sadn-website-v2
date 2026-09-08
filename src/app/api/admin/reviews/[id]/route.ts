import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { guard, prismaCode, readJson, str } from '@/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/admin/reviews/[id] — { image?, caption?, active?, order?, fitFeedback?, productSlug? }. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = guard(req);
  if (denied) return denied;
  const { id } = await params;

  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.res;
  const body = (typeof parsed.data === 'object' && parsed.data !== null ? parsed.data : {}) as Record<string, unknown>;

  const data: Record<string, unknown> = {};
  if (typeof body.image === 'string') {
    const image = str(body.image).slice(0, 600);
    if (!image) {
      return NextResponse.json(
        { ok: false, error: 'Validation failed', errors: { image: 'Image URL cannot be empty' } },
        { status: 422 }
      );
    }
    data.image = image;
  }
  if (typeof body.caption === 'string') data.caption = str(body.caption).slice(0, 120);
  if (typeof body.active === 'boolean') data.active = body.active;

  // Round 29 — fit verdict: a valid value sets it, null/'' clears it.
  if (body.fitFeedback !== undefined) {
    const FIT_VALUES = ['tight', 'true', 'loose'] as const;
    const fit = typeof body.fitFeedback === 'string' ? body.fitFeedback : '';
    if (fit === '' || fit === null) {
      data.fitFeedback = null;
    } else if ((FIT_VALUES as readonly string[]).includes(fit)) {
      data.fitFeedback = fit;
    } else {
      return NextResponse.json(
        { ok: false, error: 'Validation failed', errors: { fitFeedback: 'fitFeedback must be tight | true | loose' } },
        { status: 422 }
      );
    }
  }
  if (body.productSlug !== undefined) {
    data.productSlug =
      typeof body.productSlug === 'string' && body.productSlug.trim()
        ? body.productSlug.trim().slice(0, 80)
        : null;
  }
  // 99 matches the POST fallback — but ONLY for absent/garbage values:
  // explicit 0 is a legitimate card position (the reorder UI sends order: 0
  // for the first card) and must not be overridden.
  if (body.order !== undefined) {
    const n = Math.round(Number(body.order));
    data.order = Number.isFinite(n) ? Math.max(0, n) : 99;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: 'Nothing to update' }, { status: 422 });
  }

  try {
    const review = await db.review.update({ where: { id }, data });
    return NextResponse.json({ ok: true, review });
  } catch (error) {
    if (prismaCode(error) === 'P2025') {
      return NextResponse.json({ ok: false, error: 'Review not found' }, { status: 404 });
    }
    console.error('PATCH /api/admin/reviews/[id] failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not update the review' }, { status: 500 });
  }
}

/** DELETE /api/admin/reviews/[id]. */
export async function DELETE(req: NextRequest, { params }: Params) {
  const denied = guard(req);
  if (denied) return denied;
  const { id } = await params;
  try {
    await db.review.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (prismaCode(error) === 'P2025') {
      return NextResponse.json({ ok: false, error: 'Review not found' }, { status: 404 });
    }
    console.error('DELETE /api/admin/reviews/[id] failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not delete the review' }, { status: 500 });
  }
}
