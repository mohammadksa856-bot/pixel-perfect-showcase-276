"""Assemble reproducible final review; never change application or historical evidence."""
from pathlib import Path
import hashlib,json,re,subprocess
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
IMPL='946d7b48a06048e146b31825d88690aad93773e8'
DELIVERY='69714002f9279271be447b7bcf5fc12e0eb41a6a'
PREVIOUS='b58ecc24af7055eb86a569ca99d7d3813a0868f7'
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT)
def emit(name,data):(HERE/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
runs=[]
for file in sorted((HERE/'runs').glob('*.txt')):
 text=file.read_text(encoding='utf8')
 meta=json.loads(text.splitlines()[0])
 assert meta['sha']==DELIVERY
 counts={k:int(m.group(1)) if(m:=re.search(r'\b(\d+) '+k+r'\b',text)) else 0 for k in ['pass','fail','skip']}
 runs.append({**meta,**counts,'artifact':'runs/'+file.name})
assert all(run['exit']==0 and run['fail']==0 for run in runs)
emit('RESULTS.json',{'decision':'ACCEPT','scope':'ENGINEERING_RESEARCH_LOCAL_DRAFT_ONLY_RAW_CF_CLOSURE','application_sha':IMPL,'tested_delivery_sha':DELIVERY,'previous_review':PREVIOUS,'runs':runs,'FIN01_07':'CLOSED_LIMITED_DRAFT_PRESERVED','LINK01':'CLOSED_FROZEN_MODEL_PRESERVED','RR-ENG02-01':'CLOSED_PRESERVED','blocked_analyses':7,'withheld_claims':22,'withheld_inputs':142,'financially_qualified':0,'financial_approval':False,'editorial_approval':False,'USER_FINAL_ACCEPTANCE':False,'PRODUCTION_RELEASE_APPROVAL':False})
originals={}
for name in ['structural-independent.test.ts','mask-probe.ts','final-independent.test.ts','edge-probe.ts','residual-independent.test.ts','additional.test.ts','adversarial.test.ts','boundaries.test.ts','b03-original.test.ts','guard-probe.ts']:
 original=git('show',PREVIOUS+':review-delivery/WEB08B04-STRUCTURAL-FINAL/'+name)
 actual=(HERE/name).read_bytes()
 assert actual==original,name
 originals[name]={'blob':git('rev-parse',PREVIOUS+':review-delivery/WEB08B04-STRUCTURAL-FINAL/'+name).decode().strip(),'sha256':hashlib.sha256(actual).hexdigest(),'byte_exact':True}
delivery_diff=git('diff','--name-only',IMPL,DELIVERY).decode().splitlines()
assert all(p=='product-tracking/CHANGELOG.jsonl' or p.startswith('review-delivery/WEB08B04/') for p in delivery_diff)
assert not git('diff','--name-only',IMPL,DELIVERY,'--','src','config','research-evidence','tests').strip()
assert not git('diff','--name-only',DELIVERY,'--','src','config','research-evidence','tests').strip()
outputs=['RESEARCH-DRAFT_AR.md','RESEARCH-DRAFT_EN.md','EVIDENCE-MAP.json','FINANCIAL-STRUCTURE.json','GAP-REGISTER.json','TOPIC-MAP.json','MAREFA-DATA-LINKS.json','PROJECTS.json']
checks=[]
for name in outputs:
 rel='review-delivery/WEB08B04/'+name
 prior=git('show','acd116c:'+rel)
 current=git('show',DELIVERY+':'+rel)
 assert current==prior== (ROOT/rel).read_bytes(),name
 checks.append({'path':rel,'sha256':hashlib.sha256(current).hexdigest(),'unchanged_since_acd116c':True})
emit('OUTPUT-HASHES.json',{'checks':checks})
probes=[]
for name in ['mask-probe','edge-probe','guard-probe']:
 lines=(HERE/'runs'/(name+'.txt')).read_text(encoding='utf8').splitlines()[1:]
 rows=[json.loads(line) for line in lines if line.startswith('{')]
 assert rows and all(row.get('accepted') is False for row in rows),name
 probes.append({'probe':name,'observations':len(rows),'all_rejected':True,'tested_sha':DELIVERY})
emit('ORIGINAL-PROBES.json',{'probes':probes,'note':'Three original probes, not unique additional test counts; full lexical outputs and intended rejection errors in per-run logs.'})
scope=(ROOT/'review-delivery/WEB08B04/test-logs/scope-and-hashes.txt').read_text(encoding='utf8')
for digest,name in re.findall(r'^([a-f0-9]{64})  (.+)$',scope,re.M):
 assert hashlib.sha256((ROOT/'review-delivery/WEB08B04'/name).read_bytes()).hexdigest()==digest,name
emit('INTEGRITY.json',{'original_files':originals,'implementation_to_delivery_diff':delivery_diff,'delivery_is_documentation_only':True,'protected_reviewer_changes':[],'output_files_unchanged':8,'private_PDF_database_env_uploads':False})
scope=git('diff','--name-only','8e89637',IMPL,'--','research-evidence','src','tests','config').decode().splitlines()
allowed={'research-evidence/aramco-research-pack/pack.ts','research-evidence/aramco-research-pack/raw-format-control.test.ts','research-evidence/aramco-research-pack/README_AR.md'}
assert set(scope)==allowed,scope
preserved=[]
for name in ['numeric-guard.ts','iso4217.ts','evidence.ts']:
 rel='research-evidence/aramco-research-pack/'+name
 assert git('show','8e89637:'+rel)==git('show',IMPL+':'+rel)
 preserved.append({'path':rel,'unchanged_since_8e89637':True,'sha256':hashlib.sha256(git('show',IMPL+':'+rel)).hexdigest()})
emit('CLOSED-SCOPE-PRESERVATION.json',{'changed_paths_since_8e89637':scope,'unchanged_guard_dictionary_and_periods':preserved,'FIN01_07':'CLOSED_LIMITED_DRAFT_PRESERVED','LINK01':'CLOSED_FROZEN_MODEL_PRESERVED','RR-ENG02-01':'CLOSED_PRESERVED','ISO_full_set':'Prior verified178/missing[]/extra[] acceptance retained; unchanged dictionary hash, not a new network fetch','ISO_acceptance_reference':'b58ecc24af7055eb86a569ca99d7d3813a0868f7:review-delivery/WEB08B04-STRUCTURAL-FINAL/ISO-SET-COMPARISON.json','application_code_modified_by_reviewer':False})
emit('MANIFEST.json',{'schema':'independent-final-review-code-only/1','canonical':'LF Git blobs; excludes manifest itself','files':[{'path':p.relative_to(HERE).as_posix(),'sha256':hashlib.sha256(p.read_bytes().replace(b'\r\n',b'\n')).hexdigest()} for p in sorted(HERE.rglob('*')) if p.is_file() and p.name!='MANIFEST.json']})
print(json.dumps({'runs':len(runs),'originals_byte_exact':len(originals),'outputs_unchanged':len(checks)}))
