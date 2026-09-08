/**
 * Egyptian governorates for checkout city autocomplete (round 7-a).
 *
 * Canonical data is bilingual so the combobox can match typed input against
 * either script ("cairo" → القاهرة, "أس" → أسوان). The stored value on the
 * order stays the English name (canonical, stable across language toggles);
 * the placed-order view localizes it back via cityLabel().
 */

export type City = { en: string; ar: string; popular?: boolean };

export const GOVERNORATES: City[] = [
  { en: 'Cairo', ar: 'القاهرة', popular: true },
  { en: 'Giza', ar: 'الجيزة', popular: true },
  { en: 'Alexandria', ar: 'الإسكندرية', popular: true },
  { en: 'Qalyubia', ar: 'القليوبية' },
  { en: 'Port Said', ar: 'بورسعيد' },
  { en: 'Suez', ar: 'السويس' },
  { en: 'Damietta', ar: 'دمياط' },
  { en: 'Dakahlia', ar: 'الدقهلية' },
  { en: 'Sharqia', ar: 'الشرقية' },
  { en: 'Monufia', ar: 'المنوفية' },
  { en: 'Gharbia', ar: 'الغربية' },
  { en: 'Beheira', ar: 'البحيرة' },
  { en: 'Kafr El Sheikh', ar: 'كفر الشيخ' },
  { en: 'Ismailia', ar: 'الإسماعيلية' },
  { en: 'Faiyum', ar: 'الفيوم' },
  { en: 'Beni Suef', ar: 'بني سويف' },
  { en: 'Minya', ar: 'المنيا' },
  { en: 'Asyut', ar: 'أسيوط' },
  { en: 'Sohag', ar: 'سوهاج' },
  { en: 'Qena', ar: 'قنا' },
  { en: 'Luxor', ar: 'الأقصر' },
  { en: 'Aswan', ar: 'أسوان' },
  { en: 'Red Sea', ar: 'البحر الأحمر' },
  { en: 'New Valley', ar: 'الوادي الجديد' },
  { en: 'Marsa Matrouh', ar: 'مطروح' },
  { en: 'North Sinai', ar: 'شمال سيناء' },
  { en: 'South Sinai', ar: 'جنوب سيناء' },
];

const normalize = (s: string) =>
  s
    .trim()
    .toLowerCase()
    // Collapse Arabic diacritics + unify alef/hamza forms for forgiving matches
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');

/**
 * Match governorates against a raw query (EN or AR script, accent/hamza
 * forgiving). Empty query → the popular trio. Returns up to `limit` hits.
 */
export function matchCities(query: string, limit = 6): { hits: City[]; popular: City[] } {
  const q = normalize(query);
  if (!q) {
    return {
      hits: [],
      popular: GOVERNORATES.filter((c) => c.popular),
    };
  }
  const hits = GOVERNORATES.filter(
    (c) => normalize(c.en).includes(q) || normalize(c.ar).includes(q)
  ).slice(0, limit);
  return { hits, popular: [] };
}

/** Localize a stored city string (canonical EN name → AR label when known). */
export function cityLabel(stored: string, lang: 'en' | 'ar'): string {
  if (lang !== 'ar') return stored;
  const hit = GOVERNORATES.find(
    (c) => c.en.toLowerCase() === stored.trim().toLowerCase()
  );
  return hit ? hit.ar : stored;
}
