"""Independent native-Windows commands. No shim, preload, source edits, or production access."""
from pathlib import Path
import subprocess,os,json,datetime,sys,platform,hashlib
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).parent
(OUT/'runs').mkdir(exist_ok=True)
BUN='C:/Users/Mohammed856/Documents/Codex/2026-08-31/marefa-unified-20261012/output/br005-runtime/bun/bun-windows-x64-baseline/bun.exe'
sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
assert sha=='b9056a3faf8402ce5ffbdd22b2c5f4586cb6fa81'
assert platform.system()=='Windows'
commands={k:[BUN,'test',p] for k,p in {'b05':'research-evidence/aramco-research-experience','b04':'research-evidence/aramco-research-pack','b03':'research-evidence/aramco-disclosures','b01':'research-evidence/v1','b02':'research-evidence/aramco-qualification','app':'tests','independent':'./review-delivery/WEB08B05-R01-INDEPENDENT/independent.test.ts'}.items()}
commands.update({'install':[BUN,'install','--frozen-lockfile'],'build':[BUN,'run','build'],'scan':[BUN,'research-evidence/aramco-research-experience/public-leak-scan.ts'],'types':[BUN,'node_modules/typescript/bin/tsc','--noEmit'],'b05-types':[BUN,'node_modules/typescript/bin/tsc','-p','research-evidence/aramco-research-experience/tsconfig.json','--noEmit'],'lint':[BUN,'node_modules/eslint/bin/eslint.js','research-evidence/aramco-research-experience','research-evidence/aramco-research-pack'],'b04-check':[BUN,'research-evidence/aramco-research-pack/build.ts','--check'],'b03-check':[BUN,'research-evidence/aramco-disclosures/build.ts','--check']})
commands['native-proof']=[BUN,'review-delivery/WEB08B05-R01-INDEPENDENT/native_proof.ts']
old=subprocess.check_output(['git','show','b910e1c6d53a5d7d701fd8b6930679d3590abe9f:review-delivery/WEB08B05-INDEPENDENT/independent.test.ts'],cwd=ROOT)
testfile=OUT/'independent.test.ts'
if not testfile.exists():testfile.write_bytes(old)
assert testfile.read_bytes()==old
for name in sys.argv[1:]:
 env=os.environ.copy()
 for k in ['BUN_OPTIONS','NODE_OPTIONS']:env.pop(k,None)
 for k in ['ENGINE_PREVIEW_ENABLED','MAREFA_DESIGN_FIXTURES','ENGINE_PEERS_ENABLED','WEB_V1_PREVIEW_ENABLED']:env[k]='false'
 r=subprocess.run(commands[name],cwd=ROOT,env=env,capture_output=True)
 text=(r.stdout+r.stderr).decode('utf8','replace')
 meta=dict(run=name,sha=sha,platform=platform.platform(),os=platform.system(),native_windows=True,shim=False,preload=False,observed_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),command=commands[name],exit=r.returncode)
 (OUT/'runs'/(name+'.txt')).write_text(json.dumps(meta)+'\n'+text,encoding='utf8',newline='\n')
 print(json.dumps(meta),flush=True);print('\n'.join(text.splitlines()[-9:]),flush=True)
