/**
 * Product-page FAQ (round 39 — owner).
 *
 * The owner dictated these five pre-purchase questions and answers verbatim
 * (Egyptian dialect, inspection-on-delivery, shipping window, exchange,
 * manufacturing faults, colour accuracy). They are STOREFRONT COPY, not
 * dashboard data — she asked for the section itself, and the dashboard
 * PoliciesCard stays reserved for the legal pages.
 *
 * `ar` is her verbatim wording; `en` is the editorial translation.
 * Rendered by ProductFaq.tsx as an all-closed accordion on the product page.
 */
export type ProductFaqItem = {
  q: { en: string; ar: string };
  a: { en: string; ar: string };
};

export const PRODUCT_FAQ: ProductFaqItem[] = [
  {
    q: { en: 'Can I inspect my order on delivery?', ar: 'متاح معاينة الأوردر وقت الاستلام؟' },
    a: {
      en: "Of course! We trust our pieces — inspect yours as much as you like with the courier on delivery. If it doesn't win you over, you only pay the shipping fee.",
      ar: 'أكيد متاح .. لثقتنا في جودة قطعنا، متاح تعايني براحتك خالص مع المندوب وقت الاستلام، ولو القطعة معجبتكيش، بتدفعي مصاريف الشحن فقط.',
    },
  },
  {
    q: { en: 'How long does shipping take?', ar: 'الأوردر بياخد وقت قد إيه في الشحن؟' },
    a: {
      en: '5–7 working days and it reaches you, God willing — some governorates may take up to 10 days.',
      ar: 'خلال 5 لـ 7 أيام عمل وهيوصلك بإذن الله، ما عدا بعض المحافظات بتوصل لـ 10 أيام.',
    },
  },
  {
    q: {
      en: 'Can I change the colour or size after delivery?',
      ar: 'ممكن تغيير اللون أو المقاس بعد الاستلام؟',
    },
    a: {
      en: "Of course — don't worry! You have 3 days from delivery for an exchange or return. Just contact us and we'll send a courier to pick it up, as long as the piece is in its original condition with its tag (unworn, no makeup or perfume stains).",
      ar: 'أكيد ممكن .. ولا يهمك خالص، معاكِ 3 أيام للاستبدال أو الاسترجاع من تاريخ الاستلام، كل اللي عليكِ إنك تتواصلي معانا وهنبعتلك المندوب يستلمها، بشرط إن القطعة تكون بحالتها الأصلية وبالتيكت (متلبستش، مفيهاش بقع مكياج أو عطور).',
    },
  },
  {
    q: {
      en: 'What if the piece has a manufacturing fault?',
      ar: 'لو استلمتي القطعة وفيها عيب صناعة؟',
    },
    a: {
      en: "🤍 We're truly sorry in advance if that ever happens — it is fully our responsibility. Send us a clear photo of the fault right after delivery and we'll replace the piece immediately, with no extra shipping cost on you.",
      ar: '🤍 بنعتذرلك مقدماً لو ده حصل، دي مسؤوليتنا بالكامل، ابعتيلنا صورة واضحة للعيب فور استلامك وهنبدلك القطعة فوراً بدون أي مصاريف شحن إضافية عليكِ.',
    },
  },
  {
    q: {
      en: 'Are the colours in the photos true to life?',
      ar: 'ألوان القطع في الصور زي الحقيقة ؟',
    },
    a: {
      en: 'We shoot our pieces in natural light so they come as close to reality as possible — the exact shade you wish for. A very slight tone difference may appear because phone screens light colours differently from one device to another.',
      ar: 'بنصور قطعنا في إضاءة طبيعية عشان تكون أقرب حاجة للواقع، ونفس الدرجة اللي نفسك فيها، بس ممكن تلاحظي اختلاف بسيط جداً في درجة اللون بسبب اختلاف إضاءة شاشات الموبايل من جهاز للتاني.',
    },
  },
];
