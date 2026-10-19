"""Tests on the consolidation outputs. Usage (repo root): python3 review-delivery/ARAMCO95/CONSOLIDATED/test_consolidated.py"""
import json
import unittest
from decimal import Decimal
from pathlib import Path

HERE = Path(__file__).resolve().parent
J = lambda n: json.loads((HERE / n).read_text())  # noqa: E731
REG = J("EVIDENCE-REGISTER.json")
RECS = REG["records"]
COV = J("COVERAGE-PROJECTION.json")
SC = COV["scenarios"]


class Register(unittest.TestCase):
    def test_every_record_is_complete(self):
        for r in RECS:
            for k in ("record_id", "batch", "kind", "scope", "unit", "value", "version", "source", "states", "date_provenance"):
                self.assertIn(k, r, (r["record_id"], k))
            if r["kind"] in ("fact", "fact_correction"):
                for k in ("metric_key", "period_kind", "period_end", "currency", "dimensions"):
                    self.assertIn(k, r, (r["record_id"], k))
            self.assertEqual(r["source"]["original_in_repository"], False)

    def test_counts_and_states(self):
        self.assertEqual(REG["counts_by_batch_and_evidence_state"], {
            "T1": {"EVIDENCE_ACCEPT": 5}, "QB3": {"EVIDENCE_ACCEPT": 11}, "QB4": {"EVIDENCE_ACCEPT": 18},
            "LEGACY_GOVERNANCE": {"PENDING_EVIDENCE_REVIEW": 33}, "CORRECTION": {"EVIDENCE_ACCEPT": 1}})
        for r in RECS:
            s = r["states"]
            self.assertEqual(s["publication_rights"], "PUBLICATION_RIGHTS_PENDING")
            self.assertEqual(s["ingestion"], "INGESTION_AUTHORIZATION_PENDING")
            self.assertIn(s["financial_qualification"], ("FINANCIAL_ACCEPT_PENDING", "NOT_APPLICABLE"))
            self.assertEqual(s["financial_qualification"] == "FINANCIAL_ACCEPT_PENDING", r["kind"] in ("fact", "fact_correction"))

    def test_legacy_never_accepted_by_agreement(self):
        for r in RECS:
            if r["batch"] == "LEGACY_GOVERNANCE":
                self.assertEqual(r["states"]["evidence_review"], "PENDING_EVIDENCE_REVIEW")

    def test_no_duplicate_identity(self):
        ids = {r["record_id"] for r in RECS}
        active = [r["record_id"] for r in RECS if not r["states"]["superseded_by"]]
        self.assertEqual(len(active), len(set(active)))
        sup = [r for r in RECS if r["states"]["superseded_by"]]
        self.assertEqual(len(sup), 15)   # 14 legacy attributes + the legacy correction fact
        for r in sup:
            self.assertIn(r["states"]["superseded_by"], ids)
            self.assertEqual(next(x for x in RECS if x["record_id"] == r["states"]["superseded_by"])["batch"], "QB4")

    def test_date_provenance_unverified_and_no_publication_date_claimed(self):
        for r in RECS:
            self.assertEqual(r["date_provenance"]["state"], "UNVERIFIED")
            self.assertNotIn("published_at", r)
            self.assertNotIn("document_filed_at", r)
        ind = next(r for r in RECS if r["record_id"] == "attribute:sa:2222:independent_directors:en")
        self.assertEqual(ind["fact_date"]["as_of"], "2026-03-10")

    def test_comparison(self):
        c = J("PACK-COMPARISON.json")
        self.assertEqual((c["legacy_attributes"], c["shared_with_qb4"], c["legacy_only"], c["legacy_disclosures"]), (20, 14, 6, 13))
        self.assertTrue(all(x["decision"] in ("SUPERSEDED_BY_QB4", "PENDING_EVIDENCE_REVIEW") for x in c["comparison"]))


class Correction(unittest.TestCase):
    def test_record_and_patch(self):
        r = J("CORRECTION-PACKAGE/CORRECTION-RECORD.json")
        self.assertEqual(r["state"], "DATA_CORRECTION_PROPOSED")
        self.assertEqual(r["changes"], {"value": [1457, -1457], "page": [181, 178],
                                        "table": ["net maturities of short-term investments", "consolidated statement of cash flows"]})
        self.assertTrue(r["evidence"]["pdf_178_is_the_statement"])
        self.assertFalse(r["evidence"]["pdf_181_has_the_row"])
        lines = (HERE / "CORRECTION-PACKAGE" / r["patch"]).read_text().splitlines()
        minus = [x for x in lines if x.startswith("-") and not x.startswith("---")]
        plus = [x for x in lines if x.startswith("+") and not x.startswith("+++")]
        self.assertEqual((len(minus), len(plus)), (1, 1))
        self.assertIn('"value":-1457,', plus[0])
        self.assertIn('"page":178,', plus[0])

    def test_corrected_fact_manifest(self):
        m = J("CORRECTION-PACKAGE/corrected-fact-only.manifest.json")
        self.assertEqual(len(m["facts"]), 1)
        f = m["facts"][0]
        self.assertEqual((f["metric"], f["value"], f["page"], f["fiscal_year"]), ("short_term_investments_net", -1457, 178, 2025))


class Coverage(unittest.TestCase):
    def test_simulated_never_approved(self):
        self.assertEqual(COV["approved_score"]["total_score"], SC["S0_current"]["projected_total_score"])
        self.assertTrue(all(s["status"] == "SIMULATED_NOT_APPROVED" for s in SC.values()))

    def test_scenarios(self):
        d = {k: Decimal(v["delta"]) for k, v in SC.items()}
        self.assertEqual(d["S1_QB3_only"], 0)
        self.assertEqual(SC["S2_QB4_only"]["projected_total_score"][:9], "58.799898")
        self.assertEqual(d["S6_accepted_combined_QB3_QB4"], d["S2_QB4_only"])
        self.assertEqual(d["S9_correction_on_top_of_S6"], d["S6_accepted_combined_QB3_QB4"])
        self.assertEqual(d["S4_QB4_attributes_only"] + d["S5_QB4_facts_only"], d["S2_QB4_only"])
        self.assertGreater(d["S7_combined_without_duplicates_QB3_QB4_legacy_remainder"], d["S6_accepted_combined_QB3_QB4"])
        self.assertEqual(SC["S8_correction_fact_only"]["keys_filled"], ["short_term_investments_net"])

    def test_duplicate_carrier_is_visible(self):
        rows = COV["duplicate_carrier_effect"]["rows_for_identity"]
        self.assertEqual(len(rows), 2)
        self.assertEqual(sum(r[1] for r in rows), 1)


class Leak(unittest.TestCase):
    def test_no_financial_value_served(self):
        lk = J("LEAK-CHECK.json")
        self.assertEqual(lk["gate_summary"]["approved_rows"], 0)
        self.assertEqual(lk["gate_summary"]["baseline_rows"], 0)
        self.assertEqual([m["id"] for m in lk["markers"] if m["in_served_preview"]], [])

    def test_queue_excludes_t1_and_superseded(self):
        q = J("REVIEW-QUEUE.json")["items"]
        self.assertTrue(all(i["excluded_from_future_batches"] for i in q if i["batch"] == "T1"))

    def test_no_pdf_or_private_file_in_delivery(self):
        names = [p.name for p in HERE.rglob("*")]
        self.assertFalse(any(n.lower().endswith(".pdf") for n in names))
        self.assertFalse(any(n in ("T1-SOURCE-REVIEW-RECEIPT.json", "T1-AUTHORIZATION.json", "T1-INDEPENDENT-SOURCE-REVIEW_AR.md")
                             for n in names))


if __name__ == "__main__":
    unittest.main(verbosity=2)
