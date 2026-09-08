'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { House, Menu, ShoppingBag, Store, type LucideIcon } from 'lucide-react';
import { useRoute, navigate, parseRoute } from '@/lib/router';
import { hapticTap } from '@/lib/haptic';
import { useT, type TKey } from '@/lib/i18n';
import { SideDrawer } from '@/components/sadn/SideDrawer';

/* The wishlist tab was removed entirely (owner request). Round 16: tabs are
   real URLs ("/", "/shop", "/bag"), the cart is now "the Bag" (الشنطة),
   and the whole bar was rebuilt on
   framer-motion — a shared-layout square indicator glides behind the active
   item on a spring, taps compress with a springy scale (skipped for
   prefers-reduced-motion users), and the bag badge pops through
   AnimatePresence. Edges stay square — no rounded-* anywhere.
   Round 16-f: the Search tab is gone too (owner request) — Home/Shop/Bag.
   Round 24 (owner): a fourth Menu tab opens the side drawer (SideDrawer) —
   it is an action, not a route, so the shared indicator rests behind it
   only while the drawer is open. */
const NAV: { key: string; path: string | null; labelKey: TKey; Icon: LucideIcon }[] = [
  { key: 'home', path: '/', labelKey: 'navHome', Icon: House },
  { key: 'shop', path: '/shop', labelKey: 'navShop', Icon: Store },
  { key: 'bag', path: '/bag', labelKey: 'navBag', Icon: ShoppingBag },
  { key: 'menu', path: null, labelKey: 'navMenu', Icon: Menu },
];

/** Shared spring — one feel across the indicator, taps and badge. */
const SPRING = { type: 'spring', stiffness: 520, damping: 38, mass: 0.9 } as const;

/**
 * Round 38 (owner): "الشريط بيختفي ويظهر — عايزاه ثابت في جميع الصفحات".
 * Every route renders its own StoreChrome, so the bar remounts on each
 * navigation and used to replay the slide-up entrance forever. The
 * entrance now plays ONCE per browser session (module flag); every later
 * mount renders the bar already in place — it never blinks again.
 */
let navHasAnimated = false;

export function BottomNav({ count }: { count: number }) {
  const t = useT();
  const route = useRoute();
  const { path } = parseRoute(route);
  const reduced = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
    <motion.nav
      aria-label="Primary"
      className="app-nav-shell fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[430px] pb-safe"
      initial={reduced || navHasAnimated ? false : { y: 56, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={reduced ? { duration: 0 } : { ...SPRING, delay: navHasAnimated ? 0 : 0.15 }}
      onAnimationComplete={() => {
        navHasAnimated = true;
      }}
    >
      {/* Hairline top edge: quiet center-emphasis over the shell border */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-sadn-plum-200/60 to-transparent"
      />
      <div className="grid grid-cols-4">
        {NAV.map(({ key, path: navPath, labelKey, Icon }) => {
          const isActive =
            path === navPath || (key === 'home' && path.startsWith('/product/'));
          const menuActive = key === 'menu' && menuOpen;
          const badge = key === 'bag' ? count : 0;
          return (
            <motion.button
              key={key}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              aria-expanded={key === 'menu' ? menuOpen : undefined}
              aria-haspopup={key === 'menu' ? 'dialog' : undefined}
              onClick={() =>
                navPath
                  ? navigate(navPath)
                  : (() => {
                      hapticTap();
                      setMenuOpen(true);
                    })()
              }
              whileTap={reduced ? undefined : { scale: 0.88 }}
              transition={reduced ? { duration: 0 } : SPRING}
              className="app-nav-item tap-target relative flex flex-col items-center justify-center gap-1 pt-2.5 pb-2"
            >
              {/* Shared-layout square indicator — glides behind the active
                  item (and rests behind Menu while the drawer is open) */}
              {(isActive || menuActive) && (
                <motion.span
                  layoutId="sadn-nav-active"
                  aria-hidden
                  className="absolute inset-x-4 inset-y-1.5 bg-sadn-plum-100/70"
                  transition={reduced ? { duration: 0 } : SPRING}
                />
              )}

              <span className="relative z-10 flex flex-col items-center gap-1">
                <motion.span
                  className="relative"
                  animate={{ y: isActive ? -1 : 0 }}
                  transition={reduced ? { duration: 0 } : SPRING}
                >
                  <Icon
                    className={`h-[22px] w-[22px] transition-colors ${
                      isActive ? 'text-sadn-plum-800' : 'text-sadn-ink-soft'
                    }`}
                    strokeWidth={isActive ? 2 : 1.6}
                  />
                  <AnimatePresence>
                    {badge > 0 && (
                      <motion.span
                        key={badge}
                        data-badge="cart"
                        data-cart-badge
                        initial={reduced ? false : { scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={reduced ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
                        transition={reduced ? { duration: 0 } : SPRING}
                        className="absolute -end-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-none bg-sadn-plum-800 px-1 text-[9px] font-semibold text-white"
                      >
                        {badge}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.span>
                <span
                  className={`text-[10px] font-medium tracking-wide transition-colors ${
                    isActive ? 'text-sadn-plum-800' : 'text-sadn-ink-soft'
                  }`}
                >
                  {t(labelKey)}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.nav>

    {/* Side drawer — language, dark mode, collection quick links (24-a) */}
    <SideDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
