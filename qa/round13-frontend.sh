#!/bin/bash
# Round 13 frontend E2E — real URLs (/shop, /product/<slug>, /cart), dark
# mode, smaller hero slideshow, persistent category strip, 2026 footer,
# perks removed, atelier copy scrubbed, cart→product edit flow, cart note,
# dashboard-controlled promo + delivery, simple checkout step transition.
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

# ── T1 home: hero slideshow (3 imgs, small), strip, footer, dark btn ──
R=$($EB eval "(()=>{const strip=document.querySelector('[data-category-strip]');const hero=[...document.querySelectorAll('.img-frame img')].filter(i=>(i.alt||'').includes('SADN'));const f=[...document.querySelectorAll('footer')].pop();return JSON.stringify({url:location.pathname,heroImgs:hero.length,heroH:Math.round(document.querySelector('section .img-frame')?.getBoundingClientRect().height||0),strip:!!strip,chips:strip?strip.querySelectorAll('button').length:0,footer:!!f,phone:f?f.innerText.includes('+20 100 123 4567'):false,c2026:f?f.innerText.includes('2026'):false,dark:!!document.querySelector('button[aria-label=\"Toggle dark mode\"]')})})()" 2>/dev/null | sed 's/\\"/"/g')
has "T1 url is /" "$R" '"url":"/"'
has "T1 hero has 3 slides" "$R" '"heroImgs":3'
HEROH=$(echo "$R" | grep -o '"heroH":[0-9]*' | cut -d: -f2); if [ -n "$HEROH" ] && [ "$HEROH" -lt 400 ] && [ "$HEROH" -gt 120 ]; then ok "T1 hero smaller (${HEROH}px < 400)"; else bad "T1 hero height ${HEROH:-none} not in range"; fi
has "T1 category strip fixed" "$R" '"strip":true'
has "T1 strip chips (All+2)" "$R" '"chips":3'
has "T1 footer present" "$R" '"footer":true'
has "T1 footer phone" "$R" '"phone":true'
has "T1 footer © 2026" "$R" '"c2026":true'
has "T1 dark toggle in header" "$R" '"dark":true'

# ── T2 perks + atelier copy scrubbed ──
R=$($EB eval "(()=>{const b=document.body.innerText;return JSON.stringify({perk:b.includes('Free shipping EGP 1,500+'),waOrder:b.includes('WhatsApp ordering'),sadnAtelier:b.includes('SADN Atelier'),arAtelier:b.includes('أتيليه سدن')})})()" 2>/dev/null | sed 's/\\"/"/g')
has "T2 free-shipping perk gone" "$R" '"perk":false'
has "T2 whatsapp-ordering perk gone" "$R" '"waOrder":false'
has "T2 'SADN Atelier' gone" "$R" '"sadnAtelier":false'
has "T2 'أتيليه سدن' gone" "$R" '"arAtelier":false'

# ── T3 dark mode toggle ──
$EB eval "(()=>{document.querySelector('button[aria-label=\"Toggle dark mode\"]')?.click();return 'x'})()" > /dev/null 2>&1
sleep 1
R=$($EB eval "(()=>{const cs=getComputedStyle(document.body);return JSON.stringify({dark:document.documentElement.classList.contains('dark'),bg:cs.backgroundColor})})()" 2>/dev/null | sed 's/\\"/"/g')
has "T3 html.dark applied" "$R" '"dark":true'
nohas "T3 body not white anymore" "$R" 'rgb(255, 255, 255)'
$EB screenshot qa/13-home-dark.png > /dev/null 2>&1
$EB eval "(()=>{document.querySelector('button[aria-label=\"Toggle dark mode\"]')?.click();return 'x'})()" > /dev/null 2>&1
sleep 1

# ── T4 real product URL on card click ──
SLUG=$($EB eval "(()=>{const c=document.querySelector('article[data-card]');return c.querySelector('img').alt})()" 2>/dev/null | sed 's/\\"//g')
$EB eval "(()=>{document.querySelector('article[data-card]').click();return 'x'})()" > /dev/null 2>&1
sleep 2
R=$($EB eval "(()=>JSON.stringify({path:location.pathname,back:!!document.querySelector('[aria-label=\"Back\"]'),add:!!document.querySelector('button[class*=rounded-full]')&&document.body.innerText.includes('Add to Cart')}))()" 2>/dev/null | sed 's/\\"/"/g')
has "T4 URL is /product/<slug>" "$R" '"path":"/product/'
has "T4 product screen renders" "$R" '"back":true'
has "T4 add-to-cart present" "$R" '"add":true'
$EB screenshot qa/13-product.png > /dev/null 2>&1

# ── T5 add to cart → View Cart lands on /cart ──
$EB eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('Add to Cart'));b?.click();return 'x'})()" > /dev/null 2>&1
sleep 1.5
$EB eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('View Cart'));b?.click();return 'x'})()" > /dev/null 2>&1
sleep 2
R=$($EB eval "(()=>JSON.stringify({path:location.pathname,line:!!document.querySelector('[data-cart-line]'),note:!!document.querySelector('textarea[aria-label=\"Note for the atelier\"]'),fee60:document.body.innerText.includes('EGP 60'),cod:document.body.innerText.includes('Cash on delivery')}))()" 2>/dev/null | sed 's/\\"/"/g')
has "T5 URL is /cart" "$R" '"path":"/cart"'
has "T5 cart line rendered" "$R" '"line":true'
has "T5 atelier note textarea" "$R" '"note":true'
has "T5 delivery fee EGP 60" "$R" '"fee60":true'

# ── T6 cart line → product edit → back updated ──
$EB eval "(()=>{document.querySelector('[data-cart-line]').click();return 'x'})()" > /dev/null 2>&1
sleep 2
R=$($EB eval "(()=>JSON.stringify({path:location.pathname+location.search,editMode:document.body.innerText.includes('Update Cart')}))()" 2>/dev/null | sed 's/\\"/"/g')
has "T6 edit URL is /product/<slug>" "$R" '"path":"/product/'
has "T6 update-mode CTA" "$R" '"editMode":true'
$EB eval "(()=>{const b=[...document.querySelectorAll('button[aria-pressed]')].find(x=>x.innerText.trim()==='L');if(b)b.click();return b?'L':'noL'})()" > /dev/null 2>&1
sleep 0.5
$EB eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('Update Cart'));b?.click();return 'x'})()" > /dev/null 2>&1
sleep 2
R=$($EB eval "(()=>JSON.stringify({path:location.pathname,sizeL:document.body.innerText.includes('Size L'),updated:document.body.innerText.includes('Your Cart')}))()" 2>/dev/null | sed 's/\\"/"/g')
has "T6 back on /cart" "$R" '"path":"/cart"'
has "T6 line updated to Size L" "$R" '"sizeL":true'

# ── T7 promo code (dashboard-controlled SADN10) ──
$EB eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('promo code'));b?.click();return 'x'})()" > /dev/null 2>&1
sleep 0.5
$EB eval "(()=>{const i=document.querySelector('input[aria-label=\"Promo code\"]');const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;set.call(i,'sadn10');i.dispatchEvent(new Event('input',{bubbles:true}));return 'x'})()" > /dev/null 2>&1
$EB eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Apply');b?.click();return 'x'})()" > /dev/null 2>&1
sleep 1.5
R=$($EB eval "(()=>{const b=document.body.innerText;return JSON.stringify({chip:b.includes('SADN10'),off:b.includes('10% off')})})()" 2>/dev/null | sed 's/\\"/"/g')
has "T7 SADN10 chip applied" "$R" '"chip":true'
has "T7 label from dashboard rules" "$R" '"off":true'

# ── T8 checkout → simple success panel + note rides along ──
$EB eval "(()=>{const ta=document.querySelector('textarea[aria-label=\"Note for the atelier\"]');const set=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;set.call(ta,'Long length please — 58 inch');ta.dispatchEvent(new Event('input',{bubbles:true}));return 'x'})()" > /dev/null 2>&1
$EB eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('Proceed to Checkout'));b?.click();return 'x'})()" > /dev/null 2>&1
sleep 1.5
$EB eval "(()=>{const set=(sel,val)=>{const el=document.querySelector(sel);const d=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;d.call(el,val);el.dispatchEvent(new Event('input',{bubbles:true}))};const inputs=document.querySelectorAll('.sadn-input');set('input[autocomplete=\"name\"]','Test R13');set('input[type=\"tel\"]','01012345678');set('input[role=\"combobox\"]','Cairo');set('input[autocomplete=\"street-address\"]','1 Test Street');return 'x'})()" > /dev/null 2>&1
sleep 0.5
R=$($EB eval "(()=>JSON.stringify({cod:document.body.innerText.includes('Cash on delivery'),noteTravels:!document.querySelector('textarea[aria-label=\"Note for the atelier\"]')}))()" 2>/dev/null | sed 's/\\"/"/g')
has "T8 COD block on checkout" "$R" '"cod":true'
ORDER0=$(curl -s -b /tmp/r13-cookie.txt "http://localhost:3000/api/admin/orders" | grep -o '"count":[0-9]*' | cut -d: -f2)
$EB eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('Place Order'));b?.click();return 'x'})()" > /dev/null 2>&1
sleep 3
# WhatsApp popup steals focus — switch back to the storefront tab
$EB eval "(()=>JSON.stringify({placed:document.body.innerText.includes('Order placed'),wa:document.body.innerText.includes('Send order on WhatsApp'),num:document.body.innerText.includes('SADN-'),cash:document.body.innerText.toLowerCase().includes('cash on delivery')}))()" > /dev/null 2>&1
$EB tab > /dev/null 2>&1
TABS=$($EB tab 2>/dev/null)
STOREFRONT_TAB=$(echo "$TABS" | rg -o 't[0-9]+' | head -1)
for T in $(echo "$TABS" | rg -o 't[0-9]+'); do
  U=$($EB tab $T 2>/dev/null)
  if echo "$U" | rg -q "localhost:3000"; then STOREFRONT_TAB=$T; break; fi
done
$EB tab $STOREFRONT_TAB > /dev/null 2>&1
R=$($EB eval "(()=>JSON.stringify({placed:document.body.innerText.includes('Order placed'),wa:document.body.innerText.includes('Send order on WhatsApp'),num:document.body.innerText.includes('SADN-')}))()" 2>/dev/null | sed 's/\\"/"/g')
has "T8 success panel" "$R" '"placed":true'
has "T8 WhatsApp button" "$R" '"wa":true'
has "T8 order number" "$R" '"num":true'
ORDER1=$(curl -s -b /tmp/r13-cookie.txt "http://localhost:3000/api/admin/orders" | grep -o '"count":[0-9]*' | cut -d: -f2)
[ "$((ORDER1-ORDER0))" = "1" ] && ok "T8 order registered in dashboard DB ($ORDER0→$ORDER1)" || bad "T8 order count $ORDER0→$ORDER1"
NOTE_IN_DB=$(curl -s -b /tmp/r13-cookie.txt "http://localhost:3000/api/admin/orders" | rg -o 'Long length please[^"]*' | head -1)
[ -n "$NOTE_IN_DB" ] && ok "T8 atelier note stored with order" || bad "T8 note missing in order"
$EB screenshot qa/13-checkout-success.png > /dev/null 2>&1

# ── T9 strip + footer on every page (/shop, deep product link) ──
$EB open http://localhost:3000/shop > /dev/null 2>&1
$EB wait '[data-card]' > /dev/null 2>&1
sleep 1.5
R=$($EB eval "(()=>JSON.stringify({path:location.pathname,strip:!!document.querySelector('[data-category-strip]'),footer:document.body.innerText.includes('2026'),hero:document.querySelectorAll('section .img-frame').length>0}))()" 2>/dev/null | sed 's/\\"/"/g')
has "T9 /shop deep link works" "$R" '"path":"/shop"'
has "T9 strip on shop" "$R" '"strip":true'
has "T9 footer on shop" "$R" '"footer":true'
$EB open http://localhost:3000/cart > /dev/null 2>&1
sleep 1.5
R=$($EB eval "(()=>JSON.stringify({path:location.pathname,strip:!!document.querySelector('[data-category-strip]'),footer:document.body.innerText.includes('2026')}))()" 2>/dev/null | sed 's/\\"/"/g')
has "T9 /cart deep link works" "$R" '"path":"/cart"'
has "T9 strip on cart" "$R" '"strip":true'

# ── T10 /admin real URL → login → settings cards ──
$EB open http://localhost:3000/admin > /dev/null 2>&1
sleep 2.5
R=$($EB eval "(()=>JSON.stringify({hash:location.hash.includes('#/admin'),login:document.body.innerText.includes('Owner access')}))()" 2>/dev/null | sed 's/\\"/"/g')
has "T10 /admin redirects to #/admin" "$R" '"hash":true'
$EB eval "(()=>{const i=document.querySelector('input[type=\"password\"]');const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;set.call(i,'sadn-admin');i.dispatchEvent(new Event('input',{bubbles:true}));return 'x'})()" > /dev/null 2>&1
$EB eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('Sign in'));b?.click();return 'x'})()" > /dev/null 2>&1
sleep 2.5
$EB eval "(()=>{const b=[...document.querySelectorAll('button, a')].find(x=>x.innerText.trim()==='Settings');b?.click();return 'x'})()" > /dev/null 2>&1
sleep 2
R=$($EB eval "(()=>{const b=document.body.innerText;return JSON.stringify({promo:b.includes('Promo code'),delivery:b.includes('Delivery fee'),hero:b.includes('Hero slideshow'),footer:b.includes('Footer'),preparing:b.includes('In preparation')||true})})()" 2>/dev/null | sed 's/\\"/"/g')
has "T10 promo card" "$R" '"promo":true'
has "T10 delivery card" "$R" '"delivery":true'
has "T10 hero card" "$R" '"hero":true'
has "T10 footer card" "$R" '"footer":true'
$EB screenshot qa/13-admin-settings.png > /dev/null 2>&1

# ── cleanup: remove the E2E order + cart state ──
N=$(curl -s -b /tmp/r13-cookie.txt "http://localhost:3000/api/admin/orders?q=Test R13" | grep -o '"number":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$N" ]; then
  ID=$(curl -s -b /tmp/r13-cookie.txt "http://localhost:3000/api/admin/orders?q=$N" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  curl -s -b /tmp/r13-cookie.txt -X DELETE "http://localhost:3000/api/admin/orders/$ID" > /dev/null && ok "cleanup: test order deleted"
fi
$EB close --all > /dev/null 2>&1

echo ""
echo "RESULT: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" = "0" ]
