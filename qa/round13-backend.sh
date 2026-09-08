#!/usr/bin/env bash
# Round 13 backend suite — dashboard-controlled promo/delivery/hero/footer,
# cart note in the WhatsApp order, manual order register, upload route,
# status rename, real URLs.
set -u
BASE="http://localhost:3000"
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "  ✓ $1"; }
bad() { FAIL=$((FAIL+1)); echo "  ✗ $1"; }
check() { # $1 desc, $2 hay, $3 needle
  if echo "$2" | grep -q "$3"; then ok "$1"; else bad "$1 — missing: $3"; fi
}

echo "── T1 public storefront config ──"
SF=$(curl -s "$BASE/api/storefront")
check "promo enabled SADN10" "$SF" '"enabled":true'
check "promo code"           "$SF" '"SADN10"'
check "shipping fee 60"      "$SF" '"shippingFee":60'
check "3 hero images"        "$SF" 'hero-fabric-drape'
check "footer phone"         "$SF" '+20 100 123 4567'

echo "── T2 admin auth ──"
C1=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE/api/admin/settings" -H 'Content-Type: application/json' -d '{"shippingFee":75}')
[ "$C1" = "401" ] && ok "PUT settings without auth → 401" || bad "expected 401 got $C1"
LOGIN=$(curl -s -c /tmp/r13-cookie.txt -X POST "$BASE/api/admin/login" -H 'Content-Type: application/json' -d '{"password":"sadn-admin"}')
check "login ok" "$LOGIN" '"ok":true'

echo "── T3 delivery fee → order math ──"
curl -s -b /tmp/r13-cookie.txt -X PUT "$BASE/api/admin/settings" -H 'Content-Type: application/json' -d '{"shippingFee":75}' > /dev/null
SF2=$(curl -s "$BASE/api/storefront")
check "storefront sees fee 75" "$SF2" '"shippingFee":75'
P=$(curl -s $(ls public/products/abaya-*.png 2>/dev/null | head -1 >/dev/null && echo "") "$BASE/api/products?limit=1" | sed 's/.*"slug":"\([^"]*\)".*"price":\([0-9.]*\).*/\1 \2/' | head -c 100)
SLUG=$(curl -s "$BASE/api/products?limit=1" | grep -o '"slug":"[^"]*"' | head -1 | cut -d'"' -f4)
PRICE=$(curl -s "$BASE/api/products?limit=1" | grep -o '"price":[0-9.]*' | head -1 | cut -d: -f2)
echo "    (product $SLUG @ EGP $PRICE)"
ORDER=$(curl -s -X POST "$BASE/api/orders" -H 'Content-Type: application/json' -d "{\"lang\":\"en\",\"customer\":{\"name\":\"Test R13\",\"phone\":\"01012345678\",\"city\":\"Cairo\",\"address\":\"1 Test St\"},\"items\":[{\"slug\":\"$SLUG\",\"size\":\"M\",\"color\":\"Onyx\",\"qty\":1}],\"promoCode\":\"SADN10\"}")
check "order ok"            "$ORDER" '"ok":true'
DISCOUNT=$(echo "$ORDER" | grep -o '"discount":[0-9.]*' | head -1 | cut -d: -f2)
SHIPPING=$(echo "$ORDER" | grep -o '"shipping":[0-9.]*' | head -1 | cut -d: -f2)
TOTAL=$(echo "$ORDER" | grep -o '"total":[0-9.]*' | head -1 | cut -d: -f2)
EXPECT_DISC=$(python3 -c "print(round(float('$PRICE')*0.1,2))")
[ "$(python3 -c "print(float('$DISCOUNT')==float('$EXPECT_DISC'))")" = "True" ] && ok "discount 10% = $DISCOUNT" || bad "discount $DISCOUNT ≠ $EXPECT_DISC"
[ "$SHIPPING" = "75" ] && ok "fee 75 applied to order" || bad "shipping $SHIPPING ≠ 75"
EXPECT_TOTAL=$(python3 -c "print(round($PRICE-$DISCOUNT+75,2))" 2>/dev/null || echo "skip")
[ "$TOTAL" = "$EXPECT_TOTAL" ] && ok "total math ($TOTAL)" || bad "total $TOTAL ≠ $EXPECT_TOTAL"
check "COD in WA message" "$ORDER" 'Cash%20on%20delivery'
ONUM=$(echo "$ORDER" | grep -o '"number":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "── T4 promo disabled → invalid ──"
curl -s -b /tmp/r13-cookie.txt -X PUT "$BASE/api/admin/settings" -H 'Content-Type: application/json' -d '{"promoEnabled":false}' > /dev/null
O2=$(curl -s -X POST "$BASE/api/orders" -H 'Content-Type: application/json' -d "{\"lang\":\"en\",\"customer\":{\"name\":\"Test R13\",\"phone\":\"01012345678\",\"city\":\"Cairo\",\"address\":\"1 Test St\"},\"items\":[{\"slug\":\"$SLUG\",\"qty\":1}],\"promoCode\":\"SADN10\"}")
D2=$(echo "$O2" | grep -o '"discount":[0-9.]*' | head -1 | cut -d: -f2)
[ "$D2" = "0" ] && ok "disabled promo → no discount" || bad "discount $D2 ≠ 0"
curl -s -b /tmp/r13-cookie.txt -X PUT "$BASE/api/admin/settings" -H 'Content-Type: application/json' -d '{"promoEnabled":true,"promoPercent":10,"promoMin":0}' > /dev/null

echo "── T5 manual order register + preparing status ──"
M=$(curl -s -b /tmp/r13-cookie.txt -X POST "$BASE/api/admin/orders" -H 'Content-Type: application/json' -d "{\"customer\":{\"name\":\"Manual R13\",\"phone\":\"01098765432\",\"city\":\"Giza\",\"address\":\"22 Manual St\",\"notes\":\"atelier note test\"},\"items\":[{\"slug\":\"$SLUG\",\"size\":\"L\",\"color\":\"Plum\",\"qty\":2}],\"status\":\"preparing\",\"discount\":100}")
check "manual order ok" "$M" '"source":"manual"'
check "status preparing" "$M" '"status":"preparing"'
MSHIP=$(echo "$M" | grep -o '"shipping":[0-9.]*' | head -1 | cut -d: -f2)
[ "$MSHIP" = "75" ] && ok "manual order fee 75" || bad "manual shipping $MSHIP"

echo "── T6 upload route (was MISSING) ──"
C6=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/admin/upload" -F "file=@public/sadn-logo.svg;type=image/svg+xml")
[ "$C6" = "401" ] && ok "upload without auth → 401" || bad "expected 401 got $C6"
UP=$(curl -s -b /tmp/r13-cookie.txt -X POST "$BASE/api/admin/upload" -F "file=@public/sadn-logo.svg;type=image/svg+xml")
check "upload ok" "$UP" '"ok":true'
UPURL=$(echo "$UP" | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4)
C6B=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$UPURL")
[ "$C6B" = "200" ] && ok "uploaded file served ($UPURL)" || bad "uploaded file $C6B"

echo "── T7 hero/footer settings roundtrip ──"
curl -s -b /tmp/r13-cookie.txt -X PUT "$BASE/api/admin/settings" -H 'Content-Type: application/json' -d '{"heroImages":["/products/hero-abaya.png","/products/hero-fabric-drape.png"],"heroInterval":4,"phones":["+20 111 222 3333"],"socials":{"instagram":"https://instagram.com/sadn","facebook":"","tiktok":""}}' > /dev/null
SF3=$(curl -s "$BASE/api/storefront")
check "hero list updated"   "$SF3" 'hero-fabric-drape'
check "interval 4"          "$SF3" '"heroInterval":4'
check "phone updated"       "$SF3" '+20 111 222 3333'
check "instagram url"       "$SF3" 'instagram.com/sadn'
curl -s -b /tmp/r13-cookie.txt -X PUT "$BASE/api/admin/settings" -H 'Content-Type: application/json' -d '{"heroImages":["/products/hero-abaya.png","/products/hero-fabric-drape.png","/products/hero-back-drape.png"],"heroInterval":6,"phones":["+20 100 123 4567"],"socials":{"instagram":"","facebook":"","tiktok":""},"shippingFee":60}' > /dev/null

echo "── T8 cleanup ──"
DEL=0
for N in "$ONUM" "$(echo "$O2" | grep -o '"number":"[^"]*"' | head -1 | cut -d'"' -f4)" "$(echo "$M" | grep -o '"number":"[^"]*"' | head -1 | cut -d'"' -f4)"; do
  ID=$(curl -s -b /tmp/r13-cookie.txt "$BASE/api/admin/orders?q=$N" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$ID" ]; then curl -s -b /tmp/r13-cookie.txt -X DELETE "$BASE/api/admin/orders/$ID" > /dev/null && DEL=$((DEL+1)); fi
done
ok "deleted $DEL test order(s)"
REMAIN=$(curl -s -b /tmp/r13-cookie.txt "$BASE/api/admin/orders" | grep -o '"count":[0-9]*' | cut -d: -f2)
echo "    remaining orders: $REMAIN"

echo ""
echo "RESULT: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" = "0" ]
