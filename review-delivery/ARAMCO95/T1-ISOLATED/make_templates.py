"""Write the two blank templates the gate expects. The gate reads only T1-SOURCE-REVIEW-RECEIPT.json and
T1-AUTHORIZATION.json, so these templates can never open it. Usage: python3 make_templates.py"""
from pathlib import Path

from preflight import COLUMN_CHECKS, EXTRA_CHECKS, FIELD_CHECKS
from t1_common import ENGINE_COMMIT, IDENTITIES, MANIFEST, Q3_2025_SHA256, dump, load, sha256_file

m = sha256_file(MANIFEST)
COLUMN_TEXT = {"quarter": "standalone three months ended 30 September 2025 (not nine months, not 2024)",
               "instant": "balance as at 30 September 2025 (not 31 December 2024)"}
dump(Path("T1-SOURCE-REVIEW-RECEIPT.template.json"), {
    "_instructions": "Completed by an independent reviewer with access to the original PDF (not Claude, not Codex). "
                     "Save as T1-SOURCE-REVIEW-RECEIPT.json. Set a check to true only after verifying it in the original. "
                     "Each metric carries only the column check of its own period kind; do not add the other kind's check.",
    "decision": "PENDING  (SOURCE_ACCEPT or SOURCE_REJECT)", "reviewer": "", "reviewed_at_utc": "",
    "document_sha256": Q3_2025_SHA256, "manifest_sha256": m,
    "fields": [{"metric_key": i["metric_key"], "period_kind": i["period_kind"], "pdf_page": i["pdf_page"],
                "printed_cell": i["printed_cell"], "expected_column": COLUMN_TEXT[i["period_kind"]],
                **{c: None for c in FIELD_CHECKS}, COLUMN_CHECKS[i["period_kind"]]: None,
                **({EXTRA_CHECKS[i["metric_key"]]: None} if i["metric_key"] in EXTRA_CHECKS else {}), "notes": ""}
               for i in load(IDENTITIES)["identities"]]})
dump(Path("T1-AUTHORIZATION.template.json"), {
    "_instructions": "Completed by the owner only. Save as T1-AUTHORIZATION.json. Covers this exact manifest and engine "
                     "commit, an isolated copy only, until expires_at.",
    "approval": "PENDING  (APPROVE_T1_ISOLATED_INGESTION)", "approved_by": "", "approved_at_utc": "",
    "manifest_sha256": m, "engine_commit": ENGINE_COMMIT, "target": "ISOLATED_COPY_ONLY", "expires_at": "",
    "not_authorized": ["original engine", "production DB", "Supabase", "public pages", "W0", "the other 756 absent cells",
                       "SOURCE_ACCEPT", "FINANCIAL_ACCEPT", "publication", "hold changes 7/22/142/0"]})
print(m)
