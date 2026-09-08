import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/reviews — active customer-review cards for the storefront wall
 * (16:9 chat-screenshot images, ordered). Dashboard-managed content.
 * Round 29: fitFeedback + productSlug ride along for the product-page
 * "قياس العميلات" chips.
 */
export async function GET() {
  try {
    const reviews = await db.review.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        image: true,
        caption: true,
        order: true,
        fitFeedback: true,
        productSlug: true,
      },
    });
    return NextResponse.json({ ok: true, count: reviews.length, reviews });
  } catch (error) {
    console.error('GET /api/reviews failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to load reviews' },
      { status: 500 }
    );
  }
}
