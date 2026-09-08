'use client';

import { Star } from 'lucide-react';
import { useT } from '@/lib/i18n';

export function Stars({ rating }: { rating: number }) {
  // Round 19: the rating label is bilingual like everything else.
  const t = useT();
  return (
    <div className="flex items-center gap-0.5" aria-label={t('starsAria', { rating: String(rating) })}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${
            i < Math.round(rating)
              ? 'fill-sadn-plum-600 text-sadn-plum-600'
              : 'text-sadn-plum-200'
          }`}
        />
      ))}
    </div>
  );
}
