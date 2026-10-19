"""FY2026 source cross-review of Codex 6133ac8/a2291a8 (INDEPENDENT-SOURCE-CHECKS/FY2026) and an integration map for the values
whose evidence is accepted. Read-only everywhere: Codex files via `git show`, the committed engine DB immutable, the site fixture
and site code read as text. Codex's structural suite is re-run in a scratch worktree; its PDF suite needs private originals that
are not here and is recorded as NOT_RUN. Writes FY2026-CROSSREVIEW.json and INTEGRATION-MAP.json next to this file.

Usage: ENGINE=<engine clone at b70254e with history> python3 fy2026_review_and_map.py"""
import gzip, hashlib, json, os, re, sqlite3, subprocess, sys, tempfile
E = os.environ["ENGINE"]
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../.."))
IMPL, DELIV, BASE = "6133ac87a3228f924cebcf01163a27b9b3d887d2", "a2291a811211984f6a5818564b3e48e800e5d2dc", "0c0de9e95babcfcd55d852c4e65c81d9ca0943be"
FIN, QB2 = "bb02da38ffa56e8a8d97de7b7288abbfe0eb9f2b", "b5010191d4b16cce9c5f885080667bb173e2d9cd"
F = "review-delivery/ARAMCO95/QB1/INDEPENDENT-SOURCE-CHECKS/FY2026"
run = lambda cwd, *a: subprocess.run(list(a), cwd=cwd, capture_output=True, check=True).stdout
show = lambda c, p: run(ROOT, "git", "show", f"{c}:{p}")
sha = lambda b: hashlib.sha256(b).hexdigest()
fails, out = 0, {"checks": []}
def check(name, ok, detail=""):
    global fails
    fails += not ok
    out["checks"].append({"check": name, "pass": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail else ""))

# ================= 1. cross-review =================
heads = run(ROOT, "git", "rev-list", "--max-count=3", "origin/codex/aramco95-qb1-nonfinancial").decode().split()
check("remote branch: a2291a8 <- 6133ac8 <- 0c0de9e", heads == [DELIV, IMPL, BASE], " ".join(h[:7] for h in heads))
changed = run(ROOT, "git", "diff", "--name-only", BASE, DELIV).decode().split()
check("delta stays in Codex's folders; no Claude FINANCIAL, QB2 or product file", all(p.startswith(("review-delivery/ARAMCO95/QB1/INDEPENDENT-SOURCE-CHECKS/", "review-delivery/ARAMCO95/QB1/NONFINANCIAL/")) for p in changed),
      f"{len(changed)} files; FY2026 {sum(p.startswith(F) for p in changed)}, NONFINANCIAL/SOURCE-CLOSURE (not reviewed here) {sum('/NONFINANCIAL/' in p for p in changed)}")
im = json.loads(show(DELIV, f"{F}/IMPLEMENTATION-MANIFEST.json"))
files = {x["path"]: x["sha256"] for x in im["entries"]}
bad = [p for p, h in files.items() if sha(show(DELIV, p)) != h]
check("IMPLEMENTATION-MANIFEST hashes match the bytes at a2291a8", files and not bad, f"{len(files)} files; mismatched {bad}")

reg = json.loads(show(DELIV, f"{F}/FY2026-ORIGINAL-SOURCE-REGISTER.json")); man = json.loads(show(DELIV, f"{F}/FY2026-SOURCE-MANIFEST.json"))
R = {r["record_id"]: r for r in reg["records"]}
led = show(FIN, "review-delivery/ARAMCO95/QB1/FINANCIAL/FIN-EVIDENCE-LEDGER.json"); L = {r["record_id"]: r for r in json.loads(led)["records"]}
check("register cites my ledger bb02da3 by commit and by SHA-256", reg["source_claude_delivery"] == FIN and reg["source_claude_ledger_sha256"] == sha(led))
my13 = sorted(k for k, r in L.items() if r["period"]["end"] >= "2026-01-01")
check("the 13 records are exactly my 2026 rows (no new or substituted record)", sorted(R) == my13, str(sorted(set(R) ^ set(my13))))
def cmp(k):
    r, l = R[k], L[k]
    return [x for x, ok in [
        ("value", int(r["source_value_sar_millions"]) * 1_000_000 == int(l["engine"]["value_sar"]) == int(r["engine_value_sar"])),
        ("metric", r["engine_metric_key"] == l["engine_metric_key"]),
        ("period", {a: r["period"][a] for a in ("kind", "end", "fiscal_year")} == {a: l["period"][a] for a in ("kind", "end", "fiscal_year")} and r["period"] == r["source_period"]),
        ("engine_row", (r["engine_reference"]["id"], r["engine_reference"]["version"], r["engine_reference"]["source_key"]) == (l["engine_data_point_id"], l["engine"]["version"], l["engine"]["source_key"])),
        ("document", (r["source_document"], r["source_document_sha256"]) == (l["designated_disclosure"]["key"], l["designated_disclosure"]["sha256_per_b02"])),
        ("page", (r["pdf_page"], r["printed_page"]) == (l["designated_disclosure"]["pdf_page"], l["designated_disclosure"]["printed_page"])),
        ("import_page", r["comparison_to_claude"]["import_claimed_page"] == l["locator_check"]["import_claimed_page"]),
        ("withheld", r["qualification"] == "WITHHELD" and not r["financial_acceptance"] and not r["publication_authorized"])] if not ok]
diffs = {k: cmp(k) for k in R if cmp(k)}
check("all 13 agree with bb02da3: value, metric, period, engine row/version/source, document hash, PDF/printed page, import page, WITHHELD", not diffs, str(diffs))

db = sqlite3.connect(f"file:{E}/data/financial.sqlite3?mode=ro&immutable=1", uri=True); db.row_factory = sqlite3.Row
CUR = """SELECT id, version, source_key, value_decimal, period_start FROM data_points WHERE company_id='sa:2222' AND is_current=1 AND metric_key=? AND period_kind=? AND period_end=?
         AND (dimensions_json IS NULL OR dimensions_json IN ('','{}','null'))"""
eng_bad = [k for k, r in R.items() if tuple(db.execute(CUR, (r["engine_metric_key"], r["period"]["kind"], r["period"]["end"])).fetchone()[:4])
           != (r["engine_reference"]["id"], r["engine_reference"]["version"], r["engine_reference"]["source_key"], r["engine_value_sar"])]
check("engine references equal the committed DB (immutable)", not eng_bad, str(eng_bad))

P = {"quarter": {1: ("2026-01-01", "2026-03-31"), 2: ("2026-04-01", "2026-06-30")}}
per_bad = []
for k, r in R.items():
    p = r["period"]
    if p["kind"] == "quarter" and (p["start"], p["end"]) != P["quarter"][p["fiscal_quarter"]]: per_bad.append(k)
    if p["kind"] == "ytd" and (p["start"], p["end"]) != ("2026-01-01", "2026-06-30"): per_bad.append(k)
    if p["kind"] == "instant" and p["start"] is not None: per_bad.append(k)
    if p["kind"] == "instant" and r["engine_metric_key"] not in ("cash", "total_equity"): per_bad.append(k)
    if p["kind"] != "instant" and r["engine_metric_key"] in ("cash", "total_equity"): per_bad.append(k)
check("periods: Q1 Jan–Mar, Q2 Apr–Jun, H1 YTD Jan–Jun; balances instant with null start; flows never instant", not per_bad, str(per_bad))
inst_engine_start = {db.execute(CUR, (r["engine_metric_key"], "instant", r["period"]["end"])).fetchone()["period_start"] for r in R.values() if r["period"]["kind"] == "instant"}
check("instant start: engine stores '' and the register maps it to null without inventing a date (R6 stays open)", inst_engine_start == {""} and all("null" in r["period_adapter"] for r in R.values()))
cnt = {(r["period"]["kind"], r["period"]["end"]) for r in R.values()}
check("counts: 5 Q1 (3 flows, 2 balances), 3 Q2 flows, 3 H1 YTD flows, 2 June balances", sorted(cnt) == sorted({("quarter", "2026-03-31"), ("instant", "2026-03-31"), ("quarter", "2026-06-30"), ("ytd", "2026-06-30"), ("instant", "2026-06-30")})
      and reg["record_counts"]["q1"] == 5 and reg["record_counts"]["q2"] == 3 and reg["record_counts"]["h1_or_june_instant"] == 5)
qc = {c["metric"]: c for c in reg["quarter_consistency_checks"]}
val = lambda m, kind, end: int(next(r for r in R.values() if r["engine_metric_key"] == m and r["period"]["kind"] == kind and r["period"]["end"] == end)["source_value_sar_millions"])
check("H1 − Q1 = Q2 for revenue, net income and OCF (recomputed here), used as a consistency check only", all(
    val(m, "ytd", "2026-06-30") - val(m, "quarter", "2026-03-31") == val(m, "quarter", "2026-06-30") == int(qc[m]["exact_h1_minus_q1"]) and qc[m]["publish_derived_fact"] is False
    for m in ("revenue", "net_income", "operating_cash_flow")) and all(not r["quarterly_derivation_used"] for r in R.values()))
b = reg["prefchem_bridge"]
r3 = next(i for i in json.loads(show(FIN, "review-delivery/ARAMCO95/QB1/FINANCIAL/FIN-RECONCILIATIONS.json"))["issues"] if i["id"].startswith("R3"))["independent_evidence"]
comp = {c["pdf_page"]: c["sar_millions"] for c in r3["components"]}
check("PRefChem: 167,387 + 3,466 = 170,853 at 2026-06-30 (PDF 29/42/31), equal to my R3 and to the engine row of 072",
      b["balance_cash"] + b["held_for_sale_cash"] == b["cash_end"] and (b["balance_cash"], b["held_for_sale_cash"], b["cash_end"]) == (comp[29], comp[42], comp[31])
      and (b["balance_pdf_page"], b["note_pdf_page"], b["cashflow_pdf_page"]) == (29, 42, 31) and int(R["FQ01-OBS-072"]["engine_value_sar"]) == b["balance_cash"] * 1_000_000)
check("PRefChem: cash and cash_end kept separate; 072 stays engine 'cash'; no bridge on equity rows",
      b["cash_and_cash_end_interchangeable"] is False and R["FQ01-OBS-072"]["engine_metric_key"] == "cash"
      and all("3466" not in json.dumps(R[k]) and "PRefChem" not in json.dumps(R[k], ensure_ascii=False) for k in R if R[k]["engine_metric_key"] == "total_equity"))
b02 = {d["key"]: d for d in json.load(open(os.path.join(ROOT, "review-delivery/WEB08B02/FINANCIAL-EVIDENCE-REGISTER.json")))["documents"]}
arch = {a["content_hash"] for a in json.load(open(os.path.join(E, "data/raw/archive-index.json")))["artifacts"]}
check("document hashes: Q1 e3f8215a…, H1 4773cfe4… equal B02 and the engine archive index; no import hash used as a PDF hash",
      all(d["original_pdf_sha256"] == b02[d["source_id"]]["sha256"] and d["original_pdf_sha256"] in arch for d in man["documents"])
      and not ({r["source_document_sha256"] for r in R.values()} & {r["engine_reference"]["source_key"][5:] for r in R.values()}))
LOC = json.load(open(os.path.join(ROOT, "review-delivery/WEB08B02/REVIEWED-LOCATORS.json")))["reviewed_pages"]
check("pages are B02-reviewed pages (Q1 23/25/27, H1 27/29/31; bridge note 42)", all(r["pdf_page"] in LOC[r["source_document"]] for r in R.values()) and 42 in LOC["H1-Q2-2026"])
q1imp = {k: R[k]["comparison_to_claude"]["import_claimed_page"] for k in R if R[k]["source_document"] == "Q1-2026"}
check("Q1 import pages stay one lower (22/24/26) and uncorrected; Q2 import carries no page — consistent with my R5",
      all(R[k]["pdf_page"] - p == 1 for k, p in q1imp.items()) and all(R[k]["comparison_to_claude"]["import_claimed_page"] is None for k in R if R[k]["source_document"] == "H1-Q2-2026")
      and all(r["comparison_to_claude"]["engine_import_locator_not_corrected"] for r in R.values()))
check("lineage: every 2026 row comes from the matching interim import (57c929d7 Q1, 471042c9 H1), not the mismatched annual import",
      all(r["engine_reference"]["source_key"][5:13] == {"Q1-2026": "57c929d7", "H1-Q2-2026": "471042c9"}[r["source_document"]] for r in R.values()))
check("no self-acceptance, no rights, R1–R8 not closed, holds 7/22/142/0", reg["self_acceptance"] is False and reg["R1_R8"].startswith("OPEN")
      and reg["holds"] == {"analyses_blocked": 7, "claims_withheld": 22, "inputs_withheld": 142, "financially_qualified": 0}
      and all(d["rights_grant"].startswith("UNKNOWN") for d in man["documents"]))

# Codex suites: structural run here; the original-PDF reader needs private files
with tempfile.TemporaryDirectory() as t:
    wt = os.path.join(t, "d", "repo"); os.makedirs(os.path.dirname(wt))
    run(ROOT, "git", "worktree", "add", "--detach", wt, DELIV)
    os.symlink(E, os.path.join(t, "aramco95-engine-b70254e"))
    try:
        res = {}
        for name, path in (("test_source_closure.py", F), ("test_evidence.py", "review-delivery/ARAMCO95/QB1/NONFINANCIAL"), ("test_remediation.py", "review-delivery/ARAMCO95/QB1/NONFINANCIAL")):
            p = subprocess.run([sys.executable, os.path.join(wt, path, name)], cwd=os.path.join(wt, path), capture_output=True, text=True)
            res[name] = {n: (c, s) for n, c, s in re.findall(r"^(test_\w+) \(__main__\.(\w+)\.\w+\) \.\.\. (ok|ERROR|FAIL|skipped.*)$", p.stderr, re.M)}
            res[name + ":rc"] = p.returncode
            res[name + ":tail"] = (p.stderr.strip().splitlines() or [""])[-1]
        pdf_needed = os.path.exists(os.path.join(t, "d", "web08b02-private-20261017", "Q1-2026.pdf"))
    finally:
        run(ROOT, "git", "worktree", "remove", "--force", wt)
sc, ev, rm = res["test_source_closure.py"], res["test_evidence.py"], res["test_remediation.py"]
not_run = {n: "private PDF absent here" for n, (c, s) in {**sc, **rm}.items() if s == "ERROR"}
out["codex_suites"] = {"test_source_closure.py": {"run": len(sc), "passed": sum(s == "ok" for _, s in sc.values()), "tail": res["test_source_closure.py:tail"]},
                       "test_evidence.py": {"run": len(ev), "passed": sum(s == "ok" for _, s in ev.values())},
                       "test_remediation.py": {"run": len(rm), "passed": sum(s == "ok" for _, s in rm.values()), "not_run": [n for n in not_run if n in rm]},
                       "check_original_sources.py / run_checks.py": "NOT_RUN: needs the private Q1/H1 originals (web08b02-private-20261017), absent here",
                       "private_pdfs_present": pdf_needed}
check("Codex structural suites here: test_source_closure 13/13, test_evidence 18/18, test_remediation 25/26 with the H1-PDF test NOT_RUN",
      len(sc) == 13 and all(s == "ok" for _, s in sc.values()) and len(ev) == 18 and all(s == "ok" for _, s in ev.values())
      and sum(s == "ok" for _, s in rm.values()) == 25 and list(not_run) == ["test_FX3_original_H1_hash_and_note"], json.dumps({k: v for k, v in out["codex_suites"].items() if isinstance(v, dict)}))
out["decision"] = "EVIDENCE_ACCEPT" if not fails else "TARGETED_REWORK"
out["decision_scope"] = "the FY2026 source addition only (13 matches, 3 consistency checks, the 072 bridge); the original-PDF reads rest on Codex and are not re-run here; no financial qualification; NONFINANCIAL/SOURCE-CLOSURE not reviewed"

# ================= 2. integration map =================
q2 = {r["id"]: r for r in json.loads(show(QB2, "review-delivery/ARAMCO95/QB2/FINANCIAL-HISTORY/HIST-FIN-LEDGER.json"))["annual"]}
fx = json.loads(gzip.decompress(open(os.path.join(ROOT, "tests/fixtures/codex-20261013/2222-page.json.gz"), "rb").read()))
hist = fx["sections"]["financials"]["history"]
SECTION = {"fy": "annual", "instant": "annual_position", "quarter": "quarter", "ytd": "quarter"}
def in_payload(m, kind, end):
    for p in hist.get(SECTION[kind], {}).get("periods", []):
        if p["period_end"] == end:
            for row in p["metrics"].get(m, []):
                if row["period_kind"] == kind: return {"version": row["version"], "source_key": row["source_key"], "value_sar": row["value"]}
    return None
src = {f: open(os.path.join(ROOT, f), encoding="utf8").read() for f in ("src/lib/engine/company-preview.ts", "src/lib/engine/statements.ts")}
grab = lambda name, text: re.findall(r'"([a-z_]+)"', re.search(name + r"[^=]*=\s*(\{[\s\S]*?\n\};|\[[\s\S]*?\];)", text).group(1).split("bank:")[0])
INCOME, BALANCE, CASHF, INTERIM = grab("export const INCOME", src["src/lib/engine/company-preview.ts"]), grab("export const BALANCE", src["src/lib/engine/company-preview.ts"]), \
    grab("export const CASH_FLOW", src["src/lib/engine/company-preview.ts"]), grab("const INTERIM", src["src/lib/engine/company-preview.ts"])
KEYF = grab("const KEY_FIGURES", src["src/lib/engine/statements.ts"])
latest = {"fy": "2025-12-31", "instant": "2025-12-31"}
def pages(m, kind, end):
    block = ("income" if m in INCOME else "cash_flow" if m in CASHF else None) if kind == "fy" else ("balance" if m in BALANCE else None) if kind == "instant" else ("interim" if m in INTERIM else None)
    return {"overview": ("key figure (latest period)" if m in KEYF and end == latest.get(kind) else "not consumed"),
            "investor": (f"topic 5 financials, block '{block}' — /preview/web-v1/companies/2222/intelligence?topic=financials&focus={m}" if block else "not consumed"),
            "data": (f"Data › financials tab, statements explorer ({'annual' if kind in ('fy', 'instant') else 'quarterly'}) — /preview/web-v1/companies/2222?tab=financials" if block else "not consumed")}
rows = []
def add(rec_id, m, period, engine, evidence, accepted, issues):
    kind, end = period["kind"], period["end"]
    pl = in_payload(m, kind, end)
    eng_row = engine and {"data_point_id": engine.get("data_point_id"), "version": engine.get("version"), "source_key": engine.get("source_key"), "value_sar": engine.get("value_sar")}
    need = []
    if not engine: need.append("ENGINE_ENTRY")
    elif not pl: need.append("PAGE_PAYLOAD_EXPOSURE (engine has the row; /page does not return this period kind)")
    elif (pl["source_key"], pl["version"]) != (engine["source_key"], engine["version"]): need.append("PAYLOAD_SERVES_RUNTIME_REPAIRED_ROW (decide which state is the reference)")
    if pl and engine and pl["value_sar"] != engine["value_sar"]: need.append("VALUE_MISMATCH")
    need += [i for i in issues]
    rows.append({"record": rec_id, "field_id": m, "metric_key": m, "period": {k: period.get(k) for k in ("kind", "start", "end", "fiscal_year", "fiscal_quarter")},
                 "engine_committed": eng_row, "page_payload_fixture": pl, "evidence": evidence, "evidence_review": accepted,
                 "needs": need, "qualification": "WITHHELD", "rights": "UNKNOWN_NO_GRANT_ISSUED", "consumption": pages(m, kind, end)})
for k, l in sorted(L.items()):
    ev = {"document": l["designated_disclosure"]["key"], "sha256": l["designated_disclosure"]["sha256_per_b02"], "pdf_page": l["designated_disclosure"]["pdf_page"], "line": l["designated_disclosure"]["line"]}
    if l["comparison_with_source"]["performed"]:
        ev |= {"read_here": {"document": "ARA2025", "sha256": l["comparison_with_source"]["document_sha256"], "pdf_page": l["comparison_with_source"]["pdf_page"]}}
    acc = "EVIDENCE_ACCEPT (QB1-A, both reviewers)" + ("; original PDF matched by Codex FY2026, accepted here" if k in R else "")
    issues = [i.split("-")[0] for i in l["issues"] if not i.startswith(("R7", "R8")) or (i.startswith("R8") and k not in R)]
    add(k, l["engine_metric_key"], l["period"], {"data_point_id": l["engine_data_point_id"], "version": l["engine"]["version"], "source_key": l["engine"]["source_key"], "value_sar": l["engine"]["value_sar"]}, ev, acc, issues + ["R7"])
for k, f in sorted(q2.items()):
    if f["value_in_source"] is None: continue
    e = f["engine"]
    add(k, f["metric"], f["period"], e and {"data_point_id": e["data_point_id"], "version": e["version"], "source_key": e["source_key"], "value_sar": e["value_sar"]},
        {"document": "ARA2025", "sha256": f["source"]["sha256"], "pdf_page": f["source"]["pdf_page"], "line": f["source"]["line"], "class": f["evidence_class"]},
        "PREPARED (QB2-A b501019), cross-review pending", ["R7", "AUDITED_STATEMENTS_NEEDED"])
need_counts = {}
for r in rows:
    for n in r["needs"]: need_counts[n.split(" ")[0]] = need_counts.get(n.split(" ")[0], 0) + 1
# smallest batch: accepted QB1 values for FY2025, already in engine and payload, nothing pending beyond R4/R6/R7 (definition, instant identity, disclosure hash)
batch = [r["record"] for r in rows if r["record"].startswith("FQ01") and r["period"]["end"] == "2025-12-31" and r["page_payload_fixture"]
         and all(n.split(" ")[0] in ("R4", "R6", "R7") for n in r["needs"])]
integration = {"schema": "marefa-aramco-integration-map/1", "rows": rows, "need_counts": need_counts,
    "single_source": {"finding": "Overview, Investor and Data all render from one CompanyPreview built by buildCompanyPreview() from one engine /page payload (or the frozen fixture); none keeps its own copy of values",
                      "evidence_binding": "attach evidence once, in that payload path, keyed by (metric, period_kind, period_end, version, source_key) and guarded by value equality; all three pages then read the same record"},
    "smallest_local_batch": {"records": batch, "why": "FY2025 values read here in ARA2025, accepted by both reviewers, already in the engine and in the page payload with the same row, and consumed by all three pages (revenue, net income and total equity as Overview key figures; topic 5; Data statements). Cash 2025 (058) is left out: the payload does not return balance-sheet cash",
                             "excludes": "values that need engine entry or payload exposure, and anything whose state reference is undecided",
                             "test": "local only, frozen fixture + evidence overlay; each value shows document hash and page, stays WITHHELD, and the three pages show one identical record; a changed value, version or source_key drops the binding (fail-closed)",
                             "holds_unchanged": "7/22/142/0; no publication"}}
json.dump(out, open(os.path.join(HERE, "FY2026-CROSSREVIEW.json"), "w"), ensure_ascii=False, indent=1)
json.dump(integration, open(os.path.join(HERE, "INTEGRATION-MAP.json"), "w"), ensure_ascii=False, indent=1)
print("\n" + ("ALL PASS" if not fails else f"{fails} FAIL"), "| decision", out["decision"], "| map rows", len(rows), need_counts, "| batch", batch)
sys.exit(1 if fails else 0)
