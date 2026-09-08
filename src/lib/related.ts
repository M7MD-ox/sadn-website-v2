import type { ProductDTO } from '@/lib/sadn-store';

/**
 * "Complete the look" — same category first, then featured/new fillers.
 * Plain shared module (no 'use client') so server pages can call it too.
 */
export function relatedFor(p: ProductDTO, all: ProductDTO[]): ProductDTO[] {
  const sameCat = all.filter((x) => x.slug !== p.slug && x.category === p.category);
  const fillers = all.filter(
    (x) => x.slug !== p.slug && x.category !== p.category && (x.featured || x.isNew)
  );
  const rest = all.filter(
    (x) => x.slug !== p.slug && !sameCat.includes(x) && !fillers.includes(x)
  );
  return [...sameCat, ...fillers, ...rest].slice(0, 4);
}
