"""Generate COMPARABILITY-RECIPES.json (B06-0, recipes/2 after R02-A and R02-B).

Fail-closed design: every definition is an allow-list (missing or unlisted value -> NOT_COMPARABLE),
periods are validated as real dates with order and duration, FX needs rate, source, date/window and the
basis that fits the measure, every used input must be a finite number with its declared definition, and no
value is defaulted. Synthetic examples only; this evaluator is mirrored by an independent TypeScript
evaluator in checks/decision-pack.test.ts.
"""
import datetime, json, math, re, sys

SY = "SYNTHETIC: invented test values, not company data"
CURRENCIES = ["USD", "SAR"]
DURATION = {"FY": (364, 371), "TTM": (364, 371), "H1": (181, 184), "Q": (89, 92)}

# ---------------------------------------------------------------- recipe content
def recipe(id, key, name, rating, measure, kinds, definition, steps, gaap, basis, handling,
           required_definitions=None, conditions=None, item_definitions=None, outputs=None,
           depends_on=None, forbidden_items=None, pair_homogeneous=None, guards=None, notes="",
           policy_requirements=None, balance_dates=False):
    return dict(id=id, key=key, name=name, proposed_rating=rating, measure_type=measure,
                allowed_period_kinds=kinds, definition=definition, ordered_steps=steps,
                ifrs_vs_us_gaap=gaap, basis=basis, handling=handling,
                required_definitions=required_definitions or {}, failure_conditions=conditions or [],
                item_definitions=item_definitions or {}, outputs=outputs or [], depends_on=depends_on or [],
                forbidden_items=forbidden_items or [], pair_homogeneous_fields=pair_homogeneous or [],
                guards=guards or [], policy_requirements=policy_requirements or {},
                requires_balance_dates=balance_dates, notes=notes, examples=[], pair_examples=[])

def T(expr, when=None, sign=1):
    t = {"expr": expr, "sign": sign}
    if when: t["when"] = when
    return t

def EQ(path, value): return {"op": "eq", "path": path, "value": value}
def AND(*a): return {"op": "and", "args": list(a)}

IFRS, USG = EQ("meta.accounting_basis", "IFRS"), EQ("meta.accounting_basis", "US_GAAP")
HANDLING = {"missing_values": "A used item that is absent, null, non-numeric or without its declared definition -> NOT_COMPARABLE; no default or zero is substituted.",
            "restatements": "Only the latest restated comparative (restated_latest = true); the filing vintage is recorded.",
            "definition_conflict": "Every required definition is an allow-list; a missing or unlisted value -> NOT_COMPARABLE with the field name."}
MON = lambda fx: {"consolidation": "consolidated group", "currency": f"USD; SAR converted at the {fx} rate with source and date", "unit": "currency", "period": "validated kind, real dates, order and duration"}

R = []

R.append(recipe("M01", "revenue", "Revenue net of royalties and excise", "CONDITIONALLY_COMPARABLE", "flow", ["FY", "H1", "Q", "TTM"],
  {"numerator": "Reported revenue, less royalties and excise included in revenue by gross presenters", "denominator": None},
  ["Validate source, basis, consolidation, restatement, period and FX.", "Check royalty presentation and trading revenue basis against their allow-lists.",
   "Gross presenters subtract royalties/excise included in revenue; net presenters must not supply that item.", "Convert at the period-average rate.",
   "Pairs must share the trading revenue basis (gross and net trading revenue are not reconcilable without volume data)."],
  "Presentation of royalties/excise and trading revenue differs by issuer, not by framework.", MON("period-average"), HANDLING,
  required_definitions={"royalty_presentation": ["gross", "net"], "trading_revenue_basis": ["gross", "net"]},
  item_definitions={"revenue": "reported_revenue_line", "royalties_excise_in_revenue": "royalties_and_excise_included_in_revenue"},
  outputs=[{"key": "revenue_net", "kind": "monetary", "terms": [T("revenue"), T("royalties_excise_in_revenue", EQ("meta.royalty_presentation", "gross"), -1)]}],
  pair_homogeneous=["trading_revenue_basis"]))

R.append(recipe("M02", "ebit_ebitda", "EBIT and EBITDA, normalised", "CONDITIONALLY_COMPARABLE", "flow", ["FY", "H1", "Q", "TTM"],
  {"numerator": "Operating profit before finance costs and tax, excluding impairments and reversals, downstream inventory at replacement cost (IFRS) or LIFO (US GAAP), leases aligned to IFRS 16; EBITDA adds DD&A", "denominator": None},
  ["Validate generic fields and definitions.", "Start from operating profit as defined (before finance costs and tax).", "Add impairment losses; subtract reversals (IFRS only).",
   "IFRS: subtract the disclosed inventory holding gain; US GAAP LIFO: subtract any LIFO liquidation gain.",
   "US GAAP EBIT: add the disclosed interest-equivalent part of operating lease cost; EBITDA: add DD&A and the full operating lease cost.",
   "Items that belong to another basis are rejected, not ignored.", "Convert at the period-average rate."],
  "IAS 36 reversal vs none under US GAAP; IAS 2 bans LIFO; IFRS 16 vs ASC 842 operating lease cost; IFRS 6 vs successful efforts/full cost.", MON("period-average"), HANDLING,
  required_definitions={"inventory_method": ["replacement_cost_disclosed", "LIFO"], "e_and_e_method": ["successful_efforts", "ifrs6_successful_efforts_like"],
                        "royalty_classification": ["operating_cost", "revenue_deduction"], "operating_profit_definition": ["before_finance_costs_and_tax"]},
  conditions=[{"code": "inventory_method_inconsistent_with_basis", "when": AND(IFRS, EQ("meta.inventory_method", "LIFO")), "reason": "LIFO is not permitted under IFRS."}],
  item_definitions={"operating_profit": "operating_profit_before_finance_costs_and_tax", "impairment_losses": "impairment_losses_in_operating_profit",
                    "impairment_reversals": "impairment_reversals_in_operating_profit", "inventory_holding_gain": "inventory_holding_gain_pre_tax",
                    "lifo_liquidation_gain": "lifo_liquidation_effect_pre_tax", "dda": "depreciation_depletion_amortisation_incl_rou",
                    "operating_lease_cost": "asc842_operating_lease_cost", "operating_lease_interest_component": "asc842_operating_lease_interest_equivalent"},
  outputs=[{"key": "ebit_norm", "kind": "monetary", "terms": [T("operating_profit"), T("impairment_losses"), T("impairment_reversals", IFRS, -1),
             T("inventory_holding_gain", EQ("meta.inventory_method", "replacement_cost_disclosed"), -1), T("lifo_liquidation_gain", EQ("meta.inventory_method", "LIFO"), -1),
             T("operating_lease_interest_component", USG)]},
           {"key": "ebitda_norm", "kind": "monetary", "terms": [T("operating_profit"), T("impairment_losses"), T("impairment_reversals", IFRS, -1),
             T("inventory_holding_gain", EQ("meta.inventory_method", "replacement_cost_disclosed"), -1), T("lifo_liquidation_gain", EQ("meta.inventory_method", "LIFO"), -1),
             T("dda"), T("operating_lease_cost", USG)]}]))

R.append(recipe("M03", "net_income", "Net income attributable to parent, normalised", "CONDITIONALLY_COMPARABLE", "flow", ["FY", "H1", "Q", "TTM"],
  {"numerator": "Profit attributable to owners of the parent, excluding after-tax impairment reversals (IFRS) and after-tax inventory holding/LIFO liquidation effects", "denominator": None},
  ["Validate generic fields and definitions.", "Use parent-share profit only.", "Subtract the after-tax effects disclosed; no tax-rate assumption.", "Convert at the period-average rate."],
  "Impairment reversal and inventory method as in M02.", MON("period-average"), HANDLING,
  required_definitions={"profit_scope": ["attributable_to_parent"], "inventory_method": ["replacement_cost_disclosed", "LIFO"]},
  conditions=[{"code": "inventory_method_inconsistent_with_basis", "when": AND(IFRS, EQ("meta.inventory_method", "LIFO")), "reason": "LIFO is not permitted under IFRS."}],
  item_definitions={"profit_attributable_to_parent": "profit_attributable_to_owners_of_parent", "impairment_reversals_after_tax": "impairment_reversals_after_tax",
                    "inventory_holding_gain_after_tax": "inventory_holding_gain_after_tax", "lifo_liquidation_gain_after_tax": "lifo_liquidation_effect_after_tax"},
  outputs=[{"key": "net_income_norm", "kind": "monetary", "terms": [T("profit_attributable_to_parent"), T("impairment_reversals_after_tax", IFRS, -1),
             T("inventory_holding_gain_after_tax", EQ("meta.inventory_method", "replacement_cost_disclosed"), -1),
             T("lifo_liquidation_gain_after_tax", EQ("meta.inventory_method", "LIFO"), -1)]}]))

R.append(recipe("M04", "company_adjusted_earnings", "Company-defined adjusted earnings (as reported)", "NOT_COMPARABLE", "flow", ["FY", "H1", "Q", "TTM"],
  {"numerator": "Issuer-defined APM earnings", "denominator": None}, ["Not reconciled; use M02/M03."], "APMs are outside both frameworks.",
  {"consolidation": "n/a", "currency": "n/a", "unit": "n/a", "period": "n/a"}, HANDLING,
  conditions=[{"code": "issuer_defined_measure", "when": {"op": "always"}, "reason": "Issuer-defined adjustments are not comparable."}], notes="not_reconcilable"))

CFO_DEFS = {"interest_paid_classification": ["operating", "financing"], "dividends_received_classification": ["operating", "investing"],
            "dividends_paid_classification": ["financing", "operating"], "interest_received_classification": ["operating"]}
CFO_CONDS = [
  {"code": "interest_paid_classification_inconsistent_with_basis", "when": AND(USG, EQ("meta.interest_paid_classification", "financing")), "reason": "US GAAP classifies interest paid in operating activities."},
  {"code": "dividends_paid_classification_inconsistent_with_basis", "when": AND(USG, EQ("meta.dividends_paid_classification", "operating")), "reason": "US GAAP classifies dividends paid in financing activities."},
  {"code": "dividends_received_investing_under_us_gaap_not_reconcilable", "when": AND(USG, EQ("meta.dividends_received_classification", "investing")), "reason": "US GAAP investing distributions are returns of investment, not dividends from earnings; no reconciliation recipe."}]
CFO_ITEMS = {"cfo": "net_cash_from_operating_activities_as_reported", "lease_principal_payments": "ifrs16_lease_principal_payments_in_financing",
             "finance_lease_principal_payments": "asc842_finance_lease_principal_payments", "interest_paid_in_financing": "interest_paid_classified_in_financing",
             "dividends_received_in_investing": "dividends_received_from_investments_classified_in_investing",
             "dividends_paid_in_operating": "dividends_paid_parent_and_nci_classified_in_operating"}
CFO_TERMS = [T("cfo"), T("lease_principal_payments", IFRS, -1), T("finance_lease_principal_payments", USG, -1),
             T("interest_paid_in_financing", EQ("meta.interest_paid_classification", "financing"), -1),
             T("dividends_received_in_investing", EQ("meta.dividends_received_classification", "investing")),
             T("dividends_paid_in_operating", EQ("meta.dividends_paid_classification", "operating"))]
CFO_POLICY = ("Uniform placement policy: dividends received from associates, joint ventures and other investments are placed in operating cash flow for every company; "
              "dividends paid (to parent shareholders and to NCI) and lease principal are placed in financing; interest paid in operating. "
              "Basis: IAS 7 permits operating or investing for dividends received and operating or financing for dividends paid; ASC 230 fixes interest paid in operating and dividends paid in financing "
              "(standards text not opened in this environment: UNVERIFIED reference). Disclosures used: the cash-flow statement lines named in item_definitions.")

R.append(recipe("M05", "cfo", "Cash flow from operations, normalised to one placement policy", "CONDITIONALLY_COMPARABLE", "flow", ["FY", "H1", "Q", "TTM"],
  {"numerator": "Reported CFO moved to the uniform placement policy (see notes)", "denominator": None},
  ["Validate generic fields; classifications must be in their allow-lists and consistent with the framework.",
   "IFRS: subtract lease principal payments; US GAAP: subtract finance lease principal payments.",
   "If interest paid sits in financing (IFRS), subtract it.", "If dividends received sit in investing (IFRS), add the disclosed amount; if they already sit in operating, the reclassification item must not be supplied (double count).",
   "If dividends paid sit in operating (IFRS), add them back.", "Interest received outside operating -> NOT_COMPARABLE (no recipe).", "Convert at the period-average rate."],
  "IAS 7 classification choices vs ASC 230; IFRS 16 vs ASC 842 lease cash flows.", MON("period-average"), HANDLING,
  required_definitions=CFO_DEFS, conditions=CFO_CONDS, item_definitions=CFO_ITEMS,
  outputs=[{"key": "cfo_norm", "kind": "monetary", "terms": CFO_TERMS}],
  forbidden_items=["dividends_paid_parent", "dividends_paid_nci"], notes=CFO_POLICY))

CAPEX_DEFS = {"capex_acquisitions_classification": ["separately_disclosed"], "investments_classification": ["separately_disclosed"],
              "e_and_e_method": ["successful_efforts", "ifrs6_successful_efforts_like"]}
R.append(recipe("M06", "capex", "Capital expenditure, cash basis", "CONDITIONALLY_COMPARABLE", "flow", ["FY", "H1", "Q", "TTM"],
  {"numerator": "Cash payments for PP&E and capitalised exploration/intangibles; acquisitions of businesses and investments in associates/JVs excluded", "denominator": None},
  ["Validate generic fields.", "Acquisitions and equity investments must be separately disclosed lines (allow-list: separately_disclosed); combined, unknown or missing -> NOT_COMPARABLE.",
   "Full-cost reporters are not accepted.", "Capex = PP&E payments + exploration/intangible payments.", "Convert at the period-average rate."],
  "Capitalised exploration differs with IFRS 6 vs successful efforts/full cost.", MON("period-average"), HANDLING,
  required_definitions=CAPEX_DEFS,
  item_definitions={"payments_for_ppe": "cash_payments_for_ppe", "payments_for_exploration_intangibles": "cash_payments_for_capitalised_exploration_and_intangibles"},
  outputs=[{"key": "capex_cash", "kind": "monetary", "terms": [T("payments_for_ppe"), T("payments_for_exploration_intangibles")]}],
  forbidden_items=["payments_for_acquisitions", "payments_for_equity_investments"]))

R.append(recipe("M07", "fcf", "Free cash flow, rebuilt from normalised CFO", "CONDITIONALLY_COMPARABLE", "flow", ["FY", "H1", "Q", "TTM"],
  {"numerator": "M05 normalised CFO minus M06 cash capex; issuer FCF and raw CFO are never used", "denominator": None},
  ["Evaluate M05 on the same cell; any M05 failure is the FCF failure.", "Evaluate M06 on the same cell; any M06 failure is the FCF failure.",
   "FCF = cfo_norm - capex_cash (both before FX conversion).", "Convert at the period-average rate."],
  "Inherits M05 and M06.", MON("period-average"), HANDLING,
  depends_on=["M05", "M06"],
  outputs=[{"key": "fcf_rebuilt", "kind": "monetary", "terms": [T("ref:M05.cfo_norm"), T("ref:M06.capex_cash", None, -1)]}]))

NETDEBT = [T("borrowings"), T("lease_liabilities", IFRS), T("finance_lease_liabilities", USG), T("operating_lease_liabilities", USG), T("cash_and_equivalents", None, -1)]
R.append(recipe("M08", "net_debt_gearing", "Net debt and gearing", "CONDITIONALLY_COMPARABLE", "stock", ["FY", "H1", "Q"],
  {"numerator": "Net debt = borrowings + all lease liabilities - cash and cash equivalents", "denominator": "Gearing = net debt / (net debt + total equity incl. NCI)"},
  ["Validate generic fields; the balance date is the period end.", "Cash definition must be cash and cash equivalents only.",
   "Hybrids: has_hybrids must be stated; when true, hybrids must be inside borrowings.", "Include all lease liabilities on both frameworks.",
   "Gearing denominator must be positive.", "Convert balances at the closing rate dated the period end."],
  "ASC 842 operating lease liabilities included for parity with IFRS 16.", MON("closing"), HANDLING,
  required_definitions={"cash_definition": ["cash_and_cash_equivalents"], "has_hybrids": [True, False]},
  conditions=[{"code": "hybrid_classification_not_accepted", "when": AND(EQ("meta.has_hybrids", True), {"op": "not_in", "path": "meta.hybrid_classification", "values": ["inside_borrowings"]}), "reason": "Hybrids must be inside borrowings."}],
  item_definitions={"borrowings": "borrowings_excluding_leases", "lease_liabilities": "ifrs16_lease_liabilities", "finance_lease_liabilities": "asc842_finance_lease_liabilities",
                    "operating_lease_liabilities": "asc842_operating_lease_liabilities", "cash_and_equivalents": "cash_and_cash_equivalents", "total_equity": "total_equity_incl_nci"},
  outputs=[{"key": "net_debt", "kind": "monetary", "terms": NETDEBT},
           {"key": "gearing", "kind": "ratio", "numerator": NETDEBT, "denominator": NETDEBT + [T("total_equity")]}],
  guards=[{"output": "gearing", "part": "denominator", "code": "denominator_not_positive"}]))

R.append(recipe("M09", "roace", "Return on average capital employed, single formula", "CONDITIONALLY_COMPARABLE", "ratio", ["FY", "TTM"],
  {"numerator": "Total profit + finance costs - disclosed tax effect of finance costs", "denominator": "Average of opening and closing (equity + borrowings incl. leases)"},
  ["Validate generic fields; opening balance date = day before period start, closing = period end.", "No assumed tax rate.", "Denominator must be positive."],
  "Leases included on both frameworks.", {"consolidation": "consolidated group", "currency": "dimensionless", "unit": "ratio", "period": "FY/TTM with dated opening and closing balances"}, HANDLING,
  required_definitions={"capital_employed_scope": ["total_equity_plus_borrowings_incl_leases"]},
  item_definitions={"profit_total": "profit_for_period_incl_nci", "finance_costs": "finance_costs", "finance_costs_tax_effect": "disclosed_tax_effect_of_finance_costs",
                    "equity_open": "total_equity_opening", "equity_close": "total_equity_closing", "borrowings_open": "borrowings_incl_leases_opening", "borrowings_close": "borrowings_incl_leases_closing"},
  outputs=[{"key": "roace", "kind": "ratio", "numerator": [T("profit_total"), T("finance_costs"), T("finance_costs_tax_effect", None, -1)],
            "denominator": [T("equity_open / 2"), T("borrowings_open / 2"), T("equity_close / 2"), T("borrowings_close / 2")]}],
  guards=[{"output": "roace", "part": "denominator", "code": "denominator_not_positive"}], balance_dates=True))

R.append(recipe("M10", "dividends_paid", "Cash dividends paid to parent shareholders", "CONDITIONALLY_COMPARABLE", "flow", ["FY", "H1", "Q", "TTM"],
  {"numerator": "Cash dividends paid to owners of the parent in the period, split into regular and performance-linked/special", "denominator": None},
  ["Validate generic fields and the dividend definitions (cash paid, parent scope, separable performance-linked part, buybacks separate).",
   "Dividends paid to NCI, dividends received and buybacks are not inputs here; supplying them rejects the cell (no mixing).",
   "Performance-linked part must be disclosed (zero only if disclosed) and not exceed the total.", "Convert at the period-average rate."],
  "Classification of dividends paid (IAS 7 / ASC 230) does not change the paid amount; recorded via M05.", MON("period-average"), HANDLING,
  required_definitions={"dividend_basis": ["cash_paid"], "dividends_paid_scope": ["owners_of_parent"], "performance_linked_separable": [True], "buybacks_separate": [True]},
  item_definitions={"dividends_paid_parent": "cash_dividends_paid_to_owners_of_parent", "performance_linked_paid": "performance_linked_or_special_dividends_paid_to_owners_of_parent"},
  outputs=[{"key": "regular_dividends_paid", "kind": "monetary", "terms": [T("dividends_paid_parent"), T("performance_linked_paid", None, -1)]},
           {"key": "performance_linked_dividends_paid", "kind": "monetary", "terms": [T("performance_linked_paid")]}],
  forbidden_items=["dividends_paid_nci", "dividends_received_in_investing", "dividends_received_in_operating", "share_buybacks"],
  guards=[{"output": "regular_dividends_paid", "part": "value", "code": "performance_linked_exceeds_total", "min": 0},
          {"output": "performance_linked_dividends_paid", "part": "value", "code": "performance_linked_negative", "min": 0}]))

R.append(recipe("M11", "production", "Hydrocarbon production, net entitlement, boe", "CONDITIONALLY_COMPARABLE", "physical", ["FY", "H1", "Q"],
  {"numerator": "Liquids (kbd) + gas (mmscfd) x 1000 / policy factor (scf per boe)", "denominator": None},
  ["Validate generic fields (no FX).", "Production basis must be net entitlement; affiliate inclusion must be stated and equal the policy.",
   "The gas factor is a policy parameter (D6), required and positive; no issuer factor or default."],
  "Not a framework issue.", {"consolidation": "net entitlement per policy", "currency": "n/a", "unit": "thousand boe/d", "period": "period average"}, HANDLING,
  required_definitions={"production_basis": ["net_entitlement"], "includes_equity_affiliates": [True, False]},
  conditions=[{"code": "affiliate_inclusion_mismatch", "when": {"op": "neq_path", "path": "meta.includes_equity_affiliates", "other": "policy.include_equity_affiliates"}, "reason": "Must equal policy."}],
  policy_requirements={"gas_scf_per_boe": "positive_number", "include_equity_affiliates": "boolean"},
  item_definitions={"liquids_kbd": "liquids_net_entitlement_kbd", "gas_mmscfd": "gas_net_entitlement_mmscfd"},
  outputs=[{"key": "production_kboed", "kind": "physical", "terms": [T("liquids_kbd"), T("gas_mmscfd * 1000 / policy_gas_scf_per_boe")]}],
  notes="Synthetic factor in examples only; the policy value is decision D6."))

R.append(recipe("M12", "reserves", "Proved reserves and reserve life", "NOT_COMPARABLE", "physical", ["FY"], {"numerator": "Proved reserves", "denominator": "Production"},
  ["Not reconciled for Aramco (PRMS concession basis vs SEC)."], "SEC Reg S-X 4-10 vs SPE-PRMS.", {"consolidation": "n/a", "currency": "n/a", "unit": "boe", "period": "year end"}, HANDLING,
  conditions=[{"code": "reserves_basis_prms_vs_sec", "when": {"op": "always"}, "reason": "PRMS vs SEC."}], notes="not_reconcilable"))

R.append(recipe("M13", "refining_capacity", "Crude distillation capacity, net equity share", "CONDITIONALLY_COMPARABLE", "physical", ["FY", "H1", "Q"],
  {"numerator": "Net equity-share crude distillation capacity", "denominator": None},
  ["Validate generic fields (no FX).", "Capacity basis net equity share; type crude distillation."], "Not a framework issue.",
  {"consolidation": "equity share", "currency": "n/a", "unit": "kbd", "period": "period end"}, HANDLING,
  required_definitions={"capacity_basis": ["net_equity_share"], "capacity_type": ["crude_distillation"]},
  item_definitions={"net_distillation_capacity_kbd": "net_equity_share_crude_distillation_capacity_kbd"},
  outputs=[{"key": "net_distillation_capacity_kbd", "kind": "physical", "terms": [T("net_distillation_capacity_kbd")]}]))

for id, key, name, code in [("M14", "lifting_cost", "Unit production / lifting cost per boe", "no_common_cost_definition"),
                            ("M15", "upstream_carbon_intensity", "Upstream carbon intensity", "boundary_method_mismatch"),
                            ("M17", "market_share", "Market share", "denominator_rights_unresolved")]:
    R.append(recipe(id, key, name, "NOT_COMPARABLE", "ratio", ["FY"], {"numerator": name, "denominator": "see reason"}, ["Not reconciled."], "n/a",
      {"consolidation": "n/a", "currency": "n/a", "unit": "n/a", "period": "n/a"}, HANDLING,
      conditions=[{"code": code, "when": {"op": "always"}, "reason": code.replace("_", " ")}], notes="not_reconcilable"))
R.append(recipe("M16", "valuation_multiples", "Valuation multiples", "OUT_OF_SCOPE_B06", "ratio", ["FY", "TTM"], {"numerator": "Licensed market value", "denominator": "M02/M03/M10"},
  ["Out of scope (D9); B07 not started."], "n/a", {"consolidation": "n/a", "currency": "n/a", "unit": "n/a", "period": "n/a"}, HANDLING,
  conditions=[{"code": "out_of_scope_b06", "when": {"op": "always"}, "reason": "Outside B06."}], notes="out_of_scope"))
R.sort(key=lambda r: r["id"])
BY = {r["id"]: r for r in R}

# ---------------------------------------------------------------- evaluator
def get(o, path):
    for p in path.split("."):
        if not isinstance(o, dict) or p not in o: return None
        o = o[p]
    return o

def holds(c, ctx):
    op = c["op"]
    if op == "always": return True
    if op == "and": return all(holds(a, ctx) for a in c["args"])
    if op == "eq": return get(ctx, c["path"]) == c["value"]
    if op == "neq_path": return get(ctx, c["path"]) != get(ctx, c["other"])
    if op == "not_in": return get(ctx, c["path"]) not in c["values"]
    raise ValueError(op)

def is_num(v): return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)
def date(s):
    if not isinstance(s, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", s): return None
    try: return datetime.date.fromisoformat(s)
    except ValueError: return None

class NC(Exception):
    pass

def fail(code): raise NC(code)

def check_period(r, m):
    p = m.get("period")
    if not isinstance(p, dict): fail("period_missing")
    if p.get("kind") not in r["allowed_period_kinds"]: fail("period_kind_not_allowed")
    s, e = date(p.get("start")), date(p.get("end"))
    if s is None or e is None: fail("period_date_invalid")
    if s >= e: fail("period_order_invalid")
    lo, hi = DURATION[p["kind"]]
    if not lo <= (e - s).days + 1 <= hi: fail("period_duration_inconsistent")
    if p["kind"] == "Q" and p.get("standalone") is not True: fail("quarter_not_standalone")
    if p["kind"] == "TTM":
        q = p.get("ttm_quarter_ends")
        ds = [date(x) for x in q] if isinstance(q, list) and len(q) == 4 else None
        if not ds or None in ds or ds[-1] != e or any(not 89 <= (b - a).days <= 92 for a, b in zip(ds, ds[1:])) or not 89 <= (ds[0] - s).days + 1 <= 92:
            fail("ttm_components_invalid")
    if r["requires_balance_dates"]:
        if date(m.get("opening_balance_date")) != s - datetime.timedelta(days=1) or date(m.get("closing_balance_date")) != e:
            fail("balance_dates_inconsistent")
    return s, e

def check_fx(r, m, s, e):
    if r["measure_type"] not in ("flow", "stock"): return
    cur = m.get("currency")
    if cur not in CURRENCIES: fail("currency_not_supported")
    fx = m.get("fx")
    if cur == "USD":
        if fx is not None: fail("fx_unexpected_for_usd")
        return
    if not isinstance(fx, dict): fail("fx_missing")
    if not is_num(fx.get("rate")) or fx["rate"] <= 0: fail("fx_rate_invalid")
    if not isinstance(fx.get("source_id"), str) or not fx["source_id"]: fail("fx_source_missing")
    want = "period_average" if r["measure_type"] == "flow" else "closing"
    if fx.get("rate_type") != want: fail("fx_rate_type_mismatch")
    if want == "period_average":
        if date(fx.get("window_start")) != s or date(fx.get("window_end")) != e: fail("fx_window_mismatch")
    elif date(fx.get("rate_date")) != e: fail("fx_date_mismatch")

def terms_value(terms, r, e, refs, env_used):
    total = 0.0
    for t in terms:
        if "when" in t and not holds(t["when"], {"meta": e["meta"], "policy": e.get("policy", {})}): continue
        expr = t["expr"]
        if expr.startswith("ref:"):
            total += t["sign"] * refs[expr[4:]]; continue
        env = {}
        for ident in re.findall(r"[a-z_]+", expr):
            if ident.startswith("policy_"):
                env[ident] = e.get("policy", {})[ident[7:]]
                continue
            env_used.add(ident)
            items = e["items"]
            if ident not in items or items[ident] is None: fail(f"required_item_missing:{ident}")
            if not is_num(items[ident]): fail(f"item_not_numeric:{ident}")
            d = (e["meta"].get("item_definitions") or {}).get(ident)
            if d is None: fail(f"item_definition_missing:{ident}")
            if d != r["item_definitions"][ident]: fail(f"item_definition_mismatch:{ident}")
            env[ident] = float(items[ident])
        total += t["sign"] * calc(expr, env)
    return total

TOK = re.compile(r"\s*(\d+(?:\.\d+)?|[a-z_]+|[()+\-*/])")
def calc(expr, env):
    toks = TOK.findall(expr); i = [0]
    def nxt(): t = toks[i[0]]; i[0] += 1; return t
    def peek(): return toks[i[0]] if i[0] < len(toks) else None
    def atom():
        t = nxt()
        if t == "(": v = add(); nxt(); return v
        return float(t) if t[0].isdigit() else env[t]
    def mul():
        v = atom()
        while peek() in ("*", "/"):
            v = v * atom() if nxt() == "*" else v / atom()
        return v
    def add():
        v = mul()
        while peek() in ("+", "-"):
            v = v + mul() if nxt() == "+" else v - mul()
        return v
    return add()

def all_term_items(r):
    out = set()
    for o in r["outputs"]:
        for t in o.get("terms", []) + o.get("numerator", []) + o.get("denominator", []):
            if not t["expr"].startswith("ref:"):
                out |= {x for x in re.findall(r"[a-z_]+", t["expr"]) if not x.startswith("policy_")}
    return out

def evaluate(r, e, depth=0):
    """Return {"status", "reason"} or {"status", "values"}; raw (pre-FX) values for dependants."""
    try:
        return _evaluate(r, e)
    except NC as x:
        return {"status": "NOT_COMPARABLE", "reason": str(x)}

def _evaluate(r, e):
    if r["proposed_rating"] == "OUT_OF_SCOPE_B06": return {"status": "OUT_OF_SCOPE_B06", "reason": "out_of_scope_b06"}
    m, ctx = e["meta"], {"meta": e["meta"], "policy": e.get("policy", {})}
    if not isinstance(m.get("source_ids"), list) or not m["source_ids"] or not all(isinstance(x, str) and x for x in m["source_ids"]): fail("source_missing")
    if m.get("accounting_basis") not in ("IFRS", "US_GAAP"): fail("accounting_basis_unknown")
    if m.get("consolidation") != "consolidated": fail("consolidation_not_group")
    if m.get("restated_latest") is not True: fail("not_latest_restated")
    s, en = check_period(r, m)
    check_fx(r, m, s, en)
    for c in r["failure_conditions"]:
        if c["when"]["op"] == "always": fail(c["code"])
    for f, allowed in r["required_definitions"].items():
        if f not in m or m[f] is None: fail(f"definition_missing:{f}")
        if m[f] not in allowed or isinstance(m[f], bool) != any(isinstance(a, bool) for a in allowed): fail(f"definition_not_accepted:{f}")
    for k, kind in r["policy_requirements"].items():
        v = e.get("policy", {}).get(k)
        if v is None: fail(f"policy_missing:{k}")
        if (kind == "positive_number" and (not is_num(v) or v <= 0)) or (kind == "boolean" and not isinstance(v, bool)): fail(f"policy_invalid:{k}")
    for c in r["failure_conditions"]:
        if holds(c["when"], ctx): fail(c["code"])
    for it in r["forbidden_items"]:
        if it in e["items"]: fail(f"item_not_allowed:{it}")
    refs = {}
    for dep in r["depends_on"]:
        res = _evaluate_raw(BY[dep], e)
        for k, v in res.items(): refs[f"{dep}.{k}"] = v
    used, raw = set(), {}
    for o in r["outputs"]:
        if o["kind"] == "ratio":
            num = terms_value(o["numerator"], r, e, refs, used); den = terms_value(o["denominator"], r, e, refs, used)
            if den <= 0: fail("denominator_not_positive")
            raw[o["key"]] = num / den
        else:
            raw[o["key"]] = terms_value(o["terms"], r, e, refs, used)
    for it in sorted(all_term_items(r) - used):
        if it in e["items"]: fail(f"reclassification_item_conflict:{it}")
    for g in r["guards"]:
        if g["part"] == "value" and raw[g["output"]] < g["min"]: fail(g["code"])
    vals = {}
    for o in r["outputs"]:
        v = raw[o["key"]]
        if o["kind"] == "monetary" and m["currency"] != "USD": v = v / m["fx"]["rate"]
        vals[o["key"]] = round(v, 6)
    return {"status": "CONDITIONALLY_COMPARABLE", "values": vals, "_raw": raw}

def _evaluate_raw(r, e):
    res = _evaluate(r, e)
    return res["_raw"]

def evaluate_pair(r, a, b):
    ra, rb = evaluate(r, a), evaluate(r, b)
    for side, res in (("a", ra), ("b", rb)):
        if res["status"] != "CONDITIONALLY_COMPARABLE": return {"status": res["status"], "reason": f"{side}:{res['reason']}"}
    pa, pb = a["meta"]["period"], b["meta"]["period"]
    if pa["kind"] != pb["kind"] or pa["start"] != pb["start"] or pa["end"] != pb["end"]: return {"status": "NOT_COMPARABLE", "reason": "period_not_homogeneous"}
    for f in r["pair_homogeneous_fields"]:
        if a["meta"].get(f) != b["meta"].get(f): return {"status": "NOT_COMPARABLE", "reason": f"pair_not_homogeneous:{f}"}
    if a.get("policy") != b.get("policy"): return {"status": "NOT_COMPARABLE", "reason": "pair_policy_mismatch"}
    return {"status": "CONDITIONALLY_COMPARABLE", "values": {"a": ra["values"], "b": rb["values"]}}

# ---------------------------------------------------------------- synthetic examples
def meta(**kw):
    m = {"company": "SYNTH-A", "accounting_basis": "IFRS", "currency": "USD",
         "period": {"kind": "FY", "start": "2030-01-01", "end": "2030-12-31", "standalone": True},
         "consolidation": "consolidated", "restated_latest": True, "source_ids": ["SYNTH-SRC-1"], "input_status": "SYNTHETIC"}
    m.update(kw); return m

def defs_for(r, items):
    d = {}
    for dep in r["depends_on"]: d.update(BY[dep]["item_definitions"])
    d.update(r["item_definitions"])
    return {k: d[k] for k in items if k in d}

def ex(r, label, m, items, policy=None, item_definitions=None):
    m = dict(m); m["item_definitions"] = item_definitions if item_definitions is not None else defs_for(r, items)
    e = {"label": label, "synthetic": SY, "meta": m, "items": items}
    if policy is not None: e["policy"] = policy
    return e

SAR_AVG = {"rate": 4, "rate_type": "period_average", "source_id": "SYNTH-FX", "window_start": "2030-01-01", "window_end": "2030-12-31"}
SAR_CLOSE = {"rate": 4, "rate_type": "closing", "source_id": "SYNTH-FX", "rate_date": "2030-12-31"}
CFO_META = dict(interest_paid_classification="operating", dividends_received_classification="operating", dividends_paid_classification="financing", interest_received_classification="operating")
CAPEX_META = dict(capex_acquisitions_classification="separately_disclosed", investments_classification="separately_disclosed", e_and_e_method="successful_efforts")
EX = {
 "M01": [ex(BY["M01"], "pass_sar_gross", meta(currency="SAR", fx=SAR_AVG, royalty_presentation="gross", trading_revenue_basis="gross"), {"revenue": 1000, "royalties_excise_in_revenue": 200}),
         ex(BY["M01"], "fail_trading_basis_missing", meta(royalty_presentation="net"), {"revenue": 1000})],
 "M02": [ex(BY["M02"], "pass_us_gaap_lifo", meta(accounting_basis="US_GAAP", inventory_method="LIFO", e_and_e_method="successful_efforts", royalty_classification="operating_cost", operating_profit_definition="before_finance_costs_and_tax"),
            {"operating_profit": 500, "impairment_losses": 40, "lifo_liquidation_gain": 10, "operating_lease_interest_component": 5, "dda": 120, "operating_lease_cost": 30}),
         ex(BY["M02"], "fail_royalty_classification_missing", meta(inventory_method="replacement_cost_disclosed", e_and_e_method="successful_efforts", operating_profit_definition="before_finance_costs_and_tax"),
            {"operating_profit": 500, "impairment_losses": 40, "impairment_reversals": 0, "inventory_holding_gain": 0, "dda": 120})],
 "M03": [ex(BY["M03"], "pass_ifrs", meta(inventory_method="replacement_cost_disclosed", profit_scope="attributable_to_parent"), {"profit_attributable_to_parent": 300, "impairment_reversals_after_tax": 20, "inventory_holding_gain_after_tax": -10}),
         ex(BY["M03"], "fail_total_profit", meta(inventory_method="replacement_cost_disclosed", profit_scope="total"), {"profit_attributable_to_parent": 300, "impairment_reversals_after_tax": 0, "inventory_holding_gain_after_tax": 0})],
 "M04": [ex(BY["M04"], "fail_any", meta(), {})],
 "M05": [ex(BY["M05"], "pass_ifrs_investing_dividends", meta(**{**CFO_META, "dividends_received_classification": "investing", "interest_paid_classification": "financing"}),
            {"cfo": 770, "lease_principal_payments": 50, "interest_paid_in_financing": 30, "dividends_received_in_investing": 30}),
         ex(BY["M05"], "fail_dividends_received_classification_missing", meta(**{k: v for k, v in CFO_META.items() if k != "dividends_received_classification"}), {"cfo": 800, "lease_principal_payments": 50})],
 "M06": [ex(BY["M06"], "pass", meta(**CAPEX_META), {"payments_for_ppe": 400, "payments_for_exploration_intangibles": 20}),
         ex(BY["M06"], "fail_acquisitions_classification_missing", meta(**{k: v for k, v in CAPEX_META.items() if k != "capex_acquisitions_classification"}), {"payments_for_ppe": 400, "payments_for_exploration_intangibles": 20})],
 "M07": [ex(BY["M07"], "pass_us_gaap", meta(accounting_basis="US_GAAP", **CFO_META, **CAPEX_META), {"cfo": 900, "finance_lease_principal_payments": 10, "payments_for_ppe": 400, "payments_for_exploration_intangibles": 0}),
         ex(BY["M07"], "fail_investments_classification_combined", meta(accounting_basis="US_GAAP", **CFO_META, **{**CAPEX_META, "investments_classification": "combined_with_capex"}),
            {"cfo": 900, "finance_lease_principal_payments": 10, "payments_for_ppe": 400, "payments_for_exploration_intangibles": 0})],
 "M08": [ex(BY["M08"], "pass_sar_closing", meta(currency="SAR", fx=SAR_CLOSE, has_hybrids=False, cash_definition="cash_and_cash_equivalents"), {"borrowings": 400, "lease_liabilities": 100, "cash_and_equivalents": 300, "total_equity": 1800}),
         ex(BY["M08"], "fail_closing_rate_undated", meta(currency="SAR", fx={k: v for k, v in SAR_CLOSE.items() if k != "rate_date"}, has_hybrids=False, cash_definition="cash_and_cash_equivalents"),
            {"borrowings": 400, "lease_liabilities": 100, "cash_and_equivalents": 300, "total_equity": 1800})],
 "M09": [ex(BY["M09"], "pass", meta(capital_employed_scope="total_equity_plus_borrowings_incl_leases", opening_balance_date="2029-12-31", closing_balance_date="2030-12-31"),
            {"profit_total": 200, "finance_costs": 50, "finance_costs_tax_effect": 10, "equity_open": 900, "borrowings_open": 300, "equity_close": 1100, "borrowings_close": 300}),
         ex(BY["M09"], "fail_opening_balance_undated", meta(capital_employed_scope="total_equity_plus_borrowings_incl_leases", closing_balance_date="2030-12-31"),
            {"profit_total": 200, "finance_costs": 50, "finance_costs_tax_effect": 10, "equity_open": 900, "borrowings_open": 300, "equity_close": 1100, "borrowings_close": 300})],
 "M10": [ex(BY["M10"], "pass", meta(dividend_basis="cash_paid", dividends_paid_scope="owners_of_parent", performance_linked_separable=True, buybacks_separate=True), {"dividends_paid_parent": 250, "performance_linked_paid": 50}),
         ex(BY["M10"], "fail_received_mixed_in", meta(dividend_basis="cash_paid", dividends_paid_scope="owners_of_parent", performance_linked_separable=True, buybacks_separate=True),
            {"dividends_paid_parent": 250, "performance_linked_paid": 50, "dividends_received_in_investing": 30})],
 "M11": [ex(BY["M11"], "pass", meta(production_basis="net_entitlement", includes_equity_affiliates=False), {"liquids_kbd": 100, "gas_mmscfd": 600}, policy={"gas_scf_per_boe": 6000, "include_equity_affiliates": False}),
         ex(BY["M11"], "fail_policy_factor_missing", meta(production_basis="net_entitlement", includes_equity_affiliates=False), {"liquids_kbd": 100, "gas_mmscfd": 600}, policy={"include_equity_affiliates": False})],
 "M12": [ex(BY["M12"], "fail_any", meta(), {})],
 "M13": [ex(BY["M13"], "pass", meta(capacity_basis="net_equity_share", capacity_type="crude_distillation"), {"net_distillation_capacity_kbd": 1500}),
         ex(BY["M13"], "fail_gross", meta(capacity_basis="gross_including_jv", capacity_type="crude_distillation"), {"net_distillation_capacity_kbd": 1500})],
 "M14": [ex(BY["M14"], "fail_any", meta(), {})], "M15": [ex(BY["M15"], "fail_any", meta(), {})],
 "M16": [ex(BY["M16"], "fail_any", meta(), {})], "M17": [ex(BY["M17"], "fail_any", meta(), {})],
}
# R02-B: same economics, different IAS 7 classification
X = ex(BY["M05"], "company_x_dividends_received_in_investing", meta(company="SYNTH-X", **{**CFO_META, "dividends_received_classification": "investing"}), {"cfo": 770, "lease_principal_payments": 50, "dividends_received_in_investing": 30})
Y = ex(BY["M05"], "company_y_dividends_received_in_operating", meta(company="SYNTH-Y", **CFO_META), {"cfo": 800, "lease_principal_payments": 50})
X_NO = ex(BY["M05"], "company_x_without_disclosed_amount", meta(company="SYNTH-X", **{**CFO_META, "dividends_received_classification": "investing"}), {"cfo": 770, "lease_principal_payments": 50})
Y_DBL = ex(BY["M05"], "company_y_double_count", meta(company="SYNTH-Y", **CFO_META), {"cfo": 800, "lease_principal_payments": 50, "dividends_received_in_investing": 30})
def fcf(e):
    f = json.loads(json.dumps(e)); f["meta"].update(CAPEX_META); f["items"].update({"payments_for_ppe": 400, "payments_for_exploration_intangibles": 20})
    f["meta"]["item_definitions"] = defs_for(BY["M07"], f["items"]); f["label"] = "fcf_" + e["label"]; return f
BY["M05"]["pair_examples"] = [{"label": "same_economics_reconciled", "a": X, "b": Y}, {"label": "evidence_missing", "a": X_NO, "b": Y}, {"label": "double_count_rejected", "a": X, "b": Y_DBL}]
BY["M07"]["pair_examples"] = [{"label": "fcf_same_economics_reconciled", "a": fcf(X), "b": fcf(Y)}, {"label": "fcf_evidence_missing", "a": fcf(X_NO), "b": fcf(Y)}]

for r in R:
    r["examples"] = EX[r["id"]]
    for e in r["examples"]:
        res = evaluate(r, e)
        e["expected"] = {k: v for k, v in res.items() if k != "_raw"}
        e["expected"]["display"] = "BLOCKED"
    for p in r["pair_examples"]:
        p["expected"] = evaluate_pair(r, p["a"], p["b"])
        p["expected"]["display"] = "BLOCKED"

# self-checks on intent (the generator refuses to emit a file whose examples contradict their labels)
for r in R:
    for e in r["examples"]:
        assert (e["expected"]["status"] == "CONDITIONALLY_COMPARABLE") == e["label"].startswith("pass"), (r["id"], e["label"], e["expected"])
assert BY["M05"]["pair_examples"][0]["expected"]["values"]["a"] == BY["M05"]["pair_examples"][0]["expected"]["values"]["b"]
assert BY["M07"]["pair_examples"][0]["expected"]["values"]["a"] == BY["M07"]["pair_examples"][0]["expected"]["values"]["b"]
assert BY["M05"]["pair_examples"][1]["expected"]["reason"] == "a:required_item_missing:dividends_received_in_investing"
assert BY["M05"]["pair_examples"][2]["expected"]["reason"] == "b:reclassification_item_conflict:dividends_received_in_investing"

if len(sys.argv) == 3 and sys.argv[1] == "--evaluate":
    # parity mode for checks/: [{"recipe": id, "a": example, "b"?: example}] -> results, nothing written
    res = []
    for c in json.load(open(sys.argv[2])):
        r = BY[c["recipe"]]
        x = evaluate_pair(r, c["a"], c["b"]) if "b" in c else evaluate(r, c["a"])
        res.append({k: v for k, v in x.items() if k != "_raw"})
    print(json.dumps(res))
    sys.exit(0)

out = {
 "schema": "marefa-web08b06-comparability-recipes/2",
 "supersedes": "marefa-web08b06-comparability-recipes/1 (implementation 5050295)",
 "status": "METHODOLOGY_PROPOSAL_NOT_APPROVED",
 "rule": "Default NOT_COMPARABLE. A cell is CONDITIONALLY_COMPARABLE only if every generic check, every allow-listed definition, every policy requirement and every metric condition passes, every used item is a finite number with its declared definition, no item of an inapplicable reclassification path or forbidden item is supplied, and all guards hold. Nothing is defaulted. Display is BLOCKED for every cell in B06.",
 "check_order": ["source", "accounting_basis", "consolidation", "restated_latest", "period (kind, real dates, order, duration, stand-alone quarter, TTM components, balance dates)", "currency and FX (supported currency, no FX for USD, rate > 0, source, basis per measure, average window = period / closing date = period end)", "not-reconcilable metric", "definitions (allow-lists)", "policy requirements", "metric conditions", "forbidden items", "dependencies", "items (present, numeric, declared definition)", "reclassification conflicts", "guards", "FX conversion"],
 "pair_rule": "Two cells compare only if both pass, period kind/start/end are equal, the recipe's homogeneity fields are equal and the policy objects are equal.",
 "examples_note": SY + ". Expected results computed here and re-derived by the independent evaluator in checks/.",
 "aramco_inputs": "Aramco cells use B02 identities, all WITHHELD (142); comparability never changes withholding.",
 "recipes": R,
}
json.dump(out, open(sys.argv[1], "w"), ensure_ascii=False, indent=1)
open(sys.argv[1], "a").write("\n")
print(len(R), sum(len(r["examples"]) for r in R), sum(len(r["pair_examples"]) for r in R))
