"""QB4 — Aramco high-impact coverage batch: candidate values for keys the 18-category contract reports as missing.

Inputs (read only):
- Engine b70254e, exported with git archive into a temporary directory; its DB is opened read-only, and every write
  goes to disposable copies. The original engine is hashed before and after.
- ARA2025 (sha256 78bb678e…d227), the only Aramco original available here, read from the engine's committed blob.
- The engine's own prior extraction packs at b70254e (data/imports/aramco-2025-*.json), used only for comparison.

What it does:
1. Measures the gap with the engine's own evaluator (factory-contract-readiness) on a migrated copy: every missing key
   in all 18 categories, with its weight per field.
2. Builds the QB4 candidate batch (at most 25 source values): each value is checked on its cited ARA2025 page, against
   the engine's catalog and metric contracts, and against duplicates in the engine (same key, or the same reported
   line under another key).
3. Classifies every other missing key with a reason (alias of an existing key, derived, not identified in ARA2025,
   external feed, narrative, engine representation).
4. Simulates the batch: syncs the candidate manifest into a disposable copy and reruns the same evaluator. The
   projected score is reported separately from the current (approved) score.

Outputs: QB4-GAP-INVENTORY.json, QB4-MANIFEST.json, QB4-IDENTITIES.json, QB4-EXCLUSIONS.json, QB4-COVERAGE.json,
QB4-CHECKS.json, qb4-checks.txt. Nothing is written to the engine.
Usage (repo root): python3 review-delivery/ARAMCO95/QB4/qb4.py
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from decimal import Decimal
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "T1-ISOLATED"))
from t1_common import ENGINE, ENGINE_COMMIT, engine_env, export_engine, original_engine_state  # noqa: E402

ARA = "data/raw/SA/2222/documents/78bb678e8e45f5c58fa1b2402ab5a29c5ad10adfda8ba5e7ee5f4d1ad76cd227.pdf"
ARA_SHA = "78bb678e8e45f5c58fa1b2402ab5a29c5ad10adfda8ba5e7ee5f4d1ad76cd227"
ARA_URL = "https://www.aramco.com/-/media/publications/corporate-reports/reports-and-presentations/2025/fy/saudi-aramco-ara-2025-english.pdf"
CID = "sa:2222"
FILED_AT = "2026-03-09"
MAX_VALUES = 25
PRIOR_GOVERNANCE = "data/imports/aramco-2025-governance-risk.json"
PRIOR_METRICS = "data/imports/aramco-2025-annual-metrics.json"

# ─────────────────────────── candidate company_profile attributes (governance and company model)
# value: built only from what the cited pages print. anchors: verbatim sentences that must be on those pages.
# Every string leaf of the value (except ISO dates) must also appear on the cited pages.
BOARD = ["Yasir O. Al-Rumayyan", "Ibrahim A. Al-Assaf", "Mohammed A. Al-Jadaan", "Faisal F. Alibrahim",
         "Khalid H. Al-Dabbagh", "Amin H. Nasser", "Robert W. Dudley", "Lynn L. Elsenhans", "Stuart T. Gulliver",
         "Andrew N. Liveris", "Mark A. Weinberger"]
ATTRS = [
    dict(key="business_model", category="business_model", pages=[110],
         value={"business_lines": ["Upstream", "Downstream"],
                "corporate_functions": ["Technical Services", "Law", "Finance", "Technology & Innovation",
                                        "Strategy & Corporate Development", "Human Resources & Corporate Services"]},
         anchors=["Aramco is organized into two business lines that include Upstream and Downstream, and six Corporate "
                  "functions that include Technical Services, Law, Finance, Technology & Innovation, Strategy & "
                  "Corporate Development, and Human Resources & Corporate Services"]),
    dict(key="board_of_directors", category="governance", pages=[117],
         value=[{"name": n, "board_role": {"Yasir O. Al-Rumayyan": "Chairman", "Ibrahim A. Al-Assaf": "Deputy Chairman"}.get(n, "Director")}
                for n in BOARD],
         anchors=["H.E. Yasir O. Al-Rumayyan, Chairman", "H.E. Dr. Ibrahim A. Al-Assaf, Deputy Chairman",
                  "The table presents a record of attendance at these meetings for each Board member."]),
    dict(key="board_size", category="governance", pages=[114], value=11,
         anchors=["The Company is supervised by a Board consisting of 11 Directors."]),
    dict(key="independent_directors", category="governance", pages=[115, 117],
         value={"count": 5, "directors": ["Andrew N. Liveris", "Lynn L. Elsenhans", "Robert W. Dudley",
                                          "Mark A. Weinberger", "Stuart T. Gulliver"]},
         anchors=["the Board has determined that the following five Board members are independent Directors: "
                  "Mr. Liveris, Ms. Elsenhans, Mr. Dudley, Mr. Weinberger, and Mr. Gulliver."]),
    dict(key="board_committees", category="governance", pages=[114],
         value=["Audit Committee", "Sustainability, Risk and HSE Committee", "Nomination Committee", "Compensation Committee"],
         anchors=["Currently, the Board has four Committees: Audit; Sustainability, Risk and HSE; Nomination; and Compensation."]),
    dict(key="audit_committee", category="governance", pages=[118],
         value={"chair": "Stuart T. Gulliver",
                "members": ["Stuart T. Gulliver", "Faisal F. Alibrahim", "Khalid H. Al-Dabbagh", "Lynn L. Elsenhans", "Andrew N. Liveris"],
                "meetings_2025": 4, "meeting_dates_2025": ["2025-03-02", "2025-05-08", "2025-08-03", "2025-11-02"]},
         anchors=["The Audit Committee is chaired by Mr. Stuart T. Gulliver",
                  "The Audit Committee met four times in 2025: March 2, May 8, August 3, and November 2."]),
    dict(key="sustainability_risk_hse_committee", category="governance", pages=[120],
         value={"chair": "Robert W. Dudley",
                "members": ["Robert W. Dudley", "Faisal F. Alibrahim", "Amin H. Nasser", "Stuart T. Gulliver", "Mark A. Weinberger"],
                "meetings_2025": 4, "meeting_dates_2025": ["2025-03-02", "2025-05-08", "2025-08-03", "2025-11-02"]},
         anchors=["chaired by Mr. Robert W. Dudley",
                  "held four meetings in 2025: March 2, May 8, August 3, and November 2."]),
    dict(key="nomination_committee", category="governance", pages=[121],
         value={"chair": "Andrew N. Liveris",
                "members": ["Andrew N. Liveris", "Yasir O. Al-Rumayyan", "Mohammed A. Al-Jadaan", "Khalid H. Al-Dabbagh", "Lynn L. Elsenhans"],
                "meetings_2025": 2, "meeting_dates_2025": ["2025-03-02", "2025-11-02"]},
         anchors=["chaired by Mr. Andrew N. Liveris", "held two meetings in 2025: March 2 and November 2."]),
    dict(key="compensation_committee", category="governance", pages=[122],
         value={"chair": "Mark A. Weinberger",
                "members": ["Mark A. Weinberger", "Yasir O. Al-Rumayyan", "Ibrahim A. Al-Assaf", "Mohammed A. Al-Jadaan", "Robert W. Dudley"],
                "meetings_2025": 3, "meeting_dates_2025": ["2025-03-02", "2025-11-02", "2025-12-10"]},
         anchors=["chaired by Mr. Mark A. Weinberger", "held three meetings in 2025: March 2, November 2, and December 10."]),
    dict(key="corporate_secretary", category="governance", pages=[112],
         value={"name": "Nabeel A. Al Mansour", "title": "Executive Vice President, General Counsel & Corporate Secretary"},
         anchors=["Mr. Nabeel A. Al Mansour Executive Vice President, General Counsel & Corporate Secretary",
                  "Nabeel A. Al Mansour was appointed as General Counsel & Corporate Secretary in May 2016"]),
    dict(key="executive_management_team", category="governance", pages=[110, 111, 112, 113],
         value=[{"name": "Amin H. Nasser", "title": "President & Chief Executive Officer"},
                {"name": "Nasir K. Al-Naimi", "title": "Upstream President"},
                {"name": "Mohammed Y. Al Qahtani", "title": "Downstream President"},
                {"name": "Ziad T. Al Murshed", "title": "Executive Vice President & Chief Financial Officer"},
                {"name": "Wail A. Al Jaafari", "title": "Executive Vice President, Technical Services"},
                {"name": "Nabeel A. Al Mansour", "title": "Executive Vice President, General Counsel & Corporate Secretary"},
                {"name": "Nabeel A. Al-Jama'", "title": "Executive Vice President of Human Resources & Corporate Services"},
                {"name": "Ashraf A. Al Ghazzawi", "title": "Executive Vice President of Strategy & Corporate Development"},
                {"name": "Ahmad O. Al Khowaiter", "title": "Executive Vice President of Technology & Innovation"}],
         anchors=["Nasir K. Al-Naimi was appointed as Upstream President of Aramco in July 2023",
                  "Mohammed Y. Al Qahtani was appointed as Downstream President of Aramco in July 2023",
                  "Ziad T. Al Murshed was appointed as Executive Vice President & Chief Financial Officer in May 2022",
                  "Wail A. Al Jaafari was appointed as Executive Vice President of Technical Services in October 2023",
                  "Nabeel A. Al-Jama' was appointed as Executive Vice President of Human Resources & Corporate Services in July 2020",
                  "Ashraf A. Al Ghazzawi was appointed as Executive Vice President of Strategy & Corporate Development in April 2023",
                  "Ahmad O. Al Khowaiter was appointed as Executive Vice President of Technology & Innovation in April 2023"],
         profiles=9),
    dict(key="board_meetings_held", category="governance", pages=[117],
         value={"year": 2025, "count": 5, "dates": ["2025-03-03", "2025-05-09", "2025-08-04", "2025-11-03", "2025-12-11"],
                "proxy_attendance": 0},
         anchors=["In 2025 there were five Board meetings held on the following dates: March 3, May 9, August 4, November 3, and December 11.",
                  "There were no meeting attendances by proxy during 2025."]),
    dict(key="board_term_end", category="governance", pages=[114], value="2027-06-30",
         anchors=["Each Director was elected for a term of three years until June 30, 2027"]),
    dict(key="internal_control_assessment", category="governance", pages=[119],
         value={"assessor": "Audit Committee", "year": 2025, "opinion": "effective and adequate",
                "scope": "internal and financial control systems and risk management systems"},
         anchors=["the Audit Committee is of the opinion that the Company's internal and financial control systems and "
                  "risk management systems are effective and adequate."]),
]

# ─────────────────────────── candidate data_points facts
# short_term_investments_net: statement of cash flows (PDF 178), printed in SAR millions; parentheses = outflow.
# dividend_installments_count: Note 37 (PDF 235), the quarterly rows of "Dividends declared and paid each quarter".
FACTS = [
    dict(metric="short_term_investments_net", fy=2025, printed="(1,457)", scale=1000000, unit="SAR", currency="SAR", page=178,
         table="consolidated statement of cash flows", row="Net (purchases) maturities of short-term investments"),
    dict(metric="short_term_investments_net", fy=2024, printed="171,157", scale=1000000, unit="SAR", currency="SAR", page=178,
         table="consolidated statement of cash flows", row="Net (purchases) maturities of short-term investments"),
    dict(metric="dividend_installments_count", fy=2025, printed="4", scale=1, unit="count", currency="", page=235,
         table="Note 37 Dividends", row="Dividends declared and paid each quarter: March, June, September, December"),
    dict(metric="dividend_installments_count", fy=2024, printed="4", scale=1, unit="count", currency="", page=235,
         table="Note 37 Dividends", row="Dividends declared and paid each quarter: March, June, September, December"),
]

# Narrative fields: the prior pack holds paraphrases. Filling them needs an owner content rule (verbatim or editorial).
NARRATIVE = {"compensation_policy", "governance_framework", "industry_overview", "industry_drivers",
             "regulatory_environment", "competitive_environment", "industry_size", "industry_growth"}


def norm(s: str) -> str:
    s = re.sub(r"[‎‏‪-‮⁦-⁩﷼]", "", s)
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    return re.sub(r"\s+", " ", s).strip()


def num(s: str) -> Decimal:
    s = s.strip().replace(",", "")
    neg = s.startswith("(") or s.startswith("-")
    return -Decimal(s.strip("()-")) if neg else Decimal(s)


def leaves(v):
    if isinstance(v, dict):
        for x in v.values():
            yield from leaves(x)
    elif isinstance(v, list):
        for x in v:
            yield from leaves(x)
    else:
        yield v


def attribute_on_pages(a: dict, raw: list[str]) -> dict:
    """Pure check, also used by the tests: every anchor and every string leaf on the cited pages."""
    text = " ".join(norm(raw[p - 1]) for p in a["pages"])
    missing_anchors = [s for s in a["anchors"] if norm(s) not in text]
    missing_leaves = [x for x in leaves(a["value"]) if isinstance(x, str)
                      and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", x) and norm(x) not in text]
    out = {"key": a["key"], "pages": a["pages"], "missing_anchors": missing_anchors, "missing_leaves": missing_leaves}
    if "profiles" in a:
        out["profiles_on_pages"] = sum(len(re.findall(r"\bExperience\b", raw[p - 1])) for p in a["pages"])
        out["profiles_ok"] = out["profiles_on_pages"] == a["profiles"] == len(a["value"])
    out["ok"] = not missing_anchors and not missing_leaves and out.get("profiles_ok", True)
    return out


def fact_on_page(f: dict, layout: list[str]) -> dict:
    """Pure check: the printed cell sits on its row, in the right column (2025 first, 2024 second)."""
    page = layout[f["page"] - 1]
    if f["metric"] == "short_term_investments_net":
        line = next((l for l in page.splitlines() if f["row"] in l), "")
        cells = re.findall(r"\(?[\d,]+\)?|–", line.split(f["row"], 1)[1]) if line else []
        col = 0 if f["fy"] == 2025 else 1
        return {"row_found": bool(line), "cells": cells, "ok": len(cells) >= 2 and cells[col] == f["printed"]}
    # dividend_installments_count: the four quarterly rows under the note heading, each with both years printed,
    # and the rows add up to the printed total of that year.
    lines = page.splitlines()
    try:
        start = next(i for i, l in enumerate(lines) if "Dividends declared and paid each quarter" in l)
    except StopIteration:
        return {"row_found": False, "ok": False}
    rows = []
    for l in lines[start + 1:]:
        m = re.match(r"\s*(March|June|September|December)\s+([\d,]+)\s+([\d,]+)\s", l)
        if m:
            rows.append(m.groups())
        elif re.match(r"\s*Total", l):
            total = re.findall(r"[\d,]+\.?\d*", l.split("Total", 1)[1])
            break
    col = 1 if f["fy"] == 2025 else 2
    summed = sum(num(r[col]) for r in rows)
    printed_total = num(total[1 if col == 1 else 2]) if len(total) >= 3 else None
    return {"row_found": True, "quarter_rows": [r[0] for r in rows], "sum": str(summed), "printed_total": str(printed_total),
            "ok": len(rows) == int(f["printed"]) == 4 and summed == printed_total}


def sync(root: Path, db: Path, manifest: Path, work: Path) -> subprocess.CompletedProcess:
    imports = work / f"imports-{manifest.stem}"
    imports.mkdir(exist_ok=True)
    shutil.copy2(manifest, imports / manifest.name)
    return subprocess.run([sys.executable, "-m", "finengine", "--db", str(db), "sync-manifests", "--imports", str(imports),
                           "--manifest", str(imports / manifest.name), "--registry", str(root / "config/companies.json"),
                           "--raw-dir", str(work / f"raw-{manifest.stem}"), "--archive-index", "", "--project-root", str(root)],
                          cwd=root, env=engine_env(root), capture_output=True, text=True)


def readiness(root: Path, db: Path) -> dict:
    r = subprocess.run([sys.executable, "-m", "finengine", "--db", str(db), "factory-contract-readiness", "SA", "2222"],
                       cwd=root, env=engine_env(root), capture_output=True, text=True, check=True)
    return json.loads(r.stdout[r.stdout.index("{"):])


def missing_by_category(c: dict) -> dict[str, set[str]]:
    return {k["category_key"]: {f for v in k["evidence"].get("missing_fields", {}).values() for f in v} for k in c["categories"]}


def summary(c: dict) -> dict:
    return {k["category_key"]: {"weight": k["weight"], "score": k["score"], "weighted_score": k["weighted_score"],
                                "populated": k["evidence"].get("populated_fields"), "expected": k["evidence"].get("expected_fields"),
                                "threshold": k["threshold"], "threshold_passed": k["threshold_passed"]} for k in c["categories"]}


def classify(field: str, category: str, prior_attr_keys: set[str]) -> tuple[str, str]:
    """Reason a missing key is not in this batch. Codes are fixed; details name the evidence."""
    alias = {"ordinary_dividend": "base_dividends_paid", "special_dividend": "performance_linked_dividends_paid",
             "investments_joint_ventures": "investments_associates (JVs and associates combined)"}
    combined = {"zakat_paid": "Settlement of income, zakat and other taxes (one line; engine taxes_paid)",
                "zakat_payable": "income taxes and zakat payable are not split",
                "adjusted_ebit": "ARA2025 reports adjusted EBIT by segment only (engine holds the three segment keys)"}
    non_projectable = {"cost_of_revenue", "gross_profit", "general_and_administrative_expense",
                       "selling_and_distribution_expense", "ppe_purchases", "intangible_asset_purchases",
                       "joint_venture_investments", "investments_joint_ventures"}
    if field in alias:
        return "alias_of_existing_key_needs_definition_decision", f"same reported amount is already held as {alias[field]}"
    if field in non_projectable:
        return "engine_non_projectable_presentation_field", "listed in canonicalization.NON_PROJECTABLE_PRESENTATION_FIELDS (by-nature income statement, aggregate capex)"
    if field in combined:
        return "combined_or_segment_only_line", combined[field]
    if field == "total_dividend_declared":
        return "period_basis_ambiguity", "Note 37 prints dividends declared and paid during 2025 (320,447) and, separately, the Q4-2025 base dividend declared on 2026-03-09 (82,083); the key does not say which basis"
    if field == "dividend_payment_frequency":
        return "engine_representation_blocker", "the value is text ('quarterly'); a manifest fact with a text value fails at the engine's extraction stage (probe in this run)"
    if field in {"contingencies", "customer_concentration"}:
        return "qualitative_disclosure_without_amount", "the engine holds the note as a disclosure; the catalog counts this key from data_points only, and ARA2025 prints no amount"
    if field == "strategic_ownership":
        return "classification_decision_on_existing_row", "ownership_positions already holds 'Other strategic holdings, including PIF-related holdings' (16%) with holder_type sovereign_and_strategic, which the evaluator does not count"
    if field == "cik":
        return "not_applicable_candidate", "SEC Central Index Key; Aramco is not an SEC registrant (needs an availability assessment, not a value)"
    if field in NARRATIVE:
        return "narrative_needs_content_rule", "free-text field; the prior engine pack holds paraphrases" if field in prior_attr_keys else "free-text field with no defined content rule"
    if category in {"market_data"} or field in {"price_adjusted_close", "previous_close"}:
        return "external_market_feed_required", "price history and volumes come from a licensed market feed, not from the annual report"
    if category == "valuation":
        return ("external_consensus_feed_required" if field.endswith("_estimate") or field == "forward_price_to_earnings"
                else "derived_needs_rule_and_market_data"), "consensus estimates or price-based multiples"
    if category in {"growth", "profitability", "efficiency", "liquidity_solvency", "calculated_smart_metrics"}:
        return "derived_needs_rule", "a calculation over existing keys; the engine's own calculation definitions decide it, not a source value"
    if category == "dividends":
        return "derived_needs_rule", "TTM, forward, CAGR, ratio or score over existing dividend keys"
    if category == "ownership":
        return "shareholder_registry_source_required", "ARA2025 prints only the Government, PIF-related, public and treasury split (already in the engine)"
    if category in {"corporate_actions", "announcements"}:
        return "event_feed_required", "exchange announcements feed (saudiexchange.sa returns 403 here); none of these events is a value in ARA2025"
    if category in {"operational_kpis", "segments", "sector_specific_fields"}:
        return "see_QB3", "QB3 searched ARA2025 for these keys; availability candidates and definition decisions are in QB3-AVAILABILITY-CANDIDATES.json"
    if category == "company_profile":
        return "not_identified_in_ARA2025", "no LEI, Sharia classification or investor-relations e-mail address in the report text"
    return "not_identified_in_ARA2025", "not located in the ARA2025 primary statements or notes by this batch's review; needs a reviewer or another original (interim reports are not available here)"


def main() -> int:
    checks: list[dict] = []

    def check(name, ok, detail):
        checks.append({"check": name, "status": "PASS" if ok else "FAIL", "detail": detail})

    before = original_engine_state()
    work = Path(tempfile.mkdtemp(prefix="qb4-"))
    try:
        pdf = work / "ara2025.pdf"
        pdf.write_bytes(subprocess.run(["git", "-C", str(ENGINE), "show", f"{ENGINE_COMMIT}:{ARA}"],
                                       capture_output=True, check=True).stdout)
        check("source_document_hash", hashlib.sha256(pdf.read_bytes()).hexdigest() == ARA_SHA, ARA_SHA)
        subprocess.run(["pdftotext", "-layout", str(pdf), str(work / "l.txt")], check=True)
        subprocess.run(["pdftotext", str(pdf), str(work / "r.txt")], check=True)
        layout = (work / "l.txt").read_text().split("\f")
        raw = (work / "r.txt").read_text().split("\f")

        root = export_engine(work / "e")
        base_db = work / "base.sqlite3"
        shutil.copy2(root / "data/financial.sqlite3", base_db)
        subprocess.run([sys.executable, "-c", "import sys\nfrom finengine.database import Database\nDatabase(sys.argv[1]).close()",
                        str(base_db)], cwd=root, env=engine_env(root), check=True)

        # 1. the gap, from the engine's own evaluator
        before_c = readiness(root, base_db)
        miss = missing_by_category(before_c)
        all_missing = set().union(*miss.values())
        db = sqlite3.connect(f"file:{base_db.as_posix()}?mode=ro", uri=True)
        db.row_factory = sqlite3.Row
        cat_rows = {r["field_key"]: dict(r) for r in db.execute(
            "SELECT field_key,category,storage_domain,value_type,default_unit,requirement FROM data_catalog_fields WHERE enabled=1 AND review_state='reviewed'")}
        inventory = []
        for k in before_c["categories"]:
            e = k["evidence"]
            per_field = (Decimal(k["weight"]) / e["expected_fields"]) if e.get("expected_fields") else None
            for group, fields in e.get("missing_fields", {}).items():
                for f in fields:
                    inventory.append({"category": k["category_key"], "field_group": group, "field_key": f,
                                      "points_per_field": str(per_field.quantize(Decimal("0.0001"))) if per_field else None,
                                      "storage_domain": cat_rows.get(f, {}).get("storage_domain"),
                                      "requirement": cat_rows.get(f, {}).get("requirement")})
        (HERE / "QB4-GAP-INVENTORY.json").write_text(json.dumps({
            "schema": "marefa-qb4-gap-inventory/1", "engine_commit": ENGINE_COMMIT, "contract_version": before_c["contract_version"],
            "total_score_now": before_c["total_score"], "target_score": before_c["target_score"],
            "categories": summary(before_c), "missing_entries": len(inventory), "distinct_missing_keys": len(all_missing),
            "missing": inventory}, ensure_ascii=False, indent=2) + "\n")
        check("gap_measured_by_engine_evaluator", before_c["contract_version"] == "1.0.0" and len(before_c["categories"]) == 18,
              {"contract_version": before_c["contract_version"], "categories": len(before_c["categories"]),
               "total_score_now": before_c["total_score"], "distinct_missing_keys": len(all_missing)})

        # 2. candidate checks
        batch_keys = [a["key"] for a in ATTRS] + sorted({f["metric"] for f in FACTS})
        n_values = len(ATTRS) + len(FACTS)
        check("batch_size_within_limit", n_values <= MAX_VALUES, {"values": n_values, "limit": MAX_VALUES})
        check("every_batch_key_is_missing_now", all(k in all_missing for k in batch_keys),
              {k: [c for c, s in miss.items() if k in s] for k in batch_keys})
        src = [attribute_on_pages(a, raw) for a in ATTRS]
        check("attributes_anchored_on_cited_pages", all(x["ok"] for x in src), src)
        fsrc = [{"metric": f["metric"], "fy": f["fy"], "page": f["page"], **fact_on_page(f, layout)} for f in FACTS]
        check("facts_printed_on_cited_rows", all(x["ok"] for x in fsrc), fsrc)
        # investing subtotal: the column read for short-term investments adds up with the other printed investing lines
        cf = layout[177]
        inv_rows = ["Capital expenditures", "Acquisition of affiliates, net of cash acquired", "Additional investments in joint ventures and associates",
                    "Proceeds from sale of affiliates", "Distributions from joint ventures and associates", "Dividends from investments in securities",
                    "Interest received", "Investments in securities - net", "Net (purchases) maturities of short-term investments"]
        sums = {}
        for col in (0, 1):
            total = Decimal(0)
            for name in inv_rows:
                line = next(l for l in cf.splitlines() if name in l)
                cells = [c for c in re.findall(r"\(?[\d,]+\)?", line.split(name, 1)[1]) if not re.fullmatch(r"\d{1,2}(\(\w\))?", c)]
                cells = [c for c in cells if len(c.strip("()").replace(",", "")) > 2 or "," in c]
                total += num(cells[col])
            sub = next(l for l in cf.splitlines() if "Net cash used in investing activities" in l)
            sums[2025 - col] = {"sum": str(total), "printed": re.findall(r"\(?[\d,]+\)?", sub)[col]}
        check("cash_flow_column_and_sign_reconcile_to_investing_subtotal",
              all(Decimal(v["sum"]) == num(v["printed"]) for v in sums.values()), sums)

        dup = {}
        for f in FACTS:
            rows = db.execute("SELECT id,version,is_current,value_decimal FROM data_points WHERE company_id=? AND metric_key=? AND fiscal_year=?",
                              (CID, f["metric"], f["fy"])).fetchall()
            same_amount = []
            if f["scale"] > 1:
                v = num(f["printed"]) * f["scale"]
                same_amount = [dict(r) for r in db.execute(
                    "SELECT metric_key,period_kind,value_decimal FROM data_points WHERE company_id=? AND fiscal_year=? AND "
                    "period_kind='fy' AND (value_decimal=? OR value_decimal=?)", (CID, f["fy"], str(v), str(-v)))]
            dup[f"{f['metric']}:{f['fy']}"] = {"existing_rows_same_key": [dict(r) for r in rows], "same_amount_under_other_key": same_amount}
        for a in ATTRS:
            rows = db.execute("SELECT id,is_current FROM company_attributes WHERE company_id=? AND attribute_key=?", (CID, a["key"])).fetchall()
            dup[a["key"]] = {"existing_rows_same_key": [dict(r) for r in rows]}
        check("no_duplicate_in_engine_same_key_or_same_line", all(not v["existing_rows_same_key"] and not v.get("same_amount_under_other_key")
                                                                 for v in dup.values()), dup)
        contract = {}
        for a in ATTRS:
            c = cat_rows.get(a["key"])
            contract[a["key"]] = {"catalog": c, "ok": bool(c) and c["storage_domain"] == "company_profile"}
        for f in FACTS:
            c = cat_rows.get(f["metric"])
            mc = db.execute("SELECT allowed_period_kinds_json,unit_family FROM metric_contracts WHERE metric_key=? AND enabled=1",
                            (f["metric"],)).fetchone()
            md = db.execute("SELECT metric_key FROM metric_definitions WHERE metric_key=?", (f["metric"],)).fetchone()
            fam = {"SAR": "monetary", "count": "count"}[f["unit"]]
            contract[f"{f['metric']}:{f['fy']}"] = {"catalog": c, "metric_contract": dict(mc) if mc else None,
                                                   "ok": bool(c and mc and md) and c["storage_domain"] == "data_points"
                                                   and "fy" in json.loads(mc["allowed_period_kinds_json"]) and mc["unit_family"] == fam}
        check("catalog_storage_domain_and_metric_contracts", all(v["ok"] for v in contract.values()), contract)

        # 3. prior engine packs: comparison only
        prior = json.loads(subprocess.run(["git", "-C", str(ENGINE), "show", f"{ENGINE_COMMIT}:{PRIOR_GOVERNANCE}"],
                                          capture_output=True, check=True, text=True).stdout)
        prior_attrs = {x["attribute_key"]: x for x in prior["company_attributes"]}
        prior_in_db = db.execute("SELECT count(*) FROM source_documents WHERE company_id=? AND filing_type=?",
                                 (CID, prior["filing_type"])).fetchone()[0]

        def names(v):
            return sorted(re.sub(r"^(H\.E\. |Dr\. |Mr\. |Ms\. )+", "", n) for n in v)

        comparison = {}
        for a in ATTRS:
            p = prior_attrs.get(a["key"])
            if not p:
                comparison[a["key"]] = "absent_in_prior_pack"
                continue
            pv, mv = p["value"], a["value"]
            if isinstance(mv, dict) and "members" in mv:
                same = names(pv["members"]) == names(mv["members"]) and pv.get("chair") == mv["chair"] and pv.get("meetings_2025") == mv["meetings_2025"]
            elif a["key"] == "board_of_directors":
                same = names(x["name"] for x in pv) == names(x["name"] for x in mv)
            elif a["key"] == "independent_directors":
                same = names(pv) == names(mv["directors"])
            elif a["key"] == "executive_management_team":
                same = names(x["name"] for x in pv) == names(x["name"] for x in mv)
            elif a["key"] == "board_meetings_held":
                same = pv.get("count") == mv["count"] and pv.get("proxy_attendance") == mv["proxy_attendance"]
            elif a["key"] in ("business_model", "corporate_secretary", "internal_control_assessment"):
                keys = set(pv) & set(mv)
                same = all(pv[k] == mv[k] for k in keys if k in ("business_lines", "corporate_functions", "name", "title", "assessor", "year"))
            else:
                same = pv == mv
            comparison[a["key"]] = "agrees" if same else {"differs": {"prior": pv, "qb4": mv}}
        pm = json.loads(subprocess.run(["git", "-C", str(ENGINE), "show", f"{ENGINE_COMMIT}:{PRIOR_METRICS}"],
                                       capture_output=True, check=True, text=True).stdout)
        prior_stin = [x for x in pm["facts"] if x.get("metric") == "short_term_investments_net"]
        prior_findings = {
            "governance_pack": {"path": PRIOR_GOVERNANCE, "attributes": len(prior_attrs), "filing_in_engine_db": bool(prior_in_db),
                                "comparison": comparison},
            "annual_metrics_short_term_investments_net": {
                "path": PRIOR_METRICS, "prior_facts": prior_stin,
                "in_engine_db": bool(db.execute("SELECT 1 FROM data_points WHERE company_id=? AND metric_key='short_term_investments_net'", (CID,)).fetchone()),
                "finding": "prior pack holds +1,457 labelled 'net maturities'; the statement prints (1,457) on the 'Net (purchases) maturities' row, an outflow (net purchases) in 2025"}}
        check("prior_pack_comparison", all(v in ("agrees", "absent_in_prior_pack") for v in comparison.values()), prior_findings)

        # 4. manifest and identities
        mfacts, identities = [], []
        for f in FACTS:
            v = num(f["printed"])
            fact = {"metric": f["metric"], "source_label": f["row"], "value": str(v), "unit": f["unit"],
                    "period_start": f"{f['fy']}-01-01", "period_end": f"{f['fy']}-12-31", "period_kind": "fy", "fiscal_year": f["fy"],
                    "page": f["page"], "table": f["table"], "cell": f"{f['fy']} column: {f['printed']}"}
            if f["currency"]:
                fact["currency"] = f["currency"]
            if f["scale"] > 1:
                fact["scale"] = f["scale"]
            mfacts.append(fact)
            identities.append({"kind": "fact", "company_id": CID, "metric_key": f["metric"], "period_kind": "fy",
                               "period_start": f"{f['fy']}-01-01", "period_end": f"{f['fy']}-12-31", "fiscal_year": f["fy"],
                               "scope": "consolidated", "dimensions": {}, "currency": f["currency"], "unit": f["unit"],
                               "value": str(v * f["scale"]), "printed": f["printed"], "pdf_page": f["page"], "printed_row": f["row"],
                               "classification": "new_key_history" if f["fy"] == 2024 else "new_key",
                               "edition": "ARA2025" + (" comparative (FY2024 as presented in the 2025 annual report)" if f["fy"] == 2024 else ""),
                               "source_document_sha256": ARA_SHA, "source_url": ARA_URL,
                               "source_review": "PENDING", "financial_qualification": "WITHHELD", "rights": "UNKNOWN_NO_GRANT"})
        mattrs = []
        for a in ATTRS:
            mattrs.append({"attribute_key": a["key"], "value": a["value"], "category": a["category"],
                           "metadata": {"pdf_pages": a["pages"], "anchors": a["anchors"], "method": "page_anchor_check",
                                        "batch": "QB4", "state": "CANDIDATE_NOT_INGESTED"}})
            identities.append({"kind": "company_attribute", "company_id": CID, "attribute_key": a["key"], "language": "en",
                               "as_of": FILED_AT, "value": a["value"], "pdf_pages": a["pages"], "classification": "new_key",
                               "prior_pack": comparison[a["key"]] if isinstance(comparison[a["key"]], str) else "differs",
                               "source_document_sha256": ARA_SHA, "source_url": ARA_URL,
                               "source_review": "PENDING", "financial_qualification": "NOT_APPLICABLE", "rights": "UNKNOWN_NO_GRANT"})
        manifest = {"company_id": CID, "market": "SA", "symbol": "2222",
                    "filing_type": "Annual report 2025 - QB4 coverage candidate (governance, dividends, cash flow)",
                    "filed_at": FILED_AT, "filed_at_basis": "same filing date as the engine's ARA2025 manifests",
                    "filed_at_note": f"ARA2025 PDF sha256 {ARA_SHA}; candidate, source review pending, not for ingestion",
                    "period_end": "2025-12-31", "source_url": ARA_URL, "facts": mfacts, "company_attributes": mattrs}
        (HERE / "QB4-MANIFEST.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
        (HERE / "QB4-IDENTITIES.json").write_text(json.dumps({
            "schema": "marefa-qb4-identities/1", "state": "CANDIDATE_NOT_INGESTED", "values": len(identities),
            "new_keys": len(set(batch_keys)), "history_values_on_new_keys": sum(1 for i in identities if i["classification"] == "new_key_history"),
            "identities": identities}, ensure_ascii=False, indent=2) + "\n")
        check("no_future_periods_or_targets", all(f["fy"] <= 2025 for f in FACTS)
              and not any(re.search(r"capacity|target|guidance|forecast", k) for k in batch_keys), batch_keys)
        check("no_narrative_keys_in_batch", not (set(batch_keys) & NARRATIVE), sorted(NARRATIVE))

        probe = subprocess.run([sys.executable, "-c", (
            "import json,sys,shutil,tempfile,pathlib\nfrom finengine.verification import ManifestVerifier\n"
            "d=pathlib.Path(tempfile.mkdtemp());shutil.copy(sys.argv[1],d/'aramco-2025-qb4-coverage-candidate.json')\n"
            "r=ManifestVerifier(d).verify()\nprint(json.dumps({'checks':r['checks'],'passed':r['passed'],'warnings':r['warnings'],"
            "'failures':r['failures'],'unmapped':len(r['unmapped_labels'])},default=str))"),
            str(HERE / "QB4-MANIFEST.json")], cwd=root, env=engine_env(root), capture_output=True, text=True)
        if probe.returncode:
            raise RuntimeError(probe.stderr[-2000:])
        p = json.loads(probe.stdout.strip().splitlines()[-1])
        check("engine_manifest_verifier", not p["failures"] and p["unmapped"] == 0, p)

        # 5. text-value probe for dividend_payment_frequency (why it is not in the batch)
        tdb = work / "probe.sqlite3"
        shutil.copy2(base_db, tdb)
        tman = work / "probe-text-fact.json"
        tman.write_text(json.dumps({"company_id": CID, "filing_type": "QB4 probe: text-valued fact", "filed_at": FILED_AT,
                                    "period_end": "2025-12-31", "source_url": "https://example.invalid/qb4-probe.pdf",
                                    "facts": [{"metric": "dividend_payment_frequency", "value": "quarterly", "unit": "text",
                                               "period_start": "2025-01-01", "period_end": "2025-12-31", "period_kind": "fy",
                                               "fiscal_year": 2025, "page": 1}]}))
        tr = sync(root, tdb, tman, work)
        stage = re.search(r"'stage': '(\w+)'", tr.stderr)
        check("text_value_probe_documents_representation_blocker", tr.returncode != 0 and stage is not None,
              {"returncode": tr.returncode, "stage": stage.group(1) if stage else None})

        # 6. simulation on a disposable copy, measured by the same evaluator
        sim = work / "sim.sqlite3"
        shutil.copy2(base_db, sim)
        sr = sync(root, sim, HERE / "QB4-MANIFEST.json", work)
        if sr.returncode:
            raise RuntimeError(sr.stderr[-3000:])
        after_c = readiness(root, sim)
        miss_after = missing_by_category(after_c)
        sdb = sqlite3.connect(f"file:{sim.as_posix()}?mode=ro", uri=True)
        readback = {}
        for f in FACTS:
            r = sdb.execute("SELECT value_decimal,unit,currency,period_start,period_end FROM data_points WHERE company_id=? AND "
                            "metric_key=? AND fiscal_year=? AND is_current=1", (CID, f["metric"], f["fy"])).fetchall()
            readback[f"{f['metric']}:{f['fy']}"] = {"rows": [list(x) for x in r],
                                                    "ok": len(r) == 1 and Decimal(r[0][0]) == num(f["printed"]) * f["scale"]}
        for a in ATTRS:
            r = sdb.execute("SELECT value_json FROM company_attributes WHERE company_id=? AND attribute_key=? AND is_current=1",
                            (CID, a["key"])).fetchall()
            readback[a["key"]] = {"ok": len(r) == 1 and json.loads(r[0][0]) == a["value"]}
        check("simulation_readback_values_and_signs", all(v["ok"] for v in readback.values()), readback)
        newly = {k: sorted(miss[k] - miss_after.get(k, set())) for k in miss}
        filled = sorted(set().union(*newly.values()))
        from_batch = sorted(set(filled) & set(batch_keys))
        engine_derived = sorted(set(filled) - set(batch_keys))
        not_filled = sorted(set(batch_keys) - set(filled))
        check("simulation_fills_every_batch_key", not not_filled, {"not_filled": not_filled})
        cats_b, cats_a = summary(before_c), summary(after_c)
        coverage = {
            "schema": "marefa-qb4-coverage/1", "measured_by": "finengine factory-contract-readiness SA 2222 (engine b70254e) on disposable copies",
            "approved_score": {"total_score": before_c["total_score"], "basis": "current engine data at b70254e; nothing in QB4 is accepted"},
            "projected_score_if_batch_accepted_and_ingested": {"total_score": after_c["total_score"], "basis": "simulation only; not an approved score"},
            "delta_total_score": str(Decimal(after_c["total_score"]) - Decimal(before_c["total_score"])),
            "target_score": before_c["target_score"],
            "new_keys_filled": len(from_batch), "history_values_on_new_keys": sum(1 for f in FACTS if f["fy"] == 2024),
            "source_values": n_values, "keys_filled_from_batch": from_batch, "keys_filled_by_engine_derivation": engine_derived,
            "categories": {k: {"before": cats_b[k], "after": cats_a[k], "newly_populated": newly.get(k, [])} for k in cats_b
                           if cats_b[k] != cats_a[k] or newly.get(k)},
            "unchanged_categories": sorted(k for k in cats_b if cats_b[k] == cats_a[k] and not newly.get(k)),
            "threshold_status_after": {k: cats_a[k]["threshold_passed"] for k in cats_a},
            "readiness_state_after": after_c["readiness_state"],
        }
        # prior governance pack alone, for context (what the 20 prior attributes would do, narrative ones included)
        pdb = work / "prior.sqlite3"
        shutil.copy2(base_db, pdb)
        pman = work / "prior-governance.json"
        pman.write_text(json.dumps(prior))
        pr = sync(root, pdb, pman, work)
        coverage["context_prior_governance_pack_alone"] = (
            {"total_score": readiness(root, pdb)["total_score"], "note": "includes 6 narrative paraphrases that QB4 does not carry"}
            if pr.returncode == 0 else {"error": pr.stderr[-500:]})
        (HERE / "QB4-COVERAGE.json").write_text(json.dumps(coverage, ensure_ascii=False, indent=2) + "\n")
        check("coverage_effect_computed_by_engine_evaluator", True,
              {"approved": before_c["total_score"], "projected": after_c["total_score"], "filled_from_batch": len(from_batch),
               "engine_derived": engine_derived})

        # 7. every other missing key, with a reason
        exclusions = []
        for e in inventory:
            if e["field_key"] in batch_keys:
                continue
            code, detail = classify(e["field_key"], e["category"], set(prior_attrs))
            exclusions.append({**e, "reason_code": code, "detail": detail, "state": "PENDING_REVIEW"})
        counts = {}
        for x in exclusions:
            counts[x["reason_code"]] = counts.get(x["reason_code"], 0) + 1
        (HERE / "QB4-EXCLUSIONS.json").write_text(json.dumps({
            "schema": "marefa-qb4-exclusions/1", "entries": len(exclusions), "by_reason": dict(sorted(counts.items())),
            "note": "reasons are this batch's classification for planning; none lowers a denominator (that needs an independent availability assessment)",
            "exclusions": exclusions}, ensure_ascii=False, indent=2) + "\n")
        check("every_missing_key_classified", len(exclusions) + sum(1 for e in inventory if e["field_key"] in batch_keys) == len(inventory),
              counts)
    finally:
        shutil.rmtree(work, ignore_errors=True)
        after = original_engine_state()
        check("original_engine_unchanged", after == before, {"before": before, "after": after})
    (HERE / "QB4-CHECKS.json").write_text(json.dumps({"schema": "marefa-qb4-checks/1", "checks": checks}, ensure_ascii=False, indent=2, default=str) + "\n")
    lines = [f"{c['status']} {c['check']}" for c in checks]
    passed = sum(c["status"] == "PASS" for c in checks)
    lines.append(f"{passed}/{len(checks)} PASS")
    (HERE / "qb4-checks.txt").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))
    return 0 if passed == len(checks) else 1


if __name__ == "__main__":
    sys.exit(main())
