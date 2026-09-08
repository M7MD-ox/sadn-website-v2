'use client';

import { useState } from 'react';
import { Boxes, Factory, Loader2, Package, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import type { ProductDTO } from '@/lib/sadn-store';
import type { AdminKey, AdminLang } from './admin-i18n';
import { Field } from './kit';
import { useAdminData } from './useAdminData';

type TT = (k: AdminKey) => string;

type Movement = {
  id: string;
  productSlug: string;
  productName: string;
  color: string;
  qty: number;
  reason: string;
  orderNumber: string;
  note: string;
  createdAt: string;
};

type SummaryRow = {
  productSlug: string;
  productName: string;
  nameAr: string;
  color: string;
  colorHex: string;
  units: number;
  productStock: number;
};

type Mode = 'factory' | 'manual';

/**
 * Inventory tab — المخزن (round 16). Owner request: "ضيف المخزن … ومع كل
 * اوردر بيطلع بينقص من المخزن".
 *
 *  • Factory intake (+qty) and signed manual adjustments post to
 *    /api/admin/inventory which also moves Product.stock.
 *  • Every placed order auto-deducts (server-side) with reason "order".
 *  • The summary mirrors Product.stock split across visible colors; the
 *    ledger shows the last 100 signed movements.
 */
export function AdminInventoryTab({ t, lang }: { t: TT; lang: AdminLang }) {
  const { data: products, reload: loadProducts } = useAdminData<ProductDTO[]>(
    '/api/admin/products',
    (d) => d.products,
    []
  );
  const {
    data: inv,
    reload: loadInventory,
    loading,
  } = useAdminData<{ movements: Movement[]; summary: SummaryRow[] }>(
    '/api/admin/inventory',
    (d) => ({ movements: d.movements ?? [], summary: d.summary ?? [] }),
    { movements: [], summary: [] }
  );
  const { movements, summary } = inv;
  const [mode, setMode] = useState<Mode>('factory');
  const [form, setForm] = useState({ productSlug: '', color: '', qty: '', note: '' });
  const [busy, setBusy] = useState(false);

  const load = () => {
    loadProducts();
    loadInventory();
  };

  const selected = products.find((p) => p.slug === form.productSlug) ?? null;
  const qtyNum = Number(form.qty);

  const submit = async () => {
    if (!form.productSlug) {
      toast.error(t('invErrProduct'));
      return;
    }
    if (!Number.isFinite(qtyNum) || qtyNum === 0 || (mode === 'factory' && qtyNum <= 0)) {
      toast.error(t('invErrQty'));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productSlug: form.productSlug,
          color: form.color,
          qty: qtyNum,
          note: form.note,
          reason: mode,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(t('invSaved'));
        setForm((f) => ({ ...f, qty: '', note: '' }));
        load();
      } else {
        const first = data.errors ? Object.values(data.errors)[0] : data.error;
        toast.error(typeof first === 'string' && first ? first : t('errorToast'));
      }
    } catch {
      toast.error(t('errorToast'));
    } finally {
      setBusy(false);
    }
  };

  const reasonLabel = (reason: string) => {
    if (reason === 'factory') return t('reasonFactory');
    if (reason === 'order') return t('reasonOrder');
    if (reason === 'return') return t('reasonReturn');
    return t('reasonManual');
  };

  const reasonChip = (reason: string) => {
    switch (reason) {
      case 'factory':
        return 'bg-sadn-plum-50 text-sadn-plum-700';
      case 'order':
        return 'bg-red-50 text-red-600';
      case 'return':
        return 'bg-emerald-50 text-emerald-700';
      default:
        return 'bg-amber-50 text-amber-700';
    }
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  const inputCls = 'sadn-input';

  return (
    <div className="space-y-4">
      <p className="max-w-xl text-xs leading-relaxed text-sadn-ink-soft">{t('invIntro')}</p>

      {/* ── Movement form: factory intake / manual adjustment ── */}
      <section className="rounded-none border border-sadn-plum-100 bg-white p-4">
        {/* Mode segmented control */}
        <div className="grid grid-cols-2 gap-1 rounded-none bg-sadn-plum-50 p-1" role="tablist">
          {(
            [
              ['factory', t('invModeFactory'), Factory],
              ['manual', t('invModeManual'), SlidersHorizontal],
            ] as Array<[Mode, string, typeof Factory]>
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-none text-xs font-semibold transition-colors ${
                mode === value
                  ? 'bg-sadn-plum-800 text-white'
                  : 'text-sadn-plum-700 hover:bg-white/70'
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-sadn-ink-soft">
          {mode === 'factory' ? t('invFactoryHint') : t('invManualHint')}
        </p>

        <div className="mt-3 grid gap-2.5">
          <Field label={t('pickProduct')}>
            <select
              value={form.productSlug}
              onChange={(e) => setForm((f) => ({ ...f, productSlug: e.target.value, color: '' }))}
              className={`${inputCls} cursor-pointer`}
            >
              <option value="">—</option>
              {products.map((p) => (
                <option key={p.id} value={p.slug}>
                  {lang === 'ar' ? p.nameAr : p.name}
                </option>
              ))}
            </select>
          </Field>

          {selected && selected.colors.length > 0 && (
            <Field label={t('colors')}>
              <select
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className={`${inputCls} cursor-pointer`}
              >
                <option value="">{t('invColorAny')}</option>
                {selected.colors.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                    {c.hidden ? ' · ⃠' : ''}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <Field label={t('qty')}>
              <input
                type="number"
                value={form.qty}
                onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
                min={mode === 'factory' ? 1 : undefined}
                className={inputCls}
                dir="ltr"
              />
            </Field>
            <Field label={t('invNoteLabel')}>
              <input
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder={t('invNotePh')}
                maxLength={300}
                className={inputCls}
              />
            </Field>
          </div>

          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="press inline-flex h-11 items-center justify-center gap-2 rounded-none bg-sadn-plum-800 text-sm font-medium text-white shadow-md shadow-sadn-plum-800/25 transition-colors hover:bg-sadn-plum-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Boxes className="h-4 w-4" strokeWidth={1.75} />}
            {mode === 'factory' ? t('invAddStock') : t('invApplyAdjust')}
          </button>
        </div>
      </section>

      {/* ── Stock on hand ── */}
      <section className="rounded-none border border-sadn-plum-100 bg-white p-4">
        <h2 className="font-sadn-display text-base text-sadn-ink">{t('invSummaryTitle')}</h2>
        <ul className="mt-3 max-h-96 divide-y divide-sadn-plum-50 overflow-y-auto" aria-label={t('invSummaryTitle')}>
          {summary.map((row) => {
            const name = lang === 'ar' ? row.nameAr || row.productName : row.productName;
            const key = `${row.productSlug}__${row.color}`;
            return (
              <li key={key} className="flex items-center gap-2.5 py-2.5">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-none ring-1 ring-sadn-plum-100"
                  style={{ background: row.colorHex || 'transparent' }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-sadn-ink">{name}</p>
                  <p className="truncate text-[11px] text-sadn-ink-soft">
                    {row.color || t('invColorAny')}
                  </p>
                </div>
                {row.units === 0 ? (
                  <span className="shrink-0 rounded-none bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                    {t('invOutOfStock')}
                  </span>
                ) : (
                  <span
                    className={`price-num shrink-0 text-sm font-semibold ${
                      row.units <= 3 ? 'text-red-600' : 'text-sadn-ink'
                    }`}
                  >
                    {row.units}
                    <span className="ms-1 text-[10px] font-normal text-sadn-ink-soft">
                      {t('invUnits')}
                    </span>
                  </span>
                )}
              </li>
            );
          })}
          {summary.length === 0 && !loading && (
            <li className="py-10 text-center text-sm text-sadn-ink-soft">{t('invSummaryEmpty')}</li>
          )}
        </ul>
      </section>

      {/* ── Recent movements ledger ── */}
      <section className="rounded-none border border-sadn-plum-100 bg-white p-4">
        <h2 className="font-sadn-display text-base text-sadn-ink">{t('invLedgerTitle')}</h2>
        <ul className="mt-3 max-h-96 divide-y divide-sadn-plum-50 overflow-y-auto" aria-label={t('invLedgerTitle')}>
          {movements.map((m) => (
            <li key={m.id} className="py-2.5">
              <div className="flex items-center gap-2">
                <span
                  className={`price-num shrink-0 text-[13px] font-bold tabular-nums ${
                    m.qty >= 0 ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {m.qty >= 0 ? `+${m.qty}` : `−${Math.abs(m.qty)}`}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-sadn-ink">
                    {m.productName}
                    {m.color && <span className="text-sadn-ink-soft"> · {m.color}</span>}
                  </p>
                  <p className="text-[10px] text-sadn-ink-soft">{fmtTime(m.createdAt)}</p>
                </div>
                <span className={`shrink-0 rounded-none px-2 py-0.5 text-[10px] font-semibold ${reasonChip(m.reason)}`}>
                  {reasonLabel(m.reason)}
                </span>
              </div>
              {(m.orderNumber || m.note) && (
                <p className="mt-1 truncate ps-1 text-[11px] text-sadn-ink-soft">
                  {m.orderNumber && <span className="font-mono font-medium" dir="ltr">#{m.orderNumber}</span>}
                  {m.orderNumber && m.note ? ' · ' : ''}
                  {m.note}
                </p>
              )}
            </li>
          ))}
          {movements.length === 0 && !loading && (
            <li className="flex flex-col items-center gap-1.5 py-10 text-center text-sm text-sadn-ink-soft">
              <Package className="h-5 w-5 text-sadn-plum-300" strokeWidth={1.5} />
              {t('invLedgerEmpty')}
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
