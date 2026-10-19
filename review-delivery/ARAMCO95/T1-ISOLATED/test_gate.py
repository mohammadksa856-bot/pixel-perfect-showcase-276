"""Gate tests for preflight.py. Receipts/approvals are written to a temporary directory only and deleted; the test
never ingests anything and never writes T1-PREFLIGHT.json next to the real files. A synthetic 'valid' pair is used
only to prove the gate can open; it is not an approval and is never persisted.
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


def receipt(**over):
    fields = []
    for i in load(preflight.IDENTITIES)["identities"]:
        r = {"metric_key": i["metric_key"], **{c: True for c in preflight.FIELD_CHECKS}}
        if i["metric_key"] in preflight.EXTRA_CHECKS:
            r[preflight.EXTRA_CHECKS[i["metric_key"]]] = True
        fields.append(r)
    return {"decision": "SOURCE_ACCEPT", "reviewer": "TEST-INDEPENDENT-REVIEWER", "document_sha256": Q3_2025_SHA256,
            "manifest_sha256": MSHA, "fields": fields} | over


def auth(**over):
    exp = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    return {"approval": "APPROVE_T1_ISOLATED_INGESTION", "approved_by": "TEST-OWNER", "manifest_sha256": MSHA,
            "engine_commit": ENGINE_COMMIT, "target": "ISOLATED_COPY_ONLY", "expires_at": exp} | over


class Gate(unittest.TestCase):
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
            if obj is not None:
                path.write_text(json.dumps(obj))
        code = preflight.main()
        out = json.loads((self.tmp / "T1-PREFLIGHT.json").read_text())
        return code, out["blocked_by"]

    def test_missing_both_blocks(self):
        self.assertEqual(self.run_with(None, None)[1],
                         ["independent_source_accept_receipt", "owner_authorization_for_isolated_ingestion"])

    def test_preparer_receipt_blocks(self):
        for who in ("Claude", "codex", ""):
            self.assertIn("independent_source_accept_receipt", self.run_with(receipt(reviewer=who), auth())[1])

    def test_receipt_for_other_manifest_or_incomplete_checks_blocks(self):
        self.assertIn("independent_source_accept_receipt", self.run_with(receipt(manifest_sha256="0" * 64), auth())[1])
        r = receipt()
        r["fields"][0] = {k: v for k, v in r["fields"][0].items() if k != "column_is_three_months_ended_2025_09_30"}
        self.assertIn("independent_source_accept_receipt", self.run_with(r, auth())[1])
        r = receipt()
        for f in r["fields"]:
            f.pop("group_total_including_non_controlling_interests", None)
        self.assertIn("independent_source_accept_receipt", self.run_with(r, auth())[1])

    def test_authorization_scope_expiry_and_target_block(self):
        past = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
        for bad in (auth(expires_at=past), auth(target="PRODUCTION"), auth(manifest_sha256="1" * 64),
                    auth(approval="OK"), auth(engine_commit="deadbee")):
            self.assertEqual(self.run_with(receipt(), bad)[1], ["owner_authorization_for_isolated_ingestion"])

    def test_gate_opens_only_with_both(self):
        code, blocked = self.run_with(receipt(), auth())
        self.assertEqual((code, blocked), (0, []))


if __name__ == "__main__":
    unittest.main(verbosity=2)
