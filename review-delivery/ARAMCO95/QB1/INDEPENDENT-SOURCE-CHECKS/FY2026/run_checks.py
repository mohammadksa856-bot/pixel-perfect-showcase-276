"""Separate run receipts; originals stay private and accepted ledgers are not rewritten."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import re
import subprocess
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
NONFIN = HERE.parents[1] / 'NONFINANCIAL'
env = {**os.environ, 'PYTHONUTF8': '1', 'PYTHONIOENCODING': 'utf8', 'PYTHONDONTWRITEBYTECODE': '1'}
runs = []
for name, path, count, scope in [
    ('original-source-read', HERE/'check_original_sources.py', None, '13 original-source observations +3 exact quarter consistency checks +PRefChem bridge; not unit-test count'),
    ('pending-source-update', NONFIN/'SOURCE-CLOSURE/update_pending.py', None, 'Original annual note and scope; six pending records retained'),
    ('source-closure-tests', HERE/'test_source_closure.py', 13, 'Source observation gates and negative identity/unit/period/qualification cases'),
    ('original-nonfin-regression', NONFIN/'test_evidence.py', 18, 'Accepted original structural tests, unchanged'),
    ('remediation-regression', NONFIN/'test_remediation.py', 26, 'Accepted remediation and private original PDF checks, unchanged'),
]:
    started = datetime.now(timezone.utc).isoformat()
    p = subprocess.run([sys.executable, str(path)], cwd=ROOT, env=env, capture_output=True, text=True, encoding='utf8')
    output = p.stdout + p.stderr
    log = HERE / (name + '.txt')
    # No private original text or PDF bytes are written to public logs.
    output = output.replace(str(ROOT), '<OWN_WORKTREE>').replace(str(ROOT.parent), '<LOCAL_PRIVATE_ROOT>')
    log.write_text(output, encoding='utf8', newline='\n')
    n = re.search(r'Ran (\d+) tests?', output)
    skips = re.search(r'skipped=(\d+)', output)
    run = dict(run_id=name, started_at_utc=started, ended_at_utc=datetime.now(timezone.utc).isoformat(),
               scope=scope, command=['python', str(path.relative_to(ROOT)).replace('\\','/')],
               exit_code=p.returncode, tests_run=int(n[1]) if n else None,
               passed=int(n[1]) if n and p.returncode == 0 and not skips else None,
               skipped=int(skips[1]) if skips else 0, log=log.name,
               source_file_sha256=hashlib.sha256(path.read_bytes()).hexdigest())
    if count is not None:
        assert n and int(n[1]) == count
    runs.append(run)
    print(name, p.returncode, run['tests_run'], 'skipped', run['skipped'])
results = dict(schema='qb1-source-closure-test-receipts/1', preparer_checks_not_independent_acceptance=True,
               baseline_commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
               runs=runs, initial_harness_attempts=[
                   dict(status='FAIL_HARNESS_FIXED', reason='YTD fiscal_quarter=2 was incorrectly treated as quarter start in new checking script; source/engine unaffected'),
                   dict(status='FAIL_HARNESS_FIXED', reason='Engine instant empty-string start vs ledger null; now explicitly recorded and normalized without inventing dates')],
               product_build='NOT_RUN_NO_PRODUCT_CODE_CHANGED', browser='NOT_RUN_NO_UI_CHANGED',
               no_claude_financial_files_changed=True)
(HERE/'TEST-RESULTS.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf8')
sys.exit(1 if any(x['exit_code'] for x in runs) else 0)
