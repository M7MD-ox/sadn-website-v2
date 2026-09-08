import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureBootstrap } from '@/lib/bootstrap';
import { guard, readJson, serverError } from '@/lib/api-helpers';
import { isValidWhatsAppNumber, normalizeWhatsAppNumber } from '@/lib/orders';
import {
  parseChatThreads,
  parseMarquee,
  parsePolicies,
  parseProductSections,
  parseSizeGuide,
  parseStoreConfig,
  POLICY_SLUGS,
} from '@/lib/store-settings';

/** GET /api/admin/settings — owner-facing settings (no password hash). */
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  try {
    await ensureBootstrap();
    const s = await db.setting.findUnique({ where: { id: 'singleton' } });
    return NextResponse.json({ ok: true, settings: settingsPayload(s) });
  } catch (error) {
    console.error('GET /api/admin/settings failed:', error);
    return serverError();
  }
}

const clampText = (v: unknown, max = 140) =>
  typeof v === 'string' ? v.trim().slice(0, max) : null;

const clampNum = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n * 100) / 100));
};

/**
 * Shape the Setting row for the dashboard (JSON columns decoded). Built ON
 * parseStoreConfig — the same sanitizers the storefront reads, so the two
 * can never drift — plus the only fields the admin needs that StoreConfig
 * lacks (the announcement banner). The promo block is flattened back to the
 * dashboard's field names. `currency` is dropped: the dashboard never reads
 * it (schema default stays — round 14 keep).
 */
function settingsPayload(s: unknown) {
  const cfg = parseStoreConfig(s);
  const row = (typeof s === 'object' && s !== null ? s : {}) as Record<string, unknown>;
  return {
    whatsappNumber: cfg.whatsappNumber,
    bannerVisible: Boolean(row.bannerVisible),
    bannerTextEn: typeof row.bannerTextEn === 'string' ? row.bannerTextEn : '',
    bannerTextAr: typeof row.bannerTextAr === 'string' ? row.bannerTextAr : '',
    shippingFee: cfg.shippingFee,
    freeShippingThreshold: cfg.freeShippingThreshold,
    promoEnabled: cfg.promo.enabled,
    promoCode: cfg.promo.code,
    promoPercent: cfg.promo.percent,
    promoMin: cfg.promo.min,
    heroImages: cfg.heroImages,
    heroInterval: cfg.heroInterval,
    phones: cfg.phones,
    socials: cfg.socials,
    instapayNumber: cfg.instapayNumber,
    vodafoneNumber: cfg.vodafoneNumber,
    fbPixelId: cfg.fbPixelId,
    orderStages: cfg.orderStages,
    marquee: cfg.marquee,
    sizeGuide: cfg.sizeGuide,
    productSections: cfg.productSections,
    policies: cfg.policies,
    chatThreads: cfg.chatThreads,
  };
}

/**
 * PUT /api/admin/settings — partial update. Absent keys are left unchanged.
 * Round 13 additions: shippingFee, promo (enabled/code/percent/min),
 * heroImages + heroInterval, footer phones + socials.
 */
export async function PUT(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  await ensureBootstrap();

  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.res;
  const body = (typeof parsed.data === 'object' && parsed.data !== null ? parsed.data : {}) as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if ('whatsappNumber' in body) {
    const raw = typeof body.whatsappNumber === 'string' ? body.whatsappNumber : '';
    if (raw.trim() === '') {
      data.whatsappNumber = ''; // clearing is allowed — skips the WhatsApp hand-off
    } else {
      const digits = normalizeWhatsAppNumber(raw);
      if (!isValidWhatsAppNumber(digits)) {
        return NextResponse.json(
          { ok: false, error: 'Enter a valid WhatsApp number — international format, e.g. 201001234567' },
          { status: 422 }
        );
      }
      data.whatsappNumber = digits;
    }
  }

  // Round 19: strict boolean coercion — Boolean('false') is `true`, so a
  // string payload would flip the banner on instead of off.
  if ('bannerVisible' in body) data.bannerVisible = body.bannerVisible === true;

  // Meta Pixel ID (round 27) — digits only, 10–25 chars, empty clears it.
  if ('fbPixelId' in body) {
    const raw = typeof body.fbPixelId === 'string' ? body.fbPixelId : '';
    const digits = raw.replace(/\D/g, '');
    if (digits && (digits.length < 10 || digits.length > 25)) {
      return NextResponse.json(
        { ok: false, error: 'Meta Pixel IDs are 15–16 digits — e.g. 1234567890123456' },
        { status: 422 }
      );
    }
    data.fbPixelId = digits; // empty string = pixel off (clearing is allowed)
  }

  const textEn = clampText(body.bannerTextEn);
  if (textEn !== null) {
    if (!textEn) {
      return NextResponse.json(
        { ok: false, error: 'Validation failed', errors: { bannerTextEn: 'Banner text cannot be empty' } },
        { status: 422 }
      );
    }
    data.bannerTextEn = textEn;
  }

  const textAr = clampText(body.bannerTextAr);
  if (textAr !== null) {
    if (!textAr) {
      return NextResponse.json(
        { ok: false, error: 'Validation failed', errors: { bannerTextAr: 'نص البانر مطلوب' } },
        { status: 422 }
      );
    }
    data.bannerTextAr = textAr;
  }

  // ── Round 13: delivery fee ──
  if ('shippingFee' in body) {
    data.shippingFee = clampNum(body.shippingFee, 0, 1000, 60);
  }

  // ── Round 29: free-shipping threshold (0 = the rule is off) ──
  if ('freeShippingThreshold' in body) {
    data.freeShippingThreshold = clampNum(body.freeShippingThreshold, 0, 100_000, 0);
  }

  // ── Round 13: promo code ──
  if ('promoEnabled' in body) data.promoEnabled = body.promoEnabled === true;
  if ('promoPercent' in body) data.promoPercent = clampNum(body.promoPercent, 1, 90, 10);
  if ('promoMin' in body) data.promoMin = clampNum(body.promoMin, 0, 100000, 0);
  if ('promoCode' in body) {
    const code = clampText(body.promoCode, 24) ?? '';
    if (!code) {
      return NextResponse.json(
        { ok: false, error: 'Validation failed', errors: { promoCode: 'Promo code cannot be empty' } },
        { status: 422 }
      );
    }
    data.promoCode = code.toUpperCase().replace(/\s+/g, '');
  }

  // ── Round 13: hero slideshow ──
  if ('heroImages' in body) {
    const raw = Array.isArray(body.heroImages) ? body.heroImages : [];
    const urls = raw
      .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      .map((x) => x.trim().slice(0, 300))
      .slice(0, 8);
    if (urls.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Validation failed', errors: { heroImages: 'Keep at least one hero image' } },
        { status: 422 }
      );
    }
    data.heroImages = JSON.stringify(urls);
  }
  if ('heroInterval' in body) {
    data.heroInterval = Math.round(clampNum(body.heroInterval, 2, 60, 6));
  }

  // ── Round 13: footer contacts ──
  if ('phones' in body) {
    const raw = Array.isArray(body.phones) ? body.phones : [];
    const list = raw
      .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      .map((x) => x.trim().slice(0, 32))
      .slice(0, 5);
    data.phones = JSON.stringify(list);
  }
  if ('socials' in body) {
    const raw = (typeof body.socials === 'object' && body.socials !== null
      ? body.socials
      : {}) as Record<string, unknown>;
    const clean = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 200) : '');
    data.socials = JSON.stringify({
      instagram: clean(raw.instagram),
      facebook: clean(raw.facebook),
      tiktok: clean(raw.tiktok),
    });
  }

  // ── Round 15: payment transfer numbers (shown to customers at checkout) ──
  if ('instapayNumber' in body) {
    data.instapayNumber = clampText(body.instapayNumber, 40)?.replace(/[\s-]/g, '') ?? '';
  }
  if ('vodafoneNumber' in body) {
    data.vodafoneNumber = clampText(body.vodafoneNumber, 40)?.replace(/[\s-]/g, '') ?? '';
  }

  // ── Round 15: editable order-stage checklist ──
  if ('orderStages' in body) {
    const raw = Array.isArray(body.orderStages) ? body.orderStages : [];
    const stages: Array<{ id: string; en: string; ar: string; tone: 'ok' | 'warn' }> = [];
    for (const item of raw.slice(0, 10)) {
      if (typeof item !== 'object' || item === null) continue;
      const r = item as Record<string, unknown>;
      const en = typeof r.en === 'string' ? r.en.trim().slice(0, 48) : '';
      const ar = typeof r.ar === 'string' ? r.ar.trim().slice(0, 48) : '';
      if (!en && !ar) continue; // silently drop empty rows
      stages.push({
        id:
          typeof r.id === 'string' && r.id.trim()
            ? r.id.trim().slice(0, 40)
            : `stage-${Date.now().toString(36)}-${stages.length}`,
        en: en || ar,
        ar: ar || en,
        tone: r.tone === 'warn' ? 'warn' : 'ok',
      });
    }
    if (stages.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Validation failed', errors: { orderStages: 'Keep at least one order stage' } },
        { status: 422 }
      );
    }
    data.orderStages = JSON.stringify(stages);
  }

  // ── Round 16: home marquee strip ──
  if ('marquee' in body) {
    data.marquee = JSON.stringify(parseMarquee(body.marquee));
  }

  // ── Round 16: size guide (cm-only rows) ──
  if ('sizeGuide' in body) {
    data.sizeGuide = JSON.stringify(parseSizeGuide(body.sizeGuide));
  }

  // ── Round 16: product-page collapsible sections ──
  if ('productSections' in body) {
    data.productSections = JSON.stringify(parseProductSections(body.productSections));
  }

  // ── Round 17: WhatsApp review chats ──
  if ('chatThreads' in body) {
    data.chatThreads = JSON.stringify(parseChatThreads(body.chatThreads));
  }

  // ── Round 16: policy pages (shipping/returns/privacy) ──
  if ('policies' in body) {
    const raw = Array.isArray(body.policies) ? body.policies : [];
    const allowed = raw.filter((p): p is Record<string, unknown> => {
      if (typeof p !== 'object' || p === null) return false;
      const slug = (p as Record<string, unknown>).slug;
      return typeof slug === 'string' && (POLICY_SLUGS as readonly string[]).includes(slug);
    });
    if (allowed.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Validation failed', errors: { policies: 'Keep at least one policy page' } },
        { status: 422 }
      );
    }
    data.policies = JSON.stringify(parsePolicies(allowed));
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: 'Nothing to update' }, { status: 422 });
  }

  try {
    await db.setting.update({ where: { id: 'singleton' }, data });
  } catch {
    return NextResponse.json({ ok: false, error: 'Settings row missing' }, { status: 500 });
  }

  const s = await db.setting.findUnique({ where: { id: 'singleton' } });
  return NextResponse.json({
    ok: true,
    settings: settingsPayload(s),
  });
}
