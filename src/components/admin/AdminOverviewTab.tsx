'use client';

import { useEffect } from 'react';
import { AlertTriangle, Boxes, DollarSign, HeartHandshake, Receipt, TrendingUp, Truck } from 'lucide-react';
import { money } from '@/lib/sadn-store';
import { fmtDate, fmtTime } from '@/lib/i18n';
import { adminStatusMeta, type AdminKey, type AdminLang } from './admin-i18n';
import { useAdminData } from './useAdminData';
import { useOrderStages } from './useOrderStages';

type Stats = {
  productCount: number;
  categoryCount: number;
  orderCount: number;
  revenue: number;
  pendingCount: number;
  deliveredCount: number;
  cancelledCount: number;
  lowStock: number;
  avgOrderValue: number;
  statusCounts: Record<string, number>;
  recentOrders: Array<{
    id: string;
    number: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
  /** Loyalty report (round 29) — repeat-purchase KPIs grouped by phone. */
  loyalty: {
    uniqueCustomers: number;
    repeatCustomers: number;
    repeatRate: number;
    avgOrdersPerCustomer: number;
    repeatOrders: number;
  };
};

type TT = (k: AdminKey) => string;

export function AdminOverviewTab({ t, lang }: { t: TT; lang: AdminLang }) {
  const { data: stats, reload: load } = useAdminData<Stats | null>('/api/admin/stats', (d) => d.stats, null);

  // Status bars follow the owner's editable stage checklist (round 15).
  const { stages } = useOrderStages();

  /* Poll lightly so new storefront orders appear without a manual refresh. */
  useEffect(() => {
    const poll = setInterval(load, 30_000);
    return () => clearInterval(poll);
  }, [load]);

  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="shimmer h-24 rounded-none bg-white" />
        ))}
      </div>
    );
  }

  const kpis: Array<{ label: string; value: string; icon: typeof DollarSign; tone: string }> = [
    { label: t('revenue'), value: money(stats.revenue, lang), icon: DollarSign, tone: 'text-emerald-600 bg-emerald-50' },
    { label: t('totalOrders'), value: String(stats.orderCount), icon: Receipt, tone: 'text-sadn-plum-700 bg-sadn-plum-50' },
    { label: t('pendingOrders'), value: String(stats.pendingCount), icon: TrendingUp, tone: 'text-amber-600 bg-amber-50' },
    { label: t('avgOrder'), value: money(stats.avgOrderValue, lang), icon: Truck, tone: 'text-sky-600 bg-sky-50' },
    { label: t('productCount'), value: String(stats.productCount), icon: Boxes, tone: 'text-sadn-plum-700 bg-sadn-plum-50' },
    { label: t('lowStock'), value: String(stats.lowStock), icon: AlertTriangle, tone: stats.lowStock > 0 ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50' },
  ];

  const maxStatus = Math.max(1, ...stages.map((s) => stats.statusCounts[s.id] ?? 0));

  return (
    <div className="space-y-5">
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className="rounded-none border border-sadn-plum-100 bg-white p-4 shadow-sm shadow-sadn-plum-950/5 transition-shadow hover:shadow-md hover:shadow-sadn-plum-950/10"
            >
              <div className="flex items-center justify-between">
                <span className={`flex h-8 w-8 items-center justify-center rounded-none ${k.tone}`}>
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
              </div>
              <p className="price-num mt-3 text-2xl font-semibold text-sadn-ink">{k.value}</p>
              <p className="mt-0.5 text-xs text-sadn-ink-soft">{k.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Loyalty report (round 29) — the retention program's north-star */}
        <section className="rounded-none border border-sadn-plum-100 bg-white p-5">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-4.5 w-4.5 text-sadn-plum-700" strokeWidth={1.75} />
            <h2 className="font-sadn-display text-lg text-sadn-ink">{t('loyaltyTitle')}</h2>
          </div>
          <p className="mt-1 text-xs text-sadn-ink-soft">{t('loyaltyBody')}</p>
          <div className="mt-4 flex items-end gap-3">
            <p className="price-num text-4xl font-semibold text-sadn-plum-800">
              {stats.loyalty.repeatRate.toFixed(0)}%
            </p>
            <p className="pb-1 text-xs text-sadn-ink-soft">{t('loyaltyRate')}</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-none border border-sadn-plum-100 p-3">
              <p className="price-num text-lg font-semibold text-sadn-ink">{stats.loyalty.uniqueCustomers}</p>
              <p className="mt-0.5 text-[11px] text-sadn-ink-soft">{t('loyaltyUnique')}</p>
            </div>
            <div className="rounded-none border border-sadn-plum-100 p-3">
              <p className="price-num text-lg font-semibold text-sadn-ink">{stats.loyalty.repeatCustomers}</p>
              <p className="mt-0.5 text-[11px] text-sadn-ink-soft">{t('loyaltyRepeat')}</p>
            </div>
            <div className="rounded-none border border-sadn-plum-100 p-3">
              <p className="price-num text-lg font-semibold text-sadn-ink">
                {stats.loyalty.avgOrdersPerCustomer.toFixed(1)}
              </p>
              <p className="mt-0.5 text-[11px] text-sadn-ink-soft">{t('loyaltyAvgOrders')}</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-sadn-ink-soft">{t('loyaltyHint')}</p>
        </section>

        {/* Status distribution */}
        <section className="rounded-none border border-sadn-plum-100 bg-white p-5">
          <h2 className="font-sadn-display text-lg text-sadn-ink">{t('byStatus')}</h2>
          <div className="mt-4 space-y-3">
            {stages.map((s) => {
              const count = stats.statusCounts[s.id] ?? 0;
              const warn = s.tone === 'warn';
              return (
                <div key={s.id}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-sadn-ink">
                      <span className={`h-2 w-2 rounded-none ${warn ? 'bg-orange-500' : 'bg-sadn-plum-500'}`} />
                      {lang === 'ar' ? s.ar : s.en}
                    </span>
                    <span className="price-num text-sadn-ink-soft">{count}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-none bg-sadn-plum-50">
                    <div
                      className={`h-full rounded-none transition-all duration-700 ${warn ? 'bg-orange-500' : 'bg-sadn-plum-500'}`}
                      style={{ width: `${Math.max((count / maxStatus) * 100, count > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent orders */}
        <section className="rounded-none border border-sadn-plum-100 bg-white p-5">
          <h2 className="font-sadn-display text-lg text-sadn-ink">{t('recentOrders')}</h2>
          <ul className="mt-3 divide-y divide-sadn-plum-50">
            {stats.recentOrders.length === 0 && (
              <li className="py-8 text-center text-sm text-sadn-ink-soft">{t('noResults')}</li>
            )}
            {stats.recentOrders.map((o) => {
              const stage = stages.find((s) => s.id === o.status);
              const warn = stage?.tone === 'warn';
              const chipClass = stage
                ? warn
                  ? 'bg-orange-50 text-orange-700 ring-orange-200'
                  : 'bg-sadn-plum-50 text-sadn-plum-700 ring-sadn-plum-200'
                : `${adminStatusMeta(o.status).className}`;
              return (
                <li key={o.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-sadn-ink">
                      <span dir="ltr" className="font-mono text-[13px]">{o.number}</span>
                      <span className="ms-2 font-normal text-sadn-ink-soft">{o.customerName}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-sadn-ink-soft">
                      {fmtDate(o.createdAt, lang)} · {fmtTime(o.createdAt, lang)}
                    </p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-none px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${chipClass}`}>
                    {stage ? (lang === 'ar' ? stage.ar : stage.en) : t(adminStatusMeta(o.status).labelKey)}
                  </span>
                  <span className="price-num w-16 text-end text-sm font-semibold text-sadn-ink">
                    {money(o.total, lang)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
