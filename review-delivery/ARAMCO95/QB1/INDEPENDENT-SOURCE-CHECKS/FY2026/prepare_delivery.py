"""Hash committed evidence-code only. Never includes private originals or Git history."""
from pathlib import Path
import hashlib
import json
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
IMPLEMENTATION = '6133ac87a3228f924cebcf01163a27b9b3d887d2'
BASE = '0c0de9e95babcfcd55d852c4e65c81d9ca0943be'
names = subprocess.check_output(['git', 'diff', '--name-only', BASE, IMPLEMENTATION], cwd=ROOT, text=True).splitlines()
assert len(names) == 17
entries = []
tree = subprocess.check_output(['git', 'ls-tree', '-r', IMPLEMENTATION], cwd=ROOT, text=True)
blobs = {line.split('\t', 1)[1]: line.split('\t', 1)[0].split()[2] for line in tree.splitlines()}
for name in names:
    assert Path(name).suffix in ['.md', '.json', '.py', '.txt']
    # Blob ID avoids Windows revision:path stat/path-length interpretation.
    content = subprocess.check_output(['git', 'cat-file', 'blob', blobs[name]], cwd=ROOT)
    entries.append(dict(path=name, bytes=len(content), sha256=hashlib.sha256(content).hexdigest()))
manifest = dict(schema='qb1-original-source-closure-safe-delivery/1', implementation_sha=IMPLEMENTATION,
                baseline_sha=BASE, hash_policy='Exact git blob bytes (LF-normalized), not platform checkout CRLF bytes or original PDF hashes',
                entries=entries, restricted_originals_included=False, private_history_exported=False,
                centralized_acceptance_event=124, centralized_acceptance_commit='a79034d82c37e95865271b503816b72414386eaf',
                self_acceptance=False, financial_acceptance=False, rights_grant=False, publication_authorized=False)
(HERE/'IMPLEMENTATION-MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8',newline='\n')
print('17 implementation Git blobs hashed; originals excluded.')
