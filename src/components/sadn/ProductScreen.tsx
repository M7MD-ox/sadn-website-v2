'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Ruler } from 'lucide-react';
import { toast } from 'sonner';
import { navigate, routeBack } from '@/lib/router';
import { QtyStepper } from './primitives';
import { SizeGuideSheet } from './SizeGuideSheet';
import { FitFeedbackChips } from './FitFeedbackChips';
import { useChromeHandlers } from './chrome-hooks';
import { useProductMotion } from './useProductMotion';
import { ProductGallery } from './ProductGallery';
import { ProductSections } from './ProductSections';
import { ProductFaq } from './ProductFaq';
import {
  money,
  useSadnStore,
  type ProductDTO,
} from '@/lib/sadn-store';
import { hapticConfirm } from '@/lib/haptic';
import { catKey, localName, useLang, useT } from '@/lib/i18n';
import type { ProductSection, SizeRow } from '@/lib/store-settings';

type Props = {
  product: ProductDTO;
  related: ProductDTO[];
  /** Bag line being edited via /product/<slug>?edit=<id> (round 13) —
   * resolved client-side from the persisted bag store. */
  editId?: string;
  /** Dashboard-controlled collapsible sections (round 16). */
  sections?: ProductSection[];
  /** Dashboard-controlled cm size guide rows (round 16). */
  sizeGuide?: SizeRow[];
};

/**
 * Product screen (round 16) — a real server-rendered page wrapped in an
 * app-style sheet. Collapsible sections are fully owner-controlled from the
 * dashboard (show/hide, titles, bodies); size + colour chips respect the
 * dashboard's per-product visibility toggles (hiddenSizes / colors.hidden).
 */
export function ProductScreen({ product, related, editId = '', sections = [], sizeGuide = [] }: Props) {
  const t = useT();
  const lang = useLang();
  const rtl = lang === 'ar';
  const { onAdd, onOpen } = useChromeHandlers();
  const close = () => routeBack('/');

  // Dashboard visibility toggles (round 16): hidden sizes + hidden colours
  // disappear from the storefront entirely — the owner manages stock this way.
  const visibleSizes = product.sizes.filter(
    (s) => !(product.hiddenSizes ?? []).includes(s)
  );
  const visibleColors = product.colors.filter((c) => !c.hidden);

  // The bag line being edited (client state — the bag lives in localStorage).
  const cartLines = useSadnStore((s) => s.cart);
  const editLine = editId
    ? cartLines.find((l) => l.id === editId) ?? null
    : null;

  // Cart-edit mode: preselect the line's size/colour/qty (round 13)
  const [sizePick, setSizePick] = useState<string | null>(editLine?.size ?? null);
  const [colorPick, setColorPick] = useState<string | null>(editLine?.color ?? null);
  const [qty, setQty] = useState(editLine?.qty ?? 1);
  const [slide, setSlide] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Entrance / Escape / slide-out motion — extracted verbatim (18-3a2).
  const { requestClose, closeInstant } = useProductMotion(
    rootRef,
    contentRef,
    rtl,
    product.slug,
    close
  );

  // Live-sync safe selection: derived state — if the picked size/colour no
  // longer exists on the fresh product, fall back without cascading renders.
  const size =
    sizePick && visibleSizes.includes(sizePick)
      ? sizePick
      : visibleSizes.includes('M')
        ? 'M'
        : visibleSizes[0] ?? 'M';
  const color =
    colorPick && visibleColors.some((c) => c.name === colorPick)
      ? colorPick
      : visibleColors[0]?.name ?? '';
  const setSize = setSizePick;
  const setColor = setColorPick;

  // Record in recently-viewed history (most recent first)
  useEffect(() => {
    useSadnStore.getState().pushRecent(product.slug);
  }, [product.slug]);

  const handleAdd = () => {
    // ── Bag-edit flow (round 13) ── update the line in place, land on /bag.
    if (editLine) {
      useSadnStore.getState().updateCartLine(editLine.id, { size, color, qty });
      hapticConfirm();
      toast.success(t('bagUpdated'));
      closeInstant();
      navigate('/bag');
      return;
    }
    const imgs = galleryRef.current?.querySelectorAll('img');
    const source = imgs?.[slide];
    onAdd(product, {
      size,
      color,
      qty,
      // instanceof guard (18-3a1) — a non-HTMLElement skips the fly-to-bag
      // ghost exactly like a missing element would.
      source: source instanceof HTMLElement ? source : null,
    });
    requestClose();
  };

  const save = product.compareAtPrice
    ? product.compareAtPrice - product.price
    : 0;

  return (
    <div
      ref={rootRef}
      className="sadn-sheet-scroll fixed inset-0 z-60 mx-auto w-full max-w-[430px] overflow-y-auto bg-sadn-canvas will-change-transform lg:static lg:inset-auto lg:z-auto lg:max-w-7xl lg:overflow-visible lg:bg-transparent lg:px-8 lg:pt-6 lg:pb-16"
      role="region"
      aria-label={`${localName(product, lang)}`}
    >
      {/* ── Desktop Breadcrumbs ── */}
      <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-2 text-xs uppercase tracking-luxe-tight text-sadn-ink-soft mb-8">
        <Link href="/" className="hover:text-sadn-plum-800 transition-colors">
          {t('navHome')}
        </Link>
        <span className="text-sadn-plum-200">/</span>
        <Link href="/shop" className="hover:text-sadn-plum-800 transition-colors">
          {t('navShop')}
        </Link>
        <span className="text-sadn-plum-200">/</span>
        <span className="text-sadn-ink font-medium truncate max-w-sm">
          {localName(product, lang)}
        </span>
      </nav>

      {/* ── Main Product Grid (Desktop 2-Col / Mobile Single Col) ── */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-12 lg:items-start">
        {/* ── Gallery (7 cols on desktop) ── */}
        <div className="lg:col-span-7">
          <ProductGallery
            galleryRef={galleryRef}
            images={product.images}
            name={localName(product, lang)}
            onSlideChange={setSlide}
            onRequestClose={requestClose}
          />
        </div>

        {/* ── Content & Purchasing Panel (5 cols sticky on desktop) ── */}
        <div ref={contentRef} className="px-5 pb-32 pt-7 lg:px-0 lg:py-0 lg:col-span-5 lg:sticky lg:top-24">
          <div data-rise className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-luxe text-sadn-plum-600">
                {t(catKey(product.category))}
              </p>
              <h1 className="mt-1.5 font-sadn-display text-[28px] lg:text-[32px] leading-tight text-sadn-ink">
                {localName(product, lang)}
              </h1>
            </div>
            <div className="shrink-0 text-end">
              <p
                className={
                  product.compareAtPrice
                    ? 'price-num price-sale text-[22px] lg:text-[24px]'
                    : 'text-xl lg:text-2xl font-semibold text-sadn-plum-800'
                }
              >
                {money(product.price, lang)}
              </p>
              {product.compareAtPrice && (
                <p className="price-strike">{money(product.compareAtPrice, lang)}</p>
              )}
              {save > 0 && (
                <p className="mt-1 inline-block rounded-none bg-sadn-plum-50 px-2 py-0.5 text-[10px] font-semibold text-sadn-plum-700">
                  {t('saveBadge', { money: money(save, lang) })}
                </p>
              )}
            </div>
          </div>

          {product.tagline && (
            <p
              data-rise
              className="mt-4 font-sadn-display text-[15px] leading-relaxed text-sadn-ink"
            >
              {product.tagline}
            </p>
          )}

          {product.stock > 0 && product.stock <= 15 && (
            <p
              data-rise
              className="mt-4 inline-block rounded-none bg-sadn-plum-50 px-3 py-1 text-[11px] font-medium uppercase tracking-luxe-tight text-sadn-plum-700"
            >
              {t('onlyLeft', { n: product.stock })}
            </p>
          )}

          {/* Size — dashboard-hidden sizes never render */}
          {visibleSizes.length > 0 && (
            <div data-rise className="mt-6">
              <div className="flex items-baseline justify-between">
                <p className="text-[10px] uppercase tracking-luxe text-sadn-plum-600">
                  {t('size')}
                </p>
                <button
                  type="button"
                  onClick={() => setGuideOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-none bg-sadn-plum-50 px-3 py-1.5 text-[11px] font-semibold text-sadn-plum-800 transition-colors hover:bg-sadn-plum-100"
                >
                  <Ruler className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                  {t('sizeGuide')}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {visibleSizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    aria-pressed={size === s}
                    className={`h-10 min-w-10 rounded-[2px] border px-3 text-xs font-medium transition-all active:scale-95 ${
                      size === s
                        ? 'border-sadn-plum-800 bg-sadn-plum-800 text-white'
                        : 'border-sadn-plum-200 text-sadn-ink hover:border-sadn-plum-800'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <FitFeedbackChips slug={product.slug} />
            </div>
          )}

          {/* Colour — dashboard-hidden colours never render */}
          {visibleColors.length > 0 && (
            <div data-rise className="mt-4">
              <p className="text-[10px] uppercase tracking-luxe text-sadn-plum-600">
                {t('colour')}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {visibleColors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    aria-label={c.name}
                    aria-pressed={color === c.name}
                    onClick={() => setColor(c.name)}
                    className={`h-10 w-10 rounded-[2px] transition-all active:scale-90 ${
                      color === c.name
                        ? 'ring-1 ring-sadn-plum-800 ring-offset-2 ring-offset-sadn-canvas'
                        : ''
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Qty */}
          <div data-rise className="mt-5 flex items-center gap-3">
            <QtyStepper
              value={qty}
              onDecrement={() => setQty((q) => Math.max(1, q - 1))}
              onIncrement={() => setQty((q) => Math.min(9, q + 1))}
              decLabel={t('ariaQtyDec')}
              incLabel={t('ariaQtyInc')}
            />
            <p className="text-xs text-sadn-ink-soft">
              {t('qtyTotal', { money: money(product.price * qty, lang) })}
            </p>
          </div>

          {/* ── Desktop Inline Add-to-Bag Button ── */}
          <div data-rise className="hidden lg:block mt-6">
            <button
              type="button"
              onClick={handleAdd}
              className="btn-primary flex h-13 w-full items-center justify-center gap-2 py-3.5 text-sm font-medium tracking-wide shadow-sm hover:shadow transition-all"
            >
              {editLine ? (
                t('updateBagBtn', { money: money(product.price * qty, lang) })
              ) : (
                t('addToBagBtn', { money: money(product.price * qty, lang) })
              )}
              <span className="text-white/70">· {size}</span>
            </button>
          </div>

          {/* Accordions */}
          <div data-rise className="mt-6">
            <ProductSections
              product={product}
              sections={sections}
              sizeGuide={sizeGuide}
              onOpenSizeGuide={() => setGuideOpen(true)}
            />
          </div>

          {/* Pre-purchase FAQ */}
          <div data-rise className="mt-4">
            <ProductFaq />
          </div>
        </div>
      </div>

      {/* ── Related products (Desktop: 4-col grid, Mobile: snap strip) ── */}
      {related.length > 0 && (
        <div data-rise className="mt-12 lg:mt-20 border-t border-sadn-plum-100 pt-10 px-5 lg:px-0">
          <h2 className="font-sadn-display text-xl lg:text-2xl text-sadn-ink">
            {t('youMayLike')}
          </h2>
          {/* Mobile snap scroller */}
          <div className="lg:hidden no-scrollbar -mx-5 mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2">
            {related.map((r) => (
              <button
                key={r.slug}
                type="button"
                onClick={() => {
                  onOpen(r);
                  requestAnimationFrame(() =>
                    rootRef.current?.scrollTo({ top: 0 })
                  );
                }}
                className="group w-40 shrink-0 snap-start text-start"
              >
                <span className="relative block aspect-[3/4] overflow-hidden rounded-none bg-sadn-stone">
                  <Image
                    src={r.images[0] ?? '/products/hero-abaya.png'}
                    alt={localName(r, lang)}
                    fill
                    sizes="160px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </span>
                <span className="mt-2 block truncate text-xs font-medium text-sadn-ink">
                  {localName(r, lang)}
                </span>
                <span className="text-xs font-semibold text-sadn-plum-800">
                  {money(r.price, lang)}
                </span>
              </button>
            ))}
          </div>

          {/* Desktop 4-col grid */}
          <div className="hidden lg:grid lg:grid-cols-4 lg:gap-6 mt-6">
            {related.slice(0, 4).map((r) => (
              <button
                key={r.slug}
                type="button"
                onClick={() => {
                  onOpen(r);
                  requestAnimationFrame(() =>
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  );
                }}
                className="group text-start transition-transform hover:-translate-y-1"
              >
                <span className="relative block aspect-[3/4] overflow-hidden rounded-none bg-sadn-stone">
                  <Image
                    src={r.images[0] ?? '/products/hero-abaya.png'}
                    alt={localName(r, lang)}
                    fill
                    sizes="300px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </span>
                <span className="mt-2.5 block truncate text-sm font-medium text-sadn-ink">
                  {localName(r, lang)}
                </span>
                <span className="text-sm font-semibold text-sadn-plum-800">
                  {money(r.price, lang)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Size guide sheet ── */}
      {guideOpen && (
        <SizeGuideSheet
          onClose={() => setGuideOpen(false)}
          rows={sizeGuide.filter((r) => !(product.hiddenSizes ?? []).includes(r.size))}
        />
      )}

      {/* ── Sticky add bar (Mobile only) ── */}
      <div className="sticky bottom-0 z-10 mt-auto lg:hidden">
        <div className="hairline-fade-t bg-sadn-canvas px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={handleAdd}
            className="btn-primary flex h-13 w-full items-center justify-center gap-2 py-3.5 text-sm font-medium tracking-wide"
          >
            {editLine ? (
              t('updateBagBtn', { money: money(product.price * qty, lang) })
            ) : (
              t('addToBagBtn', { money: money(product.price * qty, lang) })
            )}
            <span className="text-white/70">· {size}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
