import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureBootstrap } from '@/lib/bootstrap';

/** GET /api/categories — public storefront sections (ordered). */
export async function GET() {
  try {
    await ensureBootstrap();
    const categories = await db.category.findMany({
      orderBy: [{ order: 'asc' }, { labelEn: 'asc' }],
    });
    return NextResponse.json({ ok: true, categories });
  } catch (error) {
    console.error('GET /api/categories failed:', error);
    return NextResponse.json({ ok: false, error: 'Failed to load categories' }, { status: 500 });
  }
}
