#!/bin/bash
# Round 12 frontend E2E — EGP currency, COD, wishlist removal, 3-tab nav,
# manual order registration, /admin URL, live product-page sync.
cd /home/z/my-project
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); echo "PASS: $1"; }
bad(){ FAIL=$((FAIL+1)); echo "FAIL: $1"; }
has(){ if echo "$2" | rg -q "$3"; then ok "$1"; else bad "$1 — missing: $3"; fi; }
nohas(){ if echo "$2" | rg -q "$3"; then bad "$1 — should NOT contain: $3"; else ok "$1"; fi; }
EB="agent-browser"

# ── server up (single-call pattern) ──
pkill -f "next dev" 2>/dev/null; pkill -f "bun run dev" 2>/dev/null; sleep 1
setsid nohup bun run dev > dev.log 2>&1 < /dev/null &
for i in $(seq 1 40); do curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | rg -q 200 && break; sleep 1; done
echo "server up"

$EB close --all > /dev/null 2>&1
sleep 1
$EB open http://localhost:3000/ > /dev/null 2>&1
$EB wait '[data-card]' > /dev/null 2>&1
sleep 2

# ── T1 home shell: 3-tab nav, EGP price, banner, wishlist gone ──
R=$($EB eval "(()=>{const nav=document.querySelectorAll('nav[aria-label=\"Primary\"] button');return JSON.stringify({tabs:nav.length,egp:document.body.innerText.includes('EGP 1,450'),wish:document.body.innerText.includes('Wishlist'),hearts:document.querySelectorAll('[aria-label^=\"Add to wishlist\"]').length,banner:!!document.querySelector('[aria-label=\"Announcement\"]')})})()" 2>/dev/null | sed 's/\\"/"/g')
has "T1 tabs=3" "$R" '"tabs":3'
has "T1 EGP price" "$R" '"egp":true'
has "T1 wishlist text gone" "$R" '"wish":false'
has "T1 heart buttons gone" "$R" '"hearts":0'
has "T1 banner visible" "$R" '"banner":true'

# ── T2 Arabic: RTL + ج.م ──
$EB eval "(()=>{document.querySelector('button[aria-label=\"التبديل إلى العربية\"]')?.click();return 'clicked'})()" > /dev/null 2>&1
sleep 1
R=$($EB eval "(()=>{return JSON.stringify({dir:document.documentElement.dir,gem:document.body.innerText.includes('ج.م'),tabsAr:document.body.innerText.includes('السلة')})})()" 2>/dev/null | sed 's/\\"/"/g')
has "T2 RTL" "$R" '"dir":"rtl"'
has "T2 EGP arabic suffix" "$R" '"gem":true'
# back to EN
$EB eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='Switch to English');b?.click();return 'ok'})()" > /dev/null 2>&1
sleep 1

# ── T3 product page: no heart, sizes, EGP ──
$EB eval "(()=>{document.querySelector('article[data-card]').click();return 'opened'})()" > /dev/null 2>&1
sleep 2
R=$($EB eval "(()=>{return JSON.stringify({back:!!document.querySelector('[aria-label=\"Back\"]'),heart:!!document.querySelector('[data-pd-heart]'),sizes:document.querySelectorAll('button[aria-pressed]').length>0,egp:document.body.innerText.includes('EGP')})})()" 2>/dev/null | sed 's/\\"/"/g')
has "T3 product back btn" "$R" '"back":true'
has "T3 product heart gone" "$R" '"heart":false'
has "T3 sizes render" "$R" '"sizes":true'
has "T3 product EGP" "$R" '"egp":true'
$EB screenshot qa/12-product.png > /dev/null 2>&1

# ── T4 add to cart → checkout → COD + EGP success ──
$EB eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('Add to Cart'));b?.click();return b?'added':'nobtn'})()" > /dev/null 2>&1
sleep 1.5
$EB eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('View Cart'));b?.click();return 'viewcart'})()" > /dev/null 2>&1
sleep 1.5
R=$($EB eval "(()=>{return JSON.stringify({cartEgp:document.body.innerText.includes('EGP'),noHeart:!document.querySelector('[data-save-later]')})})()" 2>/dev/null | sed 's/\\"/"/g')
has "T4 cart EGP" "$R" '"cartEgp":true'
has "T4 save-for-later gone" "$R" '"noHeart":true'
$EB eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('Proceed to Checkout'));b?.click();return 'co'})()" > /dev/null 2>&1
sleep 1.5
$EB fill 'input[placeholder="Layla Hassan"]' 'QA Tester' > /dev/null 2>&1
$EB fill 'input[type="tel"]' '01011122233' > /dev/null 2>&1
$EB fill 'input[placeholder="Cairo"]' 'Cairo' > /dev/null 2>&1
$EB fill 'input[placeholder="Street, building, apartment"]' '12 QA Street, Maadi' > /dev/null 2>&1
R=$($EB eval "(()=>{return JSON.stringify({cod:document.body.innerText.includes('Cash on delivery'),cashNote:document.body.innerText.includes('Pay in cash')})})()" 2>/dev/null | sed 's/\\"/"/g')
has "T4 COD block" "$R" '"cod":true'
has "T4 COD cash note" "$R" '"cashNote":true'
$EB eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('Place Order'));b?.click();return 'placed'})()" > /dev/null 2>&1
sleep 3
# The WhatsApp popup steals tab focus (harness lesson) — return to the app tab.
$EB tab t1 > /dev/null 2>&1
sleep 1
R=$($EB eval "(()=>{const m=document.body.innerText.match(/SADN-\d{6}/);return JSON.stringify({success:document.body.innerText.includes('Order placed'),cod:document.body.innerText.includes('cash on delivery'),wa:document.body.innerText.includes('Send order on WhatsApp'),num:m?m[0]:null})})()" 2>/dev/null | sed 's/\\"/"/g')
has "T4 success view" "$R" '"success":true'
has "T4 success COD suffix" "$R" '"cod":true'
has "T4 WhatsApp button" "$R" '"wa":true'
ORDER_NUM=$(echo "$R" | rg -o 'SADN-[0-9]{6}' | head -1)
$EB screenshot qa/12-checkout-success.png > /dev/null 2>&1

# ── T5 /admin URL redirect ──
$EB open http://localhost:3000/admin > /dev/null 2>&1
sleep 2
R=$($EB eval "(()=>{return JSON.stringify({hash:location.hash,login:document.body.innerText.includes('Owner access')})})()" 2>/dev/null | sed 's/\\"/"/g')
has "T5 /admin → #/admin" "$R" '"hash":"#/admin"'

# ── T6 admin login → orders → manual registration ──
$EB open "http://localhost:3000/#/admin" > /dev/null 2>&1
sleep 2
$EB fill 'input[type="password"]' 'sadn-admin' > /dev/null 2>&1
$EB eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.toLowerCase().includes('sign in'));b?.click();return 'login'})()" > /dev/null 2>&1
sleep 2.5
$EB eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim().startsWith('Orders'));b?.click();return 'tab'})()" > /dev/null 2>&1
sleep 1
R=$($EB eval "(()=>{return JSON.stringify({regBtn:!!document.querySelector('[data-register-order]')})})()" 2>/dev/null | sed 's/\\"/"/g')
has "T6 register button visible" "$R" '"regBtn":true'
$EB eval "(()=>{document.querySelector('[data-register-order]')?.click();return 'open'})()" > /dev/null 2>&1
sleep 1.5
$EB fill 'input[placeholder="Customer name"]' 'Manual QA Order' > /dev/null 2>&1
$EB fill 'input[placeholder="Phone"]' '01099988877' > /dev/null 2>&1
$EB fill 'input[placeholder="City"]' 'Giza' > /dev/null 2>&1
$EB fill 'input[placeholder="Full address"]' '9 Manual Street, Dokki' > /dev/null 2>&1
$EB eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('Add item'));b?.click();return 'addline'})()" > /dev/null 2>&1
sleep 0.5
R=$($EB eval "(()=>{return JSON.stringify({lines:document.body.innerText.includes('EGP 1,450'),sheet:document.body.innerText.includes('Register an order')})})()" 2>/dev/null | sed 's/\\"/"/g')
has "T6 line added (EGP 1,450)" "$R" '"lines":true'
$EB screenshot qa/12-manual-sheet.png > /dev/null 2>&1
$EB eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('Register order')&&!x.closest('[data-register-order]'));b?.click();return 'submit'})()" > /dev/null 2>&1
sleep 2.5
R=$($EB eval "(()=>{const m=document.body.innerText.match(/SADN-\d{6}/);return JSON.stringify({manual:document.body.innerText.includes('MANUAL')||document.body.innerText.includes('Manual'),num:m?m[0]:null})})()" 2>/dev/null | sed 's/\\"/"/g')
has "T6 manual order created + badge" "$R" '"manual":true'
MANUAL_NUM=$(echo "$R" | rg -o 'SADN-[0-9]{6}' | head -1)
$EB screenshot qa/12-admin-orders.png > /dev/null 2>&1

# ── T7 live product-page sync (dashboard → open product sheet) ──
PID=$(curl -s -b /tmp/cj12.txt -c /tmp/cj12.txt -X POST http://localhost:3000/api/admin/login -H 'Content-Type: application/json' -d '{"password":"sadn-admin"}' > /dev/null; curl -s -b /tmp/cj12.txt "http://localhost:3000/api/admin/products?limit=50" | python3 -c "import json,sys;print([p['id'] for p in json.load(sys.stdin)['products'] if p['slug']=='abaya-noir-flow'][0])")
curl -s -b /tmp/cj12.txt -X PATCH "http://localhost:3000/api/admin/products/$PID" -H 'Content-Type: application/json' -d '{"price":1999}' > /dev/null
$EB open "http://localhost:3000/?p=abaya-noir-flow" > /dev/null 2>&1
sleep 3
R1=$($EB eval "(()=>{return document.body.innerText.includes('EGP 1,450')?'old':'new'})()" 2>/dev/null)
$EB eval "(()=>{window.dispatchEvent(new Event('sadn:catalog-changed'));return 'dispatched'})()" > /dev/null 2>&1
sleep 2.5
R=$($EB eval "(()=>{return JSON.stringify({now1999:document.body.innerText.includes('EGP 1,999'),sheet:!!document.querySelector('[aria-label=\"Back\"]')})})()" 2>/dev/null | sed 's/\\"/"/g')
has "T7 live sync to open product page" "$R" '"now1999":true'
curl -s -b /tmp/cj12.txt -X PATCH "http://localhost:3000/api/admin/products/$PID" -H 'Content-Type: application/json' -d '{"price":1450}' > /dev/null
$EB eval "(()=>{window.dispatchEvent(new Event('sadn:catalog-changed'));return 'reverted'})()" > /dev/null 2>&1

$EB screenshot qa/12-home-final.png > /dev/null 2>&1

# ── cleanup ──
for n in "$ORDER_NUM" "$MANUAL_NUM"; do
  [ -n "$n" ] && curl -s -b /tmp/cj12.txt "http://localhost:3000/api/admin/orders?q=$n" | python3 -c "import json,sys;print(json.load(sys.stdin)['orders'][0]['id'])" 2>/dev/null | while read id; do
    curl -s -b /tmp/cj12.txt -X DELETE "http://localhost:3000/api/admin/orders/$id" > /dev/null
  done
done
$EB eval "(()=>{localStorage.clear();return 'clean'})()" > /dev/null 2>&1
$EB close --all > /dev/null 2>&1

echo "=================="
echo "FRONTEND PASS=$PASS FAIL=$FAIL"
tail -20 dev.log | rg -i "error|unhandled" | rg -v "prisma:query" | head -5
echo "devlog-checked"
