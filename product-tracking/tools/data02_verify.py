#!/usr/bin/env python3
"""DATA-02 evidence verifier.

For every file in <batch>/manifests, <batch>/reviews and <batch>/numeric-candidates:
  1. the archived source document exists in the engine repo and its SHA-256 equals the
     manifest's `source_sha256` (recomputed, never trusted);
  2. every evidence quote appears verbatim on its stated PDF page (pdftotext, reading order
     or layout, whitespace-normalised). Nothing is fuzzy-matched beyond whitespace.

Writes <batch>/verification-report.json and exits non-zero on any failure.
Usage: data02_verify.py <engine_repo> <batch_dir>
"""
import glob
import hashlib
import json
import os
import re
import subprocess
import sys
import unicodedata

engine, batch = sys.argv[1], sys.argv[2]


def norm(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).replace("­", "")
    return re.sub(r"\s+", " ", text).strip()


def page_texts(path: str, page: int) -> list[str]:
    out = []
    for mode in ([], ["-layout"]):
        res = subprocess.run(["pdftotext", *mode, "-f", str(page), "-l", str(page), path, "-"],
                             capture_output=True, text=True)
        out.append(norm(res.stdout))
    # layout text with column gaps collapsed to single spaces is already covered by norm()
    return out


def items(manifest: dict):
    for domain in ("company_attributes", "ownership_positions", "corporate_actions", "disclosures", "codex_key_reviews", "candidates"):
        for i, item in enumerate(manifest.get(domain, [])):
            label = item.get("key") or item.get("proposed_action_key") or item.get("metric") or item.get("attribute_key") or item.get("holder_key") or item.get("action_key") or item.get("title") or str(i)
            yield domain, label, item


report = {"batch": os.path.basename(os.path.normpath(batch)), "manifests": [], "evidence_checked": 0,
          "evidence_failed": 0, "items_without_evidence": 0}
cache: dict[tuple[str, int], list[str]] = {}
for mpath in sorted(glob.glob(os.path.join(batch, "manifests", "*.json")) + glob.glob(os.path.join(batch, "reviews", "*.json")) + glob.glob(os.path.join(batch, "numeric-candidates", "*.json"))):
    m = json.load(open(mpath, encoding="utf-8"))
    symbol, sha = m.get("symbol") or m["company_id"].split(":")[1], m["source_sha256"]
    docs = glob.glob(os.path.join(engine, "data", "raw", "SA", symbol, "documents", f"{sha}.*"))
    entry = {"manifest": os.path.relpath(mpath, batch), "source_url": m["source_url"], "source_sha256": sha,
             "document_found": bool(docs), "sha256_recomputed_match": False, "failures": []}
    if docs:
        entry["sha256_recomputed_match"] = hashlib.sha256(open(docs[0], "rb").read()).hexdigest() == sha
    for domain, label, item in items(m):
        meta = item.get("metadata") or (item.get("details") or {}).get("metadata") or {}  # actions nest it in details
        evidence = meta.get("evidence") or []
        if not evidence:
            report["items_without_evidence"] += 1
            entry["failures"].append({"item": f"{domain}:{label}", "error": "no evidence"})
            continue
        for e in evidence:
            report["evidence_checked"] += 1
            ok = False
            if docs and entry["sha256_recomputed_match"]:
                key = (docs[0], int(e["pdf_page"]))
                if key not in cache:
                    cache[key] = page_texts(*key)
                ok = any(norm(e["quote"]) in t for t in cache[key])
            if not ok:
                report["evidence_failed"] += 1
                entry["failures"].append({"item": f"{domain}:{label}", "pdf_page": e["pdf_page"], "quote": e["quote"]})
    report["manifests"].append(entry)

doc_fail = [x["manifest"] for x in report["manifests"] if not (x["document_found"] and x["sha256_recomputed_match"])]
report["documents_failed"] = doc_fail
report["passed"] = not doc_fail and report["evidence_failed"] == 0 and report["items_without_evidence"] == 0
json.dump(report, open(os.path.join(batch, "verification-report.json"), "w"), ensure_ascii=False, indent=2)
print(json.dumps({k: v for k, v in report.items() if k != "manifests"}, ensure_ascii=False))
for x in report["manifests"]:
    for f in x["failures"]:
        print("FAIL", x["manifest"], json.dumps(f, ensure_ascii=False))
sys.exit(0 if report["passed"] else 1)
