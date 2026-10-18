"""QB1-A-FIN (central event 123): financial evidence ledger for the 23 values of FIN-QUAL-BATCH-01 (sa:2222).
Read-only on the engine (an isolated DB copy, the committed import files and the archived annual-report PDF); nothing is
approved, every record stays WITHHELD. The 19 non-financial facts are Codex's scope and are not built here.

Usage: ENGINE=<engine clone at b70254e with history> OUT=<dir with engine-copy.sqlite3 from measure_engine.py> python3 qb1_fin_build.py
Writes review-delivery/ARAMCO95/QB1/FINANCIAL/{FIN-EVIDENCE-LEDGER,FIN-SOURCE-MANIFEST,FIN-RECONCILIATIONS}.json"""
import hashlib, json, os, re, sqlite3, subprocess
E, O = os.environ["ENGINE"], os.environ["OUT"]
PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QB = os.path.join(PKG, "QB1", "FINANCIAL"); os.makedirs(QB, exist_ok=True)
B02 = os.path.join(os.path.dirname(PKG), "WEB08B02")
sha = lambda b: hashlib.sha256(b).hexdigest()
git = lambda *a: subprocess.run(["git", "-C", E, *a], capture_output=True, check=True).stdout

# ---------- the one Aramco disclosure available here: the archived FY2025 annual report ----------
ARA_SHA = "78bb678e8e45f5c58fa1b2402ab5a29c5ad10adfda8ba5e7ee5f4d1ad76cd227"
ARA = os.path.join(E, "data/raw/SA/2222/documents", ARA_SHA + ".pdf")
ara_bytes = open(ARA, "rb").read()
assert sha(ara_bytes) == ARA_SHA, "archived annual report does not match its content hash"
index = json.load(open(os.path.join(E, "data/raw/archive-index.json")))
ara_index = next(a for a in index["artifacts"] if a["content_hash"] == ARA_SHA)
def page_text(p, layout=True):
    args = ["pdftotext"] + (["-layout"] if layout else []) + ["-f", str(p), "-l", str(p), ARA, "-"]
    return subprocess.run(args, capture_output=True, check=True).stdout.decode("utf-8", "replace")
printed = lambda p: p - 2          # verified on PDF pages 37, 174, 176, 178 and 173 (footer page numbers)
NUM = r"\(?[\d,]+\)?"
def sar_columns(line):
    nums = re.findall(NUM, line)
    vals = [int(n.strip("()").replace(",", "")) * (-1 if n.startswith("(") else 1) for n in nums if any(ch.isdigit() for ch in n)]
    return vals[-4:]               # SAR 2025, SAR 2024, USD 2025, USD 2024 (the note number, if any, comes first)
def statement_line(page, label=None, after=None):
    lines = page_text(page).splitlines()
    for i, ln in enumerate(lines):
        s = ln.strip()
        if after is not None:
            if s.startswith(after):
                nxt = next(x for x in lines[i + 1:] if x.strip())
                return nxt.strip(), sar_columns(nxt), "unlabelled subtotal after '" + after + "'"
        elif re.match(re.escape(label) + r"\s{2,}", s):
            return s, sar_columns(s), label
    raise KeyError((page, label, after))
STATEMENTS = {   # metric -> (statement, pdf page, how the line is found)
    "revenue": ("Consolidated statement of income", 174, dict(label="Revenue")),
    "net_income": ("Consolidated statement of income", 174, dict(label="Net income")),
    "operating_cash_flow": ("Consolidated statement of cash flows", 178, dict(label="Net cash provided by operating activities")),
    "cash": ("Consolidated balance sheet", 176, dict(label="Cash and cash equivalents")),
    "total_equity": ("Consolidated balance sheet", 176, dict(after="Non-controlling interests")),
}
ara_lines = {}
for m, (stmt, p, how) in STATEMENTS.items():
    text, cols, label = statement_line(p, **how)
    assert page_text(p).lstrip().startswith(stmt), (m, p)
    ara_lines[m] = dict(statement=stmt, pdf_page=p, printed_page=printed(p), line_label=label, sar_millions_2025=cols[0], sar_millions_2024=cols[1])

# ---------- engine: isolated DB copy, import files and their committed history ----------
db = sqlite3.connect(f"file:{O}/engine-copy.sqlite3?mode=ro", uri=True); db.row_factory = sqlite3.Row
def import_info(source_key):
    sd = db.execute("SELECT * FROM source_documents WHERE source_key=?", (source_key,)).fetchone()
    rel = sd["local_path"].replace("\\", "/")
    cur = sha(open(os.path.join(E, rel), "rb").read())
    hist = []
    for line in git("log", "--format=%h %ad", "--date=short", "--", rel).decode().split("\n"):
        if line.strip():
            c, d = line.split()
            hist.append({"commit": c, "date": d, "sha256": sha(git("show", f"{c}:{rel}"))})
    return {"source_key": source_key, "import_file": rel, "registered_hash": sd["content_hash"], "current_file_hash": cur,
            "hash_matches": sd["content_hash"] == cur, "registered_at": sd["created_at"], "filing_type": sd["filing_type"],
            "filed_at": sd["filed_at"], "source_url": sd["source_url"],
            "registered_hash_found_in_history": next((h for h in hist if h["sha256"] == sd["content_hash"]), None), "history": hist}
imports = {}

# ---------- financial ledger ----------
fq = json.load(open(os.path.join(PKG, "FIN-QUAL-BATCH-01.json")))
b02_docs = {d["key"]: d for d in json.load(open(os.path.join(B02, "FINANCIAL-EVIDENCE-REGISTER.json")))["documents"]}
TITLE = {"FY2024": "Saudi Aramco — Consolidated financial statements for the year ended December 31, 2024",
         "FY2025": "Saudi Aramco — Consolidated financial statements for the year ended December 31, 2025",
         "Q1-2026": "Saudi Aramco — Q1 2026 interim report (condensed consolidated interim financial statements)",
         "H1-Q2-2026": "Saudi Aramco — H1 2026 interim report (condensed consolidated interim financial statements)"}
GROUP = {"revenue": "income_statement", "net_income": "income_statement", "operating_cash_flow": "cash_flow", "cash": "balance_sheet", "total_equity": "balance_sheet"}
fin = []
for r in fq["rows"]:
    m, per = r["metric"], r["period"]
    dp = db.execute("""SELECT id, metric_key, value_decimal, unit, currency, source_key, form, filed_at FROM data_points WHERE company_id='sa:2222' AND is_current=1
        AND metric_key=? AND period_kind=? AND period_end=? AND (dimensions_json IS NULL OR dimensions_json IN ('','{}','null'))""", (m, per["kind"], per["end"])).fetchone()
    imp = imports.setdefault(dp["source_key"], import_info(dp["source_key"]))
    raw = json.loads(git("show", f"HEAD:{imp['import_file']}"))
    claimed = [f for f in raw.get("facts", []) if (f.get("metric") == m or (m == "cash" and f.get("label") == "cash and cash equivalents"))
               and f.get("period_end") == per["end"] and f.get("period_kind") == per["kind"]]
    doc = b02_docs[r["source"]["document"]]
    year = per["end"][:4]
    in_ara = per["kind"] in ("fy", "instant") and year in ("2025", "2024")
    comparison = {"performed": False}
    if in_ara:
        a = ara_lines[m]; src_m = a[f"sar_millions_{year}"]; eng_m = int(dp["value_decimal"]) // 1_000_000
        comparison = {"performed": True, "against": "archived FY2025 annual report (alternative official Aramco document)",
                      "document_sha256": ARA_SHA, "pdf_page": a["pdf_page"], "printed_page": a["printed_page"], "statement": a["statement"],
                      "line": a["line_label"], "column": f"SAR millions, {'current year' if year == '2025' else 'comparative (prior year) column'}",
                      "source_value_sar_millions": src_m, "engine_value_sar_millions": eng_m, "equal": src_m == eng_m,
                      "exact_engine_value_divisible_by_million": int(dp["value_decimal"]) % 1_000_000 == 0,
                      "limitation": ("designated document (B02 " + r["source"]["document"] + ") not accessible; compared with the same consolidated statements in the annual report"
                                     if year == "2025" else "compared with the FY2025 comparative column only; the original FY2024 statements (B02 FY2024) are not accessible, so a restatement cannot be ruled out")}
    else:
        comparison["reason"] = "no Aramco PDF for this period is accessible: aramco.com is denied by this environment's network policy, and neither the engine archive nor this repository holds it"
    fy24 = None
    if per["end"] == "2024-12-31":
        orig = db.execute("""SELECT value_decimal, form, filed_at, source_url, is_current, version FROM data_points WHERE company_id='sa:2222' AND metric_key=?
            AND period_kind=? AND period_end=? AND (dimensions_json IS NULL OR dimensions_json IN ('','{}','null')) AND filed_at < '2026-01-01'""", (m, per["kind"], per["end"])).fetchall()
        fy24 = {"original_period_value_in_engine": [dict(o) for o in orig],
                "status": ("ORIGINAL_EQUALS_COMPARATIVE_SECONDARY_EVIDENCE" if orig and all(o["value_decimal"] == dp["value_decimal"] for o in orig)
                           else "ORIGINAL_DIFFERS" if orig else "NO_ORIGINAL_PERIOD_VALUE_AVAILABLE"),
                "evidence_kind": "engine import of the FY2024 annual report (not the PDF; the FY2024 PDFs are not accessible here)" if orig else None,
                "b02_note": "B02 compared against the FY2024 statements and recorded REVIEW_DIFFERENCE / source_url_differs (attribution), without a value difference"}
    issues = ["R7-engine-hash-is-import-not-disclosure"]
    if not imp["hash_matches"]: issues.append("R1-import-version-hash-mismatch")
    if per["end"] == "2024-12-31": issues.append("R2-fy2024-comparative-vs-original")
    if m == "cash" and per["end"] == "2026-06-30": issues.append("R3-prefchem-cash-bridge-h1-2026")
    if m == "total_equity": issues.append("R4-equity-specific-evidence")
    if per["kind"] == "instant": issues.append("R6-instant-period-identity")
    if in_ara and claimed and claimed[0].get("page") not in (None, comparison["pdf_page"]): issues.append("R5-engine-page-locator-offset")
    if not in_ara: issues.append("R8-designated-document-not-accessible")
    ready = in_ara and comparison["equal"] and year == "2025"
    fin.append({
        "record_id": r["id"], "company_id": "sa:2222", "metric_name": r["metric_ar"], "engine_metric_key": m, "engine_data_point_id": dp["id"],
        "contract": {"category": "financial_statements", "field_group": GROUP[m], "field_key": m if m != "cash" else "cash"},
        "period": per, "unit": "SAR", "currency": "SAR", "scale_note": "engine stores SAR units; Aramco statements print SAR millions",
        "definition": r["definition_ar"], "basis": "IFRS as endorsed in the Kingdom of Saudi Arabia and SOCPA pronouncements; consolidated",
        "designated_disclosure": {"key": r["source"]["document"], "title": TITLE[r["source"]["document"]], "published": doc["published"],
                                  "assurance": doc["assurance"], "pdf_url": doc["url"], "pdf_file": doc["url"].rsplit("/", 1)[-1], "sha256_per_b02": doc["sha256"],
                                  "pdf_page": r["source"]["pdf_page"], "printed_page": r["source"]["printed_page"], "table": r["source"]["table"],
                                  "line": r["source"]["line_label"], "accessible_here": False, "sha256_verified_here": False},
        "value_in_source": ({"sar_millions": comparison["source_value_sar_millions"], "document": "archived FY2025 annual report"} if comparison["performed"] else None),
        "engine": {"value_sar": dp["value_decimal"], "form": dp["form"], "filed_at": dp["filed_at"], "import_file": imp["import_file"],
                   "import_registered_hash": imp["registered_hash"], "import_current_hash": imp["current_file_hash"], "import_hash_matches": imp["hash_matches"],
                   "import_claimed_page": claimed[0].get("page") if claimed else None, "import_claimed_table": claimed[0].get("table") if claimed else None,
                   "note": "the import hash identifies a JSON import file, not an Aramco disclosure; it is never used as the disclosure hash"},
        "comparison_with_source": comparison, "fy2024_original_check": fy24, "b02_comparison": r["source_match"]["b02_comparison"],
        "reconciliation": r["reconciliation_ar"], "issues": issues,
        "evidence_status": ("SOURCE_MATCHED_ALTERNATIVE_OFFICIAL_DOCUMENT" if ready else
                            "MATCHED_COMPARATIVE_ONLY_RESTATEMENT_UNCHECKED" if in_ara else "SOURCE_DOCUMENT_NOT_ACCESSIBLE"),
        "ready_for_financial_review": ready,
        "qualification": {"state": "WITHHELD", "publication_authorized": False, "blockers": r["qualification"]["b02_reasons"]},
        "target_display": r["target_display"],
    })

# ---------- source manifest and reconciliation issues ----------
manifest = {"schema": "marefa-aramco-qb1-fin-source-manifest/1",
    "aramco_documents": [{"key": k, "title": TITLE[k], "pdf_file": d["url"].rsplit("/", 1)[-1], "pdf_url": d["url"], "published": d["published"],
                          "assurance": d["assurance"], "sha256_per_b02": d["sha256"], "pages_per_b02": d["pages"], "accessible_here": False,
                          "why": "aramco.com denied by the environment network policy; not in the engine archive or this repository; B02 copies are private",
                          "used_by": sorted({x["record_id"] for x in fin if x["designated_disclosure"]["key"] == k})} for k, d in b02_docs.items()]
                        + [{"key": "ARA2025", "title": "Saudi Aramco Annual Report 2025 (English)", "pdf_file": "saudi-aramco-ara-2025-english.pdf", "pdf_url": ara_index["source_url"],
                            "sha256": ARA_SHA, "sha256_verified_here": True, "bytes": len(ara_bytes), "pages": 246, "archived_in_engine": ara_index["local_path"].replace("\\", "/"),
                            "archived_at": ara_index["archived_at"], "auditor_report_date": "2026-03-09", "accessible_here": True,
                            "pages_used": {m: {"pdf_page": v["pdf_page"], "printed_page": v["printed_page"], "statement": v["statement"], "line": v["line_label"]} for m, v in ara_lines.items()}}],
    "engine_import_files": list(imports.values()),
    "rule": "an import-file hash is never used as an Aramco disclosure hash"}
def ids(pred): return [x["record_id"] for x in fin if pred(x)]
issues = [
 {"id": "R1-import-version-hash-mismatch", "type": "source_hash_mismatch", "status": "OPEN", "records": ids(lambda x: "R1-import-version-hash-mismatch" in x["issues"]),
  "handoff_note": "the same import is the engine source of the 19 company_model attributes (Codex non-financial scope); recorded here only as information",
  "finding": "data/imports/aramco-2025-annual-metrics.json is registered in the engine under its version at commit 42bd5c4 (2026-09-04); on 2026-09-15 (6a64063) three unrelated facts were added and the file was never re-registered.",
  "cause": "import-file version difference (file updated after ingestion). Not a change of source content, not a regenerated file, not a document-link error: the cash and attribute lines are identical in both versions.",
  "evidence": {k: v for k, v in next(v for v in imports.values() if not v["hash_matches"]).items() if k in ("import_file", "registered_hash", "current_file_hash", "registered_at", "registered_hash_found_in_history", "history")},
  "reproduce": "git -C $ENGINE show 42bd5c4:data/imports/aramco-2025-annual-metrics.json | sha256sum  # equals the registered hash",
  "needed": "engine-side re-registration of the import or a recorded supersession; hashes are not edited to match", "blocks": "qualification (engine provenance), not the source comparison"},
 {"id": "R2-fy2024-comparative-vs-original", "type": "restatement_check", "status": "OPEN", "records": ids(lambda x: "R2-fy2024-comparative-vs-original" in x["issues"]),
  "finding": "the engine's FY2024 values equal the comparative column of the FY2025 statements (annual report PDF 174/176/178). Original-period evidence: cash 2024-12-31 has an older engine version from the FY2024 annual report import equal to the comparative (216,642; secondary evidence, not the PDF); revenue, net income, operating cash flow and total equity have no original-period value in the engine. The FY2024 PDFs are not accessible here",
  "per_record": "fy2024_original_check in FIN-EVIDENCE-LEDGER.json",
  "needed": "B02 FY2024 statements (sha256 b8a29772…, pages 12/14/16) or the FY2024 annual report PDF, to compare original vs comparative and record any restatement", "blocks": "review"},
 {"id": "R3-prefchem-cash-bridge-h1-2026", "type": "cash_bridge", "status": "OPEN", "records": ["FQ01-OBS-072"],
  "finding": "at 2025-12-31 balance-sheet cash equals cash-flow ending cash (243,099 on PDF 176 and 178), and note 35 lists EP and ETP, not PRefChem, as held for sale; the PRefChem held-for-sale classification is a 2026 event",
  "needed": "H1-2026 interim report (sha256 4773cfe4…): balance sheet PDF 29, cash flows PDF 31, note 16(a) PDF 42, to rebuild balance-sheet cash vs ending cash including cash held for sale", "not_rebuilt_here": True, "blocks": "review of FQ01-OBS-072 only"},
 {"id": "R4-equity-specific-evidence", "type": "equity_definition", "status": "OPEN", "records": ids(lambda x: x["engine_metric_key"] == "total_equity"),
  "finding": "total equity is the unlabelled subtotal after non-controlling interests (PDF 176: 1,721,744 and 1,651,355); the cash-bridge note previously attached to equity was removed (FIN-QUAL-BATCH-01.json correction_log)",
  "needed": "confirm the subtotal is total equity including NCI; check the statement of changes in equity ties to it; FY2024 original vs comparative (R2); interim balance sheets for 2026 dates", "blocks": "review of equity rows"},
 {"id": "R5-engine-page-locator-offset", "type": "locator", "status": "OPEN", "records": ids(lambda x: "R5-engine-page-locator-offset" in x["issues"]),
  "finding": "the import cites pages 179/180/181 for the balance sheet and cash flows; in the archived PDF they are PDF 176 and 178 (printed 174 and 176)", "needed": "engine locator correction (separate engine task)", "blocks": "qualification"},
 {"id": "R6-instant-period-identity", "type": "period_identity", "status": "OPEN", "records": ids(lambda x: "R6-instant-period-identity" in x["issues"]),
  "finding": "instant balances carry period_start '' and a fiscal quarter in the engine (B02 PERIOD_DIFFERENCE / REQUESTED_PERIOD_NOT_IN_SNAPSHOT)", "needed": "engine period identity null start for instants", "blocks": "linkage"},
 {"id": "R7-engine-hash-is-import-not-disclosure", "type": "provenance", "status": "OPEN", "records": [x["record_id"] for x in fin],
  "finding": "every engine fact here points to a JSON import file hash, never to the Aramco PDF hash", "needed": "bind each fact to its disclosure hash and page (engine task)", "blocks": "qualification"},
 {"id": "R8-designated-document-not-accessible", "type": "access", "status": "OPEN", "records": ids(lambda x: "R8-designated-document-not-accessible" in x["issues"]),
  "finding": "Q1-2026 and H1-2026 interim reports are not accessible here; no value comparison was performed", "needed": "network access to aramco.com or the B02 private copies with matching sha256", "blocks": "review"}
]
corrections = fq.get("correction_log", [])
json.dump({"schema": "marefa-aramco-qb1-fin-ledger/1", "company_id": "sa:2222", "records": fin}, open(f"{QB}/FIN-EVIDENCE-LEDGER.json", "w"), ensure_ascii=False, indent=1)
json.dump(manifest, open(f"{QB}/FIN-SOURCE-MANIFEST.json", "w"), ensure_ascii=False, indent=1)
json.dump({"schema": "marefa-aramco-qb1-fin-reconciliations/1", "issues": issues, "corrections": corrections}, open(f"{QB}/FIN-RECONCILIATIONS.json", "w"), ensure_ascii=False, indent=1)
print("fin", len(fin), "ready", sum(x["ready_for_financial_review"] for x in fin), {s: sum(1 for x in fin if x["evidence_status"] == s) for s in {x["evidence_status"] for x in fin}})
print("issues", len(issues), "imports", [(v["import_file"].rsplit("/", 1)[-1], v["hash_matches"]) for v in imports.values()])
for m, v in ara_lines.items(): print("ARA", m, v["pdf_page"], v["sar_millions_2025"], v["sar_millions_2024"])
