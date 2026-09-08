import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { guard, prismaCode, readJson, str } from '@/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/admin/categories/[id] — rename / relabel / reorder. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = guard(req);
  if (denied) return denied;
  const { id } = await params;

  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.res;
  const body = (typeof parsed.data === 'object' && parsed.data !== null ? parsed.data : {}) as Record<string, unknown>;

  const data: Record<string, unknown> = {};
  if (body.labelEn !== undefined) {
    const v = str(body.labelEn);
    if (v.length < 2) {
      return NextResponse.json({ ok: false, error: 'Validation failed', errors: { labelEn: 'Too short' } }, { status: 422 });
    }
    data.labelEn = v;
  }
  if (body.labelAr !== undefined) {
    const v = str(body.labelAr);
    if (v.length < 2) {
      return NextResponse.json({ ok: false, error: 'Validation failed', errors: { labelAr: 'قصيرة جداً' } }, { status: 422 });
    }
    data.labelAr = v;
  }
  // 99 matches the POST fallback — but ONLY for absent/garbage values:
  // explicit 0 is a legitimate drag position (the reorder UI sends order: 0
  // for the first card) and must not be overridden.
  if (body.order !== undefined) {
    const n = Math.round(Number(body.order));
    data.order = Number.isFinite(n) ? Math.max(0, n) : 99;
  }

  try {
    const category = await db.category.update({ where: { id }, data });
    return NextResponse.json({ ok: true, category });
  } catch (error) {
    if (prismaCode(error) === 'P2025') {
      return NextResponse.json({ ok: false, error: 'Category not found' }, { status: 404 });
    }
    console.error('PATCH /api/admin/categories/[id] failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not update the category' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/categories/[id] — blocked while products reference the
 * category; the owner reassigns those products first (no silent orphans).
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const denied = guard(req);
  if (denied) return denied;
  const { id } = await params;

  try {
    const category = await db.category.findUnique({ where: { id } });
    if (!category) {
      return NextResponse.json({ ok: false, error: 'Category not found' }, { status: 404 });
    }
    const inUse = await db.product.count({ where: { category: category.slug } });
    if (inUse > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `${inUse} product${inUse === 1 ? '' : 's'} still use this category — move them first`,
        },
        { status: 409 }
      );
    }
    await db.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/admin/categories/[id] failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not delete the category' }, { status: 500 });
  }
}
