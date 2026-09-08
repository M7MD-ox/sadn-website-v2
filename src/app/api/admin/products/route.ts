import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { ensureBootstrap } from '@/lib/bootstrap';
import { guard, prismaCode, readJson, serverError } from '@/lib/api-helpers';
import { parseProductInput } from '@/lib/admin-products';
import { serializeProduct } from '@/lib/products';

/** GET /api/admin/products — full catalog including inactive rows. */
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  try {
    await ensureBootstrap();
    const products = await db.product.findMany({
      // Round 16: the drag & drop order is the dashboard's canonical order;
      // createdAt breaks ties for rows that never got a sortOrder.
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json({
      ok: true,
      count: products.length,
      products: products.map(serializeProduct),
    });
  } catch (error) {
    console.error('GET /api/admin/products failed:', error);
    return serverError();
  }
}

/** POST /api/admin/products — create a product from the dashboard. */
export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  await ensureBootstrap();

  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.res;

  const parsedInput = parseProductInput(parsed.data, { partial: false });
  if (!parsedInput.ok) {
    return NextResponse.json({ ok: false, error: 'Validation failed', errors: parsedInput.errors }, { status: 422 });
  }

  try {
    const product = await db.product.create({
      data: parsedInput.data as Prisma.ProductUncheckedCreateInput,
    });
    return NextResponse.json({ ok: true, product: serializeProduct(product) }, { status: 201 });
  } catch (error) {
    if (prismaCode(error) === 'P2002') {
      return NextResponse.json(
        { ok: false, error: 'Validation failed', errors: { slug: 'This slug is already in use' } },
        { status: 409 }
      );
    }
    console.error('POST /api/admin/products failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not create the product' }, { status: 500 });
  }
}
