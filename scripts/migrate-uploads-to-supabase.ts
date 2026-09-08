/**
 * Round 26 — copy every DB-referenced image from local public/uploads into
 * the owner's Supabase `product-images` bucket, verify each object serves
 * publicly, then rewrite the DB URLs to the permanent CDN links.
 *
 * Local files are KEPT as a silent fallback (nothing is deleted). Un-
 * referenced files and repo-bundled /products/* statics stay local on
 * purpose.
 *
 * Run: bun scripts/migrate-uploads-to-supabase.ts
 */
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

// Bun runs this outside Next.js — pull .env in manually (DATABASE_URL is
// already resolved by Prisma itself; the SUPABASE_* keys are the ones we need).
try {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {
  /* no .env — handled by the guard below */
}

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const BUCKET = 'product-images';
const PREFIX = 'uploads'; // objects live at uploads/<original-path>

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing in .env');
  process.exit(1);
}

const db = new PrismaClient();

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

const cdn = (path: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${PREFIX}/${path}`;

async function push(localPath: string): Promise<string | null> {
  let bytes: Buffer;
  try {
    bytes = await readFile(`public${localPath}`);
  } catch {
    console.warn(`  !! local file missing, skipped: public${localPath}`);
    return null;
  }
  const ext = localPath.split('.').pop()!.toLowerCase();
  const objectName = `${PREFIX}${localPath}`; // uploads/abaya-x.webp
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectName}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': MIME[ext] ?? 'application/octet-stream',
        'x-upsert': 'true',
      },
      body: new Uint8Array(bytes),
    }
  );
  if (!res.ok) {
    console.warn(`  !! upload ${res.status} for ${objectName}: ${(await res.text()).slice(0, 120)}`);
    return null;
  }
  // Verify the public CDN copy before we trust it with the DB URL.
  const check = await fetch(cdn(localPath));
  if (!check.ok) {
    console.warn(`  !! public verify ${check.status} for ${objectName}`);
    return null;
  }
  return cdn(localPath);
}

/** Collect every /uploads/... ref from the JSON image arrays of a product. */
function productRefs(images: string): string[] {
  try {
    return (JSON.parse(images) as string[]).filter((u) => u.startsWith('/uploads/'));
  } catch {
    return [];
  }
}

async function main() {
  const [products, reviews, settings] = await Promise.all([
    db.product.findMany(),
    db.review.findMany(),
    db.setting.findMany(),
  ]);

  // 1) Collect every referenced /uploads path across the DB.
  const refs = new Set<string>();
  for (const p of products) productRefs(p.images).forEach((u) => refs.add(u));
  for (const r of reviews) if (r.image.startsWith('/uploads/')) refs.add(r.image);
  for (const s of settings)
    (JSON.parse(s.heroImages) as string[])
      .filter((u) => u.startsWith('/uploads/'))
      .forEach((u) => refs.add(u));

  console.log(`Migrating ${refs.size} file(s) → ${BUCKET}/${PREFIX}/…`);

  // 2) Upload + verify each one; build the old→new URL map.
  const map = new Map<string, string>();
  for (const ref of refs) {
    const url = await push(ref);
    if (url) {
      map.set(ref, url);
      console.log(`  ✓ ${ref}`);
    }
  }
  if (map.size === 0) {
    console.log('Nothing migrated — DB left untouched.');
    return;
  }

  const swap = (u: string) => map.get(u) ?? u;

  // 3) Rewrite the DB rows (only products that actually changed).
  for (const p of products) {
    const next = JSON.stringify(JSON.parse(p.images).map(swap));
    if (next !== p.images) {
      await db.product.update({ where: { id: p.id }, data: { images: next } });
      console.log(`  DB product ${p.slug}`);
    }
  }
  for (const r of reviews) {
    if (map.has(r.image)) {
      await db.review.update({ where: { id: r.id }, data: { image: map.get(r.image)! } });
      console.log(`  DB review ${r.id}`);
    }
  }
  for (const s of settings) {
    const next = JSON.stringify(JSON.parse(s.heroImages).map(swap));
    if (next !== s.heroImages) {
      await db.setting.update({ where: { id: s.id }, data: { heroImages: next } });
      console.log(`  DB settings ${s.id} heroImages`);
    }
  }

  console.log(`Done — ${map.size} URL(s) rewritten to the Supabase CDN. Local copies kept.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
