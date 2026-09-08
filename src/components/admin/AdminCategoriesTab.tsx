'use client';

import { useState } from 'react';
import { Check, Loader2, Pencil, Plus, Tags, X } from 'lucide-react';
import { toast } from 'sonner';
import type { CategoryDTO } from '@/lib/sadn-store';
import type { AdminKey, AdminLang } from './admin-i18n';
import { RowDeleteButton } from './kit';
import { SortableList } from './SortableList';
import { saveNewOrder } from './saveNewOrder';
import { useAdminData } from './useAdminData';

type TT = (k: AdminKey) => string;

/**
 * Categories tab (round 16) — ordering is pure drag & drop now ("بالسحب و
 * الافلات مش بالترقيم"): the numeric order input is gone, a drop PATCHes each
 * moved row's `order` optimistically and toasts.
 */
export function AdminCategoriesTab({
  t,
  lang,
  onChanged,
}: {
  t: TT;
  lang: AdminLang;
  onChanged: () => void;
}) {
  const { data: categories, setData: setCategories, reload: loadCategories } = useAdminData<CategoryDTO[]>(
    '/api/categories',
    (d) => d.categories,
    []
  );
  const { data: productCounts, setData: setProductCounts, reload: loadCounts } = useAdminData<Record<string, number>>(
    '/api/admin/products',
    (d) => {
      const counts: Record<string, number> = {};
      for (const p of d.products) counts[p.category] = (counts[p.category] ?? 0) + 1;
      return counts;
    },
    {}
  );
  const load = () => {
    loadCategories();
    loadCounts();
  };
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ slug: '', labelEn: '', labelAr: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ labelEn: '', labelAr: '' });
  const [busy, setBusy] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  const add = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, order: categories.length }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(t('savedToast'));
        setCategories((prev) => [...prev, data.category]);
        setDraft({ slug: '', labelEn: '', labelAr: '' });
        setAdding(false);
        onChanged();
      } else {
        toast.error(data.errors ? Object.values(data.errors)[0] : data.error);
      }
    } catch {
      // Round 19: a network failure used to be an unhandled rejection with
      // no feedback — the spinner cleared and nothing told the owner why.
      toast.error(t('errorToast'));
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labelEn: editDraft.labelEn,
          labelAr: editDraft.labelAr,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(t('savedToast'));
        setCategories((prev) => prev.map((c) => (c.id === id ? data.category : c)));
        setEditingId(null);
        onChanged();
      } else {
        toast.error(data.error ?? t('errorToast'));
      }
    } catch {
      toast.error(t('errorToast'));
    } finally {
      setBusy(false);
    }
  };

  /** Drop → optimistic flip + PATCH only the rows whose position changed. */
  const handleReorder = (next: CategoryDTO[]) => {
    setCategories(next);
    saveNewOrder(next, {
      url: '/api/admin/categories',
      idField: 'id',
      orderField: 'order',
      getOrder: (c) => c.order,
      setRows: setCategories,
      t,
      onChanged,
      reload: load,
      setSaving: setSavingOrder,
    });
  };

  const remove = async (c: CategoryDTO) => {
    if (!window.confirm(`${t('confirmDelete')} (${c.labelEn})`)) return;
    const res = await fetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      toast.success(t('deletedToast'));
      setCategories((prev) => prev.filter((x) => x.id !== c.id));
      onChanged();
    } else {
      toast.error(data.error ?? t('errorToast'));
    }
  };

  const inputCls = 'sadn-input h-9 py-0 text-sm';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-sadn-ink-soft">
          {categories.length} {lang === 'ar' ? 'أقسام' : 'sections'}
        </p>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="press inline-flex h-10 items-center gap-2 rounded-none bg-sadn-plum-800 px-4 text-sm font-medium text-white shadow-md shadow-sadn-plum-800/25 transition-colors hover:bg-sadn-plum-700"
        >
          {adding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" strokeWidth={2} />}
          {t('newCategory')}
        </button>
      </div>

      {adding && (
        <div className="grid gap-2.5 rounded-none border border-sadn-plum-100 bg-white p-4 sm:grid-cols-4">
          <input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="new-section" dir="ltr" className={inputCls} />
          <input value={draft.labelEn} onChange={(e) => setDraft({ ...draft, labelEn: e.target.value })} placeholder={t('labelEn')} className={inputCls} />
          <input value={draft.labelAr} onChange={(e) => setDraft({ ...draft, labelAr: e.target.value })} placeholder={t('labelAr')} dir="rtl" className={inputCls} />
          <button
            type="button"
            onClick={() => void add()}
            disabled={busy}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-none bg-sadn-plum-800 text-xs font-medium text-white transition-colors hover:bg-sadn-plum-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
            {t('save')}
          </button>
        </div>
      )}

      <div
        className={`overflow-hidden rounded-none border border-sadn-plum-100 bg-white transition-opacity ${
          savingOrder ? 'opacity-80' : ''
        }`}
      >
        <SortableList
          items={categories}
          getId={(c) => c.id}
          onReorder={handleReorder}
          ariaLabel={t('categories')}
          t={t}
          className="divide-y divide-sadn-plum-50"
          renderItem={(c) => {
            const count = productCounts[c.slug] ?? 0;
            const isEditing = editingId === c.id;
            if (isEditing) {
              return (
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <input
                    value={editDraft.labelEn}
                    onChange={(e) => setEditDraft({ ...editDraft, labelEn: e.target.value })}
                    className={`${inputCls} min-w-32 flex-1`}
                    aria-label={t('labelEn')}
                  />
                  <input
                    value={editDraft.labelAr}
                    onChange={(e) => setEditDraft({ ...editDraft, labelAr: e.target.value })}
                    dir="rtl"
                    className={`${inputCls} min-w-32 flex-1`}
                    aria-label={t('labelAr')}
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => void saveEdit(c.id)}
                      disabled={busy}
                      className="flex h-9 w-9 items-center justify-center rounded-none bg-sadn-plum-800 text-white transition-colors hover:bg-sadn-plum-700"
                      aria-label={t('save')}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="flex h-9 w-9 items-center justify-center rounded-none text-sadn-ink-soft transition-colors hover:bg-sadn-plum-50"
                      aria-label={t('cancel')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            }
            return (
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-sadn-plum-50/30">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-sadn-plum-50 text-sadn-plum-700">
                  <Tags className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-sadn-ink">
                    {lang === 'ar' ? c.labelAr : c.labelEn}
                    <span className="ms-2 font-mono text-[11px] text-sadn-ink-soft" dir="ltr">
                      /{c.slug}
                    </span>
                  </p>
                  <p className="text-[11px] text-sadn-ink-soft">
                    {count} {t('inUse')}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(c.id);
                      setEditDraft({ labelEn: c.labelEn, labelAr: c.labelAr });
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-none text-sadn-plum-700 transition-colors hover:bg-sadn-plum-50"
                    aria-label={t('edit')}
                  >
                    <Pencil className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                  <RowDeleteButton
                    label={t('delete')}
                    onClick={() => void remove(c)}
                    size={9}
                    iconSize="md"
                    tone="red"
                    tapTarget={false}
                  />
                </div>
              </div>
            );
          }}
        />
        {categories.length === 0 && (
          <p className="py-12 text-center text-sm text-sadn-ink-soft">{t('noResults')}</p>
        )}
      </div>
    </div>
  );
}
