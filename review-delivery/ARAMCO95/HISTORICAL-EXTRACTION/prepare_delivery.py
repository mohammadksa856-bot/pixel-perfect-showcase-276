"""Manifest actual implementation Git blobs; no private originals or parallel acceptance."""
from pathlib import Path
import hashlib
import json
import subprocess

HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
IMPLEMENTATION='2faeda9e240ddad6d57dd2b70d4b64cc24b35be3'
BASELINE='46c7debecf2b055e82c40106f893169c614a7959'
tree=subprocess.check_output(['git','ls-tree','-r',IMPLEMENTATION],cwd=ROOT,text=True)
blobs={x.split('\t',1)[1]:x.split('\t',1)[0].split()[2] for x in tree.splitlines()}
names=subprocess.check_output(['git','diff','--name-only',BASELINE,IMPLEMENTATION],cwd=ROOT,text=True).splitlines()
assert len(names)==22
entries=[]
for name in names:
    assert name.startswith('review-delivery/ARAMCO95/HISTORICAL-EXTRACTION/')
    assert Path(name).suffix in ['.json','.md','.py','.txt']
    data=subprocess.check_output(['git','cat-file','blob',blobs[name]],cwd=ROOT)
    entries.append(dict(path=name,bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
manifest=dict(schema='aramco-history-implementation-manifest/1',implementation_sha=IMPLEMENTATION,baseline_sha=BASELINE,
              hash_basis='Exact committed Git blob bytes, LF normalized; not original PDF hashes',entries=entries,
              private_originals_uploaded=False,financial_acceptance=False,rights_granted=False,
              self_acceptance=False,no_production_import_instructions=True)
(HERE/'IMPLEMENTATION-MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8',newline='\n')
receipt=dict(schema='aramco-history-delivery/1',branch='codex/aramco95-history-extraction-20261019',
             implementation_sha=IMPLEMENTATION,delivery_sha='Resolve commit containing this receipt; no circular self-hash',
             status='READY_FOR_INDEPENDENT_REVIEW_NOT_ACCEPTED',
             annual_periods=5,consecutive_calendar_quarters=12,source_observations=2276,
             potential_new_direct_field_period_cells=761,required_new_direct_cells=162,
             possible_new_distinct_existing_catalog_keys=68,new_metric_definitions_created=0,
             engine_present_unique_cells_in_target_grid=270,
             tests=dict(final_preparer_unit_tests_passed=33,failed=0,skipped=0,regenerated_json_files_byte_identical=10,
                        independent_review_performed=False,product_build_run=False,browser_run=False),
             five_annual_gate_passed=False,twelve_quarter_gate_passed=False,
             actually_ingested_rows=0,score_after=None,holds=[7,22,142,0],financially_qualified=0,
             protected_paths_changed=False,claude_W0_modified=False,merged=False,deployed=False,
             next=['Independent source-and-definition review on this fixed implementation SHA',
                   'Approve period/version/sign and Q4/FCF/endpoint policy through authorized review',
                   'Separate future authorization for staged engine intake; no implicit approval here'])
(HERE/'DELIVERY.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf8',newline='\n')
print('22 implementation Git blobs hashed; delivery metadata retains all gates and holds.')
