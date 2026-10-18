"""Independent fixed-SHA commands; local-only environment, no production writes."""
from pathlib import Path
import subprocess,os,json,datetime,sys
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).parent/'runs';OUT.mkdir(exist_ok=True)
BUN=os.environ['BUN']
commands={k:[BUN,'test',p] for k,p in {'b05':'research-evidence/aramco-research-experience','b04':'research-evidence/aramco-research-pack','b03':'research-evidence/aramco-disclosures','b01':'research-evidence/v1','b02':'research-evidence/aramco-qualification','app':'tests'}.items()}
commands.update({'types':[BUN,'node_modules/typescript/bin/tsc','--noEmit'],'b05-types':[BUN,'node_modules/typescript/bin/tsc','-p','research-evidence/aramco-research-experience/tsconfig.json','--noEmit'],'b04-types':[BUN,'node_modules/typescript/bin/tsc','-p','research-evidence/aramco-research-pack/tsconfig.json','--noEmit'],'lint':[BUN,'node_modules/eslint/bin/eslint.js','research-evidence/aramco-research-experience','research-evidence/aramco-research-pack'],'build':[BUN,'run','build'],'check':[BUN,'research-evidence/aramco-research-pack/build.ts','--check'],'b03-check':[BUN,'research-evidence/aramco-disclosures/build.ts','--check'],'public-leak':[BUN,'research-evidence/aramco-research-experience/public-leak-scan.ts']})
sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
commands['public-leak-explicit']=[BUN,'research-evidence/aramco-research-experience/public-leak-scan.ts','.vercel/output']
commands['independent']=[BUN,'test','./review-delivery/WEB08B05-INDEPENDENT/independent.test.ts']
commands['native-start']=[BUN,'research-evidence/aramco-research-experience/server.ts']
for name in sys.argv[1:]:
 env=os.environ.copy()
 for key in ['ENGINE_PREVIEW_ENABLED','MAREFA_DESIGN_FIXTURES','ENGINE_PEERS_ENABLED','WEB_V1_PREVIEW_ENABLED']:env[key]='false'
 env['APP_BASE']='http://127.0.0.1:5179'
 stamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
 r=subprocess.run(commands[name],cwd=ROOT,env=env,capture_output=True)
 output=(r.stdout+r.stderr).decode('utf8','replace')
 meta={'run':name,'sha':sha,'started':stamp,'exit':r.returncode,'command':commands[name]}
 (OUT/(name+'.txt')).write_text(json.dumps(meta)+'\n'+output,encoding='utf8',newline='\n')
 print(json.dumps(meta),flush=True);print('\n'.join(output.splitlines()[-7:]),flush=True)
