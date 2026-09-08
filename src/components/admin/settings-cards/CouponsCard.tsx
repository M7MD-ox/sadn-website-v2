'use client';

import { useState } from 'react';
import { BadgePercent, Check, Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { money } from '@/lib/sadn-store';
import type { CouponRow } from '@/lib/coupons';
import type { AdminKey, AdminLang } from '../admin-i18n';
import { RowDeleteButton } from '../kit';
import { useAdminData } from '../useAdminData';
import { inputCls } from './shared';

type TT = (k: AdminKey) => string;

const EMPTY_DRAFT = {
  code: '',
  kind: 'percent' as 'percent' | 'fixed',
  value: 10,
  minSubtotal: 0,
  usageLimit: '',
  expiresAt: '',
  note: '',
};

/**
 * Discount coupons (round 29) — dashboard CRUD for the retention-program
 * codes: thank-you codes, winback, VIP. Sits next to the legacy promo card;
 * the storefront validates codes server-side and POST /api/orders burns
 * one use per redeemed coupon.
 */
export function CouponsCard({ t, lang }: { t: TT; lang: AdminLang }) {
  const { data: coupons, setData: setCoupons } = useAdminData<CouponRow[]>(
    '/api/admin/coupons',
    (d) => d.coupons,
    []
  );
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ ...EMPTY_DRAFT });
  const [busy, setBusy] = useState(false);

  const valueLabel = (c: CouponRow) =>
    c.kind === 'percent'
      ? lang === 'ar'
        ? `خصم ${c.value}٪`
        : `${c.value}% off`
      : lang === 'ar'
        ? `خصم ${money(c.value, lang)}`
        : `${money(c.value, lang)} off`;

  const add = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          usageLimit: draft.usageLimit === '' ? null : Number(draft.usageLimit),
          expiresAt: draft.expiresAt || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(t('couponSaved'));
        setCoupons((prev) => [data.coupon, ...prev]);
        setDraft({ ...EMPTY_DRAFT });
        setAdding(false);
      } else {
        toast.error(data.errors ? Object.values(data.errors)[0] : data.error);
      }
    } catch {
      toast.error(t('errorToast'));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (c: CouponRow, active: boolean) => {
    setCoupons((prev) => prev.map((x) => (x.id === c.id ? { ...x, active } : x)));
    try {
      const res = await fetch(`/api/admin/coupons/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!(res.ok && data.ok)) throw new Error(data.error);
    } catch {
      setCoupons((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: !active } : x)));
      toast.error(t('errorToast'));
    }
  };

  const remove = async (c: CouponRow) => {
    if (!window.confirm(t('confirmDelete'))) return;
    try {
      const res = await fetch(`/api/admin/coupons/${c.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        toast.success(t('deletedToast'));
        setCoupons((prev) => prev.filter((x) => x.id !== c.id));
      } else {
        toast.error(data.error ?? t('errorToast'));
      }
    } catch {
      toast.error(t('errorToast'));
    }
  };

  const usageText = (c: CouponRow) =>
    c.usageLimit === null
      ? lang === 'ar'
        ? `استُخدم ${c.usedCount} مرة`
        : `used ${c.usedCount}×`
      : lang === 'ar'
        ? `استُخدم ${c.usedCount} من ${c.usageLimit}`
        : `used ${c.usedCount}/${c.usageLimit}`;

  return (
    <section className="rounded-none border border-sadn-plum-100 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-sadn-plum-50 text-sadn-plum-700">
            <BadgePercent className="h-4.5 w-4.5" strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="font-sadn-display text-lg text-sadn-ink">{t('couponsTitle')}</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-sadn-ink-soft">{t('couponsBody')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setAdding((v) => !v);
            setDraft({ ...EMPTY_DRAFT });
          }}
          className="press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-none bg-sadn-plum-800 px-3 text-xs font-medium text-white transition-colors hover:bg-sadn-plum-700"
        >
          {adding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" strokeWidth={2} />}
          {t('couponNew')}
        </button>
      </div>

      {adding && (
        <div className="mt-4 rounded-none border border-dashed border-sadn-plum-200 bg-sadn-plum-50/30 p-4">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-sadn-ink-soft">{t('couponCodeLabel')}</span>
              <input
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                dir="ltr"
                maxLength={24}
                placeholder="THANKYOU10"
                className={`${inputCls} h-9 uppercase tracking-wider`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-sadn-ink-soft">{t('couponKindLabel')}</span>
              <select
                value={draft.kind}
                onChange={(e) => setDraft({ ...draft, kind: e.target.value as 'percent' | 'fixed' })}
                className={`${inputCls} h-9`}
              >
                <option value="percent">{t('couponKindPercent')}</option>
                <option value="fixed">{t('couponKindFixed')}</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-sadn-ink-soft">
                {draft.kind === 'percent' ? t('couponPercentLabel') : t('couponAmountLabel')}
              </span>
              <input
                type="number"
                min={1}
                max={draft.kind === 'percent' ? 90 : 100000}
                value={draft.value}
                onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })}
                dir="ltr"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-sadn-ink-soft">{t('couponMinLabel')}</span>
              <input
                type="number"
                min={0}
                value={draft.minSubtotal}
                onChange={(e) => setDraft({ ...draft, minSubtotal: Number(e.target.value) })}
                dir="ltr"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-sadn-ink-soft">{t('couponLimitLabel')}</span>
              <input
                type="number"
                min={1}
                value={draft.usageLimit}
                onChange={(e) => setDraft({ ...draft, usageLimit: e.target.value })}
                placeholder={t('couponLimitPh')}
                dir="ltr"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-sadn-ink-soft">{t('couponExpiresLabel')}</span>
              <input
                type="date"
                value={draft.expiresAt}
                onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })}
                dir="ltr"
                className={inputCls}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] font-medium text-sadn-ink-soft">{t('couponNoteLabel')}</span>
              <input
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                maxLength={140}
                placeholder={t('couponNotePh')}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                className={inputCls}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => void add()}
            disabled={busy || !draft.code.trim() || !draft.value}
            className="mt-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-none bg-sadn-plum-800 px-4 text-xs font-medium text-white transition-colors hover:bg-sadn-plum-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
            {t('save')}
          </button>
        </div>
      )}

      <ul className="mt-4 divide-y divide-sadn-plum-50">
        {coupons.map((c) => (
          <li key={c.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <span dir="ltr" className="font-mono text-[13px] font-semibold tracking-wider text-sadn-plum-800">
                  {c.code}
                </span>
                <span className="rounded-none bg-sadn-plum-50 px-2 py-0.5 text-[10px] font-semibold text-sadn-plum-700">
                  {valueLabel(c)}
                </span>
                {!c.active && (
                  <span className="rounded-none bg-sadn-plum-950/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                    {t('hidden')}
                  </span>
                )}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-sadn-ink-soft">
                {usageText(c)}
                {c.minSubtotal > 0 &&
                  ` · ${lang === 'ar' ? 'الحد الأدنى' : 'min'} ${money(c.minSubtotal, lang)}`}
                {c.note && ` · ${c.note}`}
              </p>
            </div>
            <Switch
              checked={c.active}
              onCheckedChange={(v) => void toggleActive(c, v)}
              aria-label={t('couponActive')}
            />
            <RowDeleteButton
              label={t('delete')}
              onClick={() => void remove(c)}
              size={9}
              iconSize="md"
              tone="red"
              tapTarget={false}
              className="shrink-0"
            />
          </li>
        ))}
        {coupons.length === 0 && (
          <li className="py-6 text-center text-xs text-sadn-ink-soft">{t('couponsNone')}</li>
        )}
      </ul>
    </section>
  );
}
