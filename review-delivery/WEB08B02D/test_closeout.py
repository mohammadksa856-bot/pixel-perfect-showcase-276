import copy
import json
from pathlib import Path
import unittest
from closeout import compare

def observation():
    return {'engine_mapping':'synthetic_metric','observed_amount':'7','source_scale':'1000',
        'identity':{'companyId':'TEST:SYNTH','kind':'fy','start':'2025-01-01','end':'2025-12-31','fiscalYear':2025,'fiscalQuarter':None,'scope':'consolidated','dimensions':{},'currency':'SAR','unit':'SAR'}}
def point():
    return {'id':17,'version':1,'company_id':'TEST:SYNTH','metric_key':'synthetic_metric','period_start':'2025-01-01','period_end':'2025-12-31','period_kind':'fy','fiscal_year':2025,'fiscal_quarter':0,'scope':'consolidated','dimensions_json':'{}','unit':'SAR','currency':'SAR','value_decimal':'7000','source_url':'https://synthetic.example.invalid/original','source_key':'synthetic-source','is_current':1,'is_calculated':0}
URL='https://synthetic.example.invalid/original'

class DiagnosticsTests(unittest.TestCase):
    def test_exact(self):self.assertEqual(compare(observation(),[point()],URL)['classification'],'LOCAL_CURRENT_SOURCE_AMOUNT_AGREE')
    def test_sign_not_corrected(self):
        p=point();p['value_decimal']='-7000';before=copy.deepcopy(p)
        self.assertEqual(compare(observation(),[p],URL)['classification'],'LOCAL_CURRENT_SIGN_DIFFERENCE');self.assertEqual(p,before)
    def test_period_start(self):
        p=point();p['period_start']='2025-10-01';self.assertEqual(compare(observation(),[p],URL)['classification'],'LOCAL_FULL_PERIOD_DIFFERENCE')
    def test_period_kind(self):
        p=point();p['period_kind']='quarter';self.assertEqual(compare(observation(),[p],URL)['classification'],'LOCAL_FULL_PERIOD_DIFFERENCE')
    def test_scope(self):
        p=point();p['scope']='segment';self.assertEqual(compare(observation(),[p],URL)['classification'],'LOCAL_SCOPE_OR_DIMENSION_DIFFERENCE')
    def test_units(self):
        p=point();p['unit']='USD';self.assertEqual(compare(observation(),[p],URL)['classification'],'LOCAL_UNIT_OR_CURRENCY_DIFFERENCE')
    def test_conflicts_both_orders(self):
        a=point();b=point();b['id']=18;b['value_decimal']='8000'
        for rows in ([a,b],[b,a]):self.assertEqual(compare(observation(),rows,URL)['classification'],'LOCAL_CURRENT_CONFLICT')
    def test_retired_match_not_resurrected(self):
        p=point();p['is_current']=0
        self.assertEqual(compare(observation(),[p],URL)['classification'],'LOCAL_HISTORICAL_SOURCE_AMOUNT_AGREE')
    def test_source_not_relabelled(self):
        p=point();p['source_url']='https://synthetic.example.invalid/comparative'
        self.assertEqual(compare(observation(),[p],URL)['classification'],'LOCAL_CURRENT_AMOUNT_AGREE_OTHER_SOURCE')
    def test_missing_not_zero(self):
        p=point();p['value_decimal']=None;self.assertEqual(compare(observation(),[p],URL)['classification'],'LOCAL_VALUE_UNAVAILABLE')
    def test_unmapped_not_guessed(self):
        o=observation();o['engine_mapping']=None;self.assertEqual(compare(o,[point()],URL)['classification'],'UNMAPPED_DEFINITION')
    def test_missing_metric_local_only(self):self.assertEqual(compare(observation(),[],URL)['classification'],'LOCAL_METRIC_NOT_PRESENT')
    def test_all_142_dispositions_not_qualifications(self):
        d=json.loads((Path(__file__).parent/'CLOSEOUT-REGISTER.json').read_text(encoding='utf-8'))
        self.assertEqual({r['audit_row'] for r in d['results']},{f'OBS-{i:03d}' for i in range(1,143)})
        self.assertEqual(sum(d['local_comparison_counts'].values()),142)
        self.assertEqual(d['financially_resolved'],0);self.assertEqual(d['research_qualified'],0)
        for r in d['results']:
            self.assertEqual(r['audit_disposition'],'CLOSED_WITH_WITHHOLD');self.assertEqual(r['eligibility'],'WITHHELD')
            self.assertFalse(r['publicationAuthorized']);self.assertIsNone(r['engine_fact_ref'])
            self.assertTrue(r['corrective_action']);self.assertTrue(r['review_checklist'])
            self.assertTrue(r['source_evidence']['bytes_verified']);self.assertTrue(r['source_evidence']['paper_digest_verified'])
    def test_no_real_amounts_in_public_register(self):
        d=json.loads((Path(__file__).parent/'CLOSEOUT-REGISTER.json').read_text(encoding='utf-8'))
        def walk(v):
            if isinstance(v,dict):
                self.assertFalse(set(v)&{'observed_amount','value_decimal','raw_value','fact_sha256','document_version'})
                for child in v.values():walk(child)
            elif isinstance(v,list):
                for child in v:walk(child)
        walk(d)

if __name__=='__main__':unittest.main(verbosity=2)
