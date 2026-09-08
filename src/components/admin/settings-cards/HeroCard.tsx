'use client';

import { useRef, useState } from 'react';
import { Images, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Field, SettingsCard } from '../kit';
import { inputCls, type SettingsCardProps } from './shared';

/** Hero slideshow (round 13) — owns its own upload flow (R12 extraction). */
export function HeroCard({ s, setS, baseline, t, save, saveBtn }: SettingsCardProps) {
  const [uploading, setUploading] = useState(false);
  const heroFileRef = useRef<HTMLInputElement>(null);

  const uploadHero = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.ok) {
        setS((prev) => ({ ...prev, heroImages: [...prev.heroImages, data.url] }));
      } else {
        toast.error(data.error ?? t('uploadFailed'));
      }
    } catch {
      toast.error(t('uploadFailed'));
    } finally {
      setUploading(false);
      if (heroFileRef.current) heroFileRef.current.value = '';
    }
  };

  return (
    <SettingsCard icon={Images} title={t('heroTitle')} description={t('heroBody')}>
      <p className="mt-4 text-xs font-medium text-sadn-ink">{t('heroImagesLabel')}</p>
      <ul className="mt-2 space-y-2">
        {s.heroImages.map((img, i) => (
          <li key={img + i} className="flex items-center gap-3 rounded-none border border-sadn-plum-100 p-2">
            <img src={img} alt="" className="h-12 w-16 shrink-0 rounded-none object-cover" />
            <span dir="ltr" className="min-w-0 flex-1 truncate font-mono text-[11px] text-sadn-ink-soft">
              {img}
            </span>
            <button
              type="button"
              aria-label={t('remove')}
              onClick={() =>
                setS((p) => ({
                  ...p,
                  heroImages: p.heroImages.filter((_, idx) => idx !== i),
                }))
              }
              className="tap-target flex items-center justify-center rounded-none text-sadn-ink-soft transition-colors hover:bg-red-50 hover:text-red-600 active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="press inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-none border border-sadn-plum-800 px-4 text-xs font-medium text-sadn-plum-800 transition-colors hover:bg-sadn-plum-800 hover:text-white">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" strokeWidth={1.75} />}
          {t('uploadImage')}
          <input
            ref={heroFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadHero(f);
            }}
          />
        </label>
        <span className="text-[11px] text-sadn-ink-soft">{t('imageUrl')}</span>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field label={t('heroIntervalLabel')} className="block flex-1">
          <input
            type="number"
            min={2}
            max={60}
            value={s.heroInterval}
            onChange={(e) => setS((p) => ({ ...p, heroInterval: Number(e.target.value) }))}
            dir="ltr"
            className={inputCls}
          />
        </Field>
        {saveBtn(
          JSON.stringify(s.heroImages) === JSON.stringify(baseline.heroImages) &&
            s.heroInterval === baseline.heroInterval,
          () => void save(['heroImages', 'heroInterval'], 'heroSaved', 'hero'),
          'hero'
        )}
      </div>
    </SettingsCard>
  );
}
