/**
 * Bilingual field pick (round 18-3a1) — the exact `lang === 'ar'
 * ? x.ar || x.en : x.en || x.ar` idiom that used to be copy-pasted across
 * the storefront and the server-rendered policy pages.
 *
 * NO 'use client' — server components (policies pages) import this too.
 * The "other-language" slot falls back to the requested language's value,
 * so an owner who filled only one language never renders an empty string.
 */
export function pickBi(lang: 'en' | 'ar', en: string, ar: string): string {
  return lang === 'ar' ? ar || en : en || ar;
}
