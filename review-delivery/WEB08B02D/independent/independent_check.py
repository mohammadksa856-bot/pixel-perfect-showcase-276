"""Read-only independent audit; emits metadata only. No implementer imports."""
import json, hashlib, argparse
from pathlib import Path
from decimal import Decimal as D
from collections import Counter

def load(p): return json.loads(p.read_text(encoding='utf-8'))
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def canonical(o): return hashlib.sha256(json.dumps(o,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()

def classify(o, rows, url):
    i=o['identity']; groups=[]
    if not o['engine_mapping']: return 'UNMAPPED_DEFINITION', []
    filters=[lambda r:r['company_id']==i['companyId'] and r['metric_key']==o['engine_mapping'],
             lambda r:r['period_end']==i['end'],
             lambda r:(r['period_kind'],r['period_start'],r['fiscal_year'],r['fiscal_quarter'] or None)==(i['kind'],i['start'],i['fiscalYear'],i['fiscalQuarter']),
             lambda r:r['scope']==i['scope'] and json.loads(r['dimensions_json'])==i['dimensions'],
             lambda r:(r['unit'],r['currency'])==(i['unit'],i['currency'])]
    reasons=['LOCAL_METRIC_NOT_PRESENT','LOCAL_PERIOD_NOT_PRESENT','LOCAL_FULL_PERIOD_DIFFERENCE','LOCAL_SCOPE_OR_DIMENSION_DIFFERENCE','LOCAL_UNIT_OR_CURRENCY_DIFFERENCE']
    pool=rows
    for n,f in enumerate(filters):
        nxt=list(filter(f,pool))
        if not nxt: return reasons[n], pool if n>1 else []
        pool=nxt
    current=[r for r in pool if r['is_current']==1]; expected=D(o['observed_amount'])*D(o['source_scale'])
    val=lambda r: None if r['value_decimal'] is None else D(r['value_decimal'])
    if len({val(r) for r in current if val(r) is not None})>1: c='CURRENT_CONFLICT'
    elif any(val(r)==expected and r['source_url']==url for r in current): c='CURRENT_SOURCE_AMOUNT_AGREE'
    elif any(val(r)==expected for r in current): c='CURRENT_AMOUNT_AGREE_OTHER_SOURCE'
    elif any(val(r) is not None and abs(val(r))==abs(expected) for r in current): c='CURRENT_SIGN_DIFFERENCE'
    elif any(val(r)==expected and r['source_url']==url for r in pool): c='HISTORICAL_SOURCE_AMOUNT_AGREE'
    elif not current: c='NO_CURRENT_VERSION'
    elif all(val(r) is None for r in current): c='VALUE_UNAVAILABLE'
    else: c='NUMERIC_DIFFERENCE_UNRESOLVED'
    return 'LOCAL_'+c,pool

def main():
    a=argparse.ArgumentParser();a.add_argument('repo',type=Path);a.add_argument('private_parent',type=Path);args=a.parse_args()
    repo=args.repo; private=args.private_parent/'web08b02-private-20261017'; engine_private=args.private_parent/'web08b02d-private-20261017'
    root=repo/'review-delivery'; register=load(root/'WEB08B02D/CLOSEOUT-REGISTER.json');engine=load(engine_private/'engine-local.json')
    manifest=load(root/'WEB08B02/PRIVATE-EVIDENCE-MANIFEST.json')
    for f in manifest['files']: assert digest(private/f['name'])==f['sha256']
    assert digest(engine_private/'engine-local.json')==load(root/'WEB08B02D/LOCAL-ENGINE-CAPTURE.json')['capture_sha256']
    obs=load(private/'audit-observations.json')['rows']+load(private/'audit-adjusted-observations.json')['rows']; obs={o['audit_row']:o for o in obs}
    docs={d['key']:d for d in load(root/'WEB08B02/FINANCIAL-EVIDENCE-REGISTER.json')['documents']}
    assert set(obs)=={r['audit_row'] for r in register['results']}=={f'OBS-{n:03}' for n in range(1,143)}
    counts=Counter(); results=[]
    for r in register['results']:
        o=obs[r['audit_row']];doc=docs[o['source']['document_key']]
        assert canonical(o)==r['source_observation_digest'] and o['identity']==r['identity']
        prior=next(x for x in load(root/'WEB08B02/QUALIFIED-WITHHELD-INPUT-REGISTER-v4.json')['results'] if x['audit_row']==r['audit_row'])
        assert prior['source']==r['source']
        assert all(r['source'][k]==v for k,v in o['source'].items() if v is not None)
        assert doc['sha256']==r['original_file_sha256'] and doc['url']==r['document_url']
        c,pool=classify(o,engine['data_points'],doc['url']); assert c==r['local_engine_comparison']['classification']
        assert classify(o,list(reversed(engine['data_points'])),doc['url'])[0]==c
        matches=r['local_engine_comparison']['matches']; assert {p['id'] for p in pool}=={m['native_row_id'] for m in matches}
        byid={p['id']:p for p in pool}; expected=D(o['observed_amount'])*D(o['source_scale'])
        for m in matches:
            p=byid[m['native_row_id']]
            for native,public in [('version','native_version'),('source_key','source_key'),('source_url','source_url'),('scope','native_scope'),('unit','unit'),('currency','currency')]: assert p[native]==m[public]
            assert m['native_period']=={k:p[k] for k in ('period_kind','period_start','period_end','fiscal_year','fiscal_quarter')}
            assert m['native_dimensions']==json.loads(p['dimensions_json'])
            assert m['current_in_local_copy']==bool(p['is_current']) and m['calculated']==bool(p['is_calculated'])
            assert m['source_url_agrees']==(p['source_url']==doc['url'])
            v=None if p['value_decimal'] is None else D(p['value_decimal'])
            assert m['amount_agrees_diagnostic_only']==(v is not None and v==expected)
            assert m['sign_only_agreement_diagnostic']==(v is not None and v!=expected and abs(v)==abs(expected))
        assert r['audit_disposition']=='CLOSED_WITH_WITHHOLD' and r['eligibility']=='WITHHELD' and not r['publicationAuthorized'] and r['engine_fact_ref'] is None
        assert r['root_cause']['financial_root_cause']=='UNRESOLVED_PENDING_AUTHORIZED_REVIEW' and r['corrective_action'] and r['review_checklist']
        counts[c]+=1;results.append({'audit_row':r['audit_row'],'classification':c,'native_references_checked':len(matches),'status':'PASS'})
    assert dict(counts)==register['local_comparison_counts']
    bridge=load(engine_private/'bridge-attempt-inputs.json'); assert len(bridge['rows'])==142
    for b in bridge['rows']:
        r=next(r for r in register['results'] if r['audit_row']==b['audit_row'])
        assert {p['id'] for p in b['rows']}=={m['native_row_id'] for m in r['local_engine_comparison']['matches']}
        for p in b['rows']:
            original=next(x for x in engine['data_points'] if x['id']==p['id'])
            assert all(p[k]==v for k,v in original.items())
    import copy
    target=next(o for o in obs.values() if classify(o,engine['data_points'],docs[o['source']['document_key']]['url'])[0]=='LOCAL_CURRENT_SOURCE_AMOUNT_AGREE')
    url=docs[target['source']['document_key']]['url'];_,pool=classify(target,engine['data_points'],url)
    p=copy.deepcopy(next(p for p in pool if p['is_current']==1)); q=copy.deepcopy(p)
    q['id']=-1;q['value_decimal']=str(D(p['value_decimal'])+1)
    for rows in ([p,q],[q,p]):assert classify(target,rows,url)[0]=='LOCAL_CURRENT_CONFLICT'
    p['is_current']=0
    assert classify(target,[p],url)[0]=='LOCAL_HISTORICAL_SOURCE_AMOUNT_AGREE'
    print(json.dumps({'status':'PASS','observations':142,'manifest_files_verified':len(manifest['files']),'native_rows':len(engine['data_points']),'synthetic_conflict_both_orders_and_history':'PASS','classifications':dict(counts),'rows':results},indent=2))
if __name__=='__main__':main()
