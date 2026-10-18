import json, math, itertools, os
S=os.environ['OUT']
cat=json.load(open(f"{S}/catalog-2222.json"))
ev=json.load(open(f"{S}/rerun-2222.json"))['eval']
CATS={c['category_key']:dict(w=float(c['weight']),t=float(c['threshold']),groups=[g for g in c['evidence']['field_groups'] if g in cat]) for c in ev['categories'] if c['category_key']!='sources_lineage_freshness'}
# feasibility class per missing field: A issuer document / archive, B computed from engine inputs,
# C needs licensed or authorised feed or a rights decision, D candidate for a reviewed exclusion (needs approval)
C_FIELDS=set("""eps_estimate revenue_estimate ebitda_estimate ebit_estimate net_income_estimate selling_general_administrative_expense_estimate
forward_price_to_earnings peg_ratio historical_pe_percentile historical_pb_percentile
average_volume_30d beta_1y beta_5y fifty_two_week_high fifty_two_week_low free_float_market_cap free_float_shares market_return_1m market_return_1y market_return_3m market_return_3y market_return_5y market_return_6m market_return_ytd percent_from_52w_high percent_from_52w_low previous_close price_adjusted_close volatility_30d
price_to_sma_200d price_to_sma_50d simple_moving_average_200d simple_moving_average_50d total_return_10y total_return_1y total_return_3y total_return_5y
sharia_status institutional_ownership retail_ownership institutional_shareholders_count retail_shareholders_count foreign_ownership foreign_investor_limit
""".split())
D_FIELDS=set("""cik discontinued_operations_income gross_profit
dividend_cagr_10y eps_cagr_10y free_cash_flow_cagr_10y net_income_cagr_10y operating_cash_flow_cagr_10y revenue_cagr_10y
book_to_bill_ratio sales_order_backlog contract_renewal_profile contracted_sales_value contracted_sales_volume sales_contract_count minimum_volume_commitments take_or_pay_commitments
stock_split reverse_split spin_off merger delisting symbol_change tender_offer suspension rights_issue rights_offering_date capital_reduction treasury_share_sale
special_dividend regulatory_action litigation
production_entitlement finding_development_cost_per_boe reserve_replacement_ratio
""".split())
B_GROUPS={"profitability","liquidity_solvency","efficiency","growth","per_share","valuation","investor_analytics","dividends"}
B_EXTRA=set("discretionary_cash_flow owner_earnings operating_profit_before_working_capital_changes".split())
def cls(f,g):
    if f in C_FIELDS: return "C"
    if f in D_FIELDS: return "D"
    if g in B_GROUPS or f in B_EXTRA: return "B"
    return "A"
fields={}
for g,v in cat.items():
    for f in v['missing']: fields[f]={'group':g,'cls':cls(f,g)}
def cats_of(g): return [k for k,c in CATS.items() if g in c['groups']]
def score(pop):  # pop: dict group->populated count; returns total, per-cat
    tot=2.0; per={}
    for k,c in CATS.items():
        e=sum(len(cat[g]['expected']) for g in c['groups']); p=sum(pop[g] for g in c['groups'])
        per[k]=(p,e,p/e); tot+=c['w']*p/e
    return tot,per
base={g:len(v['present']) for g,v in cat.items()}
def value(f):
    g=fields[f]['group']; return sum(CATS[k]['w']/sum(len(cat[x]['expected']) for x in CATS[k]['groups']) for k in cats_of(g))
def solve(allowed):
    pop=dict(base); chosen=[]
    cand=sorted([f for f in fields if fields[f]['cls'] in allowed], key=lambda f:-value(f))
    # thresholds first: repeatedly add the highest-value candidate that belongs to a failing category
    while True:
        _,per=score(pop); failing=[k for k,(p,e,s) in per.items() if s+1e-12<CATS[k]['t']]
        if not failing: break
        pick=next((f for f in cand if f not in chosen and any(k in failing for k in cats_of(fields[f]['group']))),None)
        if pick is None: break
        chosen.append(pick); pop[fields[pick]['group']]+=1
    while score(pop)[0]<95:
        pick=next((f for f in cand if f not in chosen),None)
        if pick is None: break
        chosen.append(pick); pop[fields[pick]['group']]+=1
    tot,per=score(pop)
    fail=[k for k,(p,e,s) in per.items() if s+1e-12<CATS[k]['t']]
    return tot,per,chosen,fail
print("missing unique fields", len(fields), {c:sum(1 for f in fields.values() if f['cls']==c) for c in "ABCD"})
print("expected slots", sum(sum(len(cat[g]['expected']) for g in c['groups']) for c in CATS.values()), "present slots", sum(sum(base[g] for g in c['groups']) for c in CATS.values()))
out={}
for name,allowed in [("all_classes","ABCD"),("A+B (no licence, no exclusion)","AB"),("A+B+C (licences approved, no exclusion)","ABC")]:
    tot,per,ch,fail=solve(set(allowed))
    slots=sum(len(cats_of(fields[f]['group'])) for f in ch)
    print(f"\n== {name}: total={tot:.3f} fields_added={len(ch)} (slot increments {slots}) thresholds_failing={fail}")
    for k,(p,e,s) in per.items(): print(f"   {k:26} {p}/{e} = {s:.4f} thr {CATS[k]['t']}")
    out[name]=dict(total=tot,added=ch,failing=fail,per={k:list(v) for k,v in per.items()})
# max reachable per scenario (add everything allowed)
for name,allowed in [("max A+B","AB"),("max A+B+C","ABC"),("max A+B+C+D","ABCD")]:
    pop=dict(base)
    for f,v in fields.items():
        if v['cls'] in allowed: pop[v['group']]+=1
    t,per=score(pop); fail=[k for k,(p,e,s) in per.items() if s+1e-12<CATS[k]['t']]
    print(f"{name}: max total {t:.3f}; thresholds failing {fail}")
    out[name]=dict(total=t,failing=fail)
json.dump({"fields":fields,"scenarios":out,"cats":CATS},open(f"{S}/plan95.json","w"),indent=1)

print("\n\n######## exclusion-aware scenarios (D = reviewed exclusion removes the slot, never fills it)")
def score2(pop, excl):
    tot=2.0; per={}
    for k,c in CATS.items():
        e=sum(len(cat[g]['expected'])-excl.get(g,0) for g in c['groups']); p=sum(pop[g] for g in c['groups'])
        per[k]=(p,e,p/e if e else 1.0); tot+=c['w']*per[k][2]
    return tot,per
def solve2(allowed, exclude_D):
    excl={}
    if exclude_D:
        for f,v in fields.items():
            if v['cls']=='D': excl[v['group']]=excl.get(v['group'],0)+1
    pop=dict(base); chosen=[]
    def val(f):
        g=fields[f]['group']
        return sum(CATS[k]['w']/sum(len(cat[x]['expected'])-excl.get(x,0) for x in CATS[k]['groups']) for k in cats_of(g))
    cand=sorted([f for f in fields if fields[f]['cls'] in allowed], key=lambda f:-val(f))
    while True:
        _,per=score2(pop,excl); failing=[k for k,(p,e,s) in per.items() if s+1e-12<CATS[k]['t']]
        if not failing: break
        pick=next((f for f in cand if f not in chosen and any(k in failing for k in cats_of(fields[f]['group']))),None)
        if pick is None: break
        chosen.append(pick); pop[fields[pick]['group']]+=1
    while score2(pop,excl)[0]<95:
        pick=next((f for f in cand if f not in chosen),None)
        if pick is None: break
        chosen.append(pick); pop[fields[pick]['group']]+=1
    tot,per=score2(pop,excl); fail=[k for k,(p,e,s) in per.items() if s+1e-12<CATS[k]['t']]
    # max reachable
    popm=dict(base)
    for f,v in fields.items():
        if v['cls'] in allowed: popm[v['group']]+=1
    tmax,_=score2(popm,excl)
    return tot,per,chosen,fail,excl,tmax
res2={}
for name,allowed,ex in [("S1 A+B","AB",False),("S2 A+B+C","ABC",False),("S3 A+B + D-exclusions","AB",True),("S4 A+B+C + D-exclusions","ABC",True)]:
    tot,per,ch,fail,excl,tmax=solve2(set(allowed),ex)
    nD=sum(excl.values())
    print(f"\n== {name}: reached={tot:.3f} max_possible={tmax:.3f} added_unique={len(ch)} by class={ {c:sum(1 for f in ch if fields[f]['cls']==c) for c in 'ABC'} } exclusions={nD} failing={fail}")
    for k,(p,e,s) in per.items(): print(f"   {k:26} {p}/{e} = {s:.4f} thr {CATS[k]['t']}{'  FAIL' if k in fail else ''}")
    res2[name]=dict(reached=tot,max=tmax,added=ch,failing=fail,exclusions=nD,per={k:list(v) for k,v in per.items()})
json.dump({"fields":fields,"scenarios":res2,"cats":CATS,"base":base},open(f"{S}/plan95.json","w"),indent=1)

print("\n######## S5: A+B+C + exclusions limited to event_not_observed / not_applicable / not_disclosed (10-year history fields NOT excluded)")
HIST={"dividend_cagr_10y","eps_cagr_10y","free_cash_flow_cagr_10y","net_income_cagr_10y","operating_cash_flow_cagr_10y","revenue_cagr_10y"}
for f in HIST: fields[f]['cls']='H'   # must be filled (needs FY2015/FY2016 audited data) or stays missing
tot,per,ch,fail,excl,tmax=solve2(set("ABCH"),True)
print(f"reached={tot:.3f} max={tmax:.3f} added={len(ch)} classes={ {c:sum(1 for f in ch if fields[f]['cls']==c) for c in 'ABCH'} } exclusions={sum(excl.values())} failing={fail}")
for k,(p,e,s) in per.items(): print(f"   {k:26} {p}/{e} = {s:.4f} thr {CATS[k]['t']}{'  FAIL' if k in fail else ''}")
tot2,per2,ch2,fail2,excl2,tmax2=solve2(set("ABC"),True)
print(f"S5-without-10y-history: reached={tot2:.3f} max={tmax2:.3f} failing={fail2}")
res2["S5 A+B+C+10y + D-exclusions(no history reason)"]=dict(reached=tot,max=tmax,added=ch,failing=fail,exclusions=sum(excl.values()),per={k:list(v) for k,v in per.items()})
res2["S5b same without 10y data"]=dict(reached=tot2,max=tmax2,failing=fail2)
json.dump({"fields":fields,"scenarios":res2,"cats":CATS,"base":base},open(f"{S}/plan95.json","w"),indent=1)
