'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Check, ImagePlus, Loader2, Pencil, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import type { AdminKey, AdminLang } from './admin-i18n';
import { RowDeleteButton } from './kit';
import { SortableList } from './SortableList';
import { saveNewOrder } from './saveNewOrder';
import { useAdminData } from './useAdminData';

type TT = (k: AdminKey) => string;

type ReviewRow = {
  id: string;
  image: string;
  caption: string;
  active: boolean;
  order: number;
  fitFeedback?: string | null;
  productSlug?: string | null;
};

const FIT_VALUES = ['tight', 'true', 'loose'] as const;
type FitValue = (typeof FIT_VALUES)[number];

/**
 * Reviews tab (round 11, DnD in round 16) — the storefront review wall: 16:9
 * screenshots of real customer chats. Cards reorder by drag & drop (grid
 * layout, whole card drags); the numeric order input is gone. Every mutation
 * refreshes the storefront via the sadn:catalog-changed event.
 */
export function AdminReviewsTab({
  t,
  lang,
  onChanged,
}: {
  t: TT;
  lang: AdminLang;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ image: string; caption: string; fitFeedback: FitValue | ''; productSlug: string }>({
    image: '',
    caption: '',
    fitFeedback: '',
    productSlug: '',
  });
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ caption: string; fitFeedback: FitValue | ''; productSlug: string }>({
    caption: '',
    fitFeedback: '',
    productSlug: '',
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: reviews, setData: setReviews, reload: load } = useAdminData<ReviewRow[]>(
    '/api/admin/reviews',
    (d) => d.reviews,
    []
  );

  /* Catalog for the fit-feedback product link (round 29) — the public list
     is enough: slug + bilingual names. */
  const { data: catalog } = useAdminData<Array<{ slug: string; name: string; nameAr: string }>>(
    '/api/products',
    (d) => (Array.isArray(d.products) ? d.products : Array.isArray(d) ? d : []),
    []
  );

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (res.ok && data.ok) {
        setDraft((d) => ({ ...d, image: data.url }));
      } else {
        toast.error(data.error ?? t('uploadFailed'));
      }
    } catch {
      toast.error(t('uploadFailed'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const add = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, order: reviews.length }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(t('reviewSaved'));
        setReviews((prev) => [...prev, data.review]);
        setDraft({ image: '', caption: '', fitFeedback: '', productSlug: '' });
        setAdding(false);
        onChanged();
      } else {
        toast.error(data.errors ? Object.values(data.errors)[0] : data.error);
      }
    } catch {
      // Round 19: network failure now toasts instead of vanishing.
      toast.error(t('errorToast'));
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: editDraft.caption,
          fitFeedback: editDraft.fitFeedback,
          productSlug: editDraft.productSlug,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(t('savedToast'));
        setReviews((prev) => prev.map((r) => (r.id === id ? data.review : r)));
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

  const toggleActive = async (r: ReviewRow, active: boolean) => {
    setReviews((prev) => prev.map((x) => (x.id === r.id ? { ...x, active } : x)));
    try {
      const res = await fetch(`/api/admin/reviews/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        onChanged();
      } else {
        setReviews((prev) => prev.map((x) => (x.id === r.id ? { ...x, active: !active } : x)));
        toast.error(data.error ?? t('errorToast'));
      }
    } catch {
      setReviews((prev) => prev.map((x) => (x.id === r.id ? { ...x, active: !active } : x)));
      toast.error(t('errorToast'));
    }
  };

  /** Drop → optimistic flip + PATCH only the rows whose position changed. */
  const handleReorder = (next: ReviewRow[]) => {
    setReviews(next);
    saveNewOrder(next, {
      url: '/api/admin/reviews',
      idField: 'id',
      orderField: 'order',
      getOrder: (r) => r.order,
      setRows: setReviews,
      t,
      onChanged,
      reload: load,
      setSaving: setSavingOrder,
    });
  };

  const remove = async (r: ReviewRow) => {
    if (!window.confirm(t('confirmDelete'))) return;
    const res = await fetch(`/api/admin/reviews/${r.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      toast.success(t('deletedToast'));
      setReviews((prev) => prev.filter((x) => x.id !== r.id));
      onChanged();
    } else {
      toast.error(data.error ?? t('errorToast'));
    }
  };

  const inputCls = 'sadn-input h-9 py-0 text-sm';
  const countLabel =
    reviews.length === 1 ? t('reviewsCountOne') : t('reviewsCountOther').replace('{n}', String(reviews.length));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-xl text-xs leading-relaxed text-sadn-ink-soft">{t('reviewsIntro')}</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-sadn-ink-soft">{countLabel}</span>
          <button
            type="button"
            onClick={() => {
              setAdding((v) => !v);
              setDraft({ image: '', caption: '', fitFeedback: '', productSlug: '' });
            }}
            className="press inline-flex h-10 items-center gap-2 rounded-none bg-sadn-plum-800 px-4 text-sm font-medium text-white shadow-md shadow-sadn-plum-800/25 transition-colors hover:bg-sadn-plum-700"
          >
            {adding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" strokeWidth={2} />}
            {t('newReview')}
          </button>
        </div>
      </div>

      {adding && (
        <div className="rounded-none border border-sadn-plum-100 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            {/* 16:9 preview / upload zone */}
            <div className="w-full shrink-0 sm:w-64">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-none border border-dashed border-sadn-plum-200 bg-sadn-plum-50/40 transition-colors hover:border-sadn-plum-400"
              >
                {draft.image ? (
                  <img src={draft.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-1.5 text-sadn-plum-500">
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
                    )}
                    <span className="text-[11px] font-medium">{t('uploadImage')} · 16:9</span>
                  </span>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f);
                }}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              <input
                value={draft.image}
                onChange={(e) => setDraft({ ...draft, image: e.target.value })}
                placeholder={t('imageUrl')}
                dir="ltr"
                className={inputCls}
              />
              <input
                value={draft.caption}
                onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
                placeholder={t('reviewCaptionPh')}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                className={inputCls}
                aria-label={t('reviewCaption')}
              />
              {/* Round 29 — optional fit verdict + product link: linked reviews
                  power the "قياس العميلات" chips on that product's page. */}
              <div className="grid grid-cols-2 gap-2.5">
                <select
                  value={draft.fitFeedback}
                  onChange={(e) => setDraft({ ...draft, fitFeedback: e.target.value as FitValue | '' })}
                  className={inputCls}
                  aria-label={t('reviewFitLabel')}
                >
                  <option value="">{t('reviewFitNone')}</option>
                  <option value="tight">{t('reviewFitTight')}</option>
                  <option value="true">{t('reviewFitTrue')}</option>
                  <option value="loose">{t('reviewFitLoose')}</option>
                </select>
                <select
                  value={draft.productSlug}
                  onChange={(e) => setDraft({ ...draft, productSlug: e.target.value })}
                  className={inputCls}
                  aria-label={t('reviewProductLabel')}
                >
                  <option value="">{t('reviewProductNone')}</option>
                  {catalog.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {lang === 'ar' ? p.nameAr || p.name : p.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => void add()}
                disabled={busy || !draft.image.trim()}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-none bg-sadn-plum-800 text-xs font-medium text-white transition-colors hover:bg-sadn-plum-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      <SortableList
        items={reviews}
        getId={(r) => r.id}
        onReorder={handleReorder}
        ariaLabel={t('reviewsTab')}
        t={t}
        layout="grid"
        disabled={editingId !== null}
        className={savingOrder ? 'opacity-80' : ''}
        renderItem={(r) => {
          const isEditing = editingId === r.id;
          return (
            <div
              className={`overflow-hidden rounded-none border bg-white transition-opacity ${
                r.active ? 'border-sadn-plum-100' : 'border-sadn-plum-100 opacity-70'
              }`}
            >
              <div className="relative aspect-video w-full bg-sadn-plum-50/40">
                <Image
                  src={r.image}
                  alt={r.caption || 'customer review'}
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 100vw, 360px"
                  className="object-cover"
                />
                {!r.active && (
                  <span className="absolute start-2 top-2 rounded-none bg-sadn-plum-950/70 px-2.5 py-1 text-[10px] font-semibold text-white">
                    {t('hidden')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 px-3.5 py-3">
                {isEditing ? (
                  <>
                    <input
                      value={editDraft.caption}
                      onChange={(e) => setEditDraft({ ...editDraft, caption: e.target.value })}
                      placeholder={t('reviewCaption')}
                      dir={lang === 'ar' ? 'rtl' : 'ltr'}
                      className={`${inputCls} min-w-0 flex-1`}
                    />
                    <select
                      value={editDraft.fitFeedback}
                      onChange={(e) => setEditDraft({ ...editDraft, fitFeedback: e.target.value as FitValue | '' })}
                      className={`${inputCls} h-9 w-24 shrink-0 py-0 text-xs`}
                      aria-label={t('reviewFitLabel')}
                    >
                      <option value="">{t('reviewFitNone')}</option>
                      <option value="tight">{t('reviewFitTight')}</option>
                      <option value="true">{t('reviewFitTrue')}</option>
                      <option value="loose">{t('reviewFitLoose')}</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void saveEdit(r.id)}
                      disabled={busy}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-sadn-plum-800 text-white transition-colors hover:bg-sadn-plum-700"
                      aria-label={t('save')}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none text-sadn-ink-soft transition-colors hover:bg-sadn-plum-50"
                      aria-label={t('cancel')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-sadn-ink">
                        {r.caption || <span className="text-sadn-ink-soft">—</span>}
                      </p>
                    </div>
                    <Switch
                      checked={r.active}
                      onCheckedChange={(v) => void toggleActive(r, v)}
                      aria-label={t('active')}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(r.id);
                        setEditDraft({
                          caption: r.caption,
                          fitFeedback: (FIT_VALUES as readonly string[]).includes(r.fitFeedback ?? '')
                            ? (r.fitFeedback as FitValue)
                            : '',
                          productSlug: r.productSlug ?? '',
                        });
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none text-sadn-plum-700 transition-colors hover:bg-sadn-plum-50"
                      aria-label={t('edit')}
                    >
                      <Pencil className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                    <RowDeleteButton
                      label={t('delete')}
                      onClick={() => void remove(r)}
                      size={9}
                      iconSize="md"
                      tone="red"
                      tapTarget={false}
                      className="shrink-0"
                    />
                  </>
                )}
              </div>
            </div>
          );
        }}
      />
      {reviews.length === 0 && (
        <div className="rounded-none border border-dashed border-sadn-plum-200 bg-white py-12 text-center text-sm text-sadn-ink-soft sm:col-span-2">
          {t('noResults')}
        </div>
      )}
    </div>
  );
}
