"""Gate tests for preflight.py. Receipts/approvals are synthetic, live only in memory or a temporary directory that is
deleted, and are never persisted next to the real files; nothing is ingested. A synthetic 'valid' pair proves only
that the gate can open; it is not an approval.
  Receipt rules: unit tests on preflight.receipt_problems (fast).
  End to end: preflight.main() with temporary receipt/approval files (exports the engine each run).
Usage: python3 test_gate.py
"""
import json
import shutil
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

import preflight
from t1_common import ENGINE_COMMIT, MANIFEST, Q3_2025_SHA256, load, sha256_file

MSHA = sha256_file(MANIFEST)
IDS = load(preflight.IDENTITIES)["identities"]
Q, B = "column_is_three_months_ended_2025_09_30", "column_is_balance_as_at_2025_09_30"
FLOWS, BALANCES = ("revenue", "net_income", "operating_cash_flow"), ("cash", "total_equity")


def receipt(**over):
    fields = []
    for i in IDS:
        r = {"metric_key": i["metric_key"], "period_kind": i["period_kind"],
             preflight.COLUMN_CHECKS[i["period_kind"]]: True, **{c: True for c in preflight.FIELD_CHECKS}}
        if i["metric_key"] in preflight.EXTRA_CHECKS:
            r[preflight.EXTRA_CHECKS[i["metric_key"]]] = True
        fields.append(r)
    return {"decision": "SOURCE_ACCEPT", "reviewer": "TEST-INDEPENDENT-REVIEWER", "document_sha256": Q3_2025_SHA256,
            "manifest_sha256": MSHA, "fields": fields} | over


def edit(metric, **change):
    r = receipt()
    f = next(x for x in r["fields"] if x["metric_key"] == metric)
    for k, v in change.items():
        if v is None:
            f.pop(k, None)
        else:
            f[k] = v
    return r


def auth(**over):
    exp = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    return {"approval": "APPROVE_T1_ISOLATED_INGESTION", "approved_by": "TEST-OWNER", "manifest_sha256": MSHA,
            "engine_commit": ENGINE_COMMIT, "target": "ISOLATED_COPY_ONLY", "expires_at": exp} | over


problems = lambda r: preflight.receipt_problems(r, IDS, MSHA)


class ReceiptRules(unittest.TestCase):
    def test_identity_kinds_are_as_expected(self):
        self.assertEqual({i["metric_key"]: i["period_kind"] for i in IDS},
                         {**{m: "quarter" for m in FLOWS}, **{m: "instant" for m in BALANCES}})

    def test_valid_receipt_has_no_problems(self):
        self.assertEqual(problems(receipt()), [])

    def test_flows_need_three_month_column_balances_need_balance_column(self):
        for m in FLOWS:
            self.assertTrue(problems(edit(m, **{Q: None})), m)
            self.assertTrue(problems(edit(m, **{Q: False})), m)
        for m in BALANCES:
            self.assertTrue(problems(edit(m, **{B: None})), m)
            self.assertTrue(problems(edit(m, **{B: False})), m)

    def test_balance_and_flow_column_checks_are_not_interchangeable(self):
        for m in BALANCES:
            self.assertTrue(problems(edit(m, **{B: None, Q: True})), m)   # balance confirmed with the flow column
            self.assertTrue(problems(edit(m, **{Q: True})), m)            # balance carrying both columns
            self.assertTrue(problems(edit(m, **{Q: False})), m)           # any value for the other kind is a mix
        for m in FLOWS:
            self.assertTrue(problems(edit(m, **{Q: None, B: True})), m)   # flow confirmed with the balance column
            self.assertTrue(problems(edit(m, **{B: True})), m)
            self.assertTrue(problems(edit(m, **{B: False})), m)

    def test_receipt_period_kind_must_match_identity(self):
        for m in BALANCES:
            self.assertTrue(problems(edit(m, period_kind="quarter")), m)
            self.assertTrue(problems(edit(m, period_kind=None)), m)
        for m in FLOWS:
            self.assertTrue(problems(edit(m, period_kind="instant")), m)
            self.assertTrue(problems(edit(m, period_kind="ytd")), m)

    def test_other_source_conditions_unchanged(self):
        for who in ("Claude", "codex", " CODEX ", ""):
            self.assertTrue(problems(receipt(reviewer=who)), who)
        self.assertTrue(problems(receipt(decision="SOURCE_REJECT")))
        self.assertTrue(problems(receipt(document_sha256="0" * 64)))
        self.assertTrue(problems(receipt(manifest_sha256="0" * 64)))
        for m in FLOWS + BALANCES:
            for c in preflight.FIELD_CHECKS:
                self.assertTrue(problems(edit(m, **{c: False})), (m, c))
                self.assertTrue(problems(edit(m, **{c: None})), (m, c))
        self.assertTrue(problems(edit("total_equity", group_total_including_non_controlling_interests=None)))
        self.assertTrue(problems(edit("net_income", group_net_income_not_attributable_share=False)))
        r = receipt()
        r["fields"].append(dict(r["fields"][0]))
        self.assertTrue(problems(r))                      # duplicate metric entry
        r = receipt()
        r["fields"] = r["fields"][:4]
        self.assertTrue(problems(r))                      # a metric missing
        r = receipt()
        r["fields"].append({**r["fields"][0], "metric_key": "capex"})
        self.assertTrue(problems(r))                      # a metric outside T1
        self.assertEqual(problems(None), ["no T1-SOURCE-REVIEW-RECEIPT.json"])


class EndToEnd(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.saved = (preflight.SOURCE_RECEIPT, preflight.AUTHORIZATION, preflight.HERE)
        preflight.SOURCE_RECEIPT = self.tmp / "r.json"
        preflight.AUTHORIZATION = self.tmp / "a.json"
        preflight.HERE = self.tmp

    def tearDown(self):
        preflight.SOURCE_RECEIPT, preflight.AUTHORIZATION, preflight.HERE = self.saved
        shutil.rmtree(self.tmp)

    def run_with(self, r, a):
        for path, obj in ((preflight.SOURCE_RECEIPT, r), (preflight.AUTHORIZATION, a)):
            path.unlink(missing_ok=True)
            if obj is not None:
                path.write_text(json.dumps(obj))
        code = preflight.main()
        return code, json.loads((self.tmp / "T1-PREFLIGHT.json").read_text())["blocked_by"]

    def test_missing_both_blocks(self):
        self.assertEqual(self.run_with(None, None),
                         (2, ["independent_source_accept_receipt", "owner_authorization_for_isolated_ingestion"]))

    def test_kind_mix_blocks_end_to_end(self):
        self.assertEqual(self.run_with(edit("cash", **{B: None, Q: True}), auth()),
                         (2, ["independent_source_accept_receipt"]))

    def test_authorization_scope_expiry_and_target_block(self):
        past = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
        for bad in (auth(expires_at=past), auth(target="PRODUCTION"), auth(manifest_sha256="1" * 64),
                    auth(approval="OK"), auth(engine_commit="deadbee")):
            self.assertEqual(self.run_with(receipt(), bad), (2, ["owner_authorization_for_isolated_ingestion"]))

    def test_gate_opens_only_with_both(self):
        self.assertEqual(self.run_with(receipt(), auth()), (0, []))


if __name__ == "__main__":
    unittest.main(verbosity=2)
