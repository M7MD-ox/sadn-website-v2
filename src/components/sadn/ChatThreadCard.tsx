'use client';

import { useLayoutEffect, useRef } from 'react';
import { CheckCheck } from 'lucide-react';
import { gsap, prefersReducedMotion } from '@/lib/gsap-setup';
import { EMOJI_ONLY } from '@/lib/ui';
import type { ChatThread } from '@/lib/store-settings';

/**
 * One WhatsApp-style conversation card (round 17) — a single customer's
 * thread with its own header (avatar initial + display name) so each
 * conversation visibly belongs to a different person.
 *
 * Shared by the storefront reviews wall AND the dashboard's live preview —
 * the owner edits chats in Settings and sees exactly this rendering.
 *
 * The card keeps a fixed RTL direction — the conversations are Egyptian
 * Arabic regardless of the UI language. Customer bubbles sit on the right
 * (incoming, as on the owner's phone); the atelier's replies sit on the
 * left with read ticks. Bubbles are deliberately rounded here — the one
 * place the square-edge rule yields to the chat metaphor.
 */
export function ChatThreadCard({ thread }: { thread: ChatThread }) {
  const initial = thread.customerName.trim().charAt(0) || 'س';
  const cardRef = useRef<HTMLDivElement>(null);

  // 17-d — messages "arrive" like a real chat: one staggered pop, top to
  // bottom, the first time the card scrolls into view (once, never replays).
  useLayoutEffect(() => {
    if (!cardRef.current || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-bubble]',
        { opacity: 0, y: 12, scale: 0.97 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          stagger: 0.07,
          ease: 'power2.out',
          scrollTrigger: { trigger: cardRef.current, start: 'top 85%', once: true },
        }
      );
    }, cardRef.current);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={cardRef}
      dir="rtl"
      className="overflow-hidden border border-sadn-plum-100 bg-sadn-canvas"
    >
      {/* WhatsApp-style top bar — brand plum, one per customer */}
      <div className="flex items-center gap-2.5 bg-sadn-plum-800 px-4 py-2.5">
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sadn-plum-100 font-sadn-display text-sm text-sadn-plum-800"
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight text-white">
            {thread.customerName}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[10px] leading-tight text-white/55">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#4fce5d]" />
            متصل
          </p>
        </div>
        <CheckCheck className="h-4 w-4 shrink-0 text-white/40" strokeWidth={1.75} aria-hidden />
      </div>

      {/* Chat canvas */}
      <div className="sadn-sheet-scroll max-h-[560px] overflow-y-auto bg-[#ece5db] p-4">
        <p className="mx-auto w-fit bg-white px-3 py-1 text-[10px] font-medium text-sadn-ink-soft shadow-[0_1px_1px_rgba(0,0,0,0.06)]">
          {thread.dateLabel}
        </p>
        <ul className="mt-3 space-y-2.5">
          {thread.messages.map((m) => {
            const store = m.from === 'store';
            const emojiOnly = EMOJI_ONLY.test(m.text);
            return (
              <li
                key={m.id}
                data-bubble
                className={`relative w-fit max-w-[85%] px-3 py-2 shadow-[0_1px_1px_rgba(0,0,0,0.07)] ${
                  store
                    ? 'ms-auto rounded-2xl rounded-se-sm bg-sadn-plum-100'
                    : 'me-auto rounded-2xl rounded-ss-sm bg-white'
                } ${emojiOnly ? 'py-1.5' : ''}`}
              >
                <p
                  className={`whitespace-pre-wrap text-sadn-ink ${
                    emojiOnly ? 'text-lg leading-snug' : 'text-[13px] leading-[1.55]'
                  }`}
                >
                  {m.text}
                </p>
                <span className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-sadn-ink-soft">
                  <span dir="ltr">{m.time}</span>
                  {store && (
                    <CheckCheck
                      className="h-3 w-3 text-sadn-plum-600"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  )}
                </span>
                {m.reaction && (
                  <span
                    aria-hidden
                    className="absolute -bottom-2 start-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
                  >
                    {m.reaction}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
