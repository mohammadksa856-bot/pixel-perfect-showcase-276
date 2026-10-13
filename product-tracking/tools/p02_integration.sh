#!/usr/bin/env bash
# P02 integration: builds the preview DB (engine copy + 8010 via sync-manifests), serves the real
# engine HTTP API on localhost with a random key, and runs the contract/preview tests against it.
# Usage: p02_integration.sh <engine_repo> <scratch_dir>
set -euo pipefail
ENGINE="$1"; SCRATCH="$2"
SITE="$(cd "$(dirname "$0")/../.." && pwd)"
"$SITE/product-tracking/tools/p02_build_preview_db.sh" "$ENGINE" "$SCRATCH/p02" >/dev/null
KEY="$(python3 -c 'import secrets;print(secrets.token_hex(16))')"
PORT=18768
PYTHONPATH="$ENGINE/src" KEY="$KEY" python3 -c "
import os, sys
from finengine.api import serve_api
serve_api(sys.argv[1], '127.0.0.1', $PORT, api_key=os.environ['KEY'])" "$SCRATCH/p02/preview.sqlite3" > "$SCRATCH/p02_api.log" 2>&1 &
API_PID=$!
trap 'kill $API_PID 2>/dev/null || true' EXIT
for _ in $(seq 1 50); do curl -sf -H "X-API-Key: $KEY" "http://127.0.0.1:$PORT/health" >/dev/null && break; sleep 0.2; done
cd "$SITE"
ENGINE_IT_URL="http://127.0.0.1:$PORT" ENGINE_IT_KEY="$KEY" bun test tests/company-preview.integration.test.ts
