import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { formatEgp } from '@/lib/pricing';

/** Stable per-line id (crypto when available) — the cart→product edit flow
 * targets a line by id (round 13). */
const lineId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `l-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

export type ProductColor = { name: string; hex: string; hidden?: boolean };

/** Storefront section returned by /api/categories — dashboard-managed. */
export type CategoryDTO = {
  id: string;
  slug: string;
  labelEn: string;
  labelAr: string;
  order: number;
};

/** Client-safe product shape returned by /api/products */
export type ProductDTO = {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  tagline: string | null;
  description: string;
  category: string;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  images: string[];
  colors: ProductColor[];
  sizes: string[];
  /** Size labels hidden from the product page (dashboard toggle, round 16). */
  hiddenSizes?: string[];
  /** Dashboard drag & drop position (round 16) — storefront ignores it. */
  sortOrder?: number;
  featured: boolean;
  isNew: boolean;
  stock: number;
  rating: number;
  reviewsCount: number;
  /** Hidden from the storefront when false (dashboard visibility toggle). */
  active: boolean;
};

export type CartItem = {
  /** Stable line id — lets /product/<slug>?edit=<id> update this exact line. */
  id: string;
  slug: string;
  name: string;
  /** Arabic name captured at add time so cart lines localize without a lookup. */
  nameAr?: string;
  image: string;
  price: number;
  size: string;
  color: string;
  qty: number;
};

/** Customer-review card (16:9 chat screenshot) returned by /api/reviews. */
export type ReviewDTO = {
  id: string;
  image: string;
  caption: string;
  order: number;
  /** Optional size verdict attached from the dashboard (round 29). */
  fitFeedback?: 'tight' | 'true' | 'loose' | null;
  /** Optional product link — powers the fit chips on that product page. */
  productSlug?: string | null;
};

/** Announcement banner state from /api/storefront — owner-controlled. */
export type BannerState = {
  visible: boolean;
  textEn: string;
  textAr: string;
};

/** UI language — English is the default; Arabic flips the shell to RTL. */
export type Lang = 'en' | 'ar';

export type AddOptions = {
  size?: string;
  color?: string;
  qty?: number;
  source?: HTMLElement | null;
};

const lineKey = (i: { slug: string; size: string; color: string }) =>
  `${i.slug}__${i.size}__${i.color}`;

/**
 * Egyptian-pound money formatting — bilingual (owner: "العملة الجنيه").
 * EN: "EGP 1,450" · AR: "١٬٤٥٠ ج.م" is over-localized for checkout math,
 * so AR keeps Western digits with the ج.م suffix (matches the WA message).
 *
 * 18-2/18-3a1 — delegates to the shared formatEgp formatter in
 * @/lib/pricing (identical output; one copy of the rule now).
 */
export const money = (n: number, lang: 'en' | 'ar' = 'en') => {
  return formatEgp(n, lang);
};

export const cartCount = (cart: CartItem[]) =>
  cart.reduce((n, i) => n + i.qty, 0);

export const cartSubtotal = (cart: CartItem[]) =>
  cart.reduce((n, i) => n + i.price * i.qty, 0);

/** Cap for recently-viewed slugs (most recent first). */
export const MAX_RECENT = 8;

/**
 * Persisted promo — code + human label; discount is recomputed per render.
 * Round 29: dashboard coupons extend it with the validated shape returned
 * by /api/coupons/validate (kind/value/min + source). Legacy rows persisted
 * before round 29 lack these fields and keep working through the old
 * single-promo path.
 */
export type StoredPromo = {
  code: string;
  label: string;
  kind?: 'percent' | 'fixed';
  value?: number;
  min?: number;
  source?: 'coupon' | 'promo';
};

type SadnState = {
  cart: CartItem[];
  /** Recently viewed product slugs — most recent first. */
  recent: string[];
  /** UI language (persisted) — 'en' renders LTR, 'ar' renders RTL. */
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Promo code kept across sessions (persisted); discount recomputed live. */
  promo: StoredPromo | null;
  setPromo: (p: StoredPromo | null) => void;
  addToCart: (item: Omit<CartItem, 'qty' | 'id'>, qty?: number) => void;
  /** Update one line in place (size/colour/qty) — cart→product edit flow.
   * If the new variant duplicates another line, the quantities merge. */
  updateCartLine: (id: string, patch: Partial<Pick<CartItem, 'size' | 'color' | 'qty'>>) => void;
  setQty: (slug: string, size: string, qty: number) => void;
  clearCart: () => void;
  pushRecent: (slug: string) => void;
};

export const useSadnStore = create<SadnState>()(
  persist(
    (set) => ({
      cart: [],
      recent: [],
      lang: 'en',
      setLang: (lang) => set({ lang }),
      promo: null,
      setPromo: (p) => set({ promo: p }),
      addToCart: (item, qty = 1) =>
        set((s) => {
          const existing = s.cart.find((i) => lineKey(i) === lineKey(item));
          if (existing) {
            return {
              cart: s.cart.map((i) =>
                lineKey(i) === lineKey(item)
                  ? { ...i, qty: Math.min(i.qty + qty, 9) }
                  : i
              ),
            };
          }
          return { cart: [...s.cart, { ...item, id: lineId(), qty }] };
        }),
      updateCartLine: (id, patch) =>
        set((s) => {
          const line = s.cart.find((i) => i.id === id);
          if (!line) return {};
          const next = { ...line, ...patch };
          // Merge into an identical surviving line instead of duplicating.
          const twin = s.cart.find(
            (i) => i.id !== id && lineKey(i) === lineKey(next)
          );
          if (twin) {
            return {
              cart: s.cart
                .filter((i) => i.id !== id)
                .map((i) =>
                  i.id === twin.id
                    ? { ...i, qty: Math.min(i.qty + (patch.qty ?? next.qty), 9) }
                    : i
                ),
            };
          }
          if ((patch.qty ?? next.qty) <= 0) {
            return { cart: s.cart.filter((i) => i.id !== id) };
          }
          return {
            cart: s.cart.map((i) => (i.id === id ? next : i)),
          };
        }),
      // The dedicated remove action was folded into setQty(_, _, 0)
      // (round 18-3a1) — identical filter branch, one fewer action.
      setQty: (slug, size, qty) =>
        set((s) => ({
          cart:
            qty <= 0
              ? s.cart.filter((i) => !(i.slug === slug && i.size === size))
              : s.cart.map((i) =>
                  i.slug === slug && i.size === size ? { ...i, qty } : i
                ),
        })),
      clearCart: () => set({ cart: [] }),
      pushRecent: (slug) =>
        set((s) => ({
          recent: [slug, ...s.recent.filter((n) => n !== slug)].slice(
            0,
            MAX_RECENT
          ),
        })),
    }),
    // v2: the wishlist slice was removed entirely (owner request) — the new
    // key starts every device on a clean, wishlist-free state.
    { name: 'sadn-store-v2' }
  )
);
