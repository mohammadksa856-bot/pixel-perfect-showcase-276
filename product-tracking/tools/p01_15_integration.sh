#!/usr/bin/env bash
# P01-15 integration: real engine HTTP API on localhost against a COPY of the engine DB.
# Usage: p01_15_integration.sh <engine_repo> <scratch_dir>
# Never point this at a production DB. The key is random per run and never stored.
set -euo pipefail
ENGINE="$1"; SCRATCH="$2"
SITE="$(cd "$(dirname "$0")/../.." && pwd)"
DB="$SCRATCH/p01_15_engine.sqlite3"
# Remove WAL/SHM left by a previous run: SQLite would replay them into the fresh copy
# and report "database disk image is malformed".
rm -f "$DB" "$DB-wal" "$DB-shm"
cp "$ENGINE/data/financial.sqlite3" "$DB"
KEY="$(python3 -c 'import secrets;print(secrets.token_hex(16))')"
PORT=18765
# serve_api takes the key as an argument (only the CLI reads FINENGINE_API_KEY);
# without it the API runs unauthenticated, which the wrong-key test would catch.
FINENGINE_API_KEY="$KEY" PYTHONPATH="$ENGINE/src" python3 -c "
import os, sys
from finengine.database import Database
from finengine.api import serve_api
Database(sys.argv[1])
serve_api(sys.argv[1], '127.0.0.1', $PORT, api_key=os.environ['FINENGINE_API_KEY'])" "$DB" > "$SCRATCH/p01_15_api.log" 2>&1 &
API_PID=$!
trap 'kill $API_PID 2>/dev/null || true' EXIT
for _ in $(seq 1 50); do curl -sf -H "X-API-Key: $KEY" "http://127.0.0.1:$PORT/health" >/dev/null && break; sleep 0.2; done
cd "$SITE"
ENGINE_IT_URL="http://127.0.0.1:$PORT" ENGINE_IT_KEY="$KEY" bun test tests/peer-comparison.integration.test.ts
