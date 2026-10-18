"""QB1-A-NONFIN independent cross-review of Codex's 19 non-financial records (codex/aramco95-qb1-nonfinancial @ 7d65277).
Reads Codex's files from its commit with `git show` (never from or into its working files), the committed engine DB
read-only (immutable), the engine import history, the archived annual-report PDF (pypdf, independent of Codex's tools)
and the site code. Writes NONFIN-CROSSREVIEW.json next to this file. Grants nothing: no ACCEPT, no qualification.

Usage: ENGINE=<engine clone at b70254e with history> python3 nonfin_crossreview.py   (prints PASS/FAIL/FINDING lines)"""
import hashlib, json, os, re, sqlite3, subprocess, sys, tempfile
from datetime import date, timedelta
from pypdf import PdfReader

E = os.environ["ENGINE"]
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../../.."))
BRANCH, IMPL, DELIV = "origin/codex/aramco95-qb1-nonfinancial", "2dcd818c95334fd2ecec770d8e78003dde65d7cd", "7d65277df4dc25b9755520b871d0bfcfbf63c281"
Q = "review-delivery/ARAMCO95/QB1"
ANN = "78bb678e8e45f5c58fa1b2402ab5a29c5ad10adfda8ba5e7ee5f4d1ad76cd227"
IMPORT = "data/imports/aramco-2025-annual-metrics.json"
REGISTERED = "1a836a305b8b4a48887468de1ae0a9f8e4c7a5dfde4f4cdcef01cfd12f498a5f"
run = lambda cwd, *a: subprocess.run(list(a), cwd=cwd, capture_output=True, check=True).stdout
show = lambda path: run(ROOT, "git", "show", f"{DELIV}:{Q}/{path}")
sha = lambda b: hashlib.sha256(b).hexdigest()
fails, out = 0, {"checks": [], "findings": []}

def check(name, ok, detail=""):
    global fails
    fails += not ok
    out["checks"].append({"check": name, "pass": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail else ""))

def finding(fid, target, text):
    out["findings"].append({"id": fid, "target": target, "finding": text})
    print(f"FINDING {fid} [{target}] {text}")

# ---------- 1. Codex delivery identity: commits on the remote branch, file hashes as declared ----------
heads = run(ROOT, "git", "rev-list", "--max-count=2", BRANCH).decode().split()
check("Codex branch head is the delivery commit and its parent the implementation commit", heads == [DELIV, IMPL], " ".join(h[:7] for h in heads))
art = json.loads(show("NONFINANCIAL/ARTIFACT-MANIFEST.json"))
bad = [p for p, h in art["files"].items() if sha(show(p)) != h]
check("every file in Codex ARTIFACT-MANIFEST matches its declared SHA-256 at 7d65277", not bad, f"{len(art['files'])} files; mismatched {bad}")
changed = run(ROOT, "git", "diff", "--name-only", "a76286c", DELIV).decode().split()
check("Codex changed only its owned directories since a76286c", all(p.startswith((f"{Q}/NONFINANCIAL/", f"{Q}/INDEPENDENT-SOURCE-CHECKS/")) for p in changed), f"{len(changed)} files")
L = json.loads(show("NONFINANCIAL/NONFIN-EVIDENCE-LEDGER.json")); M = json.loads(show("NONFINANCIAL/NONFIN-SOURCE-MANIFEST.json"))
X = json.loads(show("INDEPENDENT-SOURCE-CHECKS/FIN-SOURCE-CROSSCHECK.json"))
R = {r["original_field_id"]: r for r in L["records"]}

# ---------- 2. Codex's 18 tests, re-run here from its committed bytes in a scratch directory ----------
with tempfile.TemporaryDirectory() as t:
    for p in ("NONFINANCIAL/test_evidence.py", "NONFINANCIAL/NONFIN-EVIDENCE-LEDGER.json", "NONFINANCIAL/NONFIN-SOURCE-MANIFEST.json", "INDEPENDENT-SOURCE-CHECKS/FIN-SOURCE-CROSSCHECK.json"):
        os.makedirs(os.path.join(t, os.path.dirname(p)), exist_ok=True); open(os.path.join(t, p), "wb").write(show(p))
    r = subprocess.run([sys.executable, "-I", "NONFINANCIAL/test_evidence.py"], cwd=t, capture_output=True, text=True)
    n = re.search(r"Ran (\d+) tests", r.stderr)
check("Codex's 18 tests re-run independently: 18 run, OK", r.returncode == 0 and n and n.group(1) == "18", (r.stderr.strip().splitlines() or [""])[-1])
out["codex_tests_rerun"] = {"ran": int(n.group(1)) if n else None, "returncode": r.returncode, "note": "structural/negative-mutation tests; they do not read the PDF or the engine, so they cannot confirm a source value"}

# ---------- 3. Field IDs and categories ----------
db = sqlite3.connect(f"file:{E}/data/financial.sqlite3?mode=ro&immutable=1", uri=True); db.row_factory = sqlite3.Row
catalog = {r["field_key"] for r in db.execute("SELECT field_key FROM data_catalog_fields WHERE category='company_model' AND enabled=1")}
prev = open(os.path.join(ROOT, "src/lib/engine/company-preview.ts"), encoding="utf8").read()
blocks = {}
for o in (1, 2, 3, 16):
    m = re.search(rf"\n    {o}: \[\s*\{{\s*type: \"facts\",\s*facts: facts\(profile, \[(.*?)\]\)", prev, re.S) if o != 16 else re.search(r"16: \[\{ type: \"facts\", facts: facts\(profile, \[(.*?)\]\)", prev, re.S)
    blocks[o] = re.findall(r'"([a-z_]+)"', m.group(1))
shown = [k for o in (1, 2, 3, 16) for k in blocks[o]]
check("19 field IDs = site facts blocks (topics 1/2/3/16) ∩ enabled engine company_model catalog", set(R) == set(shown) & catalog and len(R) == 19,
      f"site {len(shown)}, outside catalog {sorted(set(shown) - catalog)}")
contract = json.load(open(f"{E}/config/factory/18-category-contract.json"))
cp = next((i, c) for i, c in enumerate(contract["categories"], 1) if c["category_key"] == "company_profile")
check("factory category company_profile is #1, weight 8, and holds field group company_model", cp[0] == 1 and cp[1]["weight"] == 8 and "company_model" in cp[1]["field_groups"]
      and all(r["factory_category"] == {"key": "company_profile", "ordinal": 1, "weight": 8, "field_group": "company_model"} for r in R.values()))
fx = json.loads(__import__("gzip").decompress(open(os.path.join(ROOT, "tests/fixtures/codex-20261013/2222-page.json.gz"), "rb").read()))
tkey = {c["ordinal"]: c["category_key"] for c in fx["data_quality"]["understanding"]["categories"]}
topic_of = {k: o for o in blocks for k in blocks[o]}
check("investor topic per record = site topic of its facts block (identity/business/governance/risks)",
      all(r["investor_topic"]["ordinal"] == topic_of[k] and r["investor_topic"]["key"] == tkey[topic_of[k]] for k, r in R.items()))

# ---------- 4. Display map ----------
model = open(os.path.join(ROOT, "src/lib/web-v1/model.ts"), encoding="utf8").read()
groups = {g: [int(x) for x in t.split(",")] for g, t in re.findall(r'id: "([a-z]+)",.*?topics: \[([\d, ]+)\]', model, re.S)}
tab_of = {o: g for g, ts in groups.items() for o in ts}
exp = open(os.path.join(ROOT, "src/lib/web-v1/company-experience.ts"), encoding="utf8").read()
ov_topics = {2, 3, 16} if all(s in exp for s in ("businessFacts: bizFacts", "governance: facts(3)", "risks: { facts: facts(16)")) and "facts(1)" not in exp else None
check("Data tab per record = site group of its topic", all(r["display"]["data"]["tab"] == tab_of[topic_of[k]] for k, r in R.items()))
check("Overview state: topic-1 identity facts not rendered as a distinct block; topics 2/3/16 rendered (buildOverview)",
      ov_topics is not None and all((r["display"]["overview"]["state"] == "RENDERED_IN_FROZEN_MODEL") == (topic_of[k] in ov_topics) for k, r in R.items()))
check("Investor focus link resolves: TopicSection emits data-fact={key} and Intelligence focuses [data-fact]",
      'data-fact={f.key}' in open(os.path.join(ROOT, "src/components/engine-preview.tsx"), encoding="utf8").read()
      and '[data-fact="${focus}"]' in open(os.path.join(ROOT, "src/components/web-v1/company-intelligence.tsx"), encoding="utf8").read())

# ---------- 5. Engine reference and the import-version difference (value impact) ----------
attrs = {r["attribute_key"]: dict(r) for r in db.execute("SELECT * FROM company_attributes WHERE company_id='sa:2222' AND is_current=1")}
check("engine attribute id/version/source_key/effective_at/value equal Codex's engine_reference and original value (committed DB, immutable)",
      all(attrs[k]["id"] == r["engine_reference"]["attribute_id"] and attrs[k]["version"] == r["engine_reference"]["attribute_version"]
          and attrs[k]["source_key"] == r["engine_reference"]["source_key"] and attrs[k]["effective_at"] == r["engine_reference"]["effective_at"]
          and json.loads(attrs[k]["value_json"]) == r["original_engine_value"] for k, r in R.items()))
ver = {c: run(E, "git", "show", f"{c}:{IMPORT}") for c in ("42bd5c4", "b70254e")}
iv = {c: {a["attribute_key"]: a["value"] for a in json.loads(b)["company_attributes"]} for c, b in ver.items()}
check("registered import hash = 42bd5c4 bytes; current bytes differ", sha(ver["42bd5c4"]) == REGISTERED and sha(ver["b70254e"]) != REGISTERED, sha(ver["b70254e"])[:16])
check("all 19 values identical in both import versions and equal to the engine: the hash difference does not change any value",
      all(iv["42bd5c4"][k] == iv["b70254e"][k] == json.loads(attrs[k]["value_json"]) for k in R))

# ---------- 6. Source: re-read the cited pages of the archived annual report ----------
pdf = f"{E}/data/raw/SA/2222/documents/{ANN}.pdf"
check("archived annual report SHA-256 = Codex ANN2025 artifact hash", sha(open(pdf, "rb").read()) == ANN == M["primary_annual_hash"])
rd = PdfReader(pdf)
txt = {}
def page(n):
    if n not in txt: txt[n] = re.sub(r"\s+", " ", rd.pages[n - 1].extract_text() or "")
    return txt[n]
def on(n, *terms): return all(t.lower() in page(n).lower() for t in terms)
def raw(n): return re.sub(r"\s+", " ", run(E, "pdftotext", "-raw", "-f", str(n), "-l", str(n), pdf, "-").decode())
check("printed page = PDF page − 2 holds on sampled pages (p3→01, p37→35, p76→74, p140→138)",
      on(3, "Annual Report 2025 01") and on(37, "Annual Report 2025 35") and on(76, "74 Saudi Aramco") and on(140, "138 Saudi Aramco"))
SRC = {  # field: (pdf page, terms that must appear) — direct text proof found here, independent of Codex's renders
    "legal_name": [(140, "Saudi Arabian Oil Company as its official name"), (179, "The Saudi Arabian Oil Company")],
    "listing_date": [(140, "On December 11, 2019", "listed on the Saudi Exchange"), (179, "December 11, 2019")],
    "legal_form": [(140, "On January 1, 2018", "converted into a Saudi joint stock company")],
    "founding_date": [(179, "formed on November 13, 1988", "history dates back to May 29, 1933", "predecessor")],
    "reporting_standard": [(180, "endorsed in the Kingdom", "SOCPA", "IASB"), (164, "SOCPA")],
    "website": [(3, "www.aramco.com/en")],
    "ceo_name": [(12, "Nasser"), (176, "Amin H. Nasser", "President & Chief Executive Officer")],
    "chairman_name": [(10, "Al-Rumayyan"), (176, "Yasir O. Al-Rumayyan", "Chairman of the Board")],
    "auditor": [(173, "PricewaterhouseCoopers", "Omar M. Al Sagga", "License No. 369", "March 9, 2026")],
    "geographic_presence": [(16, "Countries of operations +50"), (20, "Countries of operations – as at December 31, 2025")],
    "subsidiaries_count": [(16, "subsidiaries, joint arrangements, and associates +400")],
    "employees": [(76, "Company employees6 76,664", "6. Applies to the Saudi Arabian Oil Company (the Company)")],
    "credit_rating": [(37, "Aa3", "P-1", "Fitch A+", "F1+", "Stable")],
    "business_description": [(8, "integrated energy and chemicals companies"), (9, "Upstream and Downstream, which are supported by Corporate activities")],
    "products_services": [(56, "refining, chemicals, supply and trading, distribution, retail, base oils, lubricants, and power generation"), (50, "condensate")],
}
for k, locs in SRC.items():
    miss = [(n, t) for n, *ts in locs for t in ts if not on(n, t)]
    check(f"source text on PDF page: {k}", not miss, "; ".join(f"p{n}" for n, *_ in locs) + (f" missing {miss}" if miss else ""))
check("source text on PDF page: headquarters_address — p140 (pdftotext; pypdf drops this line)",
      "P.O. Box 5000, Dhahran 31311, Kingdom of Saudi Arabia" in raw(140) and "P.O. Box 5000" not in page(140))
check("ISIN SA14TG012N13 is not in the annual report (Codex correctly sources it elsewhere)", not any("SA14TG012N13" in (p.extract_text() or "") for p in rd.pages))
isin = "SA14TG012N13"; digits = "".join(str(int(c, 36)) for c in isin[:-1])
luhn = sum((lambda n: n - 9 if n > 9 else n)(int(d) * 2) if i % 2 == 0 else int(d) for i, d in enumerate(reversed(digits)))
check("ISIN check digit valid (ISO 6166): structural only, not proof of issuer identity", (10 - luhn % 10) % 10 == int(isin[-1]))

# ---------- 7. Findings that need a correction in Codex's ledger ----------
f16 = page(16)
if on(16, "Company employees4 76,664", "4. Refer to Section 3: Sustainability", "6. Excludes SABIC Agri-Nutrients"):
    finding("NF-C1", "employees", "on PDF 16 the employee count carries footnote 4 (refer to Section 3); footnote 6 on that page concerns SABIC Agri-Nutrients/ZPC. "
            "The parent-company scope comes from PDF 76 footnote 6 only. The table header is the 2025 column; the source does not say year-end or average, "
            "so information_as_of 2025-12-31 is an assumption.")
if not on(18, "base oil") and not on(66, "base oil") and not on(18, "lubricant") and on(56, "base oils, lubricants, and power generation"):
    finding("NF-C2", "products_services", "base oils, lubricants and power generation are not on PDF 18 or 66; the direct list is PDF 56 (Downstream activities). "
            "Engine items differ in wording from the source: 'retail fuels' (source: retail), 'trading' (supply and trading), 'power' (power generation); "
            "'distribution' is in the source and not in the engine list.")
if on(8, "integrated energy and chemicals companies") and not on(179, "integrated energy and chemicals"):
    finding("NF-C3", "business_description", "the closest source wording is PDF 8 ('one of the world's largest integrated energy and chemicals companies') and PDF 9 "
            "('Upstream and Downstream, which are supported by Corporate activities'); Codex cites PDF 179/66. 'globally integrated' describes trading (PDF 57), not the company.")
if "P.O. Box 5000, Dhahran 31311" in raw(140) and "P.O. Box 5000" not in page(140):
    finding("NF-N1", "headquarters_address", "pypdf drops the address line on PDF 140, as Codex observed; pdftotext extracts it in full, so a text proof exists with a second extractor in addition to Codex's visual reading. No value impact.")

# ---------- 8. Freshness ----------
stale = (date.fromisoformat("2025-12-31") + timedelta(days=cp[1]["freshness_policy"]["max_age_before_stale_days"])).isoformat()
out["freshness"] = {"policy": cp[1]["freshness_policy"], "engine_effective_at": "2025-12-31", "stale_after_by_contract": stale, "review_date": "2026-10-18",
                    "note": "age alone is within policy on the review date; currentness of names, ratings and URLs after the report is not evidenced; refresh trigger includes board-change announcements"}
check(f"contract freshness: effective 2025-12-31 + 365 days = stale after {stale}", stale == "2026-12-31")

# ---------- 9. Conflicts with the shared financial package ----------
facts = {c: json.loads(b)["facts"] for c, b in ver.items()}
lab = [f for f in facts["42bd5c4"] if f.get("label") == "cash and cash equivalents" and f.get("period_kind") == "instant" and f.get("period_end") == "2025-12-31"]
mapped = '"cash and cash equivalents":"cash"' in open(f"{E}/src/finengine/mapping.py", encoding="utf8").read()
lim = " ".join(X.get("traceability_limits", []))
if lab and mapped and "no matching original cash/instant JSON entry" in lim:
    finding("FX-1", "FIN-SOURCE-CROSSCHECK (Codex)", f"incorrect: the registered import has a cash/instant 2025-12-31 fact keyed by label 'cash and cash equivalents' (value {lab[0]['value']}, "
            f"page {lab[0]['page']}, {lab[0]['table']}), mapped to cash by src/finengine/mapping.py:11. Codex's script matches on 'metric' only. "
            "The 058 lineage is label mapping, not a cash_end fallback. The page-179 locator is still wrong (PDF 176), as in R5.")
q = """SELECT id, substr(source_key,6,16) s, version FROM data_points WHERE company_id='sa:2222' AND is_current=1 AND metric_key=? AND period_kind=? AND period_end=?
       AND (dimensions_json IS NULL OR dimensions_json IN ('','{}','null'))"""
fin = {r["record_id"]: r for r in json.loads(open(os.path.join(ROOT, f"{Q}/FINANCIAL/FIN-EVIDENCE-LEDGER.json"), encoding="utf8").read())["records"]}
drift = []
for rid, r in fin.items():
    row = db.execute(q, (r["engine_metric_key"], r["period"]["kind"], r["period"]["end"])).fetchone()
    if row["id"] != r["engine_data_point_id"]: drift.append({"record": rid, "ledger_data_point": r["engine_data_point_id"], "committed_db_current": row["id"], "committed_db_source": row["s"], "committed_db_version": row["version"]})
if drift:
    finding("FX-2", "FIN-EVIDENCE-LEDGER (Claude)", f"{len(drift)} records cite the data point chosen after the engine's _repair_current_fact_versions ran on the isolated copy; the committed DB "
            f"marks another row current, from the registered import 1a836a30: {[(d['record'], d['ledger_data_point'], d['committed_db_current']) for d in drift]}. "
            "Values are identical. R1 therefore applies to these rows in the committed file, not only to 051/058.")
out["financial_conflicts"] = {"label_keyed_cash_2025": lab[0] if lab else None, "data_point_drift": drift,
                              "prefchem_bridge": {"codex_values_sar_millions": X.get("prefchem_bridge"), "engine_cash_2026_06_30": db.execute(q, ("cash", "instant", "2026-06-30")).fetchone()["id"],
                                                  "verifiable_here": False, "why": "the H1-2026 PDF is not accessible in this environment; only the arithmetic and the 167,387 balance equal to the engine row can be checked"}}
X_ok = X["prefchem_bridge"]["balance_cash"] + X["prefchem_bridge"]["cash_held_for_sale"] == X["prefchem_bridge"]["cashflow_ending_cash"] and X["prefchem_bridge"]["balance_cash"] == 167387
check("Codex PRefChem bridge is arithmetically consistent and its balance equals the engine value of FQ01-OBS-072 (source not re-read here)", X_ok)
a = X["import_hash_analysis"]
check("Codex import analysis reproduced: 173 old facts unchanged, 176 current, 3 added, company_attributes identical",
      a["unchanged_old_facts"] == 173 and a["current_fact_count"] == 176 and len(facts["42bd5c4"]) == 173 and len(facts["b70254e"]) == 176
      and json.loads(ver["42bd5c4"])["company_attributes"] == json.loads(ver["b70254e"])["company_attributes"])

# ---------- 10. Per-record verdicts (engineering evidence review only) ----------
V = {}
for k in ("legal_name", "listing_date", "legal_form", "headquarters_address", "reporting_standard", "website", "ceo_name", "chairman_name", "auditor", "geographic_presence"):
    V[k] = "EVIDENCE_OK_ENGINEERING"
for k in ("employees", "products_services", "business_description"):
    V[k] = "NEEDS_CORRECTION"
for k in ("legal_name_ar", "isin", "investor_relations_url", "founding_date", "subsidiaries_count", "credit_rating"):
    V[k] = "NEEDS_NEWER_SOURCE_OR_APPROVED_DEFINITION"
check("every one of the 19 records has exactly one verdict", set(V) == set(R))
out["verdicts"] = {R[k]["record_id"]: {"field": k, "verdict": v, "codex_status": R[k]["evidence"]["status"]} for k, v in sorted(V.items(), key=lambda x: R[x[0]]["record_id"])}
out["counts"] = {v: sum(1 for x in V.values() if x == v) for v in sorted(set(V.values()))}
out.update(reviewed={"branch": BRANCH.split("/", 1)[1], "implementation": IMPL, "delivery": DELIV}, grants={"accept": False, "qualification": False, "rights": False, "publication": False})
json.dump(out, open(os.path.join(HERE, "NONFIN-CROSSREVIEW.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
print("\n" + ("ALL PASS" if not fails else f"{fails} FAIL"), "|", out["counts"], "| findings", len(out["findings"]))
sys.exit(1 if fails else 0)
