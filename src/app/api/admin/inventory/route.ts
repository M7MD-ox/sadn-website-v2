import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureBootstrap } from '@/lib/bootstrap';
import { guard, readJson, serverError, str } from '@/lib/api-helpers';

/**
 * Inventory (round 16) — owner request: "ضيف المخزن … ومع كل اوردر بيطلع
 * بينقص من المخزن".
 *
 * GET  /api/admin/inventory
 *   → { movements: last 100 ledger rows (newest first),
 *       summary: one row per product × visible color with live units.
 *       Product.stock stays the authoritative column; when the ledger has
 *       history for a product the units are split across its colors using
 *       the signed movement sums (a sold-out variant shows 0). }
 *
 * POST /api/admin/inventory
 *   { productSlug, color?, qty, reason?: "factory" | "manual", note? }
 *   • factory intake → qty must be > 0, adds stock and logs a + movement.
 *   • manual adjust  → qty may be signed; a negative value drains stock
 *     (floored at 0) and logs the movement, positives add.
 */

const REASONS = ['factory', 'manual'] as const;
type InputReason = (typeof REASONS)[number];

/** GET — ledger tail + per-variant balance. */
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  try {
    await ensureBootstrap();

    const [movements, products] = await Promise.all([
      db.stockMovement.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      db.product.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
    ]);

    type SummaryRow = {
      productSlug: string;
      productName: string;
      nameAr: string;
      color: string;
      colorHex: string;
      units: number;
      productStock: number;
    };

    const rows: SummaryRow[] = [];
    for (const p of products) {
      let colors: Array<{ name: string; hex: string; hidden?: boolean }> = [];
      try {
        const parsed = JSON.parse(p.colors) as Array<Record<string, unknown>>;
        if (Array.isArray(parsed)) {
          colors = parsed
            .filter((c) => typeof c === 'object' && c !== null && typeof c.name === 'string')
            .map((c) => ({ name: String(c.name), hex: String(c.hex ?? ''), hidden: Boolean(c.hidden) }))
            .filter((c) => !c.hidden);
        }
      } catch {
        colors = [];
      }
      if (colors.length === 0) {
        // No colors — the whole product's stock is one bucket.
        rows.push({
          productSlug: p.slug,
          productName: p.name,
          nameAr: p.nameAr,
          color: '',
          colorHex: '',
          units: p.stock,
          productStock: p.stock,
        });
        continue;
      }
      // Split the product's stock across its visible colors using the signed
      // ledger sums; variants without movement history share whatever the
      // column says remains.
      const ledgerSum = new Map<string, number>();
      for (const m of movements) {
        if (m.productSlug !== p.slug) continue;
        ledgerSum.set(m.color, (ledgerSum.get(m.color) ?? 0) + m.qty);
      }
      const withHistory = colors.filter((c) => ledgerSum.has(c.name));
      if (withHistory.length === 0) {
        for (const c of colors) {
          rows.push({
            productSlug: p.slug,
            productName: p.name,
            nameAr: p.nameAr,
            color: c.name,
            colorHex: c.hex,
            units: p.stock,
            productStock: p.stock,
          });
        }
        continue;
      }
      let distributed = 0;
      for (const c of withHistory) {
        const units = Math.max(0, ledgerSum.get(c.name) ?? 0);
        distributed += units;
        rows.push({
          productSlug: p.slug,
          productName: p.name,
          nameAr: p.nameAr,
          color: c.name,
          colorHex: c.hex,
          units,
          productStock: p.stock,
        });
      }
      const rest = Math.max(0, p.stock - distributed);
      for (const c of colors.filter((x) => !ledgerSum.has(x.name))) {
        rows.push({
          productSlug: p.slug,
          productName: p.name,
          nameAr: p.nameAr,
          color: c.name,
          colorHex: c.hex,
          units: rest,
          productStock: p.stock,
        });
      }
    }

    return NextResponse.json({ ok: true, movements, summary: rows });
  } catch (error) {
    console.error('GET /api/admin/inventory failed:', error);
    return serverError();
  }
}

/** POST — factory intake or a signed manual adjustment. */
export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  await ensureBootstrap();

  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.res;
  const body = (typeof parsed.data === 'object' && parsed.data !== null ? parsed.data : {}) as Record<string, unknown>;

  const errors: Record<string, string> = {};
  const productSlug = str(body.productSlug);
  const color = str(body.color);
  const reasonRaw = str(body.reason) as InputReason;
  const reason: InputReason = REASONS.includes(reasonRaw) ? reasonRaw : 'factory';
  const note = str(body.note).slice(0, 300);
  const qtyRaw = Math.round(Number(body.qty));

  if (!productSlug) errors.productSlug = 'Pick a product';
  if (!Number.isFinite(qtyRaw) || qtyRaw === 0) {
    errors.qty = 'Enter a quantity (factory adds units, manual may subtract)';
  } else if (reason === 'factory' && qtyRaw <= 0) {
    errors.qty = 'Factory intake must be a positive quantity';
  }

  const product = errors.productSlug
    ? null
    : await db.product.findUnique({ where: { slug: productSlug } });
  if (!errors.productSlug && !product) errors.productSlug = 'Unknown product';
  if (!errors.productSlug && product && color) {
    let names: string[] = [];
    try {
      const parsedColors = JSON.parse(product.colors) as Array<{ name?: unknown }>;
      if (Array.isArray(parsedColors)) names = parsedColors.map((c) => String(c?.name ?? ''));
    } catch {
      names = [];
    }
    if (names.length > 0 && !names.includes(color)) errors.color = 'Unknown color for this product';
  }

  if (Object.keys(errors).length > 0 || !product) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Validation failed',
        errors: Object.keys(errors).length ? errors : { productSlug: 'Unknown product' },
      },
      { status: 422 }
    );
  }

  try {
    // Signed delta: factory is always positive; manual keeps its sign.
    const delta = reason === 'factory' ? Math.abs(qtyRaw) : qtyRaw;

    // Round 19: the stock re-read happens INSIDE the transaction so two
    // concurrent movements can't both compute "next" from the same stale
    // read (the outer `product` is only used for validation).
    const { movement, nextStock } = await db.$transaction(async (tx) => {
      const fresh = await tx.product.findUnique({
        where: { slug: product.slug },
        select: { stock: true },
      });
      const next = Math.max(0, (fresh?.stock ?? product.stock) + delta);
      const created = await tx.stockMovement.create({
        data: {
          productSlug: product.slug,
          productName: product.name,
          color,
          qty: delta,
          reason,
          orderNumber: '',
          note,
        },
      });
      await tx.product.update({ where: { slug: product.slug }, data: { stock: next } });
      return { movement: created, nextStock: next };
    });

    return NextResponse.json({ ok: true, movement, stock: nextStock }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/inventory failed:', error);
    return serverError();
  }
}
