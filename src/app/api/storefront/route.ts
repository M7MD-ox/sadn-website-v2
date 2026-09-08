import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureBootstrap } from '@/lib/bootstrap';
import { parseStoreConfig } from '@/lib/store-settings';

/**
 * GET /api/storefront — public, non-secret store-wide state the shell needs
 * before anything else renders:
 *   • the announcement banner above the header (round 11)
 *   • promo code config + flat delivery fee (round 13, owner-controlled)
 *   • hero slideshow images + rotation interval (round 13)
 *   • footer phone numbers + brand page URLs (round 13)
 * The admin password hash NEVER leaves the server. The WhatsApp number is
 * public business contact info (wa.me links expose it by nature) — since 17-c
 * it ships inside the config for the storefront's floating chat chip.
 */
export async function GET() {
  try {
    await ensureBootstrap();
    const s = await db.setting.findUnique({ where: { id: 'singleton' } });
    const config = parseStoreConfig(s);
    return NextResponse.json({
      ok: true,
      banner: {
        visible: s?.bannerVisible ?? false,
        textEn: s?.bannerTextEn ?? '',
        textAr: s?.bannerTextAr ?? '',
      },
      whatsappReady: Boolean(s?.whatsappNumber),
      ...config,
    });
  } catch (error) {
    console.error('GET /api/storefront failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to load storefront settings' },
      { status: 500 }
    );
  }
}
