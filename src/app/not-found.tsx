import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page not found — SADN | سدن',
  robots: { index: false, follow: true },
};

/**
 * Global 404 (round 16) — unknown URLs and deleted/deactivated products get
 * a REAL HTTP 404 status code with a branded way back (no soft 404s).
 */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-sadn-canvas px-8 text-center">
      <p className="font-sadn-display text-[64px] font-bold leading-none text-sadn-plum-100" aria-hidden>
        404
      </p>
      <h1 className="mt-2 font-sadn-display text-2xl text-sadn-ink">
        This page has drifted away
      </h1>
      <p className="mt-1 font-sadn-display text-lg text-sadn-plum-600" dir="rtl">
        الصفحة دي مش موجودة
      </p>
      <p className="mt-4 max-w-[34ch] text-sm leading-relaxed text-sadn-ink-soft">
        The piece you are looking for may have sold out or moved. The collection is one tap away.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="press flex h-11 items-center rounded-none bg-sadn-plum-800 px-6 text-sm font-medium text-white transition-colors hover:bg-sadn-plum-700"
        >
          Back to Home
        </Link>
        <Link
          href="/shop"
          className="flex h-11 items-center rounded-none border border-sadn-plum-200 px-6 text-sm font-medium text-sadn-ink transition-colors hover:bg-sadn-plum-50"
        >
          Shop the Collection
        </Link>
      </div>
      <p className="mt-10 text-[10px] uppercase tracking-luxe text-sadn-plum-400">
        SADN — Cut loose, worn close
      </p>
    </main>
  );
}
