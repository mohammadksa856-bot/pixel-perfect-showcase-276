"""Read-only Git, native route enumeration, input state and output preservation audit."""
from pathlib import Path
import subprocess,json,hashlib,re,platform
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).parent
BASE='8c279250235f50bd9106b55a6314dce4edc6a08d';PREVIOUS='3681aa0d084f31fc6bc6e05faa4c75db13b7b855'
IMPL='a722af40dd9ee6f79588a5f21029ceb2755e9acb';DELIVERY='b9056a3faf8402ce5ffbdd22b2c5f4586cb6fa81'
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT).decode().strip()
def blob(sha,p):return subprocess.check_output(['git','show',sha+':'+p],cwd=ROOT)
assert platform.system()=='Windows'
assert git('rev-parse','HEAD')==DELIVERY
assert git('merge-base',BASE,DELIVERY)==BASE
fix=git('diff','--name-only',PREVIOUS,IMPL).splitlines()
assert len(fix)==6 and all(p.startswith('research-evidence/aramco-research-experience/') for p in fix)
delivery_paths=git('diff','--name-only',IMPL,DELIVERY).splitlines()
assert all(p.startswith('review-delivery/WEB08B05/') or p=='product-tracking/CHANGELOG.jsonl' for p in delivery_paths)
protected=['src','supabase','config','tests','package.json','bun.lock','vite.config.ts','research-evidence/aramco-research-pack','research-evidence/aramco-disclosures','research-evidence/v1','research-evidence/aramco-qualification']
assert not git('diff','--name-only',BASE,DELIVERY,'--',*protected)
unchanged={}
for name in ['ui.tsx','model.ts','copy.ts','components.css','server.ts','experience.test.ts']:
 p='research-evidence/aramco-research-experience/'+name
 a,b=blob(PREVIOUS,p),blob(DELIVERY,p);assert a==b
 unchanged[p]=hashlib.sha256(b).hexdigest()
routes=[p for p in (ROOT/'src'/'routes').rglob('*') if p.is_file() and p.suffix in {'.ts','.tsx','.js','.json','.css'}]
assert len(routes)>30 and ROOT/'src'/'routes'/'__root.tsx' in routes
for p in routes:
 t=p.read_text(encoding='utf8');assert 'research-experience' not in t
 # Independently count actual read and hashed files, not only selected paths.
route_hashes=[dict(path=p.relative_to(ROOT).as_posix(),sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in sorted(routes)]
assert all('\\' in str(p) for p in routes)
pathname_hits=[]
for p in (ROOT/'research-evidence'/'aramco-research-experience').glob('*'):
 if p.suffix not in {'.ts','.tsx'} or p.name.endswith('.test.ts'):continue
 for n,line in enumerate(p.read_text(encoding='utf8').splitlines(),1):
  if re.search(r'\.pathname\b',line) and not line.strip().startswith(('*','//')):
   pathname_hits.append(dict(file=p.name,line=n,text=line.strip()));assert p.name=='server.ts' and 'u.pathname' in line
b02=json.loads((ROOT/'review-delivery/WEB08B02/QUALIFIED-WITHHELD-INPUT-REGISTER-v4.json').read_text(encoding='utf8'))
assert len(b02['results'])==142 and all(x['qualification']['state']=='WITHHELD' for x in b02['results']) and b02['qualified_for_research']==0
receipt=json.loads((ROOT/'review-delivery/WEB08B04-RAW-CF-FINAL/CENTRAL-TRACKING-RECEIPT.json').read_text())
assert receipt['event_sequence']==110 and receipt['decision']=='ACCEPT'
report=dict(application_sha=IMPL,delivery_sha=DELIVERY,base=BASE,previous_review='b910e1c6d53a5d7d701fd8b6930679d3590abe9f',fix_files=fix,delivery_files=delivery_paths,protected_paths_unchanged=protected,unchanged_view_and_security_hashes=unchanged,platform=platform.platform(),native_windows=True,route_files_actually_read=len(routes),windows_path_separators_verified=True,root_route_found=True,routes=route_hashes,pathname_code_remaining=pathname_hits,B04_acceptance_preserved=True,withheld_inputs=142,financially_qualified=0)
(OUT/'SCOPE-ROUTES-HOLDS.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(dict(scope='PASS',native_windows=True,route_files=len(routes),fix_files=len(fix),remaining_pathname='HTTP paths only',inputs_withheld=142)))
