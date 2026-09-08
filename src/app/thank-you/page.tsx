import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { ensureBootstrap } from '@/lib/bootstrap';
import { StoreChrome } from '@/components/sadn/StoreChrome';
import { ThankYouScreen, type ThankYouOrder } from '@/components/sadn/ThankYouScreen';
import { getStorefrontData } from '@/lib/catalog';
import { buildWhatsAppUrl, serializeOrder, type OrderLine } from '@/lib/orders';
import { thankYouCoupon } from '@/lib/coupons';

/**
 * /thank-you?order=SADN-###### — post-purchase page (round 31, research
 * item 5): confirmation summary, WhatsApp hand-off fallback (popups get
 * blocked), the next-order coupon gift, one-tap re-order, a track link and
 * the WhatsApp opt-in ("سيبي رقمك"). Reached right after checkout; the
 * order number in the URL is the only key, so the page is noindex.
 */
export const metadata: Metadata = {
  title: 'Thank you — SADN | شكراً ليكِ · سدن',
  description: 'Your SADN order is confirmed.',
  robots: { index: false, follow: false },
};

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderNumber } = await searchParams;
  await ensureBootstrap();

  const { products, categories, reviews, config, banner } = await getStorefrontData();

  // Unknown/missing number → the screen renders a graceful generic thank-you.
  const clean = (orderNumber ?? '').trim().toUpperCase();
  const row = /^SADN-\d{6}$/.test(clean)
    ? await db.order.findUnique({ where: { number: clean } })
    : null;

  let order: ThankYouOrder | null = null;
  let waUrls: { en: string; ar: string } | null = null;
  let transfer: { instapayNumber: string; vodafoneNumber: string } = { instapayNumber: '', vodafoneNumber: '' };
  let coupon: { code: string; kind: 'percent' | 'fixed'; value: number; minSubtotal: number } | null = null;

  if (row) {
    order = {
      number: row.number,
      phone: row.phone,
      customerName: row.customerName,
      city: row.city,
      address: row.address,
      paymentMethod: row.paymentMethod as ThankYouOrder['paymentMethod'],
      subtotal: row.subtotal,
      discount: row.discount,
      shipping: row.shipping,
      total: row.total,
      promoCode: row.promoCode,
      items: (() => {
        try {
          return JSON.parse(row.items) as OrderLine[];
        } catch {
          return [];
        }
      })(),
    };
    const settings = await db.setting.findUnique({ where: { id: 'singleton' } });
    const serialized = serializeOrder(row);
    const ownerNumber = settings?.whatsappNumber ?? '';
    if (ownerNumber) {
      waUrls = {
        en: buildWhatsAppUrl(serialized, ownerNumber, 'en'),
        ar: buildWhatsAppUrl(serialized, ownerNumber, 'ar'),
      };
    }
    transfer = {
      instapayNumber: settings?.instapayNumber ?? '',
      vodafoneNumber: settings?.vodafoneNumber ?? '',
    };
    try {
      coupon = await thankYouCoupon(db);
    } catch {
      coupon = null;
    }
  }

  return (
    <StoreChrome products={products} categories={categories} reviews={reviews} config={config} banner={banner}>
      <ThankYouScreen order={order} whatsappUrls={waUrls} transfer={transfer} coupon={coupon} />
    </StoreChrome>
  );
}
