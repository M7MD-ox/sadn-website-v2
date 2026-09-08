'use client';

/**
 * saveNewOrder (R12) — the optimistic drag-reorder save, extracted from the
 * three copies in AdminProductsTab (sortOrder), AdminReviewsTab (order) and
 * AdminCategoriesTab (order). Trip: optimistic flip (caller already applied
 * it) → diff the rows whose persisted order ≠ their new index → one PATCH
 * per moved row → toast + reindex + onChanged() → on failure toast + reload
 * → always clear the saving flag.
 *
 * NOTE (18-2 parity): the diff sends the EXPLICIT new index for every moved
 * row — `order: 0` for the first card must keep flowing to the server (the
 * server treats an explicit 0 as valid; no `|| 99` fallback on the client).
 */

import { toast } from 'sonner';

type SaveNewOrderOpts<T> = {
  /** Base URL of the collection route — rows PATCH to `${url}/${row[idField]}`. */
  url: string;
  idField: keyof T & string;
  orderField: keyof T & string;
  /** The row's currently persisted order value (p.sortOrder / r.order / c.order). */
  getOrder: (row: T) => number;
  /** Optimistic state setter — reindexes the array after the PATCHes resolve. */
  setRows: (update: (prev: T[]) => T[]) => void;
  t: (k: 'reorderSaved' | 'errorToast') => string;
  onChanged: () => void;
  reload: () => void;
  setSaving: (saving: boolean) => void;
};

export function saveNewOrder<T>(
  rows: T[],
  { url, idField, orderField, getOrder, setRows, t, onChanged, reload, setSaving }: SaveNewOrderOpts<T>
): void {
  setSaving(true);
  const moved = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row, index }) => getOrder(row) !== index);
  Promise.all(
    moved.map(({ row, index }) =>
      fetch(`${url}/${row[idField]}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [orderField]: index }),
      })
    )
  )
    .then(() => {
      toast.success(t('reorderSaved'));
      setRows((prev) => prev.map((x, i) => ({ ...x, [orderField]: i }) as T));
      onChanged();
    })
    .catch(() => {
      toast.error(t('errorToast'));
      reload();
    })
    .finally(() => setSaving(false));
}
