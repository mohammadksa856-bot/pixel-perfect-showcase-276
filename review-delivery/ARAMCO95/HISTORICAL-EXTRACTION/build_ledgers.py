"""Period ledgers and prospective intake classification; never a production importer."""
from pathlib import Path
from decimal import Decimal, InvalidOperation
from collections import Counter, defaultdict
import hashlib
import json
import sqlite3
from pypdf import PdfReader
from extract_history import HERE, ROOT, ENGINE, PRIVATE, PLANS, STATEMENTS, source_definitions, period

QUARTERS=[(2023,3),(2023,4)]+[(y,q) for y in [2024,2025] for q in range(1,5)]+[(2026,1),(2026,2)]
ANNUAL_DOC={2021:'FY2021-FS',2022:'FY2022-FS',2023:'FY2023-FS',2024:'FY2024-FS',2025:'ARA2025'}
Q_DOC={(2023,3):'Q3-2023',(2024,1):'Q1-2024',(2024,2):'H1-2024',(2024,3):'Q3-2024',
       (2025,1):'Q1-2025',(2025,2):'H1-2025',(2025,3):'Q3-2025',(2026,1):'Q1-2026',(2026,2):'H1-Q2-2026'}
CLASSES=['EXISTS_NEEDS_SOURCE_LINK','EXISTS_NEEDS_IDENTITY_OR_VERSION_REVIEW','ABSENT_NEEDS_INPUT',
         'POTENTIAL_DERIVATION_NEEDS_APPROVED_RULE','UNAVAILABLE_OR_NOT_CURRENTLY_QUALIFIABLE']


def identity(field,p):
    return (field,p['kind'],p['start'],p['end'])


def propose_q4(field,fy,ytd):
    """Mathematical proposal only; approved=False always. Reject invalid accounting identities."""
    if field in ['basic_eps','eps_diluted','cash_end','cash_beginning','free_cash_flow','ebitda','ebit','weighted_average_shares_basic','weighted_average_shares_diluted']:
        raise ValueError('non_additive_metric')
    if not fy or not ytd:raise ValueError('missing_inputs')
    if fy['field_id']!=ytd['field_id'] or fy['field_id']!=field:raise ValueError('metric_mismatch')
    if fy['scope']!=ytd['scope'] or fy['dimensions']!=ytd['dimensions']:raise ValueError('scope_mismatch')
    if fy['normalized_unit']!=ytd['normalized_unit'] or fy['source_currency']!=ytd['source_currency']:raise ValueError('unit_or_currency_mismatch')
    a,b=fy['period'],ytd['period']
    if a['kind']!='fy' or b['kind']!='ytd' or a['fiscal_year']!=b['fiscal_year'] or a['start']!=b['start'] or not b['end'].endswith('09-30'):
        raise ValueError('duration_identity_mismatch')
    year=a['fiscal_year']
    if a['start']!=f'{year}-01-01' or a['end']!=f'{year}-12-31' or b['end']!=f'{year}-09-30':
        raise ValueError('invalid_fiscal_calendar')
    import re
    for record in [fy,ytd]:
        digest=record.get('source_document_sha256','')
        if not re.fullmatch('[a-f0-9]{64}',digest) or record.get('artifact_edition_key')!='sha256:'+digest:
            raise ValueError('missing_exact_artifact_edition')
    if fy['value_nature']!='FLOW' or ytd['value_nature']!='FLOW':raise ValueError('not_additive_flow')
    try:
        left,right=Decimal(fy['normalized_observation_value']),Decimal(ytd['normalized_observation_value'])
        if not left.is_finite() or not right.is_finite():raise ValueError('nonfinite_input')
        value=left-right
    except InvalidOperation as exc:
        raise ValueError('invalid_decimal_input') from exc
    return dict(proposed_value=str(value),proposal_formula='FY_MINUS_YTD9_SAME_BASIS',formula_version='PROPOSAL_ONLY_NOT_APPROVED/1',
        input_observation_ids=[fy['local_observation_id'],ytd['local_observation_id']],
        input_artifact_editions=[fy['artifact_edition_key'],ytd['artifact_edition_key']],
        approved=False,financially_qualified=False,publication_authorized=False,
        blockers=['Approve versioned formula separately','Reconcile presentation/revisions and accounting definitions',
                  'Qualified inputs and complete financial/rights/B02C receipts required'],
        same_reporting_basis_independently_approved=False)


def run():
    extracted=json.loads((HERE/'EXTRACTED-OBSERVATIONS.json').read_text(encoding='utf8'))
    facts=extracted['observations'];byid={r['local_observation_id']:r for r in facts}
    scope=json.loads((HERE/'CONTRACT-FIELD-SCOPE.json').read_text(encoding='utf8'))
    fields=scope['catalog_financial_fields'];required=set(scope['required_fields'])
    definitions={r['field_key']:r for r in fields}
    lookup=defaultdict(list);alternatives=defaultdict(list)
    for r in facts:
        lookup[(r['source_id'],identity(r['field_id'],r['period']))].append(r)
        alternatives[identity(r['field_id'],r['period'])].append(r)
    assert all(len(v)==1 for v in lookup.values())
    def get(doc,field,p):
        r=lookup.get((doc,identity(field,p)),[])
        return r[0] if r else None
    dbpath=ENGINE/'data/financial.sqlite3';dbhash=hashlib.sha256(dbpath.read_bytes()).hexdigest()
    db=sqlite3.connect(dbpath.as_uri()+'?mode=ro&immutable=1',uri=True);db.row_factory=sqlite3.Row
    engine_rows=defaultdict(list)
    for r in db.execute("SELECT id,metric_key,period_kind,period_start,period_end,scope,unit,currency,value_decimal,version,source_key,is_current,is_calculated,dimensions_json FROM data_points WHERE company_id='sa:2222'"):
        r=dict(r)
        if r['scope']!='consolidated' or r['dimensions_json'] not in [None,'','{}','null']:continue
        engine_rows[(r['metric_key'],r['period_kind'],r['period_start'] or None,r['period_end'])].append(r)
    db.close();assert hashlib.sha256(dbpath.read_bytes()).hexdigest()==dbhash
    def entry(field,doc,p,is_q4=False):
        meta=definitions[field];instant=meta['category']=='balance_sheet'
        source=get(doc,field,p) if doc else None
        key=identity(field,p);rows=engine_rows.get(key,[]);current=[r for r in rows if r['is_current']]
        item=dict(field_id=field,category_group=meta['category'],requirement=meta['requirement'],period=p,
                  source_observation_id=source['local_observation_id'] if source else None,
                  source_status='EXTRACTED_NOT_QUALIFIED' if source else 'NOT_EXTRACTED_OR_NOT_CANONICALLY_MAPPED',
                  engine_references=rows,engine_current_rows=len(current),source_comparison=None,
                  financial_status='WITHHELD',publication_authorized=False,new_evidence_self_accepted=False)
        if source:
            if is_q4 and instant:item['period_link']='SAME_INSTANT_AS_ANNUAL_YEAR_END_NOT_NEW_FACT'
            if not rows:
                cls=CLASSES[2]
            else:
                equal=[r for r in current if r['unit'] in [source['normalized_unit'],'SAR' if field=='basic_eps' else 'SAR']
                       and r['currency']=='SAR' and Decimal(r['value_decimal'])==Decimal(source['normalized_observation_value'])]
                # EPS in a generic currency unit is a semantic issue even if the number happens to agree.
                if field=='basic_eps':equal=[r for r in equal if r['unit'] in ['SAR/share','currency/share']]
                cls=CLASSES[0] if len(current)==1 and len(equal)==1 and not current[0]['is_calculated'] else CLASSES[1]
                item['source_comparison']='EXACT_VALUE_AND_UNIT' if cls==CLASSES[0] else 'VALUE_UNIT_VERSION_OR_CALCULATED_STATUS_NEEDS_REVIEW'
                if field=='capex' and len(current)==1 and Decimal(current[0]['value_decimal'])==-Decimal(source['normalized_observation_value']):
                    item['source_comparison']='SIGN_CONVENTION_DIFFERS_DO_NOT_AUTO_CORRECT'
            item['classification']=cls
        elif is_q4 and not instant:
            fy=get(ANNUAL_DOC[p['fiscal_year']],field,period('fy',p['fiscal_year']))
            ytd=get(Q_DOC[(p['fiscal_year'],3)],field,period('ytd',p['fiscal_year'],3))
            if field in ['cash_end','cash_beginning']:
                item['classification']=CLASSES[3]
                endpoint=get(ANNUAL_DOC[p['fiscal_year']],'cash_end',period('fy',p['fiscal_year'])) if field=='cash_end' else get(Q_DOC[(p['fiscal_year'],3)],'cash_end',period('ytd',p['fiscal_year'],3))
                item['proposal']=dict(type='ENDPOINT_REUSE_NOT_SUBTRACTION' if field=='cash_end' else 'Q3_ENDPOINT_AS_Q4_OPENING_NOT_SUBTRACTION',
                    input_observation_ids=[endpoint['local_observation_id']] if endpoint else [],approved=False,
                    proposed_value=None,blockers=['Define endpoint-period identity policy; cash_beginning requires Q3 closing, not annual opening'],
                    financially_qualified=False,publication_authorized=False)
            elif field in ['basic_eps','eps_diluted','weighted_average_shares_basic','weighted_average_shares_diluted']:
                item['classification']=CLASSES[4];item['reason']='NON_ADDITIVE_PER_SHARE_OR_AVERAGE_NEEDS_DIRECT_Q4_OR_SEPARATELY_APPROVED_INPUTS'
            elif field=='free_cash_flow':
                item['classification']=CLASSES[3];item['reason']='FCF_DEFINITION_SIGN_INPUTS_AND_FORMULA_NOT_APPROVED'
            else:
                try:
                    item['proposal']=propose_q4(field,fy,ytd);item['classification']=CLASSES[3]
                except ValueError as e:
                    item['classification']=CLASSES[4];item['reason']=str(e)
        elif field=='free_cash_flow':
            item['classification']=CLASSES[3];item['reason']='FCF_DEFINITION_AND_FORMULA_NOT_APPROVED'
        else:
            if rows:
                item['classification']=CLASSES[0] if len(current)==1 and not current[0]['is_calculated'] else CLASSES[1]
                item['reason']='ENGINE_EXISTS_BUT_ORIGINAL_SOURCE_FIELD_NOT_YET_EXTRACTED_OR_CANONICALLY_MAPPED'
            else:
                item['classification']=CLASSES[4];item['reason']='PENDING_EXTRACTION_OR_DEFINITION_NOT_NOT_DISCLOSED_NOT_NA'
        if field=='cash_end':item['semantic_guard']='Cashflow endpoint, not balance-sheet cash and never additive'
        return item
    annual=[];quarterly=[];ytd_ledgers=[]
    audit_pages={2021:2,2022:2,2023:4,2024:4,2025:164}
    docs=source_definitions()
    for year in range(2021,2026):
        doc=ANNUAL_DOC[year];rows=[]
        for f in fields:
            kind='instant' if f['category']=='balance_sheet' else 'fy'
            rows.append(entry(f['field_key'],doc,period(kind,year)))
        reader=PdfReader(docs[doc]['path']);pg=audit_pages[year];text=reader.pages[pg-1].extract_text()
        assert 'opinion' in text.lower() and 'fairly' in text.lower() and str(year) in text
        annual.append(dict(fiscal_year=year,document=doc,artifact_sha256=docs[doc]['sha256'],statement_pdf_pages=PLANS[doc][2],
            auditor_report_pdf_page=pg,auditor_named_in_source='PricewaterhouseCoopers',auditor_report_located=True,
            audit_report_not_independent_financial_review_receipt=True,required_fields_total=len(required),
            required_fields_with_direct_observations=sum(r['field_id'] in required and r['source_observation_id'] is not None for r in rows),
            entries=rows,gate_status='NOT_PASSED_NO_INGESTION_OR_AUTHORIZED_QUALIFICATION',
            financial_review_receipt=None,rights_grant=None,financially_qualified=0))
    for year,q in QUARTERS:
        doc=ANNUAL_DOC[year] if q==4 else Q_DOC[(year,q)];rows=[]
        for f in fields:
            kind='instant' if f['category']=='balance_sheet' else 'quarter'
            rows.append(entry(f['field_key'],doc,period(kind,year,q),q==4))
        quarterly.append(dict(quarter=f'Q{q}-{year}',fiscal_year=year,fiscal_quarter=q,entries=rows,
            required_fields_total=len(required),required_fields_with_direct_observations=sum(r['field_id'] in required and r['source_observation_id'] is not None for r in rows),
            calendar_contiguous=True,quarter_qualifying_evidence_status='PENDING_NO_GATE_CREDIT',qualified=False))
        if q in [2,3]:
            yr=[]
            for f in fields:
                if f['category']=='balance_sheet':continue
                yr.append(entry(f['field_key'],doc,period('ytd',year,q)))
            ytd_ledgers.append(dict(period=period('ytd',year,q),document=doc,entries=yr,
                                    counted_as_standalone_quarter=False,qualified=False))
    all_slots=[r for block in annual+quarterly for r in block['entries']]
    unique={}
    for r in all_slots:
        key=identity(r['field_id'],r['period'])
        if key in unique:
            assert unique[key]['source_observation_id']==r['source_observation_id'] and unique[key]['classification']==r['classification']
        unique[key]=r
    revisions=[]
    for key,rows in sorted(alternatives.items(),key=str):
        if len(rows)<2:continue
        vals={r['normalized_observation_value'] for r in rows}
        revisions.append(dict(field_id=key[0],kind=key[1],start=key[2],end=key[3],
            observation_ids=[r['local_observation_id'] for r in rows],values=[dict(observation_id=r['local_observation_id'],
                source=r['source_id'],value=r['normalized_observation_value'],source_pdf_page=r['source_pdf_page']) for r in rows],
            status='VALUES_DIFFER_REQUIRES_EDITION_AND_DEFINITION_REVIEW' if len(vals)>1 else 'VALUES_AGREE_DIFFERENT_EDITIONS_NOT_APPROVAL_TRANSFER',
            preferred_edition_policy='UNDECIDED_NO_AUTOMATIC_REPLACEMENT',financially_qualified=False))
    by_class=Counter(r['classification'] for r in unique.values())
    direct_new=[r for r in unique.values() if r['classification']==CLASSES[2]]
    direct_existing=[r for r in unique.values() if r['classification'] in CLASSES[:2] and r['source_observation_id']]
    required_rows=[r for r in unique.values() if r['field_id'] in required]
    direct_slots=[r for r in all_slots if r['source_observation_id']]
    contract=json.loads((ENGINE/'config/factory/18-category-contract.json').read_text(encoding='utf8'))
    affected=[]
    for category in contract['categories']:
        key=category['category_key']
        mode='DIRECT_EVIDENCE_INPUTS_NOT_MEASURED' if key=='financial_statements' else 'WORKPAPER_PROVENANCE_ONLY_NOT_ENGINE_RECEIPT' if key=='sources_lineage_freshness' else 'POTENTIAL_DOWNSTREAM_INPUTS_NOT_COMPUTED' if key in ['profitability','liquidity_solvency','efficiency','growth','per_share','valuation','calculated_smart_metrics'] else 'CASH_PAID_INPUTS_NOT_DIVIDEND_DECLARATIONS' if key=='dividends' else 'NO_COMPLETION_CLAIM'
        affected.append(dict(category_key=key,original_weight=category['weight'],original_threshold=category['completeness_threshold'],
            effect=mode,points_awarded=0,score_recalculated=False,hard_gates_passed=False))
    out=dict(schema='aramco-historical-intake-matrix/1',calendar_annual_years=5,calendar_quarters=12,
        catalog_fields=len(fields),required_fields=len(required),presentation_slots=len(all_slots),unique_field_period_identities=len(unique),
        duplicate_instant_slots_removed=len(all_slots)-len(unique),unique_classification_counts=dict(by_class),
        direct_observation_display_slots=len(direct_slots),unique_direct_observation_identities=len({identity(r['field_id'],r['period']) for r in direct_slots}),
        actual_direct_instant_duplicates_removed=len(direct_slots)-len({identity(r['field_id'],r['period']) for r in direct_slots}),
        existing_direct_field_period_cells=len(direct_existing),existing_distinct_fields=len({r['field_id'] for r in direct_existing}),
        engine_present_unique_field_period_cells=sum(bool(r['engine_references']) for r in unique.values()),
        engine_absent_unique_field_period_cells=sum(not r['engine_references'] for r in unique.values()),
        potential_new_direct_field_period_cells=len(direct_new),potential_new_distinct_fields=len({r['field_id'] for r in direct_new}),
        potential_new_metric_keys_not_previously_in_company_engine=sorted({r['field_id'] for r in direct_new}-{k[0] for k in engine_rows}),
        potential_derivations=sum(r['classification']==CLASSES[3] for r in unique.values()),
        required_identity_classification_counts=dict(Counter(r['classification'] for r in required_rows)),
        prospective_only=True,actual_new_engine_rows=0,score_before_reference='56.56374569 presence-only historical baseline, not rerun',
        score_after=None,weighted_score_delta=None,financially_qualified=0,holds=[7,22,142,0],
        categories=affected,entries=list(unique.values()),engine_database_sha256_before_after=dbhash,
        not_parallel_truth_store='Reference-led workpapers only; observations point to original documents and actual engine rows, no database or API store')
    # Keep real engine rows in one reference register, not repeated as parallel financial stores in every output.
    referenced={r['id']:r for e in all_slots+[r for block in ytd_ledgers for r in block['entries']] for r in e['engine_references']}
    seen_entries=set()
    for entry_row in all_slots+[r for block in ytd_ledgers for r in block['entries']]:
        if id(entry_row) in seen_entries:continue
        seen_entries.add(id(entry_row))
        entry_row['engine_reference_ids']=[r['id'] for r in entry_row.pop('engine_references')]
    for filename,data in [('ENGINE-REFERENCE-REGISTER.json',dict(engine_commit='b70254e',database_sha256=dbhash,rows=list(referenced.values()),
        source='Actual read-only DB row references, not new source facts; no versions invented',not_an_import=True)),
       ('ANNUAL-PERIOD-LEDGER.json',dict(periods=annual,new_evidence_self_accepted=False)),
       ('QUARTERLY-PERIOD-LEDGER.json',dict(periods=quarterly,ytd_supplement=ytd_ledgers,
          dates_contiguous_not_evidence_complete=True,gate_passed=False)),('INTAKE-MATRIX.json',out),
       ('EDITION-RECONCILIATIONS.json',dict(comparisons=revisions,no_automatic_version_choice=True,
         fy2024_presentation_reclassification_note=dict(source_id='ARA2025',pdf_page=184,
            meaning='Original and later comparative aggregate costs/profit may agree while component presentation changes; do not subtract mixed presentation editions without reconciliation'))),
       ('DERIVATION-PROPOSALS.json',dict(proposals=[r for r in unique.values() if r['classification']==CLASSES[3]],
         no_approved_formula_issued=True,no_qualified_calculations=True,fcf_eps_ebitda_not_silently_computed=True))]:
        (HERE/filename).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
    print(json.dumps({k:v for k,v in out.items() if k not in ['entries','categories','not_parallel_truth_store']},ensure_ascii=False))


if __name__=='__main__':run()
