import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/admin-auth';

/**
 * Shared API-layer helpers (18-2) — the boilerplate every route handler used
 * to re-paste, in one place: the admin auth guard, the JSON-body reader, the
 * string coercion and the Prisma error-code check. Server-only (it imports
 * next/server and node:crypto transitively) — never import from client code.
 */

/**
 * Admin auth guard — returns `null` when the request is authorized, else a
 * ready-to-return 401 JSON response. Route handlers pass their NextRequest.
 */
export function guard(req: Request): NextResponse | null {
  // Route handlers always receive NextRequest (Request's server subclass).
  return requireAdmin(req as NextRequest)
    ? null
    : NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
}

/**
 * Read the request's JSON body. On parse failure `res` carries the standard
 * 400 {ok:false,error:'Invalid JSON body'} response — return it directly.
 */
export async function readJson(
  req: Request
): Promise<{ ok: true; data: unknown } | { ok: false; res: NextResponse }> {
  try {
    return { ok: true, data: await req.json() };
  } catch {
    return {
      ok: false,
      res: NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 }),
    };
  }
}

/** Trimmed string or '' — the one coercion every handler used to re-declare. */
export function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Prisma known-request error code, narrowed to the two codes this app
 * actually checks (P2002 unique-constraint, P2025 record-not-found);
 * anything else → null.
 */
export function prismaCode(e: unknown): 'P2002' | 'P2025' | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002' || e.code === 'P2025') return e.code;
  }
  return null;
}

/**
 * Uniform 500 for handler bodies running inside their own try/catch — a
 * failed query must answer JSON, never Next's HTML error page (which breaks
 * the dashboard's r.json()).
 */
export function serverError(): NextResponse {
  return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
}
