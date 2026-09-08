#!/bin/bash
# Round 9 follow-up — corrected selectors + reload-based offline test
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

echo "=== 1. EMPTY-CART RECS: ADD VIA + BUTTON ==="
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  document.querySelectorAll('nav button')[3]?.click(); await sleep(1000);
  out.recsEyebrowUpper = document.body.innerText.toUpperCase().includes('WHILE YOU DECIDE');
  const card = document.querySelector('[data-card]');
  const btns = card ? card.querySelectorAll('button') : [];
  out.cardButtons = btns.length;
  // second button = the + (first is the wishlist heart)
  btns[1]?.click(); await sleep(900);
  const stored = JSON.parse(localStorage.getItem('sadn-store-v1')||'{}')?.state ?? {};
  out.cartLen = (stored.cart||[]).length;
  out.wishlistLen = (stored.wishlist||[]).length;
  out.miniCart = document.body.innerText.includes('Added to cart');
  return JSON.stringify(out);
})()" 2>&1 | tail -1

echo "=== 2. CHECKOUT SUCCESS → TRACK CTA ==="
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
  const byPh = (p) => [...document.querySelectorAll('input')].find(i=>i.placeholder===p);
  set(byPh('Layla Hassan'), 'Layla Hassan');
  set(byPh('+20 10 1234 5678'), '+201012345678');
  set(byPh('Street, building, apartment'), '12 Zamalek St, Apt 3');
  const city = [...document.querySelectorAll('input')].find(i=>i.getAttribute('aria-label')?.includes('governorates'));
  set(city, 'Cairo'); await sleep(500);
  out.comboOpen = !!document.querySelector('#city-suggestions');
  [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Place Order'))?.click(); await sleep(2500);
  out.success = document.body.innerText.includes('Order placed');
  out.orderNoText = (document.body.innerText.match(/No\. (SADN-\d+)/)||[])[1] ?? null;
  out.trackCta = [...document.querySelectorAll('button')].some(b=>b.textContent.includes('Track this order'));
  [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Track this order'))?.click(); await sleep(1100);
  const numInput = [...document.querySelectorAll('input')].find(i=>i.getAttribute('aria-label')==='Order number');
  out.trackerOpen = !!numInput;
  out.prefillMatches = out.orderNoText ? numInput?.value === out.orderNoText : null;
  out.timelineReceived = document.body.innerText.includes('Received');
  document.querySelector('button[aria-label=\"Close order tracking\"]')?.click(); await sleep(500);
  out.successStill = document.body.innerText.includes('Order placed');
  // stagger check on success view blocks
  const h2 = [...document.querySelectorAll('h2')].find(h=>h.textContent==='Order placed');
  out.h2Delay = h2 ? getComputedStyle(h2).animationDelay : null;
  return JSON.stringify(out);
})()" 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/qa/9-success-track-cta.png 2>&1 | tail -1

echo "=== 3. TRACK SHEET FADE-UP (via last-order chip) ==="
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  document.querySelector('button[aria-label=\"Close checkout\"]')?.click(); await sleep(500);
  const lastChip = [...document.querySelectorAll('button')].find(b=>/^SADN-/.test(b.textContent.trim()));
  out.chipFound = !!lastChip;
  lastChip?.click(); await sleep(900);
  const trackForm = document.querySelector('.sheet-grab form');
  out.trackFormAnim = trackForm ? [getComputedStyle(trackForm).animationName, getComputedStyle(trackForm).animationDelay] : null;
  document.querySelector('button[aria-label=\"Close order tracking\"]')?.click(); await sleep(400);
  return JSON.stringify(out);
})()" 2>&1 | tail -1

echo "=== 4. OFFLINE TEST (reload-based) ==="
agent-browser eval "
(async () => {
  const reg = await navigator.serviceWorker?.getRegistration?.();
  return JSON.stringify({ swActive: !!reg?.active, controller: !!navigator.serviceWorker.controller });
})()" 2>&1 | tail -1
agent-browser set offline on 2>&1 | tail -1
agent-browser eval "location.reload(); 'reloading'" 2>&1 | tail -1
agent-browser wait 2500 2>/dev/null
agent-browser eval "
(async () => {
  const out = {};
  out.isOffline = !navigator.onLine;
  out.controller = !!navigator.serviceWorker.controller;
  out.shellLoaded = document.body.innerText.toUpperCase().includes('SADN');
  const api = await fetch('/api/products?limit=48').then(r=>r.status).catch(e=>'ERR:'+e);
  out.apiStatus = api;
  out.cards = document.querySelectorAll('[data-card]').length;
  return JSON.stringify(out);
})()" 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/qa/9-offline-home.png 2>&1 | tail -1
agent-browser eval "location.href='http://localhost:3000/?never=1'; 'nav'" 2>&1 | tail -1
agent-browser wait 2000 2>/dev/null
agent-browser eval "
JSON.stringify({
  isOffline: !navigator.onLine,
  offlineSkeleton: document.body.innerText.toLowerCase().includes('offline') || document.body.innerText.includes('غير متصل'),
  branded: document.body.innerText.toUpperCase().includes('SADN') || document.body.innerText.includes('سدن')
})" 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/qa/9-offline-skeleton.png 2>&1 | tail -1
agent-browser set offline off 2>&1 | tail -1
agent-browser eval "location.reload(); 'reloading'" 2>&1 | tail -1
agent-browser wait 2200 2>/dev/null
agent-browser eval "JSON.stringify({ backOnline: navigator.onLine })" 2>&1 | tail -1

echo "=== CLEANUP ==="
agent-browser eval "localStorage.removeItem('sadn-store-v1'); 'cleaned'" 2>&1 | tail -1
echo "=== FOLLOWUP DONE ==="
