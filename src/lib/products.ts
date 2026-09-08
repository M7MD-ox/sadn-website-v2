import type { Product } from '@prisma/client';

export type ProductColor = { name: string; hex: string; hidden?: boolean };

export type SerializedProduct = Omit<
  Product,
  'images' | 'colors' | 'sizes' | 'hiddenSizes'
> & {
  images: string[];
  colors: ProductColor[];
  sizes: string[];
  hiddenSizes: string[];
};

/**
 * SADN catalog serializer — SQLite stores array-ish fields as JSON strings,
 * so we decode them once at the API boundary and hand the client typed data.
 */
export function serializeProduct(row: Product): SerializedProduct {
  const parse = <T,>(raw: string, fallback: T): T => {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };

  return {
    ...row,
    images: parse<string[]>(row.images, []),
    colors: parse<ProductColor[]>(row.colors, []),
    sizes: parse<string[]>(row.sizes, []),
    hiddenSizes: parse<string[]>(row.hiddenSizes, []),
  };
}
