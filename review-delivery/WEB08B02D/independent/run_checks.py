import subprocess,json,sys,re
from pathlib import Path
repo=Path(sys.argv[1]).resolve();out=Path(__file__).parent.resolve();logs=out/'logs'
bun='C:/Users/Mohammed856/Documents/Codex/2026-08-31/marefa-unified-20261012/output/br005-runtime/bun/bun-windows-x64-baseline/bun.exe'
commands={'D14':[sys.executable,'-X','utf8','review-delivery/WEB08B02D/test_closeout.py'],
'B01':[bun,'test','./research-evidence/v1'],'B02':[bun,'test','./research-evidence/aramco-qualification'],'B02C':[bun,'test','./research-evidence/engine-bridge'],
'WEB':[bun,'test']+['./tests/'+x+'.test.ts' for x in ['web-03-04','web-05b-boundary','web-06-d11-tabs','web-06-polish','web-07','web-readiness','web07-final-independent-period','web07-independent-provenance']],
'types':[bun,'node_modules/typescript/bin/tsc','-p','review-delivery/WEB08B02D/tsconfig.json','--noEmit'],
'lint':[bun,'node_modules/eslint/bin/eslint.js','review-delivery/WEB08B02D/check_bridge.ts']}
results=[]
for name,cmd in commands.items():
 p=subprocess.run(cmd,cwd=repo,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,encoding='utf-8',errors='replace')
 (logs/(name+'.txt')).write_text('Command: '+json.dumps(cmd)+'\nExit: '+str(p.returncode)+'\n'+p.stdout,encoding='utf-8')
 results.append({'name':name,'exit':p.returncode,'log':'logs/'+name+'.txt','pass_counts':re.findall(r'(\d+) pass',p.stdout),'fail_counts':re.findall(r'(\d+) fail',p.stdout)})
 print(name,p.returncode,flush=True)
(out/'test-results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
