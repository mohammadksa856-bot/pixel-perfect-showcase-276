"""Independent non-regression checks on Codex's unchanged guard/propose_q4, with real b90fbc9 observations (no PDF)."""
import sys, json, copy, unittest, importlib
from pathlib import Path
D=Path(__file__).resolve().parent/'new'
sys.argv=['x',str(D)]
exec(open(Path(__file__).resolve().parent/'harness.py').read().split('import build_ledgers')[0])
import build_ledgers as B, semantic_compatibility as S
obs=json.loads((D/'EXTRACTED-OBSERVATIONS.json').read_text())['observations']
def find(src,field,kind,end):
    r=[o for o in obs if o['source_id']==src and o['field_id']==field and o['period']['kind']==kind and o['period']['end']==end]
    assert len(r)==1,(src,field,kind,end,len(r)); return copy.deepcopy(r[0])
class T(unittest.TestCase):
    def setUp(self): S.original_observations.cache_clear()
    def test_real_2025_da_blocked(self):
        for f in ['depreciation_amortization','depreciation_amortization_cash_flow']:
            r=B.propose_q4(f,find('ARA2025',f,'fy','2025-12-31'),find('Q3-2025',f,'ytd','2025-09-30'))
            self.assertEqual((r['proposal_status'],r['proposed_value'],r['approved']),('BLOCKED_MIXED_BASIS',None,False))
            self.assertTrue(r['diagnostic_only']['not_for_ingestion']); self.assertFalse(r['diagnostic_only']['usable_value'])
    def test_same_legacy_basis_2024_not_blocked_but_not_approved(self):
        r=B.propose_q4('depreciation_amortization',find('FY2024-FS','depreciation_amortization','fy','2024-12-31'),find('Q3-2024','depreciation_amortization','ytd','2024-09-30'))
        self.assertEqual(r['semantic_edition_compatibility']['state'],'NO_MIXED_BASIS_DETECTED_NOT_APPROVED'); self.assertFalse(r['approved'])
        self.assertFalse(r['semantic_edition_compatibility']['same_reporting_basis_independently_approved'])
    def test_similar_case_2024_new_fy_vs_legacy_ytd_blocked(self):
        # FY2024 from the ARA2025 comparative (new presentation) minus Q3-2024 YTD (legacy): same pattern as HX-F2.
        fy=find('ARA2025','depreciation_amortization','fy','2024-12-31')
        r=B.propose_q4('depreciation_amortization',fy,find('Q3-2024','depreciation_amortization','ytd','2024-09-30'))
        self.assertEqual((r['proposal_status'],r['proposed_value']),('BLOCKED_MIXED_BASIS',None))
    def test_tampered_value_is_unestablished(self):
        fy=find('ARA2025','depreciation_amortization','fy','2025-12-31'); fy['normalized_observation_value']='-77601000000'
        r=B.propose_q4('depreciation_amortization',fy,find('Q3-2025','depreciation_amortization','ytd','2025-09-30'))
        self.assertEqual((r['proposal_status'],r['proposed_value']),('BLOCKED_BASIS_UNESTABLISHED',None))
    def test_unknown_source_is_unestablished(self):
        fy=find('ARA2025','revenue','fy','2025-12-31'); y=find('Q3-2025','revenue','ytd','2025-09-30'); y['source_id']='Q3-2025-REISSUE'
        r=B.propose_q4('revenue',fy,y); self.assertEqual((r['proposal_status'],r['proposed_value']),('BLOCKED_BASIS_UNESTABLISHED',None))
    def test_wrong_hash_raises(self):
        fy=find('ARA2025','revenue','fy','2025-12-31'); fy['source_document_sha256']='0'*64
        with self.assertRaises(ValueError): B.propose_q4('revenue',fy,find('Q3-2025','revenue','ytd','2025-09-30'))
    def test_non_additive_and_endpoint_raise(self):
        for f in ['basic_eps','cash_end','cash_beginning','free_cash_flow','weighted_average_shares_basic']:
            with self.assertRaises(ValueError): B.propose_q4(f,{},{})
    def test_balance_not_flow_raises(self):
        fy=find('ARA2025','revenue','fy','2025-12-31'); y=find('Q3-2025','revenue','ytd','2025-09-30'); y['value_nature']='BALANCE'
        with self.assertRaises(ValueError): B.propose_q4('revenue',fy,y)
    def test_unblocked_revenue_unchanged_value(self):
        fy=find('ARA2025','revenue','fy','2025-12-31'); y=find('Q3-2025','revenue','ytd','2025-09-30')
        r=B.propose_q4('revenue',fy,y)
        from decimal import Decimal
        self.assertEqual(r['proposed_value'],str(Decimal(fy['normalized_observation_value'])-Decimal(y['normalized_observation_value'])))
        self.assertIsNone(r['diagnostic_only'])
    def test_guard_ignores_signals_for_non_da_fields(self):
        # Documents a limit, not a current defect: a VALUES_DIFFER signal on a non-D&A field does not block.
        rec=json.loads((D/'EDITION-RECONCILIATIONS.json').read_text()); orig=copy.deepcopy(rec)
        rec['comparisons'].append(dict(field_id='revenue',kind='ytd',start='2025-01-01',end='2025-09-30',observation_ids=[],status='VALUES_DIFFER_REQUIRES_EDITION_AND_DEFINITION_REVIEW'))
        (D/'EDITION-RECONCILIATIONS.json').write_text(json.dumps(rec))
        try:
            r=B.propose_q4('revenue',find('ARA2025','revenue','fy','2025-12-31'),find('Q3-2025','revenue','ytd','2025-09-30'))
            c=r['semantic_edition_compatibility']
            self.assertEqual(len(c['within_year_edition_difference_signals']),1)
            self.assertEqual(c['state'],'NO_MIXED_BASIS_DETECTED_NOT_APPROVED')
            self.assertIsNotNone(r['proposed_value'])
        finally:
            (D/'EDITION-RECONCILIATIONS.json').write_text(json.dumps(orig,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__': unittest.main(argv=['mutation_test'],verbosity=2)
