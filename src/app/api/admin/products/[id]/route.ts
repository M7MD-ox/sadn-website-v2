import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { guard, prismaCode, readJson } from '@/lib/api-helpers';
import { parseProductInput } from '@/lib/admin-products';
import { serializeProduct } from '@/lib/products';

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/admin/products/[id] — partial update (any subset of fields). */
export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = guard(req);
  if (denied) return denied;
  const { id } = await params;

  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.res;

  const parsedInput = parseProductInput(parsed.data, { partial: true });
  if (!parsedInput.ok) {
    return NextResponse.json({ ok: false, error: 'Validation failed', errors: parsedInput.errors }, { status: 422 });
  }

  try {
    const product = await db.product.update({
      where: { id },
      data: parsedInput.data as Prisma.ProductUncheckedUpdateInput,
    });
    return NextResponse.json({ ok: true, product: serializeProduct(product) });
  } catch (error) {
    if (prismaCode(error) === 'P2002') {
      return NextResponse.json(
        { ok: false, error: 'Validation failed', errors: { slug: 'This slug is already in use' } },
        { status: 409 }
      );
    }
    if (prismaCode(error) === 'P2025') {
      return NextResponse.json({ ok: false, error: 'Product not found' }, { status: 404 });
    }
    console.error('PATCH /api/admin/products/[id] failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not update the product' }, { status: 500 });
  }
}

/** DELETE /api/admin/products/[id] — permanent delete. */
export async function DELETE(req: NextRequest, { params }: Params) {
  const denied = guard(req);
  if (denied) return denied;
  const { id } = await params;
  try {
    await db.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (prismaCode(error) === 'P2025') {
      return NextResponse.json({ ok: false, error: 'Product not found' }, { status: 404 });
    }
    console.error('DELETE /api/admin/products/[id] failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not delete the product' }, { status: 500 });
  }
}
