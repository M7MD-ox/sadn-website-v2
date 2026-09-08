#!/bin/bash
# Round 8 baseline QA — single call (server restart + browser pass)
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

echo "=== BASELINE: HOME + NAV + ERRORS ==="
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  out.hero = document.body.innerText.includes('SADN');
  out.nav = [...document.querySelectorAll('nav button')].length;
  out.api = await fetch('/api/products?limit=48').then(r=>r.status).catch(()=>0);
  // shop screen
  document.querySelectorAll('nav button')[1]?.click(); await sleep(800);
  out.shopCards = document.querySelectorAll('[data-card]').length;
  out.priceStrike = document.querySelectorAll('.price-strike').length;
  out.inlineStrike = document.querySelectorAll('.line-through').length;
  // product deep link
  location.href = 'http://localhost:3000/?p=ivory-linen-shirt';
})()" 2>&1 | tail -1
agent-browser wait 2200 2>/dev/null
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  out.pdOpen = !!document.querySelector('[role=dialog]') || document.body.innerText.includes('Add to Cart');
  out.pdInlineStrike = document.querySelectorAll('.line-through').length;
  out.errors = !!document.querySelector('nextjs-portal')?.shadowRoot?.textContent?.match(/Build Error|Runtime Error/);
  out.appErr = document.body.innerText.includes('Application error');
  return JSON.stringify(out);
})()" 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/qa/8-baseline-product.png 2>&1 | tail -1
echo "=== BASELINE DONE ==="
