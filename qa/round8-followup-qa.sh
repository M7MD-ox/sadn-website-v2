#!/bin/bash
# Round 8 follow-up — proper Clear-recent-searches flow (fresh overlay, no query set)
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
agent-browser eval "
localStorage.setItem('sadn-store-v1', JSON.stringify({state:{cart:[],wishlist:[],orders:[],recent:[],searches:['linen','silk coat'],lastOrderNumber:null,lang:'en',promo:null},version:0})); 'seeded'" 2>&1 | tail -1
agent-browser open "http://localhost:3000/" 2>&1 | tail -1
agent-browser wait 2400 2>/dev/null
agent-browser eval "
(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  document.querySelector('header button[aria-label=\"Search\"]')?.click(); await sleep(600);
  const recent = document.querySelector('[data-recent-searches]');
  out.sectionShown = !!recent;
  out.chips = recent ? [...recent.querySelectorAll('span button')].map(b=>b.textContent.trim()) : [];
  const clearBtn = [...(recent?.querySelectorAll('button') ?? [])].find(b=>b.textContent.trim()==='Clear');
  out.clearFound = !!clearBtn;
  clearBtn?.click(); await sleep(300);
  out.sectionGone = !document.querySelector('[data-recent-searches]');
  out.persistedAfterClear = JSON.parse(localStorage.getItem('sadn-store-v1')||'{}')?.state?.searches ?? null;
  // per-chip remove: reseed via UI — type + Enter to add one, then remove it
  const input = document.querySelector('input[aria-label=\"Search query\"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
  setter.call(input,'plum');
  input.dispatchEvent(new Event('input',{bubbles:true}));
  await sleep(200);
  input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  await sleep(200);
  document.querySelector('button[aria-label=\"Close search\"]')?.click(); await sleep(300);
  document.querySelector('header button[aria-label=\"Search\"]')?.click(); await sleep(600);
  const recent2 = document.querySelector('[data-recent-searches]');
  out.chipsAfterAdd = recent2 ? [...recent2.querySelectorAll('span button')].map(b=>b.textContent.trim()) : [];
  const rmBtn = recent2?.querySelector('span button[aria-label^=\"Remove\"]');
  out.rmBtnFound = !!rmBtn;
  rmBtn?.click(); await sleep(300);
  out.persistedAfterRemove = JSON.parse(localStorage.getItem('sadn-store-v1')||'{}')?.state?.searches ?? null;
  localStorage.removeItem('sadn-store-v1');
  return JSON.stringify(out);
})()" 2>&1 | tail -1
echo "=== FOLLOWUP DONE ==="
