-- ============================================================
-- SADN — Supabase schema.sql (PostgreSQL)
-- 6 tables: Product, Category, Setting, Review, StockMovement, Order
--
-- How to run:
--   Supabase Dashboard → SQL Editor → New query
--   → paste ALL of this file → Run
--
-- Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS everywhere).
-- ============================================================

CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "compareAtPrice" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "images" TEXT NOT NULL,
    "colors" TEXT NOT NULL,
    "sizes" TEXT NOT NULL,
    "hiddenSizes" TEXT NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.8,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Setting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "whatsappNumber" TEXT NOT NULL DEFAULT '',
    "adminPasswordHash" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "bannerVisible" BOOLEAN NOT NULL DEFAULT true,
    "bannerTextEn" TEXT NOT NULL DEFAULT '10% OFF your first order · code SADN10',
    "bannerTextAr" TEXT NOT NULL DEFAULT 'خصم ١٠٪ على أول طلب · كود SADN10',
    "shippingFee" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "promoEnabled" BOOLEAN NOT NULL DEFAULT true,
    "promoCode" TEXT NOT NULL DEFAULT 'SADN10',
    "promoPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "promoMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "heroImages" TEXT NOT NULL DEFAULT '["/products/hero-abaya.png"]',
    "heroInterval" INTEGER NOT NULL DEFAULT 6,
    "phones" TEXT NOT NULL DEFAULT '[]',
    "socials" TEXT NOT NULL DEFAULT '{"instagram":"","facebook":"","tiktok":""}',
    "instapayNumber" TEXT NOT NULL DEFAULT '',
    "vodafoneNumber" TEXT NOT NULL DEFAULT '',
    "orderStages" TEXT NOT NULL DEFAULT '[]',
    "marquee" TEXT NOT NULL DEFAULT '{"enabled":true,"textEn":"Where modesty meets its masterpiece · Loose by design · New season","textAr":"حيث تلتقي السترة بتحفتها · واسعة وقصّتها مريحة · موسم جديد","ctaHref":"","ctaLabelEn":"","ctaLabelAr":""}',
    "sizeGuide" TEXT NOT NULL DEFAULT '[]',
    "productSections" TEXT NOT NULL DEFAULT '[]',
    "policies" TEXT NOT NULL DEFAULT '[]',
    "chatThreads" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Review" (
    "id" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StockMovement" (
    "id" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '',
    "qty" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Order" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "notes" TEXT,
    "items" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "promoCode" TEXT,
    "shipping" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "paymentMethod" TEXT NOT NULL DEFAULT 'cod',
    "paymentSenderPhone" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'payment_review',
    "stagesDone" TEXT NOT NULL DEFAULT '[]',
    "source" TEXT NOT NULL DEFAULT 'whatsapp',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Order_number_key" ON "Order"("number");

-- ============================================================
-- Row Level Security
-- - service key (sb_secret_...) always bypasses RLS → full access
--   for the website backend (read + write everything)
-- - anon (public visitors): read-only on Product / Category / Review
-- - Setting / Order / StockMovement: backend only (private data:
--   admin hash, customer phones, addresses… never public)
-- ============================================================

ALTER TABLE "Product"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Setting"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockMovement"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order"          ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sadn_public_read_Product" ON "Product";
CREATE POLICY "sadn_public_read_Product" ON "Product"
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "sadn_public_read_Category" ON "Category";
CREATE POLICY "sadn_public_read_Category" ON "Category"
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "sadn_public_read_Review" ON "Review";
CREATE POLICY "sadn_public_read_Review" ON "Review"
    FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- Grants (Supabase default privileges usually cover this —
-- kept explicit for safety)
-- ============================================================

GRANT USAGE ON SCHEMA "public" TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA "public" TO service_role;
GRANT SELECT ON "Product", "Category", "Review" TO anon, authenticated;
