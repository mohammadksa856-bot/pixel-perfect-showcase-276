"""QB4 tests: output consistency and negative cases for the page checks. Reads ARA2025 from the engine blob (read only).
Usage (repo root): python3 review-delivery/ARAMCO95/QB4/test_qb4.py
"""
import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import qb4  # noqa: E402

J = lambda name: json.loads((HERE / name).read_text())  # noqa: E731


def pages():
    with tempfile.TemporaryDirectory() as d:
        pdf = Path(d) / "a.pdf"
        pdf.write_bytes(subprocess.run(["git", "-C", str(qb4.ENGINE), "show", f"{qb4.ENGINE_COMMIT}:{qb4.ARA}"],
                                       capture_output=True, check=True).stdout)
        subprocess.run(["pdftotext", "-layout", str(pdf), f"{d}/l.txt"], check=True)
        subprocess.run(["pdftotext", str(pdf), f"{d}/r.txt"], check=True)
        return Path(f"{d}/l.txt").read_text().split("\f"), Path(f"{d}/r.txt").read_text().split("\f")


LAYOUT, RAW = pages()
ATTR = {a["key"]: a for a in qb4.ATTRS}


class Outputs(unittest.TestCase):
    def test_batch_limit_and_counts(self):
        ids = J("QB4-IDENTITIES.json")
        self.assertLessEqual(ids["values"], qb4.MAX_VALUES)
        self.assertEqual(ids["values"], len(qb4.ATTRS) + len(qb4.FACTS))
        self.assertEqual(ids["new_keys"], 16)
        self.assertEqual(ids["history_values_on_new_keys"], 2)

    def test_manifest_matches_identities(self):
        m, ids = J("QB4-MANIFEST.json"), J("QB4-IDENTITIES.json")["identities"]
        facts = {(f["metric"], f["fiscal_year"]): f for f in m["facts"]}
        for i in ids:
            if i["kind"] == "fact":
                f = facts[(i["metric_key"], i["fiscal_year"])]
                self.assertEqual(str(qb4.num(f["value"]) * int(f.get("scale", 1))), i["value"])
            else:
                a = next(x for x in m["company_attributes"] if x["attribute_key"] == i["attribute_key"])
                self.assertEqual(a["value"], i["value"])
            self.assertEqual(i["source_review"], "PENDING")
            self.assertEqual(i["rights"], "UNKNOWN_NO_GRANT")
            self.assertEqual(i["source_document_sha256"], qb4.ARA_SHA)

    def test_every_batch_key_was_missing_and_is_not_excluded(self):
        missing = {e["field_key"] for e in J("QB4-GAP-INVENTORY.json")["missing"]}
        excluded = {e["field_key"] for e in J("QB4-EXCLUSIONS.json")["exclusions"]}
        keys = {a["key"] for a in qb4.ATTRS} | {f["metric"] for f in qb4.FACTS}
        self.assertTrue(keys <= missing)
        self.assertFalse(keys & excluded)

    def test_projected_score_is_separate_from_approved(self):
        c, g = J("QB4-COVERAGE.json"), J("QB4-GAP-INVENTORY.json")
        self.assertEqual(c["approved_score"]["total_score"], g["total_score_now"])
        self.assertNotEqual(c["approved_score"]["total_score"], c["projected_score_if_batch_accepted_and_ingested"]["total_score"])
        self.assertEqual(sorted(c["keys_filled_from_batch"]), sorted({a["key"] for a in qb4.ATTRS} | {f["metric"] for f in qb4.FACTS}))

    def test_all_checks_pass(self):
        self.assertTrue(all(c["status"] == "PASS" for c in J("QB4-CHECKS.json")["checks"]))


class PageChecks(unittest.TestCase):
    def test_every_attribute_passes_as_built(self):
        for a in qb4.ATTRS:
            self.assertTrue(qb4.attribute_on_pages(a, RAW)["ok"], a["key"])

    def test_wrong_number_in_anchor_fails(self):
        a = copy.deepcopy(ATTR["board_size"])
        a["anchors"] = ["The Company is supervised by a Board consisting of 12 Directors."]
        self.assertFalse(qb4.attribute_on_pages(a, RAW)["ok"])

    def test_invented_member_fails(self):
        a = copy.deepcopy(ATTR["audit_committee"])
        a["value"]["members"][1] = "Someone Else"
        self.assertFalse(qb4.attribute_on_pages(a, RAW)["ok"])

    def test_wrong_page_fails(self):
        a = copy.deepcopy(ATTR["nomination_committee"])
        a["pages"] = [122]
        self.assertFalse(qb4.attribute_on_pages(a, RAW)["ok"])

    def test_incomplete_executive_list_fails(self):
        a = copy.deepcopy(ATTR["executive_management_team"])
        a["value"] = a["value"][:-1]
        self.assertFalse(qb4.attribute_on_pages(a, RAW)["ok"])

    def test_sign_flip_fails(self):
        f = dict(qb4.FACTS[0], printed="1,457")
        self.assertFalse(qb4.fact_on_page(f, LAYOUT)["ok"])

    def test_year_swap_fails(self):
        f = dict(qb4.FACTS[1], printed="(1,457)")
        self.assertFalse(qb4.fact_on_page(f, LAYOUT)["ok"])

    def test_installment_count_must_match_rows(self):
        f = dict(qb4.FACTS[2], printed="5")
        self.assertFalse(qb4.fact_on_page(f, LAYOUT)["ok"])


class Classification(unittest.TestCase):
    def test_fixed_reasons(self):
        c = lambda f, cat="financial_statements": qb4.classify(f, cat, set())[0]  # noqa: E731
        self.assertEqual(c("ordinary_dividend", "dividends"), "alias_of_existing_key_needs_definition_decision")
        self.assertEqual(c("special_dividend", "dividends"), "alias_of_existing_key_needs_definition_decision")
        self.assertEqual(c("ppe_purchases"), "engine_non_projectable_presentation_field")
        self.assertEqual(c("zakat_paid"), "combined_or_segment_only_line")
        self.assertEqual(c("total_dividend_declared", "dividends"), "period_basis_ambiguity")
        self.assertEqual(c("dividend_payment_frequency", "dividends"), "engine_representation_blocker")
        self.assertEqual(c("industry_overview", "company_profile"), "narrative_needs_content_rule")
        self.assertEqual(c("strategic_ownership", "ownership"), "classification_decision_on_existing_row")
        self.assertEqual(c("beta_1y", "market_data"), "external_market_feed_required")
        self.assertEqual(c("revenue_qoq", "growth"), "derived_needs_rule")


if __name__ == "__main__":
    unittest.main(verbosity=2)
