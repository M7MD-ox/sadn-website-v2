#!/bin/bash
# Round 7-d styling QA — single call (server restart + full browser pass) — v2
# Fixes vs v1: no reload after deep-link open (URL is cleaned by the app itself),
# clear persisted sadn-install-dismissed (set by round-7-a QA) before banner sim,
# keyboard ArrowDown for combobox selected state, computed `rotate` for chevron.
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
agent-browser open "http://localhost:3000/?p=ivory-linen-shirt" 2>&1 | tail -1
agent-browser wait 2800 2>/dev/null

echo "=== 1. SIZE GUIDE SHEET ==="
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const out = { vp: window.innerWidth + 'x' + window.innerHeight };
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Size guide');
  if (!btn) return JSON.stringify({err:'no size-guide button', probe: document.body.innerText.slice(0,120)});
  btn.click(); await sleep(850);
  const dialogs = [...document.querySelectorAll('[role=dialog]')];
  out.dialogWidths = dialogs.map(d => Math.round(d.getBoundingClientRect().width));
  const sheet = document.querySelector('.sheet-grab');
  out.sheetW = sheet ? Math.round(sheet.getBoundingClientRect().width) : null;
  const tbl = document.querySelector('.sg-table');
  out.tblNoHOverflow = tbl ? (tbl.scrollWidth <= tbl.clientWidth + 1) : null;
  out.tblScrollClient = tbl ? [tbl.scrollWidth, tbl.clientWidth] : null;
  const grab = sheet ? getComputedStyle(sheet, '::before') : null;
  out.grabW = grab ? grab.width : null;
  const theadTr = document.querySelector('.sg-table thead tr');
  out.theadGrain = theadTr ? getComputedStyle(theadTr).backgroundImage.includes('radial-gradient') : null;
  const zebra = document.querySelectorAll('.sg-table tbody tr')[1];
  out.zebraBg = zebra ? getComputedStyle(zebra).backgroundColor : null;
  const seg = document.querySelector('[role=group]');
  out.toggleTrackBg = seg ? getComputedStyle(seg).backgroundColor : null;
  const segBtns = seg ? [...seg.querySelectorAll('button')] : [];
  out.activePillShadow = segBtns[0] ? getComputedStyle(segBtns[0]).boxShadow !== 'none' : null;
  const fit = [...document.querySelectorAll('p')].find(p => p.textContent.trim()==='Fit note')?.parentElement;
  out.fitRing = fit ? (getComputedStyle(fit).boxShadow !== 'none') : null;
  out.fitDelay = fit ? getComputedStyle(fit).animationDelay : null;
  const tblWrap = document.querySelector('.sg-table')?.parentElement;
  out.tblDelay = tblWrap ? getComputedStyle(tblWrap).animationDelay : null;
  out.errors = !!document.querySelector('nextjs-portal')?.shadowRoot?.textContent?.match(/Build Error|Runtime Error/);
  out.appErr = document.body.innerText.includes('Application error');
  return JSON.stringify(out);
})()" 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/qa/7d-size-guide.png 2>&1 | tail -1

echo "=== 2. SEED CART + PROMO PENDING CHIP ==="
agent-browser eval "
localStorage.setItem('sadn-store-v1', JSON.stringify({state:{cart:[{slug:'ivory-linen-shirt',name:'Atelier Linen Shirt',nameAr:'قميص الكتان',image:'/products/ivory-linen-shirt.jpg',price:120,size:'M',color:'Ivory',qty:1}],wishlist:[],orders:[],recent:[],lastOrderNumber:null,lang:'en',promo:{code:'ATELIER25',label:'25% off orders over \$200'}},version:0})); 'seeded'" 2>&1 | tail -1
agent-browser open "http://localhost:3000/" 2>&1 | tail -1
agent-browser wait 2300 2>/dev/null
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const nav = document.querySelectorAll('nav button');
  nav[3]?.click(); await sleep(900);
  const chip = document.querySelector('[data-promo-chip]');
  const out = { chipFound: !!chip };
  if (chip) {
    const cs = getComputedStyle(chip);
    out.border = cs.borderTopColor;
    out.bg = cs.backgroundColor;
    const icon = chip.querySelector('svg');
    out.iconColor = icon ? getComputedStyle(icon).color : null;
    out.iconAnim = icon ? getComputedStyle(icon).animationName : null;
    out.pendingText = chip.textContent.includes('Kept for you');
    const codeP = chip.querySelector('p');
    out.codeColor = codeP ? getComputedStyle(codeP).color : null;
  }
  return JSON.stringify(out);
})()" 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/qa/7d-promo-pending.png 2>&1 | tail -1

echo "=== 3. CHECKOUT + CITY COMBOBOX ==="
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const cta = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Proceed to Checkout');
  if (!cta) return JSON.stringify({err:'no checkout CTA'});
  cta.click(); await sleep(950);
  const combo = document.querySelector('[role=combobox]');
  if (!combo) return JSON.stringify({err:'no combobox', probe: document.body.innerText.slice(0,120)});
  combo.focus(); await sleep(550);
  const list = document.querySelector('#city-suggestions');
  const out = { listOpen: !!list };
  if (list) {
    out.optCount = list.querySelectorAll('[role=option]').length;
    out.popularEyebrow = [...list.querySelectorAll('li')].some(li => li.textContent.trim()==='Popular' && li.className.includes('eyebrow-rule'));
    out.listAnim = getComputedStyle(list).animationName;
    out.listNoHOverflow = list.scrollWidth <= list.clientWidth + 1;
    // Keyboard nav (real a11y path): ArrowDown activates option 0
    combo.dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowDown', bubbles:true}));
    await sleep(300);
    const optBtn = list.querySelector('[role=option] button');
    out.selBg = getComputedStyle(optBtn).backgroundColor;
    out.selRing = getComputedStyle(optBtn).boxShadow !== 'none';
    out.activedescendant = combo.getAttribute('aria-activedescendant');
  }
  const chev = combo.parentElement.querySelector('.lucide-chevron-down');
  out.chevRot = chev ? getComputedStyle(chev).rotate : null;
  return JSON.stringify(out);
})()" 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/qa/7d-city-list.png 2>&1 | tail -1

echo "=== 4. CLOSE SHEET + INSTALL BANNER ==="
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const x = document.querySelector('[role=dialog] .lucide-x')?.closest('button');
  x?.click(); await sleep(650);
  const pre = {
    standalone: matchMedia('(display-mode: standalone)').matches,
    dismissedFlag: localStorage.getItem('sadn-install-dismissed')
  };
  localStorage.removeItem('sadn-install-dismissed');
  return JSON.stringify(pre);
})()" 2>&1 | tail -1
agent-browser reload 2>/dev/null | tail -1
agent-browser wait 2300 2>/dev/null
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const ev = new Event('beforeinstallprompt');
  Object.assign(ev,{prompt:async()=>{},userChoice:Promise.resolve({outcome:'dismissed'})});
  window.dispatchEvent(ev);
  await sleep(900);
  const region = [...document.querySelectorAll('[role=region]')].find(r => r.getAttribute('aria-label')==='Install SADN');
  const out = { bannerShown: !!region };
  if (region) {
    const card = region.firstElementChild;
    out.cardGradient = getComputedStyle(card).backgroundImage.includes('gradient');
    const tile = card.querySelector('span');
    out.tileInsetRing = tile ? getComputedStyle(tile).boxShadow !== 'none' : null;
    const cta = [...card.querySelectorAll('button')].find(b => b.textContent.trim()==='Install');
    out.ctaShadow = cta ? getComputedStyle(cta).boxShadow !== 'none' : null;
    out.cardPointerEvents = getComputedStyle(card).pointerEvents;
    out.wrapperPointerEvents = getComputedStyle(region).pointerEvents;
  }
  return JSON.stringify(out);
})()" 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/qa/7d-install-banner.png 2>&1 | tail -1

echo "=== 5. RTL SIZE GUIDE ==="
agent-browser eval "
(async () => {
  const langBtn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'ع');
  langBtn?.click();
  await new Promise(r=>setTimeout(r,750));
  return 'dir=' + document.documentElement.dir;
})()" 2>&1 | tail -1
agent-browser open "http://localhost:3000/?p=ivory-linen-shirt" 2>&1 | tail -1
agent-browser wait 2500 2>/dev/null
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const out = { dir: document.documentElement.dir };
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'دليل المقاسات');
  if (!btn) { out.err = 'no AR size-guide button'; out.probe = document.body.innerText.slice(0,120); return JSON.stringify(out); }
  btn.click(); await sleep(850);
  const sheet = document.querySelector('.sheet-grab');
  out.sheetW = sheet ? Math.round(sheet.getBoundingClientRect().width) : null;
  out.noPageHOverflow = document.documentElement.scrollWidth <= window.innerWidth;
  out.scrollVsViewport = [document.documentElement.scrollWidth, window.innerWidth];
  out.grabW = sheet ? getComputedStyle(sheet, '::before').width : null;
  out.errors = !!document.querySelector('nextjs-portal')?.shadowRoot?.textContent?.match(/Build Error|Runtime Error/);
  out.appErr = document.body.innerText.includes('Application error');
  return JSON.stringify(out);
})()" 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/qa/7d-rtl-size-guide.png 2>&1 | tail -1

echo "=== 6. BONUS: ACTIVE PROMO HALO ==="
agent-browser eval "
localStorage.setItem('sadn-store-v1', JSON.stringify({state:{cart:[{slug:'ivory-linen-shirt',name:'Atelier Linen Shirt',nameAr:'قميص الكتان',image:'/products/ivory-linen-shirt.jpg',price:120,size:'M',color:'Ivory',qty:3}],wishlist:[],orders:[],recent:[],lastOrderNumber:null,lang:'en',promo:{code:'ATELIER25',label:'25% off orders over \$200'}},version:0})); 'seeded-active'" 2>&1 | tail -1
agent-browser open "http://localhost:3000/" 2>&1 | tail -1
agent-browser wait 2300 2>/dev/null
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const nav = document.querySelectorAll('nav button');
  nav[3]?.click(); await sleep(900);
  const chip = document.querySelector('[data-promo-chip]');
  const out = { chipFound: !!chip };
  if (chip) {
    const icon = chip.querySelector('svg');
    out.iconAnim = icon ? getComputedStyle(icon).animationName : null;
    out.iconHalo = icon ? getComputedStyle(icon).boxShadow !== 'none' : null;
    out.iconColor = icon ? getComputedStyle(icon).color : null;
    out.border = getComputedStyle(chip).borderTopColor;
    out.label = chip.textContent.trim().slice(0, 60);
  }
  return JSON.stringify(out);
})()" 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/qa/7d-promo-active.png 2>&1 | tail -1

echo "=== 7. CLEANUP ==="
agent-browser eval "localStorage.removeItem('sadn-store-v1'); localStorage.removeItem('sadn-install-dismissed'); 'cleared'" 2>&1 | tail -1
agent-browser close 2>&1 | tail -1
echo "=== QA DONE ==="
