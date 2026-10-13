#!/usr/bin/env bash
# DATA-02 merge test: ingest the batch manifests with the engine's own `sync-manifests` into a scratch copy of a
# database, after Codex's baseline manifests, and prove no pre-existing row changes. Never touches the engine repo's DB.
# Usage: data02_merge_test.sh <engine_repo> <batch_dir> <source_db> <scratch_dir> [baseline_manifest ...]
# Optional: DATA02_REGISTRY=<companies.json> when the batch's companies are not in the engine main registry.
set -euo pipefail
E=$1; B=$(cd "$2" && pwd); SRC=$3; S=$4; shift 4
rm -rf "$S"; mkdir -p "$S/raw"; echo '{"artifacts": []}' > "$S/archive-index.json"
cp "$SRC" "$S/db.sqlite3"
run() { (cd "$E" && PYTHONPATH=src python3 -m finengine.cli --db "$S/db.sqlite3" sync-manifests \
  ${DATA02_REGISTRY:+--registry "$DATA02_REGISTRY"} --raw-dir "$S/raw" --archive-index "$S/archive-index.json" --project-root "$E" "$@"); }
for m in "$@"; do run --manifest "$m" > "$S/baseline-$(basename "$m")"; done
snap() { python3 - "$S/db.sqlite3" <<'PY'
import json, sqlite3, sys
c = sqlite3.connect(sys.argv[1])
print(json.dumps({t: [list(r) for r in c.execute(f"SELECT * FROM {t} ORDER BY id")]
                  for t in ("company_attributes", "ownership_positions", "corporate_actions", "disclosures")}, default=str))
PY
}
snap > "$S/before.json"
args=(); for f in "$B"/manifests/*.json; do args+=(--manifest "$f"); done
run "${args[@]}" > "$S/batch-sync.json"
snap > "$S/after.json"
run "${args[@]}" > "$S/resync.json"  # second run must be all duplicates
python3 - "$S" "$B" "$(cd "$E" && git rev-parse --short HEAD)" "$@" <<'PY'
import json, os, sys
S, B, commit, baselines = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
before, after, sync, resync = (json.load(open(f"{S}/{n}")) for n in ("before.json", "after.json", "batch-sync.json", "resync.json"))
totals = {"inserted": 0, "restated": 0, "duplicate": 0}
def walk(x):
    if isinstance(x, dict):
        c = x.get("counts")
        if isinstance(c, dict) and "inserted" in c:
            for key in totals: totals[key] += c.get(key, 0)
        for v in x.values(): walk(v)
    elif isinstance(x, list):
        for v in x: walk(v)
walk(resync)
report = {"engine_commit": commit, "baseline_manifests": [os.path.basename(b) for b in baselines],
          "preflight": sync["preflight"], "resync_counts": totals, "tables": {}}
expected = {}
for p in sorted(os.listdir(f"{B}/manifests")):
    m = json.load(open(f"{B}/manifests/{p}"))
    for t in ("company_attributes", "ownership_positions", "corporate_actions", "disclosures"):
        expected[t] = expected.get(t, 0) + len(m.get(t, []))
ok = sync["preflight"].get("integrity") == "ok" and totals["inserted"] == 0 and totals["restated"] == 0
for t in before:
    b = {r[0]: r for r in before[t]}; a = {r[0]: r for r in after[t]}
    changed = [i for i in b if a.get(i) != b[i]]
    added = len(a) - len(b)
    report["tables"][t] = {"before": len(b), "after": len(a), "added": added, "expected_added": expected.get(t, 0),
                           "pre_existing_rows_changed": len(changed)}
    ok &= not changed and added == expected.get(t, 0)
report["passed"] = ok
json.dump(report, open(f"{B}/merge-test-report.json", "w"), indent=2); open(f"{B}/merge-test-report.json", "a").write("\n")
print(json.dumps(report, indent=2))
sys.exit(0 if ok else 1)
PY
