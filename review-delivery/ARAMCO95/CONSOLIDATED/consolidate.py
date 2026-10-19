"""ARAMCO95 accepted-evidence consolidation: one register of every value and attribute, a separate correction
package, coverage scenarios from the engine's own evaluator on disposable copies, and a leak check. No engine write.

Inputs (read only): T1, QB3 and QB4 deliveries in this repository; the engine's prior governance pack and annual
metrics pack at b70254e (git show); ARA2025 from the engine blob (for the correction package only).
Review states are taken from the recorded decisions, never inferred from agreement between packs:
  QB3 (11) and QB4 (18): EVIDENCE_ACCEPT (independent Codex reviews; QB4-R01 closed).
  T1 (5): SOURCE_ACCEPT receipt (owner-appointed AI reviewer, private receipt; record in T1-SOURCE-RECEIPT-RECORD.json);
          isolated trial only, not part of any future batch.
  Prior governance pack (20 attributes, 13 disclosures): PENDING_EVIDENCE_REVIEW; the 14 keys QB4 also carries are
          superseded by the QB4 identity, so no identity appears twice.
Outputs (this directory): EVIDENCE-REGISTER.json, PACK-COMPARISON.json, REVIEW-QUEUE.json, COVERAGE-PROJECTION.json,
LEAK-CHECK.json, consolidation-checks.txt, and CORRECTION-PACKAGE/.
Usage (repo root): python3 review-delivery/ARAMCO95/CONSOLIDATED/consolidate.py
"""
from __future__ import annotations

import difflib
import hashlib
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from decimal import Decimal
from pathlib import Path

HERE = Path(__file__).resolve().parent
A95 = HERE.parent
REPO = A95.parents[1]
sys.path.insert(0, str(A95 / "QB4"))
import qb4  # noqa: E402
from qb4 import (ENGINE, ENGINE_COMMIT, engine_env, export_engine, missing_by_category, num,  # noqa: E402
                 original_engine_state, readiness, summary, sync)

PROJECTION = "6c88655638c14550f8fad36e09228bcb483d06d3"   # Financial Projection candidate (gate code for the leak check)
GOV = "data/imports/aramco-2025-governance-risk.json"
METRICS = "data/imports/aramco-2025-annual-metrics.json"
CID = "sa:2222"
ARA_SHA = qb4.ARA_SHA
DATE_PROVENANCE = {"state": "UNVERIFIED",
                   "note": "filed_at 2026-03-09 is the engine manifests' field for ARA2025; it is not evidence of the "
                           "report's publication or historical availability date"}
DEC = ["SOURCE_ACCEPT", "FINANCIAL_ACCEPT", "PUBLICATION_AUTHORIZED"]


def J(p: Path):
    return json.loads(p.read_text())


def git_show(path: str) -> bytes:
    return subprocess.run(["git", "-C", str(ENGINE), "show", f"{ENGINE_COMMIT}:{path}"], capture_output=True, check=True).stdout


def fact_id(company, metric, kind, start, end, scope, dims, currency, unit):
    return "fact:" + hashlib.sha256(json.dumps([company, metric, kind, start or None, end, scope or "consolidated",
                                                dict(sorted((dims or {}).items())), currency or "", unit],
                                               separators=(",", ":")).encode()).hexdigest()[:16]


def attr_id(company, key, language="en"):
    return f"attribute:{company}:{key}:{language}"


def states(evidence, *, financial: bool, correction: bool = False, superseded_by: str | None = None):
    return {
        "evidence_review": evidence,
        "data_correction": "DATA_CORRECTION_PROPOSED" if correction else None,
        "financial_qualification": "FINANCIAL_ACCEPT_PENDING" if financial else "NOT_APPLICABLE",
        "publication_rights": "PUBLICATION_RIGHTS_PENDING",
        "ingestion": "INGESTION_AUTHORIZATION_PENDING",
        "superseded_by": superseded_by,
    }


def build_register(gov: dict, correction: dict) -> tuple[list[dict], dict]:
    reg = []
    t1 = J(A95 / "T1-ISOLATED/T1-IDENTITIES.json")
    for i in t1["identities"]:
        reg.append({"record_id": fact_id(CID, i["metric_key"], i["period_kind"], i.get("period_start"), i["period_end"],
                                          i["scope"], i["dimensions"], i["currency"], i["unit"]),
                    "batch": "T1", "kind": "fact", "metric_key": i["metric_key"], "period_kind": i["period_kind"],
                    "period_start": i.get("period_start"), "period_end": i["period_end"], "fiscal_year": i["fiscal_year"],
                    "fiscal_quarter": i.get("fiscal_quarter"), "scope": i["scope"], "dimensions": i["dimensions"],
                    "currency": i["currency"], "unit": i["unit"], "value": i["value_sar"],
                    "version": {"edition": "Q3-2025 interim report", "candidate_manifest": "T1-MANIFEST.json"},
                    "source": {"document": "Q3-2025 interim report", "sha256": i["source_document_sha256"],
                               "url": i["source_url"], "pdf_page": i["pdf_page"], "printed_cell": i["printed_cell"],
                               "original_in_repository": False},
                    "date_provenance": {"state": "UNVERIFIED", "note": "T1 filed_at 2025-11-04 is observed_not_certified"},
                    "states": states("EVIDENCE_ACCEPT", financial=True),
                    "evidence_basis": "SOURCE_ACCEPT receipt 49e3f053… (owner-appointed AI reviewer; private receipt, record in T1-SOURCE-RECEIPT-RECORD.json)",
                    "note": "isolated ingestion trial (engineering accepted, rolled back); excluded from future batches"})
    for i in J(A95 / "QB3/QB3-IDENTITIES.json")["identities"]:
        reg.append({"record_id": fact_id(CID, i["metric_key"], i["period_kind"], i["period_start"], i["period_end"],
                                          i["scope"], i["dimensions"], i["currency"], i["unit"]),
                    "batch": "QB3", "kind": "fact", "metric_key": i["metric_key"], "period_kind": i["period_kind"],
                    "period_start": i["period_start"], "period_end": i["period_end"], "fiscal_year": i["fiscal_year"],
                    "scope": i["scope"], "dimensions": i["dimensions"], "currency": i["currency"], "unit": i["unit"],
                    "value": i["value"], "version": {"edition": i["edition"], "candidate_manifest": "QB3-MANIFEST.json"},
                    "source": {"document": "ARA2025", "sha256": i["source_document_sha256"], "url": i["source_url"],
                               "pdf_page": i["pdf_page"], "printed_row": i["printed_row"], "original_in_repository": False},
                    "date_provenance": DATE_PROVENANCE, "states": states("EVIDENCE_ACCEPT", financial=True),
                    "evidence_basis": "independent Codex review: EVIDENCE_ACCEPT for the 11 FY2024 values"})
    qb4_attr_keys = set()
    for i in J(A95 / "QB4/QB4-IDENTITIES.json")["identities"]:
        base = {"batch": "QB4", "source": {"document": "ARA2025", "sha256": i["source_document_sha256"], "url": i["source_url"],
                                           "original_in_repository": False},
                "date_provenance": DATE_PROVENANCE,
                "evidence_basis": "independent Codex review: EVIDENCE_ACCEPT for the 18 values; QB4-R01 closed"}
        if i["kind"] == "fact":
            reg.append({**base, "record_id": fact_id(CID, i["metric_key"], i["period_kind"], i["period_start"], i["period_end"],
                                                     i["scope"], i["dimensions"], i["currency"], i["unit"]),
                        "kind": "fact", "metric_key": i["metric_key"], "period_kind": i["period_kind"],
                        "period_start": i["period_start"], "period_end": i["period_end"], "fiscal_year": i["fiscal_year"],
                        "scope": i["scope"], "dimensions": i["dimensions"], "currency": i["currency"], "unit": i["unit"],
                        "value": i["value"], "version": {"edition": i["edition"], "candidate_manifest": "QB4-MANIFEST.json"},
                        "source": {**base["source"], "pdf_page": i["pdf_page"], "printed_row": i["printed_row"]},
                        "states": states("EVIDENCE_ACCEPT", financial=True)})
        else:
            qb4_attr_keys.add(i["attribute_key"])
            fact_date = {"as_of": i["as_of"], "basis": i["as_of_basis"]} if "as_of_basis" in i else \
                {"as_of": None, "basis": "no fact date beyond the report's own period (FY2025); the identity's as_of field carries the manifest filed_at"}
            reg.append({**base, "record_id": attr_id(CID, i["attribute_key"]), "kind": "company_attribute",
                        "attribute_key": i["attribute_key"], "language": i["language"], "scope": "company",
                        "unit": "json", "value": i["value"], "fact_date": fact_date,
                        "version": {"edition": "ARA2025", "candidate_manifest": "QB4-MANIFEST.json"},
                        "source": {**base["source"], "pdf_pages": i["pdf_pages"]},
                        "states": states("EVIDENCE_ACCEPT", financial=False)})
    for a in gov["company_attributes"]:
        k = a["attribute_key"]
        sup = attr_id(CID, k) if k in qb4_attr_keys else None
        reg.append({"record_id": attr_id(CID, k) + ":legacy-governance-pack", "batch": "LEGACY_GOVERNANCE",
                    "kind": "company_attribute", "attribute_key": k, "language": "en", "scope": "company", "unit": "json",
                    "value": a["value"], "version": {"edition": "ARA2025", "candidate_manifest": f"engine {ENGINE_COMMIT}:{GOV}"},
                    "source": {"document": "ARA2025", "sha256": ARA_SHA, "url": gov["source_url"],
                               "pdf_page": a["metadata"].get("pdf_page") or a["metadata"].get("pdf_pages"),
                               "original_in_repository": False},
                    "date_provenance": DATE_PROVENANCE,
                    "states": states("PENDING_EVIDENCE_REVIEW", financial=False, superseded_by=sup),
                    "evidence_basis": "not accepted: the pack was never reviewed as a whole; agreement with QB4 is not acceptance"})
    for n, d in enumerate(gov["disclosures"]):
        reg.append({"record_id": f"disclosure:{CID}:{d['disclosure_type']}:{n:02d}:legacy-governance-pack",
                    "batch": "LEGACY_GOVERNANCE", "kind": "disclosure", "disclosure_type": d["disclosure_type"],
                    "title": d["title"], "period_end": d.get("period_end"), "scope": "company", "unit": "text",
                    "value": {"title": d["title"], "body_text_sha256": hashlib.sha256(d["body_text"].encode()).hexdigest()},
                    "version": {"edition": "ARA2025", "candidate_manifest": f"engine {ENGINE_COMMIT}:{GOV}"},
                    "source": {"document": "ARA2025", "sha256": ARA_SHA, "url": gov["source_url"],
                               "pdf_page": d["metadata"].get("pdf_page"), "original_in_repository": False},
                    "date_provenance": DATE_PROVENANCE,
                    "states": states("PENDING_EVIDENCE_REVIEW", financial=False),
                    "evidence_basis": "not reviewed; body text kept in the engine pack, only its hash here"})
    c = correction
    qb4_stin = fact_id(CID, "short_term_investments_net", "fy", "2025-01-01", "2025-12-31", "consolidated", {}, "SAR", "SAR")
    reg.append({"record_id": qb4_stin + ":legacy-annual-metrics-correction", "batch": "CORRECTION",
                "kind": "fact_correction", "metric_key": "short_term_investments_net", "period_kind": "fy",
                "period_start": "2025-01-01", "period_end": "2025-12-31", "fiscal_year": 2025, "scope": "consolidated",
                "dimensions": {}, "currency": "SAR", "unit": "SAR", "value": "-1457000000",
                "version": {"edition": "ARA2025", "candidate_manifest": f"engine {ENGINE_COMMIT}:{METRICS} (fact {c['fact_index']})"},
                "source": {"document": "ARA2025", "sha256": ARA_SHA, "pdf_page": 178,
                           "printed_row": "Net (purchases) maturities of short-term investments", "original_in_repository": False},
                "date_provenance": DATE_PROVENANCE,
                "states": states("EVIDENCE_ACCEPT", financial=True, correction=True, superseded_by=qb4_stin),
                "evidence_basis": "Codex accepted the −1,457 sign (QB4-R01 note); the correction applies to the legacy file, the identity is carried once, by QB4",
                "correction_package": "CORRECTION-PACKAGE/"})
    # identity uniqueness among records that are not superseded
    live = [r["record_id"] for r in reg if not r["states"]["superseded_by"]]
    dup = sorted({x for x in live if live.count(x) > 1})
    return reg, {"active_records": len(live), "duplicates": dup}


def compare(gov: dict) -> dict:
    """QB4 vs prior governance pack, key by key: the facts QB4 carries, and what the old value adds beyond them."""
    qb4m = {a["attribute_key"]: a for a in J(A95 / "QB4/QB4-MANIFEST.json")["company_attributes"]}
    strip = lambda n: re.sub(r"^(H\.E\. |Dr\. |Mr\. |Ms\. )+", "", n)  # noqa: E731
    out = []
    for a in gov["company_attributes"]:
        k, old = a["attribute_key"], a["value"]
        if k not in qb4m:
            out.append({"attribute_key": k, "in_qb4": False, "decision": "PENDING_EVIDENCE_REVIEW",
                        "note": "only in the legacy pack; narrative/editorial value, needs a content rule and review"})
            continue
        new = qb4m[k]["value"]
        names_old = sorted(strip(x["name"] if isinstance(x, dict) else x) for x in (old if isinstance(old, list) else old.get("members", old.get("directors", [])) if isinstance(old, dict) else []))
        names_new = sorted(strip(x["name"] if isinstance(x, dict) else x) for x in (new if isinstance(new, list) else new.get("members", new.get("directors", [])) if isinstance(new, dict) else []))
        extra = sorted(set(old) - set(new)) if isinstance(old, dict) and isinstance(new, dict) else []
        out.append({"attribute_key": k, "in_qb4": True, "identical_json": old == new,
                    "same_people": names_old == names_new if (names_old or names_new) else None,
                    "legacy_only_fields": extra,
                    "decision": "SUPERSEDED_BY_QB4",
                    "note": "the QB4 identity is the only one carried forward; legacy-only fields are not accepted by this agreement"})
    return {"legacy_attributes": len(gov["company_attributes"]), "shared_with_qb4": sum(1 for x in out if x["in_qb4"]),
            "legacy_only": sum(1 for x in out if not x["in_qb4"]), "legacy_disclosures": len(gov["disclosures"]),
            "comparison": out}


def correction_package(root: Path, work: Path) -> dict:
    """−1,457 with page 178 and the statement's name, for the single legacy fact; checked on an export, not applied."""
    pkg = HERE / "CORRECTION-PACKAGE"
    pkg.mkdir(exist_ok=True)
    text = git_show(METRICS).decode()
    old_line = next(l for l in text.splitlines() if '"metric":"short_term_investments_net"' in l)
    new_line = (old_line.replace('"value":1457,', '"value":-1457,').replace('"page":181,', '"page":178,')
                .replace('"table":"net maturities of short-term investments"', '"table":"consolidated statement of cash flows"'))
    new_text = text.replace(old_line, new_line)
    pack, new_pack = json.loads(text), json.loads(new_text)
    i = next(n for n, f in enumerate(pack["facts"]) if f.get("metric") == "short_term_investments_net")
    changed = {k for k in pack["facts"][i] if pack["facts"][i][k] != new_pack["facts"][i].get(k)}
    others_same = all(a == b for n, (a, b) in enumerate(zip(pack["facts"], new_pack["facts"])) if n != i)
    pdf = work / "a.pdf"
    pdf.write_bytes(git_show(qb4.ARA))
    subprocess.run(["pdftotext", "-layout", str(pdf), str(work / "l.txt")], check=True)
    pages = (work / "l.txt").read_text().split("\f")
    row = "Net (purchases) maturities of short-term investments"
    on178 = "Consolidated statement of cash flows" in pages[177] and row in pages[177]
    on181 = row in pages[180] or "Consolidated statement of cash flows" in pages[180]
    patch = pkg / "aramco-2025-annual-metrics.short_term_investments_net.v2.patch"
    patch.write_text(f"diff --git a/{METRICS} b/{METRICS}\n" + "".join(
        difflib.unified_diff(text.splitlines(True), new_text.splitlines(True), f"a/{METRICS}", f"b/{METRICS}")))
    r = subprocess.run(["git", "apply", "--check", str(patch)], cwd=root, capture_output=True, text=True)
    record = {
        "schema": "marefa-data-correction/1", "id": "ARAMCO95-CORR-STIN-2025", "state": "DATA_CORRECTION_PROPOSED",
        "supersedes": "QB4-R01-N1 (value only)", "engine_commit": ENGINE_COMMIT, "target_file": METRICS,
        "target_file_sha256": hashlib.sha256(text.encode()).hexdigest(),
        "corrected_file_sha256": hashlib.sha256(new_text.encode()).hexdigest(), "fact_index": i,
        "changes": {"value": [1457, -1457], "page": [181, 178],
                    "table": ["net maturities of short-term investments", "consolidated statement of cash flows"]},
        "evidence": {"source_document_sha256": ARA_SHA, "pdf_page": 178, "printed_page": 176, "row": row,
                     "printed_2025": "(1,457)", "pdf_178_is_the_statement": on178, "pdf_181_has_the_row": on181},
        "identity_rule": "the corrected fact has the same identity as QB4's short_term_investments_net FY2025; a future batch carries one of them, never both",
        "not_changed": "the other cash-flow facts of this pack also carry page 181; not part of this correction",
        "application": "not applied to the engine repository, its imports or its database; needs a later authorization",
        "patch": patch.name, "patch_sha256": hashlib.sha256(patch.read_bytes()).hexdigest(),
    }
    (pkg / "CORRECTION-RECORD.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n")
    corrected_fact = dict(new_pack["facts"][i])
    (pkg / "corrected-fact-only.manifest.json").write_text(json.dumps(
        {"company_id": CID} | {k: v for k, v in pack.items() if k != "facts" and not isinstance(v, list)}
        | {"filing_type": pack["filing_type"] + " (corrected short_term_investments_net only)", "facts": [corrected_fact]},
        ensure_ascii=False, indent=2) + "\n")
    return {"record": record, "changed_fields": sorted(changed), "other_facts_unchanged": others_same,
            "patch_applies": r.returncode == 0, "pdf178": on178, "pdf181": on181}


def main() -> int:
    checks = []

    def check(name, ok, detail):
        checks.append({"check": name, "status": "PASS" if ok else "FAIL", "detail": detail})

    before = original_engine_state()
    work = Path(tempfile.mkdtemp(prefix="a95-consolidate-"))
    try:
        gov = json.loads(git_show(GOV))
        root = export_engine(work / "e")
        corr = correction_package(root, work)
        check("correction_package", corr["changed_fields"] == ["page", "table", "value"] and corr["other_facts_unchanged"]
              and corr["patch_applies"] and corr["pdf178"] and not corr["pdf181"],
              {k: v for k, v in corr.items() if k != "record"})

        reg, uniq = build_register(gov, corr["record"])
        counts = {}
        for r in reg:
            counts.setdefault(r["batch"], {}).setdefault(r["states"]["evidence_review"], 0)
            counts[r["batch"]][r["states"]["evidence_review"]] += 1
        check("register_counts", counts.get("T1") == {"EVIDENCE_ACCEPT": 5} and counts.get("QB3") == {"EVIDENCE_ACCEPT": 11}
              and counts.get("QB4") == {"EVIDENCE_ACCEPT": 18} and counts.get("LEGACY_GOVERNANCE") == {"PENDING_EVIDENCE_REVIEW": 33}
              and counts.get("CORRECTION") == {"EVIDENCE_ACCEPT": 1}, counts)
        check("no_duplicate_active_identity", not uniq["duplicates"], uniq)
        check("no_financial_or_publication_decision_granted",
              all(r["states"]["financial_qualification"] in ("FINANCIAL_ACCEPT_PENDING", "NOT_APPLICABLE")
                  and r["states"]["publication_rights"] == "PUBLICATION_RIGHTS_PENDING"
                  and r["states"]["ingestion"] == "INGESTION_AUTHORIZATION_PENDING" for r in reg), "all pending")
        check("date_provenance_unverified_for_every_record", all(r["date_provenance"]["state"] == "UNVERIFIED" for r in reg),
              DATE_PROVENANCE)
        cmp_ = compare(gov)
        check("legacy_comparison", cmp_["shared_with_qb4"] == 14 and cmp_["legacy_only"] == 6, {k: v for k, v in cmp_.items() if k != "comparison"})
        (HERE / "EVIDENCE-REGISTER.json").write_text(json.dumps({
            "schema": "marefa-aramco95-evidence-register/1", "company_id": CID, "engine_commit": ENGINE_COMMIT,
            "states_vocabulary": ["EVIDENCE_ACCEPT", "PENDING_EVIDENCE_REVIEW", "DATA_CORRECTION_PROPOSED",
                                  "FINANCIAL_ACCEPT_PENDING", "PUBLICATION_RIGHTS_PENDING", "INGESTION_AUTHORIZATION_PENDING"],
            "counts_by_batch_and_evidence_state": counts, "active_identities": uniq["active_records"],
            "records": reg}, ensure_ascii=False, indent=2) + "\n")
        (HERE / "PACK-COMPARISON.json").write_text(json.dumps(cmp_, ensure_ascii=False, indent=2) + "\n")

        # review queue: everything that still needs a decision, per record
        queue = []
        for r in reg:
            need = []
            if r["states"]["evidence_review"] == "PENDING_EVIDENCE_REVIEW" and not r["states"]["superseded_by"]:
                need.append("evidence review")
            if r["states"]["data_correction"]:
                need.append("authorization to apply the correction to the legacy file")
            if r["states"]["financial_qualification"] == "FINANCIAL_ACCEPT_PENDING":
                need.append("FINANCIAL_ACCEPT")
            need += ["publication rights decision", "ingestion authorization"]
            if r["batch"] == "LEGACY_GOVERNANCE" and r["kind"] == "company_attribute" and not r["states"]["superseded_by"]:
                need.append("content rule for narrative fields")
            queue.append({"record_id": r["record_id"], "batch": r["batch"], "key": r.get("metric_key") or r.get("attribute_key")
                          or r.get("disclosure_type"), "needs": need,
                          "excluded_from_future_batches": r["batch"] == "T1" or bool(r["states"]["superseded_by"])})
        (HERE / "REVIEW-QUEUE.json").write_text(json.dumps({"schema": "marefa-aramco95-review-queue/1", "items": queue},
                                                          ensure_ascii=False, indent=2) + "\n")

        # coverage scenarios on disposable copies
        base = work / "base.sqlite3"
        shutil.copy2(root / "data/financial.sqlite3", base)
        subprocess.run([sys.executable, "-c", "import sys\nfrom finengine.database import Database\nDatabase(sys.argv[1]).close()",
                        str(base)], cwd=root, env=engine_env(root), check=True)
        qb4m = J(A95 / "QB4/QB4-MANIFEST.json")
        legacy_rest = {k: v for k, v in gov.items() if not isinstance(v, list)} | {
            "facts": [], "company_attributes": [a for a in gov["company_attributes"]
                                                 if a["attribute_key"] not in {x["attribute_key"] for x in qb4m["company_attributes"]}],
            "disclosures": gov["disclosures"], "filing_type": gov["filing_type"] + " (legacy remainder, not overlapping QB4)"}
        mans = {
            "QB3": A95 / "QB3/QB3-MANIFEST.json",
            "QB4": A95 / "QB4/QB4-MANIFEST.json",
            "QB4_ATTRIBUTES_ONLY": None, "QB4_FACTS_ONLY": None,
            "LEGACY_GOVERNANCE": None, "LEGACY_REMAINDER": None,
            "CORRECTION_FACT_ONLY": HERE / "CORRECTION-PACKAGE/corrected-fact-only.manifest.json",
        }
        def write(name, obj):
            p = work / f"{name}.json"
            p.write_text(json.dumps(obj, ensure_ascii=False))
            return p
        mans["QB4_ATTRIBUTES_ONLY"] = write("qb4-attributes-only", {**qb4m, "facts": []})
        mans["QB4_FACTS_ONLY"] = write("qb4-facts-only", {**qb4m, "company_attributes": []})
        mans["LEGACY_GOVERNANCE"] = write("legacy-governance", gov)
        mans["LEGACY_REMAINDER"] = write("legacy-remainder", legacy_rest)
        scenarios = {
            "S0_current": [], "S1_QB3_only": ["QB3"], "S2_QB4_only": ["QB4"], "S3_legacy_governance_only": ["LEGACY_GOVERNANCE"],
            "S4_QB4_attributes_only": ["QB4_ATTRIBUTES_ONLY"], "S5_QB4_facts_only": ["QB4_FACTS_ONLY"],
            "S6_accepted_combined_QB3_QB4": ["QB3", "QB4"],
            "S7_combined_without_duplicates_QB3_QB4_legacy_remainder": ["QB3", "QB4", "LEGACY_REMAINDER"],
            "S8_correction_fact_only": ["CORRECTION_FACT_ONLY"],
            "S9_correction_on_top_of_S6": ["QB3", "QB4", "CORRECTION_FACT_ONLY"],
        }
        cov, dbs = {}, {}
        for name, steps in scenarios.items():
            db = work / f"{name}.sqlite3"
            shutil.copy2(base, db)
            for s in steps:
                r = sync(root, db, mans[s], work)
                if r.returncode:
                    raise RuntimeError(f"{name}/{s}: {r.stderr[-1500:]}")
            c = readiness(root, db)
            cov[name] = {"steps": steps, "total_score": c["total_score"], "categories": summary(c), "missing": missing_by_category(c)}
            dbs[name] = db
        s0 = cov["S0_current"]
        projection = {"schema": "marefa-aramco95-coverage-projection/1",
                      "measured_by": "finengine factory-contract-readiness SA 2222 at b70254e, on disposable copies",
                      "approved_score": {"total_score": s0["total_score"], "basis": "engine data at b70254e; nothing below is approved or ingested"},
                      "target_score": "95.00", "scenarios": {}}
        for name, c in cov.items():
            filled = sorted(set().union(*(s0["missing"][k] - c["missing"].get(k, set()) for k in s0["missing"])))
            changed = {k: {"before": s0["categories"][k]["score"], "after": c["categories"][k]["score"],
                           "populated": f"{s0['categories'][k]['populated']}->{c['categories'][k]['populated']}/{c['categories'][k]['expected']}"}
                       for k in c["categories"] if c["categories"][k] != s0["categories"][k]}
            projection["scenarios"][name] = {"steps": c["steps"], "projected_total_score": c["total_score"],
                                             "delta": str(Decimal(c["total_score"]) - Decimal(s0["total_score"])),
                                             "keys_filled": filled, "categories_changed": changed, "status": "SIMULATED_NOT_APPROVED"}
        sc = projection["scenarios"]
        d = lambda n: Decimal(sc[n]["delta"])  # noqa: E731
        check("coverage_scenarios_consistent",
              d("S1_QB3_only") == 0 and d("S0_current") == 0 and str(d("S2_QB4_only")) == "2.23615259299484116209611729"
              and d("S6_accepted_combined_QB3_QB4") == d("S2_QB4_only") and d("S9_correction_on_top_of_S6") == d("S6_accepted_combined_QB3_QB4")
              and d("S4_QB4_attributes_only") + d("S5_QB4_facts_only") == d("S2_QB4_only"),
              {k: v["delta"] for k, v in sc.items()})
        # what a second carrier of the same identity does in the engine (why one carrier only)
        con = sqlite3.connect(f"file:{dbs['S9_correction_on_top_of_S6'].as_posix()}?mode=ro", uri=True)
        rows = con.execute("SELECT version,is_current,value_decimal,source_key FROM data_points WHERE company_id=? AND "
                           "metric_key='short_term_investments_net' AND fiscal_year=2025 ORDER BY version", (CID,)).fetchall()
        projection["duplicate_carrier_effect"] = {"rows_for_identity": [list(r) for r in rows],
                                                  "reading": "a second carrier of the same identity adds an engine version without adding coverage"}
        (HERE / "COVERAGE-PROJECTION.json").write_text(json.dumps(projection, ensure_ascii=False, indent=2) + "\n")

        # leak check: QB4 ingested into a copy, /page through the candidate site's live gate and preview builder
        page_json = work / "page.json"
        code = ("import json,sys\nfrom finengine.query import FinancialQueryService as Q\nq=Q(sys.argv[1])\n"
                "open(sys.argv[2],'w').write(json.dumps(q.company_page('SA','2222'),default=str));q.close()")
        subprocess.run([sys.executable, "-c", code, str(dbs["S2_QB4_only"]), str(page_json)], cwd=root, env=engine_env(root), check=True)
        # monetary facts: the exact amount string; counts: the metric key (a bare "4" would match anything)
        markers = [{"id": f"{f['metric']}:{f['fiscal_year']}",
                    "needle": f'"{qb4.num(f["value"]) * int(f["scale"])}"' if int(f.get("scale", 1)) > 1 else f'"{f["metric"]}"'}
                   for f in qb4m["facts"]]
        markers += [{"id": "corporate_secretary", "needle": "Nabeel A. Al Mansour"},
                    {"id": "board_term_end", "needle": "2027-06-30"},
                    {"id": "audit_committee", "needle": "\"meetings_2025\""},
                    {"id": "independent_directors", "needle": "Mark A. Weinberger"}]
        (work / "markers.json").write_text(json.dumps(markers))
        tree = work / "projection-tree"
        subprocess.run(["git", "-C", str(REPO), "worktree", "add", "--detach", str(tree), PROJECTION], check=True, capture_output=True)
        try:
            os.symlink(REPO / "node_modules", tree / "node_modules")
            out = work / "leak.json"
            r = subprocess.run(["bun", str(HERE / "leak_check.ts"), str(tree), str(page_json), str(work / "markers.json"), str(out)],
                               cwd=tree, capture_output=True, text=True)
            if r.returncode:
                raise RuntimeError(r.stderr[-2000:])
            leak = J(out)
        finally:
            subprocess.run(["git", "-C", str(REPO), "worktree", "remove", "--force", str(tree)], check=True)
        leak["setup"] = {"engine_copy": "S2_QB4_only (disposable)", "site_code": f"Financial Projection candidate {PROJECTION}",
                         "trust_store": "committed, empty", "approvals": None}
        (HERE / "LEAK-CHECK.json").write_text(json.dumps(leak, ensure_ascii=False, indent=2) + "\n")
        fact_ids = {m["id"] for m in markers[:len(qb4m["facts"])]}
        check("leak_check_financial_values_withheld_in_served_preview",
              all(not m["in_served_preview"] for m in leak["markers"] if m["id"] in fact_ids)
              and any(m["in_engine_page"] for m in leak["markers"] if m["id"] in fact_ids)
              and leak["gate_summary"]["approved_rows"] == 0 and leak["gate_summary"]["baseline_rows"] == 0,
              [m for m in leak["markers"] if m["id"] in fact_ids])
        attr_leaks = [m["id"] for m in leak["markers"] if m["id"] not in fact_ids and m["in_served_preview"]]
        check("leak_check_attributes_reported", True,
              {"attributes_in_served_preview": attr_leaks,
               "note": "the publication gate covers financial facts only; company attributes reach the preview only through its fixed key list"})
    finally:
        shutil.rmtree(work, ignore_errors=True)
        after = original_engine_state()
        check("original_engine_unchanged", after == before, {"before": before, "after": after})
    lines = [f"{c['status']} {c['check']}" for c in checks]
    passed = sum(c["status"] == "PASS" for c in checks)
    lines.append(f"{passed}/{len(checks)} PASS")
    (HERE / "consolidation-checks.txt").write_text("\n".join(lines) + "\n\n" + json.dumps(checks, ensure_ascii=False, indent=1, default=str) + "\n")
    print("\n".join(lines))
    return 0 if passed == len(checks) else 1


if __name__ == "__main__":
    sys.exit(main())
