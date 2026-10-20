"""Classify Aramco's remaining factory-contract gaps into treatment groups A-E and sum their points.

A  in sources the engine already archives (annual/interim reports): needs extraction
B  derivable by formula, but an input must first be extracted (the formula itself is no longer the blocker)
C  needs additional reports or older disclosures not yet archived
D  needs a price / events / ownership / estimates / announcements feed
E  does not fit Aramco's business model or reporting; needs a reviewed definition or a
   reviewed not-applicable record (company_field_availability), never a forced value
usage: classify_gaps.py <gap-inventory.json> <copy.sqlite3> <out.json>
"""
import json, sqlite3, sys
from collections import defaultdict
from decimal import Decimal

gap_path, db_path, out_path = sys.argv[1:4]
gap = json.load(open(gap_path))
db = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
filled = {row[0] for row in db.execute(
    "SELECT DISTINCT metric_key FROM data_points WHERE company_id='sa:2222' AND is_current=1")}

E = {
    # Aramco's income statement has no cost-of-sales subtotal (purchases, producing and
    # manufacturing, ... are presented by nature), so gross-profit metrics need a reviewed definition.
    "gross_profit": "no gross profit subtotal in Aramco's statements",
    "cost_of_revenue": "costs presented by nature; no cost of revenue line",
    "gross_margin": "needs gross profit", "gross_profit_qoq": "needs gross profit",
    "gross_profit_growth": "needs gross profit",
    "days_inventory": "needs cost of revenue", "inventory_turnover": "needs cost of revenue",
    "days_payables": "needs cost of revenue", "payables_turnover": "needs cost of revenue",
    "cash_conversion_cycle": "needs days inventory and days payables",
    "general_and_administrative_expense": "reported only as combined selling, administrative and general",
    "selling_and_distribution_expense": "reported only as combined selling, administrative and general",
    "adjusted_ebit": "Aramco reports no adjusted EBIT at group level", "adjusted_ebitda": "no adjusted EBITDA at group level",
    "discontinued_operations_income": "no discontinued operations", "continuing_operations_income": "equals net income; no discontinued operations",
    "capital_increase_proceeds": "no capital increase in the period", "cik": "SEC identifier; not a US registrant",
    "production_entitlement": "entitlement concept applies to PSC operators, not a national concession holder",
    "book_to_bill_ratio": "order-backlog concept, not commodity sales", "sales_order_backlog": "no order backlog",
    "contracted_sales_value": "not disclosed for commodity sales", "contracted_sales_volume": "not disclosed",
    "sales_contract_count": "not disclosed", "contract_renewal_profile": "not disclosed",
    "take_or_pay_commitments": "not disclosed as such", "minimum_volume_commitments": "not disclosed as such",
    "committed_offtake_volume": "not disclosed as such",
    "reverse_split": "event type that has not occurred", "spin_off": "event type that has not occurred",
    "merger": "event type that has not occurred", "delisting": "event type that has not occurred",
    "symbol_change": "event type that has not occurred", "tender_offer": "event type that has not occurred",
    "capital_reduction": "event type that has not occurred", "rights_issue": "event type that has not occurred",
    "rights_offering_date": "event type that has not occurred", "treasury_share_sale": "event type that has not occurred",
    "suspension": "event type that has not occurred",
}
D = {  # feed-based
    **{k: "daily price history (archive has 23 days)" for k in (
        "average_volume_30d", "beta_1y", "beta_5y", "fifty_two_week_high", "fifty_two_week_low", "market_return_1y",
        "market_return_3m", "market_return_3y", "market_return_5y", "market_return_6m", "market_return_ytd",
        "percent_from_52w_high", "percent_from_52w_low", "price_adjusted_close", "volatility_30d",
        "simple_moving_average_50d", "simple_moving_average_200d", "price_to_sma_50d", "price_to_sma_200d",
        "total_return_1y", "total_return_3y", "total_return_5y", "total_return_10y",
        "historical_pe_percentile", "historical_pb_percentile",
        # computed by the existing refresh, but stored outside the market_prices domain the contract reads
        "market_return_1m", "previous_close")},
    "free_float_shares": "Tadawul free-float data", "free_float_market_cap": "Tadawul free-float data",
    **{k: "ownership feed (Tadawul/Edaa holder data)" for k in (
        "foreign_investor_limit", "foreign_ownership", "insider_ownership", "institutional_ownership",
        "institutional_shareholders_count", "major_holder_change", "ownership_concentration", "retail_ownership",
        "retail_shareholders_count", "strategic_ownership", "top_10_shareholder_concentration",
        "top_5_shareholder_concentration")},
    **{k: "estimates provider (licensed)" for k in (
        "ebit_estimate", "ebitda_estimate", "eps_estimate", "net_income_estimate", "revenue_estimate",
        "selling_general_administrative_expense_estimate", "forward_price_to_earnings", "peg_ratio",
        "economic_profit_proxy")},
    **{k: "dividend events + price feed" for k in (
        "dividend_per_share_ttm", "dividend_yield_ttm", "trailing_twelve_month_dividend", "total_dividend_paid_ttm",
        "payout_ratio_ttm", "fcf_payout_ratio_ttm", "forward_dividend_per_share", "forward_dividend_run_rate",
        "dividend_payment_frequency", "dividend_stability_score", "ordinary_dividend", "special_dividend",
        "total_dividend_declared", "dividend_installments_count")},
    **{k: "corporate-action events feed" for k in (
        "dividend_eligibility", "dividend_ex_date", "dividend_payment", "stock_split")},
    "sharia_status": "external Sharia screening provider", "lei": "GLEIF registry lookup",
}
C = {k: "needs earlier annual reports (pre-2019) or 2025 interim reports" for k in (
    "revenue_cagr_10y", "net_income_cagr_10y", "eps_cagr_10y", "free_cash_flow_cagr_10y",
    "operating_cash_flow_cagr_10y", "dividend_cagr_10y", "years_consecutive_dividend_payments",
    "revenue_ttm_growth", "net_income_ttm_growth", "eps_ttm_growth", "ebitda_ttm_growth",
    "free_cash_flow_ttm_growth", "operating_cash_flow_ttm_growth")}
B = {  # formula exists (engine or this batch); one input must be extracted first
    "ebitda_growth": "needs 2024 depreciation & amortization", "eps_cagr_5y": "needs FY2020 diluted EPS",
    "dividend_cagr_5y": "needs FY2020 dividend per share", "book_value_growth": "needs prior-year equity attributable to parent",
    "ebitda_qoq": "needs quarterly EBIT and D&A", "operating_income_qoq": "needs quarterly operating income",
    "eps_qoq": "needs quarterly diluted EPS", "beneish_m_score": "needs a gross-profit definition (E) first",
    "owner_earnings": "needs maintenance-capex definition", "discretionary_cash_flow": "needs reviewed definition",
    "spare_capacity": "maximum_sustainable_capacity - crude production; needs crude production",
    "refinery_utilization": "throughput / capacity; needs refinery throughput",
    "reserve_replacement_ratio": "needs reserve additions", "finding_development_cost_per_boe": "needs F&D cost disclosure",
}
rows, totals = [], defaultdict(lambda: {"entries": 0, "keys": set(), "points": Decimal(0)})
filled_points = Decimal(0)
for entry in gap["missing"]:
    key, points = entry["field_key"], Decimal(entry["points_per_field"])
    if entry["storage_domain"] == "data_points" and key in filled:
        filled_points += points
        continue
    group = next((g for g, table in (("E", E), ("D", D), ("C", C), ("B", B)) if key in table), None)
    if group is None:
        group = "D" if entry["storage_domain"] in ("disclosures",) else "A"
    reason = {"E": E, "D": D, "C": C, "B": B}.get(group, {}).get(key) or (
        "Tadawul announcements feed" if entry["storage_domain"] == "disclosures" else
        "in archived Aramco reports; needs extraction" if entry["storage_domain"] == "data_points" else
        "qualitative fact in archived annual report; needs extraction and evidence")
    rows.append({**entry, "group": group, "reason": reason})
    totals[group]["entries"] += 1
    totals[group]["keys"].add(key)
    totals[group]["points"] += points
summary = {g: {"entries": t["entries"], "keys": len(t["keys"]), "points": str(t["points"].quantize(Decimal("0.01")))}
           for g, t in sorted(totals.items())}
json.dump({"filled_on_copy_points": str(filled_points.quantize(Decimal("0.01"))), "summary": summary, "gaps": rows},
          open(out_path, "w"), indent=2, ensure_ascii=False)
print("filled on copy:", filled_points.quantize(Decimal("0.01")))
for g, s in summary.items():
    print(g, s)
by_cat = defaultdict(lambda: defaultdict(Decimal))
for row in rows:
    by_cat[row["category"]][row["group"]] += Decimal(row["points_per_field"])
for cat, groups in by_cat.items():
    print(f"{cat:26s}", {g: str(v.quantize(Decimal('0.01'))) for g, v in sorted(groups.items())})
