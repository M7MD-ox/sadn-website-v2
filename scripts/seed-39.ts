/**
 * SADN round 39 seed — run: DATABASE_URL=<session-pooler> bun /home/z/seed39.ts
 * (cwd = /home/z/my-project so @prisma/client resolves; explicit env var
 * overrides the stale .env sqlite URL.)
 *
 * 1. Backup products/categories/settings → qa/39-backup.json
 * 2. Categories → ONLY butterfly-bloom (delete daily + occasion)
 * 3. Products → soft-hide everything, upsert Seren (1100 EGP, 5 colors)
 *    and Rahaf (950 EGP, colors left for the owner's dashboard)
 * 4. Settings → 6 policies (owner copy), real WhatsApp number, phones,
 *    official Instagram URL
 * 5. Read-back verification
 */
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';

const db = new PrismaClient();

const SEREN_COLORS = [
  { name: 'بني', hex: '#824b2c' },
  { name: 'زيتي', hex: '#acba87' },
  { name: 'موف', hex: '#bb6e9a' },
  { name: 'رمادي', hex: '#808080' },
  { name: 'عنابي', hex: '#7c223e' },
];

const POLICIES = [
  {
    slug: 'privacy',
    titleEn: 'Privacy Policy',
    titleAr: 'الخصوصيه',
    bodyEn:
      'Your privacy matters to us. The data you share with us (name, mobile number, address) is used only to prepare and deliver your order, and is never shared with any third party except our courier.\nIf you have any question about your data or want to update it, message us on WhatsApp and we will take care of it right away.',
    bodyAr:
      'خصوصيتك أمانة عندنا. بياناتك (الاسم، رقم الموبايل، العنوان) بتُستخدم فقط لتجهيز وتسليم طلبك، ومش بنشاركها مع أي طرف تاني غير شركة الشحن.\nولو عندك أي استفسار عن بياناتك أو حابة تعدّليها، كلّمينا على واتساب وهنظبطك فوراً.',
    enabled: true,
  },
  {
    slug: 'returns',
    titleEn: 'Refund policy',
    titleAr: 'الاسترجاع',
    bodyEn:
      'At SADN we are keen to offer the best quality for a comfortable, distinctive shopping experience.\nReturn/exchange window: you may exchange or return products within 3 days of receiving your order.\nConditions for accepting returns:\n- The product must be in its original condition (unworn, unwashed, free of any perfumes or makeup stains).\n- The original brand tag and its wrapping must be intact.\nShipping cost:\n- For an exchange or return (change of mind or size), the customer covers the return shipping plus the new shipping fee.\n- If there is a manufacturing fault, SADN covers all shipping costs (both ways) free of charge.\nRefund method: after the product reaches our warehouse and passes the condition check, the due amount (minus shipping fees) is transferred via InstaPay or e-wallets within 48 working hours.',
    bodyAr:
      'نحن في «سدن» نحرص على تقديم أفضل جودة لتنالي تجربة تسوق مريحة ومميزة.\nفترة الاسترجاع/الاستبدال: يحق لكِ استبدال أو استرجاع المنتجات خلال 3 أيام من تاريخ استلام الطلب.\nشروط قبول المرتجع:\nأن يكون المنتج بحالته الأصلية تماماً (لم يُلبس، لم يُغسل، خالي من أي عطور أو بقع مكياج).\nوجود التيكت/التاج الأصلي للبراند والغلاف الخاص بالمنتج.\nتكلفة الشحن:\nفي حالة الرغبة في الاستبدال أو الاسترجاع (تغيير رأي أو مقاس)، يتحمل العميل مصاريف الشحن للإرجاع بالإضافة لمصاريف الشحن الجديدة.\nفي حالة وجود عيب صناعة، تتحمل «سدن» كافة مصاريف الشحن (الذهاب والعودة) مجاناً.\nآلية استرداد الأموال: بعد استلامنا للمنتج في مخازننا والتأكد من مطابقته للشروط، يتم تحويل المبلغ المستحق (بعد خصم مصاريف الشحن) عبر (إنستاباي - InstaPay) أو المحافظ الإلكترونية خلال 48 ساعة عمل.',
    enabled: true,
  },
  {
    slug: 'shipping',
    titleEn: 'Shipping policy',
    titleAr: 'الشحن',
    bodyEn:
      'Preparation & delivery: orders are prepared and shipped to arrive within 5–7 working days (some governorates may take up to 10 days).\nOrder confirmation: we contact you to confirm the order before handing it to the courier. If there is no reply, the order may be postponed or cancelled.\nParcel inspection: out of confidence in our quality, you may open the parcel and inspect the fabric, colour and finishing with the courier before receiving it. (Visual inspection only — trying on is strictly not allowed, to keep every piece fresh and clean.)\nRefusing delivery: if you refuse the parcel after inspection without any fault in the product, only the shipping fee is paid to the courier — nothing more.',
    bodyAr:
      'مدة التجهيز والتوصيل: يتم تجهيز وشحن الطلبات لتصلك خلال (5 إلى 7 أيام عمل) (بعض المحافظات قد تصل إلى 10 أيام).\nتأكيد الطلب: يتم التواصل معكِ لتأكيد الطلب قبل تسليمه لشركة الشحن. في حالة عدم الرد، قد يتم تأجيل أو إلغاء الطلب.\nمعاينة الشحنة: لثقتنا في جودة منتجاتنا، نتيح لكِ فتح الشحنة ومعاينة (الخامة، اللون، والتقفيل) مع المندوب قبل الاستلام. (المعاينة ظاهرية فقط، ويُمنع القياس نهائياً للحفاظ على جودة ونظافة القطع).\nعدم الاستلام: في حالة رفض استلام الطلب بعد المعاينة بدون وجود عيب في المنتج، يتم دفع «مصاريف الشحن فقط» للمندوب ولا تتحملين أي تكاليف أخرى.',
    enabled: true,
  },
  {
    slug: 'terms',
    titleEn: 'Terms of service',
    titleAr: 'شروط الخدمه',
    bodyEn:
      'By placing an order on the SADN website you agree to the following terms:\nColour accuracy: we do our best to display colours accurately, but the shade may vary very slightly depending on your phone screen.\nProduct availability: all orders are subject to stock availability. We may cancel any order if it is out of stock or mispriced, notifying the customer immediately.\nPrices: product prices may change at any time without prior notice — this never applies to orders already confirmed.',
    bodyAr:
      'بإرسال طلبكِ من موقع «سدن»، فإنكِ توافقين على الشروط التالية:\nدقة الألوان: نبذل قصارى جهدنا لعرض ألوان القطع بدقة، ولكن قد يختلف اللون بشكل طفيف جداً حسب إضاءة شاشة هاتفك.\nتوافر المنتجات: جميع الطلبات تخضع لتوافر المخزون. يحق لنا إلغاء أي طلب في حالة نفاذ الكمية أو وجود خطأ في التسعير، مع إبلاغ العميل فوراً.\nالأسعار: أسعار المنتجات قابلة للتعديل في أي وقت دون إشعار مسبق، ولكن هذا لا يطبق على الطلبات التي تم تأكيدها بالفعل.',
    enabled: true,
  },
  {
    slug: 'contact',
    titleEn: 'Contact information',
    titleAr: 'التواصل',
    bodyEn:
      'We always love hearing from you — we are here to help:\nCustomer service (WhatsApp): 01039374495\nEmail: Sadnbrand@gmail.com\nWorking hours: Sunday to Thursday, 10 AM – 6 PM.\nOur official accounts:\nInstagram: https://www.instagram.com/sadn.brand\nTikTok: https://www.tiktok.com/@sadn.eg',
    bodyAr:
      'نسعد دائماً بتواصلكِ معنا، نحن هنا لمساعدتكِ:\nرقم خدمة العملاء (واتساب): 01039374495\nالبريد الإلكتروني: Sadnbrand@gmail.com\nمواعيد العمل: من الأحد إلى الخميس (من 10 صباحاً حتى 6 مساءً).\nحساباتنا الرسمية:\nإنستجرام: https://www.instagram.com/sadn.brand\nتيك توك: https://www.tiktok.com/@sadn.eg',
    enabled: true,
  },
  {
    slug: 'legal',
    titleEn: 'Legal notice',
    titleAr: 'الإشعار القانوني',
    bodyEn:
      'All content displayed on this website — clothing designs, photographs, texts and logos — is the exclusive property of the SADN brand. Any use, copying or redistribution of this content for commercial purposes without our prior written permission is strictly prohibited and exposes you to legal liability.',
    bodyAr:
      'جميع المحتويات المعروضة على هذا الموقع من (تصاميم الملابس، الصور الفوتوغرافية، النصوص، والشعارات) هي ملكية حصرية لعلامة «سدن». يُمنع منعاً باتاً استخدام، نسخ، أو إعادة نشر أي من هذه المحتويات لأغراض تجارية دون الحصول على إذن كتابي مسبق منا. يعرضك ذلك للمساءلة القانونية.',
    enabled: true,
  },
];

async function main() {
  /* 1 — backup */
  const [products, categories, setting] = await Promise.all([
    db.product.findMany(),
    db.category.findMany(),
    db.setting.findUnique({ where: { id: 'singleton' } }),
  ]);
  writeFileSync(
    '/home/z/my-project/qa/39-backup.json',
    JSON.stringify(
      {
        backedUpAt: new Date().toISOString(),
        products,
        categories,
        settings: {
          policies: setting?.policies,
          socials: setting?.socials,
          whatsappNumber: setting?.whatsappNumber,
          phones: setting?.phones,
        },
      },
      null,
      2
    )
  );
  console.log(`backup: ${products.length} products, ${categories.length} categories → qa/39-backup.json`);

  /* 2 — categories: keep ONLY butterfly-bloom */
  await db.category.deleteMany({ where: { slug: { in: ['daily', 'occasion'] } } });
  const cat = await db.category.upsert({
    where: { slug: 'butterfly-bloom' },
    create: { slug: 'butterfly-bloom', labelEn: 'Butterfly Bloom', labelAr: 'Butterfly Bloom', order: 1 },
    update: { labelEn: 'Butterfly Bloom', labelAr: 'Butterfly Bloom', order: 1 },
  });
  console.log('category:', cat.slug);

  /* 3 — products: soft-hide the rest, upsert the two drops */
  const hidden = await db.product.updateMany({
    where: { slug: { notIn: ['seren', 'rahaf'] } },
    data: { active: false },
  });
  console.log(`soft-hidden products: ${hidden.count}`);

  const seren = await db.product.upsert({
    where: { slug: 'seren' },
    create: {
      slug: 'seren',
      name: 'Seren',
      nameAr: 'سيرين',
      tagline: 'قصة فضفاضة منسدلة وخامة ناعمة — راحة وشياكة في قطعة واحدة.',
      description:
        'قطعة من كولكشن بترفلاي بلوم — قصة واسعة تدّيكي حرية الحركة، وخامة ناعمة على بشرتك. متاحة بخمسة ألوان.',
      category: 'butterfly-bloom',
      price: 1100,
      currency: 'EGP',
      images: JSON.stringify(['/uploads/seren.png']),
      colors: JSON.stringify(SEREN_COLORS),
      sizes: JSON.stringify(['S', 'M', 'L', 'XL']),
      hiddenSizes: '[]',
      sortOrder: 0,
      featured: true,
      isNew: true,
      stock: 25,
      active: true,
    },
    update: {
      name: 'Seren',
      nameAr: 'سيرين',
      category: 'butterfly-bloom',
      price: 1100,
      currency: 'EGP',
      colors: JSON.stringify(SEREN_COLORS),
      sortOrder: 0,
      active: true,
      isNew: true,
    },
  });
  console.log('product:', seren.slug, seren.price);

  const rahaf = await db.product.upsert({
    where: { slug: 'rahaf' },
    create: {
      slug: 'rahaf',
      name: 'Rahaf',
      nameAr: 'رهف',
      tagline: 'تصميم بسيط وأنيق بخامة مريحة — لطلتك اليومية وكل خروجاتك.',
      description:
        'قطعة من كولكشن بترفلاي بلوم — قصة واسعة مريحة وخامة ناعمة، تنوحي لكل يوم بأحلى صورة.',
      category: 'butterfly-bloom',
      price: 950,
      currency: 'EGP',
      images: JSON.stringify(['/uploads/rahaf.png']),
      colors: JSON.stringify([]),
      sizes: JSON.stringify(['S', 'M', 'L', 'XL']),
      hiddenSizes: '[]',
      sortOrder: 1,
      featured: false,
      isNew: true,
      stock: 20,
      active: true,
    },
    update: {
      name: 'Rahaf',
      nameAr: 'رهف',
      category: 'butterfly-bloom',
      price: 950,
      currency: 'EGP',
      sortOrder: 1,
      active: true,
      isNew: true,
    },
  });
  console.log('product:', rahaf.slug, rahaf.price);

  /* 4 — settings: policies + real contact channels */
  const currentSocials = (() => {
    try {
      const raw = typeof setting?.socials === 'string' ? JSON.parse(setting!.socials) : setting?.socials;
      return typeof raw === 'object' && raw !== null ? (raw as Record<string, string>) : {};
    } catch {
      return {};
    }
  })();
  await db.setting.update({
    where: { id: 'singleton' },
    data: {
      policies: JSON.stringify(POLICIES),
      whatsappNumber: '201039374495',
      phones: JSON.stringify(['201039374495']),
      socials: JSON.stringify({
        ...currentSocials,
        instagram: 'https://www.instagram.com/sadn.brand',
        tiktok: currentSocials.tiktok || 'https://www.tiktok.com/@sadn.eg',
      }),
    },
  });
  console.log('settings: policies=6, whatsapp=201039374495, instagram=sadn.brand');

  /* 5 — read-back verification */
  const [activeProducts, cats, s] = await Promise.all([
    db.product.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }] }),
    db.category.findMany({ orderBy: { order: 'asc' } }),
    db.setting.findUnique({ where: { id: 'singleton' } }),
  ]);
  const policies = JSON.parse(String(s?.policies ?? '[]')) as { slug: string; titleAr: string }[];
  console.log('--- VERIFY ---');
  console.log('active products:', activeProducts.map((p) => `${p.slug}@${p.price}#${p.sortOrder}`).join(', '));
  console.log('categories:', cats.map((c) => c.slug).join(', '));
  console.log('policies:', policies.map((p) => p.slug).join(', '));
  console.log('whatsapp:', s?.whatsappNumber);
}

main()
  .catch((e) => {
    console.error('SEED FAILED:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
