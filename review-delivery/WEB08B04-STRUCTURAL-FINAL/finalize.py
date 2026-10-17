"""Assemble reproducible final review; never change application or historical evidence."""
from pathlib import Path
import hashlib,json,re,subprocess
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
IMPL='8e896378a763f7cb5632ec5bb2963e5313664301'
DELIVERY='c737e9bf76ebe55c0c8bbff15ce87732b987e449'
PREVIOUS='0fe3312c20dd48102515f65b3c5a6fff505b1d01'
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT)
def emit(name,data):(HERE/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
runs=[]
for file in sorted((HERE/'runs').glob('*.txt')):
 text=file.read_text(encoding='utf8')
 meta=json.loads(text.splitlines()[0])
 assert meta['sha']==DELIVERY
 counts={k:int(m.group(1)) if(m:=re.search(r'\b(\d+) '+k+r'\b',text)) else 0 for k in ['pass','fail','skip']}
 runs.append({**meta,**counts,'artifact':'runs/'+file.name})
emit('RESULTS.json',{'decision':'REWORK','scope':'RR-ENG03-01_ONLY','application_sha':IMPL,'tested_delivery_sha':DELIVERY,'previous_review':PREVIOUS,'runs':runs,'FIN01_07':'CLOSED_LIMITED_DRAFT_PRESERVED','LINK01':'CLOSED_FROZEN_MODEL_PRESERVED','RR-ENG02-01':'CLOSED_PRESERVED','blocked_analyses':7,'withheld_claims':22,'withheld_inputs':142,'financially_qualified':0,'financial_approval':False,'editorial_approval':False,'USER_FINAL_ACCEPTANCE':False,'PRODUCTION_RELEASE_APPROVAL':False})
originals={}
for name in ['final-independent.test.ts','edge-probe.ts','residual-independent.test.ts','additional.test.ts','adversarial.test.ts','boundaries.test.ts','b03-original.test.ts','guard-probe.ts']:
 original=git('show',PREVIOUS+':review-delivery/WEB08B04-FINAL-ACCEPTANCE/'+name)
 actual=(HERE/name).read_bytes()
 assert actual==original,name
 originals[name]={'blob':git('rev-parse',PREVIOUS+':review-delivery/WEB08B04-FINAL-ACCEPTANCE/'+name).decode().strip(),'sha256':hashlib.sha256(actual).hexdigest(),'byte_exact':True}
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
for name in ['edge-probe','guard-probe']:
 lines=(HERE/'runs'/(name+'.txt')).read_text(encoding='utf8').splitlines()[1:]
 rows=[json.loads(line) for line in lines if line.startswith('{')]
 assert rows and all(row.get('accepted') is False for row in rows),name
 probes.append({'probe':name,'observations':len(rows),'all_rejected':True,'tested_sha':DELIVERY})
emit('ORIGINAL-PROBES.json',{'probes':probes,'note':'Two original probes, not unique additional test counts; full lexical outputs and intended rejection errors in per-run logs.'})
scope=(ROOT/'review-delivery/WEB08B04/test-logs/scope-and-hashes.txt').read_text(encoding='utf8')
for digest,name in re.findall(r'^([a-f0-9]{64})  (.+)$',scope,re.M):
 assert hashlib.sha256((ROOT/'review-delivery/WEB08B04'/name).read_bytes()).hexdigest()==digest,name
emit('INTEGRITY.json',{'original_files':originals,'implementation_to_delivery_diff':delivery_diff,'delivery_is_documentation_only':True,'protected_reviewer_changes':[],'output_files_unchanged':8,'private_PDF_database_env_uploads':False})
emit('MANIFEST.json',{'schema':'independent-final-review-code-only/1','canonical':'LF Git blobs; excludes manifest itself','files':[{'path':p.relative_to(HERE).as_posix(),'sha256':hashlib.sha256(p.read_bytes().replace(b'\r\n',b'\n')).hexdigest()} for p in sorted(HERE.rglob('*')) if p.is_file() and p.name!='MANIFEST.json']})
print(json.dumps({'runs':len(runs),'originals_byte_exact':len(originals),'outputs_unchanged':len(checks)}))
