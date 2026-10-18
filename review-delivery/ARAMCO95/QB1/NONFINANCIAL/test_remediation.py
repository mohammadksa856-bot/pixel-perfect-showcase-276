"""Source checks use original PDFs via a reader separate from the generator.
These are preparer checks, not acceptance of this preparer's changes.
"""
from pathlib import Path
import ast,hashlib,json,subprocess,unittest
import pdfplumber

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3];ENGINE=ROOT.parents[1]/'aramco95-engine-b70254e'
ANNUAL='78bb678e8e45f5c58fa1b2402ab5a29c5ad10adfda8ba5e7ee5f4d1ad76cd227'
PRIOR='7d65277df4dc25b9755520b871d0bfcfbf63c281'
CROSS='0d57c73a37250d4265016b6c003d25bbe15a6153'
load=lambda name:json.loads((HERE/name).read_text(encoding='utf8'))
read_prior=lambda rel:json.loads(subprocess.check_output(['git','show',PRIOR+':'+rel],cwd=ROOT))

class RemediationStructure(unittest.TestCase):
 def setUp(self):
  self.ledger=load('NONFIN-EVIDENCE-LEDGER.json');self.rows={r['original_field_id']:r for r in self.ledger['records']}
  self.old={r['original_field_id']:r for r in read_prior('review-delivery/ARAMCO95/QB1/NONFINANCIAL/NONFIN-EVIDENCE-LEDGER.json')['records']}
 def test_only_three_records_changed(self):self.assertEqual({k for k in self.rows if self.rows[k]!=self.old[k]},{'employees','products_services','business_description'})
 def test_ten_evidence_ok_records_unchanged(self):
  ten=['legal_name','listing_date','legal_form','headquarters_address','reporting_standard','website','geographic_presence','ceo_name','chairman_name','auditor']
  for k in ten:self.assertEqual(self.rows[k],self.old[k],k)
 def test_six_pending_records_unchanged(self):
  for r in load('PENDING-DECISIONS.json')['records']:self.assertEqual(self.rows[r['field_id']],self.old[r['field_id']])
 def test_original_engine_values_and_references_unchanged(self):
  for k,r in self.rows.items():
   self.assertEqual(r['original_engine_value'],self.old[k]['original_engine_value']);self.assertEqual(r['engine_reference'],self.old[k]['engine_reference'])
 def test_employees_not_year_end_or_average(self):
  r=self.rows['employees'];self.assertIsNone(r['dates']['information_as_of']);self.assertEqual(r['dates']['period'],'FY2025');self.assertEqual(r['source_observation_value']['measurement_basis'],'NOT_STATED')
 def test_employees_two_distinct_footnotes(self):
  loc={x['pdf_page']:x for x in self.rows['employees']['evidence']['locators']};self.assertEqual(loc[16]['footnote'],4);self.assertEqual(loc[76]['footnote'],6);self.assertNotEqual(loc[16]['role'],loc[76]['role'])
 def test_description_paraphrase_8_9(self):
  r=self.rows['business_description'];self.assertEqual([l['pdf_page'] for l in r['evidence']['locators']],[8,9]);self.assertEqual(r['evidence']['status'],'SOURCE_SUPPORTED_PARAPHRASE');self.assertEqual(r['evidence']['representation'],'PARAPHRASE_NOT_DIRECT_QUOTATION')
 def test_products_56_primary_50_supporting(self):
  v=self.rows['products_services']['source_observation_value'];self.assertEqual(v['primary_pdf_page'],56);self.assertEqual(v['supporting_upstream_pdf_page'],50)
 def test_products_distribution_not_invented_in_engine(self):
  r=self.rows['products_services'];self.assertIn('distribution',r['source_observation_value']['direct_downstream_terms']);self.assertNotIn('distribution',r['original_engine_value']);self.assertFalse(r['source_observation_value']['engine_list_modified'])
 def test_products_mapping_all_items(self):
  r=self.rows['products_services'];self.assertEqual([v['engine_item'] for v in r['source_observation_value']['item_mapping']],r['original_engine_value'])
  for v in r['source_observation_value']['item_mapping']:
   if v['engine_item'] in ['retail fuels','trading','power']:self.assertNotEqual(v['relation'],'DIRECT_TERM')
 def test_no_self_acceptance_or_release(self):
  for r in self.rows.values():self.assertEqual(r['approval'],self.old[r['original_field_id']]['approval']);self.assertFalse(r['approval']['publication_authorized'])
 def test_no_pending_case_closed(self):
  p=load('PENDING-DECISIONS.json');self.assertEqual(len(p['records']),6);self.assertTrue(p['none_closed_by_preparer']);self.assertTrue(all(r['state'].startswith('PENDING_') for r in p['records']))
 def test_correction_log_matches_actual_changed_fields(self):
  c=load('CORRECTION-LOG.json');self.assertEqual(c['review_sha'],CROSS);self.assertEqual(c['changed_records'],['business_description','products_services','employees']);self.assertEqual(len(c['unchanged_records_sha256']),16)
 def test_financial_FX1_fixed_and_FX2_owned_by_claude(self):
  f=json.loads((HERE.parent/'INDEPENDENT-SOURCE-CHECKS/FIN-SOURCE-CROSSCHECK.json').read_text());self.assertTrue(f['fx1_correction']['previous_claim_incorrect']);self.assertEqual(f['fx1_correction']['mapped_metric'],'cash');self.assertFalse(f['fx1_correction']['cash_end_fallback_used']);self.assertEqual(len(f['fx2_shared_identity_discrepancies']['rows']),4)
  for row in f['fx2_shared_identity_discrepancies']['rows']:self.assertTrue(row['values_equal']);self.assertFalse(row['post_repair_execution_independently_reproduced'])

class IndependentSourceReads(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.path=ENGINE/f'data/raw/SA/2222/documents/{ANNUAL}.pdf';cls.pdf=pdfplumber.open(cls.path)
  cls.text=lambda _,n:' '.join(cls.pdf.pages[n-1].extract_text().split())
 @classmethod
 def tearDownClass(cls):cls.pdf.close()
 def test_annual_original_sha256(self):self.assertEqual(hashlib.sha256(self.path.read_bytes()).hexdigest(),ANNUAL)
 def test_employee_value_and_reference4_on16(self):
  t=self.text(16);self.assertIn('Company employees4',t);self.assertIn('76,664',t);self.assertIn('4. Refer to Section 3',t)
 def test_footnote6_on16_is_not_employee_scope(self):self.assertIn('6. Excludes SABIC Agri-Nutrients',self.text(16))
 def test_employee_scope_footnote6_on76(self):
  t=self.text(76);self.assertIn('Company employees6',t);self.assertIn('6. Applies to the Saudi Arabian Oil Company (the Company).',t);self.assertIn('2025 2024 2023 2022 2021',t)
 def test_safety_scope_not_employee_scope(self):self.assertIn('1. Applies to the Saudi Arabian Oil Company and its operationally controlled entities.',self.text(76))
 def test_description_company_on8(self):self.assertIn('integrated energy and chemicals companies',self.text(8))
 def test_description_segments_on9(self):self.assertIn('Our operating segments are Upstream and Downstream, which are supported by Corporate activities.',self.text(9))
 def test_downstream_direct_list_on56(self):
  # Three-column page: constrain to the visually verified first column, not interleaved full-page lines.
  text=' '.join(self.pdf.pages[55].crop((20,350,212,760)).extract_text().split())
  self.assertIn('refining, chemicals, supply and trading, distribution, retail, base oils, lubricants, and power generation.',text)
 def test_upstream_terms_on50(self):
  t=self.text(50).lower()
  for term in ['crude oil','condensate','natural gas','ngl']:self.assertIn(term,t)
 def test_FX1_label_from_historical_original_json(self):
  old=json.loads(subprocess.check_output(['git','show','42bd5c4:data/imports/aramco-2025-annual-metrics.json'],cwd=ENGINE))
  v=[f for f in old['facts'] if f.get('label')=='cash and cash equivalents' and f.get('period_end')=='2025-12-31' and f.get('period_kind')=='instant'];self.assertEqual(len(v),1);self.assertEqual(v[0]['value'],243099)
 def test_FX1_dictionary_from_engine_source_not_our_generator(self):
  b=subprocess.check_output(['git','show','b70254e:src/finengine/mapping.py'],cwd=ENGINE);tree=ast.parse(b.decode());m=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='SAUDI_LABELS' for t in n.targets));self.assertEqual(m['cash and cash equivalents'],'cash')
 def test_FX3_original_H1_hash_and_note(self):
  p=ROOT.parent/'web08b02-private-20261017/H1-Q2-2026.pdf';self.assertEqual(hashlib.sha256(p.read_bytes()).hexdigest(),'4773cfe444de7e9734a65a59d8e1dd301229d9aa05164729e2b8f983d81cfb41')
  with pdfplumber.open(p) as pdf:
   self.assertIn('167,387',pdf.pages[28].extract_text());self.assertIn('170,853',pdf.pages[30].extract_text());self.assertIn('3,466',pdf.pages[41].extract_text());self.assertIn('PRefChem',pdf.pages[41].extract_text())

if __name__=='__main__':unittest.main(verbosity=2)
