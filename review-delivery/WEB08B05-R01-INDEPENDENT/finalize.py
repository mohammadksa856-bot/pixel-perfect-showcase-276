from pathlib import Path
import json,re,hashlib,subprocess
OUT=Path(__file__).parent
def dump(name,value):(OUT/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
runs=[]
for p in sorted((OUT/'runs').glob('*.txt')):
 if p.name=='native-server.txt':continue
 text=p.read_text(encoding='utf8');meta=json.loads(text.splitlines()[0])
 for key in ['pass','fail','skip','error']:
  matches=re.findall(r'^\s*(\d+) '+key+r'\b',text,re.M);meta[key]=int(matches[-1]) if matches else 0
 meta['artifact']='runs/'+p.name
 assert meta['exit']==0 and meta['fail']==0 and meta['error']==0
 assert meta['native_windows'] and not meta['shim'] and not meta['preload']
 runs.append(meta)
assert next(r for r in runs if r['run']=='b05')['pass']==42
assert next(r for r in runs if r['run']=='b05')['skip']==0
assert next(r for r in runs if r['run']=='app')['skip']==14
test=OUT/'independent.test.ts'
old=subprocess.check_output(['git','show','b910e1c6d53a5d7d701fd8b6930679d3590abe9f:review-delivery/WEB08B05-INDEPENDENT/independent.test.ts'],cwd=OUT.parents[1])
assert test.read_bytes()==old
proof=json.loads((OUT/'NATIVE-PROOF.json').read_text());assert all(proof['assertions'].values())
http=json.loads((OUT/'NATIVE-HTTP.json').read_text());assert http['native_windows'] and not http['shim']
dump('RESULTS.json',dict(decision='ACCEPT',scope='ENGINEERING_LOCAL_WITHHELD_RESEARCH_READER_ONLY',application_sha='a722af40dd9ee6f79588a5f21029ceb2755e9acb',tested_delivery_sha='b9056a3faf8402ce5ffbdd22b2c5f4586cb6fa81',previous_review='b910e1c6d53a5d7d701fd8b6930679d3590abe9f',runs=runs,windows_native=True,shim=False,preload=False,independent_original_test_sha256=hashlib.sha256(old).hexdigest(),independent_original_test_byte_exact=True,http_observations=len(http['checks']),source_files_read=proof['sourceFilesRead'],routes_actually_read=proof['routeFilesActuallyRead'],unchanged_rendering=proof['assertions'],blocked_analyses=7,withheld_claims=22,withheld_inputs=142,financially_qualified=0,B05_R01='CLOSED',open_engineering_findings=[],engineering_acceptance=True,merged=False,deployed=False,B06_engineering_dependency_satisfied=True,B06_started=False,financial_approval=False,editorial_approval=False,USER_FINAL_ACCEPTANCE=False,PRODUCTION_RELEASE_APPROVAL=False))
dump('FINDINGS.json',[dict(id='B05-R01',previous_severity='P1',state='CLOSED',decision='ACCEPT_WITHIN_SCOPE',evidence=['runs/install.txt','runs/b05.txt','runs/scan.txt','NATIVE-HTTP.json','NATIVE-PROOF.json','SCOPE-ROUTES-HOLDS.json'],reason='Native Windows original CLI HTTP200,42PASS0FAIL0SKIP,default leak scan305files0hits,51actual routes; no shim/preload/source patch')])
# Normalize generated review artifacts to LF before fingerprinting, matching the published Git blobs.
for p in OUT.rglob('*'):
 if p.is_file() and '__pycache__' not in p.parts:
  raw=p.read_bytes();lf=raw.replace(b'\r\n',b'\n')
  if raw!=lf:p.write_bytes(lf)
files=[p for p in OUT.rglob('*') if p.is_file() and p.name!='MANIFEST.json' and '__pycache__' not in p.parts]
dump('MANIFEST.json',dict(schema='independent-review-manifest/1',files=[dict(path=p.relative_to(OUT).as_posix(),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),bytes=p.stat().st_size) for p in sorted(files)]))
print(json.dumps(dict(decision='ACCEPT',runs=len(runs),files=len(files),native_windows=True)))
