import copy
import json
import unittest
from build_queue import BASE, HERE, RIGHTS, build


class FollowupTests(unittest.TestCase):
    def setUp(self):
        self.original = json.loads(BASE.read_text(encoding='utf-8'))
        self.authorization = json.loads((HERE / 'authorization.json').read_text(encoding='utf-8'))

    def test_all_rows_preserved_without_approval(self):
        result = build(self.original, self.authorization)
        self.assertEqual(len(result['rows']), 142)
        self.assertEqual(result['comparison_counts'], self.original['comparison_counts'])
        self.assertTrue(all(r['state'] == 'WITHHELD' and r['publicationAuthorized'] is False for r in result['rows']))

    def test_authorization_not_certificate(self):
        self.assertFalse(self.authorization['permission_request_blocks_local_work'])
        self.assertFalse(self.authorization['independently_verified_third_party_grant'])
        self.assertIsNone(self.authorization['grant_reference'])
        self.assertFalse(self.authorization['production_release_approval'])

    def test_history_unchanged_and_financial_blockers_retained(self):
        before = copy.deepcopy(self.original)
        result = build(self.original, self.authorization)
        self.assertEqual(before, self.original)
        for old, new in zip(before['results'], result['rows']):
            self.assertEqual(new['historical_contract_gaps'], old['qualification']['reasons'])
            self.assertEqual(set(new['local_work_blockers']), set(old['qualification']['reasons']) - RIGHTS)
            self.assertIn('financial_review_pending', new['local_work_blockers'])

    def test_no_source_amounts_or_fabricated_references(self):
        result = build(self.original, self.authorization)
        for row in result['rows']:
            self.assertNotIn('observed_amount', row)
            self.assertNotIn('value', row)
            self.assertNotIn('engine_fact_ref', row)

    def test_no_duplicate_rows(self):
        self.original['results'].append(self.original['results'][0])
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            build(self.original, self.authorization)

    def test_unknown_classification_is_not_silently_accepted(self):
        self.original['results'][0]['comparison'] = 'UNKNOWN'
        with self.assertRaisesRegex(ValueError, 'Unreviewed'):
            build(self.original, self.authorization)


if __name__ == '__main__':
    unittest.main(verbosity=2)
