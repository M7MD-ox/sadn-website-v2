'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Check, X } from 'lucide-react';
import { useSheetEntrance } from '@/lib/ui';
import { money, type CartItem } from '@/lib/sadn-store';
import { localName, useLang, useT } from '@/lib/i18n';

type Props = {
  item: CartItem;
  onViewCart: () => void;
  onClose: () => void;
};

export function MiniCartSheet({ item, onViewCart, onClose }: Props) {
  const t = useT();
  const lang = useLang();
  const sheetRef = useRef<HTMLDivElement>(null);

  // Lighter rise than the full sheets — MiniCart's own rhythm, kept exact.
  useSheetEntrance(sheetRef, { translateY: 48, duration: 400 });

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-60 mx-auto w-full max-w-[430px] px-3 pb-[calc(4.6rem+env(safe-area-inset-bottom))]"
      role="status"
      aria-label={t('addedToBag')}
    >
      <div
        ref={sheetRef}
        className="rounded-none border border-sadn-plum-100 bg-sadn-canvas p-5 shadow-2xl shadow-sadn-plum-950/15"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-none bg-sadn-plum-800 ring-1 ring-inset ring-white/25">
              <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
            </span>
            <p className="text-sm font-semibold text-sadn-ink">{t('addedToBag')}</p>
          </div>
          <button
            type="button"
            aria-label={t('ariaDismiss')}
            onClick={onClose}
            className="tap-target flex items-center justify-center rounded-none text-sadn-ink-soft transition-colors hover:bg-sadn-plum-50 active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quiet hairline row — no wash box (16-b) */}
        <div className="mt-4 flex items-center gap-3 border-y border-sadn-plum-100 py-3.5">
          <span className="img-frame relative h-16 w-12 shrink-0 overflow-hidden rounded-none bg-sadn-stone">
            <Image
              src={item.image || '/products/hero-abaya.png'}
              alt={item.name}
              fill
              sizes="48px"
              className="object-cover"
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sadn-ink">{localName(item, lang)}</p>
            <p className="text-xs text-sadn-ink-soft">
              {item.color
                ? t('sizeColor', { size: item.size, color: item.color })
                : t('sizeNoColor', { size: item.size })}
            </p>
          </div>
          <p className="price-num text-sm font-semibold text-sadn-plum-800">
            {money(item.price, lang)}
          </p>
        </div>

        {/* Round 38 (owner): the free-shipping strip is gone from all cart
            surfaces — the actions follow the item row directly. */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="press h-11 flex-1 rounded-none border border-sadn-plum-200 text-sm font-medium text-sadn-ink transition-colors hover:bg-sadn-plum-50"
          >
            {t('keepBrowsing')}
          </button>
          <button
            type="button"
            onClick={onViewCart}
            className="press h-11 flex-1 rounded-none bg-sadn-plum-800 text-sm font-medium text-white transition-colors hover:bg-sadn-plum-700"
          >
            {t('viewBag')}
          </button>
        </div>
      </div>
    </div>
  );
}
