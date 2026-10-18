"""Event 122: scenarios to 95 with each exclusion checked against its category's own contract rule.
Reads $OUT/catalog-2222.json, $OUT/rerun-2222.json and the field classes of $OUT/plan95.json; writes $OUT/plan95_v2.json.
No exclusion is accepted here: an 'eligible' candidate still needs a reviewed company_field_availability record."""
import json, os
O = os.environ["OUT"]
cat = json.load(open(f"{O}/catalog-2222.json"))
ev = json.load(open(f"{O}/rerun-2222.json"))["eval"]
cls = {f: v["cls"] for f, v in json.load(open(f"{O}/plan95.json"))["fields"].items()}
CATS = {c["category_key"]: dict(w=float(c["weight"]), t=float(c["threshold"]),
                                groups=[g for g in c["evidence"]["field_groups"] if g in cat])
        for c in ev["categories"] if c["category_key"] != "sources_lineage_freshness"}
cats_of = lambda g: [k for k, c in CATS.items() if g in c["groups"]]

# Candidate exclusions, each with the category rule it relies on (18-category-contract.json 1.0.0) and the verdict
# under the accepted reasons (not_disclosed with archived evidence, not_applicable / event_not_observed with a rule).
EV = "event_not_observed (corporate_actions: 'an individual action type with no historical occurrence')"
E = {}
for f in ["stock_split", "reverse_split", "spin_off", "merger", "delisting", "symbol_change", "tender_offer", "suspension",
          "rights_issue", "rights_offering_date", "capital_reduction", "treasury_share_sale"]:
    E[f] = ("eligible_by_rule", EV, "issuer history proving no occurrence since listing; treasury_share_sale and capital_reduction need a check of the treasury-share programme")
E["cik"] = ("needs_company_pack_flag", "company_profile not_applicable determined_by company_pack_flag", "a company-pack flag 'not an SEC registrant'; no company pack exists")
E["discontinued_operations_income"] = ("eligible_if_evidenced", "financial_statements event_not_observed (field_level_structural_flag)", "statements showing no discontinued operation in the period (check held-for-sale PRefChem)")
E["gross_profit"] = ("eligible_if_evidenced", "financial_statements unavailable: not_disclosed", "archived statements showing no gross-profit line; no derivation by Marefa")
for f in ["book_to_bill_ratio", "contract_renewal_profile", "contracted_sales_value", "contracted_sales_volume", "minimum_volume_commitments",
          "sales_contract_count", "sales_order_backlog", "take_or_pay_commitments"]:
    E[f] = ("eligible_if_evidenced", "segments unavailable: not_disclosed (field-level not_applicable is not offered by this category)", "archived annual report searched; reviewer and evidence note")
E["special_dividend"] = ("needs_review", "dividends event_not_observed (company_history)", "decide whether performance-linked dividends are special dividends; not assumed")
for f in ["production_entitlement", "finding_development_cost_per_boe", "reserve_replacement_ratio"]:
    E[f] = ("eligible_if_evidenced", "operational_kpis unavailable: not_disclosed", "archived annual report searched; reviewer")
for f in ["dividend_cagr_10y", "eps_cagr_10y", "free_cash_flow_cagr_10y", "net_income_cagr_10y", "operating_cash_flow_cagr_10y",
          "revenue_cagr_10y", "total_return_10y"]:
    E[f] = ("eligible_by_rule", "calculated_smart_metrics not_applicable determined_by input_window_length ('a 10-year CAGR' needing longer history than the company has listed)", "listing date 2019-12-11 from the archived prospectus or exchange record")
NOT_ELIGIBLE = {"litigation": "announcements allows only retrieval_blocked / pending_extraction or a sector_pack_flag; must be populated from disclosures",
                "regulatory_action": "same rule as litigation; must be populated"}
fields = {}
for g, v in cat.items():
    for f in v["missing"]:
        c = cls[f]
        if f in NOT_ELIGIBLE: c = "A"
        if f in E: c = "X"            # exclusion candidate (never filled)
        fields[f] = {"group": g, "cls": c}
base = {g: len(v["present"]) for g, v in cat.items()}

def score(pop, excl):
    tot, per = 2.0, {}
    for k, c in CATS.items():
        e = sum(len(cat[g]["expected"]) - excl.get(g, 0) for g in c["groups"])
        p = sum(pop[g] for g in c["groups"])
        per[k] = (p, e, p / e if e else 1.0); tot += c["w"] * per[k][2]
    return tot, per

def run(allowed, excl_states):
    excl = {}
    for f, v in fields.items():
        if v["cls"] == "X" and E[f][0] in excl_states: excl[v["group"]] = excl.get(v["group"], 0) + 1
    def val(f):
        return sum(CATS[k]["w"] / sum(len(cat[x]["expected"]) - excl.get(x, 0) for x in CATS[k]["groups"]) for k in cats_of(fields[f]["group"]))
    cand = sorted([f for f in fields if fields[f]["cls"] in allowed], key=lambda f: -val(f))
    pop, chosen = dict(base), []
    while True:
        _, per = score(pop, excl); failing = [k for k, (p, e, s) in per.items() if s + 1e-12 < CATS[k]["t"]]
        pick = next((f for f in cand if f not in chosen and any(k in failing for k in cats_of(fields[f]["group"]))), None) if failing else None
        if pick is None: break
        chosen.append(pick); pop[fields[pick]["group"]] += 1
    while score(pop, excl)[0] < 95:
        pick = next((f for f in cand if f not in chosen), None)
        if pick is None: break
        chosen.append(pick); pop[fields[pick]["group"]] += 1
    tot, per = score(pop, excl)
    popm = dict(base)
    for f, v in fields.items():
        if v["cls"] in allowed: popm[v["group"]] += 1
    tmax, perm = score(popm, excl)
    return dict(reached=round(tot, 5), max=round(tmax, 5), weighted_95=tot >= 95,
                thresholds_failing=[k for k, (p, e, s) in per.items() if s + 1e-12 < CATS[k]["t"]],
                thresholds_failing_at_max=[k for k, (p, e, s) in perm.items() if s + 1e-12 < CATS[k]["t"]],
                added=len(chosen), added_by_class={c: sum(1 for f in chosen if fields[f]["cls"] == c) for c in "ABC"},
                exclusions=sum(excl.values()), chosen=chosen)

ALL = {"eligible_by_rule", "eligible_if_evidenced", "needs_company_pack_flag", "needs_review"}
SC = {
    "V1 issuer documents + computation, no licence, no exclusion": run(set("AB"), set()),
    "V2 V1 + licensed/authorised feeds": run(set("ABC"), set()),
    "V3 V1 + rule-eligible exclusions only": run(set("AB"), {"eligible_by_rule"}),
    "V4 V2 + rule-eligible exclusions only": run(set("ABC"), {"eligible_by_rule"}),
    "V5 V2 + rule-eligible + evidence-dependent exclusions": run(set("ABC"), {"eligible_by_rule", "eligible_if_evidenced"}),
    "V6 V2 + every candidate (incl. pack flag and review)": run(set("ABC"), ALL),
}
for k, v in SC.items():
    print(f"{k}: reached={v['reached']} max={v['max']} added={v['added']} {v['added_by_class']} excl={v['exclusions']} failing={v['thresholds_failing']} failing_at_max={v['thresholds_failing_at_max']}")
json.dump({"exclusion_candidates": {f: dict(zip(("verdict", "rule", "evidence_needed"), E[f]), group=fields[f]["group"]) for f in E},
           "not_eligible": NOT_ELIGIBLE, "scenarios": SC, "fields": fields}, open(f"{O}/plan95_v2.json", "w"), indent=1)

def run_min_c(excl_states):
    """Fewest licensed (C) fields first, then fewest fields: thresholds and 95 met with A/B before any C."""
    excl = {}
    for f, v in fields.items():
        if v["cls"] == "X" and E[f][0] in excl_states: excl[v["group"]] = excl.get(v["group"], 0) + 1
    def val(f):
        return sum(CATS[k]["w"] / sum(len(cat[x]["expected"]) - excl.get(x, 0) for x in CATS[k]["groups"]) for k in cats_of(fields[f]["group"]))
    ab = sorted([f for f in fields if fields[f]["cls"] in "AB"], key=lambda f: -val(f))
    cc = sorted([f for f in fields if fields[f]["cls"] == "C"], key=lambda f: -val(f))
    pop, chosen = dict(base), []
    for f in ab: chosen.append(f); pop[fields[f]["group"]] += 1          # every non-licensed field first
    def failing():
        _, per = score(pop, excl); return [k for k, (p, e, s) in per.items() if s + 1e-12 < CATS[k]["t"]]
    while failing():
        pick = next((f for f in cc if f not in chosen and any(k in failing() for k in cats_of(fields[f]["group"]))), None)
        if pick is None: break
        chosen.append(pick); pop[fields[pick]["group"]] += 1
    while score(pop, excl)[0] < 95:
        pick = next((f for f in cc if f not in chosen), None)
        if pick is None: break
        chosen.append(pick); pop[fields[pick]["group"]] += 1
    tot, per = score(pop, excl)
    nC = [f for f in chosen if fields[f]["cls"] == "C"]
    return dict(reached=round(tot, 5), licensed_needed=len(nC), licensed_fields=nC, total_added=len(chosen),
                thresholds_failing=[k for k, (p, e, s) in per.items() if s + 1e-12 < CATS[k]["t"]], exclusions=sum(excl.values()))
MINC = {"V4 rule-eligible exclusions": run_min_c({"eligible_by_rule"}),
        "V5 rule-eligible + evidence-dependent": run_min_c({"eligible_by_rule", "eligible_if_evidenced"}),
        "V6 every candidate": run_min_c(ALL)}
for k, v in MINC.items():
    print(f"MIN-C {k}: reached={v['reached']} licensed_needed={v['licensed_needed']} total_added={v['total_added']} excl={v['exclusions']} failing={v['thresholds_failing']}")
    print("   licensed fields:", v["licensed_fields"])
d = json.load(open(f"{O}/plan95_v2.json")); d["min_licensed"] = MINC; json.dump(d, open(f"{O}/plan95_v2.json", "w"), indent=1)
