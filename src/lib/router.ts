'use client';

import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';

/**
 * Tiny path router (round 13) — every page has a real URL ("/", "/shop",
 * "/product/<slug>", "/bag") and new products automatically get their own
 * URL (it IS their slug).
 *
 * IMPORTANT: the App Router owns the history stack — a raw history.pushState
 * gets reverted by Next's internals sync. So navigation goes through
 * next/navigation's router (bridged from the shell).
 *
 * The query string is read straight off window.location through a tiny
 * subscription (popstate + a nudge event after each navigate) instead of
 * useSearchParams — the latter suspends during navigations, which would
 * remount the whole shell and drop its state (mini-cart, loading, …).
 */

type RouterLike = {
  push: (url: string, opts?: { scroll?: boolean }) => void;
  replace: (url: string, opts?: { scroll?: boolean }) => void;
  back: () => void;
};

let bridge: RouterLike | null = null;
/** SPA-lifetime depth counter — lets routeBack() fall back home on deep links. */
let depth = 0;

const SEARCH_EVENT = 'sadn:search';

/** Called by the shell to lend the App Router instance to this module. */
export function setRouterBridge(r: RouterLike | null) {
  bridge = r;
}

export function navigate(to: string, opts?: { replace?: boolean }) {
  if (!bridge) {
    if (typeof window !== 'undefined') window.location.assign(to);
    return;
  }
  if (opts?.replace) {
    bridge.replace(to);
  } else {
    depth += 1;
    bridge.push(to);
    window.scrollTo({ top: 0 });
  }
  // The URL lands a tick after push() resolves — nudge subscribers now and
  // again next frame so the parsed query is always fresh.
  window.dispatchEvent(new Event(SEARCH_EVENT));
  setTimeout(() => window.dispatchEvent(new Event(SEARCH_EVENT)), 60);
}

/**
 * Sensible "back": return to the previous in-app entry when there is one,
 * otherwise go home (covers direct opens of /product/<slug> deep links).
 */
export function routeBack(fallback = '/') {
  if (depth > 0 && bridge) {
    depth = Math.max(0, depth - 1);
    bridge.back();
  } else {
    navigate(fallback, { replace: true });
  }
}

/** Parse a route string into its path + query. */
export function parseRoute(route: string): { path: string; query: URLSearchParams } {
  const qIndex = route.indexOf('?');
  const path = qIndex >= 0 ? route.slice(0, qIndex) || '/' : route || '/';
  const query = new URLSearchParams(qIndex >= 0 ? route.slice(qIndex + 1) : '');
  return { path, query };
}

const subscribeSearch = (onChange: () => void) => {
  window.addEventListener('popstate', onChange);
  window.addEventListener(SEARCH_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(SEARCH_EVENT, onChange);
  };
};

/** Reactive route string: "<pathname>?<search>" — no suspense, no remounts. */
export function useRoute(): string {
  const pathname = usePathname();
  const search = useSyncExternalStore(
    subscribeSearch,
    () => window.location.search,
    () => ''
  );
  return search ? `${pathname}?${search}` : pathname;
}

