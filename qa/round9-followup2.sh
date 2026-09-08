#!/bin/bash
# Round 9 follow-up 2 — uppercase-aware checks + SW cache inventory
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

echo "=== 1. EMPTY-CART RECS (uppercase-aware + add) ==="
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  document.querySelectorAll('nav button')[3]?.click(); await sleep(1000);
  out.eyebrow = document.body.innerText.toUpperCase().includes('WHILE YOU DECIDE');
  out.title = document.body.innerText.includes('From the atelier');
  out.cards = document.querySelectorAll('[data-card]').length;
  const btns = document.querySelector('[data-card]')?.querySelectorAll('button') ?? [];
  btns[1]?.click(); await sleep(900);
  const stored = JSON.parse(localStorage.getItem('sadn-store-v1')||'{}')?.state ?? {};
  out.cartLen = (stored.cart||[]).length;
  out.wishLen = (stored.wishlist||[]).length;
  out.miniCart = document.body.innerText.includes('Added to cart');
  localStorage.removeItem('sadn-store-v1');
  return JSON.stringify(out);
})()" 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/qa/9-empty-recs.png 2>&1 | tail -1

echo "=== 2. SUCCESS → TRACK CTA → AUTO-LOOKUP TIMELINE ==="
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
  set(city, 'Cairo'); await sleep(400);
  [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Place Order'))?.click(); await sleep(2500);
  out.success = document.body.innerText.includes('Order placed');
  out.orderNo = (document.body.innerText.match(/No\. (SADN-\d+)/)||[])[1] ?? null;
  [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Track this order'))?.click(); await sleep(1600);
  const numInput = [...document.querySelectorAll('input')].find(i=>i.getAttribute('aria-label')==='Order number');
  out.trackerPrefilled = numInput?.value ?? null;
  out.prefillMatches = out.orderNo ? numInput?.value === out.orderNo : null;
  out.timelineShown = document.body.innerText.toUpperCase().includes('RECEIVED');
  out.trackFormDelay = document.querySelector('.sheet-grab form') ? getComputedStyle(document.querySelector('.sheet-grab form')).animationDelay : null;
  out.resultAnim = document.querySelector('[data-track-result]') ? 'present' : null;
  document.querySelector('button[aria-label=\"Close order tracking\"]')?.click(); await sleep(400);
  out.successStill = document.body.innerText.includes('Order placed');
  localStorage.removeItem('sadn-store-v1');
  return JSON.stringify(out);
})()" 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/qa/9-success-track-cta.png 2>&1 | tail -1

echo "=== 3. SW CACHE INVENTORY (offline fallback materials) ==="
agent-browser eval "
(async () => {
  const names = await caches.keys();
  const inv = {};
  for (const n of names) {
    const c = await caches.open(n);
    inv[n] = (await c.keys()).length;
  }
  const shell = await caches.open('sadn-v1-shell');
  const shellKeys = (await shell.keys()).map(r=>new URL(r.url).pathname).slice(0,6);
  const api = await caches.open('sadn-v1-api');
  const apiKeys = (await api.keys()).map(r=>new URL(r.url).pathname + (new URL(r.url).search||''));
  const pages = await caches.open('sadn-v1-pages');
  const pageKeys = (await pages.keys()).map(r=>r.url.replace('http://localhost:3000',''));
  return JSON.stringify({ inv, shellKeys, apiKeys, pageKeys });
})()" 2>&1 | tail -1

echo "=== FINAL SWEEP ==="
agent-browser eval "JSON.stringify({ appErr: document.body.innerText.includes('Application error'), buildErr: !!document.querySelector('nextjs-portal')?.shadowRoot?.textContent?.match(/Build Error|Runtime Error/) })" 2>&1 | tail -1
echo "=== DONE ==="
