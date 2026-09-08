import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureBootstrap } from '@/lib/bootstrap';
import { guard, serverError } from '@/lib/api-helpers';

/** GET /api/admin/stats — overview KPIs for the dashboard home. */
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  try {
    await ensureBootstrap();

    const [productCount, categoryCount, orderAgg, pendingCount, deliveredCount, cancelledCount, lowStock, recentOrders, statusGroups, loyaltyRows] =
      await Promise.all([
        db.product.count(),
        db.category.count(),
        db.order.aggregate({
          _count: { _all: true },
          _sum: { total: true },
          where: { status: { notIn: ['cancelled', 'returned'] } },
        }),
        // "New orders" = the checklist hasn't been touched yet (round 15:
        // owner-editable stage pipeline; fresh transfer orders sit in مراجعة الدفع).
        db.order.count({ where: { stagesDone: '[]' } }),
        db.order.count({ where: { status: 'delivered' } }),
        db.order.count({ where: { status: { in: ['cancelled', 'returned'] } } }),
        db.product.count({ where: { stock: { lte: 3 } } }),
        db.order.findMany({ orderBy: { createdAt: 'desc' }, take: 6 }),
        db.order.groupBy({ by: ['status'], _count: { _all: true } }),
        // Loyalty report (round 29): repeat-purchase rate grouped by phone.
        db.order.findMany({
          where: { status: { not: 'cancelled' } },
          select: { phone: true, total: true },
        }),
      ]);

    // ── Loyalty KPIs (round 29): orders per phone number ──
    const ordersByPhone = new Map<string, number>();
    for (const o of loyaltyRows) {
      if (!o.phone) continue;
      ordersByPhone.set(o.phone, (ordersByPhone.get(o.phone) ?? 0) + 1);
    }
    const uniqueCustomers = ordersByPhone.size;
    let repeatOrders = 0;
    for (const n of ordersByPhone.values()) if (n >= 2) repeatOrders += n;
    const loyalty = {
      uniqueCustomers,
      repeatCustomers: [...ordersByPhone.values()].filter((n) => n >= 2).length,
      repeatRate: uniqueCustomers > 0 ? ([...ordersByPhone.values()].filter((n) => n >= 2).length / uniqueCustomers) * 100 : 0,
      avgOrdersPerCustomer: uniqueCustomers > 0 ? loyaltyRows.length / uniqueCustomers : 0,
      repeatOrders,
    };

    const recent = recentOrders.map((o) => ({
      id: o.id,
      number: o.number,
      customerName: o.customerName,
      total: o.total,
      status: o.status,
      createdAt: o.createdAt,
    }));

    return NextResponse.json({
      ok: true,
      stats: {
        productCount,
        categoryCount,
        orderCount: orderAgg._count._all,
        revenue: orderAgg._sum.total ?? 0,
        pendingCount,
        deliveredCount,
        cancelledCount,
        lowStock,
        avgOrderValue:
          orderAgg._count._all > 0 ? (orderAgg._sum.total ?? 0) / orderAgg._count._all : 0,
        statusCounts: Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all])),
        recentOrders: recent,
        loyalty,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/stats failed:', error);
    return serverError();
  }
}
