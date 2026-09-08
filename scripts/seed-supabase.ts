/**
 * Seed the owner's Supabase Postgres from supabase/data-export.json.
 *
 * WHEN TO RUN — only after the datasource switch is complete:
 *   1. Owner provides the database password (Supabase → Project Settings →
 *      Database → Connection string → URI).
 *   2. DATABASE_URL in .env points at Supabase (pooler URI recommended).
 *   3. `sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma`
 *      (or swap in prisma/schema.supabase.prisma), then:
 *      bunx prisma generate && bunx prisma db push
 *   4. bun scripts/seed-supabase.ts
 *
 * The schema has zero cross-table relations, so plain createMany in any
 * order is safe. DateTimes arrive as ISO strings — Prisma accepts them.
 *
 * Run: bun scripts/seed-supabase.ts
 */
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

type Export = {
  products: unknown[];
  categories: unknown[];
  settings: unknown[];
  reviews: unknown[];
  stockMovements: unknown[];
  orders: unknown[];
};

const db = new PrismaClient();
const data: Export = JSON.parse(readFileSync('supabase/data-export.json', 'utf8'));

async function seed<T extends object>(rows: T[], run: (batch: T[]) => Promise<unknown>) {
  if (rows.length === 0) return 0;
  await run(rows);
  return rows.length;
}

async function main() {
  console.log(
    'Seeding Supabase Postgres:',
    JSON.stringify({
      products: data.products.length,
      categories: data.categories.length,
      settings: data.settings.length,
      reviews: data.reviews.length,
      stockMovements: data.stockMovements.length,
      orders: data.orders.length,
    })
  );

  const products = await seed(data.products as never[], (b) => db.product.createMany({ data: b }));
  const categories = await seed(data.categories as never[], (b) => db.category.createMany({ data: b }));
  // Setting is a singleton table — createMany works, rows carry their ids.
  const settings = await seed(data.settings as never[], (b) => db.setting.createMany({ data: b }));
  const reviews = await seed(data.reviews as never[], (b) => db.review.createMany({ data: b }));
  const movements = await seed(data.stockMovements as never[], (b) => db.stockMovement.createMany({ data: b }));
  const orders = await seed(data.orders as never[], (b) => db.order.createMany({ data: b }));

  console.log({ products, categories, settings, reviews, movements, orders });
  console.log('Supabase seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
