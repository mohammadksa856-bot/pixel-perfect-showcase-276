#!/usr/bin/env bash
# P02 preview DB: a COPY of the engine's bundled DB, plus Tawuniya (8010) ingested from the
# engine's own reviewed manifest with the engine's own CLI, plus the engine's understanding
# refresh. Nothing is written to the engine repo; no network is used (file:// manifest).
# Usage: p02_build_preview_db.sh <engine_repo> <out_dir>   → <out_dir>/preview.sqlite3
set -euo pipefail
ENGINE="$1"; OUT="$2"; mkdir -p "$OUT"
DB="$OUT/preview.sqlite3"
rm -f "$DB" "$DB-wal" "$DB-shm"
cp "$ENGINE/data/financial.sqlite3" "$DB"
# sync-manifests is the engine's reviewed-manifest path: it verifies the manifest, applies it
# to a clone first, and records the issuer document URL from the manifest as the source.
# (`ingest --sa-manifest file://…` records the manifest's own file:// URL instead, which
# the site correctly refuses to show as a source.) Archive index and raw dir go to $OUT.
# Empty archive index: the engine's own index lists artifacts for companies that are not
# registered in the bundled DB (FOREIGN KEY failure), and 8010's PDF is not archived in git.
echo '{"artifacts": []}' > "$OUT/archive-index.json"
PYTHONPATH="$ENGINE/src" python3 -m finengine --db "$DB" sync-manifests \
  --manifest "$ENGINE/data/imports/tawuniya-2025-fy.json" \
  --registry "$ENGINE/config/companies.json" \
  --raw-dir "$OUT/raw" --archive-index "$OUT/archive-index.json" \
  --project-root "$ENGINE" > "$OUT/sync-8010.json"
PYTHONPATH="$ENGINE/src" python3 - "$DB" <<'EOF'
import sys
from finengine.database import Database
from finengine.understanding import refresh_company_understanding
db = Database(sys.argv[1])
for company_id in ("sa:2222", "sa:1120", "sa:8010"):
    refresh_company_understanding(db.conn, company_id)
db.conn.commit()
EOF
git -C "$ENGINE" status --porcelain | grep -q . && { echo "engine repo modified — abort" >&2; exit 1; } || true
echo "$DB"
