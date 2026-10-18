"""QB1-A-NONFIN final delta cross-review: Codex 7d65277 -> 0c0de9e (implementation 656b70d), the three corrected records and FX-1 only.
Reads Codex's files from its commits with `git show`, the archived annual report with pypdf and pdftotext (not Codex's pdfplumber),
the engine source read-only, and re-runs Codex's two test suites in a scratch worktree, counting a test that cannot run as NOT_RUN.
Writes NONFIN-DELTA-REVIEW.json next to this file. Grants nothing beyond the evidence decision on the remediation.

Usage: ENGINE=<engine clone at b70254e with history> python3 nonfin_delta_review.py"""
import json, os, re, subprocess, sys, tempfile, hashlib
from pypdf import PdfReader

E = os.environ["ENGINE"]
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../../.."))
OLD, IMPL, NEW = "7d65277df4dc25b9755520b871d0bfcfbf63c281", "656b70dd78872c60be95744da3c5975cd7a25400", "0c0de9e95babcfcd55d852c4e65c81d9ca0943be"
Q = "review-delivery/ARAMCO95/QB1"
ANN = "78bb678e8e45f5c58fa1b2402ab5a29c5ad10adfda8ba5e7ee5f4d1ad76cd227"
run = lambda cwd, *a: subprocess.run(list(a), cwd=cwd, capture_output=True, check=True).stdout
show = lambda c, p: run(ROOT, "git", "show", f"{c}:{Q}/{p}")
can = lambda x: json.dumps(x, sort_keys=True, ensure_ascii=False)
fails, out = 0, {"checks": []}

def check(name, ok, detail=""):
    global fails
    fails += not ok
    out["checks"].append({"check": name, "pass": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail else ""))

# ---------- identity and scope of the delta ----------
heads = run(ROOT, "git", "rev-list", "--max-count=3", "origin/codex/aramco95-qb1-nonfinancial").decode().split()
check("remote branch: 0c0de9e <- 656b70d <- 7d65277", heads == [NEW, IMPL, OLD], " ".join(h[:7] for h in heads))
changed = run(ROOT, "git", "diff", "--name-only", OLD, NEW).decode().split()
check("delta touches only Codex's NONFINANCIAL/ and INDEPENDENT-SOURCE-CHECKS/; no Claude FINANCIAL file", changed and all(
    p.startswith((f"{Q}/NONFINANCIAL/", f"{Q}/INDEPENDENT-SOURCE-CHECKS/")) for p in changed), f"{len(changed)} files")
art = json.loads(show(NEW, "NONFINANCIAL/ARTIFACT-MANIFEST.json"))
bad = [p for p, h in art["files"].items() if hashlib.sha256(show(NEW, p)).hexdigest() != h]
check("every file in the new ARTIFACT-MANIFEST matches its SHA-256 at 0c0de9e", not bad, f"{len(art['files'])} files; mismatched {bad}")

o = {r["original_field_id"]: r for r in json.loads(show(OLD, "NONFINANCIAL/NONFIN-EVIDENCE-LEDGER.json"))["records"]}
n = {r["original_field_id"]: r for r in json.loads(show(NEW, "NONFINANCIAL/NONFIN-EVIDENCE-LEDGER.json"))["records"]}
diff = sorted(k for k in o if can(o[k]) != can(n[k]))
check("exactly the three corrected records changed; same 19 field IDs", set(o) == set(n) and diff == ["business_description", "employees", "products_services"], str(diff))
TEN = ["legal_name", "listing_date", "legal_form", "headquarters_address", "reporting_standard", "website", "ceo_name", "chairman_name", "auditor", "geographic_presence"]
SIX = ["legal_name_ar", "isin", "investor_relations_url", "founding_date", "subsidiaries_count", "credit_rating"]
check("the ten evidence-ok records are byte-identical (canonical JSON) to 7d65277", all(can(o[k]) == can(n[k]) for k in TEN))
check("the six pending records are byte-identical; none raised", all(can(o[k]) == can(n[k]) for k in SIX)
      and [n[k]["evidence"]["status"] for k in SIX] == [o[k]["evidence"]["status"] for k in SIX])
pend = json.loads(show(NEW, "NONFINANCIAL/PENDING-DECISIONS.json"))
check("PENDING-DECISIONS: six records, all PENDING_*, none closed by the preparer, no engine change authorised",
      sorted(r["field_id"] for r in pend["records"]) == sorted(SIX) and all(r["state"].startswith("PENDING_") and r["engine_change_authorized"] is False for r in pend["records"])
      and pend.get("none_closed_by_preparer") is True)
check("in the three changed records, engine value, engine reference and approval are unchanged",
      all(can(n[k][f]) == can(o[k][f]) for k in diff for f in ("original_engine_value", "engine_reference", "approval", "factory_category", "investor_topic", "display")))

# ---------- source, read here with two extractors ----------
pdf = f"{E}/data/raw/SA/2222/documents/{ANN}.pdf"
rd = PdfReader(pdf)
norm = lambda s: re.sub(r"\s+", " ", s or "")
def both(p): return norm(rd.pages[p - 1].extract_text()), norm(run(E, "pdftotext", "-raw", "-f", str(p), "-l", str(p), pdf, "-").decode())
def has(p, t): return any(t in x for x in both(p))

emp = n["employees"]; loc = {l["pdf_page"]: l for l in emp["evidence"]["locators"]}
check("employees: PDF16 carries footnote 4 (cross-reference to Section 3), and footnote 6 on PDF16 is about SABIC Agri-Nutrients / ZPC",
      has(16, "Company employees4") and has(16, "4. Refer to Section 3") and has(16, "6. Excludes SABIC Agri-Nutrients") and loc[16]["footnote"] == 4)
check("employees: PDF76 footnote 6 sets the Company-only scope; footnote 2 (employees and contractors) belongs to the safety rows, not the count",
      has(76, "Company employees6") and has(76, "6. Applies to the Saudi Arabian Oil Company (the Company).") and has(76, "2. Total workforce (employees and contractors).")
      and loc[76]["footnote"] == 6 and emp["source_observation_value"]["scope"] == "Saudi Arabian Oil Company (the Company)")
check("employees: 2025 column, no year-end or average claimed (information_as_of null, measurement_basis NOT_STATED, period FY2025)",
      has(76, "2025 2024 2023 2022 2021") and emp["dates"]["information_as_of"] is None and emp["dates"]["measurement_basis"] == "NOT_STATED"
      and emp["dates"]["period"] == "FY2025" and emp["source_observation_value"]["value"] == 76664)
check("employees: no source wording establishes year-end or average for the count", not any(has(76, w) for w in ("as at December 31, 2025", "average number of employees", "average headcount")))

ps = n["products_services"]; v = ps["source_observation_value"]
check("products_services: PDF56 is the primary locator and holds the direct Downstream list (with distribution)",
      v["primary_pdf_page"] == 56 and has(56, "refining, chemicals, supply and trading, distribution, retail, base oils, lubricants, and power generation")
      and [l["role"] for l in ps["evidence"]["locators"] if l["pdf_page"] == 56] == ["primary_downstream_list"])
miss = [(m["engine_item"], m["source_term"], m["pdf_page"]) for m in v["item_mapping"] if not has(m["pdf_page"], m["source_term"]) and not has(m["pdf_page"], m["source_term"].upper())]
check("products_services: every item mapping's source term is on its cited page", not miss and [m["engine_item"] for m in v["item_mapping"]] == ps["original_engine_value"], str(miss))
lit = {m["engine_item"]: m["relation"] for m in v["item_mapping"]}
check("products_services: wording differences flagged (retail fuels, trading, power not DIRECT_TERM; NGL an expansion)",
      all(lit[k] != "DIRECT_TERM" for k in ("retail fuels", "trading", "power")) and lit["natural gas liquids"] == "EXPANSION_OF_ABBREVIATION")
check("products_services: distribution documented as absent from the engine list, engine list not modified",
      v["source_term_absent_from_engine"] == "distribution" and "distribution" not in ps["original_engine_value"] and v["engine_list_modified"] is False)
check("products_services: still a composite needing review", ps["evidence"]["status"] == "COMPOSITE_REVIEW_REQUIRED")

bd = n["business_description"]
check("business_description: locators PDF 8 and 9, text present", [l["pdf_page"] for l in bd["evidence"]["locators"]] == [8, 9]
      and has(8, "integrated energy and chemicals companies") and has(9, "Our operating segments are Upstream and Downstream, which are supported by Corporate activities."))
check("business_description: SOURCE_SUPPORTED_PARAPHRASE and PARAPHRASE_NOT_DIRECT_QUOTATION; engine sentence is not on PDF 8/9 verbatim",
      bd["evidence"]["status"] == "SOURCE_SUPPORTED_PARAPHRASE" and bd["evidence"]["representation"] == "PARAPHRASE_NOT_DIRECT_QUOTATION"
      and not has(8, bd["original_engine_value"]) and not has(9, bd["original_engine_value"]))
check("printed page = PDF page − 2 for the new locators (8→6, 9→7, 56→54)", all(l["printed_page"] == l["pdf_page"] - 2 for k in diff for l in n[k]["evidence"]["locators"]))

# ---------- FX-1 addendum ----------
x = json.loads(show(NEW, "INDEPENDENT-SOURCE-CHECKS/FIN-SOURCE-CROSSCHECK.json")); f1 = x["fx1_correction"]
reg = json.loads(run(E, "git", "show", "42bd5c4:data/imports/aramco-2025-annual-metrics.json"))
lab = [f for f in reg["facts"] if f.get("label") == "cash and cash equivalents" and f["period_end"] == "2025-12-31" and f["period_kind"] == "instant"]
mp = run(E, "git", "show", "b70254e:src/finengine/mapping.py")
check("FX-1: previous claim marked incorrect; label fact equals the registered import; mapping.py:11 hash equals b70254e; no cash_end fallback",
      f1["previous_claim_incorrect"] and len(lab) == 1 and f1["matching_original_fact"] == lab[0] and f1["mapping_sha256"] == hashlib.sha256(mp).hexdigest()
      and '"cash and cash equivalents":"cash"' in mp.decode().splitlines()[10] and f1["cash_end_fallback_used"] is False and f1["mapped_metric"] == "cash")
check("FX-1: the old traceability sentence is gone, the 179 locator error is kept",
      not any("no matching original cash/instant JSON entry" in t for t in x["traceability_limits"]) and any("page179" in t for t in x["traceability_limits"]))
fx2 = {r["record_id"]: (r["committed_current"]["id"], r["claude_reported_post_repair_reference"]["id"]) for r in x["fx2_shared_identity_discrepancies"]["rows"]}
fin = {r["record_id"]: r for r in json.loads(run(ROOT, "git", "show", f"bb02da3:{Q}/FINANCIAL/FIN-EVIDENCE-LEDGER.json"))["records"]}
check("FX-2 addendum agrees with the corrected financial ledger bb02da3 (committed id, runtime id) for 001/004/006/053",
      fx2 == {k: (fin[k]["engine_data_point_id"], fin[k]["engine_runtime_repaired"]["data_point_id"]) for k in fx2} and len(fx2) == 4)

# ---------- Codex's suites, re-run in a scratch worktree ----------
with tempfile.TemporaryDirectory() as t:
    wt = os.path.join(t, "d", "repo"); os.makedirs(os.path.dirname(wt))
    run(ROOT, "git", "worktree", "add", "--detach", wt, NEW)
    os.symlink(E, os.path.join(t, "aramco95-engine-b70254e"))
    try:
        res = {}
        for suite in ("test_evidence.py", "test_remediation.py"):
            p = subprocess.run([sys.executable, suite], cwd=os.path.join(wt, Q, "NONFINANCIAL"), capture_output=True, text=True)
            lines = re.findall(r"^(test_\w+) \(__main__\.(\w+)\.\w+\) \.\.\. (ok|ERROR|FAIL|skipped.*)$", p.stderr, re.M)
            res[suite] = {name: st for name, _, st in lines}
            res[suite + ":class"] = {name: cls for name, cls, _ in lines}
    finally:
        run(ROOT, "git", "worktree", "remove", "--force", wt)
ev, rm = res["test_evidence.py"], res["test_remediation.py"]
src_tests = [k for k in rm if res["test_remediation.py:class"][k] == "IndependentSourceReads"]
structural = [k for k in rm if k not in src_tests]
not_run = {k: "private H1-2026 PDF (web08b02-private-20261017/H1-Q2-2026.pdf) not available here" for k, s in rm.items() if s == "ERROR" and k == "test_FX3_original_H1_hash_and_note"}
other_bad = {k: s for k, s in {**ev, **rm}.items() if s != "ok" and k not in not_run}
out["codex_suites"] = {"original_structural": {"run": len(ev), "passed": sum(s == "ok" for s in ev.values())},
                       "new_structural": {"run": len(structural), "passed": sum(rm[k] == "ok" for k in structural)},
                       "source_reader": {"total": len(src_tests), "passed": sum(rm[k] == "ok" for k in src_tests), "not_run": not_run},
                       "claimed_by_codex": "44 PASS", "result_here": f"{sum(s == 'ok' for s in {**ev, **rm}.values())} PASS, {len(not_run)} NOT_RUN (asset unavailable), {len(other_bad)} other"}
check("Codex suites here: 18/18 original, 14/14 new structural, 11/12 source tests pass; 1 NOT_RUN for a missing private PDF, not counted as PASS",
      len(ev) == 18 and all(s == "ok" for s in ev.values()) and len(structural) == 14 and all(rm[k] == "ok" for k in structural)
      and len(src_tests) == 12 and sum(rm[k] == "ok" for k in src_tests) == 11 and list(not_run) == ["test_FX3_original_H1_hash_and_note"] and not other_bad,
      out["codex_suites"]["result_here"])

# ---------- decision ----------
out["decision"] = "EVIDENCE_ACCEPT" if not fails else "TARGETED_REWORK"
out["scope_of_decision"] = "the NONFIN remediation delta 7d65277 -> 0c0de9e only; not qualification, rights, publication, or any owner definition"
out["classification"] = {
    "evidence_sound_engineering": TEN,
    "correction_sound_definition_approval_continues": {"employees": "value and Company-only scope evidenced; whether a parent-only count fits the catalog field 'employees' is a definition decision",
                                                       "products_services": "composite with item mapping; wording differences need editorial or owner approval",
                                                       "business_description": "source-supported paraphrase; the engine sentence needs editorial approval"},
    "pending_source_freshness_or_owner_decision": {k: next(r["state"] for r in pend["records"] if r["field_id"] == k) for k in SIX}}
out["not_decided_here"] = ["founding_date definition (owner)", "subsidiaries_count definition (owner)", "any FINANCIAL_ACCEPT", "rights and publication"]
out["reviewed"] = {"previous_delivery": OLD, "implementation": IMPL, "delivery": NEW}
json.dump(out, open(os.path.join(HERE, "NONFIN-DELTA-REVIEW.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
print("\n" + ("ALL PASS" if not fails else f"{fails} FAIL"), "| decision", out["decision"])
sys.exit(1 if fails else 0)
