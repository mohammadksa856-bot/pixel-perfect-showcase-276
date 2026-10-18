"""Start the actual author CLI on Windows. No imports/patches/shims. Loopback HTTP only."""
from pathlib import Path
import subprocess,os,platform,time,json,http.client,hashlib
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).parent
BUN='C:/Users/Mohammed856/Documents/Codex/2026-08-31/marefa-unified-20261012/output/br005-runtime/bun/bun-windows-x64-baseline/bun.exe'
assert platform.system()=='Windows'
env=os.environ.copy()
for k in ['BUN_OPTIONS','NODE_OPTIONS','PORT']:env.pop(k,None)
command=[BUN,'research-evidence/aramco-research-experience/server.ts']
process=subprocess.Popen(command,cwd=ROOT,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
checks=[]
def get(path='/',method='GET',host='127.0.0.1:4466',expected=200):
 c=http.client.HTTPConnection('127.0.0.1',4466,timeout=3);c.request(method,path,headers={'Host':host});r=c.getresponse();b=r.read();headers={k.lower():v for k,v in r.getheaders()};c.close()
 assert r.status==expected,(path,method,r.status,expected)
 assert headers.get('cache-control')=='no-store' and "connect-src 'none'" in headers.get('content-security-policy','')
 checks.append(dict(path=path,method=method,host=host,status=r.status,body_bytes=len(b)))
 return b
try:
 ready=False
 for _ in range(100):
  if process.poll() is not None:break
  try:ar=get('/?lang=ar');ready=True;break
  except (OSError,http.client.HTTPException):time.sleep(.1)
 assert ready,'Original CLI did not serve HTTP200'
 en=get('/?lang=en');css=get('/assets/experience.css');get('/assets/fonts/cairo-arabic-400-normal.woff2')
 get(method='HEAD')
 for method in ['POST','PUT','PATCH','DELETE','OPTIONS']:get(method=method,expected=405)
 for host in ['evil.invalid:4466','127.0.0.1','127.0.0.1:4467','localhost.evil.invalid:4466']:get(host=host,expected=421)
 for path in ['/api','/research-evidence/aramco-research-pack/pack.ts','/assets/fonts/unknown.woff2','/.env']:get(path,expected=404)
 assert '<html lang="ar" dir="rtl"' in ar.decode() and '<html lang="en" dir="ltr"' in en.decode()
 old=json.loads(subprocess.check_output(['git','show','b910e1c6d53a5d7d701fd8b6930679d3590abe9f:review-delivery/WEB08B05-INDEPENDENT/AUDIT.json'],cwd=ROOT))
 # HTML links include APP_BASE; prior observer explicitly used5179. Compare new render with that same base separately, not pretend CLI default is identical.
 report=dict(application_sha='a722af40dd9ee6f79588a5f21029ceb2755e9acb',delivery_sha='b9056a3faf8402ce5ffbdd22b2c5f4586cb6fa81',native_windows=True,shim=False,preload=False,command=command,original_cli=True,port=4466,checks=checks,sha256={k:hashlib.sha256(v).hexdigest() for k,v in [('ar',ar),('en',en),('css',css)]},previous_observer_hashes_are_not_native_acceptance=True)
 (OUT/'NATIVE-HTTP.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
 print(json.dumps(dict(native_cli='PASS',checks=len(checks),http=200,shim=False)))
finally:
 process.terminate();output=process.communicate(timeout=10)[0]
 (OUT/'runs'/'native-server.txt').write_bytes(output)
