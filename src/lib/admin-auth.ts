import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

/**
 * Admin authentication (round 10) — password + signed session cookie.
 *
 *  • Passwords are stored as scrypt "salt:hash" hex pairs (Setting row).
 *  • A successful login sets an HttpOnly cookie holding an HMAC-SHA256
 *    signed payload `{ exp }` — no server-side session store needed.
 *  • Every /api/admin/* route (except login) verifies via requireAdmin().
 *
 * The signing secret can be overridden with ADMIN_SESSION_SECRET; the
 * fallback keeps local/sandbox deploys working out of the box.
 */

export const ADMIN_COOKIE = 'sadn_admin_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Dynamically generated secret per process boot if not configured via environment.
// A per-boot random secret is SAFE against cookie forgery (an attacker cannot
// guess it), its only cost is invalidating admin sessions on each deploy —
// which is actually desirable hygiene. So production logs a clear warning
// but keeps working; setting ADMIN_SESSION_SECRET makes sessions survive boots.
const runtimeFallbackSecret = randomBytes(32).toString('hex');
let warnedProductionMissingSecret = false;

function secret(): string {
  const s = (process.env.ADMIN_SESSION_SECRET || '').trim();
  if (s) return s;

  if (process.env.NODE_ENV === 'production' && !warnedProductionMissingSecret) {
    warnedProductionMissingSecret = true;
    console.warn(
      '[admin-auth] ADMIN_SESSION_SECRET is not set — using a per-boot ephemeral secret. ' +
        'Admin sessions will not survive restarts. Set ADMIN_SESSION_SECRET in the environment for stable sessions.'
    );
  }
  return runtimeFallbackSecret;
}

/* ── Password hashing ── */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  try {
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

/* ── Signed session tokens ── */

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex');
}

export function createSessionToken(): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + SESSION_TTL_MS })
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = sign(payload);
  if (sig.length !== expected.length) return false;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      exp: number;
    };
    return typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}

/* ── Request guard ── */

export function requireAdmin(req: NextRequest): boolean {
  return verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value);
}

export const SESSION_MAX_AGE_SECONDS = Math.floor(SESSION_TTL_MS / 1000);
