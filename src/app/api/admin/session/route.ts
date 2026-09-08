import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

/** GET /api/admin/session — { authed: boolean } for the dashboard shell. */
export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true, authed: requireAdmin(req) });
}
