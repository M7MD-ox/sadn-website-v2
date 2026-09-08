'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useLang, useT } from '@/lib/i18n';

const DISMISS_KEY = 'sadn-banner-dismissed';

/**
 * Announcement banner ABOVE the header (round 11) — offers strip with
 * owner-controlled text + visibility from the dashboard. An X hides it for
 * the browser session; the dashboard toggle controls it for everyone.
 * Round 40 (SEO): the CTA is a real <Link href="/shop"> — crawlable,
 * middle-clickable, prefetched by the App Router.
 */
export function AnnouncementBanner({
  textEn,
  textAr,
}: {
  textEn: string;
  textAr: string;
}) {
  const t = useT();
  const lang = useLang();
  const [dismissed, setDismissed] = useState(true);

  // Read the session flag after mount (SSR-safe; deferred to a macrotask so
  // no setState runs synchronously inside the effect body).
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
      } catch {
        setDismissed(false);
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  if (dismissed) return null;

  const text = lang === 'ar' ? textAr : textEn;
  if (!text) return null;

  return (
    <div
      role="region"
      aria-label={t('ariaBannerLabel')}
      className="relative bg-sadn-plum-800 text-white"
    >
      {/* Round 38 (owner): the offers strip slimmed down. */}
      <div className="flex items-center justify-center gap-2 px-9 py-1">
        <Link
          href="/shop"
          className="group flex min-w-0 flex-1 items-center justify-center gap-1.5 py-0.5 text-center"
        >
          <Sparkles
            className="h-3 w-3 shrink-0 text-white/80 transition-transform duration-300 group-hover:scale-110"
            strokeWidth={1.75}
            aria-hidden
          />
          <span className="truncate text-[10px] font-medium tracking-wide">
            {text}
          </span>
        </Link>
        <button
          type="button"
          aria-label={t('ariaBannerDismiss')}
          onClick={() => {
            try {
              sessionStorage.setItem(DISMISS_KEY, '1');
            } catch {
              /* private mode — banner returns next render, harmless */
            }
            setDismissed(true);
          }}
          className="tap-target absolute end-1.5 flex h-8 w-8 items-center justify-center rounded-none text-white/70 transition-colors hover:bg-white/10 hover:text-white active:scale-90"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
