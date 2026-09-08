'use client';

import Link from 'next/link';
import { Instagram, Music2, Phone, ShieldCheck, type LucideIcon } from 'lucide-react';
import { type StoreConfig } from '@/lib/store-settings';
import { useLang, useT } from '@/lib/i18n';
import { WhatsAppGlyph } from './whatsapp';

/**
 * Site footer — round 38 rebuild (owner):
 *  - socials are three ICONS — WhatsApp / Instagram / TikTok — each opening
 *    the page she manages from the dashboard (WhatsApp = the support number,
 *    Instagram/TikTok = the socials fields);
 *  - one «السياسات» button opens /policies, where every policy is a tappable
 *    accordion — the per-policy link row is gone;
 *  - the bottom line is just «جميع الحقوق محفوظة».
 * The short stacked shape (17-e) stays; pb still clears the bottom nav.
 */
export function SadnFooter({ config }: { config: StoreConfig | null }) {
  const t = useT();

  const waNumber = (config?.whatsappNumber ?? '').replace(/\D/g, '');
  const socials: { name: string; url: string; Icon: LucideIcon }[] = [
    { name: 'Instagram', url: config?.socials.instagram ?? '', Icon: Instagram },
    { name: 'TikTok', url: config?.socials.tiktok ?? '', Icon: Music2 },
  ].filter((s) => s.url);

  return (
    <footer className="mt-auto border-t border-sadn-plum-100 px-5 lg:px-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-12 pt-8 lg:pt-12 text-center">
      <p className="font-sadn-display text-sm font-semibold tracking-wider text-sadn-plum-800">
        SADN · سدن
      </p>

      {config && config.phones.length > 0 && (
        <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          {config.phones.map((p) => (
            <li key={p}>
              <a
                href={`tel:${p.replace(/[^+\d]/g, '')}`}
                className="price-num inline-flex items-center gap-1.5 text-[12px] font-medium text-sadn-ink transition-colors hover:text-sadn-plum-800"
              >
                <Phone className="h-3 w-3 text-sadn-plum-600" strokeWidth={1.75} aria-hidden />
                <span dir="ltr">{p}</span>
                <span className="sr-only">{t('ariaCallPhone', { n: p })}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {socials.length > 0 && (
        <div className="mt-2 flex items-center justify-center gap-0.5">
          {/* WhatsApp leads when the support number exists (round 38) */}
          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('ariaOpenSocial', { name: 'WhatsApp' })}
              className="tap-target flex h-10 w-10 items-center justify-center rounded-none text-sadn-plum-700 transition-colors hover:bg-sadn-plum-50 hover:text-sadn-plum-900 active:scale-90"
            >
              <WhatsAppGlyph className="h-[18px] w-[18px]" fill="currentColor" />
            </a>
          )}
          {socials.map(({ name, url, Icon }) => (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('ariaOpenSocial', { name })}
              className="tap-target flex h-10 w-10 items-center justify-center rounded-none text-sadn-plum-700 transition-colors hover:bg-sadn-plum-50 hover:text-sadn-plum-900 active:scale-90"
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </a>
          ))}
        </div>
      )}

      {/* One policies button → /policies (round 38, owner) */}
      <nav aria-label={t('footerPolicies')} className="mt-4 flex justify-center">
        <Link
          href="/policies"
          className="press inline-flex h-11 items-center justify-center gap-2 border border-sadn-plum-200 bg-white px-6 text-[13px] font-medium text-sadn-plum-800 transition-colors hover:border-sadn-plum-800 hover:bg-sadn-plum-50 dark:bg-transparent"
        >
          <ShieldCheck className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          {t('policiesButton')}
        </Link>
      </nav>

      <p className="mt-5 text-[10px] text-sadn-ink-soft">{t('footerCopyright')}</p>
    </footer>
  );
}
