"""Build CATEGORY-MATRIX.json and FIELD-REQUIREMENTS.json from the measurement outputs in $OUT.
Inputs: catalog-2222.json, rerun-2222.json (measure_engine.py), site-cells.json (site-cells.ts), plan95.json (plan95.py),
batches.json (batches.py). Writes into the package folder (parent of tools/). Usage: OUT=<dir> python3 build_outputs.py"""
import json, os
O = os.environ["OUT"]
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cat = json.load(open(f"{O}/catalog-2222.json"))
ev = json.load(open(f"{O}/rerun-2222.json"))["eval"]
site = json.load(open(f"{O}/site-cells.json"))
plan = json.load(open(f"{O}/plan95.json"))

# Record sections the site renders as lists, not keyed cells (read from the frozen page payload; see REPORT_AR.md §4).
RECORD_SHOWN = {
    "ownership": ["holder_name", "holder_type", "ownership_percentage"],
    "corporate_actions": ["cash_dividend", "bonus_shares", "capital_increase", "share_buyback", "acquisition"],
    "disclosures": ["financial_results_announcement", "earnings_release", "annual_report", "interim_report", "guidance",
                    "risk_factor", "strategy_update", "material_event"],
    "market_data": ["price_close"],
    "segments": ["crude_oil_revenue", "natural_gas_revenue", "domestic_revenue", "international_revenue"],
}
shown_keys = set(site["shown"]) | set(site["facts"]) | {k for k, v in site["statements"].items() if v["shown"] > 0}
withheld_keys = (set(site["withheld"]) | {k for k, v in site["statements"].items() if v["withheld"] > 0}) - shown_keys

# Pages that render each category today (frozen preview), and what closes the gap. Reviewed text, not computed.
PAGES = {
    "company_profile": ("hero, description, business facts, governance facts", "topics 1-3, 10", "business tab"),
    "financial_statements": ("6 key figures", "topic 5 statements and key figures", "statement explorer FY2021-FY2025, Q1-Q2 2026, H1 2026"),
    "profitability": ("-", "topic 7 (ROACE shown; margins and returns withheld)", "explorer ratio rows (withheld)"),
    "liquidity_solvency": ("-", "topic 7 (withheld)", "explorer (withheld)"),
    "efficiency": ("-", "topic 7 (withheld)", "explorer (withheld)"),
    "growth": ("-", "topic 7 (withheld)", "explorer (withheld)"),
    "per_share": ("dividend per share", "topics 5, 9 (EPS withheld)", "explorer DPS row; EPS withheld"),
    "valuation": ("'not available' block", "topic 15 not available", "market tab: not available"),
    "market_data": ("last close 2026-09-03 (not live)", "topic 12 last close + partial history", "market tab"),
    "dividends": ("DPS and dividends paid; payout and CAGR withheld", "topic 9", "shareholders tab"),
    "segments": ("revenue by product and geography (FY2025)", "topic 2 segment tables", "business tab"),
    "ownership": ("top 4 holder groups (2025-12-31)", "topic 4", "shareholders tab"),
    "corporate_actions": ("latest 4 of 8 actions", "topic 9 action list", "shareholders tab"),
    "announcements": ("latest 5 of 40 documents", "topic 18 (15 of 40 visible)", "risks tab"),
    "operational_kpis": ("7 operating indicators + ESG", "topics 8, 17", "business and risks tabs"),
    "sector_specific_fields": ("segment tables (shared with segments)", "topic 2", "business tab"),
    "calculated_smart_metrics": ("-", "topic 7 CAGRs (withheld)", "explorer (withheld)"),
    "sources_lineage_freshness": ("source links per cell; no freshness state", "proof per cell", "coverage tab: contract only, 'not assessed'"),
}
CLOSE = {
    "company_profile": "Extract governance_profile (15) and industry_context (6) from the archived FY2025 annual report (requires_review); add business_model, investor_contact_email, lei; render the 13 present-but-unrendered profile fields.",
    "financial_statements": "Ingest B02's 142 inputs with immutable engine references; add 10 quarterly periods (Q1 2023-Q4 2025) for gate financial_statements:1; map the 49 missing statement and note lines (zakat, cash equivalents, G&A, interest...); render the 169 present-but-unrendered lines in the explorer.",
    "profitability": "Compute 8 ratios (ROIC, ROCE, gross margin needs cost_of_revenue definition...) from qualified inputs; release withheld ratios only after lineage reproduces inputs.",
    "liquidity_solvency": "Compute 3 coverage ratios; render the 12 present ratios once lineage is reproduced.",
    "efficiency": "Compute 8 turnover/days ratios from inventory, payables and revenue.",
    "growth": "Compute 20 growth series from the qualified quarterly history (needs the 12 quarters).",
    "per_share": "Already 13/13 in the engine; release EPS (quarantined) and render the other 12 per-share fields.",
    "valuation": "6 fields from the dated close (cfo_yield, EV/FCF...); 10 need a price-history or consensus licence (D9).",
    "market_data": "Authorised exchange feed (D9 / rights matrix) for 19 fields and the 5-trading-day freshness gate; no scraping of the excluded Tadawul site.",
    "dividends": "Compute 15 dividend metrics from DPS history and B03's dividend records; special_dividend by reviewed event_not_observed.",
    "segments": "Map the dimensional revenue rows already shown on the site to refined_products_revenue / chemicals_revenue (mapping, not re-extraction); extract segment assets, liabilities, impairment, operating income; commercial-pipeline fields by reviewed not_applicable.",
    "ownership": "Insider, strategic and concentration fields from the annual report (6); foreign/QFI/retail counts need an authorised Tadawul ownership source (6).",
    "corporate_actions": "Bind B03's 11 dividend/bonus/buyback records with announcement ids; event fields that never occurred (stock_split, merger...) by reviewed event_not_observed (12).",
    "announcements": "Add disclosure schema fields (id, date, titles AR/EN, category, flags) to the 15 engine disclosures and B03's 9 documents; trailing-180-day polling.",
    "operational_kpis": "Extract 12 oil and gas KPIs (crude, condensate, NGL production, refinery throughput, realised gas price...) from the annual report and quarterly reports; 3 by reviewed not_disclosed.",
    "sector_specific_fields": "Same 9 segment fields as above (shared group); an approved oil and gas sector pack so gate sector_specific_fields:1 can be evaluated.",
    "calculated_smart_metrics": "Compute Beneish M and 10-year CAGRs once FY2016 audited data and FY2026 results exist; 8 price-based fields need the market feed.",
    "sources_lineage_freshness": "Refresh evidence for the 10 stale categories (gate :2); keep the five-field provenance on every new fact.",
}

pres_all = {g: set(v["present"]) for g, v in cat.items()}
rows = []
for c in ev["categories"]:
    k = c["category_key"]
    e = c["evidence"]
    groups = [g for g in e["field_groups"] if g in cat]
    row = {"category_key": k, "weight": float(c["weight"]), "threshold": float(c["threshold"]),
           "field_groups_contract": e["field_groups"], "field_groups_measured": groups,
           "engine_score": float(c["score"]), "weighted_score": float(c["weighted_score"]), "status": c["status"],
           "hard_gates": [{"id": g["gate_id"], "status": g["status"]} for g in c["hard_gates"]],
           "pages": dict(zip(("overview", "investor", "data"), PAGES[k])), "to_close": CLOSE[k]}
    if k == "sources_lineage_freshness":
        row.update(expected=None, engine_present=None, missing=None, shown=None, withheld=None, present_not_rendered=None,
                   qualified_approved=0, evidence={x: e[x] for x in e if x not in ("field_groups", "sector_pack")})
    else:
        exp = pres = sh = wh = 0; cls = {x: 0 for x in "ABCDH"}
        for g in groups:
            p = pres_all[g]
            s = {f for f in cat[g]["expected"] if f in shown_keys or f in RECORD_SHOWN.get(g, [])} & p
            w = ({f for f in cat[g]["expected"] if f in withheld_keys} & p) - s
            exp += len(cat[g]["expected"]); pres += len(p); sh += len(s); wh += len(w)
            for f in cat[g]["missing"]: cls[plan["fields"][f]["cls"]] += 1
        row.update(expected=exp, engine_present=pres, missing=exp - pres, shown=sh, withheld=wh,
                   present_not_rendered=pres - sh - wh, qualified_approved=0, missing_by_class=cls,
                   site_shown_coverage=sh / exp)
    rows.append(row)

s5 = plan["scenarios"]["S5 A+B+C+10y + D-exclusions(no history reason)"]
needed = set(s5["added"])
batch_of = {"A": None, "B": "A5", "C": "A6", "D": "A7", "H": "A8"}
FS = {"income_statement", "balance_sheet", "cash_flow", "financial_notes"}
def batch(f, v):
    if v["cls"] != "A": return batch_of[v["cls"]]
    g = v["group"]
    if g in FS: return "A1"
    if g in {"segments", "commercial_pipeline", "oil_gas_operations"}: return "A2"
    if g in {"company_model", "governance_profile", "industry_context"}: return "A3"
    return "A4"
cat_of = {}
for r in rows:
    for g in r["field_groups_measured"]: cat_of.setdefault(g, []).append(r["category_key"])
fields = [{"field_key": f, "field_group": v["group"], "categories": cat_of.get(v["group"], []), "class": v["cls"],
           "batch": batch(f, v), "in_minimum_set_for_95": f in needed,
           "route": "reviewed exclusion (after approval)" if v["cls"] == "D" else "populate"}
          for f, v in sorted(plan["fields"].items(), key=lambda x: (x[1]["group"], x[0]))]
meta = {"company_id": "sa:2222", "contract": "engine b70254e config/factory/18-category-contract.json 1.0.0 (sha256 a229596a...)",
        "measured_at": ev.get("checked_at"), "engine_total_score": ev["total_score"], "readiness_state": ev["readiness_state"],
        "sector_pack": ev["sector_pack"], "blocking_reasons": ev["blocking_reasons"],
        "class_legend": {"A": "issuer document or archive (extraction or mapping)", "B": "computed from engine inputs (no network)",
                         "C": "licensed or authorised feed / rights decision", "D": "candidate for a reviewed exclusion under the contract's own rules (needs approval)",
                         "H": "needs FY2016 audited history and FY2026 results (10-year CAGR)"},
        "classification_note": "Classes are a planning classification for review, not a contract decision."}
json.dump({"meta": meta, "categories": rows}, open(f"{HERE}/CATEGORY-MATRIX.json", "w"), ensure_ascii=False, indent=1)
json.dump({"meta": meta, "scenarios": {k: {x: v[x] for x in v if x != "added" and x != "per"} for k, v in plan["scenarios"].items()},
           "batches": json.load(open(f"{O}/batches.json")), "fields": fields},
          open(f"{HERE}/FIELD-REQUIREMENTS.json", "w"), ensure_ascii=False, indent=1)
print("rows", len(rows), "fields", len(fields), "minimum set", len(needed),
      "site-shown weighted", round(sum(r["weight"] * r.get("site_shown_coverage", 0) for r in rows), 2))
