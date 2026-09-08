'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import {
  cartSubtotal,
  money,
  useSadnStore,
  type CartItem,
  type ProductDTO,
} from '@/lib/sadn-store';
import { navigate } from '@/lib/router';
import Link from 'next/link';
import { hapticConfirm, hapticTap } from '@/lib/haptic';
import { applyPromo } from '@/lib/promos';
import { couponDiscount } from '@/lib/coupons';
import { shippingDue } from '@/lib/pricing';
import type { StoreConfig } from '@/lib/store-settings';
import { localName, useLang, useT } from '@/lib/i18n';
import { OrderSummary, QtyStepper } from './primitives';
import { CheckoutSheet } from './CheckoutSheet';
import { useChromeHandlers } from './chrome-hooks';
import { PromoPanel } from './PromoPanel';
import { EmptyBag } from './EmptyBag';

type OrderDraft = {
  items: CartItem[];
  subtotal: number;
  discount: number;
  promoCode: string | null;
  shipping: number;
};

/**
 * The bag (round 16) — the cart concept is now "الشنطة / the Bag": real
 * route /bag, bag wording everywhere, square edges, side-by-side product
 * cards and quieter negative space (less is more).
 */
export function BagScreen({
  products,
  config,
}: {
  products: ProductDTO[];
  config: StoreConfig | null;
}) {
  const t = useT();
  const lang = useLang();
  const { onAdd, onOpen } = useChromeHandlers();
  const cart = useSadnStore((s) => s.cart);
  const setQty = useSadnStore((s) => s.setQty);
  const clearCart = useSadnStore((s) => s.clearCart);
  // Snapshot totals when checkout opens — survives the bag clearing on order placement
  const [order, setOrder] = useState<OrderDraft | null>(null);
  const promo = useSadnStore((s) => s.promo);
  const setPromo = useSadnStore((s) => s.setPromo);

  const promoCfg = config?.promo ?? null;
  const shippingFee = config?.shippingFee ?? 60;
  const freeThreshold = config?.freeShippingThreshold ?? 0;

  const subtotal = cartSubtotal(cart);
  // Round 29 math — a validated dashboard coupon (kind/value persisted in
  // the store) takes precedence; legacy single-promo codes still work.
  const couponOff =
    promo && (promo.kind === 'percent' || promo.kind === 'fixed') && typeof promo.value === 'number'
      ? Math.min(couponDiscount(promo.kind, promo.value, subtotal), subtotal)
      : 0;
  const promoCheck = promo ? applyPromo(promo.code, subtotal, promoCfg) : null;
  const promoOff = promoCheck?.ok === true ? Math.min(promoCheck.discount, subtotal) : 0;
  const discount = Math.max(couponOff, promoOff);
  // Flat fee, waived at/above the owner's free-shipping threshold (round 29).
  const shipping = subtotal > 0 ? shippingDue(shippingFee, subtotal, freeThreshold) : 0;
  const total = Math.max(subtotal - discount + shipping, 0);

  // A persisted LEGACY code the owner disabled/renamed is cleared quietly.
  // Coupon-sourced chips stay (they re-validate server-side at order time).
  useEffect(() => {
    if (
      promo &&
      promo.source !== 'coupon' &&
      promoCheck &&
      !promoCheck.ok &&
      promoCheck.reason === 'invalid'
    ) {
      setPromo(null);
    }
  }, [promo, promoCheck, setPromo]);

  const closeCheckout = () => setOrder(null);
  const checkoutDone = () => {
    setOrder(null);
    navigate('/');
  };

  const sheet = order && (
    <CheckoutSheet
      items={order.items}
      subtotal={order.subtotal}
      discount={order.discount}
      promoCode={order.promoCode}
      shipping={order.shipping}
      config={config}
      onClose={closeCheckout}
      onOrderPlaced={clearCart}
      onDone={checkoutDone}
    />
  );

  /** Line click → the product's own URL with an edit hint (round 13). */
  const openLine = (slug: string, id: string) => {
    hapticTap();
    navigate(`/product/${slug}?edit=${encodeURIComponent(id)}`);
  };

  const emptyView = (
    <EmptyBag products={products} onAdd={onAdd} onOpen={onOpen} />
  );

  const mainView = (
    <div className="max-w-7xl mx-auto px-5 lg:px-8 pb-16 pt-8 lg:pt-12">
      <div className="flex items-end justify-between border-b border-sadn-plum-100 pb-4">
        <h1 className="font-sadn-display text-4xl lg:text-5xl text-sadn-ink">{t('yourBag')}</h1>
        <button
          type="button"
          onClick={clearCart}
          className="text-xs uppercase tracking-luxe-tight text-sadn-ink-soft underline-offset-4 transition-colors hover:text-sadn-plum-800 hover:underline"
        >
          {t('clear')}
        </button>
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-12 lg:items-start mt-6">
        {/* Line items — 7 columns on desktop */}
        <div className="lg:col-span-7">
          <ul className="divide-y divide-sadn-plum-50">
            {cart.map((i) => (
              <li
                key={i.id ?? `${i.slug}__${i.size}`}
                className="flex gap-4 py-5"
              >
                <button
                  type="button"
                  data-cart-line
                  onClick={() => i.id && openLine(i.slug, i.id)}
                  className="relative h-[104px] w-20 lg:h-[120px] lg:w-24 shrink-0 overflow-hidden rounded-none bg-sadn-stone"
                  aria-label={localName(i, lang)}
                >
                  <Image
                    src={i.image || '/products/hero-abaya.png'}
                    alt={i.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => i.id && openLine(i.slug, i.id)}
                      className="block max-w-full truncate text-start text-sm lg:text-base font-medium text-sadn-ink underline-offset-4 hover:underline"
                    >
                      {localName(i, lang)}
                    </button>
                    <button
                      type="button"
                      aria-label={t('ariaRemove', { name: localName(i, lang) })}
                      onClick={() => setQty(i.slug, i.size, 0)}
                      className="tap-target flex h-9 w-9 shrink-0 items-center justify-center rounded-none border border-sadn-plum-100 text-sadn-ink-soft transition-colors hover:border-sadn-plum-300 hover:bg-sadn-plum-50 hover:text-sadn-plum-800 active:scale-90"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-sadn-ink-soft">
                    {i.color
                      ? t('sizeColor', { size: i.size, color: i.color })
                      : t('sizeNoColor', { size: i.size })}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <QtyStepper
                      size="sm"
                      value={i.qty}
                      onDecrement={() => setQty(i.slug, i.size, i.qty - 1)}
                      onIncrement={() => setQty(i.slug, i.size, i.qty + 1)}
                      decLabel={t('ariaQtyDec')}
                      incLabel={t('ariaQtyInc')}
                    />
                    <p className="price-num text-sm lg:text-base font-semibold text-sadn-plum-800">
                      {money(i.price * i.qty, lang)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Sticky Summary & Checkout Column — 5 columns on desktop */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 lg:border lg:border-sadn-plum-100 lg:bg-sadn-plum-50/20 lg:p-6 mt-8 lg:mt-0">
          <PromoPanel subtotal={subtotal} promoCfg={promoCfg} />

          <div className="mt-6 border-t border-sadn-plum-100 pt-6">
            <OrderSummary
              subtotal={subtotal}
              discount={discount}
              shipping={shipping}
              total={total}
            />
            <button
              type="button"
              onClick={() => {
                hapticConfirm();
                setOrder({
                  items: [...cart],
                  subtotal,
                  discount,
                  promoCode: promo?.code ?? null,
                  shipping,
                });
              }}
              className="btn-primary mt-6 h-13 w-full py-3.5 text-sm font-medium tracking-wide shadow-sm hover:shadow transition-all"
            >
              {t('checkout')}
            </button>
            <Link
              href="/shop"
              className="mt-4 block w-full text-center text-xs uppercase tracking-luxe-tight text-sadn-ink-soft transition-colors hover:text-sadn-plum-800"
            >
              {t('continueShopping')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {cart.length === 0 ? emptyView : mainView}
      {sheet}
    </div>
  );
}
