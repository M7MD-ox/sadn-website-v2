'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Boxes,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Package,
  Settings as SettingsIcon,
  ShoppingBag,
  Star,
  Store,
  Tags,
} from 'lucide-react';
import { Toaster } from 'sonner';
import { useSadnStore } from '@/lib/sadn-store';
import { ADMIN_T, type AdminKey, type AdminLang } from './admin-i18n';
import { AdminOverviewTab } from './AdminOverviewTab';
import { AdminProductsTab } from './AdminProductsTab';
import { AdminInventoryTab } from './AdminInventoryTab';
import { AdminCategoriesTab } from './AdminCategoriesTab';
import { AdminOrdersTab } from './AdminOrdersTab';
import { AdminReviewsTab } from './AdminReviewsTab';
import { AdminSettingsTab } from './AdminSettingsTab';

/**
 * SADN owner dashboard — mounted at the real /admin route (round 16 moved
 * the app off the old hash URL; the route is shareable and bookmarkable).
 */

type Tab =
  | 'overview'
  | 'products'
  | 'inventory'
  | 'categories'
  | 'orders'
  | 'reviews'
  | 'settings';

const TABS: Array<{ id: Tab; labelKey: AdminKey; icon: typeof LayoutDashboard }> = [
  { id: 'overview', labelKey: 'overview', icon: LayoutDashboard },
  { id: 'products', labelKey: 'products', icon: Package },
  { id: 'inventory', labelKey: 'inventory', icon: Boxes },
  { id: 'categories', labelKey: 'categories', icon: Tags },
  { id: 'orders', labelKey: 'orders', icon: ShoppingBag },
  { id: 'reviews', labelKey: 'reviewsTab', icon: Star },
  { id: 'settings', labelKey: 'settings', icon: SettingsIcon },
];

/** Header/login language toggle — one recipe, two mounts (R12). */
function LangToggle({ lang, onClick }: { lang: AdminLang; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-9 w-9 rounded-none text-xs font-semibold text-sadn-plum-700 transition-colors hover:bg-sadn-plum-50"
      aria-label="Toggle language"
    >
      {lang === 'ar' ? 'EN' : 'ع'}
    </button>
  );
}

export function AdminApp() {
  const lang = useSadnStore((s) => s.lang);
  const setLang = useSadnStore((s) => s.setLang);
  const t = useCallback((k: AdminKey) => ADMIN_T[k][lang as AdminLang], [lang]);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const [phase, setPhase] = useState<'checking' | 'login' | 'ready'>('checking');
  const [tab, setTab] = useState<Tab>('overview');

  /* Mirror the document direction while the dashboard is open. */
  useEffect(() => {
    document.documentElement.dir = dir;
    return () => {
      document.documentElement.dir = 'ltr';
    };
  }, [dir]);

  useEffect(() => {
    fetch('/api/admin/session')
      .then((r) => r.json())
      .then((d: { authed?: boolean }) => setPhase(d.authed ? 'ready' : 'login'))
      .catch(() => setPhase('login'));
  }, []);

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    setPhase('login');
  };

  /* Every mutation dispatches this so an open storefront view reloads. */
  const notifyCatalogChanged = useCallback(() => {
    window.dispatchEvent(new Event('sadn:catalog-changed'));
  }, []);

  if (phase === 'checking') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-sadn-stone">
        <Loader2 className="h-6 w-6 animate-spin text-sadn-plum-400" />
      </div>
    );
  }

  if (phase === 'login') {
    return <AdminLogin lang={lang} onLang={setLang} onSuccess={() => setPhase('ready')} />;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-sadn-stone" dir={dir}>
      {/* ── Top bar ── */}
      <header className="hairline-b sticky top-0 z-40 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-sadn-plum-800 font-sadn-display text-sm font-semibold text-white">
              S
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate font-sadn-display text-[15px] text-sadn-ink">{t('brand')}</p>
              <p className="truncate text-[11px] text-sadn-ink-soft">{t('dashboard')}</p>
            </div>
          </div>
          <div className="ms-auto flex items-center gap-1.5">
            <LangToggle lang={lang} onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} />
            <a
              href="/"
              className="hidden h-9 items-center gap-1.5 rounded-none px-3 text-xs font-medium text-sadn-ink-soft transition-colors hover:bg-sadn-plum-50 hover:text-sadn-plum-800 sm:inline-flex"
            >
              <Store className="h-3.5 w-3.5" strokeWidth={1.75} />
              {t('viewStore')}
            </a>
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex h-9 items-center gap-1.5 rounded-none px-3 text-xs font-medium text-sadn-ink-soft transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">{t('logout')}</span>
            </button>
          </div>
        </div>
        {/* Mobile tabs */}
        <nav className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-2.5 lg:hidden" aria-label={t('dashboard')}>
          {TABS.map((item) => {
            const Icon = item.icon;
            const activeTab = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-current={activeTab ? 'page' : undefined}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-none px-3.5 py-2 text-xs font-medium transition-colors ${
                  activeTab
                    ? 'bg-sadn-plum-800 text-white'
                    : 'bg-white text-sadn-ink-soft ring-1 ring-sadn-plum-100 hover:text-sadn-plum-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                {t(item.labelKey)}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6">
        {/* ── Desktop sidebar ── */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-1" aria-label={t('dashboard')}>
            {TABS.map((item) => {
              const Icon = item.icon;
              const activeTab = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  aria-current={activeTab ? 'page' : undefined}
                  className={`flex w-full items-center gap-2.5 rounded-none px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    activeTab
                      ? 'bg-sadn-plum-800 text-white shadow-md shadow-sadn-plum-800/20'
                      : 'text-sadn-ink-soft hover:bg-white hover:text-sadn-plum-800'
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                  {t(item.labelKey)}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Content ── */}
        <main className="min-w-0 flex-1">
          {tab === 'overview' && <AdminOverviewTab t={t} lang={lang} />}
          {tab === 'products' && (
            <AdminProductsTab t={t} lang={lang} onChanged={notifyCatalogChanged} />
          )}
          {tab === 'inventory' && <AdminInventoryTab t={t} lang={lang} />}
          {tab === 'categories' && (
            <AdminCategoriesTab t={t} lang={lang} onChanged={notifyCatalogChanged} />
          )}
          {tab === 'orders' && <AdminOrdersTab t={t} lang={lang} />}
          {tab === 'reviews' && (
            <AdminReviewsTab t={t} lang={lang} onChanged={notifyCatalogChanged} />
          )}
          {tab === 'settings' && <AdminSettingsTab t={t} lang={lang} />}
        </main>
      </div>

      <Toaster position="top-center" richColors />
    </div>
  );
}

/* ── Login screen ─────────────────────────────────────────────────────── */

function AdminLogin({
  lang,
  onLang,
  onSuccess,
}: {
  lang: AdminLang;
  onLang: (l: AdminLang) => void;
  onSuccess: () => void;
}) {
  const t = (k: AdminKey) => ADMIN_T[k][lang];
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: value }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        setError(t('wrongPassword'));
      }
    } catch {
      setError(t('wrongPassword'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-sadn-stone px-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Ambient brand glows */}
      <div aria-hidden className="pointer-events-none absolute -top-24 start-1/2 h-72 w-72 -translate-x-1/2 rounded-none bg-sadn-plum-100/60 blur-3xl rtl:translate-x-1/2" />
      <div aria-hidden className="pointer-events-none absolute bottom-0 end-0 h-56 w-56 rounded-none bg-sadn-plum-50 blur-3xl" />

      <form
        onSubmit={submit}
        className="relative w-full max-w-sm rounded-none border border-sadn-plum-100 bg-white p-7 shadow-2xl shadow-sadn-plum-950/10"
      >
        <div className="flex items-center justify-between">
          <span className="flex h-12 w-12 items-center justify-center rounded-none bg-sadn-plum-800 font-sadn-display text-lg font-semibold text-white shadow-lg shadow-sadn-plum-800/25">
            S
          </span>
          <LangToggle lang={lang} onClick={() => onLang(lang === 'ar' ? 'en' : 'ar')} />
        </div>
        <h1 className="mt-5 font-sadn-display text-2xl text-sadn-ink">{t('loginTitle')}</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-sadn-ink-soft">{t('loginBody')}</p>

        <label className="mt-6 block">
          <span className="mb-1.5 block text-xs font-medium text-sadn-ink">{t('password')}</span>
          <div className="relative">
            <Lock className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sadn-plum-300" strokeWidth={1.75} />
            <input
              type="password"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              autoFocus
              autoComplete="current-password"
              className="sadn-input ps-10"
              aria-invalid={Boolean(error) || undefined}
            />
          </div>
        </label>

        {error && (
          <p role="alert" className="mt-3 rounded-none bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !value}
          className="press mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-none bg-sadn-plum-800 text-sm font-medium tracking-wide text-white shadow-lg shadow-sadn-plum-800/25 transition-colors hover:bg-sadn-plum-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('signIn')}
        </button>

        <a
          href="/"
          className="mt-4 flex items-center justify-center gap-1.5 text-xs text-sadn-ink-soft transition-colors hover:text-sadn-plum-800"
        >
          <Store className="h-3.5 w-3.5" strokeWidth={1.75} />
          {t('viewStore')}
        </a>
      </form>
      <Toaster position="top-center" richColors />
    </div>
  );
}
