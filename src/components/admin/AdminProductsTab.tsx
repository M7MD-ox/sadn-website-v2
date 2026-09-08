'use client';

import { useMemo, useRef, useState } from 'react';
import {
  ArrowUp,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { money, type CategoryDTO, type ProductColor, type ProductDTO } from '@/lib/sadn-store';
import type { AdminKey, AdminLang } from './admin-i18n';
import { AdminSheet, Field } from './kit';
import { SortableList } from './SortableList';
import { saveNewOrder } from './saveNewOrder';
import { useAdminData } from './useAdminData';

type TT = (k: AdminKey) => string;

type ColorRow = ProductColor;

type ProductForm = {
  slug: string;
  name: string;
  nameAr: string;
  tagline: string;
  description: string;
  category: string;
  price: string;
  compareAtPrice: string;
  images: string[];
  colors: ColorRow[];
  sizes: string;
  hiddenSizes: string[];
  stock: string;
  featured: boolean;
  isNew: boolean;
  active: boolean;
};

const EMPTY_FORM: ProductForm = {
  slug: '',
  name: '',
  nameAr: '',
  tagline: '',
  description: '',
  category: '',
  price: '',
  compareAtPrice: '',
  images: [],
  colors: [{ name: 'Ivory', hex: '#f2efe9' }],
  sizes: 'S, M, L, XL',
  hiddenSizes: [],
  stock: '10',
  featured: false,
  isNew: true,
  active: true,
};

function toForm(p: ProductDTO): ProductForm {
  return {
    slug: p.slug,
    name: p.name,
    nameAr: p.nameAr,
    tagline: p.tagline ?? '',
    description: p.description,
    category: p.category,
    price: String(p.price),
    compareAtPrice: p.compareAtPrice == null ? '' : String(p.compareAtPrice),
    images: [...p.images],
    colors: p.colors.map((c) => ({ ...c })),
    sizes: p.sizes.join(', '),
    hiddenSizes: [...(p.hiddenSizes ?? [])],
    stock: String(p.stock),
    featured: p.featured,
    isNew: p.isNew,
    active: p.active !== false,
  };
}

export function AdminProductsTab({
  t,
  lang,
  onChanged,
}: {
  t: TT;
  lang: AdminLang;
  onChanged: () => void;
}) {
  const { data: products, setData: setProducts, reload: load } = useAdminData<ProductDTO[]>(
    '/api/admin/products',
    (d) => d.products,
    []
  );
  const { data: categories, reload: loadCategories } = useAdminData<CategoryDTO[]>(
    '/api/categories',
    (d) => d.categories,
    []
  );
  const loadAll = () => {
    load();
    loadCategories();
  };
  const [q, setQ] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [editing, setEditing] = useState<ProductDTO | 'new' | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const filtering = q.trim() !== '' || catFilter !== 'all';
  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (catFilter === 'all' || p.category === catFilter) &&
          (q.trim() === '' ||
            `${p.name} ${p.nameAr} ${p.slug}`.toLowerCase().includes(q.trim().toLowerCase()))
      ),
    [products, q, catFilter]
  );

  /**
   * Drag & drop ordering (round 16) — "ترتيب اي مجموعه حاجات بالسحب و
   * الافلات مش بالترقيم". Optimistic flip, then one PATCH per product whose
   * position actually changed (shared trip in saveNewOrder).
   */
  const handleReorder = (next: ProductDTO[]) => {
    setProducts(next);
    saveNewOrder(next, {
      url: '/api/admin/products',
      idField: 'id',
      orderField: 'sortOrder',
      getOrder: (p) => p.sortOrder ?? -1, // DB column is Int @default(0); -1 keeps an absent value "always moved" like the raw !== did
      setRows: setProducts,
      t,
      onChanged,
      reload: loadAll,
      setSaving: setSavingOrder,
    });
  };

  const catLabel = (slug: string) => {
    const c = categories.find((x) => x.slug === slug);
    if (c) return lang === 'ar' ? c.labelAr : c.labelEn;
    return slug;
  };

  const renderCard = (p: ProductDTO) => (
    <article
      className={`group flex gap-3 rounded-none border bg-white p-3 transition-all hover:shadow-md hover:shadow-sadn-plum-950/10 ${
        p.active === false ? 'border-sadn-plum-100 opacity-70' : 'border-sadn-plum-100'
      }`}
    >
      <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-none bg-sadn-plum-50">
        {p.images[0] ? (
          <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <Package className="h-5 w-5 text-sadn-plum-300" strokeWidth={1.5} />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-sadn-ink">
              {lang === 'ar' ? p.nameAr : p.name}
            </p>
            <p className="truncate text-[11px] text-sadn-ink-soft">
              {lang === 'ar' ? p.name : p.nameAr}
            </p>
          </div>
          <span className="price-num shrink-0 text-sm font-semibold text-sadn-ink">
            {money(p.price, lang)}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <span className="rounded-none bg-sadn-plum-50 px-2 py-0.5 text-[10px] font-medium text-sadn-plum-700">
            {catLabel(p.category)}
          </span>
          {p.featured && (
            <span className="rounded-none bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              {t('featured')}
            </span>
          )}
          {p.isNew && (
            <span className="rounded-none bg-sadn-plum-800 px-2 py-0.5 text-[10px] font-medium text-white">
              {t('newFlag')}
            </span>
          )}
          {p.stock <= 3 && (
            <span className="rounded-none bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
              {t('stock')}: {p.stock}
            </span>
          )}
          {(p.hiddenSizes?.length ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 rounded-none bg-sadn-plum-50 px-2 py-0.5 text-[10px] font-medium text-sadn-plum-600">
              <EyeOff className="h-3 w-3" strokeWidth={1.75} />
              {p.hiddenSizes?.length}
            </span>
          )}
          {p.colors.some((c) => c.hidden) && (
            <span className="inline-flex items-center gap-1 rounded-none bg-sadn-plum-50 px-2 py-0.5 text-[10px] font-medium text-sadn-plum-600">
              <EyeOff className="h-3 w-3" strokeWidth={1.75} />
              {p.colors.filter((c) => c.hidden).length}
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(p)}
            className="inline-flex h-8 items-center gap-1.5 rounded-none px-3 text-xs font-medium text-sadn-plum-700 transition-colors hover:bg-sadn-plum-50"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
            {t('edit')}
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm(t('confirmDelete'))) return;
              const res = await fetch(`/api/admin/products/${p.id}`, { method: 'DELETE' });
              if (res.ok) {
                toast.success(t('deletedToast'));
                setProducts((prev) => prev.filter((x) => x.id !== p.id));
                onChanged();
              } else {
                toast.error(t('errorToast')); // round 19: was t('uploadFailed') — copy-paste from the upload handler
              }
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-none px-3 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            {t('delete')}
          </button>
          <label className="ms-auto flex cursor-pointer items-center gap-1.5 text-[10px] text-sadn-ink-soft">
            <input
              type="checkbox"
              checked={p.active !== false}
              onChange={async (e) => {
                const active = e.target.checked;
                setProducts((prev) =>
                  prev.map((x) => (x.id === p.id ? { ...x, active } : x))
                );
                const res = await fetch(`/api/admin/products/${p.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ active }),
                });
                if (res.ok) {
                  toast.success(t('savedToast'));
                  onChanged();
                }
              }}
              className="h-3.5 w-3.5 accent-[#52314e]"
              aria-label={t('active')}
            />
            {t('active')}
          </label>
        </div>
      </div>
    </article>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sadn-plum-300" strokeWidth={1.75} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('searchProducts')}
            className="sadn-input ps-9"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="sadn-input h-11 w-auto cursor-pointer"
          aria-label={t('allCategories')}
        >
          <option value="all">{t('allCategories')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {lang === 'ar' ? c.labelAr : c.labelEn}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="press ms-auto inline-flex h-11 items-center gap-2 rounded-none bg-sadn-plum-800 px-4 text-sm font-medium text-white shadow-md shadow-sadn-plum-800/25 transition-colors hover:bg-sadn-plum-700 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          {t('newProduct')}
        </button>
      </div>

      {/* Product rows — drag & drop when nothing filters the true order */}
      {filtering ? (
        <>
          <p className="rounded-none bg-sadn-plum-50 px-3 py-2 text-[11px] text-sadn-plum-700">
            {t('dndFilterHint')}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => (
              <div key={p.id}>{renderCard(p)}</div>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full py-16 text-center text-sm text-sadn-ink-soft">
                {t('noResults')}
              </p>
            )}
          </div>
        </>
      ) : (
        <SortableList
          items={products}
          getId={(p) => p.id}
          onReorder={handleReorder}
          renderItem={(p) => renderCard(p)}
          ariaLabel={t('products')}
          t={t}
          className={`gap-3 ${savingOrder ? 'opacity-80' : ''}`}
        />
      )}

      {/* Editor drawer */}
      {editing && (
        <ProductEditor
          key={editing === 'new' ? 'new' : editing.id}
          product={editing === 'new' ? null : editing}
          categories={categories}
          t={t}
          lang={lang}
          onClose={() => setEditing(null)}
          onSaved={(p) => {
            setProducts((prev) => {
              const exists = prev.some((x) => x.id === p.id);
              return exists ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p];
            });
            setEditing(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

/* ── Product editor drawer ────────────────────────────────────────────── */

function ProductEditor({
  product,
  categories,
  t,
  lang,
  onClose,
  onSaved,
}: {
  product: ProductDTO | null;
  categories: CategoryDTO[];
  t: TT;
  lang: AdminLang;
  onClose: () => void;
  onSaved: (p: ProductDTO) => void;
}) {
  const [form, setForm] = useState<ProductForm>(
    product ? toForm(product) : { ...EMPTY_FORM, category: categories[0]?.slug ?? '' }
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageUrl, setImageUrl] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const sizeList = useMemo(
    () => form.sizes.split(',').map((s) => s.trim()).filter(Boolean),
    [form.sizes]
  );

  const toggleHiddenSize = (size: string) =>
    setForm((f) => ({
      ...f,
      hiddenSizes: f.hiddenSizes.includes(size)
        ? f.hiddenSizes.filter((s) => s !== size)
        : [...f.hiddenSizes, size],
    }));

  const toggleHiddenColor = (index: number) =>
    setForm((f) => ({
      ...f,
      colors: f.colors.map((c, i) => (i === index ? { ...c, hidden: !c.hidden } : c)),
    }));

  const save = async () => {
    setSaving(true);
    setErrors({});
    const payload = {
      slug: form.slug,
      name: form.name,
      nameAr: form.nameAr,
      tagline: form.tagline,
      description: form.description,
      category: form.category,
      price: Number(form.price),
      compareAtPrice: form.compareAtPrice === '' ? null : Number(form.compareAtPrice),
      images: form.images,
      colors: form.colors.filter((c) => c.name && c.hex),
      sizes: sizeList,
      hiddenSizes: form.hiddenSizes.filter((s) => sizeList.includes(s)),
      stock: Number(form.stock) || 0,
      featured: form.featured,
      isNew: form.isNew,
      active: form.active,
    };
    try {
      const res = await fetch(product ? `/api/admin/products/${product.id}` : '/api/admin/products', {
        method: product ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(t('savedToast'));
        onSaved(data.product);
      } else if (data.errors) {
        setErrors(data.errors);
      } else {
        toast.error(data.error ?? t('errorToast'));
      }
    } catch {
      toast.error(t('errorToast'));
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.ok) {
        setForm((f) => ({ ...f, images: [...f.images, data.url] }));
      } else {
        toast.error(t('uploadFailed'));
      }
    } catch {
      toast.error(t('uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const labelCls = 'text-start';

  return (
    <AdminSheet
      onClose={onClose}
      label={product ? t('editProduct') : t('newProduct')}
      variant="drawer"
      panelClassName="absolute inset-y-0 end-0 flex w-full max-w-lg flex-col bg-sadn-stone shadow-2xl animate-in slide-in-from-end-4 duration-300 sm:inset-y-4 sm:rounded-none sm:end-4"
    >
        {/* header */}
        <div className="flex items-center justify-between border-b border-sadn-plum-100 bg-white px-5 py-4">
          <h2 className="font-sadn-display text-xl text-sadn-ink">
            {product ? t('editProduct') : t('newProduct')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('cancel')}
            className="flex h-9 w-9 items-center justify-center rounded-none text-sadn-ink-soft transition-colors hover:bg-sadn-plum-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* body */}
        <div className="sadn-sheet-scroll flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('nameEn')} error={errors.name}>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} className="sadn-input" dir="ltr" />
            </Field>
            <Field label={t('nameArLabel')} error={errors.nameAr}>
              <input value={form.nameAr} onChange={(e) => set('nameAr', e.target.value)} className="sadn-input" dir="rtl" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('slug')} error={errors.slug}>
              <input value={form.slug} onChange={(e) => set('slug', e.target.value)} className="sadn-input" dir="ltr" placeholder="ivory-linen-shirt" />
            </Field>
            <Field label={t('section')} error={errors.category}>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="sadn-input cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {lang === 'ar' ? c.labelAr : c.labelEn}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label={t('tagline')}>
            <input value={form.tagline} onChange={(e) => set('tagline', e.target.value)} className="sadn-input" />
          </Field>

          <Field label={t('description')} error={errors.description}>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              className="sadn-input h-auto resize-none py-2.5"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('price')} error={errors.price}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                className="sadn-input"
                dir="ltr"
              />
            </Field>
            <Field label={t('compareAt')} error={errors.compareAtPrice}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.compareAtPrice}
                onChange={(e) => set('compareAtPrice', e.target.value)}
                className="sadn-input"
                dir="ltr"
              />
            </Field>
          </div>

          {/* Sizes + per-size visibility (round 16 eye toggles) */}
          <Field label={t('sizes')} error={errors.sizes}>
            <input value={form.sizes} onChange={(e) => set('sizes', e.target.value)} className="sadn-input" dir="ltr" placeholder="S, M, L" />
            {sizeList.length > 0 && (
              <div className="mt-2.5">
                <span className="mb-1.5 block text-[11px] text-sadn-ink-soft">{t('sizeVisibility')}</span>
                <div className="flex flex-wrap gap-1.5">
                  {sizeList.map((size) => {
                    const hidden = form.hiddenSizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleHiddenSize(size)}
                        aria-pressed={hidden}
                        aria-label={hidden ? t('showSize') : t('hideSize')}
                        title={hidden ? t('showSize') : t('hideSize')}
                        className={`inline-flex h-8 items-center gap-1.5 rounded-none px-2.5 text-xs font-medium transition-colors ${
                          hidden
                            ? 'bg-sadn-plum-950/80 text-white/60'
                            : 'bg-white text-sadn-ink ring-1 ring-sadn-plum-200 hover:ring-sadn-plum-400'
                        }`}
                      >
                        {hidden ? (
                          <EyeOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                        ) : (
                          <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                        )}
                        <span className={hidden ? 'line-through' : ''}>{size}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('stock')} error={errors.stock}>
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => set('stock', e.target.value)}
                className="sadn-input"
                dir="ltr"
              />
            </Field>
          </div>

          {/* Colors + per-color visibility (round 16 eye toggles) */}
          <Field label={t('colors')} error={errors.colors}>
            <div className="space-y-2">
              <span className="block text-[11px] text-sadn-ink-soft">{t('colorVisibility')}</span>
              {form.colors.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleHiddenColor(i)}
                    aria-pressed={Boolean(c.hidden)}
                    aria-label={c.hidden ? t('showColor') : t('hideColor')}
                    title={c.hidden ? t('showColor') : t('hideColor')}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-none transition-colors ${
                      c.hidden
                        ? 'bg-sadn-plum-950/80 text-white/70'
                        : 'text-sadn-plum-600 hover:bg-sadn-plum-50'
                    }`}
                  >
                    {c.hidden ? (
                      <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                    ) : (
                      <Eye className="h-4 w-4" strokeWidth={1.75} />
                    )}
                  </button>
                  <input
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(c.hex) ? c.hex : '#ffffff'}
                    onChange={(e) =>
                      set('colors', form.colors.map((x, xi) => (xi === i ? { ...x, hex: e.target.value } : x)))
                    }
                    className="h-9 w-9 shrink-0 cursor-pointer rounded-none border border-sadn-plum-100 bg-white p-0.5"
                    aria-label={t('hex')}
                  />
                  <input
                    value={c.name}
                    onChange={(e) =>
                      set('colors', form.colors.map((x, xi) => (xi === i ? { ...x, name: e.target.value } : x)))
                    }
                    placeholder={t('colorName')}
                    className={`sadn-input h-9 min-w-0 flex-1 py-0 ${c.hidden ? 'opacity-60 line-through' : ''}`}
                  />
                  <input
                    value={c.hex}
                    onChange={(e) =>
                      set('colors', form.colors.map((x, xi) => (xi === i ? { ...x, hex: e.target.value } : x)))
                    }
                    className="sadn-input h-9 w-20 py-0 font-mono text-xs"
                    dir="ltr"
                    aria-label={t('hex')}
                  />
                  <button
                    type="button"
                    onClick={() => set('colors', form.colors.filter((_, xi) => xi !== i))}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none text-sadn-ink-soft transition-colors hover:bg-red-50 hover:text-red-500"
                    aria-label={t('remove')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => set('colors', [...form.colors, { name: '', hex: '#cccccc' }])}
                className="inline-flex h-9 items-center gap-1.5 rounded-none px-3 text-xs font-medium text-sadn-plum-700 transition-colors hover:bg-sadn-plum-50"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                {t('addColor')}
              </button>
            </div>
          </Field>

          {/* Images */}
          <Field label={t('images')} error={errors.images}>
            <div className="space-y-2.5">
              <div className="flex flex-wrap gap-2">
                {form.images.map((img, i) => (
                  <div key={`${img}-${i}`} className="group relative h-20 w-16 overflow-hidden rounded-none bg-white ring-1 ring-sadn-plum-100">
                    <img src={img} alt={`img ${i + 1}`} className="h-full w-full object-cover" />
                    {i > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          set('images', [img, ...form.images.filter((_, xi) => xi !== i)])
                        }
                        className="absolute start-0.5 top-0.5 rounded-none bg-white/90 p-1 text-sadn-plum-700 opacity-0 shadow transition-opacity group-hover:opacity-100"
                        aria-label={t('makeFirst')}
                        title={t('makeFirst')}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => set('images', form.images.filter((_, xi) => xi !== i))}
                      className="absolute end-0.5 top-0.5 rounded-none bg-white/90 p-1 text-red-500 opacity-0 shadow transition-opacity group-hover:opacity-100"
                      aria-label={t('remove')}
                      title={t('remove')}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex h-20 w-16 flex-col items-center justify-center gap-1 rounded-none border border-dashed border-sadn-plum-200 text-sadn-plum-400 transition-colors hover:border-sadn-plum-400 hover:text-sadn-plum-700"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="h-4 w-4" strokeWidth={1.5} />
                      <span className="text-[9px] font-medium">{t('uploadImage')}</span>
                    </>
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
                    e.target.value = '';
                  }}
                />
              </div>
              <div className="flex gap-2">
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder={t('imageUrl')}
                  className="sadn-input h-9 py-0 text-xs"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => {
                    const v = imageUrl.trim();
                    if (!v) return;
                    set('images', [...form.images, v]);
                    setImageUrl('');
                  }}
                  className="h-9 shrink-0 rounded-none bg-sadn-plum-800 px-4 text-xs font-medium text-white transition-colors hover:bg-sadn-plum-700"
                >
                  {t('add')}
                </button>
              </div>
            </div>
          </Field>

          {/* Flags */}
          <div className="flex flex-wrap gap-x-5 gap-y-2.5 rounded-none bg-white p-4 ring-1 ring-sadn-plum-100">
            {(
              [
                ['featured', t('featured')],
                ['isNew', t('newFlag')],
                ['active', t('active')],
              ] as Array<[keyof ProductForm, string]>
            ).map(([key, lbl]) => (
              <label key={key} className={`flex cursor-pointer items-center gap-2 text-xs font-medium text-sadn-ink ${labelCls}`}>
                <input
                  type="checkbox"
                  checked={Boolean(form[key])}
                  onChange={(e) => set(key, e.target.checked as never)}
                  className="h-4 w-4 accent-[#52314e]"
                />
                {lbl}
              </label>
            ))}
          </div>
        </div>

        {/* footer */}
        <div className="flex gap-2 border-t border-sadn-plum-100 bg-white px-5 py-4">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="press inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-none bg-sadn-plum-800 text-sm font-medium text-white shadow-lg shadow-sadn-plum-800/25 transition-colors hover:bg-sadn-plum-700 active:scale-[0.98] disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('save')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-none px-5 text-sm font-medium text-sadn-ink-soft transition-colors hover:bg-sadn-plum-50"
          >
            {t('cancel')}
          </button>
        </div>
    </AdminSheet>
  );
}
