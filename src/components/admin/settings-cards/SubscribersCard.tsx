'use client';

import { BellRing, Check, Copy, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { copyToClipboard } from '@/lib/ui';
import type { AdminKey, AdminLang } from '../admin-i18n';
import { RowDeleteButton } from '../kit';
import { useAdminData } from '../useAdminData';

type TT = (k: AdminKey) => string;

type SubscriberRow = {
  id: string;
  phone: string;
  name: string;
  source: string; // "checkout" | "thankyou"
  active: boolean;
  note: string;
  createdAt: string;
};

/**
 * WhatsApp broadcast list (round 31, research item 6 — "سيبي رقمك").
 * Numbers arrive by themselves from the checkout checkbox and the
 * thank-you page card; the owner mutes/unmutes, deletes, or copies the
 * whole active list straight into a WhatsApp broadcast.
 */
export function SubscribersCard({ t, lang }: { t: TT; lang: AdminLang }) {
  const { data: subs, setData: setSubs } = useAdminData<SubscriberRow[]>(
    '/api/admin/subscribers',
    (d) => d.subscribers,
    []
  );

  const activeCount = subs.filter((s) => s.active).length;

  const toggleActive = async (s: SubscriberRow, active: boolean) => {
    setSubs((prev) => prev.map((x) => (x.id === s.id ? { ...x, active } : x)));
    try {
      const res = await fetch('/api/admin/subscribers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!(res.ok && data.ok)) throw new Error(data.error);
    } catch {
      setSubs((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: !active } : x)));
      toast.error(t('errorToast'));
    }
  };

  const remove = async (s: SubscriberRow) => {
    if (!window.confirm(t('confirmDelete'))) return;
    try {
      const res = await fetch(`/api/admin/subscribers?id=${encodeURIComponent(s.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        toast.success(t('deletedToast'));
        setSubs((prev) => prev.filter((x) => x.id !== s.id));
      } else {
        toast.error(data.error ?? t('errorToast'));
      }
    } catch {
      toast.error(t('errorToast'));
    }
  };

  const copyAll = async () => {
    const list = subs
      .filter((s) => s.active)
      .map((s) => s.phone)
      .join(', ');
    if (!list) return;
    if (!(await copyToClipboard(list))) {
      toast.error(t('errorToast'));
      return;
    }
    toast.success(t('subsCopied'));
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });

  return (
    <section className="rounded-none border border-sadn-plum-100 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-sadn-plum-50 text-sadn-plum-700">
            <BellRing className="h-4.5 w-4.5" strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="font-sadn-display text-lg text-sadn-ink">{t('subsTitle')}</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-sadn-ink-soft">{t('subsBody')}</p>
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-none bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              <Phone className="h-3 w-3" />
              {activeCount} {t('subsCountActive')}
            </p>
          </div>
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => void copyAll()}
            className="press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-none bg-sadn-plum-800 px-3 text-xs font-medium text-white transition-colors hover:bg-sadn-plum-700"
          >
            <Copy className="h-3.5 w-3.5" />
            {t('subsCopyAll')}
          </button>
        )}
      </div>

      <ul className="mt-4 max-h-96 divide-y divide-sadn-plum-50 overflow-y-auto sadn-sheet-scroll">
        {subs.map((s) => (
          <li key={s.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <span dir="ltr" className="font-mono text-[13px] font-semibold tracking-wide text-sadn-plum-800">
                  {s.phone}
                </span>
                <span className="rounded-none bg-sadn-plum-50 px-2 py-0.5 text-[10px] font-semibold text-sadn-plum-700">
                  {s.source === 'thankyou' ? t('subsSourceThankyou') : t('subsSourceCheckout')}
                </span>
                {!s.active && (
                  <span className="rounded-none bg-sadn-plum-950/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                    {t('subsMuted')}
                  </span>
                )}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-sadn-ink-soft">
                {s.name && `${s.name} · `}
                {fmtDate(s.createdAt)}
              </p>
            </div>
            <Switch
              checked={s.active}
              onCheckedChange={(v) => void toggleActive(s, v)}
              aria-label={t('subsActiveToggle')}
            />
            <RowDeleteButton
              label={t('delete')}
              onClick={() => void remove(s)}
              size={9}
              iconSize="md"
              tone="red"
              tapTarget={false}
              className="shrink-0"
            />
          </li>
        ))}
        {subs.length === 0 && (
          <li className="py-6 text-center text-xs leading-relaxed text-sadn-ink-soft">{t('subsNone')}</li>
        )}
      </ul>
    </section>
  );
}
