"""Write safe review receipts/manifests; no source originals or author files are changed."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import subprocess
import sys
from recover_sources import HERE, ROOT, PRIVATE, ENGINE

delivery='b5010191d4b16cce9c5f885080667bb173e2d9cd'
implementation='1800f4c63f313eac2bb82546e6ccbdd2b9a38f6f'
results=json.loads((HERE/'INDEPENDENT-RESULTS.json').read_text(encoding='utf8'))
authorlog=(HERE/'AUTHOR33-REPLAY.txt').read_text(encoding='utf8')
assert sum(x.startswith('PASS ') for x in authorlog.splitlines())==33
assert not any(x.startswith('FAIL ') for x in authorlog.splitlines())
env={**os.environ,'PYTHONUTF8':'1','PYTHONIOENCODING':'utf8','PYTHONDONTWRITEBYTECODE':'1'}
p=subprocess.run([sys.executable,str(HERE/'reproduce_findings.py')],cwd=ROOT,env=env,capture_output=True,text=True,encoding='utf8')
assert p.returncode==1 and p.stdout.count('FAIL ')==3 and not p.stderr
(HERE/'MINIMAL-REPRO.txt').write_text(p.stdout,encoding='utf8',newline='\n')
assert not subprocess.check_output(['git','diff',delivery,'--','review-delivery/ARAMCO95/QB2/FINANCIAL-HISTORY','review-delivery/ARAMCO95/tools/qb2_hist_build.py','review-delivery/ARAMCO95/tools/qb2_hist_check.py'],cwd=ROOT)
changed=subprocess.check_output(['git','diff','--name-only','1ec8ccd',delivery],cwd=ROOT,text=True).splitlines()
assert len(changed)==9 and all(x.startswith(('review-delivery/ARAMCO95/QB2/FINANCIAL-HISTORY/','review-delivery/ARAMCO95/tools/qb2_')) for x in changed)
inventory=json.loads((HERE/'GATE-SOURCE-INVENTORY.json').read_text(encoding='utf8'))
receipt=dict(schema='qb2-independent-execution-receipts/1',observed_at_utc=datetime.now(timezone.utc).isoformat(),
 application_sha=implementation,delivery_sha=delivery,decision='TARGETED_REWORK',
 runs=[dict(id='AUTHOR33_UNMODIFIED',scope='Author33original assertions at clean fixedDelivery before review files added',passed=33,failed=0,skipped=0,
            log='AUTHOR33-REPLAY.txt',file_sha256=hashlib.sha256((ROOT/'review-delivery/ARAMCO95/tools/qb2_hist_check.py').read_bytes()).hexdigest()),
       dict(id='INDEPENDENT_ROW_PERIOD_EVIDENCE',scope='42row/column checks,42engine identity/absence checks,17originalFY2024 and counts/withholding/scope',
            passed=results['passed'],failed=results['failed'],skipped=0,log='INDEPENDENT-CHECKS.txt'),
       dict(id='MINIMAL_METADATA_REPRO',scope='Repeat3failed assertions for2findings; not3additionaldistinct defects',exit_code=p.returncode,
            assertions_failed=3,log='MINIMAL-REPRO.txt'),
       dict(id='RECOVERED_SOURCE_HASH_AND_IDENTITY',scope='New private source recovery, not self-acceptance or financial qualification',
            documents_checked=inventory['original_pdf_count'],failed=0,source='GATE-SOURCE-INVENTORY.json')],
 review_harness_setup_failure=dict(scope='New Codex recovery inventory only',original_attempt='Issuer name check restricted to first3pages failed on image-only covers',
                                  correction='Inspect first12pages for issuer identity; original files and financial values unchanged'),
 network_failures=[dict(scope='Original issuer report-index HTML only',reason='Timeout; no original HTML digest or link-discovery success claimed')],
 no_product_build_or_browser='NOT_RUN_NO_PRODUCT_CHANGES',new_recovery_self_accepted=False,
 author_files_byte_unchanged=True,engine_tracked_files_unchanged=True,engine_read_mode='immutable read-only',
 holds=[7,22,142,0],financially_qualified=0,no_merge=True,no_deploy=True)
(HERE/'EXECUTION-RECEIPTS.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
entries=[]
for path in sorted(HERE.iterdir()):
    if not path.is_file() or path.name=='REVIEW-MANIFEST.json':continue
    assert path.suffix in ['.py','.md','.txt','.json']
    data=path.read_bytes()
    entries.append(dict(path=path.relative_to(ROOT).as_posix(),bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
manifest=dict(schema='qb2-independent-review-safe-manifest/1',application_sha=implementation,delivery_sha=delivery,
 entries=entries,hash_basis='Exact UTF8 working files written with LF; excludes manifest itself and private originals',
 original_pdfs_included=False,original_html_included=False,private_git_history_exported=False)
(HERE/'REVIEW-MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(dict(decision='TARGETED_REWORK',review_files_hashed=len(entries),author_files_unchanged=True,
                     original_recovery_count=inventory['original_pdf_count'],author_tests=[33,0,0],independent=[results['passed'],results['failed'],0])))
