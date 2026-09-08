#!/usr/bin/env bash
# SADN → Vercel one-shot deploy (round 33). Usage:
#   VERCEL_TOKEN=xxxx bash qa/deploy-vercel.sh
#
# Prereqs: token from https://vercel.com/account/tokens (scope: full account).
# The script links the project, uploads the 5 env vars from the canonical
# .env, and deploys to PRODUCTION. Region fra1 (Frankfurt) matches the
# Supabase eu-central-1 DB — minimal latency for Egypt.
set -euo pipefail
cd "$(dirname "$0")/.." || exit 1

[ -n "${VERCEL_TOKEN:-}" ] || { echo "❌ VERCEL_TOKEN is required (https://vercel.com/account/tokens)"; exit 1; }
bash qa/check-critical-files.sh >/dev/null 2>&1 || true
grep -q '^DATABASE_URL=postgresql://' .env || { echo "❌ .env broken — guard first"; exit 1; }

bunx vercel link --yes --token "$VERCEL_TOKEN" 2>&1 | tail -1

upsert_env() {
  local key="$1" val="$2"
  if bunx vercel env ls --token "$VERCEL_TOKEN" 2>/dev/null | grep -q "^ *$key\b"; then
    printf '%s' "$val" | bunx vercel env rm "$key" production --yes --token "$VERCEL_TOKEN" >/dev/null 2>&1 || true
  fi
  printf '%s' "$val" | bunx vercel env add "$key" production --token "$VERCEL_TOKEN" >/dev/null
  echo "✓ env $key"
}

upsert_env DATABASE_URL              "postgresql://postgres.eoapvvgssnzgrkwrlzri:n9dDHkI5xDwAmKaO@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
upsert_env DIRECT_URL                "$(grep '^DIRECT_URL=' .env | cut -d= -f2-)"
upsert_env SUPABASE_URL              "$(grep '^SUPABASE_URL=' .env | cut -d= -f2-)"
upsert_env SUPABASE_ANON_KEY         "$(grep '^SUPABASE_ANON_KEY=' .env | cut -d= -f2-)"
upsert_env SUPABASE_SERVICE_ROLE_KEY "$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env | cut -d= -f2-)"
upsert_env SUPABASE_SECRET_KEY       "$(grep '^SUPABASE_SECRET_KEY=' .env | cut -d= -f2-)"

echo "— deploying to production (first build takes ~2-4 min) —"
bunx vercel deploy --prod --token "$VERCEL_TOKEN" 2>&1 | tail -5
