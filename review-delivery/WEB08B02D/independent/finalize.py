import json,subprocess,hashlib
from pathlib import Path
out=Path(__file__).parent; repo=Path('work/review'); source='C:/Users/Mohammed856/Documents/Codex/2026-08-31/referenced-chatgpt-conversation-this-is-an/web08b02d-closeout-20261017';sha='92414cc341cf53330862d63bd72d8b11334b0ce1'
tree=subprocess.check_output(['git','-C',source,'ls-tree','-rz',sha]).split(b'\0');n=0
for entry in tree:
 if not entry:continue
 meta,name=entry.split(b'\t');mode,kind,oid=meta.split()
 if kind!=b'blob':continue
 p=repo/name.decode();b=p.read_bytes()
 assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==oid.decode(),name
 n+=1
tests=json.loads((out/'test-results.json').read_text());assert all(t['exit']==0 for t in tests)
result={'decision':'ACCEPT','scope':'ENGINEERING_ADMINISTRATIVE_CLOSEOUT_ONLY','delivery_sha':sha,'implementation_sha':'7ba75414e7cd7c581c84f12f8efd7b58c1efa8e1','isolated_materialization':'git archive core.autocrlf=false; all tracked blob bytes verified','tracked_blobs_verified':n,'independently_reclassified':142,'native_rows_checked':4960,'private_manifest_files_verified':27,'administratively_closed_with_withhold':142,'withheld':142,'qualified':0,'financially_resolved':0,'publication_authorized':False,'production_read_performed':False,'financial_certificate_created':False,'private_amounts_or_media_in_deliverables':False,'bridge':{'attempts':142,'blocked':142,'mapped':0,'boundary':'invalid/incomplete trusted input, not successful fact mapping'},'tests':tests,'setup_failures_separate':['logs/WEB-setup-failure.txt','logs/lint-setup-failure.txt','logs/lint-archive-crlf.txt'],'external_blockers':['Current authorized production read/export unavailable; recorded SSH and GET timeouts do not establish absence','Immutable fact/document version references and knowledge completeness missing','Authorized financial review and approved definitions pending','Third-party rights receipts remain undocumented'],'limits':['Private values compared independently to local native export; source PDF row/column correctness not financially certified','No fresh database capture or network attempt; existing timeout receipts inspected','No executor code, assertions, main, production, AWS, Supabase, engine or 95% policy changed']}
(out/'RESULTS.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'tracked_blobs_verified':n,'decision':'ACCEPT'}))
