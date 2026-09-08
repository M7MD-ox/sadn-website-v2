#!/bin/bash
# SADN round 11 frontend E2E — banner, reviews wall, abaya catalog,
# track-order removal, WhatsApp checkout, dashboard⇄storefront sync.
# Single-call pattern: restart server → poll → browser pass (sandbox reaper).
cd /home/z/my-project
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "  ✓ $1"; }
bad() { FAIL=$((FAIL+1)); echo "  ✗ $1"; }
ab() { agent-browser "$@"; }

echo "── boot ──"
pkill -f "next dev" 2>/dev/null; pkill -f "next-server" 2>/dev/null; sleep 2
setsid nohup bun run dev > /dev/null 2>&1 &
for i in $(seq 1 60); do
  sleep 2
  code=$(curl -s -o /dev/null -w "%{http_code}" -m 3 http://localhost:3000/api/reviews 2>/dev/null)
  [ "$code" = "200" ] && { echo "server up (${i}x2s)"; break; }
done
ab close --all > /dev/null 2>&1

# Harness lesson (r11): after close --all the next open relaunches the
# browser — WAIT for real app content before touching localStorage, and
# always verify the seed read back.
seed_cart() {
  ab open http://localhost:3000/ > /dev/null
  ab wait '[aria-label="Announcement"]' > /dev/null 2>&1
  SEEDCHK=$(ab eval '(() => { localStorage.setItem("sadn-store-v1", JSON.stringify({ state: { cart: [{ slug: "abaya-noir-flow", name: "Noir Flow Abaya", nameAr: "عباية نوار المنسدلة", image: "/products/abaya-noir-flow.png", price: 148, size: "M", color: "Noir", qty: 1 }], wishlist: [], recent: [], searches: [], lang: "en", promo: null }, version: 0 })); const c = JSON.parse(localStorage.getItem("sadn-store-v1")); return "seeded-" + c.state.cart.length; })()' 2>/dev/null)
  echo "$SEEDCHK" | grep -q "seeded-1" && ok "cart seeded (verified readback)" || bad "seed failed: $SEEDCHK"
}

echo "── 1 · Storefront: banner + hero + reviews ──"
ab set viewport 430 900 > /dev/null
ab open http://localhost:3000/ > /dev/null
ab wait '[aria-label="Announcement"]' > /dev/null 2>&1
BANNER=$(ab eval '(() => { const el = document.querySelector("[aria-label=\"Announcement\"]"); return el ? el.innerText.replace(/\n/g," ") : "NO BANNER"; })()' 2>/dev/null)
echo "$BANNER" | grep -q "10% OFF your first order" && ok "banner above header with SADN10 text" || bad "banner text: $BANNER"
TOPBAR_Y=$(ab eval '(() => { const b = document.querySelector("[aria-label=\"Announcement\"]"); const h = document.querySelector("header"); return (b && h) ? (b.getBoundingClientRect().bottom <= h.getBoundingClientRect().top + 1) : "n/a"; })()' 2>/dev/null)
echo "$TOPBAR_Y" | grep -q "true" && ok "banner sits ABOVE the header" || bad "banner position: $TOPBAR_Y"
ab wait 'img[src*="hero-abaya"]' > /dev/null 2>&1
HERO=$(ab eval '(() => { const i = document.querySelector("img[src*=\"hero-abaya\"]"); return i ? "hero-ok" : "no-hero"; })()' 2>/dev/null)
echo "$HERO" | grep -q "hero-ok" && ok "new abaya hero renders" || bad "hero: $HERO"
ab screenshot qa/11-home-en.png > /dev/null

echo "── 2 · Shop: 8 abaya cards + section chips ──"
ab eval '(() => { const b = [...document.querySelectorAll("button")].find(x => x.textContent.trim() === "Shop"); if (b) b.click(); return b ? "clicked" : "no-nav"; })()' > /dev/null 2>&1
sleep 1
N=$(ab get count '[aria-label^="Add"]:not([aria-label="Add to wishlist"])' 2>/dev/null)
echo "$N" | grep -qE '^"?8"?$' && ok "shop shows 8 abaya cards" || bad "shop cards: $N"
CHIPS=$(ab eval '(() => { const chips = [...document.querySelectorAll("button")].map(b => b.textContent.trim()); return ["All","Everyday","Occasion"].every(c => chips.includes(c)) ? "chips-ok" : chips.join("|"); })()' 2>/dev/null)
echo "$CHIPS" | grep -q "chips-ok" && ok "DB-driven chips: All/Everyday/Occasion" || bad "chips: $CHIPS"

echo "── 3 · Reviews wall ──"
ab eval '(() => { const b = [...document.querySelectorAll("button")].find(x => x.textContent.trim() === "Home"); if (b) b.click(); return "ok"; })()' > /dev/null 2>&1
sleep 1
ab eval '(() => { const h = [...document.querySelectorAll("h2")].find(x => x.textContent.includes("Loved")); if (h) h.scrollIntoView({block:"start"}); return h ? h.textContent : "none"; })()' > /dev/null 2>&1
sleep 1
FIGS=$(ab get count 'figure' 2>/dev/null)
echo "$FIGS" | grep -qE '^"?4"?$' && ok "4 review cards (16:9 chat screenshots)" || bad "figures: $FIGS"
RATIO=$(ab eval '(() => { const f = document.querySelector("figure span"); return f ? Math.round((f.getBoundingClientRect().width / f.getBoundingClientRect().height) * 100) / 100 : 0; })()' 2>/dev/null)
echo "$RATIO" | grep -q "1.7\|1.78" && ok "cards are ~16:9 ($RATIO)" || bad "ratio: $RATIO"
ab screenshot qa/11-reviews.png > /dev/null

echo "── 4 · RTL banner + reviews ──"
ab eval '(() => { const b = [...document.querySelectorAll("button")].find(x => x.getAttribute("aria-label") === "التبديل إلى العربية"); if (b) b.click(); return "ok"; })()' > /dev/null 2>&1
sleep 1.5
ARBANNER=$(ab eval '(() => { const el = document.querySelector("[aria-label=\"إعلان\"]"); return el ? el.innerText.replace(/\n/g," ") : "NO"; })()' 2>/dev/null)
echo "$ARBANNER" | grep -q "خصم" && ok "AR banner shows خصم ١٠٪ text" || bad "AR banner: $ARBANNER"
DIR=$(ab eval 'document.documentElement.dir' 2>/dev/null)
echo "$DIR" | grep -q "rtl" && ok "document flips to RTL" || bad "dir: $DIR"
ab screenshot qa/11-home-ar.png > /dev/null
ab eval '(() => { const b = [...document.querySelectorAll("button")].find(x => x.getAttribute("aria-label") === "Switch to English"); if (b) b.click(); return "ok"; })()' > /dev/null 2>&1
sleep 1

echo "── 5 · Checkout → WhatsApp success, NO tracking ──"
seed_cart
ab reload > /dev/null
sleep 2
ab eval '(() => { const b = [...document.querySelectorAll("nav[aria-label=\"Primary\"] button")].find(x => x.textContent.includes("Cart")); if (b) b.click(); return b ? "ok" : "NO-NAV"; })()' > /dev/null 2>&1
sleep 1
HAS_TRACK=$(ab eval '(() => document.body.innerText.includes("Track an order") || document.body.innerText.includes("Track order") ? "TRACK-FOUND" : "clean")()' 2>/dev/null)
echo "$HAS_TRACK" | grep -q "clean" && ok "cart screen has NO tracking UI" || bad "cart: $HAS_TRACK"
ab eval '(() => { const b = [...document.querySelectorAll("button")].find(x => x.textContent.includes("Proceed to Checkout")); if (b) b.click(); return "ok"; })()' > /dev/null 2>&1
sleep 1.5
ab type 'input[placeholder="Layla Hassan"]' "Test Customer" > /dev/null 2>&1
ab type 'input[placeholder="+20 10 1234 5678"]' "01012345678" > /dev/null 2>&1
ab type 'input[placeholder="Cairo"]' "Cairo" > /dev/null 2>&1
ab type 'input[placeholder="Street, building, apartment"]' "90th Street, Building 12, Apt 3" > /dev/null 2>&1
ab eval '(() => { const b = [...document.querySelectorAll("button")].find(x => x.textContent.includes("Place Order")); if (b) b.click(); return b ? "placing" : "no-btn"; })()' > /dev/null 2>&1
sleep 4
ab tab close > /dev/null 2>&1  # popup (wa.me) steals focus — close it
sleep 1
SUCCESS=$(ab eval '(() => JSON.stringify({ placed: document.body.innerText.includes("Order placed"), wa: document.body.innerText.includes("Send order on WhatsApp"), track: document.body.innerText.includes("Track this order"), num: (document.body.innerText.match(/SADN-\d{6}/) || ["none"])[0] }))()' 2>/dev/null)
SUCCESS=$(echo "$SUCCESS" | sed 's/\\"/"/g')  # lesson ④: unescape double-JSON encoding
echo "$SUCCESS" | grep -q '"placed":true' && ok "order success view" || bad "success: $SUCCESS"
echo "$SUCCESS" | grep -q '"wa":true' && ok "green WhatsApp hand-off button" || bad "no WA button"
echo "$SUCCESS" | grep -q '"track":false' && ok "track CTA removed from success view" || bad "track CTA still present"
ORDER_NUM=$(echo "$SUCCESS" | sed -n 's/.*"num":"\(SADN-[0-9]*\)".*/\1/p')
ab screenshot qa/11-checkout-success.png > /dev/null

echo "── 6 · Dashboard ⇄ storefront sync: banner text ──"
ab open "http://localhost:3000/#/admin" > /dev/null
sleep 2
ab type 'input[type="password"]' "sadn-admin" > /dev/null 2>&1
ab eval '(() => { const b = [...document.querySelectorAll("button")].find(x => x.textContent.trim() === "Sign in"); if (b) b.click(); return "ok"; })()' > /dev/null 2>&1
sleep 2.5
ab eval '(() => { const b = [...document.querySelectorAll("button")].find(x => x.textContent.trim() === "Settings"); if (b) b.click(); return "ok"; })()' > /dev/null 2>&1
sleep 1.5
ab fill 'input[placeholder="10% OFF your first order · code SADN10"]' "TEST 10% OFF FIRST ORDER" > /dev/null 2>&1
ab eval '(() => { const s = [...document.querySelectorAll("section")].find(x => x.textContent.includes("Announcement banner")); const b = s && [...s.querySelectorAll("button")].find(x => x.textContent.trim() === "Save"); if (b) b.click(); return b ? "saved" : "no-save-btn"; })()' > /dev/null 2>&1
sleep 2
ab open http://localhost:3000/ > /dev/null
sleep 2
NEWBANNER=$(ab eval '(() => { const el = document.querySelector("[aria-label=\"Announcement\"]"); return el ? el.innerText.replace(/\n/g," ") : "NO BANNER"; })()' 2>/dev/null)
echo "$NEWBANNER" | grep -q "TEST 10% OFF FIRST ORDER" && ok "dashboard text change → storefront banner syncs" || bad "sync: $NEWBANNER"
# restore default banner text via API
curl -s -c /tmp/r11-fa.txt -X POST http://localhost:3000/api/admin/login -H 'Content-Type: application/json' -d '{"password":"sadn-admin"}' > /dev/null
curl -s -b /tmp/r11-fa.txt -X PUT http://localhost:3000/api/admin/settings -H 'Content-Type: application/json' -d '{"bannerTextEn":"10% OFF your first order · code SADN10","bannerTextAr":"خصم ١٠٪ على أول طلب · كود SADN10"}' > /dev/null

echo "── 7 · Dashboard reviews tab ⇄ storefront wall ──"
ab open "http://localhost:3000/#/admin" > /dev/null
sleep 2
ab eval '(() => { const b = [...document.querySelectorAll("button")].find(x => x.textContent.trim() === "Reviews"); if (b) b.click(); return "ok"; })()' > /dev/null 2>&1
sleep 1.5
SWITCHES=$(ab get count '[role="switch"]' 2>/dev/null)
echo "$SWITCHES" | grep -qE '^"?4"?$' && ok "reviews tab lists 4 cards with switches" || bad "switches: $SWITCHES"
ab screenshot qa/11-admin-reviews.png > /dev/null
ab eval '(() => { const s = document.querySelector("[role=\"switch\"]"); if (s) s.click(); return "ok"; })()' > /dev/null 2>&1
sleep 2
ab open http://localhost:3000/ > /dev/null
sleep 2
FIGS2=$(ab get count 'figure' 2>/dev/null)
echo "$FIGS2" | grep -qE '^"?3"?$' && ok "hidden review card drops off storefront wall" || bad "figures after hide: $FIGS2"
ab open "http://localhost:3000/#/admin" > /dev/null
sleep 2
ab eval '(() => { const b = [...document.querySelectorAll("button")].find(x => x.textContent.trim() === "Reviews"); if (b) b.click(); return "ok"; })()' > /dev/null 2>&1
sleep 1.5
ab eval '(() => { const s = document.querySelector("[role=\"switch\"]"); if (s) s.click(); return "ok"; })()' > /dev/null 2>&1
sleep 2
ab open http://localhost:3000/ > /dev/null
sleep 2
FIGS3=$(ab get count 'figure' 2>/dev/null)
echo "$FIGS3" | grep -qE '^"?4"?$' && ok "re-enabled card returns to the wall" || bad "figures after restore: $FIGS3"

echo "── 8 · Cleanup + health ──"
rm -f /tmp/r11-fb.txt
curl -s -c /tmp/r11-fb.txt -X POST http://localhost:3000/api/admin/login -H 'Content-Type: application/json' -d '{"password":"sadn-admin"}' > /dev/null
# Purge EVERY leftover E2E order (customer name "Test Customer") by public number
python3 - << 'PYEOF'
import json, subprocess
jar = '/tmp/r11-fb.txt'
base = 'http://localhost:3000'
out = subprocess.run(['curl', '-s', '-b', jar, f'{base}/api/admin/orders'], capture_output=True, text=True).stdout
data = json.loads(out)
for o in data.get('orders', []):
    if o.get('customerName') == 'Test Customer':
        r = subprocess.run(['curl', '-s', '-b', jar, '-X', 'DELETE', f'{base}/api/admin/orders/{o["number"]}'], capture_output=True, text=True).stdout
        print(f'  cleanup {o["number"]}: {r.strip()[:30]}')
PYEOF
# clear test localStorage
ab eval '(() => { localStorage.removeItem("sadn-store-v1"); return "clean"; })()' > /dev/null 2>&1
ERRORS=$(grep -cE "Runtime Error|Unhandled|error" dev.log 2>/dev/null | head -1)
echo "  (dev.log error-ish lines: $ERRORS — reviewed below if > 0)"

echo ""
echo "════════════════════════════════"
echo "FRONTEND RESULT: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] && echo "ALL GREEN ✅" || echo "FAILURES ❌"
