#!/bin/bash
# Round 7 QA follow-ups — SW verify, pending promo path, console errors
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

echo "=== A. SW registration (fixed eval) ==="
agent-browser eval "new Promise(function(res){ if(!('serviceWorker' in navigator)) return res(JSON.stringify({sw:false})); navigator.serviceWorker.ready.then(function(r){ caches.keys().then(function(ks){ res(JSON.stringify({sw:true, scope:r.scope, caches:ks})); }); }).catch(function(e){ res(JSON.stringify({sw:false, err:String(e)})); }); setTimeout(function(){ res(JSON.stringify({sw:'timeout'})); }, 12000); })" 2>&1 | tail -1

echo "=== B. Pending promo path (seed store: 1 shirt + ATELIER25) ==="
agent-browser eval "
(function(){
  const raw = JSON.parse(localStorage.getItem('sadn-store-v1') || '{}');
  raw.state = raw.state || {};
  raw.state.cart = [{
    slug: 'ivory-linen-shirt', name: 'Atelier Linen Shirt', nameAr: 'قميص الكتان',
    image: '/products/ivory-linen-shirt.jpg', price: 120, size: 'M', color: 'Ivory', qty: 1
  }];
  raw.state.promo = { code: 'ATELIER25', label: '25% off orders over $200' };
  raw.version = raw.version || 0;
  localStorage.setItem('sadn-store-v1', JSON.stringify(raw));
  location.href = 'http://localhost:3000/';
  return 'seeded';
})()" 2>&1 | tail -1
agent-browser wait 2600 2>/dev/null
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const nav = document.querySelectorAll('nav button');
  nav[3] && nav[3].click(); await sleep(800);
  if (!/Proceed to Checkout/i.test(document.body.innerText)) { nav[2] && nav[2].click(); await sleep(800); }
  const chip = document.querySelector('[data-promo-chip]');
  const out = {
    chip: !!chip,
    pendingNote: chip ? /Kept for you/i.test(chip.innerText) : false,
    chipText: chip ? chip.innerText.replace(/\s+/g,' ').trim().slice(0,90) : null,
    discountRow: /Discount/.test(document.body.innerText),
    total: null
  };
  return JSON.stringify(out);
})()" 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/qa/7-promo-pending.png 2>&1 | tail -1

echo "=== C. Console errors (page-level) ==="
agent-browser eval "
(function(){
  return JSON.stringify({
    title: document.title,
    devOverlay: !!document.querySelector('nextjs-portal'),
    portalHasError: (() => { const p = document.querySelector('nextjs-portal'); if(!p || !p.shadowRoot) return false; return /Build Error|Runtime Error|Unhandled/.test(p.shadowRoot.textContent || ''); })(),
    bodyErrorText: /Application error: a client-side exception/.test(document.body.innerText)
  });
})()" 2>&1 | tail -1

echo "=== D. Size guide screenshot ==="
agent-browser open "http://localhost:3000/?p=plum-silk-slip-dress" 2>&1 | tail -1
agent-browser wait 2200 2>/dev/null
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Size guide');
  btn && btn.click(); await sleep(800);
  return 'guide-open';
})()" 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/qa/7-size-guide.png 2>&1 | tail -1

echo "=== E. Cleanup seeded store ==="
agent-browser eval "localStorage.removeItem('sadn-store-v1'); 'cleared'" 2>&1 | tail -1
