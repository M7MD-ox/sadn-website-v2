/**
 * Page-matched skeletons (round 16) — every page's loading skeleton mirrors
 * its own final layout (owner: "اهتم ب السكيليتون بتاع كل الصفحات تبقي نفس
 * شكل الصفحه"). Square edges, same brand palette, same spacing rhythm.
 * Pure presentational server components — no hooks, usable in loading.tsx.
 *
 * 16-b: quieter premium shimmer — the sweep band was softened in CSS
 * (.shimmer::after override in globals.css, round 16-b layer); the base
 * stays on bg-sadn-plum-50 and inherits the dark-mode palette via vars.
 * Layouts below were re-mirrored after the 16-b negative-space pass.
 */

function Shimmer({ className }: { className?: string }) {
  return <div aria-hidden className={`shimmer bg-sadn-plum-50 ${className ?? ''}`} />;
}

/** Home — brand block, hero frame, CTAs, marquee, then the 2-col grid. */
export function HomeSkeleton() {
  return (
    <div className="px-5 pt-10" aria-busy="true" data-skeleton="home">
      <Shimmer className="h-11 w-40" />
      <Shimmer className="mt-4 h-3 w-full max-w-[280px]" />
      <Shimmer className="mt-8 h-[38dvh] max-h-[340px] min-h-[220px] w-full" />
      <div className="mt-7 flex gap-3">
        <Shimmer className="h-12 flex-1" />
        <Shimmer className="h-12 w-24" />
      </div>
      <Shimmer className="mt-12 h-10 w-full" />
      <Shimmer className="mt-14 h-8 w-40" />
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

/** Shop — title block + the same 2-col grid. */
export function ShopSkeleton() {
  return (
    <div className="px-5 pt-8" aria-busy="true" data-skeleton="shop">
      <Shimmer className="h-2.5 w-20" />
      <Shimmer className="mt-2 h-9 w-32" />
      <Shimmer className="mt-2 h-3 w-16" />
      <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Bag — title, hairline-separated lines, hairline summary + CTA. */
export function BagSkeleton() {
  return (
    <div className="px-5 pt-8" aria-busy="true" data-skeleton="bag">
      <Shimmer className="h-2.5 w-20" />
      <Shimmer className="mt-2 h-9 w-32" />
      {[1, 2].map((i) => (
        <div key={i} className="flex gap-4 border-b border-sadn-plum-50 py-5">
          <Shimmer className="h-24 w-[72px]" />
          <div className="flex-1 pt-1">
            <Shimmer className="h-3.5 w-36" />
            <Shimmer className="mt-2 h-3 w-24" />
            <Shimmer className="mt-4 h-8 w-24" />
          </div>
          <Shimmer className="h-4 w-14" />
        </div>
      ))}
      <div className="mt-7 border-t border-sadn-plum-100 pt-6">
        <Shimmer className="h-3 w-full max-w-[180px]" />
        <Shimmer className="mt-3 h-3 w-full max-w-[140px]" />
        <Shimmer className="mt-6 h-3.5 w-full max-w-[120px]" />
        <Shimmer className="mt-6 h-13 w-full" />
      </div>
    </div>
  );
}

/** Shared product-card skeleton tile — mirrors ProductCard's quiet stack. */
function CardSkeleton() {
  return (
    <div>
      <Shimmer className="aspect-[3/4] w-full" />
      <Shimmer className="mt-2.5 h-2 w-14" />
      <Shimmer className="mt-2 h-3.5 w-24" />
      <Shimmer className="mt-2 h-3.5 w-16" />
    </div>
  );
}
