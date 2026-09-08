'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft } from 'lucide-react';
import { useLang, useT } from '@/lib/i18n';

/**
 * Product gallery (extracted verbatim from ProductScreen, 18-3a2) — the
 * swipeable image track, the floating back chip and the slide dots,
 * plus the scroll-sync math. The ref is owned by the parent (the fly-to-bag
 * ghost reads the <img> nodes through it); the current slide index is
 * mirrored upward via onSlideChange for the same flow.
 * Round 36 (owner): the share chip is gone — the gallery floats only the
 * quiet back button over the photo.
 */
export function ProductGallery({
  galleryRef,
  images,
  name,
  onSlideChange,
  onRequestClose,
}: {
  galleryRef: React.RefObject<HTMLDivElement | null>;
  images: string[];
  name: string;
  onSlideChange: (idx: number) => void;
  onRequestClose: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const rtl = lang === 'ar';
  const [slide, setSlide] = useState(0);

  const onGalleryScroll = () => {
    const el = galleryRef.current;
    if (!el) return;
    // RTL scrollers report negative scrollLeft — use magnitude for the index.
    const idx = Math.round(Math.abs(el.scrollLeft) / el.clientWidth);
    if (idx !== slide) {
      setSlide(idx);
      onSlideChange(idx);
    }
  };

  const goToSlide = (idx: number) => {
    const el = galleryRef.current;
    if (!el) return;
    el.scrollTo({ left: (rtl ? -1 : 1) * idx * el.clientWidth, behavior: 'smooth' });
    setSlide(idx);
    onSlideChange(idx);
  };

  return (
    <div className="relative">
      <div
        ref={galleryRef}
        onScroll={onGalleryScroll}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto bg-sadn-stone"
      >
        {images.map((src, i) => (
          <div
            key={src + i}
            className="relative aspect-[4/5] w-full shrink-0 snap-center"
          >
            <Image
              src={src}
              alt={t('viewGalleryImage', { name, n: i + 1 })}
              fill
              priority={i === 0}
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {/* Floating controls (Mobile only) */}
      <div className="absolute start-3 top-3 flex flex-col gap-1.5 lg:hidden">
        <button
          type="button"
          aria-label={t('pdBack')}
          onClick={onRequestClose}
          className="relative flex h-[34px] w-[34px] items-center justify-center rounded-[2px] bg-sadn-canvas/85 text-sadn-ink shadow-sm shadow-sadn-plum-950/10 ring-1 ring-inset ring-sadn-plum-100 backdrop-blur transition-transform before:absolute before:-inset-[10px] before:content-[''] active:scale-90"
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" strokeWidth={2} />
        </button>
      </div>

      {/* Slide dots (Mobile only) */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 lg:hidden">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              aria-label={t('ariaViewImage', { n: i + 1 })}
              onClick={() => goToSlide(i)}
              className={`h-1.5 rounded-none transition-all duration-300 ${
                slide === i
                  ? 'w-5 bg-sadn-plum-800'
                  : 'w-1.5 bg-sadn-plum-950/25'
              }`}
            />
          ))}
        </div>
      )}

      {/* Desktop thumbnails strip */}
      {images.length > 1 && (
        <div className="hidden lg:flex gap-3 pt-3 overflow-x-auto">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              aria-label={t('ariaViewImage', { n: i + 1 })}
              onClick={() => goToSlide(i)}
              className={`relative h-24 w-20 shrink-0 overflow-hidden rounded-[2px] border-2 transition-all ${
                slide === i
                  ? 'border-sadn-plum-800 opacity-100 shadow-sm'
                  : 'border-transparent opacity-60 hover:opacity-100 hover:border-sadn-plum-200'
              }`}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
