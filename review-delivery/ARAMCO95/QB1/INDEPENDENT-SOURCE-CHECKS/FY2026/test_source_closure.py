"""Positive and adversarial checks on evidence observations, not financial approval."""
from pathlib import Path
from copy import deepcopy
import hashlib
import json
import subprocess
import unittest
from check_original_sources import validate_observation, ROOT

HERE = Path(__file__).resolve().parent
NONFIN = HERE.parents[1] / 'NONFINANCIAL'
REGISTER = json.loads((HERE / 'FY2026-ORIGINAL-SOURCE-REGISTER.json').read_text(encoding='utf8'))


class ClosureTests(unittest.TestCase):
    def test_13_distinct_original_observations(self):
        rows = REGISTER['records']
        self.assertEqual(len(rows), 13)
        self.assertEqual(len({r['record_id'] for r in rows}), 13)
        for r in rows:
            with self.subTest(record=r['record_id']):
                self.assertTrue(validate_observation(r))

    def test_period_kind_not_end_date_alone(self):
        row = deepcopy(REGISTER['records'][0])
        row['period']['kind'] = 'fy'
        with self.assertRaisesRegex(ValueError, 'period_identity_mismatch'):
            validate_observation(row)

    def test_period_start_not_invented(self):
        row = deepcopy(next(x for x in REGISTER['records'] if x['engine_metric_key'] == 'cash'))
        self.assertIsNone(row['period']['start'])
        row['period']['start'] = '2026-01-01'
        with self.assertRaisesRegex(ValueError, 'period_identity_mismatch'):
            validate_observation(row)

    def test_currency_cannot_be_usd(self):
        row = deepcopy(REGISTER['records'][0]); row['currency'] = 'USD'
        with self.assertRaisesRegex(ValueError, 'currency_or_scale_mismatch'):
            validate_observation(row)

    def test_millions_scale_not_silent_units(self):
        row = deepcopy(REGISTER['records'][0]); row['source_scale'] = 'units'
        with self.assertRaisesRegex(ValueError, 'currency_or_scale_mismatch'):
            validate_observation(row)

    def test_import_hash_not_pdf_hash(self):
        row = deepcopy(REGISTER['records'][0]); row['source_document_sha256'] = row['engine_reference']['source_key'][5:]
        with self.assertRaisesRegex(ValueError, 'unrecognized_original_document'):
            validate_observation(row)

    def test_different_value_rejected(self):
        row = deepcopy(REGISTER['records'][0]); row['engine_value_sar'] = '1'
        with self.assertRaisesRegex(ValueError, 'value_mismatch'):
            validate_observation(row)

    def test_cash_end_not_balance_cash(self):
        row = deepcopy(next(x for x in REGISTER['records'] if x['record_id'] == 'FQ01-OBS-072'))
        row['source_line'] = 'Cash and cash equivalents at end of the period'
        with self.assertRaisesRegex(ValueError, 'cash_identity_mismatch'):
            validate_observation(row)

    def test_source_review_cannot_grant_financial_acceptance(self):
        row = deepcopy(REGISTER['records'][0]); row['financial_acceptance'] = True
        with self.assertRaisesRegex(ValueError, 'unauthorized_qualification'):
            validate_observation(row)

    def test_holds_and_reconciliations_remain_open(self):
        self.assertEqual(REGISTER['holds'], dict(analyses_blocked=7, claims_withheld=22, inputs_withheld=142, financially_qualified=0))
        self.assertEqual(REGISTER['R1_R8'], 'OPEN_NO_GLOBAL_CLOSURE')
        self.assertTrue(all(x['qualification'] == 'WITHHELD' for x in REGISTER['records']))

    def test_source_q2_printed_not_derived(self):
        self.assertTrue(all(x['source_value_directly_printed'] and not x['quarterly_derivation_used'] for x in REGISTER['records']))
        self.assertEqual(len(REGISTER['quarter_consistency_checks']), 3)

    def test_pending_six_not_closed_by_timeout(self):
        r = json.loads((NONFIN / 'SOURCE-CLOSURE/UPDATED-PENDING-REGISTER.json').read_text(encoding='utf8'))
        self.assertEqual(r['pending_count'], 6)
        self.assertEqual(r['new_pending_records_closed'], 0)
        self.assertTrue(all(x['pending'] and not x['approved_by_preparer'] for x in r['records']))

    def test_accepted_19_records_not_rewritten(self):
        path = 'review-delivery/ARAMCO95/QB1/NONFINANCIAL/NONFIN-EVIDENCE-LEDGER.json'
        old = subprocess.check_output(['git', 'show', '0c0de9e95babcfcd55d852c4e65c81d9ca0943be:' + path], cwd=ROOT)
        self.assertEqual(hashlib.sha256(old).hexdigest(), hashlib.sha256((ROOT/path).read_bytes()).hexdigest())


if __name__ == '__main__':
    unittest.main(verbosity=2)
