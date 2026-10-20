"""Measure the contract-derivation batch on a disposable copy of the engine DB.

usage: measure_derivations.py <engine-src> <copy.sqlite3> <company_id> <out.json>
Runs the engine's Calculator over the company's current reported facts, publishes only the
metrics that the new formulas add (those not produced by the b70254e calculator and not
already current) through the engine's own publish_batch, and prints the values.
Never point it at the original database.
"""
import importlib.util, json, subprocess, sys
from decimal import Decimal
from pathlib import Path

engine_src, db_path, company_id, out_path = sys.argv[1:5]
assert "/scratchpad/" in str(Path(db_path).resolve()), "refusing to write outside the scratchpad"
sys.path.insert(0, engine_src)
from finengine.database import Database  # noqa: E402
from finengine.calculations import Calculator  # noqa: E402

# The accepted b70254e calculator, loaded side by side, attributes each new metric to the batch.
baseline_source = subprocess.run(["git", "-C", engine_src, "show", "b70254e:src/finengine/calculations.py"],
                                 capture_output=True, text=True, check=True).stdout
spec = importlib.util.spec_from_loader("finengine.calculations_b70254e", loader=None)
baseline = importlib.util.module_from_spec(spec)
baseline.__package__ = "finengine"
exec(compile(baseline_source, "calculations_b70254e.py", "exec"), baseline.__dict__)

db = Database(db_path)
current = {row[0] for row in db.conn.execute(
    "SELECT DISTINCT metric_key FROM data_points WHERE company_id=? AND is_current=1", (company_id,))}
all_metrics = {row[0] for row in db.conn.execute(
    "SELECT DISTINCT metric_key FROM data_points WHERE company_id=? AND is_current=1", (company_id,))}
facts = [fact for fact in db.calculation_history(company_id, all_metrics) if not fact.is_calculated]
industry = db.conn.execute("SELECT industry FROM companies WHERE company_id=?", (company_id,)).fetchone()[0]
new_out = Calculator().calculate(facts, [], industry=industry)
old_out = baseline.Calculator().calculate(facts, [])
old_keys = {(f.metric, f.period_end, f.period_kind) for f in old_out}
added = [f for f in new_out if (f.metric, f.period_end, f.period_kind) not in old_keys and f.metric not in current]
states = db.publish_batch(added)
db.conn.commit()
rows = [{"metric": f.metric, "period_kind": f.period_kind.value, "period_end": f.period_end,
         "value": str(f.value.quantize(Decimal("0.000001"))), "unit": f.unit, "formula": f.calculation}
        for f in sorted(added, key=lambda f: (f.metric, f.period_end))]
json.dump({"company_id": company_id, "industry": industry, "reported_facts_in": len(facts), "published": len(added),
           "states": {s: states.count(s) for s in set(states)}, "new_keys": sorted({f.metric for f in added}),
           "values": rows}, open(out_path, "w"), indent=2)
for row in rows:
    print(f"{row['metric']:34s} {row['period_kind']:7s} {row['period_end']}  {row['value']:>22s}  {row['formula']}")
print("new keys:", len({f.metric for f in added}), "published rows:", len(added))
