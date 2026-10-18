"""Mechanical evidence-contract/hold tests, not independent acceptance of this producer's work."""
from pathlib import Path
from copy import deepcopy
import json, unittest

HERE=Path(__file__).resolve().parent
EXPECTED={'legal_name','legal_name_ar','isin','listing_date','legal_form','founding_date','headquarters_address','reporting_standard','website','investor_relations_url','business_description','products_services','geographic_presence','subsidiaries_count','ceo_name','chairman_name','auditor','employees','credit_rating'}
ANNUAL='78bb678e8e45f5c58fa1b2402ab5a29c5ad10adfda8ba5e7ee5f4d1ad76cd227'
load=lambda name:json.loads((HERE/name).read_text(encoding='utf8'))

def validate(ledger,sources):
 rows=ledger['records'];ss={s['source_id']:s for s in sources['sources']}
 assert len(rows)==19 and {r['original_field_id'] for r in rows}==EXPECTED
 assert len({r['record_id'] for r in rows})==19
 assert ledger['holds']==dict(analyses_blocked=7,claims_withheld=22,inputs_withheld=142,financially_qualified=0)
 assert ledger['preparation_status']=='PREPARED_FOR_CROSS_REVIEW_NOT_ACCEPTED'
 for s in ss.values():
  assert s['url'].startswith('https://www.aramco.com/')
  if s['kind']=='official_live_web':assert s['artifact_sha256'] is None and s['publication_date'] is None
  if s['kind']=='official_annual_report':assert s['artifact_sha256']==ANNUAL
 for r in rows:
  for k in ('original_engine_value','source_observation_value','definition_ar','factory_category','engine_reference','evidence','dates','freshness','display','approval','issues'):assert k in r
  assert r['factory_category']['key']=='company_profile' and r['factory_category']['field_group']=='company_model'
  assert r['investor_topic']['not_factory_category'] is True
  assert type(r['engine_reference']['attribute_id']) is int
  a=r['approval'];assert a['independent_cross_review']=='PENDING_NOT_SELF_ACCEPTED'
  assert a['publication_authorized'] is False and a['financial_approval'] is False and a['rights_grant']=='UNKNOWN_NO_GRANT_ISSUED'
  assert r['dates']['valid_until'] is None and r['dates']['source_publication_date'] is None
  assert not r['evidence']['site_presence_is_source_proof']
  assert r['evidence']['source_ids'] and all(k in ss for k in r['evidence']['source_ids'])
  assert r['evidence']['locators']
  if 'ANN2025' not in r['evidence']['source_ids']:assert r['dates']['information_as_of'] is None
  for loc in r['evidence']['locators']:
   assert loc['source_id'] in ss
   if 'pdf_page' in loc:assert 1<=loc['pdf_page']<=246 and loc['printed_page']==loc['pdf_page']-2
  for level in ('overview','investor','data'):assert r['display'][level]['route'].startswith('/preview/web-v1/companies/2222')
 return True

class EvidenceTests(unittest.TestCase):
 def setUp(self):self.ledger=load('NONFIN-EVIDENCE-LEDGER.json');self.manifest=load('NONFIN-SOURCE-MANIFEST.json')
 def test_contract(self):self.assertTrue(validate(self.ledger,self.manifest))
 def test_not_nineteen_by_padding(self):
  self.ledger['records'].append(deepcopy(self.ledger['records'][0]))
  with self.assertRaises(AssertionError):validate(self.ledger,self.manifest)
 def test_no_catalog_substitution(self):
  self.ledger['records'][0]['original_field_id']='business_segments'
  with self.assertRaises(AssertionError):validate(self.ledger,self.manifest)
 def test_no_self_acceptance(self):
  self.ledger['records'][0]['approval']['independent_cross_review']='ACCEPT'
  with self.assertRaises(AssertionError):validate(self.ledger,self.manifest)
 def test_no_publication(self):
  self.ledger['records'][0]['approval']['publication_authorized']=True
  with self.assertRaises(AssertionError):validate(self.ledger,self.manifest)
 def test_no_rights_grant(self):
  self.ledger['records'][0]['approval']['rights_grant']='PERMITTED'
  with self.assertRaises(AssertionError):validate(self.ledger,self.manifest)
 def test_no_financial_qualification(self):
  self.ledger['holds']['financially_qualified']=1
  with self.assertRaises(AssertionError):validate(self.ledger,self.manifest)
 def test_no_invented_web_artifact_hash(self):
  self.manifest['sources'][1]['artifact_sha256']='a'*64
  with self.assertRaises(AssertionError):validate(self.ledger,self.manifest)
 def test_no_json_hash_masquerading_as_pdf(self):
  self.manifest['sources'][0]['artifact_sha256']='1a836a305b8b4a48887468de1ae0a9f8e4c7a5dfde4f4cdcef01cfd12f498a5f'
  with self.assertRaises(AssertionError):validate(self.ledger,self.manifest)
 def test_no_unsafe_source_link(self):
  self.manifest['sources'][0]['url']='javascript:alert(1)'
  with self.assertRaises(AssertionError):validate(self.ledger,self.manifest)
 def test_web_not_backdated(self):
  r=next(r for r in self.ledger['records'] if r['original_field_id']=='isin');r['dates']['information_as_of']='2025-12-31'
  with self.assertRaises(AssertionError):validate(self.ledger,self.manifest)
 def test_no_guessed_expiry(self):
  self.ledger['records'][0]['dates']['valid_until']='2027-01-01'
  with self.assertRaises(AssertionError):validate(self.ledger,self.manifest)
 def test_no_manufactured_engine_id(self):
  self.ledger['records'][0]['engine_reference']['attribute_id']='synthetic-id'
  with self.assertRaises(AssertionError):validate(self.ledger,self.manifest)
 def test_subsidiaries_definition_stays_open(self):
  r=next(r for r in self.ledger['records'] if r['original_field_id']=='subsidiaries_count')
  self.assertEqual(r['evidence']['status'],'DEFINITION_CONFLICT');self.assertEqual(r['source_observation_value']['includes'],['subsidiaries','joint arrangements','associates'])
 def test_employees_parent_scope(self):
  r=next(r for r in self.ledger['records'] if r['original_field_id']=='employees')
  self.assertEqual(r['source_observation_value']['scope'],'Saudi Arabian Oil Company (the Company)')
 def test_calendar_boundaries_not_invented(self):
  r=next(r for r in self.ledger['records'] if r['original_field_id']=='founding_date')
  self.assertEqual(r['original_engine_value'],'1933');self.assertEqual(r['source_observation_value']['legal_entity_formed'],'1988-11-13')
 def test_financial_bridge_and_version_history(self):
  f=json.loads((HERE.parent/'INDEPENDENT-SOURCE-CHECKS/FIN-SOURCE-CROSSCHECK.json').read_text())
  b=f['prefchem_bridge'];self.assertEqual(b['balance_cash']+b['cash_held_for_sale'],b['cashflow_ending_cash'])
  a=f['import_hash_analysis'];self.assertEqual(a['unchanged_old_facts'],173);self.assertEqual(a['current_fact_count'],176);self.assertEqual(a['changed_shared_facts'],0)
  self.assertFalse(f['financial_approval']);self.assertFalse(f['rights_grant'])
 def test_cash_locator_not_inherited(self):
  f=json.loads((HERE.parent/'INDEPENDENT-SOURCE-CHECKS/FIN-SOURCE-CROSSCHECK.json').read_text())
  self.assertEqual(f['source_locator_check']['actual_annual_balance_pdf_page'],176)
  self.assertNotEqual(f['source_locator_check']['import_cash2024_pdf_page_claim'],176)

if __name__=='__main__':unittest.main(verbosity=2)
