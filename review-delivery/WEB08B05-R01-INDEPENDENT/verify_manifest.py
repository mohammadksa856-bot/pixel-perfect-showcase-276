"""Verify published Git blob hashes, not merely working-tree fingerprints."""
from pathlib import Path
import subprocess,json,hashlib
OUT=Path(__file__).parent;ROOT=OUT.parents[1]
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT)
manifest=json.loads((OUT/'MANIFEST.json').read_text())
for entry in manifest['files']:
 p=OUT/entry['path'];blob=git('show','HEAD:'+p.relative_to(ROOT).as_posix())
 assert hashlib.sha256(blob).hexdigest()==entry['sha256'],entry['path']
 assert len(blob)==entry['bytes']
 assert blob==p.read_bytes()
changed=git('diff','--name-only','b9056a3faf8402ce5ffbdd22b2c5f4586cb6fa81','HEAD').decode().splitlines()
assert all(p.startswith('review-delivery/WEB08B05-R01-INDEPENDENT/') for p in changed)
assert not git('status','--porcelain')
print(json.dumps(dict(manifest_blobs_verified=len(manifest['files']),review_only=True,working_tree_clean=True)))
