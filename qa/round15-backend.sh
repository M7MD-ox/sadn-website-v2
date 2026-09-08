#!/usr/bin/env bash
# Round 15 backend QA — payment methods (instapay/vodafone/cod), WhatsApp as
# communication-only, owner-editable stage checklist, sharp upload compression.
set -u
BASE=http://localhost:3000
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "  ✓ $1"; }
bad() { FAIL=$((FAIL+1)); echo "  ✗ $1"; }
JAR=/tmp/r15-admin.txt
C='Content-Type: application/json'

# Admin session
CODE=$(curl -s -c $JAR -o /dev/null -w "%{http_code}" -X POST $BASE/api/admin/login -H "$C" -d '{"password":"sadn-admin"}')
[ "$CODE" = "200" ] && ok "admin login" || bad "admin login ($CODE)"

echo "— settings: payment numbers + stages —"
R=$(curl -s -b $JAR -X PUT $BASE/api/admin/settings -H "$C" -d '{"instapayNumber":"01001234567890","vodafoneNumber":"01011112222"}')
echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); assert d['ok'] and d['settings']['instapayNumber']=='01001234567890' and d['settings']['vodafoneNumber']=='01011112222'" \
  && ok "PUT instapay/vodafone numbers" || bad "PUT numbers"

STAGES='[{"id":"payment_review","en":"Payment review","ar":"مراجعة الدفع","tone":"ok"},{"id":"order_confirm","en":"Confirmed with customer","ar":"تأكيد الأوردر مع العميل","tone":"ok"},{"id":"delivered","en":"Delivered","ar":"تسليم الأوردر","tone":"ok"},{"id":"returned","en":"Returned","ar":"مرتجع","tone":"warn"}]'
R=$(curl -s -b $JAR -X PUT $BASE/api/admin/settings -H "$C" -d "{\"orderStages\":$STAGES}")
echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); s=d['settings']['orderStages']; assert len(s)==4 and s[3]['tone']=='warn' and s[0]['id']=='payment_review'" \
  && ok "PUT custom 4-stage checklist (returned=warn)" || bad "PUT stages"

R=$(curl -s -b $JAR -X PUT $BASE/api/admin/settings -H "$C" -d '{"orderStages":[]}')
echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); assert not d['ok']" \
  && ok "empty stages rejected (422)" || bad "empty stages should 422"

R=$(curl -s $BASE/api/storefront)
echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); assert d['instapayNumber']=='01001234567890' and len(d['orderStages'])==4" \
  && ok "storefront exposes numbers + stages publicly" || bad "storefront config"

echo "— orders: COD —"
R=$(curl -s -X POST $BASE/api/orders -H "$C" -d '{"customer":{"name":"QA Cod","phone":"01000000001","city":"Cairo","address":"1 Test St"},"items":[{"slug":"abaya-mocha-crepe","size":"M","qty":1}],"paymentMethod":"cod"}')
echo "$R" | python3 -c "
import json,sys; d=json.load(sys.stdin); o=d['order']
assert d['ok'] and o['paymentMethod']=='cod'
assert o['status']=='order_confirm', o['status']
assert o['stagesDone']==['payment_review'], o['stagesDone']
assert d['payment']['method']=='cod'
" && ok "COD order starts after payment review (pre-checked N/A)" || bad "COD initial stage"
COD_ID=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin)['order']['id'])")

echo "— orders: vodafone cash —"
R=$(curl -s -X POST $BASE/api/orders -H "$C" -d '{"customer":{"name":"QA Vodafone","phone":"01000000002","city":"Giza","address":"2 Test St"},"items":[{"slug":"abaya-ivory-dune","size":"L","qty":2}],"paymentMethod":"vodafone","paymentSenderPhone":"01099998888"}')
echo "$R" | python3 -c "
import json,sys; d=json.load(sys.stdin); o=d['order']
assert d['ok'] and o['paymentMethod']=='vodafone'
assert o['status']=='payment_review', o['status']
assert o['stagesDone']==[], o['stagesDone']
assert o['paymentSenderPhone']=='01099998888'
assert d['payment']['vodafoneNumber']=='01011112222' and d['payment']['amount']==o['total']
" && ok "vodafone order lands under payment review + sender stored" || bad "vodafone order"
VF_ID=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin)['order']['id'])")
VF_NUM=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin)['order']['number'])")

# WhatsApp message content for the vodafone order
R=$(curl -s -X POST $BASE/api/orders -H "$C" -d '{"lang":"ar","customer":{"name":"QA Msg","phone":"01000000003","city":"Cairo","address":"3 Test St"},"items":[{"slug":"abaya-ivory-dune","size":"M","qty":1}],"paymentMethod":"instapay","paymentSenderPhone":"01055556666"}')
WA=$(curl -s "$BASE/api/orders" -o /dev/null; python3 - << PYEOF
import json
# rebuild the message the same way the server does, via the placed order shape
PYEOF
)
echo "$R" | python3 -c "
import json,sys; d=json.load(sys.stdin); o=d['order']
assert o['paymentMethod']=='instapay' and o['status']=='payment_review'
" && ok "instapay order under payment review" || bad "instapay order"
IN_ID=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin)['order']['id'])")

# sender phone required for transfers
R=$(curl -s -X POST $BASE/api/orders -H "$C" -d '{"customer":{"name":"QA NoSender","phone":"01000000004","city":"Cairo","address":"4 Test St"},"items":[{"slug":"abaya-ivory-dune","size":"M","qty":1}],"paymentMethod":"vodafone"}')
echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); assert not d['ok'] and 'payment.sender' in d['errors']" \
  && ok "transfer without sender number → 422 field error" || bad "missing sender validation"

# unknown method → falls back to cod
R=$(curl -s -X POST $BASE/api/orders -H "$C" -d '{"customer":{"name":"QA Weird","phone":"01000000005","city":"Cairo","address":"5 Test St"},"items":[{"slug":"abaya-ivory-dune","size":"M","qty":1}],"paymentMethod":"paypal"}')
echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); assert d['ok'] and d['order']['paymentMethod']=='cod'" \
  && ok "unknown paymentMethod falls back to COD" || bad "method fallback"
W_ID=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin)['order']['id'])")

echo "— WhatsApp message content —"
# Rebuild via the library (server-side truth) through a node-free check: fetch the message from the buildWhatsAppUrl by placing through the API is encoded; verify via direct bun import instead.
MSG=$(cd /home/z/my-project && bun -e '
import { buildWhatsAppMessage } from "./src/lib/orders.ts";
const order = { number: "SADN-123456", customerName: "QA", phone: "01000000000", city: "Cairo", address: "X", notes: null, items: [{slug:"s",name:"Abaya",nameAr:"عباية",image:"",price:1000,size:"M",color:"Ivory",qty:1}], subtotal:1000, discount:0, promoCode:null, shipping:60, total:1060, currency:"EGP", paymentMethod:"vodafone", paymentSenderPhone:"01099998888", status:"payment_review", stagesDone:[], source:"whatsapp", id:"x", createdAt:new Date(), updatedAt:new Date() };
console.log(JSON.stringify(buildWhatsAppMessage(order, "ar")));
' 2>/dev/null)
echo "$MSG" | python3 -c "
import json,sys
m = json.loads(sys.stdin.read())
assert 'فودافون كاش' in m, m
assert '01099998888' in m
assert 'دي صورة سكرين شوت لتحويل المبلغ' in m
assert 'الدفع عند الاستلام' not in m
" && ok "AR wa.message: vodafone + sender + screenshot line" || bad "wa message (vodafone)"
MSG=$(cd /home/z/my-project && bun -e '
import { buildWhatsAppMessage } from "./src/lib/orders.ts";
const order = { number: "SADN-123456", customerName: "QA", phone: "01000000000", city: "Cairo", address: "X", notes: null, items: [{slug:"s",name:"Abaya",nameAr:"عباية",image:"",price:1000,size:"M",color:"Ivory",qty:1}], subtotal:1000, discount:0, promoCode:null, shipping:60, total:1060, currency:"EGP", paymentMethod:"cod", paymentSenderPhone:"", status:"order_confirm", stagesDone:["payment_review"], source:"whatsapp", id:"x", createdAt:new Date(), updatedAt:new Date() };
console.log(JSON.stringify(buildWhatsAppMessage(order, "ar")));
' 2>/dev/null)
echo "$MSG" | python3 -c "
import json,sys
m = json.loads(sys.stdin.read())
assert 'الدفع عند الاستلام' in m
assert 'سكرين شوت' not in m
" && ok "AR wa.message: COD line, no transfer wording" || bad "wa message (cod)"

echo "— stage checklist PATCH —"
R=$(curl -s -b $JAR -X PATCH $BASE/api/admin/orders/$VF_ID -H "$C" -d '{"stagesDone":["payment_review"]}')
echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); o=d['order']; assert o['stagesDone']==['payment_review'] and o['status']=='payment_review'" \
  && ok "PATCH stagesDone=[review] → status=payment_review" || bad "PATCH review"
R=$(curl -s -b $JAR -X PATCH $BASE/api/admin/orders/$VF_ID -H "$C" -d '{"stagesDone":["payment_review","order_confirm","delivered","returned"]}')
echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); o=d['order']; assert o['status']=='returned' and len(o['stagesDone'])==4" \
  && ok "full checklist → status=returned" || bad "PATCH full"
R=$(curl -s -b $JAR -X PATCH $BASE/api/admin/orders/$VF_ID -H "$C" -d '{"stagesDone":["payment_review","order_confirm","delivered"]}')
echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); o=d['order']; assert o['status']=='delivered'" \
  && ok "un-return: undo to delivered" || bad "un-return"
R=$(curl -s -b $JAR -X PATCH $BASE/api/admin/orders/$VF_ID -H "$C" -d '{"status":"payment_review"}')
echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); o=d['order']; assert o['stagesDone']==['payment_review']" \
  && ok "legacy {status} PATCH back-compat" || bad "legacy PATCH"

echo "— manual order registration —"
R=$(curl -s -b $JAR -X POST $BASE/api/admin/orders -H "$C" -d '{"customer":{"name":"QA Manual","phone":"01000000006","city":"Cairo","address":"6 Test St"},"items":[{"slug":"abaya-charcoal-mist","size":"L","qty":1}],"paymentMethod":"vodafone","paymentSenderPhone":"01077776666"}')
echo "$R" | python3 -c "
import json,sys; d=json.load(sys.stdin); o=d['order']
assert o['source']=='manual' and o['paymentMethod']=='vodafone'
assert o['status']=='order_confirm' and o['stagesDone']==['payment_review']
" && ok "manual vodafone order: checklist + sender saved" || bad "manual vodafone"
MAN_ID=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin)['order']['id'])")

echo "— stats —"
R=$(curl -s -b $JAR $BASE/api/admin/stats)
echo "$R" | python3 -c "
import json,sys; d=json.load(sys.stdin); s=d['stats']
# fresh = untouched checklist: only the instapay order (vodafone was PATCHed
# during the checklist tests; COD/manual pre-check the review stage as N/A)
assert s['pendingCount']==1, s['pendingCount']
" && ok "stats: fresh = untouched checklist (1)" || bad "stats pendingCount"

echo "— guard: transfer method without configured number —"
curl -s -b $JAR -X PUT $BASE/api/admin/settings -H "$C" -d '{"instapayNumber":""}' > /dev/null
R=$(curl -s -X POST $BASE/api/orders -H "$C" -d '{"customer":{"name":"QA Guard","phone":"01000000007","city":"Cairo","address":"7 Test St"},"items":[{"slug":"abaya-ivory-dune","size":"M","qty":1}],"paymentMethod":"instapay","paymentSenderPhone":"01055554444"}')
echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); assert not d['ok'] and 'InstaPay' in d['error']" \
  && ok "instapay w/o configured number → 422" || bad "guard instapay"
R=$(curl -s $BASE/api/storefront)
echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); assert d['instapayNumber']=='' and d['vodafoneNumber']=='01011112222'" \
  && ok "cleared instapay hidden, vodafone intact" || bad "clear number roundtrip"

echo "— upload compression (sharp) —"
python3 - << 'PYEOF'
# smooth gradient 2400x1800 — realistic photo-like content that compresses hard
import zlib, struct
w, h = 2400, 1800
rows = b''.join(
    b'\x00' + bytes(v for x in range(w) for v in (x * 255 // w, y * 255 // h, (x + y) * 255 // (w + h)))
    for y in range(h)
)
def chunk(t, data):
    c = struct.pack('>I', len(data)) + t + data
    return c + struct.pack('>I', zlib.crc32(t+data) & 0xffffffff)
# filter type 1 (sub) per row compresses gradients well
rows_sub = b''.join(b'\x01' + rows[i+1:i+1+w*3] for i in range(0, len(rows), w*3+1))
png = b'\x89PNG\r\n\x1a\n'
png += chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
png += chunk(b'IDAT', zlib.compress(rows_sub, 9))
png += chunk(b'IEND', b'')
open('/tmp/r15-gradient.png','wb').write(png)
import os; print('made', os.path.getsize('/tmp/r15-gradient.png')//1024, 'KB png')
PYEOF
R=$(curl -s -b $JAR -X POST $BASE/api/admin/upload -F "file=@/tmp/r15-gradient.png;type=image/png")
echo "$R" | python3 -c "
import json,sys; d=json.load(sys.stdin)
assert d['ok'] and d['url'].endswith('.webp'), d
assert d['kb'] < 900, d['kb']
print('   uploaded:', d['url'], d['kb'], 'KB')
open('/tmp/r15-url.txt','w').write(d['url'])
" && ok "PNG auto-converted to light WebP" || bad "upload conversion"
UP_URL=$(cat /tmp/r15-url.txt)
CT=$(curl -s -o /dev/null -w "%{content_type}" "$BASE$UP_URL")
[ "$CT" = "image/webp" ] && ok "optimized image served as image/webp" || bad "served $CT"

echo "— cleanup —"
for ID in $COD_ID $VF_ID $IN_ID $W_ID $MAN_ID; do
  curl -s -b $JAR -X DELETE $BASE/api/admin/orders/$ID -o /dev/null
done
curl -s -b $JAR -X PUT $BASE/api/admin/settings -H "$C" -d '{"vodafoneNumber":"","instapayNumber":""}' -o /dev/null
curl -s -b $JAR -X PUT $BASE/api/admin/settings -H "$C" -d "{\"orderStages\":$STAGES}" -o /dev/null
UP_FILE=$(echo "$UP_URL" | sed 's|/uploads/||')
rm -f "public/uploads/$UP_FILE" 2>/dev/null
N=$(curl -s -b $JAR $BASE/api/admin/orders | python3 -c "import json,sys; print(len(json.load(sys.stdin)['orders']))")
[ "$N" = "0" ] && ok "all QA orders removed" || bad "orders left: $N"

echo ""
echo "R15 BACKEND RESULT: $PASS passed, $FAIL failed"
exit $FAIL
