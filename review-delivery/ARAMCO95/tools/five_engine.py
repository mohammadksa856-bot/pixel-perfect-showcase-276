"""Engine values for the five FIN-QUAL-BATCH-01 metrics (no dimensions, current versions), with their source document and
any page/table locator in extracted_facts. Reads the isolated copy made by measure_engine.py; writes $OUT/five-engine.json."""
import collections, json, os, sqlite3
from decimal import Decimal, InvalidOperation
O = os.environ["OUT"]
c = sqlite3.connect(f"file:{O}/engine-copy.sqlite3?mode=ro", uri=True); c.row_factory = sqlite3.Row
M = ("revenue", "net_income", "operating_cash_flow", "cash", "total_equity")
rows = [dict(r) for r in c.execute(f"""SELECT d.*, s.content_hash, s.local_path, s.filing_type FROM data_points d
    LEFT JOIN source_documents s ON s.source_key = d.source_key
    WHERE d.company_id='sa:2222' AND d.is_current=1 AND d.metric_key IN {M}
    AND (d.dimensions_json IS NULL OR d.dimensions_json IN ('', '{{}}', 'null'))""")]
groups = collections.defaultdict(list)
for r in rows: groups[(r["metric_key"], r["period_kind"], r["period_end"])].append(r)
out = []
for (metric, kind, end), rs in sorted(groups.items(), key=lambda kv: (kv[0][0], kv[0][2], kv[0][1])):
    r = rs[0]
    hits = []
    for e in c.execute("SELECT raw_label, raw_value, scale, page, table_ref FROM extracted_facts WHERE company_id='sa:2222' AND source_key=? AND period_end=?", (r["source_key"], end)):
        try: v = Decimal(str(e["raw_value"]).replace(",", "")) * Decimal(str(e["scale"] or 1))
        except InvalidOperation: continue
        if abs(v - Decimal(r["value_decimal"])) <= Decimal(1000000): hits.append(dict(e))
    sd = c.execute("SELECT content_hash, filing_type, filed_at, local_path FROM source_documents WHERE source_key=?", (r["source_key"],)).fetchone()
    out.append({"metric": metric, "kind": kind, "end": end, "versions": len(rs),
                "rows": [{x: q[x] for x in ("value_decimal", "period_start", "fiscal_year", "fiscal_quarter", "scope", "source_key", "source_url",
                                            "filed_at", "form", "is_calculated", "content_hash", "local_path", "filing_type", "version")} for q in rs],
                "extracted": hits[:3], "source_document": dict(sd) if sd else None})
json.dump(out, open(f"{O}/five-engine.json", "w"), indent=1)
print(len(out), "metric-periods")
