"""P01-14 reproducible probe: 18-topic readiness + company_page capabilities.

Read-only against a *copy* of the engine DB. Never point it at a production DB.

    python3 -I p01_14_probe.py <engine_repo> <db_copy> [SYMBOL ...]

The engine's bundled data/financial.sqlite3 predates the current schema, so
the copy is migrated by opening it with finengine.database.Database first.
"""
import json
import sys

engine, db_path, *symbols = sys.argv[1:]
sys.path.insert(0, engine + "/src")

from finengine.database import Database  # noqa: E402
from finengine.query import FinancialQueryService  # noqa: E402
from finengine.understanding import refresh_company_understanding  # noqa: E402

symbols = symbols or ["2222", "2010", "1120", "1180", "1010", "1050",
                      "1060", "1080", "1140", "1150", "1020", "1030"]
db = Database(db_path)
out = {}
for sym in symbols:
    readiness = refresh_company_understanding(db.conn, "sa:" + sym.lower())
    db.conn.commit()
    page = FinancialQueryService(db_path).company_page("SA", sym)
    out[sym] = {
        "total_score": str(readiness["total_score"]),
        "readiness_state": readiness["readiness_state"],
        "blocking_reasons": readiness["blocking_reasons"],
        "categories": {c["category_key"]: c["status"] for c in readiness["categories"]},
        "capabilities": page["capabilities"],
    }
json.dump(out, sys.stdout, ensure_ascii=False, indent=1, default=str)
