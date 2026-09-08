'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useT } from '@/lib/i18n';
import { hapticTap } from '@/lib/haptic';
import { triggerFbPixelConsent } from '@/lib/fb-pixel';

/**
 * Cookie consent banner (20-a, owner brief) → the Meta Pixel gate.
 *
 * UX: a quiet sheet of paper — white canvas, hairline plum border, 2px
 * micro-radius, one soft plum shadow — floating above the bottom nav so it
 * never blocks browsing (mobile especially). It rises once, ~1s after the
 * page lands, answers with one tap, then is gone for good.
 *
 * Logic:
 *  - The decision lives in localStorage ("sadn-cookie-consent" → accepted |
 *    declined) and is never asked again after either button.
 *  - "موافقة" calls triggerFbPixelConsent() (lib/fb-pixel.ts) — the ready
 *    hook for Facebook Pixel activation; "رفض" loads nothing, ever.
 *  - Every page is its own server route, so StoreChrome (and this banner)
 *    remount on navigation: a module-scoped flag keeps the banner open and
 *    replay-free across remounts while the shopper is still deciding.
 */

const STORAGE_KEY = 'sadn-cookie-consent';
/** Entrance delay — let the page land before the banner glides in. */
const ENTRANCE_DELAY_MS = 1100;
/** Module scope: survives client-side remounts within this browser session. */
let revealedThisSession = false;

export function CookieConsent() {
  const t = useT();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  /** True only for the very first reveal — later remounts skip the rise. */
  const [firstReveal, setFirstReveal] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return; // Storage unavailable (private mode) — never nag.
    }
    if (saved === 'accepted') {
      triggerFbPixelConsent(); // Returning visitor — activate silently.
      return;
    }
    if (saved) return; // 'declined' — respect it, stay hidden.

    // Remount mid-decision → hold the banner up immediately (delay 0, no
    // entrance replay); first visit → let the page land, then glide in.
    const delay = revealedThisSession ? 0 : ENTRANCE_DELAY_MS;
    const id = window.setTimeout(() => {
      if (!revealedThisSession) {
        revealedThisSession = true;
        setFirstReveal(true);
      }
      setOpen(true);
    }, delay);
    return () => window.clearTimeout(id);
  }, []);

  const decide = (value: 'accepted' | 'declined') => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* no storage — the choice simply lives for this session */
    }
    hapticTap();
    if (value === 'accepted') triggerFbPixelConsent();
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.section
          role="dialog"
          aria-modal="false"
          aria-label={t('cookieAria')}
          data-cookie-banner
          initial={firstReveal && !reduced ? { y: 28, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { y: 24, opacity: 0 }}
          transition={
            reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 30 }
          }
          className="fixed inset-x-[max(12px,calc(50%-203px))] bottom-[calc(env(safe-area-inset-bottom,0px)+74px)] z-[45] rounded-[2px] border border-sadn-plum-100 bg-sadn-canvas p-4 shadow-[0_18px_44px_-24px_rgba(75,50,73,0.5)]"
        >
          <p className="text-[13px] leading-relaxed text-sadn-ink-soft">
            {t('cookieNotice')}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => decide('accepted')}
              className="h-11 flex-1 rounded-[2px] bg-sadn-plum-800 text-[13px] font-medium text-white transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98]"
            >
              {t('cookieAccept')}
            </button>
            <button
              type="button"
              onClick={() => decide('declined')}
              className="h-11 rounded-[2px] border border-sadn-plum-200 px-5 text-[13px] font-medium text-sadn-plum-800 transition-colors duration-150 hover:bg-sadn-plum-100/70"
            >
              {t('cookieDecline')}
            </button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
