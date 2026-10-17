"""142 bounded audit dispositions. Never qualifies a value, changes an amount, or writes engine data."""
import argparse
from collections import Counter
from decimal import Decimal
import hashlib
import json
from pathlib import Path
import re
from pypdf import PdfReader

def canonical(v):return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':'))
def sha(raw):return hashlib.sha256(raw).hexdigest()
def read(p):return json.loads(Path(p).read_text(encoding='utf-8'))

def compare(o, rows, source_url):
    """Diagnostic native-row comparisons; no inferred metric aliases or document identity."""
    ident=o['identity'];metric=o['engine_mapping']
    if metric is None:return {'classification':'UNMAPPED_DEFINITION','matches':[]}
    candidates=[r for r in rows if r['company_id']==ident['companyId'] and r['metric_key']==metric]
    if not candidates:return {'classification':'LOCAL_METRIC_NOT_PRESENT','matches':[]}
    dated=[r for r in candidates if r['period_end']==ident['end']]
    if not dated:return {'classification':'LOCAL_PERIOD_NOT_PRESENT','matches':[]}
    # Quarter0 sentinel is explicitly normalized by the existing query facade; empty start is NOT repaired.
    periods=[r for r in dated if r['period_kind']==ident['kind'] and r['period_start']==ident['start'] and r['fiscal_year']==ident['fiscalYear'] and (r['fiscal_quarter'] or None)==ident['fiscalQuarter']]
    if not periods:return {'classification':'LOCAL_FULL_PERIOD_DIFFERENCE','matches':metadata(dated,o,source_url)}
    scoped=[r for r in periods if r['scope']==ident['scope'] and json.loads(r['dimensions_json'])==ident['dimensions']]
    if not scoped:return {'classification':'LOCAL_SCOPE_OR_DIMENSION_DIFFERENCE','matches':metadata(periods,o,source_url)}
    units=[r for r in scoped if r['currency']==ident['currency'] and r['unit']==ident['unit']]
    if not units:return {'classification':'LOCAL_UNIT_OR_CURRENCY_DIFFERENCE','matches':metadata(scoped,o,source_url)}
    current=[r for r in units if r['is_current']==1]
    values={r['value_decimal'] for r in current if r['value_decimal'] is not None}
    expected=Decimal(o['observed_amount'])*Decimal(o['source_scale'])
    same=lambda r:r['value_decimal'] is not None and Decimal(r['value_decimal'])==expected
    if len(values)>1:status='LOCAL_CURRENT_CONFLICT'
    elif any(same(r) and r['source_url']==source_url for r in current):status='LOCAL_CURRENT_SOURCE_AMOUNT_AGREE'
    elif any(same(r) for r in current):status='LOCAL_CURRENT_AMOUNT_AGREE_OTHER_SOURCE'
    elif any(r['value_decimal'] is not None and abs(Decimal(r['value_decimal']))==abs(expected) for r in current):status='LOCAL_CURRENT_SIGN_DIFFERENCE'
    elif any(same(r) and r['source_url']==source_url for r in units):status='LOCAL_HISTORICAL_SOURCE_AMOUNT_AGREE'
    elif not current:status='LOCAL_NO_CURRENT_VERSION'
    elif all(r['value_decimal'] is None for r in current):status='LOCAL_VALUE_UNAVAILABLE'
    else:status='LOCAL_NUMERIC_DIFFERENCE_UNRESOLVED'
    return {'classification':status,'matches':metadata(units,o,source_url)}

def metadata(rows,o,url):
    expected=Decimal(o['observed_amount'])*Decimal(o['source_scale'])
    return [{'native_row_id':r['id'],'native_version':r['version'],'current_in_local_copy':bool(r['is_current']),
             'source_key':r['source_key'],'source_url':r['source_url'],
             'native_period':{k:r[k] for k in ('period_kind','period_start','period_end','fiscal_year','fiscal_quarter')},
             'native_scope':r['scope'],'native_dimensions':json.loads(r['dimensions_json']),
             'unit':r['unit'],'currency':r['currency'],'calculated':bool(r['is_calculated']),
             'source_url_agrees':r['source_url']==url,
             'amount_agrees_diagnostic_only':r['value_decimal'] is not None and Decimal(r['value_decimal'])==expected,
             'sign_only_agreement_diagnostic':r['value_decimal'] is not None and Decimal(r['value_decimal'])!=expected and abs(Decimal(r['value_decimal']))==abs(expected)} for r in sorted(rows,key=lambda r:r['id'])]

CAUSES={
 'UNMAPPED_DEFINITION':('Definition mapping unapproved; do not merge distinct segment/cash/adjusted concepts','Approve exact metric definition and scope mapping; no automatic alias'),
 'LOCAL_METRIC_NOT_PRESENT':('Requested metric not found in historical local copy; live absence NOT established','Retrieve exact metric from authorized current engine export or document its genuine absence'),
 'LOCAL_PERIOD_NOT_PRESENT':('Requested end not found for mapped metric in historical local copy; live absence NOT established','Retrieve full historical period/version evidence; no generated period'),
 'LOCAL_FULL_PERIOD_DIFFERENCE':('Native period metadata differs including flow/instant start or fiscal metadata','Resolve original full period identity with evidence; never match end alone'),
 'LOCAL_SCOPE_OR_DIMENSION_DIFFERENCE':('Native consolidation scope or segment dimensions differ','Review external/intersegment/Corporate/eliminations semantics against note4'),
 'LOCAL_UNIT_OR_CURRENCY_DIFFERENCE':('Native unit/currency differs from source observation','Review source header and scale; never multiply amounts to force agreement'),
 'LOCAL_CURRENT_CONFLICT':('Multiple current native values conflict within exact identity in the local copy','Independent source/version arbitration; never select first row'),
 'LOCAL_CURRENT_SOURCE_AMOUNT_AGREE':('Native identity/source URL/amount agree locally; immutable document binding and financial review still missing','Bind original bytes, source revision and authorized review before qualification'),
 'LOCAL_CURRENT_AMOUNT_AGREE_OTHER_SOURCE':('Amount agrees locally but source URL differs; agreement is not source-version proof','Compare original and comparative editions and preserve both; do not relabel source'),
 'LOCAL_CURRENT_SIGN_DIFFERENCE':('Absolute magnitude agrees but signed values differ in local copy','Approve metric sign definition and full source row; retain both signed originals'),
 'LOCAL_HISTORICAL_SOURCE_AMOUNT_AGREE':('Only historical native revision matches exact source/amount in local copy','Resolve lifecycle/supersession using actual issuer and engine versions'),
 'LOCAL_NO_CURRENT_VERSION':('Matching native identity exists historically, not current in local copy','Review retained lifecycle; do not resurrect retired data'),
 'LOCAL_VALUE_UNAVAILABLE':('Current native identity has no numeric value','Keep withheld; resolve source and quality reason without zero fallback'),
 'LOCAL_NUMERIC_DIFFERENCE_UNRESOLVED':('Exact-identity native values differ; financial cause not proven','Review original label, column, edition, scope and units independently; do not force equality'),
}

def review_checks(o):
    checks=['Match original row/column, unit, currency, sign, period and scope; source presence is not accuracy',
            'Bind actual immutable engine and document versions; do not invent references or financial certificates']
    m=o['identity']['metric']
    if m=='basic_eps':checks.append('Parent ordinary-share income and weighted average shares, not issued shares/group income; no EPS subtraction')
    if o['identity']['scope']=='segment':checks.append('External versus intersegment revenue; Corporate/eliminations; EBIT versus operating income; cash-basis capex; note4')
    if 'cash' in m:checks.append('Distinguish balance cash and statement-of-cash-flows cash including held-for-sale; no addition imported as fact')
    if m in ('capex','dividends_paid','cash_capex'):checks.append('Cash-outflow sign versus positive disclosure convention; definitions must be approved before derivatives')
    if m=='depreciation_amortization_cash_flow':checks.append('FY2024 original versus FY2025 comparative reclassification under note2(h); preserve presentations')
    if m=='adjusted_net_income':checks.append('Issuer non-IFRS measure; original Q1 versus revised H1 comparative; reconcile adjustments and tax, not IFRS restatement')
    return checks

def build(repo,private,source_private):
    root=repo/'review-delivery/WEB08B02';old=read(root/'QUALIFIED-WITHHELD-INPUT-REGISTER-v4.json')
    docs={d['key']:d for d in read(root/'FINANCIAL-EVIDENCE-REGISTER.json')['documents']}
    obs=read(source_private/'audit-observations.json')['rows']+read(source_private/'audit-adjusted-observations.json')['rows']
    by_id={o['audit_row']:o for o in obs};assert len(by_id)==142
    engine=read(private/'engine-local.json');local=read(repo/'review-delivery/WEB08B02D/LOCAL-ENGINE-CAPTURE.json')
    assert sha((private/'engine-local.json').read_bytes())==local['capture_sha256'] and engine['changes']==0
    pdfs={k:PdfReader(source_private/(k+'.pdf')) for k in docs}
    for k,d in docs.items():assert sha((source_private/(k+'.pdf')).read_bytes())==d['sha256']
    texts={};results=[];bridge_rows=[]
    for r in old['results']:
        o=by_id[r['audit_row']];assert sha(canonical(o).encode())==r['source_observation_digest'] and o['identity']==r['identity']
        key=o['source']['document_key'];page=o['source']['pdf_page'];doc=docs[key]
        if (key,page) not in texts:texts[(key,page)]=re.sub(r'\s+','',pdfs[key].pages[page-1].extract_text())
        amount=o['observed_amount'];whole,dot,fraction=amount.lstrip('-').partition('.')
        token=f'{int(whole):,}'+(dot+fraction if dot else '')
        if amount.startswith('-'):token='('+token+')'
        source_check=token in texts[(key,page)]
        comparison=compare(o,engine['data_points'],doc['url'])
        cause,action=CAUSES[comparison['classification']]
        candidate_ids={m['native_row_id'] for m in comparison['matches']}
        native_rows=[p for p in engine['data_points'] if p['id'] in candidate_ids]
        # Real native IDs remain native; no global refs, publication times or review facts are minted.
        bridge_rows.append({'audit_row':r['audit_row'],'rows':[{**p,'metric':p['metric_key'],'dimensions':json.loads(p['dimensions_json'])} for p in native_rows]})
        results.append({'audit_row':r['audit_row'],'identity':r['identity'],'source':r['source'],
          'document_url':doc['url'],'original_file_sha256':doc['sha256'],'source_observation_digest':r['source_observation_digest'],
          'source_evidence':{'bytes_verified':True,'paper_digest_verified':True,'amount_token_on_page_not_row_column_verification':source_check,'independent_financial_review':'NOT_CERTIFIED'},
          'previous_snapshot_comparison':r['comparison'],'local_engine_comparison':comparison,
          'root_cause':{'local_diagnostic':cause,'financial_root_cause':'UNRESOLVED_PENDING_AUTHORIZED_REVIEW','current_production_status':'UNKNOWN_NETWORK_TIMEOUT'},
          'corrective_action':action,'review_checklist':review_checks(o),
          'audit_disposition':'CLOSED_WITH_WITHHOLD','disposition_scope':'ADMINISTRATIVE_AUDIT_DECISION_NOT_FINANCIAL_RESOLUTION',
          'eligibility':'WITHHELD','publicationAuthorized':False,'engine_fact_ref':None,
          'remaining_blockers':['LIVE_ENGINE_READ_UNAVAILABLE','IMMUTABLE_REFERENCE_EXPORT_MISSING','AUTHORIZED_FINANCIAL_REVIEW_PENDING','THIRD_PARTY_RIGHTS_RECEIPT_UNDOCUMENTED'],
          'commercial_user_authorization':'RECORDED_DO_NOT_REQUEST_AGAIN'})
    assert {r['audit_row'] for r in results}=={f'OBS-{i:03d}' for i in range(1,143)}
    payload={'context':{'snapshotId':'local-capture:'+local['capture_sha256'],'asOf':engine['finished_at'],'evaluatedAt':engine['finished_at'],'use':'internal_research','facts':[],'documents':[],'grants':[],'actors':[],'events':[]},'rows':bridge_rows}
    # Native capture times are retained as evidence, NOT silently rounded into B01 UTC milliseconds.
    with (private/'bridge-attempt-inputs.json').open('x',encoding='utf-8') as f:json.dump(payload,f)
    return {'schema':'marefa-b02d-audit-dispositions/1','baseline_B02':'b1f90a9f4e21ef9f1277c07376c3c7f4d2ad2bcf',
       'current_engine_read':'UNAVAILABLE_SSH_AND_HTTP_TIMEOUT','local_engine_capture':local,
       'observations':142,'documented_dispositions':142,'administratively_closed_with_withhold':142,
       'financially_resolved':0,'research_qualified':0,'withheld':142,'display_approved':0,
       'local_comparison_counts':dict(sorted(Counter(r['local_engine_comparison']['classification'] for r in results).items())),
       'source_pages_token_checked':len(texts),'note':'Token checks and engineering tests are not independent financial certification; local copy absence is not live DB absence','results':results}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--private-root',required=True);p.add_argument('--source-private-root',required=True);a=p.parse_args()
    repo=Path(__file__).resolve().parents[2]
    result=build(repo,Path(a.private_root),Path(a.source_private_root))
    with (repo/'review-delivery/WEB08B02D/CLOSEOUT-REGISTER.json').open('x',encoding='utf-8') as f:json.dump(result,f,ensure_ascii=False,indent=2)
    print(json.dumps({k:result[k] for k in ('observations','documented_dispositions','research_qualified','withheld','local_comparison_counts','source_pages_token_checked')}))
