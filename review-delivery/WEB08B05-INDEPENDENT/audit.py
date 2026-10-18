"""Fixed SHA scope and loopback-only HTTP observations. No production access."""
from pathlib import Path
import subprocess,json,hashlib,http.client,re
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).parent
BASE='8c279250235f50bd9106b55a6314dce4edc6a08d'; IMPL='8fb84fb7c804d0591f1bc7f7b9949ed929c6706d'; DELIVERY='3681aa0d084f31fc6bc6e05faa4c75db13b7b855'
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT).decode('utf8').strip()
code=git('diff','--name-only',BASE,IMPL).splitlines(); docs=git('diff','--name-only',IMPL,DELIVERY).splitlines()
assert git('merge-base',BASE,IMPL)==BASE
assert all(p.startswith('research-evidence/aramco-research-experience/') for p in code)
assert all(p.startswith('review-delivery/WEB08B05/') or p=='product-tracking/CHANGELOG.jsonl' for p in docs)
assert not git('diff','--name-only',BASE,DELIVERY,'--','src','research-evidence/aramco-research-pack','research-evidence/aramco-disclosures','research-evidence/v1','config')
app_sources=[p for p in (ROOT/'src').rglob('*') if p.is_file() and p.suffix in {'.ts','.tsx','.js','.css','.json'}]
assert len(app_sources)>50
for p in app_sources:assert not re.search(r'aramco-research-(pack|experience)|research-evidence/',p.read_text(encoding='utf8'))
receipt=json.loads((ROOT/'review-delivery/WEB08B04-RAW-CF-FINAL/CENTRAL-TRACKING-RECEIPT.json').read_text())
assert receipt['decision']=='ACCEPT' and receipt['event_sequence']==110
original_receipt=subprocess.check_output(['git','show',BASE+':review-delivery/WEB08B04-RAW-CF-FINAL/CENTRAL-TRACKING-RECEIPT.json'],cwd=ROOT)
assert original_receipt==(ROOT/'review-delivery/WEB08B04-RAW-CF-FINAL/CENTRAL-TRACKING-RECEIPT.json').read_bytes()
checks=[]
def request(path='/',method='GET',host='127.0.0.1:4491',expected=200):
 c=http.client.HTTPConnection('127.0.0.1',4491,timeout=10);c.request(method,path,headers={'Host':host});r=c.getresponse();b=r.read();h=dict((k.lower(),v) for k,v in r.getheaders());c.close()
 assert r.status==expected,(path,method,host,r.status,expected)
 assert h.get('cache-control')=='no-store'; assert "connect-src 'none'" in h['content-security-policy']; assert 'access-control-allow-origin' not in h
 checks.append(dict(path=path,method=method,host=host,status=r.status,expected=expected,bytes=len(b)))
 return b,h
ar,_=request();en,_=request('/?lang=en');css,_=request('/assets/experience.css')
for host in ['evil.invalid:4491','localhost.evil.invalid:4491','127.0.0.1:4492','127.0.0.1','[::1]:4491','127.0.0.1:4491@evil.invalid'] :request(host=host,expected=421)
for method in ['POST','PUT','DELETE','PATCH','OPTIONS']:request(method=method,expected=405)
request(method='HEAD')
for path in ['/api','/research-evidence/aramco-research-pack/pack.ts','/assets/fonts/unknown.woff2','/.env','/preview/web-v1','/assets/%2e%2e/pack.ts']:request(path,expected=404)
for h in [ar.decode(),en.decode()]:
 assert not re.search(r'<(?:script|iframe|form)\b',h)
 assert not re.search(r'(?:href|src)="(?:javascript:|data:text/html)',h)
 assert h.count('data-paragraph="')==99
 assert 'data-status="BLOCKED"' in h
 # Private research is expected here, not in public build; never write full HTML to report.
assert b'UNAPPROVED_RESEARCH_DRAFT' not in css
report=dict(application=IMPL,delivery=DELIVERY,base=BASE,code_paths=code,delivery_paths=docs,base_acceptance_verified=True,central_event110=receipt['event_sha256'],protected_paths_unchanged=True,app_sources_without_private_import=len(app_sources),http_mode='INSTRUMENTED_CSS_BASE_PATH_ONLY_NOT_NATIVE_ACCEPTANCE',http_checks=checks,html_sha256={lang:hashlib.sha256(value).hexdigest() for lang,value in [('ar',ar),('en',en)]},css_sha256=hashlib.sha256(css).hexdigest())
(OUT/'AUDIT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(dict(scope='PASS',base_acceptance='PASS',http_checks=len(checks),mode=report['http_mode'])))
