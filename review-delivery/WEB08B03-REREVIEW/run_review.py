"""Independent read-only execution harness. Generated logs are not application edits."""
import subprocess, pathlib, json, datetime, sys, hashlib, os
REVIEW_ROOT = pathlib.Path(__file__).resolve().parents[2]
ROOT = pathlib.Path(os.environ.get('REVIEW_ROOT', str(REVIEW_ROOT)))
BUN = os.environ.get('BUN', 'bun')
OUT = pathlib.Path(__file__).parent / 'runs'
OUT.mkdir(exist_ok=True)
COMMANDS = {
 'b03': [BUN,'test','research-evidence/aramco-disclosures'],
 'b01': [BUN,'test','research-evidence/v1'],
 'b02': [BUN,'test','research-evidence/aramco-qualification'],
 'app': [BUN,'test','tests'],
 'types': [BUN,'node_modules/typescript/bin/tsc','--noEmit'],
 'b03-types': [BUN,'node_modules/typescript/bin/tsc','-p','research-evidence/aramco-disclosures/tsconfig.json','--noEmit'],
 'lint': [BUN,'node_modules/eslint/bin/eslint.js','research-evidence/aramco-disclosures'],
 'check': [BUN,'research-evidence/aramco-disclosures/build.ts','--check'],
 'build': [BUN,'run','build'],
 'independent': [BUN,'test','./review-delivery/WEB08B03-REREVIEW/boundaries.test.ts'],
 'transfer': [BUN,'test','./review-delivery/WEB08B03-REREVIEW/source-transfer.test.ts'],
}
name=sys.argv[1]
started=datetime.datetime.now(datetime.timezone.utc).isoformat()
env=os.environ.copy()
if name=='build':
 for k in ['MAREFA_DESIGN_FIXTURES','ENGINE_PREVIEW_ENABLED','WEB_V1_PREVIEW_ENABLED','ENGINE_PEERS_ENABLED']:env[k]='false'
r=subprocess.run(COMMANDS[name],cwd=ROOT,capture_output=True,env=env)
text=r.stdout.decode('utf8','replace')+r.stderr.decode('utf8','replace')
sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=REVIEW_ROOT,text=True).strip()
metadata={'id':name,'sha':sha,'started':started,'exit':r.returncode,'command':COMMANDS[name]}
log=OUT/(name+'.txt')
log.write_text(json.dumps(metadata)+'\n'+text,encoding='utf8')
print(json.dumps(metadata))
print('\n'.join(text.splitlines()[-12:]))
sys.exit(r.returncode)
