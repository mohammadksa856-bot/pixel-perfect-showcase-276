import json, copy
from collections import Counter
L=lambda p: json.load(open(p))
O,N=L('old/INTAKE-MATRIX.json'),L('new/INTAKE-MATRIX.json')
k=lambda e:(e['field_id'],e['period']['kind'],e['period']['start'],e['period']['end'])
oe={k(e):e for e in O['entries']}; ne={k(e):e for e in N['entries']}
R={}
R['identities']=(len(oe),len(ne),set(oe)==set(ne))
R['old_counts']=O['unique_classification_counts']; R['new_counts']=N['unique_classification_counts']
R['legacy_counts_equal_old']=N['legacy_classification_counts']==O['unique_classification_counts']
R['split']=N['source_link_split']
moved=[x for x in ne if oe[x]['classification']!=ne[x]['classification']]
R['moved']=Counter((oe[x]['classification'],ne[x]['classification']) for x in moved)
R['moved_all_null_source']=all(ne[x]['source_observation_id'] is None for x in moved)
R['remaining_link_all_have_source']=all(e['source_observation_id'] for e in ne.values() if e['classification']=='EXISTS_NEEDS_SOURCE_LINK')
R['remaining_link_exact']=Counter(e['source_comparison'] for e in ne.values() if e['classification']=='EXISTS_NEEDS_SOURCE_LINK')
R['absent']=(O['unique_classification_counts']['ABSENT_NEEDS_INPUT'],N['unique_classification_counts']['ABSENT_NEEDS_INPUT'],
  {x for x in oe if oe[x]['classification']=='ABSENT_NEEDS_INPUT'}=={x for x in ne if ne[x]['classification']=='ABSENT_NEEDS_INPUT'},
  all(oe[x]==ne[x] for x in ne if ne[x]['classification']=='ABSENT_NEEDS_INPUT'))
# entries unchanged apart from classification (moved) and proposal
diff_other=[]
for x in ne:
    a,b=copy.deepcopy(oe[x]),copy.deepcopy(ne[x])
    for d in (a,b): d.pop('proposal',None); d.pop('classification',None)
    if a!=b: diff_other.append(x)
R['entries_differing_beyond_class_or_proposal']=diff_other
props=[x for x in ne if 'proposal' in ne[x] and 'semantic_edition_compatibility' in ne[x]['proposal']]
R['q4_pairs']=(len(props),sum('proposal' in oe[x] and oe[x]['proposal'].get('proposal_formula')=='FY_MINUS_YTD9_SAME_BASIS' for x in oe))
R['states']=Counter(ne[x]['proposal']['semantic_edition_compatibility']['state'] for x in props)
blocked=[x for x in props if ne[x]['proposal']['proposal_status'].startswith('BLOCKED')]
R['blocked']=[(x[0],x[3],ne[x]['proposal']['proposal_status'],ne[x]['proposal']['proposed_value'],ne[x]['proposal']['diagnostic_only'],oe[x]['proposal']['proposed_value']) for x in blocked]
others=[x for x in props if x not in blocked]
R['others_value_unchanged']=(len(others),all(ne[x]['proposal']['proposed_value']==oe[x]['proposal']['proposed_value'] for x in others),
  all(ne[x]['proposal']['diagnostic_only'] is None for x in others))
def strip(p):
    p=dict(p)
    for kk in ['proposal_status','semantic_edition_compatibility','diagnostic_only']: p.pop(kk,None)
    return p
R['others_proposal_fields_unchanged']=all(strip(ne[x]['proposal'])==oe[x]['proposal'] for x in others)
R['blocked_rest_unchanged']=all({kk:v for kk,v in strip(ne[x]['proposal']).items() if kk!='proposed_value'}=={kk:v for kk,v in oe[x]['proposal'].items() if kk!='proposed_value'} for x in blocked)
R['approved_any']=any(ne[x]['proposal'].get('approved') for x in props)
# within-year edition signals present on non-blocked proposals
R['unblocked_with_within_year_signals']=[(x[0],x[3],[ (s['kind'],s['end']) for s in ne[x]['proposal']['semantic_edition_compatibility']['within_year_edition_difference_signals']]) for x in others if ne[x]['proposal']['semantic_edition_compatibility']['within_year_edition_difference_signals']]
R['totals']=(sum(O['unique_classification_counts'].values()),sum(N['unique_classification_counts'].values()))
dp=L('new/DERIVATION-PROPOSALS.json')['proposals']
R['derivation_proposals']=len(dp)
qc=L('new/Q4-COMPATIBILITY-REVIEW.json'); R['q4review']=(qc['total_pairs'],qc['counts'])
# ledgers: same changes only
for f in ['EDITION-RECONCILIATIONS.json','ENGINE-REFERENCE-REGISTER.json']:
    R['identical_'+f]=L('old/'+f)==L('new/'+f)
def undo(d):
    # Reverse only the two documented changes; anything else left over is an undocumented difference.
    d=copy.deepcopy(d)
    def walk(x):
        if isinstance(x,dict):
            if x.get('classification')=='EXISTS_WITHOUT_MATCHING_SOURCE_OBSERVATION':x['classification']='EXISTS_NEEDS_SOURCE_LINK'
            p=x.get('proposal')
            if isinstance(p,dict) and 'semantic_edition_compatibility' in p:
                if p['proposed_value'] is None:p['proposed_value']=p['diagnostic_only']['raw_subtraction_not_q4_value']
                for kk in ['proposal_status','semantic_edition_compatibility','diagnostic_only']:p.pop(kk,None)
            for v in x.values():walk(v)
        elif isinstance(x,list):
            for v in x:walk(v)
    walk(d);return d
for f in ['QUARTERLY-PERIOD-LEDGER.json','ANNUAL-PERIOD-LEDGER.json']:
    R['only_documented_changes_'+f]=undo(L('new/'+f))==L('old/'+f)
for kk,v in R.items(): print(kk,':',v)
json.dump({kk:(v if not isinstance(v,Counter) else {str(a):b for a,b in v.items()}) for kk,v in R.items()},open('delta-results.json','w'),default=str,indent=1,ensure_ascii=False)
