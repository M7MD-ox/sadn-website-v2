#!/bin/bash
# Round 9 QA — empty-cart recs, track-CTA on success, fade-up staggers, OFFLINE browse test
cd /home/z/my-project
pkill -f "next dev" 2>/dev/null; sleep 1; rm -f dev.log
setsid nohup bun run dev > dev.log 2>&1 < /dev/null &
sleep 1
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3000/ 2>/dev/null)
  [ "$code" = "200" ] && { echo "SERVER READY after ${i}s"; break; }
  sleep 1
done

agent-browser open "about:blank" 2>&1 | tail -1
agent-browser set viewport 390 844 2>&1 | tail -1
agent-browser open "http://localhost:3000/" 2>&1 | tail -1
agent-browser wait 3000 2>/dev/null

echo "=== 1. EMPTY-CART RECOMMENDATIONS ==="
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  document.querySelectorAll('nav button')[3]?.click(); await sleep(1000);
  out.emptyTitle = document.body.innerText.includes('Your cart is empty');
  out.recsEyebrow = document.body.innerText.includes('While you decide');
  out.recsTitle = document.body.innerText.includes('From the atelier');
  out.recsCards = document.querySelectorAll('[data-card]').length;
  out.noHOverflow = document.documentElement.scrollWidth <= window.innerWidth;
  // add the first recommended piece from the recs grid
  const addBtn = document.querySelector('[data-card] button[aria-label^=\"Add\"]');
  addBtn?.click(); await sleep(900);
  const stored = JSON.parse(localStorage.getItem('sadn-store-v1')||'{}')?.state ?? {};
  out.cartLen = (stored.cart||[]).length;
  // mini cart sheet appears
  out.miniCart = document.body.innerText.includes('Added to cart');
  return JSON.stringify(out);
})()" 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/qa/9-empty-recs.png 2>&1 | tail -1

echo "=== 2. CHECKOUT → SUCCESS → TRACK CTA ==="
agent-browser eval "
localStorage.setItem('sadn-store-v1', JSON.stringify({state:{cart:[{slug:'ivory-linen-shirt',name:'Atelier Linen Shirt',nameAr:'قميص الكتان',image:'/products/ivory-linen-shirt.jpg',price:120,size:'M',color:'Ivory',qty:1}],wishlist:[],orders:[],recent:[],searches:[],lastOrderNumber:null,lang:'en',promo:null},version:0})); 'seeded'" 2>&1 | tail -1
agent-browser open "http://localhost:3000/" 2>&1 | tail -1
agent-browser wait 2500 2>/dev/null
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  const set = (el, v) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
    setter.call(el, v);
    el.dispatchEvent(new Event('input',{bubbles:true}));
  };
  document.querySelectorAll('nav button')[3]?.click(); await sleep(900);
  [...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith('Proceed to Checkout'))?.click(); await sleep(900);
  const byLabel = (l) => [...document.querySelectorAll('input')].find(i=>i.getAttribute('aria-label')===l);
  set(byLabel('Full name'), 'Layla Hassan');
  set(byLabel('Phone'), '+201012345678');
  set(byLabel('Address'), '12 Zamalek St, Apt 3');
  const city = [...document.querySelectorAll('input')].find(i=>i.getAttribute('aria-label')?.includes('governorates'));
  set(city, 'Cairo'); await sleep(400);
  out.comboOpen = !!document.querySelector('#city-suggestions');
  await sleep(200);
  [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Place Order'))?.click(); await sleep(2200);
  out.success = document.body.innerText.includes('Order placed');
  out.orderNoText = (document.body.innerText.match(/No\. (SADN-\d+)/)||[])[1] ?? null;
  out.haloRing = (()=>{ const el=[...document.querySelectorAll('span')].find(s=>s.querySelector('svg.lucide-check')||s.className.includes('ring-8')); return el? getComputedStyle(el).ringWidth ?? getComputedStyle(el)['--tw-ring-width'] ?? 'ring?' : null; })();
  out.infoRing = [...document.querySelectorAll('div')].some(d=>d.className.includes('ring-inset') && d.textContent.includes('Delivering to'));
  out.trackCta = [...document.querySelectorAll('button')].some(b=>b.textContent.includes('Track this order'));
  // click Track this order
  [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Track this order'))?.click(); await sleep(1100);
  const numInput = [...document.querySelectorAll('input')].find(i=>i.getAttribute('aria-label')==='Order number');
  out.trackerOpen = !!numInput;
  out.trackerPrefilled = numInput?.value ?? null;
  out.prefillMatches = out.orderNoText ? numInput?.value === out.orderNoText : null;
  out.timeline = document.body.innerText.includes('Received');
  // close tracker — success view must remain
  document.querySelector('button[aria-label=\"Close order tracking\"]')?.click(); await sleep(500);
  out.successStill = document.body.innerText.includes('Order placed');
  return JSON.stringify(out);
})()" 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/qa/9-success-track-cta.png 2>&1 | tail -1

echo "=== 3. FADE-UP STAGGERS ==="
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  // close success sheet first
  document.querySelector('button[aria-label=\"Close checkout\"]')?.click(); await sleep(500);
  document.querySelectorAll('nav button')[3]?.click(); await sleep(800);
  const trackBtn = [...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Track an order');
  trackBtn?.click(); await sleep(900);
  const ordersFormWrap = document.querySelector('.sheet-grab form');
  out.ordersFormAnim = ordersFormWrap ? [getComputedStyle(ordersFormWrap).animationName, getComputedStyle(ordersFormWrap).animationDelay] : null;
  const note = [...document.querySelectorAll('p')].find(p=>p.textContent.includes('Design preview'));
  out.noteDelay = note ? getComputedStyle(note).animationDelay : null;
  document.querySelector('button[aria-label=\"Close orders\"]')?.click(); await sleep(500);
  // TrackOrderSheet via last order number chip in cart summary
  const lastChip = [...document.querySelectorAll('button')].find(b=>/^SADN-/.test(b.textContent.trim()));
  lastChip?.click(); await sleep(900);
  const trackForm = document.querySelector('.sheet-grab form');
  out.trackFormAnim = trackForm ? [getComputedStyle(trackForm).animationName, getComputedStyle(trackForm).animationDelay] : null;
  document.querySelector('button[aria-label=\"Close order tracking\"]')?.click(); await sleep(400);
  out.errors = !!document.querySelector('nextjs-portal')?.shadowRoot?.textContent?.match(/Build Error|Runtime Error/);
  return JSON.stringify(out);
})()" 2>&1 | tail -1

echo "=== 4. OFFLINE BROWSE TEST (SW fallback) ==="
agent-browser eval "
(async () => {
  const ready = await navigator.serviceWorker?.getRegistration?.();
  return JSON.stringify({ swActive: !!ready?.active, scope: ready?.scope ?? null });
})()" 2>&1 | tail -1
agent-browser set offline on 2>&1 | tail -1
agent-browser open "http://localhost:3000/" 2>&1 | tail -1
agent-browser wait 2200 2>/dev/null
agent-browser eval "
(async () => {
  const out = {};
  out.servedOfflineShell = document.body.innerText.includes('SADN');
  out.isOffline = !navigator.onLine;
  out.controller = !!navigator.serviceWorker.controller;
  const api = await fetch('/api/products?limit=48').then(r=>r.status).catch(e=>String(e));
  out.apiStatusOffline = api;
  out.cards = document.querySelectorAll('[data-card]').length;
  return JSON.stringify(out);
})()" 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/qa/9-offline-home.png 2>&1 | tail -1
# never-visited URL while offline → branded OFFLINE skeleton
agent-browser open "http://localhost:3000/?never=1" 2>&1 | tail -1
agent-browser wait 1500 2>/dev/null
agent-browser eval "
JSON.stringify({
  offlineSkeleton: document.body.innerText.includes('offline') || document.body.innerText.includes('غير متصل'),
  branded: document.body.innerText.includes('SADN') || document.body.innerText.includes('سدن')
})" 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/qa/9-offline-skeleton.png 2>&1 | tail -1
agent-browser set offline off 2>&1 | tail -1
agent-browser wait 1200 2>/dev/null
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  await sleep(600);
  return JSON.stringify({ backOnline: navigator.onLine, toastShown: document.body.innerText.includes('Back online') });
})()" 2>&1 | tail -1

echo "=== 5. FINAL ERROR SWEEP + CLEANUP ==="
agent-browser eval "localStorage.removeItem('sadn-store-v1'); 'cleaned'" 2>&1 | tail -1
agent-browser open "http://localhost:3000/" 2>&1 | tail -1
agent-browser wait 2000 2>/dev/null
agent-browser eval "
JSON.stringify({
  appErr: document.body.innerText.includes('Application error'),
  buildErr: !!document.querySelector('nextjs-portal')?.shadowRoot?.textContent?.match(/Build Error|Runtime Error/)
})" 2>&1 | tail -1
echo "=== ROUND 9 QA DONE ==="
