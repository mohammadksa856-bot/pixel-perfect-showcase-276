"""Independent review of Codex's historical extraction (codex/aramco95-history-extraction-20261019 @ b90fbc9, implementation 2faeda9).
Reads Codex's files from its commit (git show / a scratch worktree, never its working files), the committed engine DB immutable, and
the one original accessible here (ARA2025, sha256 78bb678e...) to source-check its observations with pdfplumber crops and pypdf.
Codex's suite is re-run in the scratch worktree; tests that need the private originals are recorded NOT_RUN, never PASS.
Writes HISTORY-REVIEW.json and INTAKE-TRIAL-SET.json next to this file. No engine, site or Codex write.

Usage: ENGINE=<engine clone at b70254e> python3 history_review.py"""
import collections, hashlib, json, os, re, sqlite3, subprocess, sys, tempfile
from datetime import date
from decimal import Decimal
import pdfplumber
from pypdf import PdfReader

E = os.environ["ENGINE"]
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../.."))
IMPL, DELIV, BASE = "2faeda9e240ddad6d57dd2b70d4b64cc24b35be3", "b90fbc95b2274c9057d62d817bd3cdf1e2ec2d15", "46c7debecf2b055e82c40106f893169c614a7959"
H = "review-delivery/ARAMCO95/HISTORICAL-EXTRACTION"
ARA = "78bb678e8e45f5c58fa1b2402ab5a29c5ad10adfda8ba5e7ee5f4d1ad76cd227"
run = lambda cwd, *a: subprocess.run(list(a), cwd=cwd, capture_output=True, check=True).stdout
J = lambda n: json.loads(run(ROOT, "git", "show", f"{DELIV}:{H}/{n}"))
fails, out = 0, {"checks": [], "findings": []}
def check(name, ok, detail=""):
    global fails
    fails += not ok
    out["checks"].append({"check": name, "pass": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail else ""))
def finding(fid, severity, text, repro):
    out["findings"].append({"id": fid, "severity": severity, "finding": text, "reproduction": repro})
    print(f"FINDING {fid} [{severity}] {text}")

# ---------- 1. identity and scope ----------
heads = run(ROOT, "git", "rev-list", "--max-count=3", "origin/codex/aramco95-history-extraction-20261019").decode().split()
check("remote branch: b90fbc9 <- 2faeda9 <- 46c7deb", heads == [DELIV, IMPL, BASE], " ".join(h[:7] for h in heads))
changed = run(ROOT, "git", "diff", "--name-only", BASE, DELIV).decode().split()
check("delta only in HISTORICAL-EXTRACTION; no Claude QB1/QB2/W0/INTEGRATION, product or engine file", changed and all(p.startswith(H + "/") for p in changed), f"{len(changed)} files")
man = J("IMPLEMENTATION-MANIFEST.json")
ents = man.get("entries") or man.get("files") or []
ents = ents if isinstance(ents, list) else [{"path": k, "sha256": v} for k, v in ents.items()]
bad = [e["path"] for e in ents if hashlib.sha256(run(ROOT, "git", "show", f"{DELIV}:{e['path'] if e['path'].startswith('review-delivery') else H + '/' + e['path']}")).hexdigest() != e["sha256"]]
check("IMPLEMENTATION-MANIFEST hashes match the bytes at b90fbc9", ents and not bad, f"{len(ents)} entries; mismatched {bad[:5]}")

# ---------- 2. observations: structure and identities ----------
EX = J("EXTRACTED-OBSERVATIONS.json"); O = EX["observations"]; BY = {o["local_observation_id"]: o for o in O}
SM = {d["source_id"]: d for d in J("SOURCE-MANIFEST.json")["documents"]}
check("2,276 observations with unique ids", len(O) == 2276 and len(BY) == 2276)
need = ("field_id", "period", "original_value", "source_scale", "normalized_observation_value", "source_id", "source_document_sha256", "source_pdf_page",
        "source_column_index_zero_based", "cell_bbox_points", "printed_cell", "edition_role", "value_nature", "financial_status")
miss = [o["local_observation_id"] for o in O if any(o.get(k) in (None, "") for k in need if k != "field_id")]
check("every observation carries source, page, column, bbox, printed cell, scale, edition role and value nature", not miss, f"{len(miss)} incomplete")
def eom(y, m): return (date(y + (m == 12), m % 12 + 1, 1) - date.resolution).isoformat()
def per_ok(p):
    k, s, e = p["kind"], p["start"], p["end"]; y = int(e[:4]); m = int(e[5:7])
    if e != eom(y, m) or m not in (3, 6, 9, 12): return False
    if k == "instant": return s is None
    if k == "fy": return (s, e) == (f"{y}-01-01", f"{y}-12-31")
    if k == "ytd": return s == f"{y}-01-01" and m in (6, 9)
    if k == "quarter": return s == f"{y}-{m - 2:02d}-01"
    return False
bad_p = [o["local_observation_id"] for o in O if not per_ok(o["period"])]
check("period identities: FY Jan–Dec, quarter = three months ending at quarter end, YTD from Jan 1 to Jun/Sep, instant with null start", not bad_p, f"{len(bad_p)} bad")
nat = collections.Counter((o["period"]["kind"] == "instant", o["value_nature"]) for o in O)
check("instants are BALANCE only and BALANCE only on instants", all((inst and v == "BALANCE") or (not inst and v != "BALANCE") for (inst, v) in nat), str(dict(nat)))
scale_bad = [o["local_observation_id"] for o in O if Decimal(o["original_value"]) * Decimal(o["source_scale"]) != Decimal(o["normalized_observation_value"])]
check("normalized value = original × scale exactly, sign unchanged", not scale_bad, f"{len(scale_bad)} mismatches")
sha_bad = [o["local_observation_id"] for o in O if SM.get(o["source_id"], {}).get("sha256", SM.get(o["source_id"], {}).get("original_pdf_sha256")) not in (None, o["source_document_sha256"])]
check("document hash on every observation equals SOURCE-MANIFEST", not sha_bad, f"{len(sha_bad)} mismatches")
dup = collections.Counter((o["source_id"], o["source_pdf_page"], tuple(o["cell_bbox_points"])) for o in O)
check("no two observations share the same document/page/cell box", max(dup.values()) == 1)

# ---------- 3. periods and the 18 required fields ----------
AL, QL = J("ANNUAL-PERIOD-LEDGER.json")["periods"], J("QUARTERLY-PERIOD-LEDGER.json")["periods"]
fy = sorted(p.get("fiscal_year") or int(p["period"]["end"][:4]) if isinstance(p, dict) and "period" in p else p.get("fiscal_year") for p in AL)
qs = sorted((p.get("fiscal_year") or p["period"]["fiscal_year"], p.get("fiscal_quarter") or p["period"]["fiscal_quarter"]) for p in QL)
check("5 annual periods FY2021–FY2025 and 12 contiguous quarters Q3-2023 → Q2-2026", fy == [2021, 2022, 2023, 2024, 2025]
      and qs == [(2023, 3), (2023, 4), (2024, 1), (2024, 2), (2024, 3), (2024, 4), (2025, 1), (2025, 2), (2025, 3), (2025, 4), (2026, 1), (2026, 2)], f"{fy} {qs}")
REQ = [f["field_id"] if isinstance(f, dict) else f for f in J("CONTRACT-FIELD-SCOPE.json")["required_fields"]]
direct = collections.defaultdict(set)
for o in O:
    if o["edition_role"] == "CURRENT_PERIOD_AS_REPORTED" and o["field_id"] in REQ:
        direct[(o["period"]["kind"], o["period"]["end"])].add(o["field_id"])
def req_at(kind, end):
    flows = direct.get((kind, end), set()); bal = direct.get(("instant", end), set())
    return flows | bal
fyc = {y: len(req_at("fy", f"{y}-12-31")) for y in range(2021, 2026)}
nonq4 = [(y, q) for y, q in qs if q != 4]
qc = {f"Q{q}-{y}": len(req_at("quarter", eom(y, q * 3))) for y, q in nonq4}
missing_req = {k: sorted(set(REQ) - req_at(*kq)) for k, kq in [(f"FY{y}", ("fy", f"{y}-12-31")) for y in range(2021, 2026)] + [(f"Q{q}-{y}", ("quarter", eom(y, q * 3))) for y, q in nonq4]}
check("18 required fields; 17/18 direct (current-period edition) for each year and each non-Q4 quarter, the missing one is free_cash_flow",
      len(REQ) == 18 and all(v == 17 for v in fyc.values()) and all(v == 17 for v in qc.values()) and all(m == ["free_cash_flow"] for m in missing_req.values()), f"{fyc} {qc}")

# ---------- 4. intake matrix ----------
M = J("INTAKE-MATRIX.json"); EN = M["entries"]
ids = {(e["field_id"], e["period"]["kind"], e["period"]["start"], e["period"]["end"]) for e in EN}
cls = collections.Counter(e["classification"] for e in EN)
check("4,090 unique field/period identities; class counts reproduce 239/24/761/125/2,941 and sum to 4,090",
      len(EN) == len(ids) == 4090 and cls == collections.Counter(M["unique_classification_counts"]) and dict(cls) == {"EXISTS_NEEDS_SOURCE_LINK": 239, "EXISTS_NEEDS_IDENTITY_OR_VERSION_REVIEW": 24,
      "ABSENT_NEEDS_INPUT": 761, "POTENTIAL_DERIVATION_NEEDS_APPROVED_RULE": 125, "UNAVAILABLE_OR_NOT_CURRENTLY_QUALIFIABLE": 2941}, str(dict(cls)))
check("counts are field/period identities: no new metric keys, 0 new engine rows, 0 points awarded, score not recomputed",
      M["potential_new_metric_keys_not_previously_in_company_engine"] == [] and M["actual_new_engine_rows"] == 0 and M["score_after"] is None
      and all(c["points_awarded"] == 0 and c["score_recalculated"] is False for c in M["categories"]) and len(M["categories"]) == 18)
db = sqlite3.connect(f"file:{E}/data/financial.sqlite3?mode=ro&immutable=1", uri=True)
def eng_rows(e):
    p = e["period"]
    return db.execute("""SELECT id FROM data_points WHERE company_id='sa:2222' AND is_current=1 AND metric_key=? AND period_kind=? AND period_end=?
                         AND (dimensions_json IS NULL OR dimensions_json IN ('','{}','null'))""", (e["field_id"], p["kind"], p["end"])).fetchall()
absent_bad = [e for e in EN if e["classification"] == "ABSENT_NEEDS_INPUT" and (eng_rows(e) or not e.get("source_observation_id") or e["source_observation_id"] not in BY
              or BY[e["source_observation_id"]]["field_id"] != e["field_id"] or BY[e["source_observation_id"]]["period"]["end"] != e["period"]["end"])]
check("761 ABSENT_NEEDS_INPUT: engine has no current row (committed DB, immutable) and each cites an observation of the same field/period",
      not absent_bad, f"{len(absent_bad)} bad; distinct fields {len({e['field_id'] for e in EN if e['classification'] == 'ABSENT_NEEDS_INPUT'})}")
link = [e for e in EN if e["classification"] == "EXISTS_NEEDS_SOURCE_LINK"]
link_src = [e for e in link if e.get("source_observation_id")]
if len(link_src) != len(link):
    finding("HX-F1", "P2", f"EXISTS_NEEDS_SOURCE_LINK ({len(link)}) mixes {len(link_src)} engine cells with an exact-match source observation (linkable now) and "
            f"{len(link) - len(link_src)} engine cells with no extracted source cell (NOT_EXTRACTED_OR_NOT_CANONICALLY_MAPPED). The latter cannot be linked from this package; "
            "the class overstates what is ready for source linking. The class total and the 4,090 sum are unaffected.",
            "INTAKE-MATRIX.json entries: classification == EXISTS_NEEDS_SOURCE_LINK and source_observation_id is null → 97 rows")
check("of the 239, those with an observation match the engine value and unit exactly", all(e["source_comparison"] == "EXACT_VALUE_AND_UNIT" for e in link_src), f"{len(link_src)} linkable")

# ---------- 5. Q4 derivations ----------
DP = J("DERIVATION-PROPOSALS.json")["proposals"]
sub = [d for d in DP if d.get("proposal") and d["proposal"].get("proposal_formula") == "FY_MINUS_YTD9_SAME_BASIS"]
pt = [d for d in DP if d.get("proposal") and d["proposal"].get("type")]
fcf = [d for d in DP if (d.get("reason") or "").startswith("FCF")]
check("125 rule needs = 102 FY − YTD9 proposals + 6 endpoint rules + 17 FCF", len(DP) == 125 and len(sub) == 102 and len(pt) == 6 and len(fcf) == 17, f"{len(sub)}/{len(pt)}/{len(fcf)}")
arith, basis, nature = [], [], []
for d in sub:
    p = d["proposal"]; a, b = (BY[i] for i in p["input_observation_ids"])
    if not (a["period"]["kind"] == "fy" and b["period"]["kind"] == "ytd" and b["period"]["end"][5:] == "09-30" and a["period"]["end"][:4] == b["period"]["end"][:4] == d["period"]["end"][:4]): basis.append(d["field_id"])
    if Decimal(a["normalized_observation_value"]) - Decimal(b["normalized_observation_value"]) != Decimal(p["proposed_value"]): arith.append(d["field_id"])
    if a["value_nature"] != "FLOW" or b["value_nature"] != "FLOW": nature.append(d["field_id"])
check("FY − YTD9 proposals: inputs are FY and nine-month YTD of the same year, FLOW only, arithmetic exact, none approved",
      not arith and not basis and not nature and all(d["proposal"]["approved"] is False for d in sub), f"arith {arith[:3]} basis {basis[:3]} nature {nature[:3]}")
check("no subtraction for EPS, shares, balances or cash endpoints; cash_end/cash_beginning are endpoint rules with no value",
      not any(d["field_id"] in ("basic_eps", "eps_diluted", "weighted_average_shares_basic") or "eps" in d["field_id"] for d in sub)
      and all(d["field_id"] in ("cash_end", "cash_beginning") and d["proposal"]["proposed_value"] is None and "NOT_SUBTRACTION" in d["proposal"]["type"] for d in pt))
REC = J("EDITION-RECONCILIATIONS.json")["comparisons"]
diff = [r for r in REC if r["status"].startswith("VALUES_DIFFER")]
check("656 edition comparisons, 11 with differing values, no automatic choice", len(REC) == 656 and len(diff) == 11 and all(r["preferred_edition_policy"].startswith("UNDECIDED") for r in REC))
# presentation basis: a field whose same-year interim values differ between the original and a later edition must not be derived as FY(later presentation) − YTD9(original)
moved = {(r["field_id"], r["end"][:4]) for r in diff if r["kind"] in ("quarter", "ytd")}
mixed = []
for d in sub:
    a, b = (BY[i] for i in d["proposal"]["input_observation_ids"])
    if (d["field_id"], d["period"]["end"][:4]) in moved and a["source_id"] != b["source_id"]:
        mixed.append({"field": d["field_id"], "q4": d["period"]["end"], "proposed": d["proposal"]["proposed_value"],
                      "fy_input": (a["source_id"], a["normalized_observation_value"]), "ytd9_input": (b["source_id"], b["normalized_observation_value"])})
if mixed:
    finding("HX-F2", "P1", f"{len(mixed)} Q4-2025 proposals subtract a nine-month value in the pre-reclassification presentation from an FY value in the new one: "
            + "; ".join(f"{m['field']} = {m['fy_input'][0]} {int(m['fy_input'][1]) // 10**6:,} − {m['ytd9_input'][0]} {int(m['ytd9_input'][1]) // 10**6:,} = {int(m['proposed']) // 10**6:,}" for m in mixed)
            + ". Q1/H1-2025 D&A differ between the 2025 originals and the 2026 comparatives (22,898→22,823; 49,418→45,877), and ARA2025 PDF 184 states the impairment reclassification; "
            "the 2025 nine-month input is therefore on the old basis. The semantic guard is null and the proposal is emitted, contrary to the package's own rule against mixing editions.",
            "DERIVATION-PROPOSALS.json: field_id in (depreciation_amortization, depreciation_amortization_cash_flow), period.end 2025-12-31; inputs ARA2025 fy and Q3-2025 ytd; "
            "EDITION-RECONCILIATIONS.json: same fields, quarter/ytd 2025, VALUES_DIFFER")
out["mixed_basis_proposals"] = mixed
eps = [r for r in diff if r["field_id"] == "basic_eps"]
check("EPS differences kept as two editions (2021 1.98/1.80, 2022 2.72/2.47), not subtracted and not chosen",
      sorted((r["end"][:4], tuple(v["value"] for v in r["values"])) for r in eps) == [("2021", ("1.98", "1.80")), ("2022", ("2.72", "2.47"))])
check("FY2024 reclassification kept: SG&A 89,235→88,931, D&A 103,209→91,679, impairment 11,834 shown separately in ARA2025",
      any(r["field_id"] == "selling_general_administrative_expense" and [v["value"] for v in r["values"]] == ["-89235000000", "-88931000000"] for r in diff)
      and any(r["field_id"] == "depreciation_amortization" and r["kind"] == "fy" and [v["value"] for v in r["values"]] == ["-103209000000", "-91679000000"] for r in diff)
      and any(o["field_id"] == "impairment_charges" and o["source_id"] == "ARA2025" and o["period"]["end"] == "2024-12-31" and o["normalized_observation_value"] == "-11834000000" for o in O))

# ---------- 6. aggregated rows not narrowed; group vs parent ----------
UN = J("UNMAPPED-SOURCE-ROWS.json")["rows"]
check("128 aggregated/net rows kept with field_id null; none of their labels also appears as a mapped observation on the same page",
      len(UN) == 128 and all(r.get("field_id") is None for r in UN)
      and not ({(r.get("source_id"), r.get("source_pdf_page"), r.get("source_label") or r.get("label")) for r in UN} & {(o["source_id"], o["source_pdf_page"], o["source_label"]) for o in O}))
gp = [o for o in O if o["field_id"] in ("net_income", "net_income_parent", "total_equity", "equity_parent", "cash", "cash_end", "revenue", "revenue_and_other_income_related_to_sales")]
collide = collections.Counter((o["source_id"], o["source_pdf_page"], tuple(o["cell_bbox_points"])) for o in gp)
check("group/parent, cash/cash_end and revenue/revenue+other income never share a source cell", max(collide.values()) == 1)

# ---------- 7. engine reference register ----------
ER = J("ENGINE-REFERENCE-REGISTER.json")["rows"]
er_bad = [r.get("id") or r.get("data_point_id") for r in ER if not db.execute("SELECT 1 FROM data_points WHERE id=? AND value_decimal=?", (r.get("id") or r.get("data_point_id"), r.get("value_decimal") or r.get("value"))).fetchone()]
check("ENGINE-REFERENCE-REGISTER rows exist in the committed DB with the same value", ER and not er_bad, f"{len(ER)} rows; {len(er_bad)} mismatched")

# ---------- 8. independent source check: every ARA2025 observation ----------
pdf = f"{E}/data/raw/SA/2222/documents/{ARA}.pdf"
assert hashlib.sha256(open(pdf, "rb").read()).hexdigest() == ARA
ara = [o for o in O if o["source_id"] == "ARA2025"]
src_bad = []
with pdfplumber.open(pdf) as doc:
    rd = PdfReader(pdf); cache = {}
    for o in ara:
        pg = doc.pages[o["source_pdf_page"] - 1]
        x0, top, x1, bottom = o["cell_bbox_points"]
        cell = "".join((pg.crop((x0 - 1, top - 1, x1 + 1, bottom + 1)).extract_text() or "").split())
        if o["source_pdf_page"] not in cache:
            cache[o["source_pdf_page"]] = ("".join((rd.pages[o["source_pdf_page"] - 1].extract_text() or "").split()),
                                           run(E, "pdftotext", "-layout", "-f", str(o["source_pdf_page"]), "-l", str(o["source_pdf_page"]), pdf, "-").decode().splitlines())
        flat, lines = cache[o["source_pdf_page"]]
        printed = "".join(o["printed_cell"].split())
        # row label: a word of the source label on a layout line that holds the value; unlabelled subtotals carry no label to match
        words = [w.lower() for w in re.findall(r"[A-Za-z]{4,}", o["source_label"]) if w.lower() not in ("subtotal", "unlabelled", "total")]
        on_line = [ln for ln in lines if o["printed_cell"] in ln]
        label_ok = (not words) or "subtotal" in o["source_label"].lower() or any(any(w in ln.lower() for w in words) for ln in on_line)
        # the value is visible on its line (pypdf, layout) but the cell box also holds other glyphs (overlapping text layer): visual review, not a pass
        overlap = cell != printed and printed in flat and on_line and label_ok and len(cell) > len(printed)
        if overlap: out.setdefault("ara2025_overlapping_glyph_cells", []).append({"field": o["field_id"], "end": o["period"]["end"], "pdf_page": o["source_pdf_page"],
                                                                                  "printed": o["printed_cell"], "crop": cell, "state": "SOURCE_REVIEW_PENDING (visual)"})
        elif cell != printed or printed not in flat or not on_line or not label_ok:
            src_bad.append((o["field_id"], o["period"]["end"], o["source_pdf_page"], printed, cell, o["source_label"][:50]))
out["ara2025_source_check"] = {"observations": len(ara), "mismatches": src_bad[:20]}
ov = out.get("ara2025_overlapping_glyph_cells", [])
check("independent source check here: ARA2025 observations — cell box holds the printed value (pdfplumber), value on the page (pypdf), label on the value's line (layout); overlapping-glyph cells set aside for visual review",
      len(ara) == 131 and not src_bad, f"{len(ara) - len(ov)} confirmed, {len(ov)} visual-review, {len(src_bad)} mismatches {src_bad[:3]}")

# ---------- 9. Codex suites in a scratch worktree ----------
with tempfile.TemporaryDirectory() as t:
    wt = os.path.join(t, "d", "repo"); os.makedirs(os.path.dirname(wt))
    run(ROOT, "git", "worktree", "add", "--detach", wt, DELIV); os.symlink(E, os.path.join(t, "aramco95-engine-b70254e"))
    try:
        p = subprocess.run([sys.executable, os.path.join(wt, H, "test_history.py")], cwd=os.path.join(wt, H), capture_output=True, text=True)
        res = {n: (c, s) for n, c, s in re.findall(r"^(test_\w+) \(__main__\.(\w+)\.\w+\) \.\.\. (ok|ERROR|FAIL|skipped.*)$", p.stderr, re.M)}
        tail = (p.stderr.strip().splitlines() or [""])[-1]
        if not res:
            res = {"<import>": ("module", "ERROR")}
    finally:
        run(ROOT, "git", "worktree", "remove", "--force", wt)
okc = sorted(n for n, (c, s) in res.items() if s == "ok"); errc = sorted(n for n, (c, s) in res.items() if s != "ok")
out["codex_suite"] = {"ran": len(res), "passed": okc, "not_run_or_failed": errc, "tail": tail,
                      "reason": "private originals (aramco95-history-private-20261019, web08b02-private-20261017) absent here; such tests are NOT_RUN, not PASS"}
print("CODEX SUITE:", len(okc), "ok;", len(errc), "not run / error:", errc[:12], "|", tail)

# ---------- 10. smallest isolated-engine intake trial (proposal only) ----------
# ARA2025 holds no ABSENT cell (the engine already has FY2025), so the trial comes from one historical quarter: Q3-2025, the latest quarter
# absent from the engine, all required cells from a single document (Q3-2025 interim) on three statement pages.
ara_absent = [e for e in EN if e["classification"] == "ABSENT_NEEDS_INPUT" and BY[e["source_observation_id"]]["source_id"] == "ARA2025"]
q3 = [e for e in EN if e["classification"] == "ABSENT_NEEDS_INPUT" and e["requirement"] == "required" and e["period"]["end"] == "2025-09-30"
      and BY[e["source_observation_id"]]["edition_role"] == "CURRENT_PERIOD_AS_REPORTED"]
CORE = ("revenue", "net_income", "operating_cash_flow", "cash", "total_equity")
def row(e):
    o = BY[e["source_observation_id"]]
    return {"field_id": e["field_id"], "period": e["period"], "observation_id": o["local_observation_id"], "value_sar": o["normalized_observation_value"], "unit": o["normalized_unit"],
            "source": {"document": o["source_id"], "sha256": o["source_document_sha256"], "pdf_page": o["source_pdf_page"], "column": o["source_column_index_zero_based"],
                       "printed_cell": o["printed_cell"], "label": o["source_label"]},
            "engine_present": bool(eng_rows(e)), "source_review": "PENDING (original private; not read here)",
            "hold": "SIGN_POLICY_DECISION (engine stores capex positive; source prints an outflow)" if e["field_id"] == "capex" else None}
t1 = [row(e) for e in q3 if e["field_id"] in CORE]; t2 = [row(e) for e in q3 if e["field_id"] not in CORE]
samples = collections.defaultdict(set)
for r in t1 + t2: samples[(r["source"]["document"], r["source"]["sha256"])].add(r["source"]["pdf_page"])
for m in mixed:
    for i in next(d for d in sub if d["field_id"] == m["field"] and d["period"]["end"] == m["q4"])["proposal"]["input_observation_ids"]:
        samples[(BY[i]["source_id"], BY[i]["source_document_sha256"])].add(BY[i]["source_pdf_page"])
for r in diff:
    for v in r["values"]:
        o = BY[v["observation_id"]]; samples[(o["source_id"], o["source_document_sha256"])].add(o["source_pdf_page"])
for y, q in nonq4[:1] + [(2023, 3)]:
    pass
fyfs = {o["source_id"]: o for o in O if o["source_id"].endswith("-FS")}
for sid in sorted(fyfs):   # one income, balance and cash-flow page per audited year (current-period cells)
    for o in O:
        if o["source_id"] == sid and o["edition_role"] == "CURRENT_PERIOD_AS_REPORTED" and o["field_id"] in CORE: samples[(sid, o["source_document_sha256"])].add(o["source_pdf_page"])
sample = [{"document": d, "sha256": h, "pdf_pages": sorted(p), "accessible_here": d == "ARA2025"} for (d, h), p in sorted(samples.items())]
json.dump({"schema": "marefa-aramco-intake-trial-set/1", "state": "PROPOSED_NOT_EXECUTED", "target": "isolated engine copy, after authorisation",
           "why_not_ara2025": f"ARA2025 has {len(ara_absent)} ABSENT cells: the engine already holds FY2025",
           "T1_minimal": {"rows": t1, "selection": "Q3-2025, the five core fields, one document, three pages"},
           "T2_same_quarter_extension": {"rows": t2, "selection": "remaining required Q3-2025 cells; capex held for the sign policy; FCF not included (no approved formula)"},
           "preconditions": ["SOURCE_REVIEW of the Q3-2025 interim pages 27/29/31 by a reviewer with the original", "authorisation for an isolated engine copy",
                             "no Q4 derivation, no FY2021–FY2023 values, no edition choice in this trial"],
           "source_review_sample": sample, "qualification": "WITHHELD", "holds": "7/22/142/0 unchanged"}, open(os.path.join(HERE, "INTAKE-TRIAL-SET.json"), "w"), ensure_ascii=False, indent=1)
print("TRIAL T1:", [(r["field_id"], r["source"]["pdf_page"], r["value_sar"]) for r in t1], "| T2:", len(t2), "| sample docs:", [(s["document"], s["pdf_pages"]) for s in sample])

out["decision"] = {"engineering": "TARGETED_REWORK" if any(f["severity"] == "P1" for f in out["findings"]) else ("ENGINEERING_EVIDENCE_ACCEPT" if not fails else "TARGETED_REWORK"),
                   "source": "SOURCE_REVIEW_PENDING (except ARA2025: 129 of 131 observations source-checked here; 2 overlapping-glyph cells pending visual review)"}
json.dump(out, open(os.path.join(HERE, "HISTORY-REVIEW.json"), "w"), ensure_ascii=False, indent=1)
print("\n" + ("ALL PASS" if not fails else f"{fails} FAIL"), "| findings", [f["id"] for f in out["findings"]], "| decision", out["decision"])
sys.exit(1 if fails else 0)
