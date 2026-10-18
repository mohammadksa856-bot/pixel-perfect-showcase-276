"""Generate COMPARABILITY-RECIPES.json (B06-0 R02). Synthetic examples only; expected results computed
by this script's evaluator and re-checked by an independent TypeScript evaluator in checks/."""
import json, re, sys

SY = "SYNTHETIC: invented test values, not company data"

def base_meta(**kw):
    m = {
        "company": "SYNTH-A",
        "accounting_basis": "IFRS",
        "currency": "USD",
        "period": {"kind": "FY", "end": "2030-12-31", "standalone": True},
        "consolidation": "consolidated",
        "restated_latest": True,
        "source_ids": ["SYNTH-SRC-1"],
        "definition_version": "synthetic/1",
        "input_status": "SYNTHETIC",
    }
    for k, v in kw.items():
        m[k] = v
    return m

GENERIC = [
    {"code": "source_missing", "when": {"op": "empty", "path": "meta.source_ids"}, "reason": "No source identifier for the cell."},
    {"code": "accounting_basis_unknown", "when": {"op": "not_in", "path": "meta.accounting_basis", "values": ["IFRS", "US_GAAP"]}, "reason": "Basis must be IFRS or US_GAAP."},
    {"code": "consolidation_not_group", "when": {"op": "neq", "path": "meta.consolidation", "value": "consolidated"}, "reason": "Only consolidated group figures."},
    {"code": "period_end_missing", "when": {"op": "missing", "path": "meta.period.end"}, "reason": "Period end required."},
    {"code": "period_kind_not_allowed", "when": {"op": "not_in_recipe", "path": "meta.period.kind", "recipe_key": "allowed_period_kinds"}, "reason": "Period kind not allowed for this metric."},
    {"code": "quarter_not_standalone", "when": {"op": "and", "args": [{"op": "eq", "path": "meta.period.kind", "value": "Q"}, {"op": "neq", "path": "meta.period.standalone", "value": True}]}, "reason": "A quarter must be published stand-alone, not derived."},
    {"code": "not_latest_restated", "when": {"op": "neq", "path": "meta.restated_latest", "value": True}, "reason": "Latest restated comparatives required; vintage recorded."},
    {"code": "fx_missing", "when": {"op": "and", "args": [{"op": "monetary"}, {"op": "neq", "path": "meta.currency", "value": "USD"}, {"op": "missing", "path": "meta.fx.rate"}]}, "reason": "Non-USD monetary cell needs an FX rate (units per USD)."},
    {"code": "fx_source_missing", "when": {"op": "and", "args": [{"op": "monetary"}, {"op": "neq", "path": "meta.currency", "value": "USD"}, {"op": "missing", "path": "meta.fx.source_id"}]}, "reason": "FX rate needs a source identifier and date."},
    {"code": "fx_rate_type_mismatch", "when": {"op": "fx_type_mismatch"}, "reason": "Flows at period-average rate, stocks at closing rate (IAS 21 convention)."},
]

def recipe(id, key, name, rating, measure, kinds, scope, definition, inputs_doc, steps, gaap, basis, handling, specific, outputs, examples, notes=""):
    return dict(id=id, key=key, name=name, proposed_rating=rating, measure_type=measure,
                allowed_period_kinds=kinds, scope=scope, definition=definition, inputs=inputs_doc,
                ordered_steps=steps, ifrs_vs_us_gaap=gaap, basis=basis, handling=handling,
                failure_conditions=specific, outputs=outputs, examples=examples, notes=notes)

def ex(label, meta, items, expect_status, expect_reason=None, policy=None):
    e = {"label": label, "synthetic": SY, "meta": meta, "items": items, "expected": {"status": expect_status}}
    if expect_reason:
        e["expected"]["reason"] = expect_reason
    if policy:
        e["policy"] = policy
    return e

R = []
COND = "CONDITIONALLY_COMPARABLE"
NC = "NOT_COMPARABLE"

# M01 Revenue
R.append(recipe("M01", "revenue", "Revenue net of royalties and excise", COND, "flow", ["FY", "H1", "Q", "TTM"],
  "Tier A/B candidates and Aramco; consolidated group",
  {"numerator": "Revenue from contracts with customers and other operating revenue, net of royalties and excise taxes presented within revenue", "denominator": None},
  [{"item": "revenue", "role": "reported revenue line"}, {"item": "royalties_excise_in_revenue", "role": "royalties and excise taxes included in reported revenue (gross presenters only)"}],
  ["Read reported revenue at the group level for the period.",
   "Read the issuer's presentation of royalties and excise (meta.royalty_presentation).",
   "If gross presentation, subtract royalties and excise included in revenue.",
   "Record trading revenue basis (gross/net); unknown basis fails.",
   "Convert to USD at the period-average rate when the currency is not USD."],
  "No framework-specific line difference; the presentation of royalties/excise and trading revenue differs by issuer, not by framework.",
  {"consolidation": "consolidated group", "currency": "USD; SAR at period-average rate", "unit": "currency", "period": "FY/H1/stand-alone Q/TTM of four stand-alone quarters"},
  {"missing_values": "Any required item missing -> NOT_COMPARABLE (required_item_missing).", "restatements": "Use latest restated comparative; record the filing vintage.", "definition_conflict": "Unknown royalty or trading presentation -> NOT_COMPARABLE."},
  [{"code": "royalty_presentation_unknown", "when": {"op": "not_in", "path": "meta.royalty_presentation", "values": ["gross", "net"]}, "reason": "Royalty/excise presentation must be disclosed."},
   {"code": "trading_revenue_basis_unknown", "when": {"op": "missing", "path": "meta.trading_revenue_basis"}, "reason": "Trading revenue gross/net basis must be disclosed."}],
  [{"key": "revenue_net", "selector": ["meta.royalty_presentation"], "cases": {"gross": "revenue - royalties_excise_in_revenue", "net": "revenue"}}],
  [ex("pass_sar_gross", base_meta(currency="SAR", fx={"rate": 4, "rate_type": "period_average", "source_id": "SYNTH-FX"}, royalty_presentation="gross", trading_revenue_basis="gross"), {"revenue": 1000, "royalties_excise_in_revenue": 200}, COND),
   ex("fail_royalty_unknown", base_meta(trading_revenue_basis="gross"), {"revenue": 1000}, NC, "royalty_presentation_unknown")]))

# M02 EBIT / EBITDA
R.append(recipe("M02", "ebit_ebitda", "EBIT and EBITDA, normalised", COND, "flow", ["FY", "H1", "Q", "TTM"],
  "Tier A/B candidates and Aramco; consolidated group",
  {"numerator": "Operating profit before finance costs and income taxes, excluding impairments and impairment reversals, with downstream inventory at replacement cost; EBITDA adds depreciation, depletion and amortisation; leases aligned to the IFRS 16 presentation", "denominator": None},
  [{"item": "operating_profit", "role": "reported operating profit / income before finance costs and tax"},
   {"item": "impairment_losses", "role": "impairment losses recognised in operating profit"},
   {"item": "impairment_reversals", "role": "impairment reversals recognised (IFRS only)"},
   {"item": "inventory_holding_gain", "role": "inventory holding gain (+) or loss (-) disclosed by IFRS/FIFO reporters (CCS/RC adjustment)"},
   {"item": "lifo_liquidation_gain", "role": "LIFO layer liquidation effect (US GAAP LIFO reporters)"},
   {"item": "dda", "role": "depreciation, depletion and amortisation including right-of-use depreciation"},
   {"item": "operating_lease_cost", "role": "ASC 842 operating lease cost (US GAAP)"},
   {"item": "operating_lease_interest_component", "role": "interest-equivalent portion of ASC 842 operating lease cost (US GAAP), only if disclosed"}],
  ["Start from reported operating profit.",
   "Add back impairment losses; subtract impairment reversals (IFRS).",
   "Inventory: IFRS/FIFO reporters subtract the disclosed holding gain; US GAAP LIFO reporters subtract any LIFO liquidation gain; FIFO without disclosure fails.",
   "EBIT lease alignment (US GAAP): add back the interest-equivalent component of operating lease cost; if not disclosed, EBIT fails.",
   "EBITDA: add DD&A (IFRS includes right-of-use depreciation); US GAAP adds DD&A plus the full ASC 842 operating lease cost.",
   "Exploration: full-cost reporters fail; successful-efforts and IFRS 6 policies are recorded as metadata.",
   "Royalties classified as income tax fail; royalty cost inside operating costs is kept.",
   "Company 'adjusted' measures are not used (see M04).",
   "Convert at the period-average rate."],
  "IAS 36 permits impairment reversal, US GAAP does not; IAS 2 prohibits LIFO; IFRS 16 single lessee model vs ASC 842 operating lease cost in operating expenses; IFRS 6 policy continuity vs successful efforts / full cost (Reg S-X 4-10).",
  {"consolidation": "consolidated group", "currency": "USD; SAR at period-average rate", "unit": "currency", "period": "FY/H1/stand-alone Q/TTM"},
  {"missing_values": "Required item for the selected case missing -> NOT_COMPARABLE; a disclosed zero is a value, an absent line is missing.", "restatements": "Latest restated comparative only.", "definition_conflict": "Operating profit definition including finance income must be recorded; inconsistent definition -> NOT_COMPARABLE."},
  [{"code": "full_cost_method", "when": {"op": "eq", "path": "meta.e_and_e_method", "value": "full_cost"}, "reason": "Full-cost capitalisation not reconcilable to successful efforts without well-level data."},
   {"code": "e_and_e_method_unknown", "when": {"op": "missing", "path": "meta.e_and_e_method"}, "reason": "Exploration accounting method must be recorded."},
   {"code": "royalty_as_income_tax", "when": {"op": "eq", "path": "meta.royalty_classification", "value": "income_tax"}, "reason": "Royalty classified as income tax distorts EBIT."},
   {"code": "operating_profit_includes_finance_income_unrecorded", "when": {"op": "missing", "path": "meta.operating_profit_definition"}, "reason": "Operating profit definition must be recorded."}],
  [{"key": "ebit_norm", "selector": ["meta.accounting_basis", "meta.inventory_method"], "cases": {
      "IFRS|replacement_cost_disclosed": "operating_profit + impairment_losses - impairment_reversals - inventory_holding_gain",
      "US_GAAP|LIFO": "operating_profit + impairment_losses - lifo_liquidation_gain + operating_lease_interest_component"}},
   {"key": "ebitda_norm", "selector": ["meta.accounting_basis", "meta.inventory_method"], "cases": {
      "IFRS|replacement_cost_disclosed": "operating_profit + impairment_losses - impairment_reversals - inventory_holding_gain + dda",
      "US_GAAP|LIFO": "operating_profit + impairment_losses - lifo_liquidation_gain + dda + operating_lease_cost"}}],
  [ex("pass_us_gaap_lifo", base_meta(accounting_basis="US_GAAP", inventory_method="LIFO", e_and_e_method="successful_efforts", royalty_classification="operating_cost", operating_profit_definition="before_finance_costs_and_tax"),
      {"operating_profit": 500, "impairment_losses": 40, "lifo_liquidation_gain": 10, "operating_lease_interest_component": 5, "dda": 120, "operating_lease_cost": 30}, COND),
   ex("fail_ifrs_fifo_no_holding_gain", base_meta(inventory_method="FIFO", e_and_e_method="ifrs6_successful_efforts_like", royalty_classification="operating_cost", operating_profit_definition="before_finance_costs_and_tax"),
      {"operating_profit": 500, "impairment_losses": 40, "impairment_reversals": 0, "dda": 120}, NC, "no_recipe_for_case")]))

# M03 Net income
R.append(recipe("M03", "net_income", "Net income attributable to parent, normalised", COND, "flow", ["FY", "H1", "Q", "TTM"],
  "Tier A/B candidates and Aramco",
  {"numerator": "Profit attributable to owners of the parent, after tax, excluding after-tax impairment reversals (IFRS) and after-tax inventory holding effects (IFRS/FIFO)", "denominator": None},
  [{"item": "profit_attributable_to_parent", "role": "reported"}, {"item": "impairment_reversals_after_tax", "role": "IFRS"}, {"item": "inventory_holding_gain_after_tax", "role": "IFRS/FIFO reporters"}, {"item": "lifo_liquidation_gain_after_tax", "role": "US GAAP LIFO"}],
  ["Read profit attributable to parent (not total profit).", "IFRS: subtract after-tax impairment reversals and after-tax holding gain.", "US GAAP LIFO: subtract after-tax LIFO liquidation gain.", "Government take is disclosed, not adjusted.", "Convert at period-average rate."],
  "Impairment reversal and inventory method as in M02; non-controlling interests excluded on both frameworks.",
  {"consolidation": "consolidated group, parent share", "currency": "USD; SAR at period-average rate", "unit": "currency", "period": "FY/H1/stand-alone Q/TTM"},
  {"missing_values": "After-tax effects not disclosed -> NOT_COMPARABLE (no tax-rate assumption).", "restatements": "Latest restated.", "definition_conflict": "Total profit instead of parent share -> NOT_COMPARABLE."},
  [{"code": "parent_share_not_identified", "when": {"op": "neq", "path": "meta.profit_scope", "value": "attributable_to_parent"}, "reason": "Parent-share profit required."}],
  [{"key": "net_income_norm", "selector": ["meta.accounting_basis", "meta.inventory_method"], "cases": {
      "IFRS|replacement_cost_disclosed": "profit_attributable_to_parent - impairment_reversals_after_tax - inventory_holding_gain_after_tax",
      "US_GAAP|LIFO": "profit_attributable_to_parent - lifo_liquidation_gain_after_tax"}}],
  [ex("pass_ifrs", base_meta(inventory_method="replacement_cost_disclosed", profit_scope="attributable_to_parent"), {"profit_attributable_to_parent": 300, "impairment_reversals_after_tax": 20, "inventory_holding_gain_after_tax": -10}, COND),
   ex("fail_total_profit", base_meta(inventory_method="replacement_cost_disclosed", profit_scope="total"), {"profit_attributable_to_parent": 300, "impairment_reversals_after_tax": 0, "inventory_holding_gain_after_tax": 0}, NC, "parent_share_not_identified")]))

# M04 Company adjusted earnings
R.append(recipe("M04", "company_adjusted_earnings", "Company-defined adjusted earnings (as reported)", NC, "flow", ["FY", "H1", "Q", "TTM"],
  "All", {"numerator": "Issuer-defined non-GAAP/APM earnings (e.g. adjusted earnings, underlying RC profit, adjusted net income, earnings excluding identified items)", "denominator": None},
  [{"item": "company_adjusted_earnings", "role": "issuer APM"}],
  ["Not reconciled: issuer definitions, thresholds and FX treatment differ.", "Use M02/M03, rebuilt from IFRS/US GAAP lines, instead."],
  "APMs are outside both frameworks.", {"consolidation": "n/a", "currency": "n/a", "unit": "n/a", "period": "n/a"},
  {"missing_values": "n/a", "restatements": "n/a", "definition_conflict": "Always a conflict across issuers."},
  [{"code": "issuer_defined_measure", "when": {"op": "always"}, "reason": "Issuer-defined adjustments are not comparable across companies."}],
  [], [ex("fail_any", base_meta(), {"company_adjusted_earnings": 100}, NC, "issuer_defined_measure")], notes="not_reconcilable"))

# M05 CFO
R.append(recipe("M05", "cfo", "Cash flow from operations, normalised", COND, "flow", ["FY", "H1", "Q", "TTM"],
  "Tier A/B candidates and Aramco",
  {"numerator": "Net cash from operating activities with lease payments treated as operating and interest paid treated as operating on both frameworks", "denominator": None},
  [{"item": "cfo", "role": "reported net cash from operating activities"}, {"item": "lease_principal_payments", "role": "IFRS 16 lease principal in financing"}, {"item": "interest_paid", "role": "interest paid when classified in financing (IFRS option)"}, {"item": "finance_lease_principal_payments", "role": "US GAAP finance lease principal"}],
  ["Read reported CFO.", "IFRS: subtract lease principal payments (moves leases to operating as ASC 842 operating leases).", "IFRS with interest paid in financing: also subtract interest paid.", "US GAAP: subtract finance lease principal payments.", "Dividends received classification must be recorded; unknown fails.", "Convert at period-average rate."],
  "IAS 7 permits interest/dividend classification choices; ASC 230 fixes interest paid in operating; IFRS 16 vs ASC 842 lease cash flows.",
  {"consolidation": "consolidated group", "currency": "USD; SAR at period-average rate", "unit": "currency", "period": "FY/H1/stand-alone Q/TTM"},
  {"missing_values": "Lease or interest line required by the case missing -> NOT_COMPARABLE.", "restatements": "Latest restated.", "definition_conflict": "Zakat/tax timing recorded as metadata; not adjusted."},
  [{"code": "dividends_received_classification_unknown", "when": {"op": "missing", "path": "meta.dividends_received_classification"}, "reason": "Classification of dividends received must be recorded."}],
  [{"key": "cfo_norm", "selector": ["meta.accounting_basis", "meta.interest_paid_classification"], "cases": {
      "IFRS|operating": "cfo - lease_principal_payments",
      "IFRS|financing": "cfo - lease_principal_payments - interest_paid",
      "US_GAAP|operating": "cfo - finance_lease_principal_payments"}}],
  [ex("pass_ifrs_financing", base_meta(interest_paid_classification="financing", dividends_received_classification="operating"), {"cfo": 800, "lease_principal_payments": 50, "interest_paid": 30}, COND),
   ex("fail_dividend_class_unknown", base_meta(interest_paid_classification="operating"), {"cfo": 800, "lease_principal_payments": 50}, NC, "dividends_received_classification_unknown")]))

# M06 Capex
R.append(recipe("M06", "capex", "Capital expenditure, cash basis", COND, "flow", ["FY", "H1", "Q", "TTM"],
  "Tier A/B candidates and Aramco",
  {"numerator": "Cash payments for property, plant and equipment and for capitalised exploration/intangible assets; excludes acquisitions of businesses and investments in associates/joint ventures", "denominator": None},
  [{"item": "payments_for_ppe", "role": "investing cash flow"}, {"item": "payments_for_exploration_intangibles", "role": "investing cash flow, zero only if disclosed as zero"}],
  ["Read cash payments for PP&E and capitalised exploration/intangibles.", "Do not use issuer 'capex' definitions that include acquisitions or equity investments.", "If the line combines acquisitions with PP&E, fail.", "Convert at period-average rate."],
  "Capitalised exploration differs with the E&E policy (IFRS 6 vs successful efforts); full-cost reporters fail as in M02.",
  {"consolidation": "consolidated group", "currency": "USD; SAR at period-average rate", "unit": "currency", "period": "FY/H1/stand-alone Q/TTM"},
  {"missing_values": "Missing line -> NOT_COMPARABLE.", "restatements": "Latest restated.", "definition_conflict": "Combined acquisition line -> NOT_COMPARABLE."},
  [{"code": "capex_line_includes_acquisitions", "when": {"op": "eq", "path": "meta.capex_line_includes_acquisitions", "value": True}, "reason": "Acquisitions must be separable."},
   {"code": "full_cost_method", "when": {"op": "eq", "path": "meta.e_and_e_method", "value": "full_cost"}, "reason": "Full-cost capitalisation not reconcilable."}],
  [{"key": "capex_cash", "selector": [], "cases": {"": "payments_for_ppe + payments_for_exploration_intangibles"}}],
  [ex("pass", base_meta(capex_line_includes_acquisitions=False, e_and_e_method="successful_efforts"), {"payments_for_ppe": 400, "payments_for_exploration_intangibles": 20}, COND),
   ex("fail_combined_line", base_meta(capex_line_includes_acquisitions=True, e_and_e_method="successful_efforts"), {"payments_for_ppe": 400, "payments_for_exploration_intangibles": 20}, NC, "capex_line_includes_acquisitions")]))

# M07 FCF
R.append(recipe("M07", "fcf", "Free cash flow, rebuilt", COND, "flow", ["FY", "H1", "Q", "TTM"],
  "Tier A/B candidates and Aramco",
  {"numerator": "M05 normalised CFO minus M06 cash capex; issuer-reported FCF is not used", "denominator": None},
  [{"item": "cfo", "role": "M05"}, {"item": "lease_principal_payments", "role": "M05"}, {"item": "interest_paid", "role": "M05"}, {"item": "finance_lease_principal_payments", "role": "M05"}, {"item": "payments_for_ppe", "role": "M06"}, {"item": "payments_for_exploration_intangibles", "role": "M06"}],
  ["Apply M05 to obtain normalised CFO.", "Apply M06 to obtain cash capex.", "FCF = normalised CFO - cash capex.", "Acquisitions, divestments and equity investments are excluded and shown separately.", "Convert at period-average rate."],
  "Inherits M05 and M06.", {"consolidation": "consolidated group", "currency": "USD; SAR at period-average rate", "unit": "currency", "period": "FY/H1/stand-alone Q/TTM"},
  {"missing_values": "Any M05/M06 failure -> NOT_COMPARABLE with that code.", "restatements": "Latest restated.", "definition_conflict": "Issuer FCF definitions (e.g. CFO minus capex as defined by the issuer) are recorded, not used."},
  [{"code": "dividends_received_classification_unknown", "when": {"op": "missing", "path": "meta.dividends_received_classification"}, "reason": "Inherited from M05."},
   {"code": "capex_line_includes_acquisitions", "when": {"op": "eq", "path": "meta.capex_line_includes_acquisitions", "value": True}, "reason": "Inherited from M06."},
   {"code": "full_cost_method", "when": {"op": "eq", "path": "meta.e_and_e_method", "value": "full_cost"}, "reason": "Inherited from M06."}],
  [{"key": "fcf_rebuilt", "selector": ["meta.accounting_basis", "meta.interest_paid_classification"], "cases": {
      "IFRS|operating": "cfo - lease_principal_payments - payments_for_ppe - payments_for_exploration_intangibles",
      "IFRS|financing": "cfo - lease_principal_payments - interest_paid - payments_for_ppe - payments_for_exploration_intangibles",
      "US_GAAP|operating": "cfo - finance_lease_principal_payments - payments_for_ppe - payments_for_exploration_intangibles"}}],
  [ex("pass_us_gaap", base_meta(accounting_basis="US_GAAP", interest_paid_classification="operating", dividends_received_classification="operating", capex_line_includes_acquisitions=False, e_and_e_method="successful_efforts"), {"cfo": 900, "finance_lease_principal_payments": 10, "payments_for_ppe": 400, "payments_for_exploration_intangibles": 0}, COND),
   ex("fail_missing_lease_line", base_meta(interest_paid_classification="operating", dividends_received_classification="operating", capex_line_includes_acquisitions=False, e_and_e_method="successful_efforts"), {"cfo": 900, "payments_for_ppe": 400, "payments_for_exploration_intangibles": 0}, NC, "required_item_missing")]))

# M08 Net debt / gearing
R.append(recipe("M08", "net_debt_gearing", "Net debt and gearing", COND, "stock", ["FY", "H1", "Q"],
  "Tier A/B candidates and Aramco",
  {"numerator": "Net debt = borrowings + all lease liabilities - cash and cash equivalents (other investments not deducted)", "denominator": "Gearing denominator = net debt + total equity (including non-controlling interests)"},
  [{"item": "borrowings", "role": "current + non-current borrowings excluding leases"}, {"item": "lease_liabilities", "role": "IFRS 16 lease liabilities"}, {"item": "finance_lease_liabilities", "role": "US GAAP"}, {"item": "operating_lease_liabilities", "role": "US GAAP"}, {"item": "cash_and_equivalents", "role": "cash and cash equivalents only"}, {"item": "total_equity", "role": "including NCI"}],
  ["Read balances at period end.", "Include all lease liabilities on both frameworks.", "Deduct cash and cash equivalents only; issuer-specific netting of investments (e.g. Aramco 'certain investments') is not applied.", "Hybrid instruments: classification must be recorded; unknown fails.", "Convert balances at the closing rate.", "Gearing = net debt / (net debt + total equity)."],
  "ASC 842 operating lease liabilities are on balance sheet but outside debt in issuer measures; included here for parity with IFRS 16.",
  {"consolidation": "consolidated group", "currency": "USD; SAR at closing rate", "unit": "currency; gearing dimensionless", "period": "period-end balance"},
  {"missing_values": "Missing lease or cash line -> NOT_COMPARABLE.", "restatements": "Latest restated balance.", "definition_conflict": "Issuer gearing definitions recorded, not used."},
  [{"code": "hybrid_classification_unknown", "when": {"op": "and", "args": [{"op": "eq", "path": "meta.has_hybrids", "value": True}, {"op": "missing", "path": "meta.hybrid_classification"}]}, "reason": "Hybrid debt/equity classification must be recorded."}],
  [{"key": "net_debt", "selector": ["meta.accounting_basis"], "cases": {"IFRS": "borrowings + lease_liabilities - cash_and_equivalents", "US_GAAP": "borrowings + finance_lease_liabilities + operating_lease_liabilities - cash_and_equivalents"}},
   {"key": "gearing", "ratio": True, "selector": ["meta.accounting_basis"], "cases": {"IFRS": "(borrowings + lease_liabilities - cash_and_equivalents) / (borrowings + lease_liabilities - cash_and_equivalents + total_equity)", "US_GAAP": "(borrowings + finance_lease_liabilities + operating_lease_liabilities - cash_and_equivalents) / (borrowings + finance_lease_liabilities + operating_lease_liabilities - cash_and_equivalents + total_equity)"}}],
  [ex("pass_sar_closing", base_meta(currency="SAR", fx={"rate": 4, "rate_type": "closing", "source_id": "SYNTH-FX"}, has_hybrids=False), {"borrowings": 400, "lease_liabilities": 100, "cash_and_equivalents": 300, "total_equity": 1800}, COND),
   ex("fail_average_rate_for_stock", base_meta(currency="SAR", fx={"rate": 4, "rate_type": "period_average", "source_id": "SYNTH-FX"}, has_hybrids=False), {"borrowings": 400, "lease_liabilities": 100, "cash_and_equivalents": 300, "total_equity": 1800}, NC, "fx_rate_type_mismatch")]))

# M09 ROACE / ROCE
R.append(recipe("M09", "roace", "Return on average capital employed, single formula", COND, "ratio", ["FY", "TTM"],
  "Tier A/B candidates and Aramco",
  {"numerator": "Total profit (incl. NCI) + finance costs - disclosed tax effect of finance costs", "denominator": "Average of opening and closing (total equity + borrowings + lease liabilities)"},
  [{"item": "profit_total", "role": "profit for the period incl. NCI"}, {"item": "finance_costs", "role": "finance costs"}, {"item": "finance_costs_tax_effect", "role": "disclosed tax effect; no assumed rate"}, {"item": "equity_open", "role": ""}, {"item": "equity_close", "role": ""}, {"item": "borrowings_open", "role": "incl. lease liabilities"}, {"item": "borrowings_close", "role": "incl. lease liabilities"}],
  ["Numerator: total profit + finance costs - disclosed tax effect of finance costs.", "If the tax effect is not disclosed, fail (no statutory-rate assumption).", "Denominator: simple average of opening and closing capital employed.", "Issuer ROACE/ROCE are recorded, not used.", "Ratio; inputs in one currency per company."],
  "Lease liabilities included on both frameworks; impairment reversal differences flow through profit (see M03).",
  {"consolidation": "consolidated group", "currency": "dimensionless", "unit": "ratio", "period": "FY or TTM; balances at both ends of the period"},
  {"missing_values": "Opening balance missing -> NOT_COMPARABLE.", "restatements": "Restated opening balances used.", "definition_conflict": "Equity-accounted capital inclusion recorded; issuer formulas not mixed."},
  [{"code": "capital_employed_scope_unrecorded", "when": {"op": "missing", "path": "meta.capital_employed_scope"}, "reason": "Whether equity-accounted investments are inside capital employed must be recorded."}],
  [{"key": "roace", "ratio": True, "selector": [], "cases": {"": "(profit_total + finance_costs - finance_costs_tax_effect) / ((equity_open + borrowings_open + equity_close + borrowings_close) / 2)"}}],
  [ex("pass", base_meta(capital_employed_scope="total_equity_plus_borrowings_incl_leases"), {"profit_total": 200, "finance_costs": 50, "finance_costs_tax_effect": 10, "equity_open": 900, "borrowings_open": 300, "equity_close": 1100, "borrowings_close": 300}, COND),
   ex("fail_no_tax_effect", base_meta(capital_employed_scope="total_equity_plus_borrowings_incl_leases"), {"profit_total": 200, "finance_costs": 50, "equity_open": 900, "borrowings_open": 300, "equity_close": 1100, "borrowings_close": 300}, NC, "required_item_missing")]))

# M10 Dividends
R.append(recipe("M10", "dividends_cash", "Cash dividends paid to parent shareholders", COND, "flow", ["FY", "H1", "Q", "TTM"],
  "Tier A/B candidates and Aramco",
  {"numerator": "Cash dividends paid to owners of the parent in the period (cash-flow statement), split into regular and performance-linked/special; excludes dividends to non-controlling interests and share buybacks", "denominator": None},
  [{"item": "dividends_paid_parent", "role": "cash paid to parent shareholders"}, {"item": "performance_linked_paid", "role": "performance-linked or special portion paid, zero only if disclosed as zero"}],
  ["Verify each issuer's definition first: cash paid vs declared, parent vs NCI, regular vs performance-linked/special, scrip vs cash.",
   "Use cash paid in the period, not declared or proposed.",
   "Exclude dividends to non-controlling interests (separate line).",
   "Separate performance-linked/special; if not separable, fail.",
   "Share buybacks are reported separately, never added.",
   "Convert at period-average rate."],
  "IAS 7 permits dividends paid in operating or financing; ASC 230 financing. Classification does not change the amount; recorded as metadata.",
  {"consolidation": "parent shareholders", "currency": "USD; SAR at period-average rate", "unit": "currency", "period": "payment date within period"},
  {"missing_values": "Missing split -> NOT_COMPARABLE.", "restatements": "n/a for cash paid; record vintage.", "definition_conflict": "Declared-basis or NCI-inclusive figures -> NOT_COMPARABLE."},
  [{"code": "dividend_basis_not_cash_paid", "when": {"op": "neq", "path": "meta.dividend_basis", "value": "cash_paid"}, "reason": "Cash paid in period required."},
   {"code": "dividends_include_nci", "when": {"op": "neq", "path": "meta.dividends_include_nci", "value": False}, "reason": "NCI dividends must be excluded."},
   {"code": "performance_linked_not_separable", "when": {"op": "neq", "path": "meta.performance_linked_separable", "value": True}, "reason": "Performance-linked/special portion must be separable."},
   {"code": "buybacks_combined", "when": {"op": "neq", "path": "meta.buybacks_separate", "value": True}, "reason": "Buybacks must be separate."}],
  [{"key": "regular_dividends_paid", "selector": [], "cases": {"": "dividends_paid_parent - performance_linked_paid"}},
   {"key": "performance_linked_dividends_paid", "selector": [], "cases": {"": "performance_linked_paid"}}],
  [ex("pass", base_meta(dividend_basis="cash_paid", dividends_include_nci=False, performance_linked_separable=True, buybacks_separate=True), {"dividends_paid_parent": 250, "performance_linked_paid": 50}, COND),
   ex("fail_declared_basis", base_meta(dividend_basis="declared", dividends_include_nci=False, performance_linked_separable=True, buybacks_separate=True), {"dividends_paid_parent": 250, "performance_linked_paid": 50}, NC, "dividend_basis_not_cash_paid")],
  notes="Not COMPARABLE by default: a dividends line exists for every issuer but definitions differ."))

# M11 Production
R.append(recipe("M11", "production", "Hydrocarbon production, net entitlement, boe", COND, "physical", ["FY", "H1", "Q"],
  "Tier A/B/C candidates and Aramco",
  {"numerator": "Liquids (kbd) + gas volume (scf/d) / policy gas factor (scf per boe); liquids and gas also shown separately", "denominator": None},
  [{"item": "liquids_kbd", "role": "crude, condensate, NGL; net entitlement"}, {"item": "gas_mmscfd", "role": "gas, net entitlement, millions of scf per day"}],
  ["Read liquids and gas from the issuer's reported volumes, not issuer boe totals.", "Basis must be net entitlement (D6 pending); working interest or unknown fails.", "Equity-affiliate inclusion must match the policy.", "boe = liquids + gas / factor; factor is a policy parameter (D6), not issuer-specific.", "Physical unit; no FX."],
  "Not a framework issue; SEC vs PRMS entitlement definitions recorded.",
  {"consolidation": "net entitlement incl./excl. affiliates per policy", "currency": "n/a", "unit": "thousand boe/d", "period": "period average"},
  {"missing_values": "Gas or liquids missing -> NOT_COMPARABLE.", "restatements": "Latest restated.", "definition_conflict": "Issuer boe totals with own factors are recorded, not used."},
  [{"code": "production_basis_not_net_entitlement", "when": {"op": "neq", "path": "meta.production_basis", "value": "net_entitlement"}, "reason": "Net entitlement required (pending D6)."},
   {"code": "gas_factor_policy_missing", "when": {"op": "missing", "path": "policy.gas_scf_per_boe"}, "reason": "Policy gas factor (D6) required."},
   {"code": "affiliate_inclusion_mismatch", "when": {"op": "neq_path", "path": "meta.includes_equity_affiliates", "other": "policy.include_equity_affiliates"}, "reason": "Affiliate inclusion must match policy."}],
  [{"key": "production_kboed", "physical": True, "selector": [], "cases": {"": "liquids_kbd + gas_mmscfd * 1000 / policy_gas_scf_per_boe"}}],
  [ex("pass", base_meta(production_basis="net_entitlement", includes_equity_affiliates=False), {"liquids_kbd": 100, "gas_mmscfd": 600}, COND, policy={"gas_scf_per_boe": 6000, "include_equity_affiliates": False}),
   ex("fail_working_interest", base_meta(production_basis="working_interest", includes_equity_affiliates=False), {"liquids_kbd": 100, "gas_mmscfd": 600}, NC, "production_basis_not_net_entitlement", policy={"gas_scf_per_boe": 6000, "include_equity_affiliates": False})],
  notes="Synthetic factor in examples only; the policy value is decision D6."))

# M12 Reserves
R.append(recipe("M12", "reserves", "Proved reserves and reserve life", NC, "physical", ["FY"],
  "Aramco vs SEC filers", {"numerator": "Proved reserves", "denominator": "Annual production (reserve life)"},
  [{"item": "proved_reserves", "role": "issuer reported"}],
  ["Not reconciled for Aramco: SPE-PRMS (Kingdom-fields and concession-term bases) vs SEC 12-month average price and entitlement rules.", "Among SEC filers conditionally comparable; outside the Aramco comparison scope of B06."],
  "SEC Reg S-X 4-10 vs SPE-PRMS.", {"consolidation": "n/a", "currency": "n/a", "unit": "boe", "period": "year end"},
  {"missing_values": "n/a", "restatements": "n/a", "definition_conflict": "Always for Aramco vs SEC."},
  [{"code": "reserves_basis_prms_vs_sec", "when": {"op": "always"}, "reason": "PRMS concession basis vs SEC pricing and entitlement."}],
  [], [ex("fail_any", base_meta(), {"proved_reserves": 1000}, NC, "reserves_basis_prms_vs_sec")], notes="not_reconcilable"))

# M13 Refining
R.append(recipe("M13", "refining_capacity", "Crude distillation capacity and throughput, net equity share", COND, "physical", ["FY", "H1", "Q"],
  "Tier A/B candidates and Aramco",
  {"numerator": "Net (equity-share) crude distillation capacity or throughput", "denominator": None},
  [{"item": "net_distillation_capacity_kbd", "role": "equity share"}],
  ["Use crude distillation only.", "Net equity share for all companies; gross including JVs fails.", "Capacity and throughput are separate outputs; mixing fails."],
  "Not a framework issue.", {"consolidation": "equity share", "currency": "n/a", "unit": "kbd", "period": "period end (capacity) or average (throughput)"},
  {"missing_values": "Missing -> NOT_COMPARABLE.", "restatements": "Latest.", "definition_conflict": "Gross-including-JV figures recorded, not used."},
  [{"code": "capacity_basis_not_net", "when": {"op": "neq", "path": "meta.capacity_basis", "value": "net_equity_share"}, "reason": "Net equity share required."},
   {"code": "capacity_type_not_distillation", "when": {"op": "neq", "path": "meta.capacity_type", "value": "crude_distillation"}, "reason": "Crude distillation only."}],
  [{"key": "net_distillation_capacity_kbd", "physical": True, "selector": [], "cases": {"": "net_distillation_capacity_kbd"}}],
  [ex("pass", base_meta(capacity_basis="net_equity_share", capacity_type="crude_distillation"), {"net_distillation_capacity_kbd": 1500}, COND),
   ex("fail_gross", base_meta(capacity_basis="gross_including_jv", capacity_type="crude_distillation"), {"net_distillation_capacity_kbd": 1500}, NC, "capacity_basis_not_net")]))

# M14 Lifting cost
R.append(recipe("M14", "lifting_cost", "Unit production / lifting cost per boe", NC, "ratio", ["FY"], "All",
  {"numerator": "Production cost", "denominator": "boe produced"}, [{"item": "unit_cost", "role": "issuer reported"}],
  ["Not reconciled: no common definition of included costs (royalties, transport, DD&A, overhead); ASC 932 supplementary data exists for SEC filers only."],
  "ASC 932 disclosures for SEC filers; none for Aramco.", {"consolidation": "n/a", "currency": "n/a", "unit": "n/a", "period": "n/a"},
  {"missing_values": "n/a", "restatements": "n/a", "definition_conflict": "Always."},
  [{"code": "no_common_cost_definition", "when": {"op": "always"}, "reason": "No common lifting-cost definition."}],
  [], [ex("fail_any", base_meta(), {"unit_cost": 5}, NC, "no_common_cost_definition")], notes="not_reconcilable"))

# M15 Emissions
R.append(recipe("M15", "upstream_carbon_intensity", "Upstream carbon intensity", NC, "ratio", ["FY"], "All",
  {"numerator": "Scope 1+2 emissions", "denominator": "boe produced"}, [{"item": "carbon_intensity", "role": "issuer reported"}],
  ["Not reconciled: operated vs equity boundary, Scope 2 method, gases, denominator and assurance level differ."],
  "Not a financial framework issue.", {"consolidation": "n/a", "currency": "n/a", "unit": "n/a", "period": "n/a"},
  {"missing_values": "n/a", "restatements": "Method changes (e.g. Scope 2 basis) break series.", "definition_conflict": "Always."},
  [{"code": "boundary_method_mismatch", "when": {"op": "always"}, "reason": "Boundary, Scope 2 method and denominator differ."}],
  [], [ex("fail_any", base_meta(), {"carbon_intensity": 10}, NC, "boundary_method_mismatch")], notes="not_reconcilable"))

# M16 Valuation multiples
R.append(recipe("M16", "valuation_multiples", "Valuation multiples (EV/EBITDA, P/E, yield)", "OUT_OF_SCOPE_B06", "ratio", ["FY", "TTM"], "None in B06",
  {"numerator": "Market value (licensed price data)", "denominator": "M02/M03/M10 outputs"}, [{"item": "price", "role": "licensed market data"}],
  ["Out of scope: requires licensed price and share-count data (D9); B07 not started."],
  "n/a", {"consolidation": "n/a", "currency": "n/a", "unit": "n/a", "period": "n/a"},
  {"missing_values": "n/a", "restatements": "n/a", "definition_conflict": "n/a"},
  [{"code": "out_of_scope_b06", "when": {"op": "always"}, "reason": "Needs licensed price data; outside B06."}],
  [], [ex("fail_any", base_meta(), {"price": 1}, "OUT_OF_SCOPE_B06", "out_of_scope_b06")], notes="out_of_scope"))

# M17 Market share
R.append(recipe("M17", "market_share", "Market share", NC, "ratio", ["FY"], "Pending",
  {"numerator": "Company production or sales", "denominator": "Market total from an industry dataset with confirmed rights"}, [{"item": "company_volume", "role": ""}],
  ["Not computed: no denominator dataset with confirmed public-display rights (D2).", "Becomes reconcilable only after a dataset decision; recipe to be issued then."],
  "n/a", {"consolidation": "n/a", "currency": "n/a", "unit": "n/a", "period": "n/a"},
  {"missing_values": "n/a", "restatements": "Dataset vintages must match.", "definition_conflict": "Mixed commodities or value-chain stages forbidden."},
  [{"code": "denominator_rights_unresolved", "when": {"op": "always"}, "reason": "No market-total dataset with confirmed rights."}],
  [], [ex("fail_any", base_meta(), {"company_volume": 1}, NC, "denominator_rights_unresolved")], notes="not_reconcilable"))

# ---------------- evaluator (python, independent of the TS checker) ----------------
def get(obj, path):
    cur = obj
    for p in path.split("."):
        if not isinstance(cur, dict) or p not in cur:
            return None
        cur = cur[p]
    return cur

def holds(cond, ctx, rec):
    op = cond["op"]
    if op == "always": return True
    if op == "monetary": return rec["measure_type"] in ("flow", "stock")
    if op == "and": return all(holds(a, ctx, rec) for a in cond["args"])
    if op == "missing": return get(ctx, cond["path"]) is None
    if op == "empty": v = get(ctx, cond["path"]); return not v
    if op == "eq": return get(ctx, cond["path"]) == cond["value"]
    if op == "neq": return get(ctx, cond["path"]) != cond["value"]
    if op == "neq_path": return get(ctx, cond["path"]) != get(ctx, cond["other"])
    if op == "not_in": return get(ctx, cond["path"]) not in cond["values"]
    if op == "not_in_recipe": return get(ctx, cond["path"]) not in rec[cond["recipe_key"]]
    if op == "fx_type_mismatch":
        if rec["measure_type"] not in ("flow", "stock") or get(ctx, "meta.currency") == "USD": return False
        want = "period_average" if rec["measure_type"] == "flow" else "closing"
        return get(ctx, "meta.fx.rate_type") != want
    raise ValueError(op)

TOK = re.compile(r"\s*(\d+(?:\.\d+)?|[a-z_]+|[()+\-*/])")
def calc(expr, env):
    toks = TOK.findall(expr); pos = [0]
    def peek(): return toks[pos[0]] if pos[0] < len(toks) else None
    def nxt(): t = toks[pos[0]]; pos[0] += 1; return t
    def atom():
        t = nxt()
        if t == "(":
            v = add(); assert nxt() == ")"; return v
        if re.match(r"\d", t): return float(t)
        return float(env[t])
    def mul():
        v = atom()
        while peek() in ("*", "/"):
            o = nxt(); r = atom(); v = v * r if o == "*" else v / r
        return v
    def add():
        v = mul()
        while peek() in ("+", "-"):
            o = nxt(); r = mul(); v = v + r if o == "+" else v - r
        return v
    v = add(); assert pos[0] == len(toks); return v

def idents(expr):
    return sorted({t for t in TOK.findall(expr) if re.match(r"[a-z_]", t)})

def evaluate(rec, e):
    ctx = {"meta": e["meta"], "policy": e.get("policy", {})}
    if rec["proposed_rating"] == "OUT_OF_SCOPE_B06":
        return {"status": "OUT_OF_SCOPE_B06", "reason": "out_of_scope_b06"}
    for c in GENERIC + rec["failure_conditions"]:
        if holds(c["when"], ctx, rec):
            return {"status": "NOT_COMPARABLE", "reason": c["code"]}
    vals = {}
    for o in rec["outputs"]:
        key = "|".join(str(get(ctx, s)) for s in o["selector"])
        if key not in o["cases"]:
            return {"status": "NOT_COMPARABLE", "reason": "no_recipe_for_case"}
        expr = o["cases"][key]
        env = dict(e["items"])
        for k, v in e.get("policy", {}).items():
            env["policy_" + k] = v
        for i in idents(expr):
            if i not in env:
                return {"status": "NOT_COMPARABLE", "reason": "required_item_missing"}
        v = calc(expr, env)
        if not o.get("ratio") and not o.get("physical") and e["meta"]["currency"] != "USD":
            v = v / e["meta"]["fx"]["rate"]
        vals[o["key"]] = round(v, 6)
    return {"status": "CONDITIONALLY_COMPARABLE", "values": vals}

for rec in R:
    for e in rec["examples"]:
        got = evaluate(rec, e)
        exp = e["expected"]
        assert got["status"] == exp["status"], (rec["id"], e["label"], got, exp)
        if "reason" in exp:
            assert got.get("reason") == exp["reason"], (rec["id"], e["label"], got, exp)
        if got["status"] == "CONDITIONALLY_COMPARABLE":
            exp["values"] = got["values"]
        exp["display"] = "BLOCKED"

out = {
    "schema": "marefa-web08b06-comparability-recipes/1",
    "status": "METHODOLOGY_PROPOSAL_NOT_APPROVED",
    "rule": "Default NOT_COMPARABLE. A cell is CONDITIONALLY_COMPARABLE only if no generic or metric failure condition holds, a formula case exists for its basis, and every formula item is present. No cell is displayable in B06: display is BLOCKED for every example and every real cell until financial review, rights grants and owner approval.",
    "examples_note": SY + ". Expected values were computed by the generator's evaluator and are re-checked by an independent evaluator in checks/decision-pack.test.ts.",
    "fx_convention": "currency units per USD; flows at period-average rate, stocks at closing rate; ratio and physical outputs not converted",
    "aramco_inputs": "Aramco cells use B02 identities, all WITHHELD (142); comparability status never changes their withholding.",
    "item_concepts_note": "Candidate XBRL concepts per item are not listed as verified: Company Facts completeness and concept availability per issuer are UNVERIFIED (R03).",
    "generic_failure_conditions": GENERIC,
    "recipes": R,
}
json.dump(out, open(sys.argv[1], "w"), ensure_ascii=False, indent=1)
open(sys.argv[1], "a").write("\n")
print(len(R), sum(len(r["examples"]) for r in R))
