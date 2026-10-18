"""Read-only source cross-check; not a financial acceptance or import operation."""
from pathlib import Path
from datetime import datetime, timezone
import ast, hashlib, json, sqlite3, subprocess
from pypdf import PdfReader

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
ENGINE=ROOT.parents[1]/'aramco95-engine-b70254e'
ANNUAL_HASH='78bb678e8e45f5c58fa1b2402ab5a29c5ad10adfda8ba5e7ee5f4d1ad76cd227'
ANNUAL=ENGINE/f'data/raw/SA/2222/documents/{ANNUAL_HASH}.pdf'
H1=ROOT.parent/'web08b02-private-20261017/H1-Q2-2026.pdf'
file='data/imports/aramco-2025-annual-metrics.json'
recorded='1a836a305b8b4a48887468de1ae0a9f8e4c7a5dfde4f4cdcef01cfd12f498a5f'
old_commit='42bd5c4ede985323ce634a8d1b96697b3016c129'
current_commit='b70254e463c18e893fd042a82ecdad78209384d6'
get=lambda sha:subprocess.check_output(['git','show',sha+':'+file],cwd=ENGINE)
old_bytes,current_bytes=get(old_commit),get(current_commit)
assert hashlib.sha256(old_bytes).hexdigest()==recorded
old,new=json.loads(old_bytes),json.loads(current_bytes)
mapping_rel='src/finengine/mapping.py'
mapping_bytes=subprocess.check_output(['git','show',current_commit+':'+mapping_rel],cwd=ENGINE)
mapping_tree=ast.parse(mapping_bytes.decode('utf8'))
saudi_labels=next(ast.literal_eval(node.value) for node in mapping_tree.body if isinstance(node,ast.Assign) and any(isinstance(target,ast.Name) and target.id=='SAUDI_LABELS' for target in node.targets))
def metric_of(fact):
 return fact.get('metric',fact.get('metric_key')) or saudi_labels.get(' '.join(fact.get('label','').lower().split()))
label_cash=[x for x in old['facts'] if metric_of(x)=='cash' and x.get('label')=='cash and cash equivalents' and x.get('period_kind')=='instant' and x.get('period_end')=='2025-12-31']
assert len(label_cash)==1 and label_cash[0]['value']==243099
identity=lambda r:json.dumps({k:v for k,v in r.items() if k not in ('value','page','table')},sort_keys=True)
a={identity(r):r for r in old['facts']};b={identity(r):r for r in new['facts']}
assert len(a)==len(old['facts']) and len(b)==len(new['facts'])
assert not a.keys()-b.keys() and all(a[k]==b[k] for k in a.keys()&b.keys())
assert old['company_attributes']==new['company_attributes']
h1register=json.loads((ROOT/'review-delivery/WEB08B02/FINANCIAL-EVIDENCE-REGISTER.json').read_text(encoding='utf8'))
h1meta=next(x for x in h1register['documents'] if x['key']=='H1-Q2-2026')
assert hashlib.sha256(H1.read_bytes()).hexdigest()==h1meta['sha256']
assert hashlib.sha256(ANNUAL.read_bytes()).hexdigest()==ANNUAL_HASH
h1=PdfReader(H1);annual=PdfReader(ANNUAL)
texts={n:h1.pages[n-1].extract_text() for n in (29,31,42)}
for n,terms in {29:['167,387','243,099'],31:['170,853','95,365','210,607'],42:['PRefChem','3,466']}.items():
 assert all(t in texts[n] for t in terms)
assert 167387+3466==170853
balance=annual.pages[175].extract_text();assert all(t in balance for t in ['Cash and cash equivalents','243,099','216,642'])
assert 'Cash and cash equivalents' not in annual.pages[178].extract_text()
rt=HERE/'runtime';rt.mkdir(exist_ok=True)
poppler=Path('C:/Users/Mohammed856/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe')
for page in (29,31,42):
 subprocess.run([str(poppler),'-f',str(page),'-l',str(page),'-r','90','-singlefile','-png',str(H1),str(rt/f'H1-{page}')],check=True,capture_output=True)
dbfile=ENGINE/'data/financial.sqlite3';before=hashlib.sha256(dbfile.read_bytes()).hexdigest()
db=sqlite3.connect(dbfile.as_uri()+'?mode=ro',uri=True);db.row_factory=sqlite3.Row
rows=[dict(x) for x in db.execute("SELECT metric_key,period_kind,period_start,period_end,scope,value_decimal,source_key,is_calculated,calculation,version FROM data_points WHERE company_id='sa:2222' AND is_current=1 AND metric_key='cash' AND period_end IN ('2024-12-31','2025-12-31')")]
db.close();assert hashlib.sha256(dbfile.read_bytes()).hexdigest()==before
assert len(rows)==2 and all(x['source_key']=='file:'+recorded for x in rows)
# Inspect the committed database directly in memory, without opening the engine Database class (which repairs current flags).
committed_db_bytes=subprocess.check_output(['git','show',current_commit+':data/financial.sqlite3'],cwd=ENGINE)
assert committed_db_bytes[:16]==b'SQLite format 3\x00'
# SQLite deserialize cannot attach a WAL sidecar to :memory:. Change only journal format bytes in a private memory copy.
memory_image=bytearray(committed_db_bytes);memory_image[18:20]=b'\x01\x01'
committed_db=sqlite3.connect(':memory:');committed_db.deserialize(bytes(memory_image));committed_db.execute('PRAGMA query_only=ON');committed_db.row_factory=sqlite3.Row
fx2=[]
for record,metric,claimed_id in [('FQ01-OBS-001','revenue',2134),('FQ01-OBS-004','net_income',2135),('FQ01-OBS-006','operating_cash_flow',2139),('FQ01-OBS-053','total_equity',2138)]:
 kind='instant' if metric=='total_equity' else 'fy'
 originals=[dict(x) for x in committed_db.execute("SELECT id,version,source_key,is_current,value_decimal FROM data_points WHERE company_id='sa:2222' AND metric_key=? AND period_kind=? AND period_end='2024-12-31' AND is_current=1",(metric,kind))]
 claimed=dict(committed_db.execute('SELECT id,version,source_key,is_current,value_decimal FROM data_points WHERE id=?',(claimed_id,)).fetchone())
 assert len(originals)==1
 actual=originals[0]
 fx2.append(dict(record_id=record,committed_current={k:actual[k] for k in ['id','version','source_key','is_current']},claude_reported_post_repair_reference={k:claimed[k] for k in ['id','version','source_key','is_current']},is_current_field_context='is_current above is observed in committed database, not a reproduction of engine repair',values_equal=actual['value_decimal']==claimed['value_decimal'],post_repair_execution_independently_reproduced=False,fix_owner='Claude financial package; no financial files changed here'))
committed_db.close()
out=dict(status='SOURCE_CROSSCHECK_PREPARED_NOT_FINANCIAL_APPROVAL',observed_at=datetime.now(timezone.utc).isoformat(),engine_commit=current_commit,
 source_artifacts=[dict(kind='original_annual_PDF',sha256=ANNUAL_HASH,bytes=ANNUAL.stat().st_size,official_url='https://www.aramco.com/-/media/publications/corporate-reports/reports-and-presentations/2025/fy/saudi-aramco-ara-2025-english.pdf'),dict(kind='original_H1_PDF',sha256=h1meta['sha256'],bytes=H1.stat().st_size,official_url=h1meta['url'])],
 import_hash_analysis=dict(recorded_import_sha256=recorded,matching_git_commit=old_commit,matching_git_blob=subprocess.check_output(['git','rev-parse',old_commit+':'+file],cwd=ENGINE,text=True).strip(),current_import_sha256=hashlib.sha256(current_bytes).hexdigest(),raw_bytes_differ=True,not_a_line_ending_only_difference=True,old_fact_count=len(a),current_fact_count=len(b),unchanged_old_facts=len(a),removed_facts=0,changed_shared_facts=0,added_facts=[dict(metric=b[k].get('metric',b[k].get('metric_key')),period_end=b[k].get('period_end'),period_kind=b[k].get('period_kind')) for k in sorted(b.keys()-a.keys())],company_attributes_unchanged=True,cash_related_old_facts=[x for x in old['facts'] if metric_of(x) in ('cash','cash_end')]),
 engine_cash_rows=rows,traceability_limits=['Recorded JSON hash is now resolved to historical bytes, not a PDF hash','FY2025 cash instant exists as label in the historical JSON and maps to cash; it is not a cash_end/FY fallback. The inherited page179 still needs source-locator correction. This does not supply a B02C qualified evidence receipt.','Do not change source_key to newer JSON hash: it would erase historical identity'],
 fx1_correction=dict(previous_claim='No matching original FY2025 cash/instant entry',previous_claim_incorrect=True,matching_original_fact=label_cash[0],mapping_source=mapping_rel,mapping_line=11,mapping_sha256=hashlib.sha256(mapping_bytes).hexdigest(),mapped_metric=metric_of(label_cash[0]),cash_end_fallback_used=False,independent_qualification=False),
 fx2_shared_identity_discrepancies=dict(committed_engine=current_commit,committed_database_sha256=hashlib.sha256(committed_db_bytes).hexdigest(),memory_read_adapter='Only SQLite journal-format header bytes18/19 set to rollback mode in private in-memory copy to support deserialize; original Git bytes and source DB unchanged; query_only enabled',rows=fx2,scope='Read committed DB and referenced rows only; engine repair was not executed and financial package remains Claude-owned'),
 source_locator_check=dict(import_cash2024_pdf_page_claim=179,actual_annual_balance_pdf_page=176,actual_annual_balance_printed_page=174,page179_actual='Note1 General information, not cash row',comparison_columns=dict(current_year=2025,comparative_year=2024),two_values_match_source=True),
 prefchem_bridge=dict(unit='SAR_millions',period_end='2026-06-30',balance_cash=167387,cashflow_ending_cash=170853,cash_held_for_sale=3466,equation='167387 +3466 =170853',source_pdf_pages=[29,31,42],scope='Consolidated; PRefChem joint operations share classified held for sale',not_authorization_to_adjust_cash_or_gearing=True),
 followup_for_claude=['Preserve original/comparative document editions and actual locators','FX-1 corrected: preserve the label-to-cash dictionary mapping and do not use cash_end/FY fallback','FX-2: Claude owns correction of the four committed-versus-post-repair financial identities; no financial files changed here','Do not attach cash-only bridge as equity adjustment','Financially authorized review and rights remain separate'],
 holds=dict(analyses_blocked=7,claims_withheld=22,inputs_withheld=142,financially_qualified=0),financial_approval=False,rights_grant=False,engine_database_sha256_before_after=before,protected_files_written=0)
(HERE/'FIN-SOURCE-CROSSCHECK.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(dict(historical_hash_resolved=True,unchanged_facts=len(a),new_facts=len(b)-len(a),cash_bridge_verified=True,financial_qualification=0)))
