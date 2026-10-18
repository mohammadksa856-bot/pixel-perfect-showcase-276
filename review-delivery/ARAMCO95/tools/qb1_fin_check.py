"""Verification and reproduction checks for QB1-A-FIN. Independent of qb1_fin_build.py where it matters: the PDF is re-read
with pypdf (the build uses pdftotext). Usage: ENGINE=<engine clone> python3 qb1_fin_check.py  (prints PASS/FAIL lines)."""
import hashlib, json, os, re, subprocess, sys
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
check("051/058: registered hash reproduced from the committed history, current file hash recomputed, neither edited",
      sha(old) == ev["registered_hash"] and sha(open(os.path.join(E, ev["import_file"]), "rb").read()) == ev["current_file_hash"] and ev["registered_hash"] != ev["current_file_hash"]
      and {"FQ01-OBS-051", "FQ01-OBS-058"} <= set(r1["records"]))
check("051/058 records still carry the registered (not the current) hash and stay WITHHELD",
      all(r["engine"]["import_registered_hash"] == ev["registered_hash"] and r["engine"]["import_hash_matches"] is False for r in L if r["record_id"] in ("FQ01-OBS-051", "FQ01-OBS-058")))

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
allowed = ("review-delivery/ARAMCO95/QB1/FINANCIAL/", "review-delivery/ARAMCO95/tools/", "review-delivery/ARAMCO95/FIN-QUAL-BATCH-01")
bad = [f for f in changed + untracked if not f.startswith(allowed)]
check("only financial-scope files changed since a76286c (no NONFINANCIAL, no CHANGELOG, no product or engine code)", not bad, ", ".join(bad))
print(f"\n{'ALL PASS' if not fails else str(fails) + ' FAIL'}")
sys.exit(1 if fails else 0)
