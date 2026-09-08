import Link from 'next/link';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import { money, type AddOptions, type ProductDTO } from '@/lib/sadn-store';
import { localName, catKey, useLang, useT } from '@/lib/i18n';

type Props = {
  product: ProductDTO;
  onAdd: (p: ProductDTO, opts?: AddOptions) => void;
  onOpen: (p: ProductDTO) => void;
  priority?: boolean;
};

/**
 * Product card — responsive grid card with semantic Next.js Link,
 * tight typographic stack, price emphasized over the name, fixed aspect ratio (CLS-safe).
 * Round 40: the add-to-bag control is a <span role="button"> so the card
 * stays a single valid anchor (no nested interactive elements) while
 * keeping full keyboard + screen-reader behaviour via the keydown handler.
 */
export function ProductCard({ product, onAdd, onOpen, priority }: Props) {
  const t = useT();
  const lang = useLang();

  const handleAdd = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const source = (e.currentTarget as HTMLElement)
      .closest('[data-card]')
      ?.querySelector('img');
    onAdd(product, { source: source as HTMLElement | null });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      const source = (e.currentTarget as HTMLElement)
        .closest('[data-card]')
        ?.querySelector('img');
      onAdd(product, { source: source as HTMLElement | null });
    }
  };

  return (
    <Link
      href={`/product/${product.slug}`}
      data-card
      data-animate
      className="group card-hover block select-none"
      onClick={() => onOpen(product)}
    >
      <div className="img-frame relative aspect-[3/4] overflow-hidden rounded-none bg-sadn-stone">
        <Image
          src={product.images[0] ?? '/products/hero-abaya.png'}
          alt={`${localName(product, lang)} — ${t(catKey(product.category))}`}
          fill
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045]"
        />

        {product.isNew && (
          <span className="absolute start-3 top-3 rounded-none bg-sadn-canvas/90 px-2 py-1 text-[9px] font-semibold uppercase tracking-luxe-tight text-sadn-plum-800">
            {t('badgeNew')}
          </span>
        )}

        <span
          role="button"
          tabIndex={0}
          aria-label={t('ariaAddToBag', { name: localName(product, lang) })}
          onClick={handleAdd}
          onKeyDown={onKeyDown}
          className="tap-target absolute bottom-3 end-3 flex items-center justify-center rounded-none bg-sadn-plum-800 p-2.5 text-white transition-colors hover:bg-sadn-plum-700 active:scale-90 cursor-pointer md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100"
        >
          <Plus className="h-4 w-4" />
        </span>
      </div>

      <div className="px-0.5 pt-2.5">
        <p className="text-[9px] uppercase tracking-luxe-tight text-sadn-ink-soft">
          {t(catKey(product.category))}
        </p>
        <h3 className="mt-1 text-[13px] lg:text-sm font-medium leading-snug text-sadn-ink">
          {localName(product, lang)}
        </h3>
        <p
          className={
            product.compareAtPrice
              ? 'price-num price-sale mt-1 text-[15px] lg:text-base'
              : 'price-num mt-1 text-sm lg:text-base font-semibold text-sadn-plum-800'
          }
        >
          {money(product.price, lang)}
          {product.compareAtPrice && (
            <span className="price-strike ms-2">{money(product.compareAtPrice, lang)}</span>
          )}
        </p>
      </div>
    </Link>
  );
}
