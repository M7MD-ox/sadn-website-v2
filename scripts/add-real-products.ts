/**
 * Task 14 — put the owner's REAL abaya photos on the storefront.
 *
 * Mapping (photo → existing product, slugs kept stable so URLs never break):
 *  1. cream floral print, bow-cuff balloon sleeves → abaya-ivory-dune   → "Ivory Bloom Abaya"
 *  2. black wide abaya + ash shawl (street)        → abaya-noir-flow    → Noir Flow Abaya
 *  3. charcoal abaya, wrapped drape (cafe)         → abaya-charcoal-mist→ Charcoal Mist Abaya
 *  4. deep burgundy layered cape set               → abaya-plum-haze    → "Bordeaux Layers Abaya"
 *  5. sage-green layered set + ivory scarf         → abaya-olive-kimono → "Sage Layers Abaya"
 *  6. chocolate brown, chain-belt detail           → abaya-mocha-crepe  → Mocha Crepe Abaya
 *
 *  AI-only placeholders without real photos (abaya-rose-taupe, abaya-onyx-luxe)
 *  are deactivated (NOT deleted) — the owner can re-enable them from the dashboard.
 *
 *  Hero slideshow switches to 3 of the real photos (previous value logged for revert).
 */
import { db } from "../src/lib/db";

const SIZES = JSON.stringify(["S", "M", "L", "XL"]);
const TAG = "Where modesty meets its masterpiece.";

type Update = {
  slug: string;
  name: string;
  nameAr: string;
  description: string;
  image: string;
  colors: string;
  featured?: boolean;
  isNew?: boolean;
};

const updates: Update[] = [
  {
    slug: "abaya-ivory-dune",
    name: "Ivory Bloom Abaya",
    nameAr: "عباية إيفوري بلوم",
    description:
      "Hand-finished floral print scattered across ivory crepe — soft balloon sleeves tied with little bows at the cuff, falling from a gathered yoke into one full-flowing skirt. Light, breezy and completely non-sheer: modesty with a garden in its step.",
    image: "/uploads/abaya-ivory-bloom.webp",
    colors: JSON.stringify([
      { name: "Ivory", hex: "#F1E9DC" },
      { name: "Cocoa", hex: "#6B5344" },
    ]),
    featured: true,
    isNew: true,
  },
  {
    slug: "abaya-noir-flow",
    name: "Noir Flow Abaya",
    nameAr: "عباية نوار المنسدلة",
    description:
      "Our signature abaya — a generous sweep of premium Nida that falls away from the body in one unbroken line, styled with a soft ash-grey scarf to finish the look. Wide cuffs, full coverage, completely non-sheer. Cut loose on purpose: modesty that never asks for adjusting.",
    image: "/uploads/abaya-noir-flow.webp",
    colors: JSON.stringify([
      { name: "Noir", hex: "#1C1A1C" },
      { name: "Ash", hex: "#8E8A8A" },
    ]),
    featured: true,
  },
  {
    slug: "abaya-charcoal-mist",
    name: "Charcoal Mist Abaya",
    nameAr: "عباية ضباب الفحم",
    description:
      "Deep charcoal with a quiet matte finish and an asymmetric drape that wraps the shoulders like mist. Weighty crepe holds its line all day — full coverage, completely non-sheer, made to move with you, never against you.",
    image: "/uploads/abaya-charcoal-mist.webp",
    colors: JSON.stringify([
      { name: "Charcoal", hex: "#3A3739" },
      { name: "Mist", hex: "#9B979B" },
    ]),
  },
  {
    slug: "abaya-plum-haze",
    name: "Bordeaux Layers Abaya",
    nameAr: "عباية بوردو الطبقات",
    description:
      "A layered occasion piece in deep bordeaux — an overlapping cape panel spills across the shoulders over a full, gathered skirt, finished with a sand-toned scarf. Rich, flowing and completely non-sheer: the abaya that walks into the room before you do.",
    image: "/uploads/abaya-bordeaux-layers.webp",
    colors: JSON.stringify([
      { name: "Bordeaux", hex: "#6B1F2A" },
      { name: "Sand", hex: "#D9CBB8" },
    ]),
    featured: true,
  },
  {
    slug: "abaya-olive-kimono",
    name: "Sage Layers Abaya",
    nameAr: "عباية سيج الطبقات",
    description:
      "Sage-green crinkle fabric cut long and loose, layered under a matching shoulder cape and finished with a soft ivory scarf. Weightless linen-touch weave, full coverage, completely non-sheer — everyday calm, tailored wide.",
    image: "/uploads/abaya-sage-layers.webp",
    colors: JSON.stringify([
      { name: "Sage", hex: "#97A58E" },
      { name: "Ivory", hex: "#F1E9DC" },
    ]),
    isNew: true,
  },
  {
    slug: "abaya-mocha-crepe",
    name: "Mocha Crepe Abaya",
    nameAr: "عباية موكا كريب",
    description:
      "Warm chocolate crepe with a sculpted, enveloping cut and a delicate chain-belt detail at the waist. It falls in one clean sweep to the floor — full coverage, completely non-sheer, quietly rich.",
    image: "/uploads/abaya-mocha-crepe.webp",
    colors: JSON.stringify([
      { name: "Chocolate", hex: "#4A3226" },
      { name: "Mocha", hex: "#8A6A55" },
    ]),
  },
];

const setting = await db.setting.findUnique({ where: { id: "singleton" } });
console.log("PREVIOUS heroImages:", setting?.heroImages);

for (const u of updates) {
  const data: Record<string, unknown> = {
    name: u.name,
    nameAr: u.nameAr,
    description: u.description,
    tagline: TAG,
    images: JSON.stringify([u.image]),
    colors: u.colors,
    sizes: SIZES,
  };
  if (u.featured !== undefined) data.featured = u.featured;
  if (u.isNew !== undefined) data.isNew = u.isNew;

  const res = await db.product.updateMany({
    where: { slug: u.slug },
    data,
  });
  console.log(`${u.slug}: updated ${res.count}`);
}

// Retire the two AI-only placeholders (reversible from the dashboard)
const off = await db.product.updateMany({
  where: { slug: { in: ["abaya-rose-taupe", "abaya-onyx-luxe"] } },
  data: { active: false, featured: false },
});
console.log(`deactivated AI-only placeholders: ${off.count}`);

// Hero slideshow → real photos (3 shots, crossfade stays on the owner's interval)
await db.setting.update({
  where: { id: "singleton" },
  data: {
    heroImages: JSON.stringify([
      "/uploads/abaya-noir-flow.webp",
      "/uploads/abaya-bordeaux-layers.webp",
      "/uploads/abaya-sage-layers.webp",
    ]),
  },
});
console.log("heroImages set to 3 real photos");

await db.$disconnect();
