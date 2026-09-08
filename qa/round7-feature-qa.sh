#!/bin/bash
# Round 7 feature QA — single call (restart + full browser pass)
cd /home/z/my-project
pkill -f "next dev" 2>/dev/null; sleep 1; rm -f dev.log
setsid nohup bun run dev > dev.log 2>&1 < /dev/null &
sleep 1
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3000/ 2>/dev/null)
  [ "$code" = "200" ] && { echo "SERVER READY after ${i}s"; break; }
  sleep 1
done

agent-browser open http://localhost:3000/ 2>&1 | tail -1
agent-browser wait 2500 2>/dev/null

echo "=== 1. SW registration ==="
agent-browser eval "
new Promise(res => {
  if (!('serviceWorker' in navigator)) return res(JSON.stringify({sw: false}));
  navigator.serviceWorker.ready.then(r => {
    caches.keys().then(ks => res(JSON.stringify({sw: true, scope: r.scope, caches: ks})));
  }).catch(e => res(JSON.stringify({sw: false, err: String(e)})));
  setTimeout(() => res(JSON.stringify({sw: 'timeout'})), 12000);
}))" 2>&1 | tail -1

echo "=== 2. Size guide via deep link ==="
agent-browser open "http://localhost:3000/?p=ivory-linen-shirt" 2>&1 | tail -1
agent-browser wait 2200 2>/dev/null
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  out.productOpen = /Add to Cart/i.test(document.body.innerText);
  const guideBtn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Size guide');
  if (!guideBtn) return JSON.stringify({...out, guideBtn: false});
  guideBtn.click(); await sleep(700);
  const dlg = document.querySelector('[role=dialog][aria-label=\"Size guide\"]');
  out.dialog = !!dlg;
  out.rows = dlg ? dlg.querySelectorAll('tbody tr').length : 0;
  out.firstCm = dlg ? dlg.querySelector('tbody td')?.textContent : null;
  const inBtn = dlg && [...dlg.querySelectorAll('button')].find(b => b.textContent.trim() === 'in');
  inBtn && inBtn.click(); await sleep(300);
  out.firstIn = dlg.querySelector('tbody td')?.textContent;
  out.fitNote = /size down|اختر مقاساً/i.test(dlg?.innerText || '');
  const closeBtn = dlg && [...dlg.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Close size guide');
  closeBtn && closeBtn.click(); await sleep(400);
  out.closed = !document.querySelector('[role=dialog][aria-label=\"Size guide\"]');
  return JSON.stringify(out);
})()" 2>&1 | tail -1

echo "=== 3. Add to cart + city autocomplete in checkout ==="
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  // add to cart
  const addBtn = [...document.querySelectorAll('button')].find(b => /Add to Cart/i.test(b.textContent));
  if (!addBtn) return JSON.stringify({addBtn: false});
  addBtn.click(); await sleep(1100);
  // close mini-cart if present
  const keep = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Keep browsing');
  keep && keep.click(); await sleep(500);
  // go to bag tab
  const nav = document.querySelectorAll('nav button');
  nav[3] && nav[3].click(); await sleep(700); // wishlist? no — cart is 4th? try index 2 fallback below
  if (!/Proceed to Checkout|Track an order|Your Cart/i.test(document.body.innerText)) {
    nav[2] && nav[2].click(); await sleep(700);
  }
  out.bag = /Proceed to Checkout/i.test(document.body.innerText);
  // checkout
  const co = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Proceed to Checkout');
  co && co.click(); await sleep(900);
  const combo = document.querySelector('[role=combobox]');
  out.combo = !!combo;
  if (!combo) return JSON.stringify(out);
  combo.focus(); await sleep(400);
  out.popularShown = document.querySelectorAll('#city-suggestions li').length; // 3 popular + header li
  // type 'giz'
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(combo, 'giz');
  combo.dispatchEvent(new Event('input', {bubbles: true}));
  await sleep(450);
  const opts = [...document.querySelectorAll('#city-suggestions button')];
  out.options = opts.map(b => b.textContent.trim().replace(/\s+/g,' '));
  // pick Giza
  const giza = opts.find(b => b.textContent.includes('Giza'));
  giza && giza.click(); await sleep(400);
  out.cityValue = combo.value;
  return JSON.stringify(out);
})()" 2>&1 | tail -1

echo "=== 4. Promo apply + persistence across reload ==="
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  // close checkout first
  const close = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Close checkout');
  close && close.click(); await sleep(600);
  // open promo
  const promoCta = [...document.querySelectorAll('button')].find(b => /Have a promo code/i.test(b.textContent));
  promoCta && promoCta.click(); await sleep(400);
  const inp = [...document.querySelectorAll('input')].find(i => i.getAttribute('aria-label') === 'Promo code');
  out.promoInput = !!inp;
  if (!inp) return JSON.stringify(out);
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(inp, 'sadn10');
  inp.dispatchEvent(new Event('input', {bubbles: true}));
  await sleep(200);
  const apply = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Apply');
  apply && apply.click(); await sleep(900);
  const chip = document.querySelector('[data-promo-chip]');
  out.chipText = chip ? chip.textContent.replace(/\s+/g,' ').trim().slice(0,80) : null;
  out.stored = JSON.parse(localStorage.getItem('sadn-store-v1') || '{}')?.state?.promo || null;
  // reload to test persistence
  location.reload();
  return JSON.stringify(out);
})()" 2>&1 | tail -1
agent-browser wait 2600 2>/dev/null
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  // navigate to bag after reload
  const nav = document.querySelectorAll('nav button');
  nav[3] && nav[3].click(); await sleep(700);
  if (!/Proceed to Checkout/i.test(document.body.innerText)) { nav[2] && nav[2].click(); await sleep(700); }
  const chip = document.querySelector('[data-promo-chip]');
  out.chipAfterReload = chip ? chip.textContent.replace(/\s+/g,' ').trim().slice(0,60) : null;
  // remove promo
  const rm = chip && chip.querySelector('button');
  rm && rm.click(); await sleep(400);
  out.chipGone = !document.querySelector('[data-promo-chip]');
  // pending state: apply ATELIER25 with small subtotal
  const promoCta = [...document.querySelectorAll('button')].find(b => /Have a promo code/i.test(b.textContent));
  promoCta && promoCta.click(); await sleep(400);
  const inp = [...document.querySelectorAll('input')].find(i => i.getAttribute('aria-label') === 'Promo code');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(inp, 'ATELIER25');
  inp.dispatchEvent(new Event('input', {bubbles: true}));
  await sleep(200);
  const apply = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Apply');
  apply && apply.click(); await sleep(900);
  const chip2 = document.querySelector('[data-promo-chip]');
  out.pendingNote = chip2 ? /Kept for you/i.test(chip2.innerText) : false;
  // cleanup: remove
  const rm2 = chip2 && chip2.querySelector('button');
  rm2 && rm2.click(); await sleep(300);
  return JSON.stringify(out);
})()" 2>&1 | tail -1

echo "=== 5. Install banner (simulated prompt) + offline toast ==="
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  const ev = new Event('beforeinstallprompt');
  Object.assign(ev, { prompt: async () => {}, userChoice: Promise.resolve({ outcome: 'dismissed' }) });
  window.dispatchEvent(ev); await sleep(600);
  const banner = [...document.querySelectorAll('[role=region]')].find(r => r.getAttribute('aria-label') === 'Install SADN');
  out.banner = !!banner;
  window.__shot1 = true;
  return JSON.stringify(out);
})()" 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/qa/7-install-banner.png 2>&1 | tail -1
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const notNow = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Not now');
  notNow && notNow.click(); await sleep(400);
  const bannerGone = ![...document.querySelectorAll('[role=region]')].some(r => r.getAttribute('aria-label') === 'Install SADN');
  window.dispatchEvent(new Event('offline')); await sleep(700);
  const offlineToast = /offline/i.test(document.body.innerText) || /غير متصل/.test(document.body.innerText);
  window.dispatchEvent(new Event('online')); await sleep(700);
  const backOnline = /Back online/.test(document.body.innerText) || /عاد الاتصال/.test(document.body.innerText);
  const dismissed = localStorage.getItem('sadn-install-dismissed');
  return JSON.stringify({bannerGone, offlineToast, backOnline, dismissedFlag: dismissed === '1'});
})()" 2>&1 | tail -1

echo "=== 6. Dev overlay check + screenshots ==="
agent-browser eval "JSON.stringify({devOverlay: !!document.querySelector('nextjs-portal'), title: document.title})" 2>&1 | tail -1
