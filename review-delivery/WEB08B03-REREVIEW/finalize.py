"""Canonical-LF code/metadata package; no private original artifacts."""
from pathlib import Path
import json,re,hashlib
HERE=Path(__file__).resolve().parent
APP='1735609abafa85ee6e101ab7e3640496f0e43088'
DELIVERY='21847fdbd427af23a2b644aeeea92fa4fe9064b9'
def write(name,data):(HERE/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
runs=[]
for p in sorted((HERE/'runs').glob('*.txt')):
 text=p.read_text(encoding='utf8');m=json.loads(text.splitlines()[0])
 assert m['sha']==DELIVERY and m['exit']==0,p.name
 count=lambda k:int(re.search(r'(?m)^ (\d+) '+k+r'\b',text).group(1)) if re.search(r'(?m)^ (\d+) '+k+r'\b',text) else 0
 runs.append(dict(name=m['id'],commit=m['sha'],observed_at=m['started'],exit=m['exit'],passed=count('pass'),failed=count('fail'),skipped=count('skip'),errors=0,artifact='runs/'+p.name))
 # Keep execution logs, but omit machine-specific runtime/user paths from public metadata.
 text=re.sub(r'C:[/\\]Users[/\\]Mohammed856[^"\n]*?bun\.exe','<BUN>',text)
 text=text.replace(str(HERE.parents[1]),'<REVIEW_ROOT>').replace(str(HERE.parents[1]).replace('\\','/'),'<REVIEW_ROOT>')
 p.write_text(text.rstrip()+'\n',encoding='utf8',newline='\n')
result={'schema':'marefa-b03-independent-re-review/1','decision':'ACCEPT','acceptance_scope':'LOCAL_FROZEN_ENGINEERING_PROTOTYPE_ONLY','application_sha':APP,'tested_delivery_sha':DELIVERY,'prior_rework_sha':'dcdecad97c3c8babd67931a817e69d0cd7a7d6d6','branch':'review/web08b03-rereview-20261017','runs':runs,'original_tests_unchanged':True,'original_test_git_blob':'bc8ecb2b50a5f99b9506c711cc6ee06489e4ac84','claims_reviewed':22,'withheld_claims':22,'constructible_real_claims':0,'financially_qualified_claims':0,'B02_inputs_withheld':142,'B02_inputs_unblocked':0,'implementation_modified':False,'B01_or_WEB07_or_engine_modified':False,'financial_approval':False,'editorial_approval':False,'live_integration':'BLOCKED','production_release':'NOT_AUTHORIZED','main_merged':False,'production_or_Supabase_modified':False,'content_deployed':False,'user_final_acceptance':False,'prior_B02C_B02D_acceptances_preserved':True,'setup_failures_this_round':[]}
write('RESULTS.json',result)
names=['README.md','INDEPENDENT-REVIEW_AR.md','FINDINGS.json','RESULTS.json','UI-REVIEW.json','CLAIM-TRANSFER-AUDIT.json','INTEGRITY.json','HTTP-PROOF.json','RESEARCH-DECISIONS.json','boundaries.test.ts','source-transfer.test.ts','demo-server.ts','run_review.py','collect.py','finalize.py']
names += ['runs/'+p.name for p in sorted((HERE/'runs').glob('*.txt'))]
for name in ['CENTRAL-TRACKING-RECEIPT.json','GITHUB-DELIVERY.json']:
 if (HERE/name).exists():names.append(name)
files=[]
for name in names:
 p=HERE/name;b=p.read_bytes().replace(b'\r\n',b'\n')
 assert p.suffix in ['.md','.json','.ts','.py','.txt']
 assert not any(token in b for token in [b'-----BEGIN '+b'PRIVATE KEY-----',b'-----BEGIN '+b'OPENSSH PRIVATE KEY-----'])
 assert not re.search(rb'gh[pousr]_[A-Za-z0-9]{30,}|AKIA[A-Z0-9]{16}|sb_secret_[A-Za-z0-9]{20,}',b),name
 files.append({'path':name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
write('MANIFEST.json',{'schema':'marefa-safe-review-package/1','hash_mode':'UTF8_GIT_BLOBS_LF','self_excluded':True,'application_sha':APP,'delivery_sha':DELIVERY,'new_diff_code_and_metadata_only':True,'private_PDFs_images_exports_environment_files_included':False,'files':files})
print(json.dumps({'decision':result['decision'],'separate_runs':len(runs),'files':len(files)+1,'withheld_claims':22,'withheld_inputs':142}))
