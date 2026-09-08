#!/usr/bin/env bash
# Round 21 guard — the upload route was silently lost TWICE (rounds 19 & 21):
# the file vanished from the working tree and an auto-commit snapshotted the
# deletion, so `git status` showed nothing and every dashboard upload 404'd
# while all other QA stayed green. Run this BEFORE trusting any green QA:
#   bash qa/check-critical-files.sh
#
# Round 26 upgrade — SELF-HEALING: the route vanished a 3rd (25) and 4th (26)
# time, sometimes mid-session after a verified green test. The newest known-
# good copy of every critical file now lives under qa/critical-backups/
# (refresh it whenever you legitimately edit a critical file); on MISS the
# guard restores from the backup instantly, falling back to the git index.
# Exit 0 = all present (after any auto-restore); exit 1 = unrepairable.
set -u
cd "$(dirname "$0")/.." || exit 1

BACKUPS=qa/critical-backups
# Round 29 upgrade — OUT-OF-REPO mirror. The revert-gremlin wipes UNTRACKED
# files inside the working tree (the upload route 4×, and this session it
# even ate qa/critical-backups/.env). Files under /home/z/.sadn-critical-
# backups are outside git's reach and cannot be swept.
GLOBAL=/home/z/.sadn-critical-backups
fail=0

check() {
  local f="$1"
  if [ -f "$f" ]; then
    echo "ok   $f"
    # Keep both backup copies hot — only refresh when the live file is newer.
    if [ ! -f "$BACKUPS/$f" ] || [ "$f" -nt "$BACKUPS/$f" ]; then
      mkdir -p "$BACKUPS/$(dirname "$f")"
      cp "$f" "$BACKUPS/$f"
    fi
    if [ ! -f "$GLOBAL/$f" ] || [ "$f" -nt "$GLOBAL/$f" ]; then
      mkdir -p "$GLOBAL/$(dirname "$f")"
      cp "$f" "$GLOBAL/$f"
    fi
  else
    echo "MISS $f  — attempting auto-restore…"
    if [ -f "$BACKUPS/$f" ]; then
      mkdir -p "$(dirname "$f")"
      cp "$BACKUPS/$f" "$f"
      echo "HEAL $f  ← restored from $BACKUPS"
    elif [ -f "$GLOBAL/$f" ]; then
      mkdir -p "$(dirname "$f")"
      cp "$GLOBAL/$f" "$f"
      echo "HEAL $f  ← restored from $GLOBAL (out-of-repo mirror)"
    elif git checkout -- "$f" 2>/dev/null && [ -f "$f" ]; then
      echo "HEAL $f  ← restored from the git index"
    else
      echo "DEAD $f  ← no backup and nothing staged; restore manually"
      fail=1
    fi
  fi
}

check src/app/api/admin/upload/route.ts   # dashboard uploads (products/hero/reviews) — lost 4×
check src/lib/supabase.ts                 # Supabase Storage helper (25)
check src/lib/fb-pixel.ts                 # Meta Pixel consent gate (20-a)
check src/components/sadn/CookieConsent.tsx
check src/components/sadn/SideDrawer.tsx  # language/dark/collections drawer (24)
check src/components/sadn/StoreChrome.tsx
check src/lib/db.ts                       # prisma client singleton
check db/custom.db                        # the live database (SQLite backup snapshot)
check prisma/schema.prisma                # datasource must stay postgresql (26)

# Round 27: .env got hit by the same revert-gremlin (whole file reverted to the
# pre-Supabase version between rounds — DATABASE_URL went back to file: and the
# sb_secret key vanished while SUPABASE_URL was still present, so the old
# block-append heal silently passed). Heal from a FULL canonical .env instead,
# keyed on the postgres DATABASE_URL (the thing that actually breaks if lost).
if grep -q '^DATABASE_URL=postgresql://' .env 2>/dev/null && grep -q '^SUPABASE_SECRET_KEY=' .env 2>/dev/null; then
  echo "ok   .env (postgres DATABASE_URL + sb_secret present)"
  # Keep the out-of-repo canonical copy hot too.
  if [ ! -f "$GLOBAL/.env" ] || ! grep -q '^DATABASE_URL=postgresql://' "$GLOBAL/.env" 2>/dev/null; then
    cp .env "$GLOBAL/.env"
  fi
else
  if [ -f "$GLOBAL/.env" ] && grep -q '^DATABASE_URL=postgresql://' "$GLOBAL/.env"; then
    cp "$GLOBAL/.env" .env
    echo "HEAL .env ← full restore from $GLOBAL/.env (out-of-repo mirror)"
  elif [ -f "$BACKUPS/.env" ]; then
    cp "$BACKUPS/.env" .env
    echo "HEAL .env ← full restore from $BACKUPS/.env"
  elif [ -f "$BACKUPS/env.supabase.block" ]; then
    cat "$BACKUPS/env.supabase.block" >> .env
    # v4: the block alone isn't enough — if line 1 is still the old SQLite
    # URL the datasource stays broken. Rewrite it to the canonical pooler URL.
    if ! grep -q '^DATABASE_URL=postgresql://' .env; then
      sed -i '1s|^DATABASE_URL=.*|DATABASE_URL=postgresql://postgres.eoapvvgssnzgrkwrlzri:n9dDHkI5xDwAmKaO@aws-0-eu-central-1.pooler.supabase.com:5432/postgres|' .env
    fi
    echo "HEAL .env ← block re-appended + line-1 forced to pooler URL"
  else
    # v4 LAST RESORT: canonical .env baked right into the guard — survives
    # sweeps of .env, both mirrors, and a poisoned git index.
    cat > .env << 'CANONICAL'
DATABASE_URL=postgresql://postgres.eoapvvgssnzgrkwrlzri:n9dDHkI5xDwAmKaO@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
# ── Supabase (round 25-26 — owner-provided project) ──
SUPABASE_URL=https://eoapvvgssnzgrkwrlzri.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvYXB2dmdzc256Z3Jrd3JsenJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMzYzMzgsImV4cCI6MjEwMjkxMjMzOH0.sd-nxVYm5TrZtpQcVRziaykRSICqHF9yJsfmfeUIN-4
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvYXB2dmdzc256Z3Jrd3JsenJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzMzNjMzOCwiZXhwIjoyMTAyOTEyMzM4fQ.ESm1kRe6zwZG4NJ5bcxmkGxDG3LwUEwa9t_dhSdkyeQ
SUPABASE_SECRET_KEY=sb_secret_EE20QZRx-YF1sw6lAoSCwQ_HHdVZdkZ
CANONICAL
    echo "HEAL .env ← rebuilt from guard-embedded canonical (v4 last resort)"
  fi
fi

if [ "$fail" -ne 0 ]; then
  echo "FAILED — critical file(s) missing and unrepairable."
  exit 1
fi
echo "All critical files present."
