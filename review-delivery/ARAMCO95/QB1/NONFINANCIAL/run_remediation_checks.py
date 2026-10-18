"""Run separately counted structural and source-check suites; never claims independent acceptance."""
from pathlib import Path
import json,os,re,subprocess,sys
HERE=Path(__file__).resolve().parent
out=[]
for filename,scope in [('test_evidence.py','original structural suite, unchanged'),('test_remediation.py','change regression and separate original-source reader')]:
 env={**os.environ,'PYTHONUTF8':'1','PYTHONIOENCODING':'utf8'}
 p=subprocess.run([sys.executable,str(HERE/filename)],cwd=HERE,env=env,capture_output=True,text=True,encoding='utf8')
 log=p.stdout+p.stderr
 (HERE/('REMEDIATION-'+filename+'.txt')).write_text(log,encoding='utf8',newline='\n')
 n=re.search(r'Ran (\d+) tests?',log)
 out.append(dict(suite=filename,scope=scope,exit_code=p.returncode,tests_run=int(n[1]) if n else None,passed=int(n[1]) if n and p.returncode==0 else None,skipped=len(re.findall(r'\.\.\. skipped',log)),preparer_not_acceptance=True))
 print(filename,p.returncode,n[1] if n else 'unknown');print(log if p.returncode else '')
(HERE/'REMEDIATION-TEST-RESULTS.json').write_text(json.dumps(dict(suites=out,independent_acceptance=False),indent=2)+'\n',encoding='utf8',newline='\n')
sys.exit(1 if any(r['exit_code'] for r in out) else 0)
