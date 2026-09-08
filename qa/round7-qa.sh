#!/bin/bash
# Round 7 QA baseline — single call (restart + browser pass) to dodge sandbox reaper
cd /home/z/my-project
pkill -f "next dev" 2>/dev/null; sleep 1; rm -f dev.log
setsid nohup bun run dev > dev.log 2>&1 < /dev/null &
sleep 1
for i in $(seq 1 45); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3000/ 2>/dev/null)
  [ "$code" = "200" ] && { echo "SERVER READY after ${i}s"; break; }
  sleep 1
done

agent-browser open http://localhost:3000/ 2>&1 | tail -1
agent-browser wait 2200 2>/dev/null

echo "=== HOME ==="
agent-browser eval "JSON.stringify({title:document.title, shell:!!document.querySelector('[data-screen-shell]'), nav:document.querySelectorAll('nav button').length, imgs:document.querySelectorAll('img[src*=products]').length})" 2>&1 | tail -1

echo "=== SHOP + PRODUCT + LANG ==="
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  const nav = document.querySelectorAll('nav button');
  // Shop
  nav[1]?.click(); await sleep(800);
  out.shopImgs = document.querySelectorAll('img[src*=products]').length;
  // open first product card
  const card = document.querySelector('[data-screen=shop] img[src*=products]');
  const clickable = card ? (card.closest('a,button,[role=button]') || card) : null;
  clickable?.click(); await sleep(1000);
  out.productOpen = /Size|مقاس/i.test(document.body.innerText);
  out.hasShare = /Share|مشاركة/i.test(document.body.innerText);
  // back to shop
  const backBtn = [...document.querySelectorAll('button')].find(b => b.querySelector('svg.lucide-arrow-left'));
  backBtn?.click(); await sleep(700);
  // Bag tab (nav[2])
  nav[2]?.click(); await sleep(800);
  out.bagScreen = /Bag|الحقيبة|Your bag|حقيبتك/i.test(document.body.innerText);
  // Saved tab (nav[3])
  nav[3]?.click(); await sleep(800);
  out.savedScreen = /Saved|المحفوظة|Wishlist|المفضلة/i.test(document.body.innerText);
  // Home tab
  nav[0]?.click(); await sleep(800);
  // Language toggle
  const langBtn = [...document.querySelectorAll('header button, [data-screen-shell] button')].find(b => /^(ع|EN)$/.test(b.textContent.trim()));
  if (langBtn) { langBtn.click(); await sleep(700); out.dirAR = document.documentElement.dir; langBtn.click(); await sleep(700); out.dirEN = document.documentElement.dir; }
  else out.langBtn = 'NOT FOUND';
  out.ok = true;
  return JSON.stringify(out);
})()" 2>&1 | tail -1

echo "=== SCREENSHOT ==="
agent-browser screenshot /home/z/my-project/qa/7-baseline-home.png 2>&1 | tail -1
