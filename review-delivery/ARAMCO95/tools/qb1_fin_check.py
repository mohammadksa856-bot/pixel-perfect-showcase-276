"""Verification and reproduction checks for QB1-A-FIN. Independent of qb1_fin_build.py where it matters: the PDF is re-read
with pypdf (the build uses pdftotext). Usage: ENGINE=<engine clone> python3 qb1_fin_check.py  (prints PASS/FAIL lines)."""
import copy, hashlib, json, os, re, sqlite3, subprocess, sys
from pypdf import PdfReader
E = os.environ["ENGINE"]
PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); ROOT = os.path.dirname(os.path.dirname(PKG))
Q = os.path.join(PKG, "QB1", "FINANCIAL")
L = json.load(open(f"{Q}/FIN-EVIDENCE-LEDGER.json"))["records"]
M = json.load(open(f"{Q}/FIN-SOURCE-MANIFEST.json")); R = json.load(open(f"{Q}/FIN-RECONCILIATIONS.json"))
FQ = json.load(open(f"{PKG}/FIN-QUAL-BATCH-01.json"))
sha = lambda b: hashlib.sha256(b).hexdigest()
fails = 0
def check(name, ok, detail=""):
    global fails
    fails += not ok
    print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail else ""))

ids = [r["record_id"] for r in L]
check("23 records, unique ids, same set as FIN-QUAL-BATCH-01", len(ids) == 23 and len(set(ids)) == 23 and set(ids) == {r["id"] for r in FQ["rows"]})
cnt = {m: sum(1 for r in L if r["engine_metric_key"] == m) for m in ("revenue", "net_income", "operating_cash_flow", "cash", "total_equity")}
check("metric counts 5/5/5/4/4", cnt == {"revenue": 5, "net_income": 5, "operating_cash_flow": 5, "cash": 4, "total_equity": 4}, str(cnt))
check("every record WITHHELD and not authorised for publication", all(r["qualification"]["state"] == "WITHHELD" and r["qualification"]["publication_authorized"] is False for r in L))
check("no record claims qualification", not any("QUALIF" in r["evidence_status"] for r in L))
import_hashes = {h for f in M["engine_import_files"] for h in (f["registered_hash"], f["current_file_hash"])}
disc = {r["designated_disclosure"]["sha256_per_b02"] for r in L} | {r["comparison_with_source"].get("document_sha256") for r in L if r["comparison_with_source"]["performed"]}
check("no import-file hash used as a disclosure hash", not (disc & import_hashes))
check("designated documents not claimed as verified here", all(not r["designated_disclosure"]["accessible_here"] and not r["designated_disclosure"]["sha256_verified_here"] for r in L))

ara = next(d for d in M["aramco_documents"] if d["key"] == "ARA2025")
path = os.path.join(E, ara["archived_in_engine"])
check("archived annual report sha256 recomputed", sha(open(path, "rb").read()) == ara["sha256"])
reader = PdfReader(path)
def numbers_on(pdf_page):
    t = reader.pages[pdf_page - 1].extract_text()
    return t, {int(x.replace(",", "")) for x in re.findall(r"\d{1,3}(?:,\d{3})+", t)}
for r in L:
    c = r["comparison_with_source"]
    if not c["performed"]: continue
    t, nums = numbers_on(c["pdf_page"])
    stmt_ok = c["statement"].lower() in t.lower()
    check(f"{r['record_id']} {r['engine_metric_key']} {r['period']['end']}: pypdf finds {c['source_value_sar_millions']:,} on PDF {c['pdf_page']} ({c['statement']})",
          stmt_ok and c["source_value_sar_millions"] in nums and c["equal"] == (c["source_value_sar_millions"] == c["engine_value_sar_millions"]))
check("ready_for_financial_review only for FY2025 rows matched in the source", all(r["ready_for_financial_review"] == (r["comparison_with_source"]["performed"] and r["comparison_with_source"]["equal"] and r["period"]["end"].startswith("2025")) for r in L))
check("rows without an accessible PDF have no comparison and say why", all(r["comparison_with_source"]["performed"] or r["comparison_with_source"].get("reason") for r in L))

r1 = next(i for i in R["issues"] if i["id"] == "R1-import-version-hash-mismatch")
ev = r1["evidence"]
old = subprocess.run(["git", "-C", E, "show", f"{ev['registered_hash_found_in_history']['commit']}:{ev['import_file']}"], capture_output=True, check=True).stdout
check("R1: registered hash reproduced from the committed history, current file hash recomputed, neither edited",
      sha(old) == ev["registered_hash"] and sha(open(os.path.join(E, ev["import_file"]), "rb").read()) == ev["current_file_hash"] and ev["registered_hash"] != ev["current_file_hash"])
check("R1 records carry the registered (not the current) hash and stay WITHHELD",
      all(r["engine"]["import_registered_hash"] == ev["registered_hash"] and r["engine"]["import_hash_matches"] is False for r in L if r["record_id"] in r1["by_state"]["committed"]))

# ---------- FIN-CORR-01 ----------
EDB = os.path.join(E, "data/financial.sqlite3")
cdb = sqlite3.connect(f"file:{EDB}?mode=ro&immutable=1", uri=True); cdb.row_factory = sqlite3.Row
CUR = """SELECT id, version, source_key, value_decimal FROM data_points WHERE company_id='sa:2222' AND is_current=1 AND metric_key=? AND period_kind=? AND period_end=?
         AND (dimensions_json IS NULL OR dimensions_json IN ('','{}','null'))"""
def wrong_rows(records):
    """Records whose cited engine row is not the committed DB's current row, even when the value is the same."""
    bad = []
    for r in records:
        row = cdb.execute(CUR, (r["engine_metric_key"], r["period"]["kind"], r["period"]["end"])).fetchall()
        if len(row) != 1 or (row[0]["id"], row[0]["version"], row[0]["source_key"], row[0]["value_decimal"]) != (
                r["engine_data_point_id"], r["engine"]["version"], r["engine"]["source_key"], r["engine"]["value_sar"]) or r["engine"]["data_point_id"] != r["engine_data_point_id"]:
            bad.append(r["record_id"])
    return bad
check("FIN-1: all 23 records cite the committed DB's current row (id, version, source, value), read immutable", not wrong_rows(L), str(wrong_rows(L)))
mut = copy.deepcopy(L); m053 = next(r for r in mut if r["record_id"] == "FQ01-OBS-053")
m053["engine_data_point_id"] = m053["engine"]["data_point_id"] = 2138
check("FIN-1 regression: a row id from the runtime-repaired copy is caught although its value is identical", wrong_rows(mut) == ["FQ01-OBS-053"])
diverge = sorted(r["record_id"] for r in L if not r["engine_runtime_repaired"]["same_row_as_committed"])
check("FIN-1: committed vs runtime-repaired state differs only for 001/004/006/053, values identical in both",
      diverge == ["FQ01-OBS-001", "FQ01-OBS-004", "FQ01-OBS-006", "FQ01-OBS-053"] and all(r["engine_runtime_repaired"]["same_value_as_committed"] for r in L),
      str({r["record_id"]: (r["engine_runtime_repaired"]["data_point_id"], r["engine_data_point_id"]) for r in L if r["record_id"] in diverge}))
check("FIN-1: R1 covers every record whose committed or runtime source is the mismatched import",
      set(r1["records"]) == {r["record_id"] for r in L if not r["engine"]["import_hash_matches"] or not r["engine_runtime_repaired"]["import_hash_matches"]}
      == {"FQ01-OBS-001", "FQ01-OBS-004", "FQ01-OBS-006", "FQ01-OBS-051", "FQ01-OBS-053", "FQ01-OBS-058"})
prev = {r["record_id"]: r for r in json.loads(subprocess.run(["git", "-C", ROOT, "show", "92109b7:review-delivery/ARAMCO95/QB1/FINANCIAL/FIN-EVIDENCE-LEDGER.json"],
                                                            capture_output=True, check=True).stdout)["records"]}
same = lambda r, p: (r["engine"]["value_sar"], r["unit"], r["currency"], r["period"], r["comparison_with_source"].get("source_value_sar_millions"), r["evidence_status"]) == \
                    (p["engine"]["value_sar"], p["unit"], p["currency"], p["period"], p["comparison_with_source"].get("source_value_sar_millions"), p["evidence_status"])
check("no amount, unit, period, source value or evidence status changed since delivery 92109b7", all(same(r, prev[r["record_id"]]) for r in L))

LOC = json.load(open(os.path.join(ROOT, "review-delivery/WEB08B02/REVIEWED-LOCATORS.json")))
q1 = json.loads(subprocess.run(["git", "-C", E, "show", "HEAD:data/imports/aramco-2026-q1.json"], capture_output=True, check=True).stdout)
q1cash = [f for f in q1["facts"] if f.get("label") == "cash and cash equivalents" and f["period_end"] == "2026-03-31" and f["period_kind"] == "instant"]
r065 = next(r for r in L if r["record_id"] == "FQ01-OBS-065"); r5 = next(i for i in R["issues"] if i["id"] == "R5-engine-page-locator-offset")
def locator_ok(rec, r5i):
    lc = rec["locator_check"]
    return (lc["import_claimed_page"] == q1cash[0]["page"] == 24 and lc["verified_page"]["pdf_page"] == 25 in LOC["reviewed_pages"]["Q1-2026"]
            and lc["status"] == "IMPORT_PAGE_WRONG" and rec["record_id"] in r5i["records"] and "R5-engine-page-locator-offset" in rec["issues"]
            and "secondary" in lc["verified_page"]["verified_by"])
check("FIN-2: 065 import page 24 (read from the Q1 import), B02 reviewed page 25, recorded in R5 as secondary evidence", len(q1cash) == 1 and locator_ok(r065, r5))
m = copy.deepcopy(r065); m["locator_check"]["status"] = "MATCH"
r5m = copy.deepcopy(r5); r5m["records"].remove("FQ01-OBS-065")
check("FIN-2 regression: dropping 065 from R5 or calling its page a match is caught", not locator_ok(m, r5) and not locator_ok(r065, r5m))
check("FIN-2: the Q1 import file is untouched (registered hash = current file)", next(f for f in M["engine_import_files"] if f["import_file"].endswith("aramco-2026-q1.json"))["hash_matches"])

r3 = next(i for i in R["issues"] if i["id"] == "R3-prefchem-cash-bridge-h1-2026"); ie = r3["independent_evidence"]
cx = json.loads(subprocess.run(["git", "-C", ROOT, "show", "7d65277:review-delivery/ARAMCO95/QB1/INDEPENDENT-SOURCE-CHECKS/FIN-SOURCE-CROSSCHECK.json"], capture_output=True, check=True).stdout)
comp = {c["pdf_page"]: c["sar_millions"] for c in ie["components"]}
r072 = next(r for r in L if r["record_id"] == "FQ01-OBS-072")
check("FIN-3: bridge 167,387 + 3,466 = 170,853 recorded per component (PDF 29/42/31), equal to Codex's committed file",
      comp == {29: 167387, 42: 3466, 31: 170853} and comp[29] + comp[42] == comp[31] and cx["prefchem_bridge"]["balance_cash"] == comp[29]
      and cx["prefchem_bridge"]["cash_held_for_sale"] == comp[42] and cx["prefchem_bridge"]["cashflow_ending_cash"] == comp[31])
check("FIN-3: attributed to Codex, not claimed as re-read here, document hash equals the B02 register",
      ie["reported_by"] == "Codex" and "not read here" in ie["not_confirmed_here"] and ie["document"]["sha256_equals_b02_register"]
      and r072["evidence_provenance"]["reported_by_independent_reviewer"][0]["re_read_here"] is False)
check("FIN-3: 167,387 equals the engine row of 072; the bridge stays open and 072 stays not ready and WITHHELD",
      int(r072["engine"]["value_sar"]) == comp[29] * 1_000_000 and r3["status"] == "OPEN" and not r072["ready_for_financial_review"] and r072["qualification"]["state"] == "WITHHELD")
check("FIN-3: no bridge or held-for-sale cash on any equity record", all("3466" not in json.dumps(r) and "held for sale" not in json.dumps(r) for r in L if r["engine_metric_key"] == "total_equity"))

r058 = next(r for r in L if r["record_id"] == "FQ01-OBS-058"); k = r058["engine"]["import_fact_key"]
src = {f: open(os.path.join(E, "src/finengine", f), encoding="utf8").read().splitlines() for f in ("mapping.py", "extraction.py")}
reg = json.loads(old)
hit = [f for f in reg["facts"] if f.get("label") == "cash and cash equivalents" and f["period_end"] == "2025-12-31" and f["period_kind"] == "instant"]
check("FIN-4: 058 lineage is the label 'cash and cash equivalents' in the registered import, mapped to cash by the engine (mapping.py:11, extraction.py:72)",
      k["label"] == "cash and cash equivalents" and k["mapped_to"] == "cash" and len(hit) == 1 and hit[0]["value"] * 1_000_000 == int(r058["engine"]["value_sar"])
      and '"cash and cash equivalents":"cash"' in src["mapping.py"][10] and 'r.get("metric") or r.get("label"' in src["extraction.py"][71])
check("FIN-4: 058 is not attributed to cash_end", "cash_end" not in json.dumps(r058["engine"]) and r058["engine_metric_key"] == "cash")

eq = [r for r in L if r["engine_metric_key"] == "total_equity"]
check("equity records carry no cash-bridge or PRefChem note", all("PRefChem" not in json.dumps(r, ensure_ascii=False) and "R3-prefchem-cash-bridge-h1-2026" not in r["issues"] for r in eq))
check("the PRefChem bridge sits on FQ01-OBS-072 only", [r["record_id"] for r in L if "PRefChem" in (r["reconciliation"] or "")] == ["FQ01-OBS-072"])
check("correction of the equity notes is logged", any(x["row"] == "FQ01-OBS-074" for c in FQ.get("correction_log", []) for x in c["removed"]))

eng_db = os.path.join(E, "data/financial.sqlite3")
check("engine DB unchanged (sha256 prefix 2a749d7c8a051f27)", sha(open(eng_db, "rb").read()).startswith("2a749d7c8a051f27"))
st = subprocess.run(["git", "-C", E, "status", "--porcelain", "--untracked-files=no"], capture_output=True, text=True).stdout.strip()
check("engine working tree has no tracked changes", st == "", st)
h = subprocess.run(["bun", os.path.join(ROOT, "review-delivery/WEB08B05/tools/holds.ts")], capture_output=True, text=True, cwd=ROOT).stdout
hold = json.loads(h.strip().splitlines()[-1])
check("holds unchanged 7/7, 22/22, 142, 0", hold["analyses_blocked"] == "7/7" and hold["b03_claims_withheld"] == "22/22" and hold["b02_inputs_withheld"] == 142 and hold["b02_qualified_for_research"] == 0, json.dumps(hold))
changed = subprocess.run(["git", "-C", ROOT, "diff", "--name-only", "a76286c", "--", "."], capture_output=True, text=True).stdout.split()
untracked = subprocess.run(["git", "-C", ROOT, "ls-files", "--others", "--exclude-standard"], capture_output=True, text=True).stdout.split()
allowed = ("review-delivery/ARAMCO95/QB1/FINANCIAL/", "review-delivery/ARAMCO95/QB1/CROSSREVIEW/", "review-delivery/ARAMCO95/tools/", "review-delivery/ARAMCO95/FIN-QUAL-BATCH-01")
bad = [f for f in changed + untracked if not f.startswith(allowed)]
check("only financial-scope and cross-review files changed since a76286c (no NONFINANCIAL, no CHANGELOG, no product or engine code)", not bad, ", ".join(bad))
print(f"\n{'ALL PASS' if not fails else str(fails) + ' FAIL'}")
sys.exit(1 if fails else 0)
