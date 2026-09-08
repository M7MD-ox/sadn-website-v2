import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

/**
 * SADN catalog seed — round 11 brand pivot:
 * the atelier now sells LOOSE WOMEN'S ABAYAS only (owner brief).
 * Replaces the earlier streetwear catalog + old static sections and seeds
 * the customer-review wall (16:9 chat screenshots, owner replaces them
 * with real ones from the dashboard).
 */

type SeedProduct = {
  slug: string;
  name: string;
  nameAr: string;
  tagline: string;
  description: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  colors: { name: string; hex: string }[];
  sizes: string[];
  featured?: boolean;
  isNew?: boolean;
  stock: number;
  rating: number;
  reviewsCount: number;
};

const SIZES = ['S', 'M', 'L', 'XL'];

const categories = [
  { slug: 'daily', labelEn: 'Everyday', labelAr: 'يومية', order: 1 },
  { slug: 'occasion', labelEn: 'Occasion', labelAr: 'مناسبات', order: 2 },
];

const products: SeedProduct[] = [
  {
    slug: 'abaya-noir-flow',
    name: 'Noir Flow Abaya',
    nameAr: 'عباية نوار المنسدلة',
    tagline: 'Where modesty meets its masterpiece.',
    description:
      'Our signature abaya — a generous sweep of premium Nida that falls away from the body in one unbroken line. A soft asymmetric cape overlay drapes across the shoulders; wide cuffs, full coverage, completely non-sheer. Cut loose on purpose: modesty that never asks for adjusting.',
    category: 'daily',
    price: 1450,
    compareAtPrice: 1750,
    images: ['/products/abaya-noir-flow.png'],
    colors: [
      { name: 'Noir', hex: '#1C1A1C' },
      { name: 'Ash', hex: '#8E8A8A' },
    ],
    sizes: SIZES,
    featured: true,
    isNew: true,
    stock: 36,
    rating: 4.9,
    reviewsCount: 132,
  },
  {
    slug: 'abaya-ivory-dune',
    name: 'Ivory Dune Abaya',
    nameAr: 'عباية دُن العاجية',
    tagline: 'Light as dune sand, cut generously.',
    description:
      'An open-front abaya in warm ivory crepe, cinched with a matching fabric belt you can leave loose or knot. Featherweight fabric with an opaque double layer at the body — made for long days and warmer evenings.',
    category: 'daily',
    price: 1350,
    images: ['/products/abaya-ivory-dune.png'],
    colors: [
      { name: 'Ivory', hex: '#F1E9DC' },
      { name: 'Sand', hex: '#D9CBB8' },
    ],
    sizes: SIZES,
    isNew: true,
    stock: 28,
    rating: 4.8,
    reviewsCount: 64,
  },
  {
    slug: 'abaya-olive-kimono',
    name: 'Olive Kimono Abaya',
    nameAr: 'عباية الزيتون الكيمونو',
    tagline: 'Kimono sleeves that move with you.',
    description:
      'A closed abaya in deep olive with wide kimono sleeves that catch every movement. Hidden press studs keep the front clean; the drape does the rest. Unlined, breathable, and quietly unlike anything else in the room.',
    category: 'daily',
    price: 1390,
    images: ['/products/abaya-olive-kimono.png'],
    colors: [
      { name: 'Olive', hex: '#706C4A' },
      { name: 'Sage', hex: '#A8A58C' },
    ],
    sizes: SIZES,
    stock: 24,
    rating: 4.7,
    reviewsCount: 41,
  },
  {
    slug: 'abaya-mocha-crepe',
    name: 'Mocha Crepe Abaya',
    nameAr: 'عباية موكا كريب',
    tagline: 'Everyday crepe, quietly refined.',
    description:
      'A closed-front everyday abaya in mocha Kuwaiti crepe with tonal stitching along the placket and cuffs. Substantial enough to fall perfectly, soft enough to live in. The neutral that goes with everything you already own.',
    category: 'daily',
    price: 1290,
    compareAtPrice: 1550,
    images: ['/products/abaya-mocha-crepe.png'],
    colors: [
      { name: 'Mocha', hex: '#8A6A55' },
      { name: 'Taupe', hex: '#B7A392' },
    ],
    sizes: SIZES,
    stock: 30,
    rating: 4.8,
    reviewsCount: 57,
  },
  {
    slug: 'abaya-plum-haze',
    name: 'Plum Haze Abaya',
    nameAr: 'عباية ضباب البرقوق',
    tagline: 'Deep plum, satin-touched.',
    description:
      'Our house plum in abaya form — a loose, flowing cut in matte Nida with satin-finished cuffs that catch the light as you move. Full-length, fully opaque, and made for evenings that start serious and end late.',
    category: 'occasion',
    price: 1650,
    images: ['/products/abaya-plum-haze.png'],
    colors: [
      { name: 'Deep Plum', hex: '#4B3249' },
      { name: 'Soft Plum', hex: '#6E5568' },
    ],
    sizes: SIZES,
    featured: true,
    stock: 18,
    rating: 4.9,
    reviewsCount: 48,
  },
  {
    slug: 'abaya-charcoal-mist',
    name: 'Charcoal Mist Abaya',
    nameAr: 'عباية ضباب الفحم',
    tagline: 'A pleated back, softened charcoal.',
    description:
      'Charcoal grey with a surprise: a finely pleated back panel that sways with each step. Front stays minimal — press-stud closure, wide straight sleeves. Workday to dinner without changing a thing.',
    category: 'occasion',
    price: 1550,
    images: ['/products/abaya-charcoal-mist.png'],
    colors: [
      { name: 'Charcoal', hex: '#3A3739' },
      { name: 'Mist', hex: '#9B979B' },
    ],
    sizes: SIZES,
    stock: 20,
    rating: 4.8,
    reviewsCount: 33,
  },
  {
    slug: 'abaya-rose-taupe',
    name: 'Rose Taupe Abaya',
    nameAr: 'عباية الورد الترابي',
    tagline: 'Pearl buttons, dusty-rose calm.',
    description:
      'Dusty rose softened towards taupe — a gentle, earthy pink that flatters every skin tone. Delicate pearl buttons line the cuffs; the body stays loose, flowing and fully covered. The piece people ask you about.',
    category: 'occasion',
    price: 1590,
    images: ['/products/abaya-rose-taupe.png'],
    colors: [
      { name: 'Dusty Rose', hex: '#C9A29A' },
      { name: 'Pearl', hex: '#EFE4E0' },
    ],
    sizes: SIZES,
    isNew: true,
    stock: 22,
    rating: 4.9,
    reviewsCount: 29,
  },
  {
    slug: 'abaya-onyx-luxe',
    name: 'Onyx Luxe Abaya',
    nameAr: 'عباية أونكس الفخمة',
    tagline: 'The occasion piece — gold thread, satin soul.',
    description:
      'The atelier at its most considered: lustrous black satin-finish fabric, hand-guided gold threadwork at the cuffs, and a silhouette that falls like poured ink. Loose, covering and unmistakably occasion. Limited batch.',
    category: 'occasion',
    price: 2450,
    compareAtPrice: 2890,
    images: ['/products/abaya-onyx-luxe.png'],
    colors: [
      { name: 'Onyx', hex: '#141216' },
      { name: 'Noir', hex: '#1C1A1C' },
    ],
    sizes: SIZES,
    featured: true,
    stock: 12,
    rating: 5.0,
    reviewsCount: 21,
  },
];

const reviews = [
  {
    image: '/uploads/reviews/review-1.svg',
    caption: 'أية م. — القاهرة',
    order: 1,
  },
  {
    image: '/uploads/reviews/review-2.svg',
    caption: 'Salma K. — Alexandria',
    order: 2,
  },
  {
    image: '/uploads/reviews/review-3.svg',
    caption: 'منى ر. — المنصورة',
    order: 3,
  },
  {
    image: '/uploads/reviews/review-4.svg',
    caption: 'هدى ع. — الجيزة',
    order: 4,
  },
];

async function main() {
  // Brand pivot: replace the entire catalog + sections + review wall.
  // Orders are cleared too: the currency moved USD → EGP, so every old
  // USD-denominated demo order is invalidated; the owner starts the manual
  // order register fresh (round 12).
  await db.order.deleteMany({});
  await db.product.deleteMany({});
  await db.category.deleteMany({});
  await db.review.deleteMany({});

  for (const p of products) {
    await db.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        nameAr: p.nameAr,
        tagline: p.tagline,
        description: p.description,
        category: p.category,
        price: p.price,
        compareAtPrice: p.compareAtPrice ?? null,
        images: JSON.stringify(p.images),
        colors: JSON.stringify(p.colors),
        sizes: JSON.stringify(p.sizes),
        featured: p.featured ?? false,
        isNew: p.isNew ?? false,
        stock: p.stock,
        rating: p.rating,
        reviewsCount: p.reviewsCount,
      },
    });
    console.log(`seeded: ${p.slug}`);
  }

  await db.category.createMany({ data: categories });
  await db.review.createMany({ data: reviews });

  const [productCount, categoryCount, reviewCount] = await Promise.all([
    db.product.count(),
    db.category.count(),
    db.review.count(),
  ]);
  console.log(`done — ${productCount} products / ${categoryCount} categories / ${reviewCount} reviews`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
