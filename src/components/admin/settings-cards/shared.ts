/**
 * Shared types + constants for the extracted settings cards (R12).
 * The ONE import source for SettingsShape / EMPTY / card props — the shell
 * (AdminSettingsTab.tsx) and every settings-cards/* file import from here.
 */

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { AdminKey, AdminLang } from '../admin-i18n';
import {
  DEFAULT_CHAT_THREADS,
  DEFAULT_MARQUEE,
  DEFAULT_ORDER_STAGES,
  DEFAULT_POLICIES,
  DEFAULT_PRODUCT_SECTIONS,
  DEFAULT_SIZE_GUIDE,
  type ChatThread,
  type MarqueeConfig,
  type OrderStage,
  type PolicyPage,
  type ProductSection,
  type SizeRow,
} from '@/lib/store-settings';

export type TT = (k: AdminKey) => string;

export type SettingsShape = {
  whatsappNumber: string;
  bannerVisible: boolean;
  bannerTextEn: string;
  bannerTextAr: string;
  shippingFee: number;
  freeShippingThreshold: number;
  promoEnabled: boolean;
  promoCode: string;
  promoPercent: number;
  promoMin: number;
  heroImages: string[];
  heroInterval: number;
  phones: string[];
  socials: { instagram: string; facebook: string; tiktok: string };
  instapayNumber: string;
  vodafoneNumber: string;
  fbPixelId: string;
  orderStages: OrderStage[];
  marquee: MarqueeConfig;
  sizeGuide: SizeRow[];
  productSections: ProductSection[];
  policies: PolicyPage[];
  chatThreads: ChatThread[];
};

export const EMPTY: SettingsShape = {
  whatsappNumber: '',
  bannerVisible: true,
  bannerTextEn: '',
  bannerTextAr: '',
  shippingFee: 60,
  freeShippingThreshold: 0,
  promoEnabled: true,
  promoCode: 'SADN10',
  promoPercent: 10,
  promoMin: 0,
  heroImages: ['/products/hero-abaya.png'],
  heroInterval: 6,
  phones: [],
  socials: { instagram: '', facebook: '', tiktok: '' },
  instapayNumber: '',
  vodafoneNumber: '',
  fbPixelId: '',
  orderStages: DEFAULT_ORDER_STAGES,
  marquee: DEFAULT_MARQUEE,
  sizeGuide: DEFAULT_SIZE_GUIDE,
  productSections: DEFAULT_PRODUCT_SECTIONS,
  policies: DEFAULT_POLICIES,
  chatThreads: DEFAULT_CHAT_THREADS,
};

export const inputCls = 'sadn-input';

export type SetSettings = Dispatch<SetStateAction<SettingsShape>>;

/** The shell's partial PUT — only send the keys a card owns. */
export type SaveFn = (keys: (keyof SettingsShape)[], toastKey: AdminKey, id: string) => Promise<void>;

/** The shell's save button factory (tracks the shared busy state). */
export type SaveBtnFn = (disabled: boolean, onClick: () => void, id: string) => ReactNode;

/** Everything a standard settings card receives from the shell. */
export type SettingsCardProps = {
  s: SettingsShape;
  setS: SetSettings;
  baseline: SettingsShape;
  t: TT;
  lang: AdminLang;
  save: SaveFn;
  saveBtn: SaveBtnFn;
};
