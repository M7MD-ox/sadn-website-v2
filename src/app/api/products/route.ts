import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeProduct } from '@/lib/products';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');
    const isNew = searchParams.get('isNew');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 24, 48) : 24;

    const products = await db.product.findMany({
      where: {
        active: true, // hidden (dashboard) products never reach the storefront
        ...(category ? { category } : {}),
        ...(featured === 'true' ? { featured: true } : {}),
        ...(isNew === 'true' ? { isNew: true } : {}),
      },
      // 18-2 (R9): the drag & drop order (sortOrder) is canonical — same
      // ordering as catalog.getProducts() and the admin list, so a client
      // background revalidation can't flip the SSR order.
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take: limit,
    });

    return NextResponse.json({
      ok: true,
      count: products.length,
      products: products.map(serializeProduct),
    });
  } catch (error) {
    console.error('GET /api/products failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to load products' },
      { status: 500 }
    );
  }
}
