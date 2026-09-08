'use client';

import { useT, useLang } from '@/lib/i18n';
import { hapticTap } from '@/lib/haptic';
import { WhatsAppGlyph } from './whatsapp';

/**
 * Floating WhatsApp chip (17-c, owner ask) — SMALL by design: a quiet 36px
 * square (the site's 2px micro-radius, not a big bubble) that hugs the shell's
 * end edge above the bottom nav. WhatsApp-green so it reads instantly, white
 * glyph, opens wa.me with a short bilingual opener. Hidden entirely when the
 * owner hasn't saved a WhatsApp number yet. z-40 keeps it under the nav
 * (z-50) and under every sheet/modal so it never pokes through overlays.
 * `end-[max(...)]` keeps it anchored to the 430px shell on desktop while
 * falling back to a 12px viewport margin on narrow phones; logical inset
 * flips sides automatically in RTL.
 */
export function FloatingWhatsApp({ phone }: { phone: string }) {
  const t = useT();
  const lang = useLang();
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  const opener = lang === 'ar' ? 'أهلاً سدن!' : 'Hello SADN!';
  const href = `https://wa.me/${digits}?text=${encodeURIComponent(opener)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('ariaWhatsappFloat')}
      onClick={() => hapticTap()}
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+74px)] end-[max(12px,calc(50%-203px))] z-40 flex h-9 w-9 items-center justify-center rounded-[2px] bg-[#25D366] text-white shadow-sm transition-[transform,filter] duration-150 hover:brightness-105 active:scale-90"
    >
      <WhatsAppGlyph className="h-[18px] w-[18px]" />
    </a>
  );
}
