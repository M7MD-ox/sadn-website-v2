'use client';

import { useState } from 'react';
import { BadgePercent, Loader2, X } from 'lucide-react';
import anime from 'animejs';
import { money, useSadnStore } from '@/lib/sadn-store';
import { applyPromo, type PromoResult } from '@/lib/promos';
import { useLang, useT } from '@/lib/i18n';
import type { StoreConfig } from '@/lib/store-settings';

type ValidateOk = {
  ok: true;
  source: 'coupon' | 'promo';
  code: string;
  kind: 'percent' | 'fixed';
  value: number;
  minSubtotal: number;
  discount: number;
};

type ValidateFail = { ok: false; reason?: string; message?: string };

/**
 * Promo/coupon panel (round 13; extracted 18-3a2; round 29 rewrite) — owns
 * the open/input/message/busy state and reads promo/setPromo from the store
 * directly. Since round 29 the code is validated SERVER-SIDE via
 * POST /api/coupons/validate (dashboard Coupon table first, then the legacy
 * single promo), so the persisted chip carries the validated kind/value and
 * the bag math matches the order API. A network failure falls back to the
 * legacy local check so the panel never dead-ends.
 */
export function PromoPanel({
  subtotal,
  promoCfg,
}: {
  subtotal: number;
  promoCfg: StoreConfig['promo'] | null;
}) {
  const t = useT();
  const lang = useLang();
  const promo = useSadnStore((s) => s.promo);
  const setPromo = useSadnStore((s) => s.setPromo);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);

  // Pending = the chip is kept but the cart is below the code's minimum.
  const couponMin = promo?.source === 'coupon' ? (promo.min ?? 0) : 0;
  const legacyCheck = promo && promo.source !== 'coupon' ? applyPromo(promo.code, subtotal, promoCfg) : null;
  const promoPending = promo
    ? promo.source === 'coupon'
      ? subtotal < couponMin
      : legacyCheck !== null && !legacyCheck.ok && legacyCheck.reason === 'min-subtotal'
    : false;
  const pendingMin = promo?.source === 'coupon' ? couponMin : (promoCfg?.min ?? 0);

  const failText = (resp: ValidateFail, rawCode: string): string => {
    if (resp.reason === 'min-subtotal') {
      const min = (resp as { minSubtotal?: number }).minSubtotal ?? promoCfg?.min ?? 0;
      return t('promoMin', { code: rawCode, min: min.toLocaleString('en-US') });
    }
    if (resp.reason === 'expired' || resp.reason === 'usage-limit') {
      return t('promoUnavailable');
    }
    return t('promoInvalid', { code: rawCode.toUpperCase().replace(/\s+/g, '') });
  };

  const applyPromoCode = async () => {
    const code = promoInput.trim();
    if (!code) return;
    setPromoBusy(true);
    setPromoMsg(null);
    await new Promise((r) => setTimeout(r, 250));
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal }),
      });
      const data = (await res.json()) as ValidateOk | ValidateFail | { ok: boolean; error?: string };
      if (res.ok && data.ok === true && 'kind' in data) {
        const label =
          data.kind === 'percent'
            ? t('promoPercentLabel', { n: data.value })
            : t('couponFixedLabel', { money: money(data.value, lang) });
        setPromo({
          code: data.code,
          label,
          kind: data.kind,
          value: data.value,
          min: data.minSubtotal,
          source: data.source,
        });
        setPromoMsg({ ok: true, text: t('promoApplied', { code: data.code, label }) });
        setPromoInput('');
        anime({
          targets: '[data-promo-chip]',
          scale: [0.9, 1],
          opacity: [0, 1],
          duration: 420,
          easing: 'easeOutElastic(1, .55)',
        });
      } else if (data.ok === false) {
        setPromoMsg({ ok: false, text: failText(data as ValidateFail, code) });
      } else {
        setPromoMsg({ ok: false, text: t('promoInvalid', { code: code.toUpperCase() }) });
      }
    } catch {
      // Offline / API hiccup — legacy local check keeps the panel usable.
      const result: PromoResult = applyPromo(code, subtotal, promoCfg);
      if (result.ok) {
        setPromo({
          code: result.code,
          label: t('promoPercentLabel', { n: result.percent }),
          source: 'promo',
        });
        setPromoMsg({
          ok: true,
          text: t('promoApplied', {
            code: result.code,
            label: t('promoPercentLabel', { n: result.percent }),
          }),
        });
        setPromoInput('');
      } else {
        setPromoMsg({ ok: false, text: failText({ ok: false, reason: result.reason }, code) });
      }
    }
    setPromoBusy(false);
  };

  return (
    <div className="mt-6">
      {!promoOpen && !promo && (
        <button
          type="button"
          onClick={() => setPromoOpen(true)}
          className="flex items-center gap-2 text-xs font-medium text-sadn-plum-700 transition-colors hover:text-sadn-plum-800"
        >
          <BadgePercent className="h-4 w-4" strokeWidth={1.75} />
          {t('promoCta')}
        </button>
      )}

      {promoOpen && !promo && (
        <div data-promo-chip>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void applyPromoCode();
            }}
          >
            <input
              value={promoInput}
              onChange={(e) => {
                setPromoInput(e.target.value);
                setPromoMsg(null);
              }}
              placeholder="SADN10"
              aria-label={t('ariaPromoInput')}
              autoCapitalize="characters"
              spellCheck={false}
              className="sadn-input flex-1 uppercase tracking-wider"
            />
            <button
              type="submit"
              disabled={promoBusy}
              className="press flex h-11 w-20 items-center justify-center rounded-none border border-sadn-plum-800 text-sm font-medium text-sadn-plum-800 transition-colors hover:bg-sadn-plum-800 hover:text-white active:scale-[0.98] disabled:opacity-70"
            >
              {promoBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('apply')
              )}
            </button>
          </form>
          <p className="mt-2 text-[11px] text-sadn-ink-soft">
            {t('promoHint')}
          </p>
        </div>
      )}

      {promo && (
        <div
          data-promo-chip
          className={`flex items-center gap-2.5 rounded-none border border-dashed px-3.5 py-3 ${
            promoPending
              ? 'border-sadn-plum-200 bg-sadn-plum-50/30'
              : 'border-sadn-plum-400 bg-sadn-plum-50/60'
          }`}
        >
          <BadgePercent
            className={`h-4 w-4 shrink-0 ${
              promoPending ? 'text-sadn-plum-400' : 'promo-chip-active text-sadn-plum-700'
            }`}
            strokeWidth={1.75}
          />
          <div className="min-w-0 flex-1">
            <p
              className={`text-xs font-semibold tracking-wider ${
                promoPending ? 'text-sadn-plum-600' : 'text-sadn-plum-800'
              }`}
            >
              {promo.code}
            </p>
            <p
              className={`truncate text-[11px] ${
                promoPending ? 'text-sadn-ink-soft/80' : 'text-sadn-ink-soft'
              }`}
            >
              {promoPending
                ? t('promoPending', { money: money(pendingMin, lang) })
                : promo.label}
            </p>
          </div>
          <button
            type="button"
            aria-label={t('discount')}
            onClick={() => {
              setPromo(null);
              setPromoMsg(null);
              setPromoOpen(false);
            }}
            className="tap-target flex items-center justify-center rounded-none text-sadn-ink-soft transition-colors hover:bg-sadn-canvas hover:text-sadn-plum-800 active:scale-90"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {promoMsg && !promo && (
        <p
          role={promoMsg.ok ? 'status' : 'alert'}
          className={`mt-2 text-[11px] ${
            promoMsg.ok ? 'text-sadn-plum-700' : 'text-red-600'
          }`}
        >
          {promoMsg.text}
        </p>
      )}
    </div>
  );
}
