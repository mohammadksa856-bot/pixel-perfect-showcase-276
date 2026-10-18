"""Engine layer: run the original factory evaluator (engine b70254e, contract 1.0.0) for sa:2222 on an ISOLATED copy of
the engine DB and list every expected field per field group. Usage: ENGINE=<engine repo> OUT=<dir> python3 measure_engine.py
refresh_catalog_completeness writes to the DB it is given, so the engine's own file is copied first and never opened."""
import json, os, shutil, sqlite3, sys
E, O = os.environ["ENGINE"], os.environ["OUT"]
db_copy = os.path.join(O, "engine-copy.sqlite3")
shutil.copyfile(os.path.join(E, "data/financial.sqlite3"), db_copy)
sys.path.insert(0, os.path.join(E, "src"))
from finengine.database import Database
from finengine.factory_contract import evaluate_factory_contract
from finengine.domains import CompanyDomainStore
db = Database(db_copy)
r = evaluate_factory_contract(db, "sa:2222", contract_path=os.path.join(E, "config/factory/18-category-contract.json"),
                              sector_pack_dir=os.path.join(E, "config/factory/sector-packs"))
comp = CompanyDomainStore(db).refresh_catalog_completeness("sa:2222")
json.dump({"eval": r, "completeness": comp}, open(os.path.join(O, "rerun-2222.json"), "w"), ensure_ascii=False, indent=1, default=str)
c = sqlite3.connect(f"file:{db_copy}?mode=ro", uri=True); c.row_factory = sqlite3.Row
co = c.execute("select * from companies where company_id='sa:2222'").fetchone()
rows = c.execute("""SELECT field_key, category, storage_domain, requirement FROM data_catalog_fields WHERE enabled=1 AND review_state='reviewed' AND
 (scope_type='all' OR (scope_type='market' AND scope_value=?) OR (scope_type='sector' AND scope_value=?) OR
  (scope_type='industry' AND scope_value=?) OR (scope_type='company' AND scope_value=?))""",
                 (co["market"], co["sector"] or "", co["industry"] or "", "sa:2222")).fetchall()
miss = {x["category"]: set(x["missing"]) for x in comp["categories"]}
out = {}
for row in rows:
    g = out.setdefault(row["category"], {"expected": [], "present": [], "missing": [], "required": [], "domains": set()})
    g["expected"].append(row["field_key"]); g["domains"].add(row["storage_domain"])
    (g["missing"] if row["field_key"] in miss.get(row["category"], set()) else g["present"]).append(row["field_key"])
    if row["requirement"] == "required": g["required"].append(row["field_key"])
for g in out.values(): g["domains"] = sorted(g["domains"])
json.dump(out, open(os.path.join(O, "catalog-2222.json"), "w"), indent=1)
print("total_score", r["total_score"][:8], r["readiness_state"], "sector_pack", r["sector_pack"], "blocking", len(r["blocking_reasons"]))
