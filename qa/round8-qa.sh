#!/bin/bash
# Round 8 QA — recent searches, save-for-later, sheet-grab pass, price-strike, haptics-no-error
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
agent-browser wait 2600 2>/dev/null

echo "=== 1. RECENT SEARCHES ==="
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  const sBtn = document.querySelector('header button[aria-label=\"Search\"]');
  sBtn?.click(); await sleep(600);
  const input = document.querySelector('input[aria-label=\"Search query\"]');
  if (!input) return JSON.stringify({err:'no search input'});
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
  setter.call(input,'linen');
  input.dispatchEvent(new Event('input',{bubbles:true}));
  await sleep(300);
  input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  await sleep(200);
  document.querySelector('button[aria-label=\"Close search\"]')?.click(); await sleep(400);
  // reopen — chip should persist
  document.querySelector('header button[aria-label=\"Search\"]')?.click(); await sleep(600);
  const recent = document.querySelector('[data-recent-searches]');
  out.sectionShown = !!recent;
  out.chipText = recent?.querySelector('span button')?.textContent?.trim() ?? null;
  out.hasClock = !!recent?.querySelector('svg');
  out.persisted = JSON.parse(localStorage.getItem('sadn-store-v1')||'{}')?.state?.searches ?? null;
  // click chip fills query
  recent?.querySelector('span button')?.click(); await sleep(300);
  out.queryFilled = document.querySelector('input[aria-label=\"Search query\"]')?.value ?? null;
  // clear all
  document.querySelector('input[aria-label=\"Search query\"]')?.closest('div').parentElement; // noop
  const clearBtn = [...document.querySelectorAll('[data-recent-searches] button')].find(b=>b.textContent.trim()==='Clear');
  out.hasClear = !!clearBtn;
  clearBtn?.click(); await sleep(300);
  out.sectionGone = !document.querySelector('[data-recent-searches]');
  out.persistedAfterClear = JSON.parse(localStorage.getItem('sadn-store-v1')||'{}')?.state?.searches ?? null;
  document.querySelector('button[aria-label=\"Close search\"]')?.click(); await sleep(300);
  return JSON.stringify(out);
})()" 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/qa/8-recent-searches.png 2>&1 | tail -1

echo "=== 2. PRICE-STRIKE MIGRATION (shop) ==="
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  document.querySelectorAll('nav button')[1]?.click(); await sleep(900);
  const strike = document.querySelectorAll('.price-strike');
  const inline = document.querySelectorAll('.line-through');
  const cs = strike[0] ? getComputedStyle(strike[0]) : null;
  return JSON.stringify({
    priceStrike: strike.length,
    inlineLeft: inline.length,
    deco: cs?.textDecorationLine,
    font: cs?.fontSize,
    tabular: cs?.fontVariantNumeric?.includes('tabular-nums')
  });
})()" 2>&1 | tail -1

echo "=== 3. SAVE FOR LATER ==="
agent-browser eval "
localStorage.setItem('sadn-store-v1', JSON.stringify({state:{cart:[{slug:'ivory-linen-shirt',name:'Atelier Linen Shirt',nameAr:'قميص الكتان',image:'/products/ivory-linen-shirt.jpg',price:120,size:'M',color:'Ivory',qty:1}],wishlist:[],orders:[],recent:[],searches:[],lastOrderNumber:null,lang:'en',promo:null},version:0})); 'seeded'" 2>&1 | tail -1
agent-browser open "http://localhost:3000/" 2>&1 | tail -1
agent-browser wait 2400 2>/dev/null
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  document.querySelectorAll('nav button')[3]?.click(); await sleep(900);
  out.lineShown = document.body.innerText.includes('Atelier Linen Shirt');
  const saveBtn = document.querySelector('[data-save-later]');
  out.saveBtn = !!saveBtn;
  saveBtn?.click(); await sleep(900);
  out.emptyTitle = document.body.innerText.includes('Your cart is empty');
  out.toast = document.body.innerText.includes('Saved for later');
  const wishBadge = document.querySelector('[data-wish-badge]');
  out.wishBadge = wishBadge?.textContent?.trim() ?? null;
  const stored = JSON.parse(localStorage.getItem('sadn-store-v1')||'{}')?.state ?? {};
  out.wishlist = stored.wishlist;
  out.cartLen = (stored.cart||[]).length;
  out.errors = !!document.querySelector('nextjs-portal')?.shadowRoot?.textContent?.match(/Build Error|Runtime Error/);
  return JSON.stringify(out);
})()" 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/qa/8-save-for-later.png 2>&1 | tail -1

echo "=== 4. SHEET-GRAB ON ORDERS + TRACK + CHECKOUT ==="
agent-browser eval "
localStorage.setItem('sadn-store-v1', JSON.stringify({state:{cart:[{slug:'ivory-linen-shirt',name:'Atelier Linen Shirt',nameAr:'قميص الكتان',image:'/products/ivory-linen-shirt.jpg',price:120,size:'M',color:'Ivory',qty:2}],wishlist:['plum-silk-slip-dress'],orders:[],recent:[],searches:[],lastOrderNumber:null,lang:'en',promo:null},version:0})); 'reseeded'" 2>&1 | tail -1
agent-browser open "http://localhost:3000/" 2>&1 | tail -1
agent-browser wait 2400 2>/dev/null
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  document.querySelectorAll('nav button')[3]?.click(); await sleep(900);
  // Orders sheet
  const ordersBtn = [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Track an order'));
  ordersBtn?.click(); await sleep(800);
  let grab = document.querySelector('[role=dialog] .sheet-grab, .sheet-grab');
  out.ordersGrab = !!grab;
  out.ordersGrabW = grab ? getComputedStyle(grab,'::before').width : null;
  out.ordersNoHOverflow = document.documentElement.scrollWidth <= window.innerWidth;
  document.querySelector('button[aria-label=\"Close orders\"]')?.click(); await sleep(500);
  // Checkout sheet
  const coBtn = [...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith('Proceed to Checkout'));
  coBtn?.click(); await sleep(1000);
  const grab2 = document.querySelector('.sheet-grab');
  out.checkoutGrab = !!grab2;
  out.checkoutGrabW = grab2 ? getComputedStyle(grab2,'::before').width : null;
  // regression: city combobox listbox still anchors to the field wrapper
  const cityInput = document.querySelector('input[aria-label^=\"City\"]') || document.querySelector('#city-suggestions')?.previousElementSibling;
  const inputs = [...document.querySelectorAll('input')];
  const city = inputs.find(i=>i.getAttribute('aria-label')?.includes('governorates') || i.getAttribute('aria-label')?.includes('محافظات'));
  out.cityFound = !!city;
  city?.focus(); await sleep(600);
  const lb = document.querySelector('#city-suggestions');
  out.listboxOpen = !!lb;
  if (lb && city) {
    const lr = lb.getBoundingClientRect();
    const ir = city.getBoundingClientRect();
    out.listboxBelowField = lr.top >= ir.bottom - 2;
    out.listboxWithin430 = Math.round(lr.width) <= 430;
  }
  out.errors = !!document.querySelector('nextjs-portal')?.shadowRoot?.textContent?.match(/Build Error|Runtime Error/);
  return JSON.stringify(out);
})()" 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/qa/8-checkout-grab.png 2>&1 | tail -1

echo "=== 5. RTL SPOT CHECK (search recent chips) ==="
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  // close checkout if open
  document.querySelector('button[aria-label=\"Close checkout\"]')?.click(); await sleep(500);
  const langBtn = document.querySelector('header button[aria-label=\"التبديل إلى العربية\"]');
  langBtn?.click(); await sleep(900);
  document.querySelector('header button[aria-label=\"بحث\"]')?.click(); await sleep(600);
  const input = document.querySelector('input[aria-label=\"كلمة البحث\"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
  setter.call(input,'كتان');
  input.dispatchEvent(new Event('input',{bubbles:true}));
  await sleep(200);
  input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  await sleep(200);
  document.querySelector('button[aria-label=\"إغلاق البحث\"]')?.click(); await sleep(300);
  document.querySelector('header button[aria-label=\"بحث\"]')?.click(); await sleep(600);
  const recent = document.querySelector('[data-recent-searches]');
  const chip = recent?.querySelector('span');
  const chipCS = chip ? getComputedStyle(chip) : null;
  return JSON.stringify({
    rtl: document.documentElement.dir,
    recentShown: !!recent,
    chipText: recent?.querySelector('span button')?.textContent?.trim(),
    chipPaddingStart: chipCS?.paddingLeft !== undefined ? [chipCS.paddingLeft, chipCS.paddingRight] : null,
    noHOverflow: document.documentElement.scrollWidth <= window.innerWidth
  });
})()" 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/qa/8-rtl-recent-searches.png 2>&1 | tail -1

echo "=== CLEANUP + FINAL ERROR SWEEP ==="
agent-browser eval "
(() => { localStorage.removeItem('sadn-store-v1'); return JSON.stringify({
  appErr: document.body.innerText.includes('Application error'),
  buildErr: !!document.querySelector('nextjs-portal')?.shadowRoot?.textContent?.match(/Build Error|Runtime Error/)
}); })()" 2>&1 | tail -1
echo "=== ROUND 8 QA DONE ==="
