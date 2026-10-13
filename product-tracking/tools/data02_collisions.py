#!/usr/bin/env python3
"""DATA-02 collision check: no batch manifest may republish a key Codex already owns.

Compares every manifest in <batch>/manifests with every JSON manifest in <engine>/data/imports for the same
company: attribute_key, holder_key, action_key and (disclosure_type, title). Any overlap would make
`sync-manifests` restate Codex's row, so it is a failure. Writes <batch>/collision-report.json.
Usage: data02_collisions.py <engine_repo> <batch_dir>
"""
import glob
import json
import os
import sys

engine, batch = sys.argv[1], sys.argv[2]


def keys(m: dict) -> set[tuple[str, str]]:
    out = {("attribute", a["attribute_key"]) for a in m.get("company_attributes", [])}
    out |= {("ownership", o["holder_key"]) for o in m.get("ownership_positions", [])}
    out |= {("action", c["action_key"]) for c in m.get("corporate_actions", [])}
    out |= {("disclosure", f'{d["disclosure_type"]}|{d["title"]}') for d in m.get("disclosures", [])}
    return out


codex: dict[str, dict[tuple[str, str], list[str]]] = {}
for path in sorted(glob.glob(os.path.join(engine, "data", "imports", "*.json"))):
    try:
        m = json.load(open(path, encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        continue
    if not isinstance(m, dict) or "company_id" not in m:
        continue
    for k in keys(m):
        codex.setdefault(m["company_id"], {}).setdefault(k, []).append(os.path.basename(path))

report = {"engine_imports_scanned": len(glob.glob(os.path.join(engine, "data", "imports", "*.json"))), "manifests": []}
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
