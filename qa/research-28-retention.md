# SADN Research — Round 28: Repeat Purchases & Return Reduction
<!-- Owner ask (verbatim): "عايزك تعملي ريسيرش عشان نفهم ازاي نحسن من الموقع بحيث نعلي نسبه المرتجعات" -->
<!-- Interpretation: raise the share of customers who COME BACK to buy again (repeat purchase rate);
     same program also cuts product returns (مرتجعات الشحنات) since both root causes are
     trust + expectation mismatch. Both readings are covered below. -->

## 1) Key stats (sourced)
- Acquiring a new customer costs ~5x more than retaining one; +5% retention → +25–95% profit (Bain & Co, via appier.com).
- Repeat customers can generate >40% of revenue (appier.com "7 Powerful Strategies to Increase Repeat Purchase").
- Repeat purchase rate benchmarks: e-commerce overall ≈ 18.8–30%; FASHION/APPAREL ≈ 20–35%.
  (bsandco.us 18.8% across 156K DTC stores; finsi.ai apparel 25–32%; yotpo.com fashion 25–35%; opensend.io 20–25%).
  → Realistic SADN target: 20–25% within 2–3 months of launching the program.
- Egypt COD: returned-parcel rates 25–40% in some categories (Egyptian e-commerce sector estimates).
  Owner-operated delivery ≈ 1% returns vs third-party courier 10–20% (merchant anecdote, FB e-commerce groups).
- Buyer's remorse ≈ 15% of returns; COD doubles change-of-mind returns (thetaska.com).
- WhatsApp open rates ≈ 98% — the #1 retention channel for Egyptian COD stores (codrocket.com);
  egrow.com suggests target ≥20% repeat purchase for COD stores; order confirmation + cart recovery + VIP lists.
- #1 return reducers for fashion: better sizing data, accurate multi-angle photos/video, honest descriptions,
  reviewer fit-feedback displayed on product page ("runs small / true to size / runs large") (claimlane.com,
  itgoesforward.com, koozee.ai, wesupplylabs.com).
- COD confirmation call script best practices: state the TOTAL amount out loud, re-read the ADDRESS (not just
  the governorate), confirm size/color variant (tassyir.io, symplysis.com) → biggest single lever to cut COD refusals.

## 2) SADN current-state gap analysis (site as of round 27)
Already have: product pages + reviews (4), size guide setting, cart (الشنطة) + WhatsApp checkout, COD +
InstaPay/Vodafone, categories (daily/occasion), hero/marquee/policies, admin dashboard, Meta Pixel
(dashboard-configurable, consent-gated, round 27).
Missing (mapped to research):
1. No coupons/discount system → can't run winback / thank-you-10% / VIP codes.
2. No free-shipping threshold nudge → AOV lever unused (shippingFee exists, no "free over X").
3. No fit-feedback on reviews (runs small/true/large) → sizing returns stay unsolved.
4. No order tracking by phone → "where is my order?" friction + zero reason to revisit the site.
5. No post-purchase hook (thank-you page with next-order coupon / re-order button).
6. No WhatsApp opt-in capture → owner broadcasts have no list.
7. No loyalty report in dashboard (repeat rate not measured anywhere).

## 3) Roadmap (proposed rounds, ready for webDevReview cron to execute)
- Round 29: Coupon system — Prisma `Coupon` model (code, type percent/fixed, value, active, usageLimit, used,
  minTotal, expiresAt), admin CRUD card, checkout applies code (server-validated), Setting reuse for banner.
- Round 30: Free-shipping progress bar in cart (new Setting `freeShippingThreshold`, default e.g. 1500 EGP;
  bar "كم باقي عليك للشحن المجاني") + coupon field in checkout UI if not done.
- Round 31: Review fit-feedback (enum chips on Review: fitFeedback String? — ضيق/مظبوط/واسع) shown as a badge
  on product page; size guide link moved next to size selector.
- Round 32: Order tracking page `/track` — phone + order number → status timeline (orderStages already in
  Setting); thank-you page upgrade: next-order coupon code + "أعيدي طلبك" (re-add last items).
- Round 33: WhatsApp opt-in checkbox at checkout + `Subscriber` table + admin export; loyalty report card in
  dashboard (repeat purchase rate computed by grouping Orders by phone; returns tracker field on Order
  `isReturned Boolean @default(false)` with toggle in orders table).
Operational playbook (owner, no code): COD confirmation script (amount+address+size out loud), +1-day
satisfaction WhatsApp, +10–14-day winback WhatsApp with a coupon made in the dashboard, thank-you card in
package with QR to site + code, exchange-first policy, weekly WhatsApp broadcast to past customers,
real photos/video + cm measurements per size in size guide.

## 4) KPIs to track monthly
- Repeat purchase rate = orders from phone numbers with ≥2 orders ÷ all orders (SQL: GROUP BY phone HAVING count>1).
- Return rate = isReturned orders ÷ shipped orders. AOV = sum(total)/count(orders). Confirmation rate,
  WhatsApp reply rate, coupon redemptions.

## 5) Main sources
- appier.com — 7 Powerful Strategies to Increase Repeat Purchase
- shopify.com — How to Improve Ecommerce Customer Retention (2025)
- yotpo.com / finsi.ai / bsandco.us / opensend.io — repeat purchase benchmarks (fashion 20–35%)
- thetaska.com — كيف تقلّل مرتجعات متجرك الإلكتروني وتحمي هامش ربحك
- tassyir.io — نسبة الإرجاع في الدفع عند الاستلام: كلفتها وكيف تخفضها
- symplysis.com — أدلة الدفع عند الاستلام للتاجر العربي (سكربتات التأكيد)
- codrocket.com — WhatsApp Marketing for COD E-Commerce (98% open rates)
- egrow.com — WhatsApp CRM for COD stores (≥20% repeat target)
- claimlane.com / itgoesforward.com / koozee.ai / wesupplylabs.com — fashion return reduction
- practicalecommerce.com / moneris.com / postpilot.com — post-purchase thank-you + next-order coupon
- Egyptian sector estimates (Instagram/press repost) — COD returns 25–40% in some categories
