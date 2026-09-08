'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { BadgeCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLang, useT } from '@/lib/i18n';
import { EMOJI_ONLY } from '@/lib/ui';
import type { ReviewDTO } from '@/lib/sadn-store';
import type { ChatMsg, ChatThread } from '@/lib/store-settings';
import { WA_GREEN, WhatsAppGlyph } from './whatsapp';

const MAX_ITEMS = 12;
const QUOTE_CAP = 180;
/** Must match the track's gap-4 (16px) — the arrow nudge steps by card+gap. */
const CARD_GAP = 16;

/* ── Content model (35-a) ─────────────────────────────────────────────────
 * One unified card list for the section: the owner's uploaded review
 * screenshots lead whenever at least one exists; only when every screenshot
 * is hidden do the dashboard chat threads condense into quote cards. The
 * list is capped so the carousel can never grow unbounded. */

type Quote = { text: string; reaction?: string };

export type ReviewItem =
  | {
      kind: 'shot';
      id: string;
      image: string;
      caption: string;
      fit: ReviewDTO['fitFeedback'];
    }
  | { kind: 'quote'; id: string; name: string; date: string; quotes: Quote[] };

/** Condense a dashboard chat thread → the 2–3 most expressive verbatim lines. */
function toQuoteCard(
  thread: ChatThread
): { id: string; name: string; date: string; quotes: Quote[] } | null {
  const speakable = thread.messages.filter((m) => !EMOJI_ONLY.test(m.text));
  const customers = speakable.filter((m) => m.from === 'customer');
  const pool = customers.length > 0 ? customers : speakable;
  if (pool.length === 0) return null;

  const clip = (m: ChatMsg): Quote => ({
    text:
      m.text.length > QUOTE_CAP
        ? `${m.text.slice(0, QUOTE_CAP).trimEnd()}…`
        : m.text,
    reaction: m.reaction,
  });

  const picks: ChatMsg[] = [pool[0]];
  const rest = pool.slice(1);
  if (rest.length > 0) {
    const longest = rest.reduce((a, b) => (b.text.length > a.text.length ? b : a));
    picks.push(longest);
    if (rest.length > 1 && longest !== rest[rest.length - 1]) {
      picks.push(rest[rest.length - 1]);
    }
  }

  return {
    id: thread.id,
    name: thread.customerName,
    date: thread.dateLabel,
    quotes: picks.slice(0, 3).map(clip),
  };
}

/** Screenshots first, chats as fallback, capped at MAX_ITEMS. */
export function buildReviewItems(
  reviews: ReviewDTO[],
  threads: ChatThread[]
): ReviewItem[] {
  const shots = reviews.filter((r) => r.image.trim().length > 0);
  if (shots.length > 0) {
    return shots.slice(0, MAX_ITEMS).map((r) => ({
      kind: 'shot' as const,
      id: r.id,
      image: r.image,
      caption: r.caption,
      fit: r.fitFeedback ?? null,
    }));
  }
  return threads
    .map(toQuoteCard)
    .filter((c): c is NonNullable<ReturnType<typeof toQuoteCard>> => c !== null)
    .slice(0, MAX_ITEMS)
    .map((c) => ({ kind: 'quote' as const, ...c }));
}

/* ── Card atoms ── */

function InitialAvatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sadn-plum-800 font-sadn-display text-[11px] text-white"
    >
      {name.trim().charAt(0) || 'س'}
    </span>
  );
}

function VerifiedBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-sadn-plum-100 bg-sadn-plum-50 px-2 py-1 text-[9px] font-semibold leading-none text-sadn-plum-700">
      <BadgeCheck className="h-3 w-3" strokeWidth={2} />
      {label}
    </span>
  );
}

/* Round 38 (owner): the five-star rows are gone from the reviews section —
   quote cards open straight on the customer's words. */

const FIT_KEYS = { tight: 'fitTight', true: 'fitTrue', loose: 'fitLoose' } as const;

/** Review screenshot card — the proof shot gets a soft-card treatment with a
 * fixed 16:9 frame (every card in the row shares one height, rows never
 * jump) and a floating WhatsApp chip. Plain <img> on purpose: owner uploads
 * may be SVG/PNG that the next/image optimizer won't serve unconfigured. */
function ShotCard({
  item,
  eager,
  variants,
}: {
  item: Extract<ReviewItem, { kind: 'shot' }>;
  eager: boolean;
  variants: Variants;
}) {
  const t = useT();
  const fitLabel = item.fit ? t(FIT_KEYS[item.fit]) : '';
  return (
    <motion.div variants={variants} data-card className="w-[86%] max-w-[352px] shrink-0 snap-start">
      <article className="card-hover relative flex h-full flex-col rounded-2xl border border-sadn-plum-100 bg-sadn-canvas p-3 shadow-sm">
        <div className="relative overflow-hidden rounded-xl border border-sadn-plum-100/80 bg-sadn-ivory">
          <img
            src={item.image}
            alt={item.caption || t('reviewsFromWhatsapp')}
            loading={eager ? 'eager' : 'lazy'}
            className="block aspect-video w-full object-cover object-top"
          />
          <span
            aria-hidden
            className="absolute bottom-2 end-2 flex h-7 w-7 items-center justify-center rounded-full bg-sadn-canvas/90 shadow-sm backdrop-blur"
          >
            <WhatsAppGlyph className="h-3.5 w-3.5" fill={WA_GREEN} />
          </span>
        </div>

        <footer className="mt-auto flex items-center gap-2.5 px-1 pt-3">
          <InitialAvatar name={item.caption} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[12.5px] font-semibold text-sadn-ink">
              {item.caption}
            </p>
            <p className="mt-1 truncate text-[10px] text-sadn-ink-soft">
              {t('reviewsFromWhatsapp')}
              {fitLabel ? ` · ${fitLabel}` : ''}
            </p>
          </div>
          <VerifiedBadge label={t('reviewsVerified')} />
        </footer>
      </article>
    </motion.div>
  );
}

/** Quote card — condensed WhatsApp chat: oversized decorative quote mark,
 * star rating, verbatim quote lines, name + verified-buyer badge. The card
 * is dir="rtl" because the chat content is always Egyptian Arabic, whatever
 * the UI language. */
function QuoteCard({
  item,
  variants,
}: {
  item: Extract<ReviewItem, { kind: 'quote' }>;
  variants: Variants;
}) {
  const t = useT();
  return (
    <motion.div variants={variants} data-card className="w-[86%] max-w-[352px] shrink-0 snap-start">
      <article
        dir="rtl"
        className="card-hover relative flex h-full flex-col rounded-2xl border border-sadn-plum-100 bg-sadn-canvas p-5 shadow-sm"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -top-3 end-4 select-none font-sadn-display text-[96px] leading-none text-sadn-plum-800/10"
        >
          ”
        </span>

        <blockquote className="relative space-y-2.5">
          {item.quotes.map((q, qi) => (
            <p
              key={qi}
              className={`border-s-2 border-sadn-plum-100 ps-3 text-[13px] leading-[1.7] text-sadn-ink ${
                qi === 0 ? 'line-clamp-4' : 'line-clamp-2'
              }`}
            >
              {q.text}
              {q.reaction && (
                <span className="ms-1 align-middle" aria-hidden>
                  {q.reaction}
                </span>
              )}
            </p>
          ))}
        </blockquote>

        <footer className="relative mt-auto flex items-center gap-2.5 pt-4">
          <InitialAvatar name={item.name} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[12.5px] font-semibold text-sadn-ink">
              {item.name}
            </p>
            <p className="mt-1 text-[10px] text-sadn-ink-soft">{item.date}</p>
          </div>
          <VerifiedBadge label={t('reviewsVerified')} />
        </footer>
      </article>
    </motion.div>
  );
}

/**
 * The reviews carousel (35-a) — replaced the auto-rotating stacked deck.
 * A horizontal snap-scroll row: one gentle staggered whileInView entrance,
 * soft hover lift on pointer devices only (.card-hover), desktop arrow
 * nudges, RTL mirrored scrolling. Scroll rules honored: the track is a plain
 * overflow-x-auto snap container — no touch-action overrides, no scroll
 * locking, no overscroll containment — so a vertical drag starting on the
 * cards still scrolls the page.
 */
export function ReviewStack({ items }: { items: ReviewItem[] }) {
  const t = useT();
  const lang = useLang();
  const reduced = useReducedMotion();
  const rtl = lang === 'ar';

  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  // scrollLeft is negative in RTL — abs() reads the same in both directions.
  const updateEnds = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pos = Math.abs(el.scrollLeft);
    setCanPrev(pos > 4);
    setCanNext(max > 4 && pos < max - 4);
  }, []);

  useEffect(() => {
    updateEnds();
    window.addEventListener('resize', updateEnds);
    return () => window.removeEventListener('resize', updateEnds);
  }, [updateEnds, items.length, rtl]);

  const nudge = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-card]');
    const step = (card ? card.offsetWidth : el.clientWidth * 0.86) + CARD_GAP;
    el.scrollBy({ left: dir * (rtl ? -step : step), behavior: reduced ? 'auto' : 'smooth' });
  };

  if (items.length === 0) return null;

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : 0.08 } },
  };
  const cardV: Variants = {
    hidden: { opacity: 0, y: reduced ? 0 : 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: reduced ? { duration: 0 } : { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const arrowCls =
    'absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-sadn-plum-100 bg-sadn-canvas/90 text-sadn-ink shadow-sm backdrop-blur transition-all duration-300 hover:bg-sadn-plum-50 disabled:pointer-events-none disabled:opacity-0 pointer-fine:flex';

  return (
    <div className="relative">
      {items.length > 1 && (
        <>
          <button
            type="button"
            aria-label={t('reviewsPrev')}
            onClick={() => nudge(-1)}
            disabled={!canPrev}
            className={`${arrowCls} start-2`}
          >
            {rtl ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
          <button
            type="button"
            aria-label={t('reviewsNext')}
            onClick={() => nudge(1)}
            disabled={!canNext}
            className={`${arrowCls} end-2`}
          >
            {rtl ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>
        </>
      )}

      <motion.div
        ref={trackRef}
        onScroll={updateEnds}
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '0px 0px -60px 0px' }}
        role="group"
        aria-roledescription="carousel"
        aria-label={t('ariaReviewsDeck')}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-ps-5 px-5 pb-5 pt-4"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {items.map((item, i) =>
          item.kind === 'shot' ? (
            <ShotCard key={item.id} item={item} eager={i === 0} variants={cardV} />
          ) : (
            <QuoteCard key={item.id} item={item} variants={cardV} />
          )
        )}
      </motion.div>
    </div>
  );
}
