#!/usr/bin/env python3
"""Rebuild a documents root for DATA-02 batches whose PDFs are archived on engine branches, not on engine main.

Reads <batch>/sources.json (documents_used[].engine_ref + engine_archive_path + sha256), extracts each blob with
`git show <ref>:<path>` from the engine clone, recomputes SHA-256, and writes <out>/SA/<symbol>/documents/<sha>.<ext>.
The engine clone is only read (no checkout, no fetch). Use the output with data02_verify.py --docs-root <out>.
Usage: data02_fetch_branch_docs.py <engine_repo> <batch_dir> <out_dir>
"""
import hashlib
import json
import os
import subprocess
import sys

engine, batch, out = sys.argv[1:4]
sources = json.load(open(os.path.join(batch, "sources.json"), encoding="utf-8"))
failed = 0
for doc in sources["documents_used"]:
    ref = doc.get("engine_ref")
    if not ref:
        continue  # archived on engine main; data02_verify.py finds it without --docs-root
    blob = subprocess.run(["git", "-C", engine, "show", f"{ref}:{doc['engine_archive_path']}"],
                          capture_output=True, check=True).stdout
    digest = hashlib.sha256(blob).hexdigest()
    ok = digest == doc["sha256"]
    failed += not ok
    target = os.path.join(out, "SA", doc["company"], "documents", os.path.basename(doc["engine_archive_path"]))
    if ok:
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, "wb") as fh:
            fh.write(blob)
    print(("ok  " if ok else "BAD ") + f"{doc['company']} {ref} {digest[:12]}")
sys.exit(1 if failed else 0)
