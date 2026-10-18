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
           policy_requirements=None, balance_dates=False, required_definitions_by_basis=None):
    return dict(id=id, key=key, name=name, proposed_rating=rating, measure_type=measure,
                allowed_period_kinds=kinds, definition=definition, ordered_steps=steps,
                ifrs_vs_us_gaap=gaap, basis=basis, handling=handling,
                required_definitions=required_definitions or {}, failure_conditions=conditions or [],
                item_definitions=item_definitions or {}, outputs=outputs or [], depends_on=depends_on or [],
                forbidden_items=forbidden_items or [], pair_homogeneous_fields=pair_homogeneous or [],
                guards=guards or [], policy_requirements=policy_requirements or {},
                requires_balance_dates=balance_dates, required_definitions_by_basis=required_definitions_by_basis or {},
                notes=notes, examples=[], pair_examples=[])

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
# Where each lease cash flow sits in the issuer's published cash-flow statement (recorded per company, never assumed).
CFO_LEASE_DEFS = {
  "IFRS": {"lease_principal_classification": ["financing"], "lease_interest_classification": ["operating", "financing"]},
  "US_GAAP": {"operating_lease_payments_classification": ["operating"], "finance_lease_principal_classification": ["financing"],
              "finance_lease_interest_classification": ["operating"]}}
CFO_CONDS = [
  {"code": "interest_paid_classification_inconsistent_with_basis", "when": AND(USG, EQ("meta.interest_paid_classification", "financing")), "reason": "US GAAP classifies interest paid in operating activities."},
  {"code": "dividends_paid_classification_inconsistent_with_basis", "when": AND(USG, EQ("meta.dividends_paid_classification", "operating")), "reason": "US GAAP classifies dividends paid in financing activities."},
  {"code": "dividends_received_investing_under_us_gaap_not_reconcilable", "when": AND(USG, EQ("meta.dividends_received_classification", "investing")), "reason": "US GAAP investing distributions are returns of investment, not dividends from earnings; no reconciliation recipe."},
  {"code": "lease_interest_classification_differs_from_interest_paid", "when": AND(IFRS, {"op": "neq_path", "path": "meta.lease_interest_classification", "other": "meta.interest_paid_classification"}), "reason": "interest_paid_in_financing is defined to include lease interest; a split placement has no recipe."}]
CFO_ITEMS = {"cfo": "net_cash_from_operating_activities_as_reported",
             "lease_principal_payments": "ifrs16_lease_principal_payments_classified_in_financing",
             "finance_lease_principal_payments": "asc842_finance_lease_principal_payments_classified_in_financing",
             "interest_paid_in_financing": "interest_paid_incl_lease_interest_classified_in_financing",
             "dividends_received_in_investing": "dividends_received_from_investments_classified_in_investing",
             "dividends_paid_in_operating": "dividends_paid_parent_and_nci_classified_in_operating"}
CFO_AFTER_LEASES = [T("cfo"), T("lease_principal_payments", IFRS, -1), T("finance_lease_principal_payments", USG, -1),
             T("interest_paid_in_financing", EQ("meta.interest_paid_classification", "financing"), -1),
             T("dividends_received_in_investing", EQ("meta.dividends_received_classification", "investing")),
             T("dividends_paid_in_operating", EQ("meta.dividends_paid_classification", "operating"))]
CFO_POLICY = ("reported_cfo is the published IFRS/US GAAP figure, converted only; it is not comparable across frameworks and FCF never uses it. "
              "cfo_after_lease_payments is a derived research measure, not the published accounting CFO: operating cash flow with ALL lease payments (principal and interest) and all interest paid deducted, "
              "dividends received from investments included, dividends paid (parent and NCI) excluded. This target matches what ASC 842 operating-lease reporters already publish, so IFRS 16 and US GAAP finance-lease principal is moved in from financing; each cash flow is deducted exactly once "
              "(the published classification decides whether a move is needed; a move item supplied when the classification does not require it is rejected). "
              "Basis: IAS 7 permits operating or financing for interest paid and dividends paid, operating or investing for dividends received; IFRS 16 places lease principal in financing; ASC 842 places operating-lease payments and finance-lease interest in operating and finance-lease principal in financing "
              "(standards text not opened in this environment: UNVERIFIED reference). Disclosures used: the cash-flow statement lines named in item_definitions.")

R.append(recipe("M05", "cfo", "Operating cash flow: reported, and after lease payments (derived research measure)", "CONDITIONALLY_COMPARABLE", "flow", ["FY", "H1", "Q", "TTM"],
  {"numerator": "reported_cfo = published CFO. cfo_after_lease_payments = published CFO, minus lease principal (and interest) published in financing, plus dividends received published in investing, plus dividends paid published in operating", "denominator": None},
  ["Validate generic fields; classifications of interest, dividends and every lease cash flow must be recorded, in their allow-lists and consistent with the framework.",
   "reported_cfo: the published figure, converted only.",
   "cfo_after_lease_payments, IFRS: subtract lease principal (financing); if interest paid (incl. lease interest) sits in financing, subtract it; lease interest must sit with other interest paid.",
   "cfo_after_lease_payments, US GAAP: operating-lease payments and finance-lease interest are already in operating; subtract finance-lease principal (financing).",
   "If dividends received sit in investing (IFRS), add the disclosed amount; if dividends paid sit in operating (IFRS), add them back.",
   "A move item supplied when the published classification does not require it, or an unrecognised item, rejects the cell (no double deduction).",
   "Interest received outside operating -> NOT_COMPARABLE (no recipe).", "Convert at the period-average rate."],
  "IAS 7 classification choices vs ASC 230; IFRS 16 (principal financing) vs ASC 842 (operating lease payments operating, finance lease principal financing).", MON("period-average"), HANDLING,
  required_definitions=CFO_DEFS, required_definitions_by_basis=CFO_LEASE_DEFS, conditions=CFO_CONDS, item_definitions=CFO_ITEMS,
  outputs=[{"key": "reported_cfo", "kind": "monetary", "role": "reported_not_comparable", "terms": [T("cfo")]},
           {"key": "cfo_after_lease_payments", "kind": "monetary", "role": "derived_comparable", "terms": CFO_AFTER_LEASES}],
  forbidden_items=["dividends_paid_parent", "dividends_paid_nci"], notes=CFO_POLICY))

CAPEX_DEFS = {"capex_acquisitions_classification": ["separately_disclosed"], "investments_classification": ["separately_disclosed"],
              "capex_lease_treatment": ["excludes_lease_payments_and_rou_additions"],
              "e_and_e_method": ["successful_efforts", "ifrs6_successful_efforts_like"]}
R.append(recipe("M06", "capex", "Capital expenditure, cash basis", "CONDITIONALLY_COMPARABLE", "flow", ["FY", "H1", "Q", "TTM"],
  {"numerator": "Cash payments for PP&E and capitalised exploration/intangibles; acquisitions of businesses and investments in associates/JVs excluded", "denominator": None},
  ["Validate generic fields.", "Acquisitions and equity investments must be separately disclosed lines (allow-list: separately_disclosed); combined, unknown or missing -> NOT_COMPARABLE.",
   "Full-cost reporters are not accepted.", "The capex lines must exclude lease payments and non-cash right-of-use additions (leases are deducted once, in M05).",
   "Capex = PP&E payments + exploration/intangible payments.", "Convert at the period-average rate."],
  "Capitalised exploration differs with IFRS 6 vs successful efforts/full cost.", MON("period-average"), HANDLING,
  required_definitions=CAPEX_DEFS,
  item_definitions={"payments_for_ppe": "cash_payments_for_ppe", "payments_for_exploration_intangibles": "cash_payments_for_capitalised_exploration_and_intangibles"},
  outputs=[{"key": "capex_cash", "kind": "monetary", "terms": [T("payments_for_ppe"), T("payments_for_exploration_intangibles")]}],
  forbidden_items=["payments_for_acquisitions", "payments_for_equity_investments"]))

R.append(recipe("M07", "fcf", "Free cash flow after lease payments, rebuilt", "CONDITIONALLY_COMPARABLE", "flow", ["FY", "H1", "Q", "TTM"],
  {"numerator": "M05 cfo_after_lease_payments minus M06 cash capex; issuer FCF and reported_cfo are never used; leases are deducted once (inside M05), not again here", "denominator": None},
  ["Evaluate M05 on the same cell; any M05 failure is the FCF failure.", "Evaluate M06 on the same cell; any M06 failure is the FCF failure.",
   "FCF = cfo_after_lease_payments - capex_cash (both before FX conversion); no lease term here, M06 excludes lease payments.", "Convert at the period-average rate."],
  "Inherits M05 and M06.", MON("period-average"), HANDLING,
  depends_on=["M05", "M06"],
  outputs=[{"key": "fcf_rebuilt", "kind": "monetary", "terms": [T("ref:M05.cfo_after_lease_payments"), T("ref:M06.capex_cash", None, -1)]}]))

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

def check_shape(e):
    """R02-D: structure is validated before any property is read; malformed data is NOT_COMPARABLE, not an exception."""
    if not isinstance(e, dict): fail("input_malformed:example")
    if not isinstance(e.get("meta"), dict): fail("input_malformed:meta")
    if not isinstance(e.get("items"), dict): fail("input_malformed:items")
    if "policy" in e and not isinstance(e["policy"], dict): fail("input_malformed:policy")
    m = e["meta"]
    if "period" in m and not isinstance(m["period"], dict): fail("input_malformed:meta.period")
    if "fx" in m and not isinstance(m["fx"], dict): fail("input_malformed:meta.fx")
    d = m.get("item_definitions")
    if "item_definitions" in m and (not isinstance(d, dict) or not all(isinstance(v, str) for v in d.values())): fail("input_malformed:meta.item_definitions")

def finite(v):
    """R02-E: every intermediate and final value must stay finite."""
    if not math.isfinite(v): fail("non_finite_result")
    return v

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
            total = finite(total + t["sign"] * refs[expr[4:]]); continue
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
        total = finite(total + t["sign"] * calc(expr, env))
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
            op, w = nxt(), atom()
            if op == "/" and w == 0: fail("non_finite_result")
            v = finite(v * w if op == "*" else v / w)
        return v
    def add():
        v = mul()
        while peek() in ("+", "-"):
            v = finite(v + mul() if nxt() == "+" else v - mul())
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

def _evaluate(r, e, top=True):
    if r["proposed_rating"] == "OUT_OF_SCOPE_B06": return {"status": "OUT_OF_SCOPE_B06", "reason": "out_of_scope_b06"}
    check_shape(e)
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
    for f, allowed in r["required_definitions_by_basis"].get(m["accounting_basis"], {}).items():
        if f not in m or m[f] is None: fail(f"definition_missing:{f}")
        if m[f] not in allowed or isinstance(m[f], bool) != any(isinstance(a, bool) for a in allowed): fail(f"definition_not_accepted:{f}")
    for k, kind in r["policy_requirements"].items():
        v = e.get("policy", {}).get(k)
        if v is None: fail(f"policy_missing:{k}")
        if (kind == "positive_number" and (not is_num(v) or v <= 0)) or (kind == "boolean" and not isinstance(v, bool)): fail(f"policy_invalid:{k}")
    for c in r["failure_conditions"]:
        if holds(c["when"], ctx): fail(c["code"])
    for it in r["forbidden_items"] + [x for dep in r["depends_on"] for x in BY[dep]["forbidden_items"]]:
        if it in e["items"]: fail(f"item_not_allowed:{it}")
    if top:  # a dependency sees the dependant's full item set; recognition is checked once, against the union
        known = set(r["item_definitions"])
        for dep in r["depends_on"]: known |= set(BY[dep]["item_definitions"])
        for it in sorted(e["items"]):
            if it not in known: fail(f"item_not_recognised:{it}")
    refs = {}
    for dep in r["depends_on"]:
        res = _evaluate_raw(BY[dep], e)
        for k, v in res.items(): refs[f"{dep}.{k}"] = v
    used, raw = set(), {}
    for o in r["outputs"]:
        if o["kind"] == "ratio":
            num = terms_value(o["numerator"], r, e, refs, used); den = terms_value(o["denominator"], r, e, refs, used)
            if den <= 0: fail("denominator_not_positive")
            raw[o["key"]] = finite(num / den)
        else:
            raw[o["key"]] = terms_value(o["terms"], r, e, refs, used)
    for it in sorted(all_term_items(r) - used):
        if it in e["items"]: fail(f"reclassification_item_conflict:{it}")
    for g in r["guards"]:
        if g["part"] == "value" and raw[g["output"]] < g["min"]: fail(g["code"])
    vals = {}
    for o in r["outputs"]:
        v = raw[o["key"]]
        if o["kind"] == "monetary" and m["currency"] != "USD": v = finite(v / m["fx"]["rate"])
        vals[o["key"]] = finite(v if abs(v) >= 1e15 else round(v, 6))
    return {"status": "CONDITIONALLY_COMPARABLE", "values": vals, "_raw": raw}

def _evaluate_raw(r, e):
    res = _evaluate(r, e, top=False)
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
CFO_META = dict(interest_paid_classification="operating", dividends_received_classification="operating", dividends_paid_classification="financing", interest_received_classification="operating",
                lease_principal_classification="financing", lease_interest_classification="operating")
CFO_META_US = dict(interest_paid_classification="operating", dividends_received_classification="operating", dividends_paid_classification="financing", interest_received_classification="operating",
                   operating_lease_payments_classification="operating", finance_lease_principal_classification="financing", finance_lease_interest_classification="operating")
CAPEX_META = dict(capex_acquisitions_classification="separately_disclosed", investments_classification="separately_disclosed", e_and_e_method="successful_efforts",
                  capex_lease_treatment="excludes_lease_payments_and_rou_additions")
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
 "M05": [ex(BY["M05"], "pass_ifrs_investing_dividends", meta(**{**CFO_META, "dividends_received_classification": "investing", "interest_paid_classification": "financing", "lease_interest_classification": "financing"}),
            {"cfo": 770, "lease_principal_payments": 50, "interest_paid_in_financing": 30, "dividends_received_in_investing": 30}),
         ex(BY["M05"], "fail_dividends_received_classification_missing", meta(**{k: v for k, v in CFO_META.items() if k != "dividends_received_classification"}), {"cfo": 800, "lease_principal_payments": 50})],
 "M06": [ex(BY["M06"], "pass", meta(**CAPEX_META), {"payments_for_ppe": 400, "payments_for_exploration_intangibles": 20}),
         ex(BY["M06"], "fail_acquisitions_classification_missing", meta(**{k: v for k, v in CAPEX_META.items() if k != "capex_acquisitions_classification"}), {"payments_for_ppe": 400, "payments_for_exploration_intangibles": 20})],
 "M07": [ex(BY["M07"], "pass_us_gaap", meta(accounting_basis="US_GAAP", **CFO_META_US, **CAPEX_META), {"cfo": 900, "finance_lease_principal_payments": 10, "payments_for_ppe": 400, "payments_for_exploration_intangibles": 0}),
         ex(BY["M07"], "fail_investments_classification_combined", meta(accounting_basis="US_GAAP", **CFO_META_US, **{**CAPEX_META, "investments_classification": "combined_with_capex"}),
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
# R02-B / R02-C: one synthetic economy, published under different classifications. Reported figures are
# derived from the economy below, never typed; the comparable measure must come out equal for every variant.
ECON = {"operating_cash_before_listed_flows": 900, "dividends_received": 30, "lease_principal": 50, "lease_interest": 10,
        "other_interest_paid": 20, "dividends_paid": 100}
def published(label, basis, interest="operating", div_rec="operating", div_paid="financing", us_leases="operating"):
    """Build a published cash-flow view of ECON under the given classifications."""
    k = ECON; it = {}
    cfo = k["operating_cash_before_listed_flows"]
    cfo += k["dividends_received"] if div_rec == "operating" else 0
    cfo -= k["dividends_paid"] if div_paid == "operating" else 0
    if basis == "IFRS":
        cfo -= (k["lease_interest"] + k["other_interest_paid"]) if interest == "operating" else 0
        it["lease_principal_payments"] = k["lease_principal"]
        if interest == "financing": it["interest_paid_in_financing"] = k["lease_interest"] + k["other_interest_paid"]
        m = {**CFO_META, "interest_paid_classification": interest, "lease_interest_classification": interest}
    else:
        cfo -= k["lease_interest"] + k["other_interest_paid"]
        if us_leases == "operating": cfo -= k["lease_principal"]; it["finance_lease_principal_payments"] = 0
        else: it["finance_lease_principal_payments"] = k["lease_principal"]
        m = dict(CFO_META_US)
    if div_rec == "investing": it["dividends_received_in_investing"] = k["dividends_received"]
    if div_paid == "operating": it["dividends_paid_in_operating"] = k["dividends_paid"]
    m.update(dividends_received_classification=div_rec, dividends_paid_classification=div_paid)
    it["cfo"] = cfo
    return ex(BY["M05"], label, meta(company="SYNTH-" + label.upper(), accounting_basis=basis, **m), it)
X = published("x_ifrs_dividends_received_in_investing", "IFRS", div_rec="investing")
Y = published("y_ifrs_dividends_received_in_operating", "IFRS")
U = published("u_us_gaap_operating_leases", "US_GAAP")
X_NO = json.loads(json.dumps(X)); X_NO["label"] = "x_without_disclosed_amount"; del X_NO["items"]["dividends_received_in_investing"]; del X_NO["meta"]["item_definitions"]["dividends_received_in_investing"]
Y_DBL = json.loads(json.dumps(Y)); Y_DBL["label"] = "y_double_count"; Y_DBL["items"]["dividends_received_in_investing"] = ECON["dividends_received"]
Y_DBL["meta"]["item_definitions"]["dividends_received_in_investing"] = BY["M05"]["item_definitions"]["dividends_received_in_investing"]
def fcf(e):
    f = json.loads(json.dumps(e)); f["meta"].update(CAPEX_META); f["items"].update({"payments_for_ppe": 400, "payments_for_exploration_intangibles": 20})
    f["meta"]["item_definitions"] = defs_for(BY["M07"], f["items"]); f["label"] = "fcf_" + e["label"]; return f
BY["M05"]["pair_examples"] = [{"label": "same_economics_reconciled", "a": X, "b": Y}, {"label": "ifrs_vs_us_gaap_leases_reconciled", "a": Y, "b": U},
                              {"label": "evidence_missing", "a": X_NO, "b": Y}, {"label": "double_count_rejected", "a": X, "b": Y_DBL}]
BY["M07"]["pair_examples"] = [{"label": "fcf_same_economics_reconciled", "a": fcf(X), "b": fcf(Y)}, {"label": "fcf_ifrs_vs_us_gaap_leases_reconciled", "a": fcf(Y), "b": fcf(U)},
                              {"label": "fcf_evidence_missing", "a": fcf(X_NO), "b": fcf(Y)}]

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
for p in BY["M05"]["pair_examples"][:2]:
    v = p["expected"]["values"]; assert v["a"]["cfo_after_lease_payments"] == v["b"]["cfo_after_lease_payments"], p["label"]
for p in BY["M07"]["pair_examples"][:2]:
    v = p["expected"]["values"]; assert v["a"] == v["b"], p["label"]
assert "cfo_norm" not in json.dumps(BY["M07"]["outputs"]) and "reported_cfo" not in json.dumps(BY["M07"]["outputs"])
assert BY["M05"]["pair_examples"][2]["expected"]["reason"] == "a:required_item_missing:dividends_received_in_investing"
assert BY["M05"]["pair_examples"][3]["expected"]["reason"] == "b:reclassification_item_conflict:dividends_received_in_investing"

if len(sys.argv) == 3 and sys.argv[1] == "--evaluate":
    # parity mode for checks/: [{"recipe": id, "a": example, "b"?: example}] -> results, nothing written
    res = []
    for c in json.load(open(sys.argv[2])):
        r = BY[c["recipe"]]
        x = evaluate_pair(r, c["a"], c["b"]) if "b" in c else evaluate(r, c["a"])
        res.append({k: v for k, v in x.items() if k != "_raw"})
    print(json.dumps(res, allow_nan=False))
    sys.exit(0)

out = {
 "schema": "marefa-web08b06-comparability-recipes/3",
 "supersedes": "marefa-web08b06-comparability-recipes/2 (implementation a267e0c); field changes in COMPATIBILITY-MAP.json",
 "status": "METHODOLOGY_PROPOSAL_NOT_APPROVED",
 "rule": "Default NOT_COMPARABLE. A cell is CONDITIONALLY_COMPARABLE only if every generic check, every allow-listed definition, every policy requirement and every metric condition passes, every used item is a finite number with its declared definition, no item of an inapplicable reclassification path or forbidden item is supplied, and all guards hold. Nothing is defaulted. Display is BLOCKED for every cell in B06.",
 "check_order": ["input shape (example, meta, items, policy, meta.period, meta.fx, meta.item_definitions)", "source", "accounting_basis", "consolidation", "restated_latest", "period (kind, real dates, order, duration, stand-alone quarter, TTM components, balance dates)", "currency and FX (supported currency, no FX for USD, rate > 0, source, basis per measure, average window = period / closing date = period end)", "not-reconcilable metric", "definitions (allow-lists)", "definitions by accounting basis", "policy requirements", "metric conditions", "forbidden items", "unrecognised items", "dependencies", "items (present, finite number, declared definition)", "computation with every intermediate value finite", "reclassification conflicts", "guards", "FX conversion and rounding (finite)"],
 "pair_rule": "Two cells compare only if both pass, period kind/start/end are equal, the recipe's homogeneity fields are equal and the policy objects are equal.",
 "examples_note": SY + ". Expected results computed here and re-derived by the independent evaluator in checks/.",
 "aramco_inputs": "Aramco cells use B02 identities, all WITHHELD (142); comparability never changes withholding.",
 "recipes": R,
}
json.dump(out, open(sys.argv[1], "w"), ensure_ascii=False, indent=1, allow_nan=False)
open(sys.argv[1], "a").write("\n")
print(len(R), sum(len(r["examples"]) for r in R), sum(len(r["pair_examples"]) for r in R))
