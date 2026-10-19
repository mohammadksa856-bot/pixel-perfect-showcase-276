"""W0 private QA: build evidence-overlay.json for the four FY2025 values of the smallest integration batch.
Reads INTEGRATION-MAP.json (2fa628c) and the accepted QB1 ledger (bb02da3) from git, and the frozen fixture. The key is the full
financial identity of the payload row (schema 2: company, metric, period kind/start/end/fiscal year/quarter, currency, unit, scale,
scope, dimensions, version, source key/content hash/url, filing type/date, amount); the script refuses to write if the payload rows
for that identity disagree, or if the payload row, the committed engine row and the ledger disagree. Writes nothing outside this folder.

Usage: python3 build_overlay.py"""
import gzip, json, os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../.."))
show = lambda c, p: subprocess.run(["git", "-C", ROOT, "show", f"{c}:{p}"], capture_output=True, check=True).stdout
MAP = json.loads(show("2fa628c", "review-delivery/ARAMCO95/INTEGRATION/INTEGRATION-MAP.json"))
LED = {r["record_id"]: r for r in json.loads(show("bb02da3", "review-delivery/ARAMCO95/QB1/FINANCIAL/FIN-EVIDENCE-LEDGER.json"))["records"]}
fx = json.loads(gzip.decompress(open(os.path.join(ROOT, "tests/fixtures/codex-20261013/2222-page.json.gz"), "rb").read()))
batch = MAP["smallest_local_batch"]["records"]
assert batch == ["FQ01-OBS-011", "FQ01-OBS-014", "FQ01-OBS-016", "FQ01-OBS-060"], batch
rows = {r["record"]: r for r in MAP["rows"]}
SNAP = {"fy": "annual", "instant": "instant"}
def payload_row(metric, kind, end):
    fin = fx["sections"]["financials"]
    hist = {"fy": "annual", "instant": "annual_position"}[kind]
    rs = [r for p in fin["history"][hist]["periods"] if p["period_end"] == end for r in p["metrics"].get(metric, [])]
    rs += [r for r in fin[SNAP[kind]]["metrics"].get(metric, []) if r["period_end"] == end and r["period_kind"] == kind]
    ident = lambda r: json.dumps({k: r[k] for k in ("value", "currency", "unit", "period_start", "fiscal_year", "fiscal_quarter", "scope",
        "dimensions", "version", "source_key", "source_url", "filed_at", "is_calculated")} | {"s": r["provenance"]["source"], "x": r["provenance"]["extraction"]["scale"]}, sort_keys=True)
    assert rs and len({ident(r) for r in rs}) == 1, (metric, end)
    return rs[0]
entries = []
for rid in batch:
    r, l = rows[rid], LED[rid]
    pl, en = r["page_payload_fixture"], r["engine_committed"]
    assert pl and pl["consistent_rows"] and (pl["version"], pl["source_key"], pl["value_sar"]) == (en["version"], en["source_key"], en["value_sar"]) == (
        l["engine"]["version"], l["engine"]["source_key"], l["engine"]["value_sar"]), rid
    c = l["comparison_with_source"]
    assert c["performed"] and c["equal"] and c["document_sha256"] == "78bb678e8e45f5c58fa1b2402ab5a29c5ad10adfda8ba5e7ee5f4d1ad76cd227", rid
    row = payload_row(r["metric_key"], r["period"]["kind"], r["period"]["end"])
    assert (row["version"], row["source_key"], row["value"]) == (pl["version"], pl["source_key"], pl["value_sar"]) and not row["is_calculated"], rid
    entries.append({"key": {"companyId": fx["company"]["company_id"], "metric": r["metric_key"], "periodKind": row["period_kind"],
                            "periodStart": row["period_start"] or None, "periodEnd": row["period_end"], "fiscalYear": row["fiscal_year"],
                            "fiscalQuarter": row["fiscal_quarter"], "currency": row["currency"], "unit": row["unit"],
                            "scale": row["provenance"]["extraction"]["scale"], "scope": row["scope"], "dimensions": row["dimensions"],
                            "version": row["version"], "sourceKey": row["source_key"], "sourceContentHash": row["provenance"]["source"]["content_hash"],
                            "sourceUrl": row["source_url"], "filingType": row["provenance"]["source"]["filing_type"], "filedAt": row["filed_at"],
                            "amount": row["value"]},
                    "evidence": {"record": rid, "document": "ARA2025", "sha256": c["document_sha256"], "pdfPage": c["pdf_page"], "printedPage": c["printed_page"],
                                 "line": c["line"], "review": "EVIDENCE_ACCEPT (QB1-A, both reviewers); not FINANCIAL_ACCEPT"}})
overlay = {"schema": "marefa-qa-evidence-overlay/2", "scope": "QA_PRIVATE",
           "fixture": {"companyId": fx["company"]["company_id"], "generatedAt": fx["generated_at"], "contractVersion": fx["contract_version"]},
           "entries": entries}
json.dump(overlay, open(os.path.join(HERE, "evidence-overlay.json"), "w"), ensure_ascii=False, indent=1)
print(json.dumps([(e["evidence"]["record"], e["key"]["metric"], e["key"]["periodEnd"], e["key"]["version"], e["key"]["sourceKey"][5:13], e["evidence"]["pdfPage"]) for e in entries]))
