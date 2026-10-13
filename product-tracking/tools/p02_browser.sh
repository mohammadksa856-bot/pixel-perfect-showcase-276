#!/usr/bin/env bash
# P02 browser tests: engine API (preview DB) + site dev server + real Chromium.
# Usage: p02_browser.sh <engine_repo> <scratch_dir> <on|off> <playwright_node_modules>
# playwright-core is installed outside the repo (not a project dependency).
set -uo pipefail
ENGINE="$1"; SCRATCH="$2"; MODE="$3"; PW="$4"
SITE="$(cd "$(dirname "$0")/../.." && pwd)"
[ -f "$SCRATCH/p02/preview.sqlite3" ] || "$SITE/product-tracking/tools/p02_build_preview_db.sh" "$ENGINE" "$SCRATCH/p02" >/dev/null
KEY="$(python3 -c 'import secrets;print(secrets.token_hex(16))')"
EPORT=18769; SPORT=18805
FLAG=""; [ "$MODE" = on ] && FLAG=true
PYTHONPATH="$ENGINE/src" KEY="$KEY" python3 -c "
import os, sys
from finengine.api import serve_api
serve_api(sys.argv[1], '127.0.0.1', $EPORT, api_key=os.environ['KEY'])" "$SCRATCH/p02/preview.sqlite3" > "$SCRATCH/p02_browser_api.log" 2>&1 &
API=$!
cd "$SITE"
ENGINE_PREVIEW_ENABLED=$FLAG ENGINE_PEERS_ENABLED=$FLAG FINENGINE_API_URL="http://127.0.0.1:$EPORT" FINENGINE_API_KEY="$KEY" \
  ./node_modules/.bin/vite dev --host 127.0.0.1 --port $SPORT --strictPort > "$SCRATCH/p02_browser_dev.log" 2>&1 &
DEV=$!
trap 'kill $DEV $API 2>/dev/null; wait $DEV $API 2>/dev/null' EXIT
for _ in $(seq 1 120); do curl -s -o /dev/null "http://127.0.0.1:$SPORT/" && break; sleep 1; done
# warm up SSR compile so the first test does not time out
curl -s -o /dev/null "http://127.0.0.1:$SPORT/preview/companies/2222"
mkdir -p "$SCRATCH/shots"
# ESM ignores NODE_PATH: run from the directory that contains playwright-core's node_modules.
cd "$(dirname "$PW")" && SITE_URL="http://127.0.0.1:$SPORT" ENGINE_KEY="$KEY" ENGINE_PORT=$EPORT EXPECT="$MODE" \
  SHOT_DIR="$SCRATCH/shots" CHROMIUM_PATH="${CHROMIUM_PATH:-}" \
  node --input-type=module -e "$(cat "$SITE/product-tracking/tools/p02_browser.mjs")"
