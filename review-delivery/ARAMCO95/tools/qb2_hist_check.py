"""Verification checks for QB2-A financial history. Independent of qb2_hist_build.py where it matters: the PDF is re-read with
pypdf (the build uses pdftotext), the engine is queried again (immutable), and B02 is re-read. Prints PASS/FAIL lines.
Usage: ENGINE=<engine clone> python3 qb2_hist_check.py"""
import copy, hashlib, json, os, re, sqlite3, subprocess, sys
from pypdf import PdfReader
E = os.environ["ENGINE"]
PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); ROOT = os.path.dirname(os.path.dirname(PKG))
Q = os.path.join(PKG, "QB2", "FINANCIAL-HISTORY")
load = lambda n: json.load(open(os.path.join(Q, n + ".json")))
L, M, P, G, F = load("HIST-FIN-LEDGER"), load("HIST-SOURCE-MANIFEST"), load("HIST-PERIOD-MATRIX"), load("HIST-EVIDENCE-GAPS"), load("FY2024-RESTATEMENT-CHECK")
ARA_SHA = "78bb678e8e45f5c58fa1b2402ab5a29c5ad10adfda8ba5e7ee5f4d1ad76cd227"
sha = lambda b: hashlib.sha256(b).hexdigest()
fails = 0
def check(name, ok, detail=""):
    global fails
    fails += not ok
    print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail else ""))

A, QS = L["annual"], L["quarters"]
pdf = os.path.join(E, "data/raw/SA/2222/documents", ARA_SHA + ".pdf")
check("archived annual report sha256 recomputed", sha(open(pdf, "rb").read()) == ARA_SHA)
rd = PdfReader(pdf)
def nums(p):
    t = rd.pages[p - 1].extract_text() or ""
    return t, {int(x.strip("()").replace(",", "")) * (-1 if x.startswith("(") else 1) for x in re.findall(r"\(?\d{1,3}(?:,\d{3})+\)?", t)}
t132, n132 = nums(132)
check("PDF 132 is 'Historical financial highlights', printed page 130 (pypdf)", "Historical financial highlights" in t132 and "130" in t132 and "Annual Report 2025" in t132)

ids = [f["id"] for f in A] + [q["id"] for q in QS]
check("ids unique", len(ids) == len(set(ids)))
core = [f for f in A if f["core_metric"]]
check("15 core annual values = 5 metrics x FY2021-FY2023", len(core) == 15 and {(f["metric"], f["period"]["fiscal_year"]) for f in core}
      == {(m, y) for m in ("revenue", "net_income", "operating_cash_flow", "cash", "total_equity") for y in (2021, 2022, 2023)})
check("50 quarterly values = 5 metrics x Q3-2023..Q4-2025", len(QS) == 50 and len({(q["period"]["fiscal_year"], q["period"]["fiscal_quarter"]) for q in QS}) == 10)
withsrc = [f for f in A if f["value_in_source"] is not None]
check("every value with a source cites the ARA2025 hash, a page and a line; no other document is used", all(
    f["source"]["sha256"] == ARA_SHA and f["source"]["pdf_page"] in (132, 178) and f["source"]["line"] for f in withsrc), f"{len(withsrc)} values")
miss = [f["id"] for f in withsrc if f["value_in_source"] not in nums(f["source"]["pdf_page"])[1]]
check("pypdf finds every sourced value on its cited page", not miss, str(miss))
t = copy.deepcopy(withsrc[0]); t["value_in_source"] += 1
check("regression: a value altered by one million is not found on its page", t["value_in_source"] not in nums(t["source"]["pdf_page"])[1])
check("no value without a source: gap records carry no value", all(f["source"] is None and f["value_in_source"] is None for f in A if f["evidence_class"] == "NO_ACCESSIBLE_DISCLOSURE")
      and all(q["value_in_source"] is None and q["source"] is None for q in QS))
check("cash FY2021/FY2022 recorded as gaps, cash FY2023 only as the cash-flow opening balance (PDF 178)",
      [f["evidence_class"] for f in core if f["metric"] == "cash"] == ["ISSUER_ANNUAL_REPORT_2025_CASH_FLOW_OPENING_BALANCE", "NO_ACCESSIBLE_DISCLOSURE", "NO_ACCESSIBLE_DISCLOSURE"])
check("every summary value is labelled as a later-report summary, not an audited statement",
      all(f["evidence_class"] == "ISSUER_ANNUAL_REPORT_2025_HISTORICAL_SUMMARY" and "not the audited" in f["evidence_limit"] for f in A if f["source"] and f["source"]["pdf_page"] == 132))

# summary 2024/2025 columns vs statements, re-read with pypdf
n174, n176, n178 = nums(174)[1], nums(176)[1], nums(178)[1]
bad = [c["metric"] for c in L["summary_vs_statements_2024_2025"] if c["equal"] is not None and not (set(c["summary_2025_2024"]) <= {174: n174, 176: n176, 178: n178}[c["statement_page"]])]
check("2024/2025 summary columns appear on the statement pages (pypdf), 13 of 14 lines comparable", not bad and sum(c["equal"] is True for c in L["summary_vs_statements_2024_2025"]) == 13, str(bad))

# engine, committed DB immutable
db = sqlite3.connect(f"file:{E}/data/financial.sqlite3?mode=ro&immutable=1", uri=True)
CUR = """SELECT id, version, source_key, value_decimal FROM data_points WHERE company_id='sa:2222' AND is_current=1 AND metric_key=? AND period_kind=? AND period_end=?
         AND (dimensions_json IS NULL OR dimensions_json IN ('','{}','null'))"""
def eng_ok(rows):
    bad = []
    for f in rows:
        r = db.execute(CUR, (f["metric"], f["period"]["kind"], f["period"]["end"])).fetchone()
        e = f["engine"]
        if (r is None) != (e is None) or (r and (r[0], r[1], r[2], r[3]) != (e["data_point_id"], e["version"], e["source_key"], e["value_sar"])): bad.append(f["id"])
    return bad
check("engine references equal the committed DB's current rows (annual and quarterly)", not eng_ok(A + QS), str(eng_ok(A + QS)))
mut = copy.deepcopy(A); mut[0]["engine"]["data_point_id"] += 1
check("regression: a wrong engine row id is caught", eng_ok(mut) == [mut[0]["id"]])
check("engine status consistent: equal when values agree, missing for investing/financing", all(
    f["engine_equal"] == (f["engine"] is not None and f["engine"]["value_sar_millions"] == f["value_in_source"]) for f in withsrc)
      and {f["metric"] for f in A if f["engine_status"] == "ENGINE_MISSING"} == {"investing_cash_flow", "financing_cash_flow"})
check("no value differences between the 2025 report summary and the engine for FY2021-FY2023", not [f["id"] for f in A if f["engine_status"] == "ENGINE_DIFFERS"])
check("engine holds no quarter before 2026 for the five metrics", all(q["engine"] is None for q in QS if not q["same_instant_as_year_end"]))
imp = {f["engine"]["import_file"] for f in A if f["engine"]}
disc = {f["source"]["sha256"] for f in withsrc}
ihash = {sha(open(os.path.join(E, i), "rb").read()) for i in imp}
check("no import-file hash used as a disclosure hash", not (disc & ihash))
check("engine import citations: the cited annual reports are not present here and are not claimed as read",
      all(not f["engine"]["import_cites"]["present_here"] for f in A if f["engine"] and "2025" not in (f["engine"]["import_cites"]["source_url"] or "")))

# quarters and matrix
q4 = [q for q in QS if q["same_instant_as_year_end"]]
check("Q4 balances (6) reuse year-end evidence; the other 44 quarterly values have none", len(q4) == 6 and all(q["year_end_evidence"] for q in q4)
      and sum(1 for q in QS if q["year_end_evidence"]) == 6)
check("Q4 flows are not derived by subtraction", all("approved formula" in q["needed"] for q in QS if q["period"]["kind"] == "quarter" and q["period"]["fiscal_quarter"] == 4))
check("period matrix: gate not met, nothing counts as audited period or gate quarter now",
      not any(a["counts_as_audited_period_now"] for a in P["annual"]) and not any(q["counts_toward_gate_now"] for q in P["quarters"]) and "not met" in P["result"])
check("Q1/Q2-2026 left to Codex", "Q1-2026, Q2-2026" in P["out_of_scope"] and not any(q["period"]["fiscal_year"] == 2026 for q in QS))

# FY2024 check against B02 as committed
b02 = {r["identity"]["metric"]: r for r in json.load(open(os.path.join(ROOT, "review-delivery/WEB08B02/QUALIFIED-WITHHELD-INPUT-REGISTER-v4.json")))["results"] if r["source"]["document_key"] == "FY2024"}
rows = {r["metric"]: r for r in F["rows"]}
check("FY2024: B02 observations copied as committed (comparison and reasons)", all(
    r["b02_original_fy2024_statements"]["comparison"] == b02[m]["comparison"] and r["b02_original_fy2024_statements"]["reasons"] == b02[m]["reasons"]
    for m, r in rows.items() if r["b02_original_fy2024_statements"]))
check("FY2024: revenue, net income, operating income, OCF, parent net income show no value difference (secondary)",
      all(rows[m]["status"] == "NO_VALUE_DIFFERENCE_SEEN_IN_ORIGINAL_SECONDARY" for m in ("revenue", "net_income", "operating_income", "operating_cash_flow", "net_income_parent")))
check("FY2024: capex flagged, not resolved; balance-sheet totals not compared",
      rows["capex"]["status"] == "SIGN_CONVENTION_SUSPECTED_UNRESOLVED" and rows["capex"]["comparative_in_ara2025"] == -188890
      and all(rows[m]["status"] == "NOT_COMPARED" for m in ("total_assets", "total_liabilities", "total_equity")))
check("FY2024 original document is not claimed accessible", F["original_document"]["accessible_here"] is False)
check("manifest: only ARA2025 present and verified here", [d["key"] for d in M["documents"] if d.get("present_here")] == ["ARA2025"])

check("every record WITHHELD, none authorised", all(x["qualification"]["state"] == "WITHHELD" and not x["qualification"]["publication_authorized"] for x in A + QS))
check("engine DB unchanged (sha256 prefix 2a749d7c8a051f27)", sha(open(os.path.join(E, "data/financial.sqlite3"), "rb").read()).startswith("2a749d7c8a051f27"))
st = subprocess.run(["git", "-C", E, "status", "--porcelain", "--untracked-files=no"], capture_output=True, text=True).stdout.strip()
check("engine working tree has no tracked changes", st == "", st)
h = subprocess.run(["bun", os.path.join(ROOT, "review-delivery/WEB08B05/tools/holds.ts")], capture_output=True, text=True, cwd=ROOT).stdout
hold = json.loads(h.strip().splitlines()[-1])
check("holds unchanged 7/7, 22/22, 142, 0", hold["analyses_blocked"] == "7/7" and hold["b03_claims_withheld"] == "22/22" and hold["b02_inputs_withheld"] == 142 and hold["b02_qualified_for_research"] == 0)
base = "1ec8ccd6ae946a5c361223edfbe936b2ed78c821"
changed = subprocess.run(["git", "-C", ROOT, "diff", "--name-only", base, "--", "."], capture_output=True, text=True).stdout.split() + \
          subprocess.run(["git", "-C", ROOT, "ls-files", "--others", "--exclude-standard"], capture_output=True, text=True).stdout.split()
bad = [f for f in changed if not f.startswith(("review-delivery/ARAMCO95/QB2/FINANCIAL-HISTORY/", "review-delivery/ARAMCO95/tools/qb2_"))]
check("only QB2-A files changed since 1ec8ccd (no QB1, NONFINANCIAL, CHANGELOG, product or engine code)", not bad, ", ".join(bad))
print(f"\n{'ALL PASS' if not fails else str(fails) + ' FAIL'}")
sys.exit(1 if fails else 0)
