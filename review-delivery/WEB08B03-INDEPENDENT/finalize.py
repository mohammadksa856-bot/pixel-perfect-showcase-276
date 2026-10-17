"""Package only review code/metadata; never publish private source material."""
from pathlib import Path
import json,re,hashlib,datetime
HERE=Path(__file__).resolve().parent
private=HERE.parents[2]/'web08b03-private-20261017'
tests=[]
for path in sorted((HERE/'runs').glob('*.txt')):
 text=path.read_text(encoding='utf8');meta=json.loads(text.splitlines()[0])
 counts={k:int(re.search(r'(?m)^ (\d+) '+k+r'\b',text).group(1)) if re.search(r'(?m)^ (\d+) '+k+r'\b',text) else 0 for k in ['pass','fail','skip']}
 tests.append(dict(name=meta['id'],sha=meta['sha'],started=meta['started'],exit=meta['exit'],passed=counts['pass'],failed=counts['fail'],skipped=counts['skip'],artifact='runs/'+path.name))
 # Path-redact public logs; original payload, if any, is retained privately.
 raw=text
 text=re.sub(r'C:[/\\]Users[/\\]Mohammed856[^"\n]*?bun\.exe','<BUN>',text)
 text=text.replace(str(HERE.parents[1]),'<REVIEW_ROOT>').replace(str(HERE.parents[1]).replace('\\','/'),'<REVIEW_ROOT>')
 if text!=raw:
  (private/('raw-'+path.name)).write_text(raw,encoding='utf8')
  path.write_text(text,encoding='utf8')
result={
 'schema':'marefa-web08b03-independent-review/1','decision':'REWORK',
 'application_sha':'b72ad3a1c1a9d5bd43bfec78523aa287300a4639',
 'delivery_sha':'1030fa883531f98fae899bd4f6a93733ecff6190',
 'branch':'review/web08b03-independent-20261017',
 'independent_tests':{'passed':2,'failed':13,'errors':0,'skipped':0,'total':15},
 'runs':tests,'setup':'SETUP-FAILURES.json',
 'claims_reviewed':22,'claims_withheld':22,'financially_qualified':0,
 'B02_142_inputs_unblocked':0,'documents_indexed':9,'private_original_pdfs_rehashed':5,
 'implementation_modified':False,'B01_modified':False,'WEB07_modified':False,
 'live_engine_connection_claimed':False,'parallel_financial_database_created':False,
 'main_merged':False,'content_published':False,'production_modified':False,
 'Supabase_modified':False,'user_final_acceptance':False,'financial_approval':False,
 'B02C_acceptance_preserved':'18823e5c691029d487ea2bcb480481919b8738b2',
 'B02D_acceptance_preserved':'e2ed85b1e62efb1d03106d8c16220e1c059af828',
 'scope':'Engineering and research review of an unqualified local prototype; no final financial/editorial/user acceptance',
 'remaining_external_dependencies':['Trusted immutable document/fact identities and publication history','Authorized independent financial/editorial reviews and third-party source grant evidence','Real engine integration separately blocked; existing B02C/B02D not reopened'],
}
(HERE/'RESULTS.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8')
names=['INDEPENDENT-REVIEW_AR.md','README.md','FINDINGS.json','RESULTS.json','UI-REVIEW.json','RESEARCH-SOURCE-REVIEW.json','SOURCE-BLOB-INTEGRITY.json','SETUP-FAILURES.json','boundaries.test.ts','run_review.py','source_check.py','collect_evidence.py','finalize.py']
names += ['runs/'+p.name for p in sorted((HERE/'runs').glob('*.txt'))]
if (HERE/'CENTRAL-TRACKING-RECEIPT.json').exists():names.append('CENTRAL-TRACKING-RECEIPT.json')
files=[]
for name in names:
 p=HERE/name;b=p.read_bytes()
 assert p.suffix in ['.md','.json','.ts','.py','.txt']
 assert not any(token in b for token in [b'-----BEGIN '+b'PRIVATE KEY-----',b'-----BEGIN '+b'OPENSSH PRIVATE KEY-----'])
 assert not re.search(rb'gh[pousr]_[A-Za-z0-9]{30,}|AKIA[A-Z0-9]{16}|sb_secret_[A-Za-z0-9]{20,}',b),name
 files.append({'path':name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
manifest={'schema':'marefa-safe-review-package/1','application_sha':result['application_sha'],'delivery_sha':result['delivery_sha'],'self_excluded':True,'new_files_code_and_metadata_only':True,'original_pdfs_images_raw_exports_included':False,'files':files}
(HERE/'MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
print(json.dumps({'files':len(files)+1,'decision':result['decision'],'runs':len(tests)}))
