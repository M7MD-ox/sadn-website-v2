import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureBootstrap } from '@/lib/bootstrap';
import { readJson } from '@/lib/api-helpers';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import {
  ADMIN_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifyPassword,
} from '@/lib/admin-auth';

/** POST /api/admin/login — { password } → sets the HttpOnly session cookie. */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  // Rate limit: max 5 login attempts per 15 minutes per IP
  const rateCheck = checkRateLimit(`admin_login_${ip}`, { max: 5, windowSeconds: 900 });
  if (!rateCheck.success) {
    return NextResponse.json(
      { ok: false, error: 'تم حظر محاولات الدخول مؤقتاً لتكرار المحاولات الخاطئة / Too many attempts. Try again in 15 minutes.' },
      { status: 429 }
    );
  }

  await ensureBootstrap();

  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.res;
  const raw = typeof parsed.data === 'object' && parsed.data !== null ? parsed.data : {};
  const body = raw as { password?: unknown };

  const password = typeof body.password === 'string' ? body.password : '';
  if (!password) {
    return NextResponse.json({ ok: false, error: 'Password is required' }, { status: 400 });
  }

  const settings = await db.setting.findUnique({ where: { id: 'singleton' } });
  if (!settings || !verifyPassword(password, settings.adminPasswordHash)) {
    // Deliberately vague — do not reveal which half failed.
    return NextResponse.json({ ok: false, error: 'Incorrect password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
