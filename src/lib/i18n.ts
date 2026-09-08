import { useSadnStore, type Lang } from '@/lib/sadn-store';

/**
 * SADN bilingual dictionary (round 6-a).
 *
 * Flat key → string maps per language; `ar` is typed as `typeof en` so a
 * missing translation fails compilation. Placeholders use {curly} tokens and
 * are interpolated by `t()`.
 *
 * Tone: quiet-luxury editorial EN; modern MSA Arabic with an atelier voice.
 * Prices are Egyptian pounds (EGP / ج.م) — owner directive.
 */
export const STRINGS = {
  /* ── Shell / nav ── */
  navHome: { en: 'Home', ar: 'الرئيسية' },
  navShop: { en: 'Shop', ar: 'المتجر' },
  navBag: { en: 'Bag', ar: 'الشنطة' },
  // Round 25 (owner): ariaToggleLang/ariaTheme removed with the header
  // toggles — language + dark mode live in the side drawer only (round 24),
  // which uses drawerLang/drawerTheme/drawerClose below.
  // Round 24 (owner): the bottom nav gained a Menu tab — a side drawer with
  // language + dark-mode switches and one-tap links to every collection.
  navMenu: { en: 'Menu', ar: 'القائمة' },
  drawerClose: { en: 'Close menu', ar: 'إغلاق القائمة' },
  drawerLang: { en: 'Language', ar: 'اللغة' },
  drawerTheme: { en: 'Dark mode', ar: 'الوضع الداكن' },
  themeLight: { en: 'Light', ar: 'فاتح' },
  themeDark: { en: 'Dark', ar: 'داكن' },

  /* ── Home ── */
  // Round 38 (owner): «المجموعة» became «الكولكشن» everywhere.
  ctaExplore: { en: 'Explore the Collection', ar: 'استكشف الكولكشن' },
  ctaStory: { en: 'Our Story', ar: 'قصتنا' },
  // Round 16-b: descriptive alt for the hero slides (LCP image especially).
  heroAlt: {
    en: 'Loose abaya — SADN atelier',
    ar: 'عباية سدن الواسعة — من الأتيليه',
  },
  // Owner (round 16): "عدل احدث الوصولات ب احدث المنتجات"
  newArrivals: { en: 'Latest Pieces', ar: 'أحدث المنتجات' },
  viewAll: { en: 'View All', ar: 'عرض الكل' },
  // Owner (round 22): "بدل تسوق حسب المزاج ب الكولكشنات" — and the old
  // eyebrow above it (كوليكشن + 01/02/03 numbering) was removed with it.
  // Round 39 (owner): one collection only — singular «الكولكشن».
  collectionTiles: { en: 'Collection', ar: 'الكولكشن' },
  collectionAlt: { en: '{label} collection', ar: 'كولكشن {label}' },
  recentlyViewed: { en: 'Recently Viewed', ar: 'شاهدت مؤخراً' },
  // Round 23 (owner): new brand line — "حيث تلتقي الستْرة بتحفتها" retired.
  /* Round 38 (owner): the story is her verbatim copy — the old
     «واسعة في القصّة… قريبة من القلب.» sentence is gone. */
  storyTitle: { en: 'Our Story', ar: 'قصتنا' },
  storyIntro: {
    en: 'We started SADN from a feeling we know well as girls: we want to dress loose and modest — without giving up style or comfort.',
    ar: 'بدأنا سدن من إحساس بنعرفه كويس كبنات: عايزين نلبس واسع ومحتشم، بس من غير ما نتنازل عن الشياكة والراحة.',
  },
  storyLead: {
    en: 'We work on every design as if we were wearing it ourselves:',
    ar: 'كل تصميم عندنا بنشتغل عليه وكأننا بنلبسه إحنا بالذات:',
  },
  storyL1: { en: 'Soft colours', ar: 'ألوان هادية' },
  storyL2: { en: 'Soft, honest fabrics', ar: 'خامات ناعمة' },
  storyL3: {
    en: 'Loose cuts that give you room to move',
    ar: 'قصات فضفاضة تدّيكي حرية الحركة',
  },
  storyClose: {
    en: 'So you live your day confident you look your best… simply, and without any effort.',
    ar: 'عشان تعيشي يومك، واثقة إنك في أحلى صورة ليكي... ببساطة، وبدون أي مجهود.',
  },
  footerCopyright: {
    en: '© 2026 SADN — All rights reserved.',
    ar: '© 2026 سدن — جميع الحقوق محفوظة.',
  },
  footerPolicies: { en: 'Help & Policies', ar: 'السياسات والمساعدة' },
  // Round 38 (owner): one policies button in the footer → /policies page.
  policiesButton: { en: 'Policies', ar: 'السياسات' },
  policiesPageTitle: { en: 'Policies', ar: 'السياسات' },
  policiesPageSub: {
    en: 'Everything you need to know — tap any policy to read it.',
    ar: 'كل اللي محتاجة تعرفيه — دوسي على أي سياسة عشان تفتح.',
  },
  // Round 19 cleanup: the dead lib copies of policyShipping/policyReturns/
  // policyPrivacy/sizeGuideBody and the six acc* accordion keys were
  // removed — the dashboard cards resolve their own copies from
  // admin-i18n.ts, and the storefront accordion is dashboard-controlled.
  ariaCallPhone: { en: 'Call {n}', ar: 'اتصال بـ {n}' },
  ariaOpenSocial: { en: 'Open our {name} page', ar: 'افتح صفحتنا على {name}' },

  /* ── Categories ── */
  catAll: { en: 'All', ar: 'الكل' },
  catDaily: { en: 'Everyday', ar: 'يومية' },
  catOccasion: { en: 'Occasion', ar: 'مناسبات' },
  // Round 39 (owner): one collection only — Butterfly Bloom (kept Latin in
  // both languages, the way she wrote it).
  catButterfly: { en: 'Butterfly Bloom', ar: 'Butterfly Bloom' },

  /* ── Shop ── */
  catalogue: { en: 'Catalogue', ar: 'الفهرس' },
  shopTitle: { en: 'Shop', ar: 'المتجر' },
  countOne: { en: '1 piece', ar: 'قطعة واحدة' },
  countOther: { en: '{n} pieces', ar: '{n} قطع' },
  comingSoon: { en: 'Coming soon', ar: 'قريباً' },
  comingSoonBody: {
    en: 'This collection is being cut right now.',
    ar: 'هذا الكولكشن قيد التحضير الآن.',
  },

  /* ── Bag (round 16 — the cart concept became "الشنطة / the Bag") ── */
  bagEmptyTitle: { en: 'Your bag is empty', ar: 'شنطتك فاضية' },
  bagEmptyBody: {
    en: 'Beautiful things take up little space — but yours is completely bare.',
    ar: 'الأشياء الجميلة لا تشغل حيّزاً كبيراً — لكن شنطتك خالية تماماً.',
  },
  ctaDiscover: { en: 'Discover the Collection', ar: 'اكتشف الكولكشن' },
  yourBag: { en: 'Your Bag', ar: 'شنطتك' },
  clear: { en: 'Clear', ar: 'إفراغ' },
  sizeColor: { en: 'Size {size} · {color}', ar: 'المقاس {size} · {color}' },
  // Round 39: products without colours (Rahaf) render the size alone.
  sizeNoColor: { en: 'Size {size}', ar: 'المقاس {size}' },
  tapToEdit: { en: 'Tap to change size or colour', ar: 'اضغطي لتغيير المقاس أو اللون' },
  ariaRemove: { en: 'Remove {name}', ar: 'إزالة {name}' },
  ariaQtyDec: { en: 'Decrease quantity', ar: 'تقليل الكمية' },
  ariaQtyInc: { en: 'Increase quantity', ar: 'زيادة الكمية' },
  // Round 38 (owner): her exact wording.
  promoCta: { en: 'Got a discount code?', ar: 'معاكي كود خصم؟' },
  apply: { en: 'Apply', ar: 'تطبيق' },
  promoApplied: { en: '{code} applied — {label}', ar: 'تم تطبيق {code} — {label}' },
  promoPercentLabel: { en: '{n}% off your order', ar: 'خصم {n}٪ على طلبك' },
  promoHint: {
    en: 'Enter your code — the discount applies instantly if it is valid.',
    ar: 'اكتبي الكود — الخصم يتطبق فوراً لو صحيح.',
  },
  promoInvalid: {
    en: '“{code}” is not a valid code',
    ar: '«{code}» رمز غير صحيح',
  },
  promoMin: {
    en: '{code} needs an EGP {min} subtotal',
    ar: '{code} يتطلب مجموعاً بقيمة {min} ج.م',
  },
  /* Round 29 — dashboard coupons + free-shipping nudge + fit chips */
  couponFixedLabel: { en: '{money} off your order', ar: 'خصم {money} على طلبك' },
  promoUnavailable: {
    en: 'This code is no longer available',
    ar: 'الكود ده مش متاح حالياً',
  },
  fitTitle: { en: 'Fit feedback from customers', ar: 'قياس العميلات' },
  fitTight: { en: 'Runs small', ar: 'ضيّق' },
  fitTrue: { en: 'True to size', ar: 'مطابق للمقاس' },
  fitLoose: { en: 'Runs large', ar: 'واسع' },
  subtotal: { en: 'Subtotal', ar: 'المجموع الفرعي' },
  discount: { en: 'Discount', ar: 'الخصم' },
  shippingLabel: { en: 'Shipping', ar: 'الشحن' },
  free: { en: 'Free', ar: 'مجاني' },
  total: { en: 'Total', ar: 'الإجمالي' },
  checkout: { en: 'Proceed to Checkout', ar: 'إتمام الشراء' },
  continueShopping: { en: 'or continue shopping', ar: 'أو تابع التسوق' },
  emptyRecsTitle: { en: 'From the collection', ar: 'من الكولكشن' },

  /* ── Reviews — round 39 (owner): «عملاءنا بيقولو ايه / What our customers
     say» (was «الريفيوز»); the «كلمات من القلب» eyebrow and the stars row
     stay gone. ── */
  reviewsTitle: { en: 'What our customers say', ar: 'عملاءنا بيقولو ايه' },
  /* 17-e — stacked review deck */
  reviewsFromWhatsapp: { en: 'From a WhatsApp chat', ar: 'من محادثة واتساب' },
  ariaReviewsDeck: { en: 'Customer reviews', ar: 'تقييمات العميلات' },
  ariaReviewDot: { en: 'Show review {n}', ar: 'اعرض التقييم {n}' },
  /* 35-a — premium reviews redesign: header trust line + card badges */
  reviewsCount: { en: '{n}+ verified reviews', ar: '+{n} تقييم موثّق' },
  reviewsVerified: { en: 'Verified buyer', ar: 'مشترية موثّقة' },
  reviewsPrev: { en: 'Previous reviews', ar: 'التقييمات السابقة' },
  reviewsNext: { en: 'Next reviews', ar: 'التقييمات التالية' },

  /* ── Announcement banner (round 11) ── */
  ariaBannerLabel: { en: 'Announcement', ar: 'إعلان' },
  ariaBannerDismiss: { en: 'Dismiss announcement', ar: 'إغلاق الإعلان' },

  /* ── Product card ── */
  badgeNew: { en: 'New', ar: 'جديد' },
  ariaAddToBag: { en: 'Add {name} to bag', ar: 'أضيفي {name} إلى الشنطة' },

  /* ── Mini bag ── */
  addedToBag: { en: 'Added to bag', ar: 'أُضيف إلى الشنطة' },
  ariaDismiss: { en: 'Dismiss', ar: 'إغلاق' },
  keepBrowsing: { en: 'Keep browsing', ar: 'متابعة التصفح' },
  viewBag: { en: 'View Bag', ar: 'عرض الشنطة' },

  /* ── Product detail ── */
  pdBack: { en: 'Back', ar: 'رجوع' },
  saveBadge: { en: 'Save {money}', ar: 'وفّر {money}' },
  reviewsLine: { en: '{rating} · {n} reviews', ar: '{rating} · {n} تقييم' },
  starsAria: { en: 'Rated {rating} out of 5', ar: 'التقييم {rating} من 5' },
  onlyLeft: { en: 'Only {n} left in this batch', ar: 'بقي {n} فقط من هذه الدفعة' },
  size: { en: 'Size', ar: 'المقاس' },
  sizeGuide: { en: 'Size guide', ar: 'دليل المقاسات' },
  colour: { en: 'Colour', ar: 'اللون' },
  youMayLike: { en: 'You may also like', ar: 'منتجات ممكن تعجبك' },
  // Round 39 (owner): pre-purchase FAQ accordion on the product page.
  faqTitle: { en: 'FAQ', ar: 'أسئلة شائعة' },
  qtyTotal: { en: '{money} total', ar: 'الإجمالي {money}' },
  styledWith: { en: 'Styled with', ar: 'يُنسّق مع' },
  completeLook: { en: 'Complete the look', ar: 'أكمل الإطلالة' },
  addToBagBtn: { en: 'Add to Bag — {money}', ar: 'أضيفي إلى الشنطة — {money}' },
  ariaViewImage: { en: 'View image {n}', ar: 'اعرض الصورة {n}' },
  ariaShare: { en: 'Share', ar: 'مشاركة' },
  shareCopied: { en: 'Link copied to clipboard', ar: 'تم نسخ الرابط' },
  shareCopiedFail: { en: "Couldn't copy the link", ar: 'تعذّر نسخ الرابط' },
  viewGalleryImage: { en: '{name} — view {n}', ar: '{name} — صورة {n}' },

  /* ── Order hand-off (round 15: WhatsApp is communication only, never a payment method) ── */
  sendWhatsapp: { en: 'Send order on WhatsApp', ar: 'أرسل الطلب على واتساب' },
  ariaWhatsappFloat: { en: 'Chat with us on WhatsApp', ar: 'كلمنا على واتساب' },
  whatsappHint: {
    en: 'Your full order opens in WhatsApp, ready to send.',
    ar: 'يفتح طلبك كامل في واتساب، جاهز للإرسال.',
  },
  errNetwork: {
    en: 'Network hiccup — please try again.',
    ar: 'خلل في الشبكة — حاول مجدداً.',
  },

  /* ── Checkout — payment methods (round 15) ── */
  payMethod: { en: 'Payment method', ar: 'طريقة الدفع' },
  instapay: { en: 'InstaPay', ar: 'انستا باي' },
  vodafoneCash: { en: 'Vodafone Cash', ar: 'فودافون كاش' },
  instapayDesc: {
    en: 'Transfer the total to our InstaPay number, then confirm.',
    ar: 'حوّلي المبلغ على رقم انستا باي وبعدين أكّدي الطلب.',
  },
  vodafoneDesc: {
    en: 'Transfer the total on Vodafone Cash, then confirm.',
    ar: 'حوّلي المبلغ على فودافون كاش وبعدين أكّدي الطلب.',
  },
  paySendTo: { en: 'Transfer to', ar: 'حوّلي على الرقم' },
  payAmountLabel: { en: 'The amount', ar: 'المبلغ' },
  copyNumber: { en: 'Copy number', ar: 'نسخ الرقم' },
  copyAmount: { en: 'Copy amount', ar: 'نسخ المبلغ' },
  copiedToast: { en: 'Copied ✓', ar: 'تم النسخ ✓' },
  paySenderLabel: {
    en: 'The number you transferred from',
    ar: 'رقم الحساب اللي حوّلتي منه',
  },
  paySenderPh: { en: '01xxxxxxxxx', ar: '٠١xxxxxxxxx' },
  errPaySender: {
    en: 'Enter a valid Egyptian mobile number (e.g. 01012345678)',
    ar: 'أدخلي رقم موبايل مصري صحيح (مثال: 01012345678)',
  },
  payReviewNote: {
    en: 'Your order lands with us under payment review — we confirm with you on WhatsApp.',
    ar: 'أوردرك هيوصلنا تحت مراجعة الدفع — وهنأكد معاكي على واتساب.',
  },
  paySendProof: {
    en: 'Send transfer confirmation',
    ar: 'ابعت تأكيد التحويل',
  },
  payScreenshotHint: {
    en: 'The chat opens with your order ready — attach the transfer screenshot there.',
    ar: 'الشات هيفتح بطلبك جاهز — ابعتيلنا فيه صورة سكرين شوت لتحويل المبلغ.',
  },

  /* ── Checkout ── */
  checkoutTitle: { en: 'Checkout', ar: 'إتمام الشراء' },
  ariaCloseCheckout: { en: 'Close checkout', ar: 'إغلاق الدفع' },
  deliveryDetails: { en: 'Delivery details', ar: 'بيانات التوصيل' },
  fName: { en: 'Full name', ar: 'الاسم الكامل' },
  fPhone: { en: 'Phone', ar: 'الهاتف' },
  fCity: { en: 'City', ar: 'المدينة' },
  fAddress: { en: 'Address', ar: 'العنوان' },
  phName: { en: 'Layla Hassan', ar: 'ليلى حسن' },
  phPhone: { en: '+20 10 1234 5678', ar: '+20 10 1234 5678' },
  phCity: { en: 'Cairo', ar: 'القاهرة' },
  phAddress: {
    en: 'Street, building, apartment',
    ar: 'الشارع، المبنى، الشقة',
  },
  errName: { en: 'Enter your full name', ar: 'أدخل اسمك الكامل' },
  errPhone: {
    en: 'Enter a valid Egyptian mobile number (e.g. 01012345678)',
    ar: 'أدخل رقم موبايل مصري صحيح (مثال: 01012345678)',
  },
  errCity: { en: 'City is required', ar: 'المدينة مطلوبة' },
  errAddress: { en: 'Enter your full address', ar: 'أدخل عنوانك الكامل' },
  cod: { en: 'Cash on delivery', ar: 'الدفع عند الاستلام' },
  selected: { en: 'Selected', ar: 'مختار' },
  codSoon: {
    en: 'Pay in cash when your order arrives at your door',
    ar: 'ادفعي كاش لما طلبك يوصلك لباب البيت',
  },
  summaryItems: { en: '({n} items)', ar: '({n} قطع)' },
  summaryItemsOne: { en: '(1 item)', ar: '(قطعة واحدة)' },
  placeOrder: { en: 'Place Order — {money}', ar: 'أكّد الطلب — {money}' },
  placing: { en: 'Placing your order…', ar: 'جارٍ تأكيد طلبك…' },
  reviewFields: {
    en: 'Please review the highlighted fields.',
    ar: 'يرجى مراجعة الحقول المحددة.',
  },
  orderPlaced: { en: 'Order placed', ar: 'تم تأكيد الطلب' },
  orderNo: { en: 'No. {n}', ar: 'رقم {n}' },
  bagUpdated: { en: 'Bag updated', ar: 'تم تحديث الشنطة' },
  updateBagBtn: { en: 'Update Bag — {money}', ar: 'حدّثي الشنطة — {money}' },
  deliveringTo: { en: 'Delivering to', ar: 'التوصيل إلى' },
  eta: { en: 'Estimated arrival', ar: 'الوصول المتوقع' },
  etaFast: { en: '3–5 days', ar: '3–5 أيام' },
  etaSlow: { en: '5–7 days', ar: '5–7 أيام' },
  codSuffix: { en: 'cash on delivery', ar: 'دفع عند الاستلام' },
  backHome: { en: 'Back to Home', ar: 'العودة للرئيسية' },
  previewNotePayment: {
    en: 'Your order is registered instantly — we confirm with you on WhatsApp.',
    ar: 'أوردرك بيتسجل فوراً — وهنأكد معاكي على واتساب.',
  },
  ariaCityCombo: {
    en: 'City — start typing to see Egyptian governorates',
    ar: 'المدينة — ابدأ الكتابة لعرض محافظات مصر',
  },
  cityPopular: { en: 'Popular', ar: 'الأكثر طلباً' },
  ariaCityList: { en: 'Suggested cities', ar: 'مدن مقترحة' },

  /* ── Size guide sheet ── */
  sgClose: { en: 'Close size guide', ar: 'إغلاق دليل المقاسات' },
  sgUnitCm: { en: 'cm', ar: 'سم' },
  sgMeasure: {
    en: 'Garment measured flat, unstretched.',
    ar: 'القطعة مقاسة بشكل مسطّح وغير ممطودة.',
  },
  sgFitTitle: { en: 'Fit note', ar: 'ملاحظة القصّة' },
  sgColSize: { en: 'Size', ar: 'المقاس' },
  sgColBust: { en: 'Bust', ar: 'الصدر' },
  sgColWaist: { en: 'Waist', ar: 'الخصر' },
  sgColHip: { en: 'Hip', ar: 'الأرداف' },
  sgColLength: { en: 'Length', ar: 'الطول' },

  /* ── Promo persistence ── */
  ariaPromoInput: { en: 'Promo code', ar: 'رمز الخصم' },
  promoPending: {
    en: 'Kept for you — needs a {money} subtotal to activate',
    ar: 'محفوظ لك — يتطلب مجموعاً بقيمة {money} للتفعيل',
  },

  /* ── PWA / connectivity ──
     (Install-banner keys removed in round 10 per owner request — no more
     home-screen install prompt; the browser menu still allows installing.) */
  offlineToast: {
    en: "You're offline — the catalogue still browses",
    ar: 'أنت غير متصل — لا يزال تصفّح الكولكشن يعمل',
  },
  backOnlineToast: { en: 'Back online', ar: 'عاد الاتصال' },

  /* ── Cookie consent → Meta Pixel gate (round 20-a) ──
     The Arabic notice is the owner's verbatim copy. */
  cookieNotice: {
    en: 'We use cookies to give you a more elegant, effortless shopping experience at SADN — and to offer pieces that suit your taste.',
    ar: 'نستخدم ملفات تعريف الارتباط لنمنحكِ تجربة تسوق أكثر أناقة وسهولة في سدن، ولتقديم عروض تناسب ذوقكِ.',
  },
  cookieAccept: { en: 'Accept', ar: 'موافقة' },
  cookieDecline: { en: 'Decline', ar: 'رفض' },
  cookieAria: {
    en: 'Cookie consent',
    ar: 'الموافقة على ملفات تعريف الارتباط',
  },

  /* ── Thank-you page (round 31, research item 5) ──
     Round 38 (owner): order tracking is REMOVED entirely — the order
     number is a WhatsApp reference now. */
  tyTitle: { en: 'Thank you, lovely!', ar: 'شكراً ليكِ يا جميلة!' },
  tySub: {
    en: 'Your order is confirmed — we will message you on WhatsApp to confirm delivery details.',
    ar: 'طلبك اتأكد — هنبعتلك رسالة واتساب للتأكيد وتحديد ميعاد التوصيل.',
  },
  tyOrderNo: { en: 'Order number', ar: 'رقم الطلب' },
  tySaveHint: {
    en: 'Save this number — send it to us on WhatsApp anytime you ask about your order.',
    ar: 'احفظي الرقم ده — وابعتيهولنا على واتساب في أي وقت لو حبيتي تسألي عن طلبك.',
  },
  tyWhatsapp: { en: 'Open the WhatsApp chat', ar: 'افتحي محادثة الواتساب' },
  tyWhatsappHint: {
    en: 'If the chat did not open by itself, tap here to send your order.',
    ar: 'لو المحادثة ما فتحتش لوحدها، دوسي هنا عشان تبعتي طلبك.',
  },
  tyCouponTitle: { en: 'A gift for your next order', ar: 'هدية لطلبك الجاي' },
  tyCouponSub: {
    en: 'Use this code at checkout on your next order:',
    ar: 'استخدمي الكود ده في طلبك الجاي:',
  },
  tyCouponCopy: { en: 'Copy code', ar: 'انسخي الكود' },
  tyCouponCopied: { en: 'Copied!', ar: 'اتنسخ!' },
  tyCouponMin: { en: 'Orders over {money}', ar: 'للطلبات فوق {money}' },
  tyReorder: { en: 'Re-order these pieces', ar: 'أعيدي طلب نفس القطع' },
  tyReordered: { en: 'Added to your bag — opening it…', ar: 'اتضافت للشنطة — بنفتحها…' },
  tyItems: { en: 'Your pieces', ar: 'قطعك' },
  tySubscribeTitle: { en: 'Want our new arrivals first?', ar: 'تحبي تشوفي الجديد قبل الكل؟' },
  tySubscribeSub: {
    en: 'Leave your number and we will message you on WhatsApp with offers and new pieces.',
    ar: 'سيبي رقمك وهنبعتلك على الواتساب العروض والقطع الجديدة.',
  },
  tySubscribeCta: { en: 'Keep me posted on WhatsApp', ar: 'ابعتيلي على الواتساب' },
  tySubscribeDone: {
    en: 'Done — you are on the list! 💜',
    ar: 'تم — رقمك اتسجل في القائمة! 💜',
  },
  tyBackHome: { en: 'Continue shopping', ar: 'كمّلي تسوّق' },

  /* ── Checkout WhatsApp opt-in (round 31, research item 6) ── */
  optinLabel: {
    en: 'Send me offers & new arrivals on WhatsApp',
    ar: 'ابعتيلي العروض والجديد على الواتساب',
  },
  optinHint: {
    en: 'Optional — only SADN messages, no spam, unsubscribe anytime.',
    ar: 'اختياري — رسائل سدن بس، من غير إزعاج، وتقدري تلغيها في أي وقت.',
  },
} as const;

export type TKey = keyof typeof STRINGS;

type Vars = Record<string, string | number>;

/** Translate `key` for `lang`, interpolating `{token}` vars. */
export function tr(lang: Lang, key: TKey, vars?: Vars): string {
  const pair = STRINGS[key] as { en: string; ar: string };
  let s = pair[lang] ?? pair.en;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

/** Hook: `const t = useT(); t('addToBagBtn', { money: 'EGP 1,200' })` */
export function useT() {
  const lang = useSadnStore((s) => s.lang ?? 'en');
  return (key: TKey, vars?: Vars) => tr(lang, key, vars);
}

/** Current UI language as a reactive hook. */
export function useLang(): Lang {
  return useSadnStore((s) => s.lang ?? 'en');
}

/** Pick the localized name of any product-like object. */
export function localName(
  p: { name: string; nameAr?: string | null },
  lang: Lang
): string {
  return lang === 'ar' && p.nameAr ? p.nameAr : p.name;
}

/** Locale-aware short date, e.g. "Feb 14" / "١٤ فبراير". */
export function fmtDate(d: string | Date, lang: Lang): string {
  return new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/** Locale-aware short time, e.g. "2:41 PM" / "٢:٤١ م". */
export function fmtTime(d: string | Date, lang: Lang): string {
  return new Date(d).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Category key → translation key ('all' → catAll, etc). */
export function catKey(c: string): TKey {
  if (c === 'daily') return 'catDaily';
  if (c === 'occasion') return 'catOccasion';
  if (c === 'butterfly-bloom') return 'catButterfly';
  return 'catAll';
}
