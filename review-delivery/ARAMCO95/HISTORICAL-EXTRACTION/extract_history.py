"""Read-only extraction workpapers, NOT an engine import or financial qualification."""
from pathlib import Path
from decimal import Decimal
import calendar
import hashlib
import json
import re
import sqlite3
import sys
import pdfplumber

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
ENGINE = ROOT.parents[1]/'aramco95-engine-b70254e'
PRIVATE = ROOT.parent/'aramco95-history-private-20261019'
RECOVERED = ROOT.parent/'aramco95-qb2-private-20261019'
OLDPRIVATE = ROOT.parent/'web08b02-private-20261017'
sys.path.insert(0,str(ENGINE/'src'))
from finengine.catalog import iter_catalog_fields

PLANS = {
 'FY2021-FS': (2021,None,(10,12,14)), 'FY2022-FS':(2022,None,(10,12,14)),
 'FY2023-FS':(2023,None,(12,14,16)), 'FY2024-FS':(2024,None,(12,14,16)),
 'ARA2025':(2025,None,(174,176,178)), 'Q3-2023':(2023,3,(14,16,18)),
 'Q1-2024':(2024,1,(14,16,18)), 'H1-2024':(2024,2,(14,16,18)), 'Q3-2024':(2024,3,(14,16,18)),
 'Q1-2025':(2025,1,(19,21,23)), 'H1-2025':(2025,2,(28,30,32)), 'Q3-2025':(2025,3,(27,29,31)),
 'Q1-2026':(2026,1,(23,25,27)), 'H1-Q2-2026':(2026,2,(27,29,31))}
STATEMENTS=['income_statement','balance_sheet','cash_flow']
SOURCE_GROUPS=STATEMENTS+['financial_notes']
NUM = re.compile(r'^\(?[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\)?$')
LABELS = {
 'income_statement': {
  'Revenue':'revenue','Other income related to sales':'other_income_related_to_sales',
  'Revenue and other income related to sales':'revenue_and_other_income_related_to_sales',
  'Royalties and other taxes':'royalties_and_other_taxes','Purchases':'purchases',
  'Producing and manufacturing':'producing_manufacturing_expense',
  'Selling, administrative and general':'selling_general_administrative_expense','Exploration':'exploration_expense',
  'Research and development':'research_and_development_expense','Depreciation and amortization':'depreciation_amortization',
  'Impairment and held for sale remeasurement losses':'impairment_charges','Operating costs':'operating_costs',
  'Operating income':'operating_income',
  'Finance and other income':'finance_and_other_income','Finance costs':'finance_costs',
  'Income before income taxes and zakat':'income_before_income_taxes_and_zakat',
  'Income taxes and zakat':'income_taxes_and_zakat','Net income':'net_income',
  "Shareholders' equity":'net_income_parent','Non-controlling interests':'net_income_noncontrolling',
  'Earnings per share (basic and diluted)':'basic_eps'},
 'balance_sheet': {
  'Property, plant and equipment':'property_plant_equipment','Intangible assets':'intangible_assets',
  'Deferred income tax assets':'deferred_tax_assets','Post-employment benefits':'employee_benefits_asset',
  'Inventories':'inventory','Trade receivables':'accounts_receivable',
  'Due from the Government':'due_from_government','Short-term investments':'short_term_investments',
  'Cash and cash equivalents':'cash','Assets classified as held for sale':'assets_held_for_sale',
  'Total assets':'total_assets','Share capital':'share_capital','Additional paid-in capital':'additional_paid_in_capital',
  'Treasury shares':'treasury_shares','Other reserves':'other_reserves','Non-controlling interests':'noncontrolling_interests',
  'Deferred income tax liabilities':'deferred_tax_liabilities',
  'Liabilities directly associated with assets classified as held for sale':'liabilities_held_for_sale',
  'Total liabilities':'total_liabilities','Total equity and liabilities':'total_liabilities_equity'},
 'cash_flow': {
  'Depreciation and amortization':'depreciation_amortization_cash_flow',
  'Exploration and evaluation costs written off':'exploration_evaluation_written_off',
  'Net cash provided by operating activities':'operating_cash_flow','Capital expenditures':'capex',
  'Distributions from joint ventures and associates':'distributions_joint_ventures_associates',
  'Dividends from investments in securities':'dividends_from_investments','Interest received':'interest_received',
  'Net cash used in investing activities':'investing_cash_flow',
  'Net cash provided by investing activities':'investing_cash_flow',
  'Net cash (used in) provided by investing activities':'investing_cash_flow',
  'Net cash provided by (used in) investing activities':'investing_cash_flow',
  'Dividends paid to shareholders of the Company':'dividends_paid',
  'Dividends paid to non-controlling interests in subsidiaries':'dividends_noncontrolling',
  'Proceeds from borrowings':'debt_issued','Repayments of borrowings':'debt_repaid',
  'Principal portion of lease payments':'lease_payments','Interest paid':'interest_paid',
  'Net cash used in financing activities':'financing_cash_flow',
  'Cash and cash equivalents at beginning of the year':'cash_beginning',
  'Cash and cash equivalents at end of the year':'cash_end',
  'Cash and cash equivalents at beginning of the period':'cash_beginning',
  'Cash and cash equivalents at end of the period':'cash_end',
  'Settlement of income, zakat and other taxes':'taxes_paid'} }


def norm(text):
    return ' '.join(text.replace('’',"'").replace('\u2011','-').replace('–','-').split())


def decimal(token):
    if not NUM.fullmatch(token):
        return None
    return str(Decimal(token.replace(',','').replace('(','-').replace(')','')))


def lines(page):
    words=sorted(page.extract_words(x_tolerance=2,y_tolerance=3),key=lambda w:(w['top'],w['x0']))
    groups=[]
    for word in words:
        if not groups or abs(word['top']-groups[-1]['top'])>3:
            groups.append(dict(top=word['top'],words=[]))
        groups[-1]['words'].append(word)
    for g in groups:
        g['words'].sort(key=lambda w:w['x0'])
        g['text']=norm(' '.join(w['text'] for w in g['words']))
    return groups


def table_rows(page, statement, count, source_id=None, pageno=None):
    raw=lines(page)
    anchor={'income_statement':'Revenue ','balance_sheet':'Cash and cash equivalents ',
            'cash_flow':'Net cash provided by operating activities '}[statement]
    anchor_row=next(r for r in raw if r['text'].startswith(anchor))
    numeric=[w for w in anchor_row['words'] if NUM.fullmatch(w['text'])][-count:]
    if len(numeric)!=count:
        raise ValueError('anchor_column_count')
    edges=[w['x1'] for w in numeric]
    cutoff=min(w['x0'] for w in numeric)-6
    result=[];pending=''
    visual_allowlist={('H1-2025',30,'2,471,450\u2011'),('Q3-2025',29,'2,516,431\u2011')}
    for r in raw:
        assigned={};unparsed=[]
        for w in r['words']:
            candidates=[i for i,x in enumerate(edges) if abs(w['x1']-x)<5]
            artifact_verified=(source_id,pageno,w['text']) in visual_allowlist
            if candidates and any(c.isdigit() for c in w['text']) and not NUM.fullmatch(w['text']) and not artifact_verified:
                unparsed.append(dict(raw=w['text'],bbox=[round(w[k],2) for k in ['x0','top','x1','bottom']],
                    reason='UNRECOGNIZED_NUMERIC_LEXEME_NOT_NORMALIZED_OR_SILENTLY_ACCEPTED'))
            if candidates and (NUM.fullmatch(w['text']) or w['text'] in ['–','—','-','‑'] or artifact_verified):
                col=min(candidates,key=lambda i:abs(edges[i]-w['x1']))
                if col in assigned:
                    raise ValueError('ambiguous_numeric_cell')
                assigned[col]=dict(raw=w['text'],value=decimal(w['text'][:-1] if artifact_verified else w['text']),
                    numeric_normalization='TRAILING_U2011_LAYOUT_ARTIFACT_VISUALLY_VERIFIED_EXACT_DOC_PAGE_TOKEN' if artifact_verified else 'NONE',
                    bbox=[round(w[k],2) for k in ['x0','top','x1','bottom']])
        label=norm(' '.join(w['text'] for w in r['words'] if w['x1']<cutoff))
        label=re.sub(r'\s+\d+(?:,\d+)*(?:\([a-z]\))?$','',label)
        if not assigned:
            # Wrapping is joined only if it yields a known complete statement label later.
            pending=(pending+' '+label).strip() if label else ''
            result.append(dict(label=label,cells={},top=round(r['top'],2),heading=True,unparsed_numeric_cells=unparsed))
            continue
        known=LABELS[statement]
        if label not in known and norm(pending+' '+label) in known:
            label=norm(pending+' '+label)
        pending=''
        result.append(dict(label=label,cells=assigned,top=round(r['top'],2),heading=False,unparsed_numeric_cells=unparsed))
    return result,edges


def mapped_rows(rows,statement):
    selected=[]
    for i,r in enumerate(rows):
        metric=LABELS[statement].get(r['label'])
        if statement=='balance_sheet' and metric=='employee_benefits_asset':
            section=[x['label'] for x in rows[:i] if x['label'] in ['Non-current assets','Current assets','Non-current liabilities','Current liabilities']]
            if section and section[-1]=='Non-current liabilities':metric='employee_benefits_noncurrent'
            elif section and section[-1]=='Current liabilities':metric='employee_benefits_current'
        if statement=='cash_flow' and metric=='dividends_from_investments':
            # Identical wording occurs as a NON-CASH reconciliation reversal and a cash investing inflow.
            operating_total=next(j for j,x in enumerate(rows) if x['label']=='Net cash provided by operating activities')
            if i<operating_total:metric=None
        if metric and r['cells']:
            selected.append((metric,r,'DIRECT_LABEL'))
        if statement!='balance_sheet':continue
        if r['label']=='Borrowings' and r['cells']:
            preceding=[x['label'] for x in rows[:i] if x['label'] in ['Non-current liabilities','Current liabilities']]
            if preceding:selected.append(('long_term_debt' if preceding[-1]=='Non-current liabilities' else 'current_debt',r,'SECTION_BORROWINGS_NOT_ALL_DEBT'))
        if not r['cells'] or r['label']:continue
        following=next((x['label'] for x in rows[i+1:] if x['label']),None)
        previous=next((x['label'] for x in reversed(rows[:i]) if x['label']),None)
        metric=None
        if following=='Total assets':metric='current_assets'
        elif following=='Current assets':metric='noncurrent_assets'
        elif following=='Non-controlling interests':metric='equity_parent'
        elif previous=='Non-controlling interests':metric='total_equity'
        elif following=='Current liabilities':metric='noncurrent_liabilities'
        elif following=='Total liabilities':metric='current_liabilities'
        if metric:selected.append((metric,r,'UNLABELLED_PRINTED_SUBTOTAL_BY_SECTION'))
    return selected


def period(kind,year,quarter=None):
    if kind=='fy':return dict(kind=kind,start=f'{year}-01-01',end=f'{year}-12-31',fiscal_year=year,fiscal_quarter=None)
    month=quarter*3 if quarter else 12
    end=f'{year}-{month:02d}-{calendar.monthrange(year,month)[1]}'
    start=None if kind=='instant' else (f'{year}-01-01' if kind=='ytd' else f'{year}-{(quarter-1)*3+1:02d}-01')
    return dict(kind=kind,start=start,end=end,fiscal_year=year,fiscal_quarter=quarter if kind!='instant' else None)


def source_definitions():
    old=ROOT/'review-delivery/ARAMCO95/QB2/INDEPENDENT-REVIEW'
    docs=json.loads((old/'SOURCE-RECOVERY-MANIFEST.json').read_text(encoding='utf8'))['documents']+json.loads((old/'EXTRA-SOURCE-RECOVERY.json').read_text(encoding='utf8'))['documents']
    for d in docs:d['path']=RECOVERED/d['private_filename']
    b02=json.loads((ROOT/'review-delivery/WEB08B02/FINANCIAL-EVIDENCE-REGISTER.json').read_text(encoding='utf8'))
    for key,filename in [('Q1-2026','Q1-2026.pdf'),('H1-Q2-2026','H1-Q2-2026.pdf')]:
        d=next(x for x in b02['documents'] if x['key']==key)
        docs.append(dict(source_id=key,path=OLDPRIVATE/filename,sha256=d['sha256'],original_url=d['url'],
                         index_publication_date_observed=d['published'],observed_at_utc=None,
                         rights_grant='UNKNOWN_NO_GRANT',retrieval_timestamp_limit='Inherited B02 artifact; exact current acquisition time not invented'))
    return {d['source_id']:d for d in docs}


def run():
    PRIVATE.mkdir(exist_ok=True)
    docs=source_definitions();observations=[];pages=[];gaps=[];unmapped=[]
    catalog=list(iter_catalog_fields());catalog_by={f['field_key']:f for f in catalog}
    relevant=[f for f in catalog if f['category'] in SOURCE_GROUPS]
    for key,(year,q,plan) in PLANS.items():
        source=docs[key];path=source['path']
        assert hashlib.sha256(path.read_bytes()).hexdigest()==source['sha256']
        with pdfplumber.open(path) as pdf:
            for statement,pageno in zip(STATEMENTS,plan):
                page=pdf.pages[pageno-1]
                text=page.extract_text()
                assert 'SAR' in text and ('USD' in text) and str(year) in text
                count=4 if statement=='balance_sheet' or q in [None,1] else 8
                rows,edges=table_rows(page,statement,count,key,pageno)
                selected=mapped_rows(rows,statement)
                for row in rows:
                    if row['label'] in ['Investments in joint ventures and associates','Additional investments in joint ventures and associates',
                            'Share of results of joint ventures and associates','Investments in securities - net','Investments in securities','Other assets and receivables'] and row['cells']:
                        unmapped.append(dict(source_id=key,source_pdf_page=pageno,source_document_sha256=source['sha256'],
                            source_label=row['label'],field_id=None,cells=row['cells'],
                            reason='COMBINED_OR_NET_CONCEPT_NEEDS_APPROVED_CANONICAL_MAPPING_NOT_SILENT_SPLIT',
                            financial_status='WITHHELD',publication_authorized=False))
                # Only mapped labels/subtotals and their exact cells leave the private originals.
                (PRIVATE/f'{key}-{pageno}-layout.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
                pages.append(dict(source_id=key,pdf_page=pageno,statement=statement,column_right_edges=edges,
                                  expected_numeric_columns=count,header_checked=True,unit='SAR_millions_except_EPS',
                                  unresolved_numeric_cells=[cell for row in rows for cell in row['unparsed_numeric_cells']],
                                  visual_layout_review='CONTACT_SHEET_HEADER_AND_COLUMNS_NOT_NUMERIC_CERTIFICATION' if key not in ['Q1-2026','H1-Q2-2026'] else 'PREVIOUS_ORIGINAL_PAGE_REVIEW_PLUS_NEW_CELL_CHECKS',
                                  pdf_page_number_is_physical=True,printed_page_number_not_inferred=True))
                for metric,row,method in selected:
                    if metric not in catalog_by:raise ValueError('non_catalog_metric:'+metric)
                    for col in ([0,1] if statement=='balance_sheet' or q in [None,1] else [0,1,2,3]):
                        if col not in row['cells']:continue
                        cell=row['cells'][col]
                        value=cell['value']
                        if value is None:
                            gaps.append(dict(source_id=key,pdf_page=pageno,metric=metric,column=col,reason='REPORTED_DASH_NOT_INVENTED_ZERO',raw=cell['raw']))
                            continue
                        selected_year=year if col%2==0 else year-1
                        kind='instant' if statement=='balance_sheet' else 'fy' if q is None else 'ytd' if col>=2 else 'quarter'
                        selected_q=None if q is None or (statement=='balance_sheet' and col==1) else q
                        p=period(kind,selected_year,selected_q)
                        # Prior balance sheet column is prior December31, never prior same-quarter.
                        if statement=='balance_sheet' and col==1:p=period('instant',year-1)
                        scalar='1' if metric=='basic_eps' else '1000000'
                        base_value=str(Decimal(value)*Decimal(scalar))
                        obs=dict(company_id='sa:2222',field_id=metric,statement=statement,period=p,
                            original_value=value,source_scale=scalar,source_currency='SAR',
                            normalized_observation_value=base_value,normalized_unit='SAR/share' if metric=='basic_eps' else 'SAR',
                            normalization='Exact scale conversion only; sign unchanged',source_label=row['label'] or method,
                            source_id=key,source_document_sha256=source['sha256'],source_url=source['original_url'],
                            source_pdf_page=pageno,source_column_index_zero_based=col,cell_bbox_points=cell['bbox'],
                            printed_cell=cell['raw'],cell_numeric_normalization=cell['numeric_normalization'],source_document_version_id=None,artifact_edition_key='sha256:'+source['sha256'],
                            publication_date_claim=source.get('index_publication_date_observed'),publication_time_certified=False,
                            scope='consolidated',dimensions={},extraction_method=method,
                            value_nature='CASHFLOW_ENDPOINT_NOT_ADDITIVE' if metric in ['cash_end','cash_beginning'] else
                                         'PER_SHARE_NOT_ADDITIVE' if metric=='basic_eps' else 'BALANCE' if statement=='balance_sheet' else 'FLOW',
                            edition_role='CURRENT_PERIOD_AS_REPORTED' if col%2==0 else 'LATER_DOCUMENT_COMPARATIVE',
                            verification='EXTRACTED_EXACT_CELL_PENDING_SOURCE_REVIEW',financial_status='WITHHELD',
                            approval=None,rights_grant='UNKNOWN',publication_authorized=False)
                        canonical=json.dumps({k:obs[k] for k in ['field_id','period','source_document_sha256','source_pdf_page','source_column_index_zero_based']},sort_keys=True)
                        obs['local_observation_id']='workpaper:'+hashlib.sha256(canonical.encode()).hexdigest()
                        obs['local_id_not_engine_fact_or_review_receipt']=True
                        observations.append(obs)
        print(key,len(observations),flush=True)
    ids=[r['local_observation_id'] for r in observations]
    if len(ids)!=len(set(ids)):
        from collections import Counter
        duplicate={k for k,v in Counter(ids).items() if v>1}
        print('DUPLICATE_ROWS',json.dumps([{k:r[k] for k in ['field_id','source_id','source_pdf_page','source_column_index_zero_based','source_label','original_value','cell_bbox_points']} for r in observations if r['local_observation_id'] in duplicate][:16]),flush=True)
    assert len(ids)==len(set(ids)), 'Ambiguous row mapping: duplicate identity requires explicit resolution, not first match'
    manifest=[]
    for key,d in docs.items():
        manifest.append({k:v for k,v in d.items() if k not in ['path','private_filename']})
    out=dict(schema='aramco-historical-extraction-observations/1',engine_reference='b70254e',contract_version='1.0.0',
        observations=observations,pages=pages,reported_dash_gaps=gaps,holds=[7,22,142,0],financially_qualified=0,
        no_engine_write=True,new_evidence_self_accepted=False)
    (HERE/'EXTRACTED-OBSERVATIONS.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
    (HERE/'SOURCE-MANIFEST.json').write_text(json.dumps(dict(documents=manifest,pdfs_private=True,rights_granted=False),ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
    (HERE/'UNMAPPED-SOURCE-ROWS.json').write_text(json.dumps(dict(rows=unmapped,not_counted_as_new_canonical_fields=True,
        reason='Original combined/net concepts are preserved; field definitions not invented',financially_qualified=0),ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
    contract=ENGINE/'config/factory/18-category-contract.json';catfile=ENGINE/'src/finengine/catalog.py'
    (HERE/'CONTRACT-FIELD-SCOPE.json').write_text(json.dumps(dict(contract_sha256=hashlib.sha256(contract.read_bytes()).hexdigest(),
       catalog_sha256=hashlib.sha256(catfile.read_bytes()).hexdigest(),catalog_financial_fields=relevant,
       required_fields=[f['field_key'] for f in relevant if f['requirement']=='required'],
       no_catalog_or_contract_change=True,score_recalculated=False,financial_notes_not_exhaustively_extracted=True),indent=2)+'\n',encoding='utf8',newline='\n')
    print('OBSERVATIONS',len(observations),'DASH_GAPS',len(gaps),flush=True)


if __name__=='__main__':run()
