/**
 * One-off: dump every table from the current SQLite database into
 * supabase/data-export.json — the payload scripts/seed-supabase.ts loads
 * into the owner's Supabase Postgres once the Prisma datasource is flipped.
 *
 * Run: bun scripts/export-sqlite-data.ts
 */
import { writeFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const [products, categories, settings, reviews, stockMovements, orders] =
    await Promise.all([
      db.product.findMany({ orderBy: { sortOrder: 'asc' } }),
      db.category.findMany({ orderBy: { order: 'asc' } }),
      db.setting.findMany(),
      db.review.findMany({ orderBy: { order: 'asc' } }),
      db.stockMovement.findMany({ orderBy: { createdAt: 'asc' } }),
      db.order.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    source: 'db/custom.db (SQLite)',
    counts: {
      products: products.length,
      categories: categories.length,
      settings: settings.length,
      reviews: reviews.length,
      stockMovements: stockMovements.length,
      orders: orders.length,
    },
    products,
    categories,
    settings,
    reviews,
    stockMovements,
    orders,
  };

  writeFileSync('supabase/data-export.json', JSON.stringify(payload, null, 2));
  console.log('Exported:', payload.counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
