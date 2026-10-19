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


DELIVERY_BEFORE_R01 = "68e4459d0a16abd50bbab6e7d65d99e9e933fb48"


def at_delivery(name):
    return json.loads(subprocess.run(["git", "-C", str(HERE), "show", f"{DELIVERY_BEFORE_R01}:./{name}"],
                                     capture_output=True, check=True).stdout)


class R01(unittest.TestCase):
    """QB4-R01: the independent-directors fact is dated by the PDF 115 footnote; nothing else moves."""

    def test_date_proved_from_footnote(self):
        a = ATTR["independent_directors"]
        self.assertEqual(qb4.as_of_from_footnote(a, RAW), "2026-03-10")
        self.assertEqual(qb4.attribute_on_pages(a, RAW)["as_of"], "2026-03-10")

    def test_wrong_footnote_page_or_date_fails(self):
        a = copy.deepcopy(ATTR["independent_directors"])
        a["as_of_page"] = 117
        self.assertIsNone(qb4.as_of_from_footnote(a, RAW))
        a = copy.deepcopy(ATTR["independent_directors"])
        a["as_of"] = "2026-03-09"
        self.assertFalse(qb4.attribute_on_pages(a, RAW)["ok"])
        a["as_of_anchor"] = "1. All Board statistics are as of March 9, 2026."
        self.assertIsNone(qb4.as_of_from_footnote(a, RAW))

    def test_identity_separates_fact_date_from_document_date(self):
        i = next(x for x in J("QB4-IDENTITIES.json")["identities"] if x.get("attribute_key") == "independent_directors")
        self.assertEqual(i["as_of"], "2026-03-10")
        self.assertIn("March 10, 2026", i["as_of_basis"])
        self.assertIsNone(i["document_filed_at"])   # not invented
        self.assertEqual(J("QB4-MANIFEST.json")["filed_at"], "2026-03-09")  # manifest field unchanged

    def test_nothing_else_changed_since_delivery(self):
        old, new = at_delivery("QB4-IDENTITIES.json"), J("QB4-IDENTITIES.json")
        self.assertEqual({k: v for k, v in old.items() if k != "identities"}, {k: v for k, v in new.items() if k != "identities"})
        moved = {"as_of", "as_of_basis", "document_filed_at", "document_filed_at_note"}
        for a, b in zip(old["identities"], new["identities"]):
            if b.get("attribute_key") == "independent_directors":
                self.assertEqual({k: v for k, v in a.items() if k not in moved}, {k: v for k, v in b.items() if k not in moved})
            else:
                self.assertEqual(a, b)
        om, nm = at_delivery("QB4-MANIFEST.json"), J("QB4-MANIFEST.json")
        self.assertEqual(om["facts"], nm["facts"])
        for a, b in zip(om["company_attributes"], nm["company_attributes"]):
            self.assertEqual(a["value"], b["value"])
            if a["attribute_key"] != "independent_directors":
                self.assertEqual(a, b)

    def test_projected_coverage_unchanged(self):
        self.assertEqual(J("QB4-COVERAGE.json"), at_delivery("QB4-COVERAGE.json"))
        self.assertEqual(J("QB4-COVERAGE.json")["projected_score_if_batch_accepted_and_ingested"]["total_score"],
                         "58.79989828534394325241225745")

    def test_historical_correction_record(self):
        r = J("QB4-R01-HISTORICAL-CORRECTION.json")
        self.assertEqual((r["from"], r["to"], r["state"]), (1457, -1457, "PROPOSED_NOT_APPLIED"))
        lines = (HERE / r["patch"]).read_text().splitlines()
        minus = [x for x in lines if x.startswith("-") and not x.startswith("---")]
        plus = [x for x in lines if x.startswith("+") and not x.startswith("+++")]
        self.assertEqual(len(minus), 1)
        self.assertEqual(len(plus), 1)
        self.assertEqual(minus[0].replace('"value":1457,', '"value":-1457,')[1:], plus[0][1:])


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
