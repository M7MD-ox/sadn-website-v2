'use client';

import { create } from 'zustand';
import type { BannerData, CategoryData, ReviewData } from '@/lib/catalog';
import type { CartItem, ProductDTO } from '@/lib/sadn-store';
import type { StoreConfig } from '@/lib/store-settings';

/** Client-facing aliases — the screens import their DTOs from sadn-store. */
type CategoryDTO = CategoryData;
type ReviewDTO = ReviewData;
type BannerState = BannerData;

/**
 * Module-level chrome store — client components (search overlay, mini-bag)
 * read the catalog from here. It is SEEDED from the server-rendered page
 * data on every navigation, then refreshed in the background, so the first
 * paint is always real content (SSR) and the dashboard stays live.
 */
type ChromeState = {
  products: ProductDTO[];
  categories: CategoryDTO[];
  reviews: ReviewDTO[];
  config: StoreConfig | null;
  lastAdded: CartItem | null;
  set: (patch: Partial<Omit<ChromeState, 'set'>>) => void;
};

export const useChrome = create<ChromeState>((set) => ({
  products: [],
  categories: [],
  reviews: [],
  config: null,
  lastAdded: null,
  set: (patch) => set(patch),
}));

export const setChrome = (patch: Partial<Omit<ChromeState, 'set'>>) =>
  useChrome.getState().set(patch);

export type StoreChromeProps = {
  products: ProductDTO[];
  categories: CategoryDTO[];
  reviews: ReviewDTO[];
  config: StoreConfig;
  banner: BannerState;
  children: React.ReactNode;
};
