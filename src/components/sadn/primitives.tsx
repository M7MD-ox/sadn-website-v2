'use client';

import { Minus, Plus } from 'lucide-react';
import { money } from '@/lib/sadn-store';
import { useLang, useT } from '@/lib/i18n';

/**
 * Storefront primitives (round 18-3a1) — the tiny constants and widgets that
 * every screen repeated verbatim: the editorial eyebrow labels, the ±qty
 * stepper, and the order summary rows. Rendered output is byte-for-byte the
 * pre-refactor markup; this file only deduplicates the source.
 */

/** Editorial eyebrow (10px, luxe tracking) — section labels across the
 * home / shop / bag screens. Pair with `eyebrow-rule` where the hairline
 * flourish is wanted. */
export const EYEBROW = 'text-[10px] font-medium uppercase tracking-luxe text-sadn-plum-600';

/** Compact form-group eyebrow (11px, tight tracking) — checkout field labels. */
export const EYEBROW_SM = 'text-[11px] font-medium uppercase tracking-luxe-tight text-sadn-plum-600';

/* ── Qty stepper ────────────────────────────────────────────────────────────
 * Product page (md): p-1 frame, free-size buttons, 16px glyphs, w-6 value.
 * Bag lines (sm):    p-0.5 frame, 8×8 hit squares, 14px glyphs, w-5 value.
 * The ± handlers stay in the caller (product clamps 1–9 locally; the bag
 * writes to the store, where qty ≤ 0 removes the line). */

const QTY_STYLES = {
  md: { wrap: 'p-1', btn: '', icon: 'h-4 w-4', value: 'w-6' },
  sm: { wrap: 'p-0.5', btn: 'h-8 w-8', icon: 'h-3.5 w-3.5', value: 'w-5' },
} as const;

export function QtyStepper({
  size = 'md',
  value,
  onDecrement,
  onIncrement,
  decLabel,
  incLabel,
}: {
  size?: keyof typeof QTY_STYLES;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  /** Localized aria labels — each screen passes its own t('ariaQty…'). */
  decLabel: string;
  incLabel: string;
}) {
  const s = QTY_STYLES[size];
  return (
    <div className={`flex items-center gap-1 rounded-none border border-sadn-plum-200 ${s.wrap}`}>
      <button
        type="button"
        aria-label={decLabel}
        onClick={onDecrement}
        className={`tap-target flex ${s.btn} items-center justify-center rounded-none text-sadn-ink transition-colors hover:bg-sadn-plum-50 active:scale-90`}
      >
        <Minus className={s.icon} />
      </button>
      <span className={`${s.value} text-center text-sm font-semibold`}>{value}</span>
      <button
        type="button"
        aria-label={incLabel}
        onClick={onIncrement}
        className={`tap-target flex ${s.btn} items-center justify-center rounded-none text-sadn-ink transition-colors hover:bg-sadn-plum-50 active:scale-90`}
      >
        <Plus className={s.icon} />
      </button>
    </div>
  );
}

/* ── Order summary rows ─────────────────────────────────────────────────────
 * The subtotal / conditional-discount / free-shipping-swap / hairline / bold
 * total stack shared by the bag and the checkout sheet. Wrappers stay with
 * the callers (the bag uses a hairline-top block, checkout a plum-tinted
 * box); this renders only the rows, in each surface's exact order/rhythm. */

export function OrderSummary({
  subtotal,
  discount,
  shipping,
  total,
  variant = 'bag',
  itemsCount,
  promoCode = null,
}: {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  /** 'bag' = /bag rhythm (mt-2 rows, my-4 hairline, discount before shipping)
   *  · 'checkout' = sheet rhythm (mt-1.5 rows, my-3 hairline, shipping first). */
  variant?: 'bag' | 'checkout';
  /** Checkout shows the "N items" suffix next to the subtotal label. */
  itemsCount?: number;
  /** Checkout appends "· CODE" to the discount row when a promo is active. */
  promoCode?: string | null;
}) {
  const t = useT();
  const lang = useLang();
  const gap = variant === 'checkout' ? 'mt-1.5' : 'mt-2';

  const subtotalRow = (
    <div className="flex justify-between text-sm text-sadn-ink-soft">
      <span>
        {t('subtotal')}
        {itemsCount !== undefined && (
          <span className="ms-1.5 text-xs">
            {itemsCount === 1 ? t('summaryItemsOne') : t('summaryItems', { n: itemsCount })}
          </span>
        )}
      </span>
      <span className="text-sadn-ink">{money(subtotal, lang)}</span>
    </div>
  );

  const discountRow =
    discount > 0 ? (
      <div className={`${gap} flex justify-between text-sm text-sadn-plum-700`}>
        <span>
          {t('discount')}
          {promoCode ? ` · ${promoCode}` : ''}
        </span>
        <span>−{money(discount, lang)}</span>
      </div>
    ) : null;

  const shippingRow = (
    <div className={`${gap} flex justify-between text-sm text-sadn-ink-soft`}>
      <span>{t('shippingLabel')}</span>
      <span className={shipping === 0 ? 'font-medium text-sadn-plum-700' : 'text-sadn-ink'}>
        {shipping === 0 ? t('free') : money(shipping, lang)}
      </span>
    </div>
  );

  return (
    <>
      {subtotalRow}
      {variant === 'checkout' ? (
        <>
          {shippingRow}
          {discountRow}
        </>
      ) : (
        <>
          {discountRow}
          {shippingRow}
        </>
      )}
      <div className={`${variant === 'checkout' ? 'my-3' : 'my-4'} h-px bg-sadn-plum-100`} />
      <div className="flex justify-between text-base font-semibold text-sadn-ink">
        <span>{t('total')}</span>
        <span>{money(total, lang)}</span>
      </div>
    </>
  );
}
