"""Read ONLY Aramco engine rows in one read transaction; private local capture, no remote files."""
import argparse
import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

REMOTE = '''import sqlite3,json,datetime
c=sqlite3.connect('file:/app/state/financial.sqlite3?mode=ro',uri=True,timeout=15)
c.row_factory=sqlite3.Row;c.execute('PRAGMA query_only=ON');c.execute('BEGIN')
out={'started_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'company_id':'sa:2222','read_only':bool(c.execute('PRAGMA query_only').fetchone()[0])}
out['schema']={r['name']:r['sql'] for r in c.execute("SELECT name,sql FROM sqlite_master WHERE type='table'")}
out['company']=[dict(r) for r in c.execute("SELECT * FROM companies WHERE company_id='sa:2222'")]
out['data_points']=[dict(r) for r in c.execute("SELECT * FROM data_points WHERE company_id='sa:2222' ORDER BY id")]
out['sources']=[dict(r) for r in c.execute("SELECT * FROM source_documents WHERE company_id='sa:2222' ORDER BY source_key")]
for name in ('source_artifacts','extracted_facts','normalized_facts'):
 cols={r['name'] for r in c.execute('PRAGMA table_info('+name+')')}
 if 'company_id' in cols:out[name]=[dict(r) for r in c.execute("SELECT * FROM "+name+" WHERE company_id='sa:2222'")]
out['artifact_links']=[dict(r) for r in c.execute("SELECT l.* FROM source_artifact_links l JOIN source_documents s USING(source_key) WHERE s.company_id='sa:2222'")]
out['changes']=c.total_changes;out['finished_at']=datetime.datetime.now(datetime.timezone.utc).isoformat()
c.rollback();c.close();print(json.dumps(out,ensure_ascii=False,separators=(',',':')))
'''

def main():
    p=argparse.ArgumentParser();p.add_argument('--private-root',required=True);p.add_argument('--receipt',required=True);a=p.parse_args()
    private=Path(a.private_root);private.mkdir(parents=True,exist_ok=True)
    args=['ssh','-i','C:/Users/Mohammed856/.ssh/marefa-finengine-deploy','-o','UserKnownHostsFile=C:/Users/Mohammed856/Documents/Codex/2026-08-31/referenced-chatgpt-conversation-this-is-an/outputs/codex-telecom-95pct/output/github-actions-known-hosts','-o','BatchMode=yes','-o','ConnectTimeout=10','-o','StrictHostKeyChecking=yes','ubuntu@13.60.3.12','docker exec -i repo-engine-1 python -u -']
    result=subprocess.run(args,input=REMOTE.encode(),capture_output=True,timeout=90)
    receipt={'attempt_at':datetime.now(timezone.utc).isoformat(),'operation':'READ_ONLY_SQLITE_TRANSACTION','remote_files_written':False,'exit':result.returncode}
    if result.returncode:
        receipt.update(status='UNAVAILABLE',error=result.stderr.decode(errors='replace')[-1800:])
    else:
        data=json.loads(result.stdout);assert data['read_only'] and data['changes']==0
        with (private/'engine-live.json').open('xb') as f:f.write(result.stdout)
        receipt.update(status='CAPTURED',started_at=data['started_at'],finished_at=data['finished_at'],sha256=hashlib.sha256(result.stdout).hexdigest(),bytes=len(result.stdout),data_points=len(data['data_points']),sources=len(data['sources']),current_points=sum(r['is_current']==1 for r in data['data_points']),SQL_changes=data['changes'],raw_values_public=False)
    with Path(a.receipt).open('x',encoding='utf-8') as f:json.dump(receipt,f,indent=2)
    print(json.dumps(receipt))

if __name__=='__main__':main()
