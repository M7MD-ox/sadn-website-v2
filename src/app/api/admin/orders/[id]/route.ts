import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { guard, readJson } from '@/lib/api-helpers';
import { normalizeStagesDone, serializeOrder, stagesUpTo } from '@/lib/orders';
import { parseOrderStages } from '@/lib/store-settings';

type Params = { params: Promise<{ id: string }> };

const SADN_NUMBER = /^SADN-\d{6}$/;

/** Accept a CUID id OR a public "SADN-######" order number (r11 fix). */
async function findOrder(idOrNumber: string) {
  if (SADN_NUMBER.test(idOrNumber.toUpperCase())) {
    return db.order.findUnique({ where: { number: idOrNumber.toUpperCase() } });
  }
  return db.order.findUnique({ where: { id: idOrNumber } });
}

/** PATCH /api/admin/orders/[id] — checklist progress (CUID id or SADN-###### number).
 *
 * Body (round 15):
 *  • { stagesDone: string[] } — the checked stage ids (green checks).
 *  • { status: stageId }      — back-compat: progress the checklist up to and
 *    including that stage (legacy dashboards / quick actions).
 * status is derived: the furthest checked stage, else the first stage.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = guard(req);
  if (denied) return denied;
  const { id } = await params;

  const parsedBody = await readJson(req);
  if (!parsedBody.ok) return parsedBody.res;
  const raw = typeof parsedBody.data === 'object' && parsedBody.data !== null ? parsedBody.data : {};
  const body = raw as { status?: unknown; stagesDone?: unknown };

  const existing = await findOrder(id);
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
  }

  // Resolve the owner's current stage list once.
  const settings = await db.setting.findUnique({ where: { id: 'singleton' } });
  const stages = parseOrderStages(settings?.orderStages);

  let stagesDone: string[];
  if ('stagesDone' in body) {
    stagesDone = normalizeStagesDone(body.stagesDone, stages);
  } else if (typeof body.status === 'string') {
    const idx = stages.findIndex((s) => s.id === body.status);
    if (idx < 0) {
      return NextResponse.json(
        { ok: false, error: `Unknown stage. Valid stages: ${stages.map((s) => s.id).join(', ')}` },
        { status: 422 }
      );
    }
    stagesDone = stagesUpTo(stages, idx);
  } else {
    return NextResponse.json(
      { ok: false, error: 'Send stagesDone[] or status' },
      { status: 422 }
    );
  }

  try {
    const order = await db.order.update({
      where: { id: existing.id },
      data: {
        stagesDone: JSON.stringify(stagesDone),
        status: stagesDone.length > 0
          ? stagesDone[stagesDone.length - 1]
          : (stages[0]?.id ?? existing.status),
      },
    });
    return NextResponse.json({ ok: true, order: serializeOrder(order) });
  } catch (error) {
    console.error('PATCH /api/admin/orders/[id] failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not update the order' }, { status: 500 });
  }
}

/** DELETE /api/admin/orders/[id] — remove a test/junk order permanently. */
export async function DELETE(req: NextRequest, { params }: Params) {
  const denied = guard(req);
  if (denied) return denied;
  const { id } = await params;
  const existing = await findOrder(id);
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
  }
  try {
    await db.order.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/admin/orders/[id] failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not delete the order' }, { status: 500 });
  }
}
