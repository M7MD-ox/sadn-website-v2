import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureBootstrap } from '@/lib/bootstrap';
import { guard, prismaCode, readJson, serverError } from '@/lib/api-helpers';

/**
 * Admin management of the WhatsApp broadcast list (round 31, research
 * item 6). GET lists subscribers newest-first with counts; PATCH mutes/
 * unmutes or annotates; DELETE removes a row (the customer asked out).
 */

/** GET /api/admin/subscribers — list + stats for the dashboard card. */
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  try {
    await ensureBootstrap();
    const [subscribers, activeCount] = await Promise.all([
      db.subscriber.findMany({ orderBy: { createdAt: 'desc' } }),
      db.subscriber.count({ where: { active: true } }),
    ]);
    return NextResponse.json({ ok: true, subscribers, activeCount });
  } catch (error) {
    console.error('GET /api/admin/subscribers failed:', error);
    return serverError();
  }
}

/** PATCH /api/admin/subscribers — { id, active? , note? }. */
export async function PATCH(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.res;
  const body = (typeof parsed.data === 'object' && parsed.data !== null ? parsed.data : {}) as Record<string, unknown>;
  const id = String(body.id ?? '');
  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing subscriber id' }, { status: 422 });
  }

  const data: { active?: boolean; note?: string } = {};
  if (typeof body.active === 'boolean') data.active = body.active;
  if (typeof body.note === 'string') data.note = body.note.slice(0, 200);
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: 'Nothing to update' }, { status: 422 });
  }

  try {
    const subscriber = await db.subscriber.update({ where: { id }, data });
    return NextResponse.json({ ok: true, subscriber });
  } catch (error) {
    if (prismaCode(error) === 'P2025') {
      return NextResponse.json({ ok: false, error: 'Subscriber not found' }, { status: 404 });
    }
    console.error('PATCH /api/admin/subscribers failed:', error);
    return serverError();
  }
}

/** DELETE /api/admin/subscribers?id=… */
export async function DELETE(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing subscriber id' }, { status: 422 });
  }

  try {
    await db.subscriber.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (prismaCode(error) === 'P2025') {
      return NextResponse.json({ ok: false, error: 'Subscriber not found' }, { status: 404 });
    }
    console.error('DELETE /api/admin/subscribers failed:', error);
    return serverError();
  }
}
