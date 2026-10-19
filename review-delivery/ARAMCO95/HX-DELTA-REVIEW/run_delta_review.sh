#!/usr/bin/env bash
# HX-F1/HX-F2 delta review: re-runs Codex's generator before (b90fbc9) and after (8562f91), unchanged, on the same public
# b90fbc9 inputs and the read-only engine DB, in a temporary directory. Writes only to that directory and to this folder's logs.
# Usage (repo root): bash review-delivery/ARAMCO95/HX-DELTA-REVIEW/run_delta_review.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; REPO="$(git -C "$HERE" rev-parse --show-toplevel)"
W="$(mktemp -d)"; trap 'rm -rf "$W"' EXIT
H=review-delivery/ARAMCO95/HISTORICAL-EXTRACTION; N=review-delivery/ARAMCO95/HX-SAFE-REVIEW
mkdir -p "$W/old" "$W/new" "$W/syn/code"
for v in old new; do for f in EXTRACTED-OBSERVATIONS.json CONTRACT-FIELD-SCOPE.json SOURCE-MANIFEST.json EDITION-RECONCILIATIONS.json; do
  git -C "$REPO" show b90fbc9:$H/$f > "$W/$v/$f"; done; done
git -C "$REPO" show b90fbc9:$H/build_ledgers.py > "$W/old/build_ledgers.py"
git -C "$REPO" show 8562f91:$N/code/build_ledgers.py > "$W/new/build_ledgers.py"
git -C "$REPO" show 8562f91:$N/code/semantic_compatibility.py > "$W/new/semantic_compatibility.py"
git -C "$REPO" show 8562f91:$N/synthetic_test.py > "$W/syn/synthetic_test.py"; cp "$W/new/"*.py "$W/syn/code/"
git -C "$REPO" show b90fbc9:$H/extract_history.py | sed -n '/^PLANS = {/,/^STATEMENTS=/p' > "$W/plans.txt"
for f in INTAKE-MATRIX.json DERIVATION-PROPOSALS.json ANNUAL-PERIOD-LEDGER.json QUARTERLY-PERIOD-LEDGER.json EDITION-RECONCILIATIONS.json ENGINE-REFERENCE-REGISTER.json; do
  git -C "$REPO" show b90fbc9:$H/$f > "$W/pub_$f"; done
cp "$HERE/harness.py" "$HERE/delta.py" "$HERE/mutation_test.py" "$W/"
cd "$W"
{
  echo "## hashes of exported code (compare FILE-HASHES.json at 8562f91)"; sha256sum syn/synthetic_test.py syn/code/build_ledgers.py syn/code/semantic_compatibility.py
  echo "## engine DB"; sha256sum "${ENGINE:-/home/user/mohammadksa856-bot/-market-agnostic-financial-data-engine-1}/data/financial.sqlite3"
  for v in old new; do echo "## run $v generator"; python3 -I harness.py $v | tail -c 300; echo; done
  echo "## harness check: old generator reproduces the published b90fbc9 outputs"
  python3 -I - <<'PY'
import json
L=lambda p: json.load(open(p))
for f in ['INTAKE-MATRIX.json','DERIVATION-PROPOSALS.json','EDITION-RECONCILIATIONS.json','ENGINE-REFERENCE-REGISTER.json','QUARTERLY-PERIOD-LEDGER.json','ANNUAL-PERIOD-LEDGER.json']:
    print(f,'old==published:',L('old/'+f)==L('pub_'+f))
PY
  echo "## delta old -> new"; python3 -I delta.py
  echo "## Codex synthetic tests (unchanged)"; python3 -I syn/synthetic_test.py 2>&1 | tail -3
  echo "## independent mutation tests"; python3 -I mutation_test.py 2>&1 | tail -3
} > "$HERE/hx-delta-checks.txt" 2>&1
cp delta-results.json "$HERE/HX-DELTA-RESULTS.json"
grep -q "old==published: False" "$HERE/hx-delta-checks.txt" && { echo "HARNESS MISMATCH"; exit 1; }
tail -n 3 "$HERE/hx-delta-checks.txt"
