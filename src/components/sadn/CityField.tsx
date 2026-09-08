'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { matchCities, type City } from '@/lib/cities';
import { useLang, useT } from '@/lib/i18n';

/**
 * Governorate combobox — bilingual EN/AR matching with keyboard navigation
 * (round 7-a). Extracted verbatim from CheckoutSheet (18-3a2).
 *
 * While the dropdown is open, Escape stops propagation here so the sheet's
 * useEscapeToClose handler underneath does not also fire — the combobox
 * keeps winning, exactly as before the sheet grew an Escape handler.
 */
export function CityField({
  value,
  onChange,
  invalid,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  error?: string;
}) {
  const t = useT();
  const lang = useLang();
  const [cityOpen, setCityOpen] = useState(false);
  const [cityIdx, setCityIdx] = useState(-1);
  const cityWrapRef = useRef<HTMLDivElement>(null);
  const cityList = matchCities(value);
  const cityOptions: City[] =
    cityList.hits.length > 0 || value.trim().length > 0
      ? cityList.hits
      : cityList.popular;

  // Close the suggestions on any outside tap.
  useEffect(() => {
    if (!cityOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!cityWrapRef.current?.contains(e.target as Node)) setCityOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [cityOpen]);

  const pickCity = (c: City) => {
    onChange(c.en);
    setCityOpen(false);
    setCityIdx(-1);
  };

  const onCityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!cityOpen || cityOptions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCityIdx((i) => (i + 1) % cityOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCityIdx((i) => (i <= 0 ? cityOptions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && cityIdx >= 0) {
      e.preventDefault();
      pickCity(cityOptions[cityIdx]);
    } else if (e.key === 'Escape') {
      // 18-3a2 — the open combobox wins over the sheet's Escape-to-close.
      e.stopPropagation();
      setCityOpen(false);
    }
  };

  return (
    <div ref={cityWrapRef} className="relative col-span-1">
      <span className="mb-1 block text-xs font-medium text-sadn-ink">
        {t('fCity')}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setCityOpen(true);
          setCityIdx(-1);
        }}
        onFocus={() => setCityOpen(true)}
        onKeyDown={onCityKeyDown}
        placeholder={t('phCity')}
        autoComplete="off"
        role="combobox"
        aria-expanded={cityOpen && cityOptions.length > 0}
        aria-controls="city-suggestions"
        aria-activedescendant={
          cityIdx >= 0 ? `city-opt-${cityIdx}` : undefined
        }
        aria-autocomplete="list"
        aria-label={t('ariaCityCombo')}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? 'err-city' : undefined}
        enterKeyHint="next"
        className="sadn-input pe-8"
      />
      <ChevronDown
        className={`pointer-events-none absolute end-3 top-[2.4rem] h-3.5 w-3.5 text-sadn-plum-200 transition-transform duration-200 ${
          cityOpen ? 'rotate-180 text-sadn-plum-400' : ''
        }`}
        strokeWidth={2}
        aria-hidden
      />
      {cityOpen && cityOptions.length > 0 && (
        <ul
          id="city-suggestions"
          role="listbox"
          aria-label={t('ariaCityList')}
          className="sadn-sheet-scroll absolute inset-x-0 top-full z-20 mt-1 max-h-44 overflow-y-auto rounded-none border border-sadn-plum-100 bg-sadn-canvas p-1 shadow-xl shadow-sadn-plum-950/10 animate-in fade-in slide-in-from-top-2 duration-200 motion-reduce:animate-none"
        >
          {cityList.hits.length === 0 &&
            value.trim().length === 0 && (
              <li
                aria-hidden
                className="eyebrow-rule px-3 pb-1 pt-1.5 text-[9px] font-semibold uppercase tracking-luxe-tight text-sadn-plum-400"
              >
                {t('cityPopular')}
              </li>
            )}
          {cityOptions.map((c, i) => (
            <li
              key={c.en}
              role="option"
              aria-selected={i === cityIdx}
              id={`city-opt-${i}`}
            >
              <button
                type="button"
                onClick={() => pickCity(c)}
                onMouseEnter={() => setCityIdx(i)}
                className={`flex w-full items-center justify-between gap-2 rounded-none px-3 py-2 text-start text-[13px] transition-colors ${
                  i === cityIdx
                    ? 'bg-sadn-plum-800 text-white ring-1 ring-inset ring-white/20'
                    : 'text-sadn-ink hover:bg-sadn-plum-50'
                }`}
              >
                <span className="font-medium">
                  {lang === 'ar' ? c.ar : c.en}
                </span>
                <span
                  className={`text-[11px] ${
                    i === cityIdx ? 'text-white/60' : 'text-sadn-ink-soft'
                  }`}
                >
                  {lang === 'ar' ? c.en : c.ar}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {invalid && (
        <span id="err-city" role="alert" className="sadn-field-error">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
}
