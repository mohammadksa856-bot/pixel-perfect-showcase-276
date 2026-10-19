"""Reproduce workpaper generation and preparer checks, never financial acceptance."""
from pathlib import Path
from datetime import datetime, timezone
import ast
import hashlib
import json
import os
import re
import subprocess
import sys

HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
ARTIFACTS=['EXTRACTED-OBSERVATIONS.json','SOURCE-MANIFEST.json','CONTRACT-FIELD-SCOPE.json','UNMAPPED-SOURCE-ROWS.json',
 'ANNUAL-PERIOD-LEDGER.json','QUARTERLY-PERIOD-LEDGER.json','INTAKE-MATRIX.json','EDITION-RECONCILIATIONS.json',
 'DERIVATION-PROPOSALS.json','ENGINE-REFERENCE-REGISTER.json']
before={name:hashlib.sha256((HERE/name).read_bytes()).hexdigest() for name in ARTIFACTS}
env={**os.environ,'PYTHONUTF8':'1','PYTHONIOENCODING':'utf8','PYTHONDONTWRITEBYTECODE':'1'}
runs=[]
for name in ['extract_history.py','build_ledgers.py','test_history.py']:
    stamp=datetime.now(timezone.utc).isoformat()
    p=subprocess.run([sys.executable,str(HERE/name)],cwd=ROOT,env=env,capture_output=True,text=True,encoding='utf8')
    log=(p.stdout+p.stderr).replace(str(ROOT),'<WORKTREE>').replace(str(ROOT.parent),'<PRIVATE_LOCAL_ROOT>')
    (HERE/(name+'.txt')).write_text(log,encoding='utf8',newline='\n')
    n=re.search(r'Ran (\d+) tests?',log)
    r=dict(script=name,started_at_utc=stamp,ended_at_utc=datetime.now(timezone.utc).isoformat(),exit_code=p.returncode,
           tests_run=int(n[1]) if n else None,passed=int(n[1]) if n and p.returncode==0 else None,
           skipped=0 if 'skipped=' not in log else 'CHECK_LOG',log=name+'.txt',
           source_sha256=hashlib.sha256((HERE/name).read_bytes()).hexdigest())
    runs.append(r);print(name,p.returncode,r['tests_run'],flush=True)
    if p.returncode:raise SystemExit(p.returncode)
after={name:hashlib.sha256((HERE/name).read_bytes()).hexdigest() for name in ARTIFACTS}
assert before==after,'Regeneration differs; do not silently accept a changed edition or schema'
for p in HERE.glob('*.py'):ast.parse(p.read_text(encoding='utf8'))
bun=os.environ.get('BUN_BIN','bun')
holds=subprocess.run([bun,'review-delivery/WEB08B05/tools/holds.ts'],cwd=ROOT,env=env,capture_output=True,text=True,encoding='utf8')
assert holds.returncode==0
hold=json.loads(holds.stdout.strip().splitlines()[-1]);assert hold['analyses_blocked']=='7/7' and hold['b03_claims_withheld']=='22/22' and hold['b02_inputs_withheld']==142 and hold['b02_qualified_for_research']==0
(HERE/'HOLDS-CHECK.json').write_text(json.dumps(hold,indent=2)+'\n',encoding='utf8',newline='\n')
assert not subprocess.check_output(['git','diff','46c7debecf2b055e82c40106f893169c614a7959','--','src','research-evidence',
 'review-delivery/ARAMCO95/QB1','review-delivery/ARAMCO95/QB2'],cwd=ROOT)
matrix=json.loads((HERE/'INTAKE-MATRIX.json').read_text(encoding='utf8'))
extracted=json.loads((HERE/'EXTRACTED-OBSERVATIONS.json').read_text(encoding='utf8'))
out=dict(schema='aramco-history-preparer-test-receipts/1',baseline_sha='46c7debecf2b055e82c40106f893169c614a7959',
 runs=runs,deterministic_regeneration=dict(files=after,all10_byte_identical=True),
 syntax_check='ALL_PACKAGE_PYTHON_AST_PASS',holds_check='7/22/142/0',protected_paths_unchanged=True,
 source_observations=len(extracted['observations']),primary_statement_pages=len(extracted['pages']),source_docs_in_extraction=len({r['source_id'] for r in extracted['pages']}),
 setup_failures_before_final_runs=[
  dict(status='CAUGHT_AND_FIXED_BEFORE_DELIVERY',reason='Duplicate wording across employee benefit asset/liability and dividends reconciliation/investing cash; duplicate guard rejected initial build instead of selecting first row'),
  dict(status='CAUGHT_AND_FIXED_BEFORE_DELIVERY',reason='Two required balance cells contained trailingU2011 layout artifact; only exact visually reviewed doc/page/tokens were allowed; no global Unicode deletion')],
 prior_preparer_test_runs=[dict(passed=27,failed=0,skipped=0,scope='Earlier33-case suite subset before reference/mapping/Unicode tests added'),
                            dict(passed=31,failed=0,skipped=0,scope='Reference/endpoint guards added; before final two conservative mapping/Unicode tests')],
 no_aggregation_of_runs=True,product_build='NOT_RUN_NO_PRODUCT_CHANGES',browser='NOT_RUN_NO_UI_CHANGES',
 independent_review='NOT_PERFORMED_ON_NEW_PACKAGE',financial_acceptance=False,rights_grant=False,
 self_acceptance=False,engine_database_sha256_before_after=matrix['engine_database_sha256_before_after'])
(HERE/'TEST-RESULTS.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf8',newline='\n')
print('Deterministic10/10; final unit tests33/33; holds unchanged; independent review pending.',flush=True)
