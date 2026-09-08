'use client';

import { useEffect, useState } from 'react';
import { Database, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AdminLang } from './admin-i18n';
import { useAdminData } from './useAdminData';
import {
  EMPTY,
  type SaveFn,
  type SaveBtnFn,
  type SettingsShape,
  type SetSettings,
  type TT,
} from './settings-cards/shared';
import { WhatsAppCard } from './settings-cards/WhatsAppCard';
import { PaymentsCard } from './settings-cards/PaymentsCard';
import { PixelCard } from './settings-cards/PixelCard';
import { OrderStagesCard } from './settings-cards/OrderStagesCard';
import { MarqueeCard } from './settings-cards/MarqueeCard';
import { SizeGuideCard } from './settings-cards/SizeGuideCard';
import { ProductSectionsCard } from './settings-cards/ProductSectionsCard';
import { ChatThreadsCard } from './settings-cards/ChatThreadsCard';
import { PoliciesCard } from './settings-cards/PoliciesCard';
import { PromoCard } from './settings-cards/PromoCard';
import { DeliveryCard } from './settings-cards/DeliveryCard';
import { CouponsCard } from './settings-cards/CouponsCard';
import { SubscribersCard } from './settings-cards/SubscribersCard';
import { HeroCard } from './settings-cards/HeroCard';
import { ContactsCard } from './settings-cards/ContactsCard';
import { BannerCard } from './settings-cards/BannerCard';
import { PasswordCard } from './settings-cards/PasswordCard';

/**
 * AdminSettingsTab — the settings shell (R12). Owns the SettingsShape state
 * + baseline, the partial-PUT save() infra and the saveBtn factory; each
 * section card lives in ./settings-cards/<Name>Card.tsx and receives the
 * shared state/handlers through SettingsCardProps. Card composition order
 * is the visual order.
 */

/** Maps GET /api/admin/settings → the dashboard's SettingsShape (exact mapping). */
function settingsFromResponse(d: any): SettingsShape {
  return {
    whatsappNumber: d.settings.whatsappNumber ?? '',
    bannerVisible: Boolean(d.settings.bannerVisible),
    bannerTextEn: d.settings.bannerTextEn ?? '',
    bannerTextAr: d.settings.bannerTextAr ?? '',
    shippingFee: Number(d.settings.shippingFee ?? 60),
    freeShippingThreshold: Number(d.settings.freeShippingThreshold ?? 0),
    promoEnabled: Boolean(d.settings.promoEnabled),
    promoCode: d.settings.promoCode ?? '',
    promoPercent: Number(d.settings.promoPercent ?? 10),
    promoMin: Number(d.settings.promoMin ?? 0),
    heroImages: Array.isArray(d.settings.heroImages) ? d.settings.heroImages : [],
    heroInterval: Number(d.settings.heroInterval ?? 6),
    phones: Array.isArray(d.settings.phones) ? d.settings.phones : [],
    socials: {
      instagram: d.settings.socials?.instagram ?? '',
      facebook: d.settings.socials?.facebook ?? '',
      tiktok: d.settings.socials?.tiktok ?? '',
    },
    instapayNumber: d.settings.instapayNumber ?? '',
    vodafoneNumber: d.settings.vodafoneNumber ?? '',
    fbPixelId: d.settings.fbPixelId ?? '',
    orderStages:
      Array.isArray(d.settings.orderStages) && d.settings.orderStages.length > 0
        ? d.settings.orderStages
        : EMPTY.orderStages,
    marquee: { ...EMPTY.marquee, ...(d.settings.marquee ?? {}) },
    sizeGuide:
      Array.isArray(d.settings.sizeGuide) && d.settings.sizeGuide.length > 0
        ? d.settings.sizeGuide
        : EMPTY.sizeGuide,
    productSections:
      Array.isArray(d.settings.productSections) && d.settings.productSections.length > 0
        ? d.settings.productSections
        : EMPTY.productSections,
    policies:
      Array.isArray(d.settings.policies) && d.settings.policies.length > 0
        ? d.settings.policies
        : EMPTY.policies,
    chatThreads:
      Array.isArray(d.settings.chatThreads) && d.settings.chatThreads.length > 0
        ? d.settings.chatThreads
        : EMPTY.chatThreads,
  };
}

export function AdminSettingsTab({ t, lang }: { t: TT; lang: AdminLang }) {
  const { data } = useAdminData<SettingsShape>('/api/admin/settings', settingsFromResponse, EMPTY);
  const [s, setS] = useState<SettingsShape>(EMPTY);
  const [baseline, setBaseline] = useState<SettingsShape>(EMPTY);
  const [busy, setBusy] = useState<string>('');

  /* A fresh GET snapshot feeds both the editable state and the baseline —
     user edits touch `s` only, so this effect fires on loads, not keystrokes. */
  useEffect(() => {
    if (data) {
      setS(data);
      setBaseline(data);
    }
  }, [data]);

  /** Partial PUT — only send the keys a card owns. */
  const save: SaveFn = async (keys, toastKey, id) => {
    setBusy(id);
    try {
      const payload: Record<string, unknown> = {};
      for (const k of keys) payload[k] = s[k];
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (res.ok && result.ok) {
        toast.success(t(toastKey));
        // Round 19 fix: re-baseline from the SERVER's sanitized response.
        // The old `setBaseline({ ...s })` marked every OTHER card's unsaved
        // edits as clean too (their save buttons went dead), and locally
        // formatted values (e.g. `010 1234 5678`) disagreed with the
        // normalized stored ones until a tab reload.
        setBaseline(result.settings ? settingsFromResponse(result.settings) : { ...s });
        window.dispatchEvent(new Event('sadn:catalog-changed'));
      } else {
        toast.error(result.error ?? Object.values(result.errors ?? {})[0] ?? t('errorToast'));
      }
    } catch {
      toast.error(t('errorToast'));
    } finally {
      setBusy('');
    }
  };

  const saveBtn: SaveBtnFn = (disabled, onClick, id) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy === id}
      className="press inline-flex h-11 items-center justify-center gap-2 rounded-none bg-sadn-plum-800 px-6 text-sm font-medium text-white shadow-md shadow-sadn-plum-800/25 transition-colors hover:bg-sadn-plum-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy === id && <Loader2 className="h-4 w-4 animate-spin" />}
      {t('save')}
    </button>
  );

  const cardProps = { s, setS, baseline, t, lang, save, saveBtn };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* WhatsApp number */}
      <WhatsAppCard {...cardProps} />

      {/* ── Payment methods (round 15) — transfer numbers shown at checkout ── */}
      <PaymentsCard {...cardProps} />

      {/* ── Meta Pixel (round 27) — owner-set ads tracking ID ── */}
      <PixelCard {...cardProps} />

      {/* ── Order stage checklist (round 15) — drag & drop pipeline (round 16) ── */}
      <OrderStagesCard {...cardProps} />

      {/* ── Round 16: home marquee strip ── */}
      <MarqueeCard {...cardProps} />

      {/* ── Round 16: size guide (cm rows, drag to reorder) ── */}
      <SizeGuideCard {...cardProps} />

      {/* ── Round 16: product-page collapsible sections (drag to reorder) ── */}
      <ProductSectionsCard {...cardProps} />

      {/* ── Round 17: WhatsApp review chats — separate conversations, one
          card per customer. Threads drag-reorder; messages move with the
          up/down buttons; every thread has a live WhatsApp preview. ── */}
      <ChatThreadsCard {...cardProps} />

      {/* ── Round 16: policy pages (fixed slugs) ── */}
      <PoliciesCard {...cardProps} />

      {/* ── Promo code (round 13) ── */}
      <PromoCard {...cardProps} />

      {/* ── Discount coupons (round 29) — full CRUD for the retention codes ── */}
      <CouponsCard t={t} lang={lang} />

      {/* ── WhatsApp broadcast list (round 31) — "سيبي رقمك" opt-ins ── */}
      <SubscribersCard t={t} lang={lang} />

      {/* ── Delivery fee (round 13) ── */}
      <DeliveryCard {...cardProps} />

      {/* ── Hero slideshow (round 13) ── */}
      <HeroCard {...cardProps} />

      {/* ── Footer contacts (round 13) ── */}
      <ContactsCard {...cardProps} />

      {/* Announcement banner */}
      <BannerCard {...cardProps} />

      {/* Password */}
      <PasswordCard t={t} />

      {/* Data note */}
      <section className="flex items-start gap-3 rounded-none border border-dashed border-sadn-plum-200 bg-sadn-plum-50/40 p-5">
        <Database className="h-5 w-5 shrink-0 text-sadn-plum-400" strokeWidth={1.75} />
        <p className="text-xs leading-relaxed text-sadn-ink-soft">{t('dataNote')}</p>
      </section>
    </div>
  );
}
