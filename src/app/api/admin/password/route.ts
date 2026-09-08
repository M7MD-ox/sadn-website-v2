import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureBootstrap } from '@/lib/bootstrap';
import { guard, readJson, serverError } from '@/lib/api-helpers';
import { hashPassword, verifyPassword } from '@/lib/admin-auth';

/**
 * PUT /api/admin/password — { current, next } → rotate the dashboard password.
 * Sessions are cookie-token based, so they survive the rotation (owner stays
 * logged in on the current device).
 */
export async function PUT(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  try {
    await ensureBootstrap();

    const parsed = await readJson(req);
    if (!parsed.ok) return parsed.res;
    const raw = typeof parsed.data === 'object' && parsed.data !== null ? parsed.data : {};
    const body = raw as { current?: unknown; next?: unknown };

    const current = typeof body.current === 'string' ? body.current : '';
    const next = typeof body.next === 'string' ? body.next : '';

    const settings = await db.setting.findUnique({ where: { id: 'singleton' } });
    if (!settings || !verifyPassword(current, settings.adminPasswordHash)) {
      return NextResponse.json({ ok: false, error: 'Current password is incorrect' }, { status: 401 });
    }
    if (next.length < 6) {
      return NextResponse.json(
        { ok: false, error: 'New password must be at least 6 characters' },
        { status: 422 }
      );
    }

    await db.setting.update({
      where: { id: 'singleton' },
      data: { adminPasswordHash: hashPassword(next) },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PUT /api/admin/password failed:', error);
    return serverError();
  }
}
