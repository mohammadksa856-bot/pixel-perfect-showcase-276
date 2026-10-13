"""WEB-01 fixture: run the engine factory-contract evaluator for 2222/1120/8010 on an ISOLATED copy of the engine DB.
Usage: python3 web_v1_factory_probe.py <engine_repo> <copy_of_financial.sqlite3> <out.json>. Never point it at the engine's own DB file:
refresh_catalog_completeness writes to the database it is given."""
import json, sys
sys.path.insert(0, sys.argv[1] + "/src")
from finengine.database import Database
from finengine.factory_contract import evaluate_factory_contract
db = Database(sys.argv[2])
out = {}
for cid in ("sa:2222", "sa:1120", "sa:8010"):
    try:
        out[cid] = evaluate_factory_contract(db, cid, contract_path=sys.argv[1] + "/config/factory/18-category-contract.json", sector_pack_dir=sys.argv[1] + "/config/factory/sector-packs")
    except Exception as e:
        out[cid] = {"error": repr(e)}
json.dump(out, open(sys.argv[3], "w"), ensure_ascii=False, indent=1)
for k, v in out.items():
    print(k, v.get("error") or (v["readiness_state"], v["total_score"][:6], v["sector_pack"], [ (c["category_key"], c["status"], c["score"][:5]) for c in v["categories"] if c["status"] in ("not_applicable",)], len(v["blocking_reasons"])))
