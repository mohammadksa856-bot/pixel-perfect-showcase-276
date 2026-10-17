"""Inspect an existing local engine baseline copy, never label it live production."""
import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from capture_readonly import REMOTE

p=argparse.ArgumentParser();p.add_argument('--db',required=True);p.add_argument('--private-root',required=True);p.add_argument('--receipt',required=True);a=p.parse_args()
db=Path(a.db).resolve(strict=True)
assert db.name=='before.sqlite3', 'Only untouched baseline copy, not staged imports'
for suffix in ('-wal','-journal'):
    sidecar=Path(str(db)+suffix)
    assert not sidecar.exists() or sidecar.stat().st_size==0, 'Do not ignore an active journal'
before=hashlib.sha256(db.read_bytes()).hexdigest()
uri=db.as_uri()+'?mode=ro&immutable=1'
code=REMOTE.replace("'file:/app/state/financial.sqlite3?mode=ro'",repr(uri))
r=subprocess.run([sys.executable,'-X','utf8','-c',code],capture_output=True,timeout=60)
if r.returncode:raise RuntimeError(r.stderr.decode(errors='replace')[-1200:])
data=json.loads(r.stdout);assert data['changes']==0 and data['read_only']
assert hashlib.sha256(db.read_bytes()).hexdigest()==before
private=Path(a.private_root);private.mkdir(parents=True,exist_ok=True)
with (private/'engine-local.json').open('xb') as f:f.write(r.stdout)
receipt={'status':'CAPTURED_LOCAL_BASELINE_NOT_LIVE','database_file':db.name,'database_sha256':before,'database_bytes':db.stat().st_size,'database_origin':'Existing DATA04 local before.sqlite3; not verified current production and no fabricated snapshot as-of', 'started_at':data['started_at'],'finished_at':data['finished_at'],'capture_sha256':hashlib.sha256(r.stdout).hexdigest(),'data_points':len(data['data_points']),'sources':len(data['sources']),'SQL_changes':0,'database_bytes_unchanged':True,'live':False,'raw_values_public':False}
with Path(a.receipt).open('x',encoding='utf-8') as f:json.dump(receipt,f,indent=2)
print(json.dumps(receipt))
