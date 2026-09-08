import { str } from '@/lib/api-helpers';
import type { ProductColor } from '@/lib/products';

/**
 * Shared admin product input parsing (round 10) — used by POST
 * /api/admin/products and PATCH /api/admin/products/[id].
 *
 * Arrays arrive as real JSON arrays from the dashboard and are stringified
 * for the SQLite JSON columns; validation errors are returned as a map.
 */

type ProductInput = {
  slug?: string;
  name?: string;
  nameAr?: string;
  tagline?: string | null;
  description?: string;
  category?: string;
  price?: number;
  compareAtPrice?: number | null;
  images?: string[];
  colors?: ProductColor[];
  sizes?: string[];
  /** Size labels hidden from the product page (round 16 eye toggles). */
  hiddenSizes?: string[];
  /** Drag & drop position (round 16 SortableList). */
  sortOrder?: number;
  featured?: boolean;
  isNew?: boolean;
  stock?: number;
  active?: boolean;
};

export type ParsedProduct =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; errors: Record<string, string> };

export function parseProductInput(
  body: unknown,
  opts: { partial: boolean }
): ParsedProduct {
  const errors: Record<string, string> = {};
  if (typeof body !== 'object' || body === null) {
    return { ok: false, errors: { body: 'Invalid request body' } };
  }
  const b = body as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  // ── slug (required on create, validated whenever present) ──
  if (b.slug !== undefined || !opts.partial) {
    const slug = str(b.slug)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (slug.length < 2) errors.slug = 'Slug must be at least 2 characters (a-z, 0-9)';
    else data.slug = slug;
  }

  // ── names ──
  if (b.name !== undefined || !opts.partial) {
    const name = str(b.name);
    if (name.length < 2) errors.name = 'English name is required';
    else data.name = name;
  }
  if (b.nameAr !== undefined || !opts.partial) {
    const nameAr = str(b.nameAr);
    if (nameAr.length < 2) errors.nameAr = 'الاسم العربي مطلوب';
    else data.nameAr = nameAr;
  }

  // ── description / tagline ──
  if (b.description !== undefined || !opts.partial) {
    const description = str(b.description);
    if (description.length < 10) errors.description = 'Description must be at least 10 characters';
    else data.description = description;
  }
  if (b.tagline !== undefined) {
    const tagline = str(b.tagline);
    data.tagline = tagline === '' ? null : tagline;
  }

  // ── price ──
  if (b.price !== undefined || !opts.partial) {
    const price = Number(b.price);
    if (!Number.isFinite(price) || price <= 0) errors.price = 'Price must be a positive number';
    else data.price = Math.round(price * 100) / 100;
  }
  if (b.compareAtPrice !== undefined) {
    const compareAtPrice = b.compareAtPrice === null || b.compareAtPrice === '' ? null : Number(b.compareAtPrice);
    if (compareAtPrice === null) data.compareAtPrice = null;
    else if (!Number.isFinite(compareAtPrice) || compareAtPrice <= 0)
      errors.compareAtPrice = 'Compare-at price must be a positive number or empty';
    else data.compareAtPrice = Math.round(compareAtPrice * 100) / 100;
  }

  // ── category ──
  if (b.category !== undefined || !opts.partial) {
    const category = str(b.category);
    if (!category) errors.category = 'Category is required';
    else data.category = category;
  }

  // ── images (JSON string column) ──
  if (b.images !== undefined || !opts.partial) {
    const images = Array.isArray(b.images)
      ? b.images.map((x) => str(x)).filter((x) => x.length > 0)
      : [];
    if (images.length === 0) errors.images = 'At least one image is required';
    else if (images.some((x) => !/^(https?:\/\/|\/)/.test(x)))
      errors.images = 'Images must be URLs or /paths';
    else data.images = JSON.stringify(images);
  }

  // ── colors (round 16: per-color `hidden` eye toggle survives the round-trip) ──
  if (b.colors !== undefined || !opts.partial) {
    const rawColors = Array.isArray(b.colors) ? b.colors : [];
    const colors: ProductColor[] = [];
    for (const c of rawColors) {
      if (typeof c !== 'object' || c === null) continue;
      const o = c as Record<string, unknown>;
      const name = str(o.name);
      const hex = str(o.hex).toLowerCase();
      if (!name || !/^#[0-9a-f]{3,8}$/.test(hex)) {
        errors.colors = 'Colors need a name and a #hex value';
        break;
      }
      colors.push(o.hidden === undefined ? { name, hex } : { name, hex, hidden: Boolean(o.hidden) });
    }
    if (!errors.colors) data.colors = JSON.stringify(colors);
  }

  // ── sizes ──
  if (b.sizes !== undefined || !opts.partial) {
    const sizes = Array.isArray(b.sizes)
      ? b.sizes.map((x) => str(x)).filter((x) => x.length > 0)
      : [];
    if (sizes.length === 0) errors.sizes = 'At least one size is required';
    else data.sizes = JSON.stringify(sizes);
  }

  // ── hiddenSizes (round 16) — size labels hidden from the product page ──
  if (b.hiddenSizes !== undefined) {
    const hiddenSizes = Array.isArray(b.hiddenSizes)
      ? b.hiddenSizes.map((x) => str(x)).filter((x) => x.length > 0)
      : [];
    data.hiddenSizes = JSON.stringify(hiddenSizes);
  }

  // ── sortOrder (round 16) — position from the drag & drop list ──
  if (b.sortOrder !== undefined) {
    const sortOrder = Math.round(Number(b.sortOrder));
    if (!Number.isFinite(sortOrder) || sortOrder < 0) errors.sortOrder = 'Order must be 0 or more';
    else data.sortOrder = sortOrder;
  }

  // ── flags ──
  if (b.featured !== undefined) data.featured = Boolean(b.featured);
  if (b.isNew !== undefined) data.isNew = Boolean(b.isNew);
  if (b.active !== undefined) data.active = Boolean(b.active);

  // ── stock ──
  if (b.stock !== undefined) {
    const stock = Math.round(Number(b.stock));
    if (!Number.isFinite(stock) || stock < 0) errors.stock = 'Stock must be 0 or more';
    else data.stock = stock;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data };
}
