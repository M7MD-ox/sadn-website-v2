#!/bin/bash
# SADN round 11 backend test suite — reviews wall, announcement banner,
# track-order removal, abaya catalog, order/WhatsApp hand-off, password rotation.
BASE="http://localhost:3000"
JAR="/tmp/sadn-r11-cookies.txt"
rm -f "$JAR"
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  ✓ $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  ✗ $1"; }
check() { # check <label> <expected> <actual>
  if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (expected=$2 actual=$3)"; fi
}
py() { python3 -c "import json,sys;d=json.load(sys.stdin);$1"; }

echo "── 1 · Auth ──"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/admin/login -H 'Content-Type: application/json' -d '{"password":"wrong-pass"}')
check "wrong password rejected (401)" 401 "$CODE"
CODE=$(curl -s -c "$JAR" -o /tmp/login.json -w "%{http_code}" -X POST $BASE/api/admin/login -H 'Content-Type: application/json' -d '{"password":"sadn-admin"}')
check "correct password accepted (200)" 200 "$CODE"
CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/admin/reviews)
check "admin API blocked without session (401)" 401 "$CODE"
SESSION_OK=$(curl -s -b "$JAR" $BASE/api/admin/session | py 'print("yes" if d.get("authed") else "no")')
check "session endpoint honors cookie" yes "$SESSION_OK"

echo "── 2 · Reviews CRUD + public wall ──"
SEED=$(curl -s $BASE/api/reviews | py 'print(d["count"])')
check "public wall starts with 4 seeded cards" 4 "$SEED"
CODE=$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" -X POST $BASE/api/admin/reviews -H 'Content-Type: application/json' -d '{"image":""}')
check "review without image rejected (422)" 422 "$CODE"
NEW=$(curl -s -b "$JAR" -X POST $BASE/api/admin/reviews -H 'Content-Type: application/json' -d '{"image":"/uploads/reviews/review-1.svg","caption":"Test tester — Test City","order":9}')
RID=$(echo "$NEW" | py 'print(d["review"]["id"])')
[ -n "$RID" ] && ok "review created ($RID)" || bad "review create failed: $NEW"
curl -s -b "$JAR" -X PATCH $BASE/api/admin/reviews/$RID -H 'Content-Type: application/json' -d '{"caption":"Edited caption","order":8}' | py 'assert d["ok"] and d["review"]["caption"]=="Edited caption" and d["review"]["order"]==8' && ok "review PATCH caption+order" || bad "review PATCH"
curl -s -b "$JAR" -X PATCH $BASE/api/admin/reviews/$RID -H 'Content-Type: application/json' -d '{"active":false}' > /dev/null
CNT=$(curl -s $BASE/api/reviews | py 'print(d["count"])')
check "hidden review excluded from public wall" 4 "$CNT"
curl -s -b "$JAR" -X PATCH $BASE/api/admin/reviews/$RID -H 'Content-Type: application/json' -d '{"active":true}' > /dev/null
CNT=$(curl -s $BASE/api/reviews | py 'print(d["count"])')
check "re-activated review appears on wall" 5 "$CNT"
CODE=$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" -X DELETE $BASE/api/admin/reviews/$RID)
check "review deleted (200)" 200 "$CODE"
CNT=$(curl -s $BASE/api/reviews | py 'print(d["count"])')
check "wall back to 4 after delete" 4 "$CNT"

echo "── 3 · Announcement banner (dashboard ⇄ storefront) ──"
WA_BEFORE=$(curl -s -b "$JAR" $BASE/api/admin/settings | py 'print(d["settings"]["whatsappNumber"])')
curl -s -b "$JAR" -X PUT $BASE/api/admin/settings -H 'Content-Type: application/json' -d '{"bannerTextEn":"TEST EN BANNER","bannerTextAr":"بانر اختبار"}' | py 'assert d["ok"]' && ok "partial banner PUT (texts only)" || bad "banner PUT failed"
WA_AFTER=$(curl -s -b "$JAR" $BASE/api/admin/settings | py 'print(d["settings"]["whatsappNumber"])')
check "partial PUT left whatsappNumber untouched" "$WA_BEFORE" "$WA_AFTER"
PUB=$(curl -s $BASE/api/storefront | py 'print(d["banner"]["visible"], d["banner"]["textEn"])')
check "storefront reflects new banner text" "True TEST EN BANNER" "$PUB"
curl -s -b "$JAR" -X PUT $BASE/api/admin/settings -H 'Content-Type: application/json' -d '{"bannerVisible":false}' > /dev/null
VIS=$(curl -s $BASE/api/storefront | py 'print(d["banner"]["visible"])')
check "dashboard can hide the banner" False "$VIS"
CODE=$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" -X PUT $BASE/api/admin/settings -H 'Content-Type: application/json' -d '{"bannerTextEn":""}')
check "empty banner text rejected (422)" 422 "$CODE"
curl -s -b "$JAR" -X PUT $BASE/api/admin/settings -H 'Content-Type: application/json' -d '{"bannerVisible":true,"bannerTextEn":"10% OFF your first order · code SADN10","bannerTextAr":"خصم ١٠٪ على أول طلب · كود SADN10"}' | py 'assert d["ok"]' && ok "banner restored to defaults" || bad "banner restore failed"

echo "── 4 · Abaya catalog ──"
CNT=$(curl -s "$BASE/api/products?limit=48" | py 'print(d["count"])')
check "8 abaya products live" 8 "$CNT"
CATS=$(curl -s "$BASE/api/products?limit=48" | py 'print(all(p["category"] in ("daily","occasion") for p in d["products"]))')
check "every product in daily/occasion" True "$CATS"
ONE=$(curl -s "$BASE/api/products/abaya-noir-flow" | py 'print(d["ok"], d["product"]["name"], int(d["product"]["compareAtPrice"]))')
check "deep link: Noir Flow Abaya w/ compare-at" "True Noir Flow Abaya 176" "$ONE"
LEG=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/products/ivory-linen-shirt")
check "old streetwear product gone (404)" 404 "$LEG"

echo "── 5 · Order + WhatsApp hand-off ──"
sleep 2 # warm-up: let turbopack settle before the write path
ORD=$(curl -s --retry 2 --retry-connrefused -X POST $BASE/api/orders -H 'Content-Type: application/json' -d '{"lang":"ar","customer":{"name":"اختبار سدن","phone":"01012345678","city":"Cairo","address":"شارع التسعين، مبنى 12"},"items":[{"slug":"abaya-noir-flow","size":"M","color":"Noir","qty":1}]}')
ONUM=$(echo "$ORD" | py 'print(d["order"]["number"] if d.get("ok") else "FAIL")')
TOTAL=$(echo "$ORD" | py 'print(d["order"]["total"])')
echo "$ONUM" | grep -qE '^SADN-[0-9]{6}$' && ok "order number format ($ONUM)" || bad "order number format: $ONUM"
check "total = 148 + 12 shipping (COD, under threshold)" 160 "$TOTAL"
if echo "$ORD" | py 'exit(0 if "whatsappUrl" not in d else 1)'; then ok "no wa.me URL while owner number empty"; else echo "$ORD" | py 'assert "wa.me" in d["whatsappUrl"]' && ok "wa.me URL built (owner number set)"; fi
STATUS=$(curl -s -b "$JAR" -X PATCH $BASE/api/admin/orders/$ONUM -H 'Content-Type: application/json' -d '{"status":"in-atelier"}' | py 'print(d["order"]["status"])')
check "dashboard sets order status" in-atelier "$STATUS"
CODE=$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" -X PATCH $BASE/api/admin/orders/$ONUM -H 'Content-Type: application/json' -d '{"status":"bogus"}')
check "bogus status rejected (422)" 422 "$CODE"
CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/orders/$ONUM)
check "public tracking endpoint removed (404)" 404 "$CODE"

echo "── 6 · Password rotation ──"
CODE=$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" -X PUT $BASE/api/admin/password -H 'Content-Type: application/json' -d '{"current":"sadn-admin","next":"r11-test-pass"}')
check "password change accepted (200)" 200 "$CODE"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/admin/login -H 'Content-Type: application/json' -d '{"password":"sadn-admin"}')
check "old password now rejected (401)" 401 "$CODE"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/admin/login -H 'Content-Type: application/json' -d '{"password":"r11-test-pass"}')
check "new password works (200)" 200 "$CODE"
CODE=$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" -X PUT $BASE/api/admin/password -H 'Content-Type: application/json' -d '{"current":"r11-test-pass","next":"sadn-admin"}')
check "password restored (200)" 200 "$CODE"

echo "── 7 · Cleanup ──"
CODE=$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" -X DELETE $BASE/api/admin/orders/$ONUM)
check "test order deleted" 200 "$CODE"
FINAL=$(curl -s "$BASE/api/products?limit=48" | py 'print(d["count"])')
check "catalog intact (8)" 8 "$FINAL"

echo ""
echo "════════════════════════════════"
echo "BACKEND RESULT: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] && echo "ALL GREEN ✅" || echo "FAILURES ❌"
rm -f "$JAR"
