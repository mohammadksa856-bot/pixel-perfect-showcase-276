"""Build the T1 reviewed-manifest candidate and its full identity file from committed evidence only.

Inputs (git, read-only): INTAKE-TRIAL-SET.json (71dbb5e, T1_minimal) and SOURCE-MANIFEST.json (b90fbc9).
Output: T1-MANIFEST.json in the engine's reviewed-manifest format (values in SAR millions, scale 1e6, like
data/imports/aramco-2026-q1.json) and T1-IDENTITIES.json. Writes nothing else.
Usage: python3 build_t1.py
"""
import json
from decimal import Decimal

from t1_common import COMPANY_ID, IDENTITIES, MANIFEST, Q3_2025_SHA256, T1_SCOPE, dump, git

TRIAL = json.loads(git("show", "71dbb5e:review-delivery/ARAMCO95/HISTORY-REVIEW/INTAKE-TRIAL-SET.json"))
SRC = json.loads(git("show", "b90fbc9:review-delivery/ARAMCO95/HISTORICAL-EXTRACTION/SOURCE-MANIFEST.json"))["documents"]
SRC = SRC if isinstance(SRC, dict) else {d.get("source_id", d.get("key")): d for d in SRC}
DOC = SRC["Q3-2025"]
assert DOC.get("sha256", DOC.get("source_document_sha256")) == Q3_2025_SHA256

# Engine labels that canonicalize (finengine.mapping.canonicalize, market SA) to exactly the target metric;
# the same labels as the engine's own Aramco interim manifests.
LABEL = {"revenue": "revenue", "net_income": "net income", "cash": "cash and cash equivalents",
         "total_equity": "total equity", "operating_cash_flow": "net cash from operating activities"}
TABLE = {27: "condensed consolidated statement of income", 29: "condensed consolidated balance sheet",
         31: "condensed consolidated statement of cash flows"}
EXPECTED = {"revenue": 386165, "net_income": 101015, "cash": 193873, "total_equity": 1691628,
            "operating_cash_flow": 135445}

rows = TRIAL["T1_minimal"]["rows"] if isinstance(TRIAL["T1_minimal"], dict) else TRIAL["T1_minimal"]
facts, identities = [], []
for r in rows:
    f, p, s = r["field_id"], r["period"], r["source"]
    millions = Decimal(r["value_sar"]) / Decimal(1_000_000)
    assert millions == millions.to_integral_value() and int(millions) == EXPECTED[f], (f, millions)
    assert (f, p["kind"], p["start"], p["end"]) in T1_SCOPE, f
    assert s["sha256"] == Q3_2025_SHA256 and s["document"] == "Q3-2025", f
    fact = {"label": LABEL[f], "value": int(millions), "scale": 1000000, "currency": "SAR", "unit": "SAR"}
    if p["kind"] != "instant":
        fact["period_start"] = p["start"]
    fact.update({"period_end": p["end"], "period_kind": p["kind"], "fiscal_year": 2025, "fiscal_quarter": 3,
                 "scope": "consolidated", "dimensions": {}, "page": s["pdf_page"], "table": TABLE[s["pdf_page"]],
                 "row": s["label"], "cell": f"column {s['column']}: {s['printed_cell']}"})
    facts.append(fact)
    identities.append(dict(
        company_id=COMPANY_ID, metric_key=f, period_kind=p["kind"], period_start=p["start"], period_end=p["end"],
        fiscal_year=2025, fiscal_quarter=3, currency="SAR", unit="SAR", scale="1000000",
        value_millions=str(int(millions)), value_sar=r["value_sar"], scope="consolidated", dimensions={},
        source_document="Q3-2025", source_document_sha256=Q3_2025_SHA256, source_url=DOC["original_url"],
        pdf_page=s["pdf_page"], column=s["column"], printed_cell=s["printed_cell"], extracted_label=s["label"],
        workpaper_observation_id=r["observation_id"],
        source_review="PENDING", qualification="WITHHELD"))
assert {(i["metric_key"], i["period_kind"], i["period_start"], i["period_end"]) for i in identities} == T1_SCOPE

manifest = {
    "company_id": COMPANY_ID,
    "filing_type": "Q3 interim report",
    "filed_at": DOC["index_publication_date_observed"],
    "filed_at_basis": "issuer reports index date observed by the preparer",
    "filed_at_confidence": "observed_not_certified",
    "filed_at_note": f"Original PDF sha256 {Q3_2025_SHA256}; T1 isolated trial candidate, source review pending",
    "period_end": "2025-09-30",
    "source_url": DOC["original_url"],
    "facts": facts,
}
dump(MANIFEST, manifest)
dump(IDENTITIES, {"schema": "marefa-t1-identities/1", "state": "CANDIDATE_NOT_INGESTED", "count": len(identities),
                  "source_document": {"id": "Q3-2025", "sha256": Q3_2025_SHA256, "url": DOC["original_url"],
                                      "rights_grant": DOC.get("rights_grant"), "status": DOC.get("status")},
                  "identities": identities})
print(json.dumps({"facts": len(facts), "manifest": MANIFEST.name}, ensure_ascii=False))
