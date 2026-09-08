'use client';

import { useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { useSadnStore } from '@/lib/sadn-store';
import { useT } from '@/lib/i18n';

/**
 * PWA runtime (round 10 revision):
 *  1. Registers /sw.js for the offline app shell.
 *  2. Online/offline connectivity toasts.
 *
 * The "Install to home screen" banner was REMOVED per the store owner's
 * request (round 10) — the site no longer prompts installation. The app
 * stays installable through the browser's own menu (manifest untouched).
 */

export function PwaRuntime() {
  const t = useT();
  const lang = useSadnStore((s) => s.lang);

  // ── Service worker registration ──
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        /* SW is a progressive enhancement — never block the app. */
      });
    }
  }, []);

  // ── Connectivity toasts ──
  useEffect(() => {
    const onOffline = () => toast(t('offlineToast'), { icon: <WifiOff className="h-4 w-4" /> });
    const onOnline = () => toast(t('backOnlineToast'));
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [t, lang]);

  return null;
}
