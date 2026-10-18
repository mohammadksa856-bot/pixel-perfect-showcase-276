"""QB2-A (financial history, sa:2222): evidence ledger for FY2021-FY2023, the 10 historical quarters Q3-2023..Q4-2025 and the
FY2024 original-vs-comparative check. Read-only: the committed engine DB is opened immutable, import files are read from git,
the only accessible Aramco disclosure (archived Annual Report 2025, sha256 78bb678e...) is read in place. Nothing is written to
the engine, nothing is approved; every record stays WITHHELD. A JSON import is never used in place of a disclosure: engine
values are recorded beside the disclosure value, never as its proof. Q1/Q2-2026 are Codex's scope and are not built here.

Usage: ENGINE=<engine clone at b70254e with history> python3 qb2_hist_build.py
Writes review-delivery/ARAMCO95/QB2/FINANCIAL-HISTORY/{HIST-FIN-LEDGER,HIST-SOURCE-MANIFEST,HIST-PERIOD-MATRIX,HIST-EVIDENCE-GAPS,FY2024-RESTATEMENT-CHECK}.json"""
import hashlib, json, os, re, sqlite3, subprocess, sys
E = os.environ["ENGINE"]
sys.path.insert(0, os.path.join(E, "src"))
from finengine.mapping import canonicalize          # the engine's own label -> metric dictionary, used read-only
PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(PKG, "QB2", "FINANCIAL-HISTORY"); os.makedirs(OUT, exist_ok=True)
B02 = os.path.join(os.path.dirname(PKG), "WEB08B02")
sha = lambda b: hashlib.sha256(b).hexdigest()
git = lambda *a: subprocess.run(["git", "-C", E, *a], capture_output=True, check=True).stdout

# ---------- the accessible disclosure ----------
ARA_SHA = "78bb678e8e45f5c58fa1b2402ab5a29c5ad10adfda8ba5e7ee5f4d1ad76cd227"
ARA = os.path.join(E, "data/raw/SA/2222/documents", ARA_SHA + ".pdf")
assert sha(open(ARA, "rb").read()) == ARA_SHA, "archived annual report does not match its content hash"
index = json.load(open(os.path.join(E, "data/raw/archive-index.json")))
arch = {a["content_hash"]: a for a in index["artifacts"] if a.get("company_id") == "sa:2222"}
def page_text(p):
    return subprocess.run(["pdftotext", "-layout", "-f", str(p), "-l", str(p), ARA, "-"], capture_output=True, check=True).stdout.decode("utf-8", "replace")
def nums(line):
    return [int(n.strip("()").replace(",", "")) * (-1 if n.startswith("(") else 1) for n in re.findall(r"\(?\d{1,3}(?:,\d{3})+\)?|\(?\d+\)?", line)]

HP = 132                                              # "Historical financial highlights", printed page 130
hp = page_text(HP)
assert "Historical financial highlights" in hp and "130   Saudi Aramco | Annual Report 2025" in hp, "page 132 is not the historical highlights page"
YEARS = [2025, 2024, 2023, 2022, 2021]
SECTIONS = {"Summarized consolidated statement of income": ("income_statement", "fy"),
            "Summarized consolidated balance sheet": ("balance_sheet", "instant"),
            "Summarized consolidated statement of cash flows": ("cash_flow", "fy")}
EXPLICIT = {"Net assets (total equity)": "total_equity", "Net cash provided by operating activities": "operating_cash_flow"}  # labels the engine dictionary lacks
lines, section = [], None
for ln in hp.splitlines():
    s = ln.strip()
    if s in SECTIONS: section = s; continue
    m = re.match(r"([A-Za-z][A-Za-z ()]+?)\s{2,}(\(?[\d,]+\)?(?:\s+\(?[\d,]+\)?){4})\s*$", s)
    if section and m and not s.startswith("All amounts"):
        label, vals = m.group(1).strip(), nums(m.group(2))
        metric = EXPLICIT.get(label) or canonicalize(label, "SA")
        assert metric and len(vals) == 5, (label, vals)
        lines.append({"label": label, "metric": metric, "statement": SECTIONS[section][0], "kind": SECTIONS[section][1], "values": dict(zip(YEARS, vals))})
assert len(lines) == 14, len(lines)

# 2024/2025 columns of the summary against the full statements (PDF 174 income, 176 balance sheet, 178 cash flows)
STMT = {"revenue": (174, "Revenue"), "net_income": (174, "Net income"), "operating_income": (174, "Operating income"),
        "income_before_income_taxes_and_zakat": (174, "Income before income taxes and zakat"), "income_taxes_and_zakat": (174, "Income taxes and zakat"),
        "other_income_related_to_sales": (174, "Other income related to sales"), "revenue_and_other_income_related_to_sales": (174, "Revenue and other income related to sales"),
        "total_assets": (176, "Total assets"), "total_liabilities": (176, "Total liabilities"),
        "operating_cash_flow": (178, "Net cash provided by operating activities"), "investing_cash_flow": (178, "Net cash used in investing activities"),
        "financing_cash_flow": (178, "Net cash used in financing activities")}
def stmt_line(p, label):
    for ln in page_text(p).splitlines():
        if re.match(re.escape(label) + r"\s{2,}", ln.strip()):
            v = nums(ln.strip()[len(label):]); return v[-4:-2]          # SAR 2025, SAR 2024 (a note number may come first)
    return None
cross = []
for l in lines:
    if l["metric"] == "total_equity":
        t = page_text(176).splitlines(); i = next(k for k, x in enumerate(t) if x.strip().startswith("Non-controlling interests"))
        got, where = nums(next(x for x in t[i + 1:] if x.strip()))[-4:-2], (176, "unlabelled subtotal after Non-controlling interests")
    elif l["metric"] == "operating_costs":
        got, where = None, (174, "not a single statement line (sum of cost lines)")
    else:
        where = STMT[l["metric"]]; got = stmt_line(*where)
    cross.append({"metric": l["metric"], "summary_2025_2024": [l["values"][2025], l["values"][2024]], "statement_page": where[0], "statement_line": where[1],
                  "statement_2025_2024": got, "equal": got == [l["values"][2025], l["values"][2024]] if got else None})

# cash at 2023-12-31: only as the opening balance of the FY2024 comparative column in the cash-flow statement
cf = next(ln for ln in page_text(178).splitlines() if "Cash and cash equivalents at beginning of the year" in ln)
cash_open_2024 = nums(cf)[-3]                          # SAR 2025 col = 216,642, SAR 2024 col = opening of 2024
assert nums(cf)[-4] == 216642

# ---------- engine: committed DB, immutable ----------
db = sqlite3.connect(f"file:{E}/data/financial.sqlite3?mode=ro&immutable=1", uri=True); db.row_factory = sqlite3.Row
CUR = """SELECT id, version, source_key, value_decimal, filed_at, form FROM data_points WHERE company_id='sa:2222' AND is_current=1 AND metric_key=? AND period_kind=?
         AND period_end=? AND (dimensions_json IS NULL OR dimensions_json IN ('','{}','null'))"""
def engine(metric, kind, end):
    r = db.execute(CUR, (metric, kind, end)).fetchone()
    if not r: return None
    sd = db.execute("SELECT local_path, content_hash, source_url, filing_type FROM source_documents WHERE source_key=?", (r["source_key"],)).fetchone()
    imp = sd["local_path"].replace("\\", "/"); cur = sha(open(os.path.join(E, imp), "rb").read())
    cited = next((h for h, a in arch.items() if a.get("source_url") == sd["source_url"]), None)
    return {"data_point_id": r["id"], "version": r["version"], "source_key": r["source_key"], "value_sar": r["value_decimal"],
            "value_sar_millions": int(r["value_decimal"]) // 1_000_000 if int(r["value_decimal"]) % 1_000_000 == 0 else r["value_decimal"],
            "filed_at": r["filed_at"], "form": r["form"], "import_file": imp, "import_hash_matches": cur == sd["content_hash"],
            "import_cites": {"source_url": sd["source_url"], "filing_type": sd["filing_type"], "archive_index_sha256": cited,
                             "present_here": bool(cited) and os.path.exists(os.path.join(E, arch[cited]["local_path"].replace("\\", "/")))},
            "note": "engine value from a JSON import; recorded beside the disclosure, never as its proof"}

# ---------- annual ledger FY2021-FY2023 ----------
CORE = ["revenue", "net_income", "operating_cash_flow", "cash", "total_equity"]
SRC = lambda line, col: {"document": "ARA2025", "sha256": ARA_SHA, "pdf_page": HP, "printed_page": HP - 2, "table": "Historical financial highlights", "line": line, "column": col}
facts = []
for l in lines:
    for y in (2021, 2022, 2023):
        end = f"{y}-12-31"; e = engine(l["metric"], l["kind"], end); v = l["values"][y]
        facts.append({"id": f"QB2-A-{l['metric']}-FY{y}", "metric": l["metric"], "statement": l["statement"], "core_metric": l["metric"] in CORE,
                      "period": {"kind": l["kind"], "start": f"{y}-01-01" if l["kind"] == "fy" else None, "end": end, "fiscal_year": y},
                      "unit": "SAR millions", "value_in_source": v, "sign_as_printed": "negative (parentheses)" if v < 0 else "positive",
                      "source": SRC(l["label"], f"Year ended / as at December 31, {y}"),
                      "evidence_class": "ISSUER_ANNUAL_REPORT_2025_HISTORICAL_SUMMARY",
                      "evidence_limit": f"a summary in the 2025 annual report, not the audited FY{y} statements; it shows FY{y} as presented in 2026 and cannot by itself rule out a later restatement or count as an audited annual period",
                      "engine": e, "engine_equal": (e is not None and e["value_sar_millions"] == v),
                      "engine_status": "ENGINE_EQUAL" if e and e["value_sar_millions"] == v else "ENGINE_DIFFERS" if e else "ENGINE_MISSING",
                      "qualification": {"state": "WITHHELD", "publication_authorized": False}})
cash23_e = engine("cash", "instant", "2023-12-31")
facts.append({"id": "QB2-A-cash-FY2023", "metric": "cash", "statement": "balance_sheet", "core_metric": True,
              "period": {"kind": "instant", "start": None, "end": "2023-12-31", "fiscal_year": 2023}, "unit": "SAR millions", "value_in_source": cash_open_2024,
              "sign_as_printed": "positive", "source": {"document": "ARA2025", "sha256": ARA_SHA, "pdf_page": 178, "printed_page": 176, "table": "Consolidated statement of cash flows",
                                                       "line": "Cash and cash equivalents at beginning of the year", "column": "comparative (year ended December 31, 2024)"},
              "evidence_class": "ISSUER_ANNUAL_REPORT_2025_CASH_FLOW_OPENING_BALANCE",
              "evidence_limit": "the opening cash of FY2024 in the cash-flow statement, a different identity from balance-sheet cash at 2023-12-31; they agree only when no cash sits in assets held for sale. The FY2023 balance sheet is needed to confirm",
              "engine": cash23_e, "engine_equal": cash23_e is not None and cash23_e["value_sar_millions"] == cash_open_2024,
              "engine_status": "ENGINE_EQUAL" if cash23_e and cash23_e["value_sar_millions"] == cash_open_2024 else "ENGINE_DIFFERS",
              "qualification": {"state": "WITHHELD", "publication_authorized": False}})
for y in (2021, 2022):
    e = engine("cash", "instant", f"{y}-12-31")
    facts.append({"id": f"QB2-A-cash-FY{y}", "metric": "cash", "statement": "balance_sheet", "core_metric": True,
                  "period": {"kind": "instant", "start": None, "end": f"{y}-12-31", "fiscal_year": y}, "unit": "SAR millions", "value_in_source": None,
                  "source": None, "evidence_class": "NO_ACCESSIBLE_DISCLOSURE",
                  "evidence_limit": f"cash at {y}-12-31 is not in the 2025 annual report; the FY{y} or FY{y + 1} statements are needed",
                  "engine": e, "engine_equal": None, "engine_status": "ENGINE_VALUE_WITHOUT_ACCESSIBLE_DISCLOSURE" if e else "ENGINE_MISSING",
                  "qualification": {"state": "WITHHELD", "publication_authorized": False}})

# ---------- quarters Q3-2023 .. Q4-2025 ----------
QS = [(2023, 3), (2023, 4), (2024, 1), (2024, 2), (2024, 3), (2024, 4), (2025, 1), (2025, 2), (2025, 3), (2025, 4)]
QEND = {1: "03-31", 2: "06-30", 3: "09-30", 4: "12-31"}; QSTART = {1: "01-01", 2: "04-01", 3: "07-01", 4: "10-01"}
annual = {(f["metric"], f["period"]["end"]): f for f in facts if f["value_in_source"] is not None}
quarters = []
for y, q in QS:
    for m in CORE:
        inst = m in ("cash", "total_equity"); end = f"{y}-{QEND[q]}"
        e = engine(m, "instant" if inst else "quarter", end)
        same_instant = inst and q == 4
        reuse = None
        if same_instant:
            if y == 2023: reuse = annual.get((m, end)) and {"ledger_id": annual[(m, end)]["id"], "value_sar_millions": annual[(m, end)]["value_in_source"],
                                                            "evidence_class": annual[(m, end)]["evidence_class"]}
            else: reuse = {"ledger": "QB1/FINANCIAL/FIN-EVIDENCE-LEDGER.json", "record": {("cash", 2024): "FQ01-OBS-051", ("total_equity", 2024): "FQ01-OBS-053",
                                                                                            ("cash", 2025): "FQ01-OBS-058", ("total_equity", 2025): "FQ01-OBS-060"}[(m, y)],
                           "evidence_class": "ARA2025 balance sheet PDF 176 (QB1-A, accepted as evidence)"}
        quarters.append({"id": f"QB2-A-{m}-Q{q}-{y}", "metric": m, "period": {"kind": "instant" if inst else "quarter", "start": None if inst else f"{y}-{QSTART[q]}", "end": end,
                                                                              "fiscal_year": y, "fiscal_quarter": q},
                         "value_in_source": None, "source": None, "same_instant_as_year_end": same_instant, "year_end_evidence": reuse,
                         "evidence_class": "YEAR_END_INSTANT_EVIDENCED_ELSEWHERE" if reuse else "NO_ACCESSIBLE_DISCLOSURE",
                         "needed": ("none for the value (same instant as the year-end balance); the quarter's own interim or annual statement is still the qualifying document"
                                    if reuse else f"{'Q' + str(q) + ' ' + str(y) + ' interim report (three-month column)' if q < 4 else 'issuer disclosure of the three-month period Q4 ' + str(y) + ' (results announcement or interim note); FY minus nine months is a derivation that needs an approved formula'}"
                                    if not inst else f"balance sheet at {end} from the Q{q} {y} interim report"),
                         "engine": e, "engine_status": "ENGINE_PRESENT" if e else "ENGINE_MISSING",
                         "qualification": {"state": "WITHHELD", "publication_authorized": False}})

# ---------- FY2024 original vs comparative ----------
b02 = {r["identity"]["metric"]: r for r in json.load(open(os.path.join(B02, "QUALIFIED-WITHHELD-INPUT-REGISTER-v4.json")))["results"] if r["source"]["document_key"] == "FY2024"}
b02doc = next(d for d in json.load(open(os.path.join(B02, "FINANCIAL-EVIDENCE-REGISTER.json")))["documents"] if d["key"] == "FY2024")
comp24 = {l["metric"]: l["values"][2024] for l in lines}
capex = next(ln for ln in page_text(178).splitlines() if ln.strip().startswith("Capital expenditures"))
comp24["capex"] = nums(capex)[-3]; comp24["cash"] = 216642           # columns: SAR 2025, SAR 2024, USD 2025, USD 2024
ORIG = """SELECT id, value_decimal, substr(source_key,6) sk, version, is_current, filed_at, form FROM data_points WHERE company_id='sa:2222' AND metric_key=? AND period_kind=?
          AND period_end='2024-12-31' AND filed_at < '2026-01-01' AND (dimensions_json IS NULL OR dimensions_json IN ('','{}','null'))"""
check24 = []
for m in sorted(set(comp24) | {k for k in b02 if k in comp24 or k in ("operating_income", "net_income_parent", "capex")}):
    kind = "instant" if m in ("cash", "total_equity", "total_assets", "total_liabilities") else "fy"
    orig = [dict(r) for r in db.execute(ORIG, (m, kind))]
    cur = engine(m, kind, "2024-12-31")
    b = b02.get(m)
    b02r = {"audit_row": b["audit_row"], "pdf_page": b["source"]["pdf_page"], "printed_page": b["source"]["printed_page"], "line": b["source"]["original_label"],
            "comparison": b["comparison"], "reasons": b["reasons"], "source_check": b["source_check"],
            "compared_engine_rows": [x.get("source_key", "")[5:13] + " v" + str(x.get("version")) for x in b["matches"]]} if b else None
    c = comp24.get(m)
    orig_vals = {int(o["value_decimal"]) // 1_000_000 for o in orig}
    if b02r and b02r["reasons"] == ["source_url_differs"]:
        status = "NO_VALUE_DIFFERENCE_SEEN_IN_ORIGINAL_SECONDARY"
    elif b02r and "numeric_or_sign_difference" in b02r["reasons"]:
        status = "SIGN_CONVENTION_SUSPECTED_UNRESOLVED" if cur and c is not None and abs(int(cur["value_sar_millions"])) == abs(c) else "NUMERIC_DIFFERENCE_UNRESOLVED"
    elif orig and c is not None:
        status = "ENGINE_ORIGINAL_YEAR_IMPORT_EQUALS_COMPARATIVE_SECONDARY" if orig_vals == {c} else "ENGINE_ORIGINAL_YEAR_IMPORT_DIFFERS"
    else:
        status = "NOT_COMPARED"
    check24.append({"metric": m, "kind": kind, "comparative_in_ara2025": c, "comparative_source": {"pdf_page": 178 if m in ("capex", "operating_cash_flow", "investing_cash_flow", "financing_cash_flow") else 176 if kind == "instant" else 174,
                                                                                                 "also_summary_page": HP if m in comp24 and m not in ("capex", "cash") else None},
                    "engine_current": cur and {k: cur[k] for k in ("data_point_id", "version", "value_sar_millions", "import_file")},
                    "engine_original_year_rows": [{"data_point_id": o["id"], "value_sar_millions": int(o["value_decimal"]) // 1_000_000, "source": o["sk"][:16], "filed_at": o["filed_at"],
                                                   "is_current": o["is_current"], "form": o["form"]} for o in orig],
                    "b02_original_fy2024_statements": b02r, "status": status})
restatement = {"original_document": {"key": "FY2024", "sha256_per_b02": b02doc["sha256"], "url": b02doc["url"], "accessible_here": False},
               "comparative_document": {"key": "ARA2025", "sha256": ARA_SHA, "accessible_here": True},
               "rows": check24,
               "definition_notes": ["total equity: the summary labels it 'Net assets (total equity)'; the balance sheet shows an unlabelled subtotal after non-controlling interests; same value 1,651,355",
                                    "capex: the cash-flow statement prints (188,890) as an outflow; the engine stores 188,890 positive"],
               "method": "B02 compared its visual reading of the original FY2024 statements with the engine snapshot; the snapshot rows equal the ARA2025 comparatives read here. A value is therefore unchanged only by that chain, which is secondary evidence"}

# ---------- sources, period matrix, gaps ----------
def doc(h, key, role):
    a = arch.get(h) or {}
    p = os.path.join(E, (a.get("local_path") or "").replace("\\", "/")) if a else None
    return {"key": key, "sha256": h, "source_url": a.get("source_url"), "archived_in_engine_index": bool(a), "archived_at": a.get("archived_at"),
            "byte_size": a.get("byte_size"), "present_here": bool(p) and os.path.exists(p), "role": role}
manifest = {"schema": "marefa-aramco-qb2a-source-manifest/1", "documents": [
    doc(ARA_SHA, "ARA2025", "read here: historical highlights PDF 132, statements PDF 174/176/178") | {"sha256_verified_here": True},
    doc("2626b292eb4fd236ba9bbf0930794350d99146d161a30f993d731f36113dd1f6", "ARA2024", "original FY2024 report (engine import 7d174a46 cites it); not present here"),
    doc("4ae156d697ffb78a78c781dda39dd5259dd1c30317233b7565c8622f14875c21", "ARA2023", "FY2023 and comparative FY2022 (engine imports 030f5c24, b00613fa cite it); not present here"),
    doc("0451f1531bb03cf6504ac711df2ca6474e1623edd178af903a83605cab66f353", "ARA2022", "FY2022, and FY2021/FY2020/FY2019 historical highlights (engine imports cite it); not present here"),
    {"key": "FY2024-FS", "sha256": b02doc["sha256"], "source_url": b02doc["url"], "archived_in_engine_index": False, "present_here": False,
     "role": "original audited FY2024 statements; B02 private copy, visual observations only (no values in the register)"},
    {"key": "ARA2021 / FY2021 audited statements", "sha256": None, "source_url": None, "archived_in_engine_index": False, "present_here": False,
     "role": "original FY2021 report; not archived anywhere in reach"},
    {"key": "interim reports Q3-2023, Q1/H1/Q3-2024, Q1/H1/Q3-2025 and Q4 three-month disclosures", "sha256": None, "source_url": None,
     "archived_in_engine_index": False, "present_here": False, "role": "required for the 10 historical quarters; none archived; URLs are not guessed here"}],
    "access": "aramco.com and saudiexchange.sa are denied by this environment's network policy (000/403 on 2026-10-18)",
    "rule": "an import-file hash is never used as a disclosure hash; a JSON import never replaces a disclosure"}
core_annual = [f for f in facts if f["core_metric"]]
matrix = {"gate": "financial_statements hard gate: >= 5 audited annual periods and >= 12 trailing quarterly periods (contract 1.0.0)",
          "annual": [{"fiscal_year": y, "audited_statements_accessible_here": y == 2025,
                      "core_values_with_disclosure_evidence": sum(1 for f in core_annual if f["period"]["fiscal_year"] == y and f["value_in_source"] is not None),
                      "core_values_total": 5, "evidence": ("QB1-A, ARA2025 statements" if y in (2024, 2025) else "ARA2025 historical summary (PDF 132) and cash-flow opening balance (PDF 178)"),
                      "counts_as_audited_period_now": False} for y in (2021, 2022, 2023, 2024, 2025)],
          "quarters": [{"quarter": f"Q{q}-{y}", "values_with_disclosure_evidence": sum(1 for x in quarters if x["period"]["fiscal_year"] == y and x["period"]["fiscal_quarter"] == q and x["year_end_evidence"]),
                        "values_total": 5, "engine_values": sum(1 for x in quarters if x["period"]["fiscal_year"] == y and x["period"]["fiscal_quarter"] == q and x["engine"]),
                        "counts_toward_gate_now": False} for y, q in QS],
          "out_of_scope": {"Q1-2026, Q2-2026": "Codex (original 2026 verification)"},
          "result": "the gate is not met: audited annual periods accessible here = 1 (FY2025); historical quarters with flow evidence = 0 of 10"}
gaps = {"schema": "marefa-aramco-qb2a-gaps/1", "items": [
    {"scope": "FY2021-FY2023 annual values (12 core values with summary evidence)", "missing_for_entry": "binding each engine row to a disclosure hash and page (engine task; the rows exist)",
     "missing_for_qualification": "the audited statements of each year (ARA2022/ARA2023 archived in the engine index but not present here; FY2021 original not archived), a named financial reviewer, rights, D4"},
    {"scope": "cash 2021-12-31, 2022-12-31", "missing_for_entry": "a disclosure: not in ARA2025", "missing_for_qualification": "FY2022/FY2023 statements"},
    {"scope": "cash 2023-12-31", "missing_for_entry": "balance-sheet identity (only the cash-flow opening balance is seen)", "missing_for_qualification": "FY2023 or FY2024 balance sheet"},
    {"scope": "investing and financing cash flows FY2021-FY2023", "missing_for_entry": "the engine has no rows for these metrics in any year", "missing_for_qualification": "engine ingestion, then the audited statements"},
    {"scope": "10 quarters Q3-2023..Q4-2025 (30 flows, 20 balances)", "missing_for_entry": "interim reports and Q4 three-month disclosures; the engine holds no quarter before 2026",
     "missing_for_qualification": "the same documents archived with hashes, engine ingestion, reviewer; Q4 flows by subtraction only with an approved formula"},
    {"scope": "FY2024 original vs comparative", "missing_for_entry": "none", "missing_for_qualification": "a direct read of the original FY2024 statements (B02 private) for total assets/liabilities/equity and capex sign"}]}
ledger = {"schema": "marefa-aramco-qb2a-hist-ledger/1", "company_id": "sa:2222", "annual": facts, "quarters": quarters, "summary_vs_statements_2024_2025": cross,
          "counts": {"annual_core": len(core_annual), "annual_core_with_disclosure": sum(1 for f in core_annual if f["value_in_source"] is not None),
                     "annual_supplementary": sum(1 for f in facts if not f["core_metric"]), "quarter_values": len(quarters),
                     "quarter_values_with_disclosure": sum(1 for x in quarters if x["year_end_evidence"]), "engine_equal": sum(1 for f in facts if f["engine_equal"]),
                     "engine_differs": sum(1 for f in facts if f["engine_status"] == "ENGINE_DIFFERS"), "engine_missing": sum(1 for f in facts if f["engine_status"] == "ENGINE_MISSING")}}
for name, obj in [("HIST-FIN-LEDGER", ledger), ("HIST-SOURCE-MANIFEST", manifest), ("HIST-PERIOD-MATRIX", matrix), ("HIST-EVIDENCE-GAPS", gaps), ("FY2024-RESTATEMENT-CHECK", restatement)]:
    json.dump(obj, open(os.path.join(OUT, name + ".json"), "w"), ensure_ascii=False, indent=1)
print(json.dumps(ledger["counts"]))
print("summary vs statements:", [(c["metric"], c["equal"]) for c in cross])
print("FY2024:", [(r["metric"], r["status"]) for r in check24])
