'use client';

/**
 * useAdminData (R12) — the dashboard's standard data-load recipe, extracted:
 * fetch(url) → r.json() → d.ok && setData(pick(d)) → silent catch.
 *
 * The catch now console.warns (debuggability without changing the UX —
 * tabs keep rendering their initial/fallback data, exactly as before).
 *
 * Signature note: `initial` was added as the 3rd parameter so every tab
 * keeps its exact initial state ({} / [] / null / EMPTY settings shape)
 * without null-churn at the call sites; `deps` (optional, 4th) re-runs the
 * fetch when its serialized value changes — tabs with dynamic queries can
 * also just bake the params into the url (AdminOrdersTab does).
 */

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

export function useAdminData<T>(
  url: string,
  pick: (d: any) => T,
  initial: T,
  deps: readonly unknown[] = []
): {
  data: T;
  setData: Dispatch<SetStateAction<T>>;
  reload: () => void;
  /** True until the first fetch settles (matches the old per-tab loading flags). */
  loading: boolean;
} {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const pickRef = useRef(pick);
  useEffect(() => {
    pickRef.current = pick;
  });

  const reload = useCallback(() => {
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setData(pickRef.current(d));
      })
      .catch((err) => {
        console.warn(`useAdminData: ${url} failed`, err);
      })
      .finally(() => setLoading(false));
  }, [url]);

  const depsKey = deps.join('|');
  useEffect(() => {
    reload();
  }, [reload, depsKey]);

  return { data, setData, reload, loading };
}
