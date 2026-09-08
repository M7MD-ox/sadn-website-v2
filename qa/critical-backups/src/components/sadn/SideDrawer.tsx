'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, Moon, Sun, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { navigate } from '@/lib/router';
import { hapticTap } from '@/lib/haptic';
import { useEscapeToClose, useMounted } from '@/lib/ui';
import { useSadnStore } from '@/lib/sadn-store';
import { useChrome } from './chrome-store';
import { catKey, useLang, useT } from '@/lib/i18n';

/**
 * Side drawer (round 24 — owner: "ضيف قسم منبثق جانبي يبقي الايقونه تحت في
 * شريط الاقسام"): opens from the Menu tab in the bottom nav and gathers the
 * quick controls in one place — language + dark-mode switches (alongside the
 * header pair, not replacing them) and a "Collections" list with one-tap
 * links to /shop?cat=<slug> for every dashboard-managed collection.
 *
 * Round 38 (owner): the panel now hugs the shell's PHYSICAL LEFT edge and
 * slides in from the left — always, RTL and LTR alike ("ناحية اليسار
 * علطول"). The theme row became two buttons (أبيض / غامق) so the brand
 * colour always marks the ACTIVE choice — language and theme alike.
 * The whole overlay is width-capped to the 430px column with the same
 * max() trick as the cookie banner, so it never spills outside the shell
 * on desktop. Square corners throughout — brand rule.
 */

const PANEL_SPRING = {
  type: 'spring',
  stiffness: 420,
  damping: 40,
  mass: 0.9,
} as const;

/** Quiet bilingual section label — no letter-spacing (it breaks Arabic). */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-wide text-sadn-ink-soft">
      {children}
    </p>
  );
}

export function SideDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const lang = useLang();
  const setLang = useSadnStore((s) => s.setLang);
  const categories = useChrome((s) => s.categories);

  // next-themes: same mounted guard as the header toggle (round 13)
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = mounted && resolvedTheme === 'dark';

  const reduced = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEscapeToClose(onClose);

  // Scroll lock must follow the `open` state — NOT the mount. The drawer
  // component itself is always mounted (BottomNav renders it on every
  // route), so an unconditional lock here froze scrolling on EVERY page,
  // desktop wheel and mobile touch alike (round 34 regression from 31:
  // body overflow:hidden propagated to the viewport → nothing scrolled).
  // Lock only while open; restore the exact previous value on close.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Every dashboard-managed collection gets a row; while the dashboard has
  // none configured yet, fall back to the two curated sections.
  const collections =
    categories.length > 0
      ? categories.map((c) => ({
          slug: c.slug,
          label:
            (lang === 'ar' ? c.labelAr || c.labelEn : c.labelEn || c.labelAr) ||
            t(catKey(c.slug)),
        }))
      : [
          { slug: 'daily', label: t('catDaily') },
          { slug: 'occasion', label: t('catOccasion') },
        ];

  const goCollection = (slug: string) => {
    hapticTap();
    onClose();
    navigate(`/shop?cat=${encodeURIComponent(slug)}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('navMenu')}
          className="fixed inset-y-0 left-[max(0px,calc(50%-215px))] right-[max(0px,calc(50%-215px))] z-[60]"
        >
          {/* Scrim — width-capped to the shell, tap to dismiss */}
          <motion.button
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={onClose}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute inset-0 w-full cursor-default bg-sadn-plum-950/40 backdrop-blur-[2px]"
          />

          {/* Panel — slides from the physical left, hairline inner edge */}
          <motion.div
            initial={reduced ? false : { x: '-108%' }}
            animate={{ x: 0 }}
            exit={reduced ? { opacity: 0 } : { x: '-108%' }}
            transition={reduced ? { duration: 0 } : PANEL_SPRING}
            className="absolute inset-y-0 left-0 flex w-[min(84%,320px)] flex-col border-r border-sadn-plum-100 bg-sadn-canvas shadow-2xl shadow-sadn-plum-950/20"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-sadn-plum-100 px-5 pb-4 pt-[calc(1.25rem+env(safe-area-inset-top,0px))]">
              <h2 className="font-sadn-display text-lg font-semibold text-sadn-ink">
                {t('navMenu')}
              </h2>
              <button
                ref={closeRef}
                type="button"
                aria-label={t('drawerClose')}
                onClick={onClose}
                className="press flex h-9 w-9 items-center justify-center rounded-[4px] border border-sadn-plum-200 text-sadn-ink transition-colors hover:border-sadn-plum-800 hover:bg-sadn-plum-50"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-5">
              {/* Language */}
              <section aria-label={t('drawerLang')}>
                <SectionLabel>{t('drawerLang')}</SectionLabel>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={lang === 'ar'}
                    onClick={() => {
                      hapticTap();
                      setLang('ar');
                    }}
                    className={`press h-11 border text-sm font-medium transition-colors ${
                      lang === 'ar'
                        ? 'border-sadn-plum-800 bg-sadn-plum-800 text-white'
                        : 'border-sadn-plum-200 text-sadn-ink hover:border-sadn-plum-800 hover:bg-sadn-plum-50'
                    }`}
                  >
                    العربية
                  </button>
                  <button
                    type="button"
                    aria-pressed={lang === 'en'}
                    onClick={() => {
                      hapticTap();
                      setLang('en');
                    }}
                    className={`press h-11 border text-sm font-medium transition-colors ${
                      lang === 'en'
                        ? 'border-sadn-plum-800 bg-sadn-plum-800 text-white'
                        : 'border-sadn-plum-200 text-sadn-ink hover:border-sadn-plum-800 hover:bg-sadn-plum-50'
                    }`}
                  >
                    English
                  </button>
                </div>
              </section>

              {/* Dark mode — round 38: two buttons, brand colour on the
                  active one, exactly like the language pair above. */}
              <section aria-label={t('drawerTheme')} className="mt-7">
                <SectionLabel>{t('drawerTheme')}</SectionLabel>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={!isDark}
                    onClick={() => {
                      hapticTap();
                      setTheme('light');
                    }}
                    className={`press flex h-11 items-center justify-center gap-2 border text-sm font-medium transition-colors ${
                      !isDark
                        ? 'border-sadn-plum-800 bg-sadn-plum-800 text-white'
                        : 'border-sadn-plum-200 text-sadn-ink hover:border-sadn-plum-800 hover:bg-sadn-plum-50'
                    }`}
                  >
                    <Sun className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                    {t('themeLight')}
                  </button>
                  <button
                    type="button"
                    aria-pressed={isDark}
                    onClick={() => {
                      hapticTap();
                      setTheme('dark');
                    }}
                    className={`press flex h-11 items-center justify-center gap-2 border text-sm font-medium transition-colors ${
                      isDark
                        ? 'border-sadn-plum-800 bg-sadn-plum-800 text-white'
                        : 'border-sadn-plum-200 text-sadn-ink hover:border-sadn-plum-800 hover:bg-sadn-plum-50'
                    }`}
                  >
                    <Moon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                    {t('themeDark')}
                  </button>
                </div>
              </section>

              {/* Collections */}
              <section aria-label={t('collectionTiles')} className="mt-7">
                <SectionLabel>{t('collectionTiles')}</SectionLabel>
                <div className="mt-2.5 flex flex-col gap-2">
                  {collections.map((c) => (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => goCollection(c.slug)}
                      className="press group flex h-11 items-center justify-between gap-3 border border-sadn-plum-100 bg-sadn-plum-50/40 px-3.5 text-sm font-medium text-sadn-ink transition-colors hover:border-sadn-plum-800 hover:bg-sadn-plum-50"
                    >
                      <span className="truncate">{c.label}</span>
                      <ChevronRight
                        aria-hidden
                        className="h-4 w-4 shrink-0 text-sadn-ink-soft transition-colors group-hover:text-sadn-plum-800 rtl:-scale-x-100"
                        strokeWidth={1.75}
                      />
                    </button>
                  ))}
                </div>
              </section>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
