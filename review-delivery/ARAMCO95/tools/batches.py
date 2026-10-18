import json, os
S=os.environ['OUT']
P=json.load(open(f"{S}/plan95.json")); fields=P['fields']; CATS=P['cats']; base=P['base']; cat=json.load(open(f"{S}/catalog-2222.json"))
def score(pop,excl):
    tot=2.0; per={}
    for k,c in CATS.items():
        e=sum(len(cat[g]['expected'])-excl.get(g,0) for g in c['groups']); p=sum(pop[g] for g in c['groups'])
        per[k]=p/e; tot+=c['w']*per[k]
    return tot,[k for k,s in per.items() if s+1e-12<CATS[k]['t']]
FS={"income_statement","balance_sheet","cash_flow","financial_notes"}
BATCH=[
 ("A1 statements: B02 inputs + missing statement lines + 10 quarters", lambda f,v: v['cls']=='A' and v['group'] in FS),
 ("A2 segments, operations, commercial (mapping first)", lambda f,v: v['cls']=='A' and v['group'] in {"segments","commercial_pipeline","oil_gas_operations"}),
 ("A3 profile, governance, industry", lambda f,v: v['cls']=='A' and v['group'] in {"company_model","governance_profile","industry_context"}),
 ("A4 actions, disclosures, ownership (B03 + filings)", lambda f,v: v['cls']=='A' and v['group'] in {"corporate_actions","disclosures","ownership","dividends"}),
 ("A5 computed metrics (no network)", lambda f,v: v['cls']=='B'),
 ("A6 licensed / authorised feeds (after decision)", lambda f,v: v['cls']=='C'),
 ("A7 reviewed exclusions (after approval)", None),
 ("A8 10-year history (FY2016 prospectus + FY2026)", lambda f,v: v['cls']=='H'),
]
pop=dict(base); excl={}
t,f=score(pop,excl); print(f"baseline {t:.2f} failing={len(f)}")
rows=[]
for name,sel in BATCH:
    n=0
    if sel is None:
        for k,v in fields.items():
            if v['cls']=='D': excl[v['group']]=excl.get(v['group'],0)+1; n+=1
    else:
        for k,v in fields.items():
            if sel(k,v): pop[v['group']]+=1; n+=1
    t2,f2=score(pop,excl); rows.append((name,n,t2-t,t2,f2)); print(f"{name:55} n={n:3} +{t2-t:5.2f} -> {t2:6.2f} failing={f2}"); t=t2
json.dump(rows,open(f"{S}/batches.json","w"),indent=1)
