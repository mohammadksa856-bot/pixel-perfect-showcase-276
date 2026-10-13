#!/usr/bin/env python3
"""Re-check DATA-02 evidence quotes the way Codex's review does: MuPDF native page text, whitespace-normalised.

Codex reported 8 'native quote diagnostic' mismatches on quotes that pass data02_verify.py (pdftotext). This tool
reproduces the MuPDF check so failures are found before delivery. For every evidence entry it reports:
  mupdf_ws   - MuPDF text, whitespace-normalised only (Codex's stated method)
  mupdf_nfkc - MuPDF text, NFKC + whitespace-normalised
OCR-labelled evidence (scanned pages, no text layer) is reported as 'ocr_no_native_text', never as a match.
Writes <out>/mupdf-check.json. Read-only on all inputs.
Usage: data02_mupdf_check.py <engine_repo> <out_dir> <batch_dir> [<batch_dir> ...] [--docs-root DIR ...]
"""
import glob
import hashlib
import json
import os
import re
import sys
import unicodedata

import pymupdf

engine, out, rest = sys.argv[1], sys.argv[2], sys.argv[3:]
batches, roots = [], [os.path.join(engine, "data", "raw")]
while rest:
    if rest[0] == "--docs-root":
        roots.append(rest[1]); rest = rest[2:]
    else:
        batches.append(rest[0]); rest = rest[1:]

ws = lambda t: re.sub(r"\s+", " ", t.replace("­", "")).strip()
nfkc = lambda t: ws(unicodedata.normalize("NFKC", t))
_docs, _pages = {}, {}


def doc(symbol, sha):
    if sha not in _docs:
        hits = [p for r in roots for p in glob.glob(os.path.join(r, "SA", symbol, "documents", f"{sha}.*"))]
        ok = [p for p in hits if hashlib.sha256(open(p, "rb").read()).hexdigest() == sha]
        _docs[sha] = pymupdf.open(ok[0]) if ok else None
    return _docs[sha]


def page_text(sha, p):
    if (sha, p) not in _pages:
        d = _docs[sha]
        _pages[(sha, p)] = d[p - 1].get_text() if d and 0 < p <= d.page_count else ""
    return _pages[(sha, p)]


def items(m):
    for dom in ("company_attributes", "ownership_positions", "corporate_actions", "disclosures", "codex_key_reviews", "candidates", "classifications"):
        for i, it in enumerate(m.get(dom, [])):
            meta = it.get("metadata") or (it.get("details") or {}).get("metadata") or {}
            label = it.get("attribute_key") or it.get("key") or it.get("metric") or it.get("action_key") or it.get("title") or it.get("holder_key") or it.get("symbol") or str(i)
            yield dom, i, label, meta.get("evidence", [])


report = {"method": "MuPDF native page.get_text(); whitespace-normalised (and NFKC variant)", "pymupdf": pymupdf.VersionBind,
          "batches": {}, "totals": {"evidence": 0, "mupdf_ws_match": 0, "nfkc_only": 0, "fail": 0, "ocr_no_native_text": 0}}
for b in batches:
    name = os.path.basename(os.path.normpath(b))
    rows = []
    for path in sorted(glob.glob(os.path.join(b, "*", "*.json"))):
        m = json.load(open(path))
        if "source_sha256" not in m:
            continue
        sym = m.get("symbol") or m["company_id"].split(":")[1]
        sha = m["source_sha256"]
        found = doc(sym, sha) is not None
        for dom, i, label, evidence in items(m):
            for e in evidence:
                report["totals"]["evidence"] += 1
                if e.get("text_layer") == "ocr":
                    status = "ocr_no_native_text"
                else:
                    t = page_text(sha, int(e["pdf_page"])) if found else ""
                    status = ("mupdf_ws_match" if ws(e["quote"]) in ws(t) else
                              "nfkc_only" if nfkc(e["quote"]) in nfkc(t) else "fail")
                report["totals"][status] += 1
                if status in ("fail", "nfkc_only"):
                    rows.append({"file": os.path.relpath(path, b), "domain": dom, "index": i, "label": label,
                                 "pdf_page": e["pdf_page"], "status": status, "quote": e["quote"]})
    report["batches"][name] = {"non_matching": rows}
os.makedirs(out, exist_ok=True)
json.dump(report, open(os.path.join(out, "mupdf-check.json"), "w"), ensure_ascii=False, indent=2)
print(json.dumps(report["totals"]), {k: len(v["non_matching"]) for k, v in report["batches"].items()})
