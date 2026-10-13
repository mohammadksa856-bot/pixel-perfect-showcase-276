"""One independently reviewed total CWIP cell, local Pipeline; no project guess."""
import argparse,dataclasses,gzip,hashlib,json,sqlite3,sys,threading
from pathlib import Path
from datetime import datetime,timezone
from urllib.request import Request,urlopen
def main():
 p=argparse.ArgumentParser();p.add_argument('--engine',required=True);p.add_argument('--run-id',default='v2');a=p.parse_args();root=Path(a.engine)
 sys.path[:0]=[str(root/'src'),str(root)]
 from finengine.database import Database
 from finengine.models import Company,Market,SourceDocument
 from finengine.pipeline import Pipeline
 from finengine.connectors.file import StoredDocumentConnector
 from finengine.api import create_api_server
 from scripts.data02_local_review import snap,canon,sha
 work=root/('output/DATA03-financial-20261013-'+a.run_id);work.mkdir(exist_ok=False)
 prior=root/'output/DATA03-review-20261013/current-engine/stage.sqlite3'
 old=sqlite3.connect('file:'+prior.as_posix()+'?mode=ro',uri=True);new=sqlite3.connect(work/'stage.sqlite3');old.backup(new);old.close();new.close()
 db=Database(work/'stage.sqlite3',initialize=False);c=db.conn;before=snap(c)
 backup=sqlite3.connect(work/'before.sqlite3');c.backup(backup);backup.close()
 audit_path=root/'docs/audits/DATA03_YAMAMA_TOTAL_CWIP_NAMED_CELL_20261013_v1.json';audit=json.loads(audit_path.read_bytes());named=audit['named_cell']
 assert named['scope']=='standalone'and named['normalized_value']=='1205456525'
 assert not c.execute("SELECT 1 FROM data_points WHERE company_id='sa:3020'AND metric_key='construction_in_progress'").fetchone()
 rows=[json.loads(l)for l in gzip.decompress((root/'output/DATA01-market-20261013-v2/readonly-market.jsonl.gz').read_bytes()).splitlines()]
 assert not any(r['kind']=='cell'and r['row']['company_id']=='sa:3020'and r['row']['metric_key']=='construction_in_progress'for r in rows)
 point={k:named[k]for k in ('metric','raw_value','scale','currency','period_kind','period_end','fiscal_year','scope','dimensions')}
 point.update(value=point.pop('raw_value'),unit='SAR',source_label=named['source_label'],page=25,table_ref=named['table_ref'])
 # Existing contract legal_entity represents the issuer's company-level accounts.
 # Preserve the reported standalone basis; never cast this into group accounts.
 point['scope']='legal_entity'
 body={'company_id':'sa:3020','symbol':'3020','market':'SA','profile':'corporate','reader':'manual.named-cell/data03',
  'filing_type':'financial-statements','source_url':audit['source_url'],'filed_at':datetime.now(timezone.utc).isoformat(),
  'filed_at_basis':'local_review_timestamp_not_official_publication','period_end':named['period_end'],'facts':[point]}
 content=canon(body).encode();sk='DATA03-financial-local:'+sha(content)
 co=dict(c.execute("SELECT * FROM companies WHERE company_id='sa:3020'").fetchone())
 company=Company(**{f.name:(Market(co['market'])if f.name=='market'else co[f.name])for f in dataclasses.fields(Company)if f.name in co})
 source=SourceDocument('sa:3020',Market.SA,audit['source_url'],sk,'financial-statements',body['filed_at'],content,
  metadata={'accepted_for_display':False,'financially_accepted':False,'official_known_at':None,'filed_at_unverified':True,
   'independent_named_cell_review':True,'native_pdf_sha256':audit['source_sha256'],'scope_confirmed':'legal_entity',
   'reported_statement_basis':'standalone','reporting_entity_name':'Yamama Cement Company',
   'component_of_PPE_total_not_additive':True,'named_cell_audit_sha256':sha(audit_path.read_bytes())})
 pipeline=Pipeline(db,work/'raw');result=pipeline.run(company,StoredDocumentConnector(source));assert result['status']=='published',result
 stored=dict(c.execute('SELECT * FROM data_points WHERE source_key=?',(sk,)).fetchone());assert stored['value_decimal']=='1205456525'and stored['scope']=='legal_entity'and not stored['is_calculated']
 repeat=pipeline.run(company,StoredDocumentConnector(source));assert repeat['status']=='duplicate'and repeat['published']==0
 after=snap(c);changes={t:sum(r not in after[t]for r in rs)for t,rs in before.items()};assert not any(changes.values())
 restored=sqlite3.connect(work/'rollback.sqlite3');backup=sqlite3.connect('file:'+(work/'before.sqlite3').as_posix()+'?mode=ro',uri=True);backup.backup(restored);backup.close();assert snap(restored)==before;restored.close();db.close()
 server=create_api_server(str(work/'stage.sqlite3'),'127.0.0.1',0,'data03-local');thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
 try:
  url=f'http://127.0.0.1:{server.server_address[1]}/v1/companies/SA/3020/metrics/construction_in_progress'
  with urlopen(Request(url,headers={'X-API-Key':'data03-local'}),timeout=30)as response:api=json.load(response)
  assert len(api)==1 and api[0]['scope']=='legal_entity' and api[0]['value'] is None and api[0]['quality_status']=='quarantined'
  assert api[0]['provenance']['extraction']['raw_value']is None
 finally:server.shutdown();server.server_close();thread.join(timeout=5)
 report={'observed_at':datetime.now(timezone.utc).isoformat(),'source_sha256':audit['source_sha256'],'source_key':sk,
  'first':result,'repeat':repeat,'stored_point':stored,'API_record':api[0],'new_cells':1,'new_periods':0,
  'existing_rows_changed':changes,'rollback_full_rows':True,'scope':'legal_entity','reported_statement_basis':'standalone','scope_forced_consolidated':False,
  'project_amount_corrected_or_imported':False,'PPE_total_replayed':False,'financial_accepted':0,'accepted_for_display':0,
  'production_changes':0,'copyright':'No fullPDF/page-image GitHubredistribution; portableURL/hash/page facts only'}
 (work/'receipt.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'new_cells':1,'scope':'legal_entity','reported_statement_basis':'standalone','API_values_exposed':0,'rollback':True,'production_changes':0}))
if __name__=='__main__':main()
