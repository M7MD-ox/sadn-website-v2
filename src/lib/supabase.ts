/**
 * Supabase server-side helper (round 25).
 *
 * The owner supplied his Supabase project (URL + anon + service-role keys,
 * stored in .env — never client-side; .env* is gitignored). This module is
 * the single server-only touchpoint for it.
 *
 *  STORAGE — live now: dashboard image uploads land in the owner's existing
 *  PUBLIC bucket `product-images` (he already keeps hero-1.jpg + fonts/
 *  there). Uploads use the service-role key via the Storage API; reads are
 *  plain public CDN URLs, so nothing server-side is needed to render.
 *
 *  DATABASE — prepared, not switched yet: the project has NO tables (the
 *  REST root only exposes /rpc/rls_auto_enable) and PostgREST cannot run
 *  DDL, so the Prisma switch to Postgres waits on the database password.
 *  The switch kit lives in prisma/schema.supabase.prisma +
 *  supabase/schema.sql + scripts/seed-supabase.ts + supabase/data-export.json.
 */

const SUPABASE_URL = process.env.SUPABASE_URL?.trim() || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

/** Public bucket the dashboard uploads go to (owner-created). */
export const SUPABASE_BUCKET = 'product-images';

/** True only when both env values exist — server-side usage only. */
export function supabaseUploadsEnabled(): boolean {
  return SUPABASE_URL.length > 0 && SERVICE_KEY.length > 0;
}

/**
 * Upload one file to the public bucket, returning its permanent public URL.
 * Throws on any non-2xx — callers decide the fallback (the upload route
 * falls back to local disk so the dashboard never hard-fails).
 */
export async function uploadToSupabaseStorage(
  body: Buffer,
  name: string,
  contentType: string
): Promise<string> {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${name}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: new Uint8Array(body),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Supabase Storage ${res.status}: ${detail.slice(0, 200)}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${name}`;
}
