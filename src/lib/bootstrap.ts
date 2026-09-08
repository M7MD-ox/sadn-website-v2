import { db } from '@/lib/db';
import { hashPassword } from '@/lib/admin-auth';

/**
 * One-time server bootstrap (round 10) — memoized so concurrent API calls
 * share a single run. Guarantees the admin dashboard, settings and category
 * chips always have their data:
 *   1. Setting singleton (default owner password if the row is missing).
 *   2. Storefront categories (seeded from the original static list).
 * Products are seeded by the earlier rounds' catalog script and are NOT
 * touched here (the dashboard owns them from now on).
 */

const DEFAULT_ADMIN_PASSWORD = 'sadn-admin';

const DEFAULT_CATEGORIES = [
  { slug: 'butterfly-bloom', labelEn: 'Butterfly Bloom', labelAr: 'Butterfly Bloom', order: 1 },
];

let bootstrapPromise: Promise<void> | null = null;

async function run(): Promise<void> {
  // 1) Settings singleton — default password on first boot.
  const settings = await db.setting.findUnique({ where: { id: 'singleton' } });
  if (!settings) {
    await db.setting.create({
      data: {
        id: 'singleton',
        whatsappNumber: '',
        adminPasswordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
      },
    });
  } else if (!settings.adminPasswordHash) {
    // Row existed without a hash (e.g. older deploy) — repair it.
    await db.setting.update({
      where: { id: 'singleton' },
      data: { adminPasswordHash: hashPassword(DEFAULT_ADMIN_PASSWORD) },
    });
  }

  // 2) Categories — seed only when the table is empty.
  const categoryCount = await db.category.count();
  if (categoryCount === 0) {
    await db.category.createMany({ data: DEFAULT_CATEGORIES });
  }
}

export function ensureBootstrap(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = run().catch((err) => {
      // Allow a retry on the next request if seeding failed transiently.
      bootstrapPromise = null;
      throw err;
    });
  }
  return bootstrapPromise;
}
