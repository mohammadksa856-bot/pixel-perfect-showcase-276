"""Assemble independent evidence and LF manifest without touching application code."""
from pathlib import Path
import json,re,subprocess,hashlib
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[1]
def emit(name,x):(HERE/name).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
runs=[]
for file in sorted((HERE/'runs').glob('*.txt')):
 text=file.read_text(encoding='utf8');meta=json.loads(text.splitlines()[0]);counts={k:int(m.group(1)) if(m:=re.search(r'\b(\d+) '+k+r'\b',text)) else 0 for k in ['pass','fail','skip']}
 runs.append({**meta,**counts,'artifact':'runs/'+file.name})
emit('RESULTS.json',{'decision':'REWORK','scope':'RESIDUAL_NUMERIC_AND_PERIOD_GUARDS_ONLY','application_sha':'49eeed82b84d9e071a49b91b1c959e4f13a7b82b','tested_delivery_sha':'f46a2925376b59c7686ee4a23c3128506229792b','previous_review':'fa3a772daabaaecb44ee2eff842bb88456025f62','runs':runs,'research_findings_FIN01_07':'CLOSED_LIMITED_DRAFT','LINK01':'CLOSED_FROZEN_MODEL_ONLY','withheld_claims':22,'withheld_inputs':142,'blocked_analyses':7,'financially_qualified':0,'USER_FINAL_ACCEPTANCE':False,'PRODUCTION_RELEASE_APPROVAL':False})
blobs={file:subprocess.check_output(['git','hash-object',str(HERE/file)],cwd=ROOT,text=True).strip() for file in ['adversarial.test.ts','boundaries.test.ts','b03-original.test.ts']}
assert blobs['adversarial.test.ts']=='4078c3c4f42e9b8883aeee23f9cd559a8be1cdd4'
assert blobs['boundaries.test.ts']==blobs['b03-original.test.ts']=='bc8ecb2b50a5f99b9506c711cc6ee06489e4ac84'
protected=subprocess.check_output(['git','diff','--name-only','49eeed82','f46a292','--','src','config','research-evidence','tests'],cwd=ROOT,text=True).strip();assert not protected
emit('INTEGRITY.json',{'original_test_blobs':blobs,'implementation_to_delivery_protected_code_diff':protected,'reviewer_protected_worktree_diff':subprocess.check_output(['git','diff','--name-only','f46a292','--','src','config','research-evidence','tests'],cwd=ROOT,text=True).strip(),'no_PDF_raw_database_env_or_original_document_uploaded':True})
scope=(ROOT/'review-delivery/WEB08B04/test-logs/scope-and-hashes.txt').read_text(encoding='utf8');checks=[]
for digest,name in re.findall(r'^([a-f0-9]{64})  (.+)$',scope,re.M):
 p=ROOT/'review-delivery/WEB08B04'/name
 actual=hashlib.sha256(p.read_bytes()).hexdigest();assert actual==digest,name
 checks.append({'path':name,'sha256':actual,'verified':True})
emit('DELIVERY-HASHES.json',{'checks':checks})
emit('MANIFEST.json',{'schema':'independent-rereview-code-only/1','canonical':'LF Git blobs; excludes manifest itself','files':[{'path':p.relative_to(HERE).as_posix(),'sha256':hashlib.sha256(p.read_bytes().replace(b'\r\n',b'\n')).hexdigest()} for p in sorted(HERE.rglob('*')) if p.is_file() and p.name!='MANIFEST.json']})
print(json.dumps({'runs':len(runs),'original_files_unchanged':len(blobs),'deliverable_hashes':len(checks)}))
