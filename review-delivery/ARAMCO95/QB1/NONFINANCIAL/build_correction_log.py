"""Append a review-linked correction workpaper, not acceptance or central tracking."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,subprocess
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
PRIOR='7d65277df4dc25b9755520b871d0bfcfbf63c281';REVIEW='0d57c73a37250d4265016b6c003d25bbe15a6153'
rel='review-delivery/ARAMCO95/QB1/NONFINANCIAL/NONFIN-EVIDENCE-LEDGER.json'
old=json.loads(subprocess.check_output(['git','show',PRIOR+':'+rel],cwd=ROOT));new=json.loads((ROOT/rel).read_text(encoding='utf8'))
before={r['original_field_id']:r for r in old['records']};after={r['original_field_id']:r for r in new['records']}
canonical=lambda v:json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode('utf8')
def differences(a,b,path=''):
 if isinstance(a,dict) and isinstance(b,dict):
  return sum((differences(a.get(k),b.get(k),path+'/'+k) for k in sorted(a.keys()|b.keys())),[])
 return [] if a==b else [dict(path=path,old=a,new=b)]
changed=[k for k in after if after[k]!=before[k]]
assert set(changed)=={'business_description','products_services','employees'}
assert all(before[k]['original_engine_value']==after[k]['original_engine_value'] and before[k]['engine_reference']==after[k]['engine_reference'] for k in before)
events=[dict(field_id=k,old_record_sha256=hashlib.sha256(canonical(before[k])).hexdigest(),new_record_sha256=hashlib.sha256(canonical(after[k])).hexdigest(),changes=differences(before[k],after[k]),state='CORRECTED_PENDING_CLAUDE_CHANGE_ONLY_REVIEW') for k in changed]
out=dict(schema='qb1-nonfin-cross-review-correction/1',prepared_at=datetime.now(timezone.utc).isoformat(),prior_delivery=PRIOR,review_sha=REVIEW,owner_authorization='NONFIN cross-review remediation only; no acceptance or publication',changed_records=changed,corrections=events,unchanged_records_sha256={k:hashlib.sha256(canonical(before[k])).hexdigest() for k in before if k not in changed},prior_artifacts_preserved_in_git=True,claude_financial_files_changed=False,central_board_or_changelog_changed=False,self_acceptance=False,rights_granted=False,publication_authorized=False,holds=dict(blocked=7,claims_withheld=22,inputs_withheld=142,financially_qualified=0),financial_notes_changes=['FX-1: label cash instant exists; prior claim explicitly superseded','FX-2: record four committed versus reported repaired identities; Claude owns financial correction','FX-3: preserve bridge and both PDF hashes'])
(HERE/'CORRECTION-LOG.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(dict(corrected=len(changed),unchanged=len(before)-len(changed),self_acceptance=False)))
