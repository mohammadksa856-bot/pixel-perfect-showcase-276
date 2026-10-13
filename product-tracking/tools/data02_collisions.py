#!/usr/bin/env python3
"""DATA-02 collision check: no batch manifest may republish a key Codex already owns.

Compares every manifest in <batch>/manifests with every JSON manifest in <engine>/data/imports for the same
company: attribute_key, holder_key, action_key and (disclosure_type, title). Any overlap would make
`sync-manifests` restate Codex's row, so it is a failure. Writes <batch>/collision-report.json.
Optional: `--extra-imports DIR` (repeatable) adds manifests Codex owns outside engine main (e.g. sector branches
extracted to a folder); `--prior-batch DIR` (repeatable) adds earlier DATA-02 batches, so a later batch can never
republish a key an earlier batch already delivered.
Usage: data02_collisions.py <engine_repo> <batch_dir> [--extra-imports DIR ...] [--prior-batch DIR ...]
"""
import glob
import json
import os
import sys

engine, batch = sys.argv[1], sys.argv[2]
sources = [os.path.join(engine, "data", "imports", "*.json")]
args = sys.argv[3:]
while args:
    flag, value, *args = args
    if flag == "--extra-imports":
        sources.append(os.path.join(value, "*.json"))
    elif flag == "--prior-batch":
        sources.append(os.path.join(value, "manifests", "*.json"))
    else:
        raise SystemExit(f"unknown option {flag}")


def keys(m: dict) -> set[tuple[str, str]]:
    out = {("attribute", a["attribute_key"]) for a in m.get("company_attributes", [])}
    out |= {("ownership", o["holder_key"]) for o in m.get("ownership_positions", [])}
    out |= {("action", c["action_key"]) for c in m.get("corporate_actions", [])}
    out |= {("disclosure", f'{d["disclosure_type"]}|{d["title"]}') for d in m.get("disclosures", [])}
    return out


codex: dict[str, dict[tuple[str, str], list[str]]] = {}
for path in sorted(p for pattern in sources for p in glob.glob(pattern)):
    try:
        m = json.load(open(path, encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        continue
    if not isinstance(m, dict) or "company_id" not in m:
        continue
    for k in keys(m):
        label = os.path.basename(path) if path.startswith(os.path.join(engine, "data", "imports")) else f"{os.path.basename(os.path.dirname(path))}/{os.path.basename(path)}"
        codex.setdefault(m["company_id"], {}).setdefault(k, []).append(label)

report = {"engine_imports_scanned": len(glob.glob(sources[0])), "manifests": []}
if len(sources) > 1:  # only present when options are used, so earlier batch reports stay byte-identical
    report["extra_sources_scanned"] = {os.path.relpath(pattern, os.path.dirname(os.path.dirname(os.path.dirname(pattern)))) if "manifests" in pattern
                                       else os.path.basename(os.path.dirname(pattern)) + "/*.json": len(glob.glob(pattern)) for pattern in sources[1:]}
mine: dict[tuple[str, str, str], str] = {}
failed = False
for mpath in sorted(glob.glob(os.path.join(batch, "manifests", "*.json"))):
    m = json.load(open(mpath, encoding="utf-8"))
    hits = []
    for k in sorted(keys(m)):
        if k in codex.get(m["company_id"], {}):
            hits.append({"kind": k[0], "key": k[1], "codex_files": codex[m["company_id"]][k]})
        other = mine.setdefault((m["company_id"], *k), os.path.basename(mpath))
        if other != os.path.basename(mpath):
            hits.append({"kind": k[0], "key": k[1], "batch_duplicate_of": other})
    failed |= bool(hits)
    report["manifests"].append({"manifest": os.path.basename(mpath), "company_id": m["company_id"],
                                "keys": len(keys(m)), "collisions": hits})
report["passed"] = not failed
json.dump(report, open(os.path.join(batch, "collision-report.json"), "w"), ensure_ascii=False, indent=2)
for x in report["manifests"]:
    print(x["manifest"], x["keys"], "keys", len(x["collisions"]), "collisions")
    for h in x["collisions"]:
        print("  ", json.dumps(h, ensure_ascii=False))
sys.exit(0 if report["passed"] else 1)
