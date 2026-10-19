"""Independent row/year/identity checks; never rewrites the delivery under review."""
from pathlib import Path
from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import json
import re
import sqlite3
import subprocess
import pdfplumber

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
AUTHOR = ROOT/'review-delivery/ARAMCO95/QB2/FINANCIAL-HISTORY'
ENGINE = ROOT.parents[1]/'aramco95-engine-b70254e'
PRIVATE = ROOT.parent/'aramco95-qb2-private-20261019'
APPLICATION = '1800f4c63f313eac2bb82546e6ccbdd2b9a38f6f'
DELIVERY = 'b5010191d4b16cce9c5f885080667bb173e2d9cd'
ANNUAL_HASH = '78bb678e8e45f5c58fa1b2402ab5a29c5ad10adfda8ba5e7ee5f4d1ad76cd227'
FY24_HASH = 'b8a29772c1570738a9b4e481efc5af795a523fe79090107a9556589db28685c0'


def load(name):
    return json.loads((AUTHOR/(name+'.json')).read_text(encoding='utf8'))


def numbers(text):
    return [int(n.replace(',','').strip('()'))*(-1 if n.startswith('(') else 1)
            for n in re.findall(r'\(?\d{1,3}(?:,\d{3})+\)?',text)]


def identity(row):
    p=row['period']
    return (row['metric'],p['kind'],p['start'],p['end'])


def run():
    checks=[]
    def check(name, condition, detail=None):
        checks.append(dict(name=name,status='PASS' if condition else 'FAIL',detail=detail))
    ledger,matrix,restatement=load('HIST-FIN-LEDGER'),load('HIST-PERIOD-MATRIX'),load('FY2024-RESTATEMENT-CHECK')
    annual=ledger['annual'];quarters=ledger['quarters']
    source=ENGINE/f'data/raw/SA/2222/documents/{ANNUAL_HASH}.pdf'
    original24=PRIVATE/f'FY2024-FS-{FY24_HASH}.pdf'
    check('original ARA2025 hash',hashlib.sha256(source.read_bytes()).hexdigest()==ANNUAL_HASH)
    check('original FY2024 hash',hashlib.sha256(original24.read_bytes()).hexdigest()==FY24_HASH)
    dbpath=ENGINE/'data/financial.sqlite3'; before=hashlib.sha256(dbpath.read_bytes()).hexdigest()
    db=sqlite3.connect(dbpath.as_uri()+'?mode=ro&immutable=1',uri=True);db.row_factory=sqlite3.Row
    with pdfplumber.open(source) as document, pdfplumber.open(original24) as original:
        summary=document.pages[131].extract_text()
        check('summary header/scale/year column order',all(s in summary for s in ['Historical financial highlights','millions SAR','2025 2024 2023 2022 2021','As at December 31','Year ended December 31']))
        source_rows={}
        for line in summary.splitlines():
            vals=numbers(line)
            if len(vals)==5:
                label=re.split(r'\(?\d{1,3}(?:,\d{3})+',line,maxsplit=1)[0].strip()
                source_rows[label]=dict(zip([2025,2024,2023,2022,2021],vals))
        check('14 distinct source rows',len(source_rows)==14)
        observations=[]
        for record in annual:
            src=record.get('source')
            if not src or src['pdf_page']!=132:
                continue
            p=record['period'];year=p['fiscal_year'];metric=record['metric']
            expected=source_rows[src['line']][year]
            expected_kind='instant' if metric in ['total_equity','total_assets','total_liabilities'] else 'fy'
            period_ok=(p['kind']==expected_kind and p['end']==f'{year}-12-31' and
                p['start']==(None if expected_kind=='instant' else f'{year}-01-01'))
            check(record['id']+' source row/year/unit/period',expected==record['value_in_source'] and record['unit']=='SAR millions' and period_ok)
            e=record['engine']; obs=dict(record_id=record['id'],source_line=src['line'],year=year,
                source_value_sar_millions=expected,period=p,source_pdf_sha256=ANNUAL_HASH,pdf_page=132,printed_page=130,
                source_class='LATER_REPORT_SUMMARY_NOT_ORIGINAL_YEAR_STATEMENTS',
                source_comparison='MATCH',financially_qualified=False)
            if e:
                row=dict(db.execute('SELECT * FROM data_points WHERE id=?',(e['data_point_id'],)).fetchone())
                good=(row['company_id']=='sa:2222' and row['metric_key']==metric and row['period_kind']==p['kind'] and
                      (row['period_start'] or None)==p['start'] and row['period_end']==p['end'] and
                      row['version']==e['version'] and row['source_key']==e['source_key'] and
                      row['scope']=='consolidated' and row['unit']=='SAR' and row['currency']=='SAR' and
                      Decimal(row['value_decimal'])==Decimal(expected)*1000000)
                check(record['id']+' engine full identity/value/scale',good)
                obs['engine_match']=good;obs['engine_reference']={k:row[k] for k in ['id','version','source_key']}
            else:
                check(record['id']+' correctly records missing engine metric',metric in ['investing_cash_flow','financing_cash_flow'])
                obs['engine_match']=None
            observations.append(obs)
        check('42 source records distinct',len(observations)==42 and len({x['record_id'] for x in observations})==42)
        matched=sum(x['engine_match'] is True for x in observations);missing=sum(x['engine_match'] is None for x in observations)
        check('42 =36 matched summary +6 absent',matched==36 and missing==6)
        cash=next(r for r in annual if r['id']=='QB2-A-cash-FY2023')
        sourcecf=document.pages[177].extract_text()
        opening=next(l for l in sourcecf.splitlines() if l.startswith('Cash and cash equivalents at beginning of the year'))
        check('198973 is printed FY2024 opening cash in FY2025 comparison',numbers(opening)[1]==198973 and cash['value_in_source']==198973)
        original_bs=original.pages[13].extract_text()
        balance=next(l for l in original_bs.splitlines() if l.startswith('Cash and cash equivalents '))
        check('NEW original FY2024 balance directly presents comparative cash2023',numbers(balance)[1]==198973)
        source24=document.pages[173].extract_text()
        original_income=original.pages[11].extract_text()
        original_cf=original.pages[15].extract_text()
        definitions={
          'revenue':(12,'Revenue'), 'other_income_related_to_sales':(12,'Other income related to sales'),
          'revenue_and_other_income_related_to_sales':(12,'Revenue and other income related to sales'),
          'operating_costs':(12,'Operating costs'), 'operating_income':(12,'Operating income'),
          'income_before_income_taxes_and_zakat':(12,'Income before income taxes and zakat'),
          'income_taxes_and_zakat':(12,'Income taxes and zakat'), 'net_income':(12,'Net income'),
          'net_income_parent':(12,"Shareholders' equity"), 'cash':(14,'Cash and cash equivalents'),
          'total_assets':(14,'Total assets'),'total_liabilities':(14,'Total liabilities'),
          'total_equity':(14,'1,651,355'), 'operating_cash_flow':(16,'Net cash provided by operating activities'),
          'investing_cash_flow':(16,'Net cash used in investing activities'),
          'financing_cash_flow':(16,'Net cash used in financing activities'), 'capex':(16,'Capital expenditures')}
        comparisons=[]
        for row in restatement['rows']:
            metric=row['metric'];page,label=definitions[metric]
            text={12:original_income,14:original_bs,16:original_cf}[page]
            line=next(l for l in text.splitlines() if l.startswith(label+' ') or (metric=='total_equity' and l.startswith(label)))
            value=numbers(line)[0]
            comp=row['comparative_in_ara2025']
            if metric=='net_income_parent':
                # The parent allocation line is separately verified, not inferred from total net income.
                parent=next(l for l in source24.splitlines() if l.startswith('Shareholders'))
                comp=numbers(parent)[1]
            check('FY2024 '+metric+' direct original vs comparative',value==comp)
            comparisons.append(dict(metric=metric,original_pdf_sha256=FY24_HASH,original_pdf_page=page,
                original_printed_page=page-3,source_line=label,original_value_sar_millions=value,
                comparative_in_ara2025=comp,comparison='EQUAL_AT_PRINTED_PRECISION',
                newly_recovered_evidence_status='PENDING_CROSS_REVIEW_NOT_FINANCIAL_ACCEPTANCE'))
        cap=next(x for x in comparisons if x['metric']=='capex')
        check('CAPEX same signed outflow in both original and comparative',cap['original_value_sar_millions']==cap['comparative_in_ara2025']==-188890)
        # Unchanged totals do not prove unchanged presentation: inspect the component reclassification.
        old_components={}
        new_components={}
        for label in ['Selling, administrative and general','Depreciation and amortization']:
            old_components[label]=numbers(next(l for l in original_income.splitlines() if l.startswith(label)))[0]
            new_components[label]=numbers(next(l for l in source24.splitlines() if l.startswith(label)))[1]
        impairment=numbers(next(l for l in source24.splitlines() if l.startswith('Impairment and held for sale')))[1]
        check('FY2024 presentation components differ despite unchanged totals',
              old_components=={'Selling, administrative and general':-89235,'Depreciation and amortization':-103209} and
              new_components=={'Selling, administrative and general':-88931,'Depreciation and amortization':-91679} and impairment==-11834)
        check('FY2024 component reclassification preserves combined subtotal',sum(old_components.values())==sum(new_components.values())+impairment)
        note=document.pages[183].extract_text()
        check('FY2025 PDF184 explicitly explains2024impairment reclassification',
              'reclassified to conform' in note and 'previously recognized within depreciation and amortization' in note)
        presentation=dict(original_document_sha256=FY24_HASH,original_pdf_page=12,comparative_document_sha256=ANNUAL_HASH,
            comparative_pdf_page=174,explanatory_note_pdf_page=184,original_components=old_components,
            comparative_components=new_components,new_separate_impairment_line=impairment,
            original_combined_subtotal=sum(old_components.values()),comparative_combined_subtotal=sum(new_components.values())+impairment,
            interpretation='Observed presentation reclassification; unchanged aggregate totals do not rule out changed component presentation. No inferred earnings restatement.',
            new_evidence_self_accepted=False)
        core=[r for r in annual if r['core_metric']]
        slots=core+quarters
        unique={identity(x) for x in slots}
        all_q4=[x for x in quarters if x['same_instant_as_year_end']]
        counts=dict(source_summary=42,source_summary_engine_equal=matched,source_summary_engine_missing=missing,
                    extra_opening_cash_proxy=1,source_observations_including_proxy=43,
                    matches_including_proxy=matched+int(cash['engine_equal']),core_target_slots=len(slots),
                    unique_core_identities_within_QB2=len(unique),q4_balance_reuse_slots=len(all_q4),
                    q4_2023_duplicate_slots_inside_QB2=2,q4_2024_2025_slots_already_in_QB1=4,
                    new_target_identities_relative_to_QB1=len(unique)-4,
                    exact_annual_core_evidence_from_reviewed_summary=12,annual_cash_proxy_not_exact_identity=1,
                    exact_core_evidence_display_slots_including_prior_QB1=17,
                    exact_unique_core_evidence_identities=16,
                    new_exact_core_evidence_identities_not_in_QB1=12,
                    basis='17 exact slots =12 summary core +1 repeat2023equity +4priorQB1 balance links; proxy cash excluded. 17-1 duplicate2023equity=16 unique; subtract4priorQB1=12new')
        check('37 includes one opening cash proxy',ledger['counts']['engine_equal']==37 and counts['matches_including_proxy']==37)
        check('65 presentation slots are63 unique financial identities',len(slots)==65 and len(unique)==63)
        # These are acceptance assertions, not author checks. Retain failures as narrow findings.
        period23=next(r for r in matrix['annual'] if r['fiscal_year']==2023)
        check('R01 proxy excluded from exact FY2023 core coverage',period23['core_values_with_disclosure_evidence']==4,
              'Delivery says5; four exact core fields plus cashflow-opening proxy, not five exact balance/income identities')
        q4cash=next(r for r in quarters if r['id']=='QB2-A-cash-Q4-2023')
        check('R01 Q4 cash proxy still requires balance identity evidence','none for the value' not in q4cash['needed'],
              'Delivery says no evidence needed for value while the referenced record explicitly withholds balance identity')
        parent=next(r for r in restatement['rows'] if r['metric']=='net_income_parent')
        check('R02 no equality claim without recorded comparative operand',parent['comparative_in_ara2025'] is not None,
              'Delivery claims no difference but comparative operand is null; independent direct value393891 is new evidence, not present in that row')
        check('all author records remain withheld',all(r['qualification']['state']=='WITHHELD' and not r['qualification']['publication_authorized'] for r in annual+quarters))
    db.close();check('DB bytes unchanged',hashlib.sha256(dbpath.read_bytes()).hexdigest()==before)
    patch=subprocess.check_output(['git','diff','--name-only',APPLICATION,DELIVERY],cwd=ROOT,text=True).splitlines()
    check('implementation to delivery is7 report/data/log files only',len(patch)==7 and all(p.startswith('review-delivery/ARAMCO95/QB2/FINANCIAL-HISTORY/') for p in patch))
    copied=(PRIVATE/'AUTHOR33-REPLAY.txt').read_text(encoding='utf8')
    (HERE/'AUTHOR33-REPLAY.txt').write_text(copied,encoding='utf8',newline='\n')
    out=dict(schema='qb2-independent-review/1',application_sha=APPLICATION,delivery_sha=DELIVERY,
             observed_at_utc=datetime.now(timezone.utc).isoformat(),checks=checks,
             passed=sum(x['status']=='PASS' for x in checks),failed=sum(x['status']=='FAIL' for x in checks),
             skipped=0,counts=counts,summary_observations=observations,
             original_fy2024_new_crosschecks=comparisons,new_original_cash2023=dict(pdf_sha256=FY24_HASH,
                pdf_page=14,column='SAR comparative2023',value=198973,unit='SAR_millions',
                state='NEW_SOURCE_OBSERVATION_PENDING_CROSS_REVIEW_NOT_SELF_ACCEPTED'),
             original_fy2024_presentation_reclassification=presentation,
             holds=[7,22,142,0],financially_qualified=0,author_files_changed=False,
             decision='TARGETED_REWORK',scope='R01 exact-vs-proxy counts/needed flag; R02 null parent comparative evidence;42summary values passed')
    (HERE/'INDEPENDENT-RESULTS.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
    text='\n'.join(x['status']+' '+x['name']+(' — '+str(x['detail']) if x['detail'] else '') for x in checks)+'\n'
    (HERE/'INDEPENDENT-CHECKS.txt').write_text(text,encoding='utf8',newline='\n')
    print(json.dumps(dict(passed=out['passed'],failed=out['failed'],counts=counts)))
    return 1 if out['failed'] else 0


if __name__=='__main__':
    raise SystemExit(run())
