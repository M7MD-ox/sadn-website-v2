/**
 * Round 31 QA cleanup — removes the browser-test order (SADN-998019) and
 * the two test subscribers, restoring the drained stock. Same convention
 * as the round-29 cleanup: production data stays clean after QA.
 *
 * Run: DATABASE_URL='…' bunx tsx qa/cleanup-31.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const order = await db.order.findUnique({ where: { number: 'SADN-998019' } });
  if (order) {
    const movs = await db.stockMovement.deleteMany({ where: { orderNumber: 'SADN-998019' } });
    console.log('movements deleted:', movs.count);
    await db.product.update({
      where: { slug: 'abaya-mocha-crepe' },
      data: { stock: { increment: 1 } },
    });
    await db.order.delete({ where: { number: 'SADN-998019' } });
    console.log('order deleted + stock restored');
  } else {
    console.log('order already gone');
  }

  const subs = await db.subscriber.deleteMany({
    where: { phone: { in: ['01012345678', '01099988777'] } },
  });
  console.log('test subscribers deleted:', subs.count);
  console.log(
    'remaining orders:',
    await db.order.count(),
    '| subscribers:',
    await db.subscriber.count()
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
