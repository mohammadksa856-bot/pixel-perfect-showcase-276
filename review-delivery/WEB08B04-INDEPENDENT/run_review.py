"""Independent commands, one immutable SHA per run; no application edits."""
import subprocess,pathlib,json,datetime,os,sys
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=pathlib.Path(__file__).parent/'runs'; OUT.mkdir(exist_ok=True)
BUN=os.environ['BUN']
commands={k:[BUN,'test',p] for k,p in {'b04':'research-evidence/aramco-research-pack','b03':'research-evidence/aramco-disclosures','b01':'research-evidence/v1','b02':'research-evidence/aramco-qualification','app':'tests','original15':'./review-delivery/WEB08B04-INDEPENDENT/boundaries.test.ts','independent':'./review-delivery/WEB08B04-INDEPENDENT/adversarial.test.ts'}.items()}
commands.update({'types':[BUN,'node_modules/typescript/bin/tsc','--noEmit'],'b04-types':[BUN,'node_modules/typescript/bin/tsc','-p','research-evidence/aramco-research-pack/tsconfig.json','--noEmit'],'lint':[BUN,'node_modules/eslint/bin/eslint.js','research-evidence/aramco-research-pack'],'build':[BUN,'run','build'],'check':[BUN,'research-evidence/aramco-research-pack/build.ts','--check'],'b03-check':[BUN,'research-evidence/aramco-disclosures/build.ts','--check']})
sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
for name in sys.argv[1:]:
 started=datetime.datetime.now(datetime.timezone.utc).isoformat()
 env=os.environ.copy()
 for key in ['ENGINE_PREVIEW_ENABLED','MAREFA_DESIGN_FIXTURES','ENGINE_PEERS_ENABLED','WEB_V1_PREVIEW_ENABLED']:env[key]='false'
 r=subprocess.run(commands[name],cwd=ROOT,env=env,capture_output=True)
 output=(r.stdout+r.stderr).decode('utf8','replace')
 meta={'run':name,'sha':sha,'started':started,'exit':r.returncode,'command':commands[name]}
 (OUT/(name+'.txt')).write_text(json.dumps(meta)+'\n'+output,encoding='utf8',newline='\n')
 print(json.dumps(meta),flush=True);print('\n'.join(output.splitlines()[-8:]),flush=True)
