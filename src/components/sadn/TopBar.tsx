'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Moon, Sun, Globe } from 'lucide-react';
import { useLang, useT } from '@/lib/i18n';
import { useSadnStore, cartCount } from '@/lib/sadn-store';
import { useTheme } from 'next-themes';
import { useMounted } from '@/lib/ui';

export function TopBar() {
  const t = useT();
  const lang = useLang();
  const setLang = useSadnStore((s) => s.setLang);
  const cart = useSadnStore((s) => s.cart);
  const mounted = useMounted();
  const count = mounted ? cartCount(cart) : 0;
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = mounted && resolvedTheme === 'dark';

  const toggleLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    setLang(next);
  };

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const navLinks = [
    { href: '/', label: t('navHome') },
    { href: '/shop', label: t('navShop') },
    { href: '/#story', label: lang === 'ar' ? 'عن سدن' : 'Our Story' },
    { href: '/policies', label: lang === 'ar' ? 'السياسات' : 'Policies' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-sadn-canvas/85 backdrop-blur-xl transition-colors">
      {/* Mobile Bar: h-12 with centered brand wordmark */}
      <div className="flex h-12 items-center justify-between px-5 lg:hidden">
        <div className="w-8" />
        <Link
          href="/"
          className="flex select-none items-baseline gap-2"
          aria-label="SADN home"
        >
          <span className="font-sadn-display text-lg font-bold tracking-luxe-tight text-sadn-ink">
            SADN
          </span>
          <span className="text-xs text-sadn-plum-800 dark:text-white">سدن</span>
        </Link>
        <Link
          href="/bag"
          aria-label={t('navBag')}
          className="relative flex h-8 w-8 items-center justify-center text-sadn-ink-soft hover:text-sadn-plum-800"
        >
          <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
          {count > 0 && (
            <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sadn-plum-800 px-1 text-[10px] font-medium text-white">
              {count}
            </span>
          )}
        </Link>
      </div>

      {/* Desktop Navbar: h-20 with luxury atelier layout */}
      <div className="hidden h-20 w-full items-center justify-between px-8 lg:flex">
        {/* Navigation Links (Start) */}
        <nav className="flex items-center gap-8" aria-label="Desktop Primary">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative py-1 text-sm font-medium tracking-wide transition-colors ${
                  active
                    ? 'text-sadn-plum-800 font-semibold dark:text-white'
                    : 'text-sadn-ink-soft hover:text-sadn-plum-800 dark:hover:text-white'
                }`}
              >
                {link.label}
                {active && (
                  <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-sadn-plum-800 dark:bg-white" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Brand Wordmark (Center) */}
        <Link
          href="/"
          className="flex select-none items-baseline gap-2.5 transition-opacity hover:opacity-90"
          aria-label="SADN home"
        >
          <span className="font-sadn-display text-2xl font-bold tracking-luxe text-sadn-ink">
            SADN
          </span>
          <span className="text-sm font-medium text-sadn-plum-800 dark:text-white">
            سدن
          </span>
        </Link>

        {/* Utilities: Language, Theme, Bag (End) */}
        <div className="flex items-center gap-5">
          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLang}
            className="flex items-center gap-1.5 text-xs font-medium text-sadn-ink-soft transition-colors hover:text-sadn-plum-800 dark:hover:text-white"
            title={lang === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
          >
            <Globe className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-none text-sadn-ink-soft transition-colors hover:text-sadn-plum-800 dark:hover:text-white"
            aria-label={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? (
              <Sun className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Moon className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>

          {/* Bag with Badge */}
          <Link
            href="/bag"
            aria-label={t('navBag')}
            className="relative flex items-center gap-2 rounded-none border border-sadn-plum-100 bg-sadn-canvas px-3.5 py-2 text-xs font-medium text-sadn-ink transition-all hover:border-sadn-plum-800 hover:text-sadn-plum-800 dark:border-sadn-plum-900"
          >
            <ShoppingBag className="h-4 w-4 text-sadn-plum-800 dark:text-white" strokeWidth={1.75} />
            <span>{lang === 'ar' ? 'الشنطة' : 'Bag'}</span>
            {count > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-sadn-plum-800 px-1 text-[10px] font-semibold text-white">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Gradient hairline divider */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-sadn-plum-100 to-transparent dark:via-sadn-plum-900/40"
      />
    </header>
  );
}
