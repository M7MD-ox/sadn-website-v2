'use client';

import { MessageCircle } from 'lucide-react';
import { SettingsCard } from '../kit';
import { inputCls, type SettingsCardProps } from './shared';

/** WhatsApp order number — orders are sent here as structured messages. */
export function WhatsAppCard({ s, setS, baseline, t, lang, save, saveBtn }: SettingsCardProps) {
  return (
    <SettingsCard
      icon={MessageCircle}
      title={t('whatsappTitle')}
      description={t('whatsappBody')}
      iconTileClassName="bg-[#25D366]/10"
      iconClassName="text-[#1fb959]"
    >
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={s.whatsappNumber}
          onChange={(e) => setS((p) => ({ ...p, whatsappNumber: e.target.value }))}
          placeholder="201001234567"
          dir="ltr"
          inputMode="tel"
          className={`${inputCls} flex-1 font-mono`}
        />
        {saveBtn(
          s.whatsappNumber === baseline.whatsappNumber,
          () => void save(['whatsappNumber'], 'whatsappSaved', 'wa'),
          'wa'
        )}
      </div>
      {baseline.whatsappNumber && (
        <p className="mt-2.5 flex items-center gap-2 text-[11px] text-sadn-ink-soft">
          <span className="inline-block h-2 w-2 rounded-none bg-[#25D366]" />
          {lang === 'ar' ? 'الطلبات تُرسل حالياً إلى' : 'Orders currently go to'}:
          <span dir="ltr" className="font-mono font-medium text-sadn-ink">
            +{baseline.whatsappNumber}
          </span>
          <a
            href={`https://wa.me/${baseline.whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ms-1 font-medium text-[#1fb959] underline-offset-2 hover:underline"
          >
            {lang === 'ar' ? 'اختبار' : 'Test'}
          </a>
        </p>
      )}
    </SettingsCard>
  );
}
