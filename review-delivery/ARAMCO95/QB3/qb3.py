"""QB3 — Aramco operational/segment batch: build the candidate manifest and run every quality check. No engine write.

Source: ARA2025 (sha256 78bb678e…d227), read from the engine's committed blob (git show b70254e:…), the only Aramco
original available here. Engine: a git-archive export of b70254e in a temporary directory (DB read with mode=ro).

Batch: FY2024 comparatives printed in ARA2025 for source fields the engine holds for FY2025 only. The engine derives
segment_* aliases (segment_revenue, segment_capex, …) itself, so they are not entered.
Also writes availability-assessment CANDIDATES (unsigned, for an independent reviewer) for fields ARA2025 does not
disclose, and the expected coverage effect of both.

Outputs: QB3-MANIFEST.json, QB3-IDENTITIES.json, QB3-AVAILABILITY-CANDIDATES.json, QB3-CHECKS.json, qb3-checks.txt
Usage (repo root): python3 review-delivery/ARAMCO95/QB3/qb3.py
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

# metric, segment, value (as printed, SAR millions unless unit says otherwise), unit, scale, currency, PDF page,
# table, printed row label, printed 2025 (must equal the engine's FY2025 row), printed 2024 (the new value), kind
ROWS = [
    ("upstream_revenue", "Upstream", "1,141,156", "SAR", 1000000, "SAR", 52, "upstream financial results",
     "(including inter-segment revenue)", "1,033,726", "1,141,156", "table"),
    ("upstream_adjusted_ebit", "Upstream", "801,047", "SAR", 1000000, "SAR", 52, "upstream financial results",
     "Adjusted EBIT", "732,938", "801,047", "table"),
    ("upstream_capex", "Upstream", "147,135", "SAR", 1000000, "SAR", 52, "upstream financial results",
     "Capital expenditures – cash basis", "141,635", "147,135", "table"),
    ("downstream_revenue", "Downstream", "1,063,258", "SAR", 1000000, "SAR", 58, "downstream financial results",
     "(including inter-segment revenue)", "1,006,618", "1,063,258", "table"),
    ("downstream_adjusted_ebit", "Downstream", "8,859", "SAR", 1000000, "SAR", 58, "downstream financial results",
     "Adjusted EBIT", "37,610", "8,859", "table"),
    ("downstream_capex", "Downstream", "38,989", "SAR", 1000000, "SAR", 58, "downstream financial results",
     "Capital expenditures – cash basis", "43,831", "38,989", "table"),
    ("corporate_adjusted_ebit", "Corporate", "-21,796", "SAR", 1000000, "SAR", 66, "corporate financial results",
     "Adjusted EBIT", "(18,118)", "(21,796)", "table"),
    ("corporate_capex", "Corporate", "2,766", "SAR", 1000000, "SAR", 66, "corporate financial results",
     "Capital expenditures – cash basis", "4,978", "2,766", "table"),
    ("upstream_capex_per_boe", None, "8.3", "USD/boe", 1, "USD", 50, "upstream performance",
     "upstream capital expenditures averaged", "8.0", "8.3", "text"),
    ("lifting_cost_per_boe", None, "3.53", "USD/boe", 1, "USD", 50, "upstream performance",
     "Average upstream lifting costs", "3.51", "3.53", "text"),
    ("downstream_crude_utilization", None, "53", "percent", 1, "", 53, "upstream crude placement",
     "Downstream business was the largest customer of the upstream crude oil production", "53", "53", "text"),
]


def num(s: str) -> Decimal:
    s = s.strip().replace(",", "")
    neg = s.startswith("(") or s.startswith("-")
    return -Decimal(s.strip("()-")) if neg else Decimal(s)


def main() -> int:
    checks: list[dict] = []
    def check(name, ok, detail):
        checks.append({"check": name, "status": "PASS" if ok else "FAIL", "detail": detail})
    before = original_engine_state()
    work = Path(tempfile.mkdtemp(prefix="qb3-"))
    try:
        pdf = work / "ara2025.pdf"
        pdf.write_bytes(subprocess.run(["git", "-C", str(ENGINE), "show", f"{ENGINE_COMMIT}:{ARA}"],
                                       capture_output=True, check=True).stdout)
        check("source_document_hash", hashlib.sha256(pdf.read_bytes()).hexdigest() == ARA_SHA, ARA_SHA)
        subprocess.run(["pdftotext", "-layout", str(pdf), str(work / "l.txt")], check=True)
        subprocess.run(["pdftotext", str(pdf), str(work / "r.txt")], check=True)
        layout = (work / "l.txt").read_text().split("\f")
        raw = [re.sub(r"\s+", " ", p) for p in (work / "r.txt").read_text().split("\f")]

        root = export_engine(work / "e")
        db = sqlite3.connect(f"file:{(root / 'data/financial.sqlite3').as_posix()}?mode=ro", uri=True)
        db.row_factory = sqlite3.Row

        facts, identities, src_detail, eng_detail, dup_detail, contract_detail = [], [], [], [], [], []
        for (metric, seg, value, unit, scale, cur, page, table, label, p25, p24, kind) in ROWS:
            # 1. source: the label and both printed years on the cited page, 2025 first, 2024 second.
            if kind == "table":
                lines = [l for l in layout[page - 1].splitlines() if label in l]
                ok = any(re.search(re.escape(p25) + r"\s+" + re.escape(p24) + r"(\s|$)", l) for l in lines)
            else:
                # The riyal sign is followed by invisible direction marks; allow up to 8 such characters before the number.
                pat = {"upstream_capex_per_boe": r"averaged.{0,8}30\.2 \(\$8\.0\) per boe produced \(2024:.{0,8}31\.1 \(\$8\.3\)\)",
                       "lifting_cost_per_boe": r"lifting costs in 2025 were.{0,8}13\.16 \(\$3\.51\) per boe produced \(2024:.{0,8}13\.24 \(\$3\.53\)\)",
                       "downstream_crude_utilization": r"largest customer of the upstream crude oil production, utilizing 53% \(2024: 53%\)"}[metric]
                ok = re.search(pat, raw[page - 1]) is not None
            src_detail.append({"metric": metric, "pdf_page": page, "printed_2025": p25, "printed_2024": p24, "found": ok})
            # 2. same definition as the engine's existing FY2025 row: that row's value equals the printed 2025 cell.
            dims = json.dumps({"segment": seg}, separators=(",", ":")) if seg else "{}"
            cur25 = db.execute("SELECT value_decimal,unit,scope,dimensions_json FROM data_points WHERE company_id=? AND "
                               "metric_key=? AND period_kind='fy' AND period_end='2025-12-31' AND is_current=1",
                               (CID, metric)).fetchall()
            want25 = num(p25) * scale
            eng_ok = len(cur25) == 1 and Decimal(cur25[0]["value_decimal"]) == want25 and cur25[0]["unit"] == unit
            eng_detail.append({"metric": metric, "engine_fy2025": [dict(r) for r in cur25], "printed_fy2025_scaled": str(want25), "match": eng_ok})
            # 3. no existing row for the new identity (any version, current or not).
            dup = db.execute("SELECT id,version,is_current,value_decimal FROM data_points WHERE company_id=? AND metric_key=? "
                             "AND period_kind='fy' AND period_end='2024-12-31'", (CID, metric)).fetchall()
            dup_detail.append({"metric": metric, "existing_fy2024_rows": [dict(r) for r in dup]})
            # 4. metric contract: fy allowed; segment dimension allowed when used.
            mc = db.execute("SELECT allowed_period_kinds_json,allowed_dimensions_json,unit_family FROM metric_contracts WHERE metric_key=?",
                            (metric,)).fetchone()
            c_ok = bool(mc) and "fy" in json.loads(mc["allowed_period_kinds_json"]) and (
                not seg or "segment" in json.loads(mc["allowed_dimensions_json"]))
            contract_detail.append({"metric": metric, "contract": dict(mc) if mc else None, "ok": c_ok})

            v = num(value)
            fact = {"metric": metric, "value": int(v) if v == v.to_integral_value() and scale > 1 else float(v),
                    "currency": cur, "unit": unit, "period_start": "2024-01-01", "period_end": "2024-12-31",
                    "period_kind": "fy", "fiscal_year": 2024, "page": page, "table": table, "row": label,
                    "cell": f"2024 column: {p24}"}
            if scale > 1:
                fact["scale"] = scale
            if seg:
                fact.update(scope="segment", dimensions={"segment": seg})
            facts.append(fact)
            identities.append({"company_id": CID, "metric_key": metric, "period_kind": "fy", "period_start": "2024-01-01",
                               "period_end": "2024-12-31", "fiscal_year": 2024, "scope": "segment" if seg else "consolidated",
                               "dimensions": {"segment": seg} if seg else {}, "currency": cur, "unit": unit,
                               "value": str(v * scale), "source_document_sha256": ARA_SHA, "source_url": ARA_URL,
                               "pdf_page": page, "printed_row": label, "printed_2024": p24,
                               "edition": "ARA2025 comparative (FY2024 as presented in the 2025 annual report)",
                               "source_review": "PENDING", "financial_qualification": "WITHHELD", "rights": "UNKNOWN_NO_GRANT"})
        check("source_cells_on_cited_pages", all(x["found"] for x in src_detail), src_detail)
        check("same_line_as_existing_fy2025_engine_rows", all(x["match"] for x in eng_detail), eng_detail)
        check("no_duplicate_fy2024_identity_in_engine", all(not x["existing_fy2024_rows"] for x in dup_detail), dup_detail)
        check("metric_contracts_allow_fy_and_segment", all(x["ok"] for x in contract_detail), contract_detail)

        # 5. arithmetic cross-checks against figures printed elsewhere and existing engine rows.
        by = {f["metric"]: num(r[2]) for f, r in zip(facts, ROWS)}
        note4 = layout[195]
        cons_ok = re.search(r"Capital expenditures - cash basis\s+147,135\s+38,989\s+2,766\s+–\s+188,890", note4) is not None
        sum_ok = by["upstream_capex"] + by["downstream_capex"] + by["corporate_capex"] == Decimal(188890)
        check("segment_capex_2024_sums_to_consolidated_note4", cons_ok and sum_ok,
              {"note4_line_found": cons_ok, "sum": str(by["upstream_capex"] + by["downstream_capex"] + by["corporate_capex"]), "consolidated": "188,890"})
        ebit24 = {m: Decimal(db.execute("SELECT value_decimal FROM data_points WHERE company_id=? AND metric_key=? AND "
                                       "period_kind='fy' AND period_end='2024-12-31' AND is_current=1", (CID, m)).fetchone()[0]) / 10**6
                  for m in ("upstream_ebit", "downstream_ebit", "corporate_ebit")}
        adj = {"upstream": Decimal(0), "downstream": Decimal(19857), "corporate": Decimal(34)}  # adjusting items 2024, PDF 52/58/66
        adj_ok = {s: ebit24[f"{s}_ebit"] + adj[s] == by[f"{s}_adjusted_ebit"] for s in adj}
        adj_lines = {"downstream": re.search(r"Adjusting items1\s+47,162\s+19,857", layout[57]) is not None,
                     "corporate": re.search(r"Adjusting items1\s+421\s+34", layout[65]) is not None,
                     "upstream": re.search(r"Adjusting items1\s+1,088\s+–", layout[51]) is not None}
        check("adjusted_ebit_2024_equals_engine_ebit_plus_printed_adjusting_items", all(adj_ok.values()) and all(adj_lines.values()),
              {"engine_ebit_2024_millions": {k: str(v) for k, v in ebit24.items()}, "adjusting_items_2024": {k: str(v) for k, v in adj.items()},
               "equal": adj_ok, "adjusting_lines_found": adj_lines})
        # 6. no future facts; no capacity/target fields; units by family.
        check("no_future_periods", all(f["period_end"] <= "2026-03-09" for f in facts), "all FY2024, filed with ARA2025 (2026-03-09)")
        check("no_capacity_or_target_fields", not any(re.search(r"capacity|target|guidance|plan", f["metric"]) for f in facts),
              [f["metric"] for f in facts])

        manifest = {"company_id": CID, "filing_type": "Annual report 2025 comparative (FY2024) - QB3 candidate",
                    "filed_at": "2026-03-09", "filed_at_basis": "same filing date as the engine's ARA2025 manifests",
                    "filed_at_note": f"ARA2025 PDF sha256 {ARA_SHA}; FY2024 comparatives; candidate, source review pending",
                    "period_end": "2024-12-31", "source_url": ARA_URL, "facts": facts}
        (HERE / "QB3-MANIFEST.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
        (HERE / "QB3-IDENTITIES.json").write_text(json.dumps({"schema": "marefa-qb3-identities/1", "state": "CANDIDATE_NOT_INGESTED",
                                                              "count": len(identities), "identities": identities}, ensure_ascii=False, indent=2) + "\n")

        # 7. the engine's own manifest verifier and label/metric mapping.
        probe = subprocess.run([sys.executable, "-c", (
            "import json,sys,shutil,tempfile,pathlib\nfrom finengine.verification import ManifestVerifier\n"
            "from finengine.mapping import canonicalize\nm=json.load(open(sys.argv[1]))\n"
            "d=pathlib.Path(tempfile.mkdtemp());shutil.copy(sys.argv[1],d/'aramco-2024-qb3-segment-comparatives.json')\n"
            "r=ManifestVerifier(d).verify()\nprint(json.dumps({'checks':r['checks'],'passed':r['passed'],'warnings':r['warnings'],"
            "'failures':r['failures'],'unmapped':len(r['unmapped_labels'])},default=str))"),
            str(HERE / "QB3-MANIFEST.json")], cwd=root, env=engine_env(root), capture_output=True, text=True)
        if probe.returncode:
            raise RuntimeError(probe.stderr[-2000:])
        p = json.loads(probe.stdout.strip().splitlines()[-1])
        check("engine_manifest_verifier", not p["failures"] and p["unmapped"] == 0, {k: p[k] for k in ("checks", "passed", "warnings", "failures", "unmapped")})
        known = {r[0] for r in db.execute("SELECT metric_key FROM metric_definitions")}
        check("metric_keys_are_engine_metric_definitions", all(f["metric"] in known for f in facts),
              {f["metric"]: f["metric"] in known for f in facts})

        # 8. coverage: current missing lists from the engine's own contract evaluation on the copy (no write to the original).
        cp = work / "copy.sqlite3"
        shutil.copy2(root / "data/financial.sqlite3", cp)
        subprocess.run([sys.executable, "-c", "import sys\nfrom finengine.database import Database\nDatabase(sys.argv[1]).close()", str(cp)],
                       cwd=root, env=engine_env(root), check=True)
        r = subprocess.run([sys.executable, "-m", "finengine", "--db", str(cp), "factory-contract-readiness", "SA", "2222"],
                           cwd=root, env=engine_env(root), capture_output=True, text=True)
        contract = json.loads(r.stdout[r.stdout.index("{"):])
        cats = {c["category_key"]: c for c in contract["categories"]}
        focus = ("operational_kpis", "sector_specific_fields", "segments")
        missing = {k: {f for v in cats[k]["evidence"]["missing_fields"].values() for f in v} for k in focus}
        new_fields = {f["metric"] for f in facts}
        coverage = {}
        for k in focus:
            e = cats[k]["evidence"]
            filled = sorted(new_fields & missing[k])
            coverage[k] = {"populated": e["populated_fields"], "expected": e["expected_fields"], "score_now": str(cats[k]["score"]),
                           "threshold": str(cats[k]["threshold"]), "batch_fields_that_are_missing_now": filled,
                           "expected_score_after_batch": str(Decimal(e["populated_fields"] + len(filled)) / Decimal(e["expected_fields"]))}
        check("coverage_expectation_computed", True, coverage)

        # 9. availability candidates (unsigned): fields ARA2025 does not disclose, with the evidence of the search.
        searched = "ARA2025 full text (247 pages) searched with pdftotext; only this original is available here"
        cand = []
        def add(field, tier, reason, terms):
            cats_in = [k for k in focus if field in missing[k]]
            cand.append({"field_key": field, "categories": cats_in, "proposed_status": "unavailable", "proposed_reason_code": "not_disclosed",
                         "tier": tier, "reason": reason, "evidence_source_url": ARA_URL, "evidence_document_sha256": ARA_SHA,
                         "evidence_note": f"{searched}; terms: {terms}", "assessed_by": None, "state": "CANDIDATE_PENDING_INDEPENDENT_REVIEW"})
        A = "A_structural_in_segment_note"
        B = "B_not_in_annual_report_check_interims"
        add("segment_assets", A, "Note 4 (PDF 196-197) reports no segment assets; only non-current assets by geography", "Segment assets, Total assets")
        add("segment_liabilities", A, "Note 4 reports no segment liabilities", "segment liabilities")
        add("segment_investments_associates", A, "Investments in JVs and associates are disclosed by entity (Note 7, PDF 200), not by segment; Note 4 shows only share of results (a flow)", "Investments in joint ventures and associates")
        for f, why in [("refined_products_revenue", "Note 24 (PDF 226) discloses only the combined line 'Refined and chemical products'"),
                       ("chemicals_revenue", "Note 24 discloses only the combined line 'Refined and chemical products'"),
                       ("lng_revenue", "no LNG revenue line in Note 24"),
                       ("crude_oil_production", "PDF 52 discloses total liquids only (crude oil, NGL and condensate combined)"),
                       ("condensate_production", "PDF 52 discloses total liquids only"),
                       ("natural_gas_liquids_production", "PDF 52 discloses total liquids only"),
                       ("natural_gas_sales", "sales gas appears only as capacity growth targets and 2030 expectations, not as an actual volume"),
                       ("refinery_throughput", "capacities (gross 7.8, net 4.2 mmbpd) are disclosed, not throughput"),
                       ("refinery_utilization", "no utilization rate of refineries; downstream_crude_utilization (share of crude used) is a different measure"),
                       ("chemicals_production", "only net chemicals production capacity (59.3 mtpa) is disclosed, not production"),
                       ("chemicals_sales", "no chemicals sales volume"),
                       ("average_realized_gas_price", "no realized gas price"),
                       ("average_realized_refined_product_price", "no realized refined product price"),
                       ("lifting_volume", "no lifting volume"),
                       ("production_entitlement", "no entitlement volume (Concession reserves are disclosed, not entitlement production)"),
                       ("finding_development_cost_per_boe", "no F&D cost per boe"),
                       ("reserve_replacement_ratio", "no reserve replacement ratio"),
                       ("spare_capacity", "MSC 12.0 mmbpd is disclosed but crude production is not, so spare capacity is neither printed nor derivable")]:
            add(f, B, why, f)
        definition_decisions = [
            {"field_key": "upstream_operating_income", "issue": "Aramco reports segment EBIT (already in the engine as upstream_ebit); entering it as operating income would duplicate under another definition"},
            {"field_key": "downstream_operating_income", "issue": "as above (downstream_ebit)"},
            {"field_key": "segment_impairment", "issue": "Note 4 prints 'Impairment and held for sale remeasurement losses' combined; footnote 1 shows HFS remeasurement inside Downstream; not the field's definition without a decision"},
        ]
        def projected(k, accepted):
            e = cats[k]["evidence"]
            excl = len([c for c in accepted if k in c["categories"]])
            exp = e["expected_fields"] - excl
            return {"expected_after": exp, "score_if_accepted": str(Decimal(e["populated_fields"]) / Decimal(exp)), "threshold": str(cats[k]["threshold"])}
        (HERE / "QB3-AVAILABILITY-CANDIDATES.json").write_text(json.dumps({
            "schema": "marefa-qb3-availability-candidates/1", "company_id": CID,
            "state": "CANDIDATES_ONLY_NOT_ASSESSMENTS", "note": "assessed_by is empty on purpose: an independent reviewer must check every filing before any of these becomes an engine assessment; they lower the denominator only once accepted",
            "candidates": cand, "definition_decisions_not_candidates": definition_decisions,
            "projected_if_tier_A_accepted": {k: projected(k, [c for c in cand if c["tier"] == A]) for k in focus},
            "projected_if_all_accepted": {k: projected(k, cand) for k in focus},
        }, ensure_ascii=False, indent=2) + "\n")
        check("availability_candidates_unsigned", all(c["assessed_by"] is None for c in cand), f"{len(cand)} candidates")
        db.close()
    finally:
        shutil.rmtree(work, ignore_errors=True)
        after = original_engine_state()
        unchanged = all(after[k] == before[k] for k in ("head", "db_sha256", "db_size", "db_mtime_ns", "porcelain"))
        check("original_engine_unchanged", unchanged, {k: after[k] for k in ("head", "db_sha256")})
    result = {"schema": "marefa-qb3-checks/1", "all_pass": all(c["status"] == "PASS" for c in checks), "checks": checks}
    (HERE / "QB3-CHECKS.json").write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str) + "\n")
    with open(HERE / "qb3-checks.txt", "w") as f:
        for c in checks:
            f.write(f"{c['status']} {c['check']}\n")
        f.write(f"ALL {'PASS' if result['all_pass'] else 'FAIL'}\n")
    print((HERE / "qb3-checks.txt").read_text())
    return 0 if result["all_pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
