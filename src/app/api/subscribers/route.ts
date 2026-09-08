import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureBootstrap } from '@/lib/bootstrap';
import { readJson } from '@/lib/api-helpers';
import { EG_MOBILE_RE, stripPhoneChars } from '@/lib/eg-phone';

/**
 * POST /api/subscribers — WhatsApp broadcast opt-in (round 31, research
 * item 6, "سيبي رقمك"). Used by the thank-you page card; the checkout
 * checkbox subscribes through POST /api/orders (same upsert logic inline).
 * Idempotent: an already-subscribed phone flips back to active instead of
 * erroring, so re-opting in after a mute just works.
 */
export async function POST(req: NextRequest) {
  await ensureBootstrap();

  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.res;
  const body = (typeof parsed.data === 'object' && parsed.data !== null ? parsed.data : {}) as Record<string, unknown>;

  const phone = stripPhoneChars(String(body.phone ?? ''));
  if (!EG_MOBILE_RE.test(phone)) {
    return NextResponse.json(
      { ok: false, error: 'Enter a valid Egyptian mobile number (e.g. 01012345678)' },
      { status: 422 }
    );
  }
  const name = String(body.name ?? '').trim().slice(0, 80);
  const source = body.source === 'thankyou' ? 'thankyou' : 'checkout';

  try {
    const subscriber = await db.subscriber.upsert({
      where: { phone },
      create: { phone, name, source, active: true },
      update: { active: true, ...(name ? { name } : {}) },
    });
    return NextResponse.json({ ok: true, subscribed: subscriber.active }, { status: 201 });
  } catch (error) {
    console.error('POST /api/subscribers failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Could not save your number. Please try again.' },
      { status: 500 }
    );
  }
}
