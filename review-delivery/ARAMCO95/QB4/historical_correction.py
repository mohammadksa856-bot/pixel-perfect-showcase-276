"""QB4-R01 note 1: documented correction of short_term_investments_net (FY2025) in the engine's prior pack
data/imports/aramco-2025-annual-metrics.json at b70254e. Nothing in the engine is changed: the script writes a
correction record and a patch for that file here, and checks the patch on a disposable export.

The correction is made only after the field definition is established:
  * catalog and metric contract: a cash-flow flow in currency, fy allowed;
  * the engine's convention for this key in other issuers' reviewed manifests (net proceeds stored as positive);
  * the sign convention of the same pack for the other lines of the same statement (printed sign kept);
  * the printed row on ARA2025 PDF 178, and the investing subtotal, which reconciles only with the negative sign.
Outputs: QB4-R01-HISTORICAL-CORRECTION.json, aramco-2025-annual-metrics.short_term_investments_net.patch,
historical-correction-checks.txt. Usage (repo root): python3 review-delivery/ARAMCO95/QB4/historical_correction.py
"""
from __future__ import annotations

import difflib
import hashlib
import json
import re
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from decimal import Decimal
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import qb4  # noqa: E402
from qb4 import ENGINE, ENGINE_COMMIT, export_engine, engine_env, num, original_engine_state  # noqa: E402

TARGET = "data/imports/aramco-2025-annual-metrics.json"
OLD = '{"metric":"short_term_investments_net","value":1457,'
NEW = '{"metric":"short_term_investments_net","value":-1457,'
# pack metric -> printed row of the consolidated statement of cash flows (PDF 178), 2025 column
SAME_STATEMENT = {
    "taxes_paid": "Settlement of income, zakat and other taxes",
    "operating_cash_flow": "Net cash provided by operating activities",
    "acquisitions": "Acquisition of affiliates, net of cash acquired",
    "proceeds_asset_sales": "Proceeds from sale of affiliates",
    "distributions_joint_ventures_associates": "Distributions from joint ventures and associates",
    "dividends_from_investments": "Dividends from investments in securities",
    "interest_received": "Interest received",
    "investing_cash_flow": "Net cash used in investing activities",
    "dividends_noncontrolling": "Dividends paid to non-controlling interests in subsidiaries",
    "proceeds_noncontrolling_sale": "Proceeds from sale of non-controlling equity interest in a subsidiary",
    "short_term_borrowings_net": "Net proceeds from short-term borrowings",
    "debt_issued": "Proceeds from long-term borrowings",
    "debt_repaid": "Repayments of long-term borrowings",
    "lease_payments": "Principal portion of lease payments",
    "interest_paid": "Interest paid",
    "financing_cash_flow": "Net cash used in financing activities",
}
ROW = "Net (purchases) maturities of short-term investments"


def git_show(path: str) -> bytes:
    return subprocess.run(["git", "-C", str(ENGINE), "show", f"{ENGINE_COMMIT}:{path}"], capture_output=True, check=True).stdout


def printed_2025(page: str, label: str) -> str | None:
    line = next((l for l in page.splitlines() if label in l), None)
    if line is None:
        return None
    cells = [c for c in re.findall(r"\(?[\d,]+\)?", line.split(label, 1)[1]) if "," in c or len(c.strip("()")) > 2]
    return cells[0] if cells else None


def main() -> int:
    checks = []

    def check(name, ok, detail):
        checks.append({"check": name, "status": "PASS" if ok else "FAIL", "detail": detail})

    before = original_engine_state()
    work = Path(tempfile.mkdtemp(prefix="qb4r01-"))
    try:
        text = git_show(TARGET).decode("utf-8")
        old_sha = hashlib.sha256(text.encode()).hexdigest()
        pack = json.loads(text)
        idx = [i for i, f in enumerate(pack["facts"]) if f.get("metric") == "short_term_investments_net"]
        fact = pack["facts"][idx[0]] if len(idx) == 1 else None
        check("single_target_fact_in_prior_pack", len(idx) == 1 and fact["value"] == 1457 and fact["fiscal_year"] == 2025
              and fact["period_kind"] == "fy" and text.count(OLD) == 1, {"index": idx, "fact": fact})

        # 1. definition
        pdf = work / "a.pdf"
        pdf.write_bytes(git_show(qb4.ARA))
        check("source_document_hash", hashlib.sha256(pdf.read_bytes()).hexdigest() == qb4.ARA_SHA, qb4.ARA_SHA)
        subprocess.run(["pdftotext", "-layout", str(pdf), str(work / "l.txt")], check=True)
        cf = (work / "l.txt").read_text().split("\f")[177]
        root = export_engine(work / "e")
        db_path = work / "db.sqlite3"
        shutil.copy2(root / "data/financial.sqlite3", db_path)
        subprocess.run([sys.executable, "-c", "import sys\nfrom finengine.database import Database\nDatabase(sys.argv[1]).close()",
                        str(db_path)], cwd=root, env=engine_env(root), check=True)
        db = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)
        db.row_factory = sqlite3.Row
        catalog = dict(db.execute("SELECT field_key,category,storage_domain,period_behavior,default_unit,value_type FROM "
                                  "data_catalog_fields WHERE field_key='short_term_investments_net' AND enabled=1").fetchone())
        contract = dict(db.execute("SELECT allowed_period_kinds_json,unit_family FROM metric_contracts WHERE "
                                   "metric_key='short_term_investments_net' AND enabled=1").fetchone())
        defn = dict(db.execute("SELECT metric_key,value_type,default_unit,aggregation FROM metric_definitions WHERE "
                               "metric_key='short_term_investments_net'").fetchone())
        check("definition_catalog_and_contract", catalog["category"] == "cash_flow" and catalog["period_behavior"] == "flow"
              and catalog["default_unit"] == "currency" and "fy" in json.loads(contract["allowed_period_kinds_json"])
              and contract["unit_family"] == "monetary", {"catalog": catalog, "metric_contract": contract, "metric_definition": defn})
        precedents = []
        for f in sorted((root / "data/imports").glob("*.json")):
            if f.name == Path(TARGET).name:
                continue
            for x in json.loads(f.read_text()).get("facts", []):
                if isinstance(x, dict) and x.get("metric") == "short_term_investments_net":
                    precedents.append({"file": f.name, "source_label": x.get("source_label"), "value": x.get("value")})
        check("definition_engine_precedents_signed_net_cash_flow", bool(precedents)
              and all(Decimal(str(p["value"])) > 0 and re.search(r"(?i)net|proceeds", p["source_label"] or "") for p in precedents),
              {"precedents": precedents, "reading": "net inflows from short-term investments are stored as positive amounts"})
        same = {}
        for f in pack["facts"]:
            if f.get("metric") in SAME_STATEMENT and f.get("fiscal_year") == 2025:
                p = printed_2025(cf, SAME_STATEMENT[f["metric"]])
                same[f["metric"]] = {"pack": f["value"], "printed": p, "same_sign_and_amount": p is not None and num(p) == Decimal(str(f["value"]))}
        check("same_pack_keeps_printed_sign_for_every_other_line_of_the_statement",
              len(same) == len(SAME_STATEMENT) and all(v["same_sign_and_amount"] for v in same.values()), same)

        # 2. the printed row and the subtotal
        p = printed_2025(cf, ROW)
        check("pdf178_prints_an_outflow", p == "(1,457)", {"row": ROW, "printed_2025": p})
        inv = {name: printed_2025(cf, name) for name in [
            "Capital expenditures", "Acquisition of affiliates, net of cash acquired", "Additional investments in joint ventures and associates",
            "Proceeds from sale of affiliates", "Distributions from joint ventures and associates", "Dividends from investments in securities",
            "Interest received", "Investments in securities - net", ROW]}
        others = sum(num(v) for k, v in inv.items() if k != ROW)
        subtotal = num(printed_2025(cf, "Net cash used in investing activities"))
        check("investing_subtotal_reconciles_only_with_negative_sign",
              others + Decimal(-1457) == subtotal and others + Decimal(1457) != subtotal,
              {"other_lines": str(others), "with_-1457": str(others - 1457), "with_+1457": str(others + 1457), "printed_subtotal": str(subtotal)})

        # 3. the correction and its patch
        new_text = text.replace(OLD, NEW)
        new_pack = json.loads(new_text)
        changed = [(i, a, b) for i, (a, b) in enumerate(zip(pack["facts"], new_pack["facts"])) if a != b]
        check("patch_changes_exactly_one_value", len(changed) == 1 and changed[0][0] == idx[0]
              and {k for k in changed[0][1] if changed[0][1][k] != changed[0][2].get(k)} == {"value"}
              and {k: v for k, v in pack.items() if k != "facts"} == {k: v for k, v in new_pack.items() if k != "facts"},
              {"changed_fact_index": [c[0] for c in changed], "before": changed[0][1]["value"] if changed else None,
               "after": changed[0][2]["value"] if changed else None})
        diff = "".join(difflib.unified_diff(text.splitlines(True), new_text.splitlines(True), f"a/{TARGET}", f"b/{TARGET}"))
        patch = HERE / "aramco-2025-annual-metrics.short_term_investments_net.patch"
        patch.write_text(f"diff --git a/{TARGET} b/{TARGET}\n" + diff)
        r = subprocess.run(["git", "apply", "--check", str(patch)], cwd=root, capture_output=True, text=True)
        subprocess.run(["git", "apply", str(patch)], cwd=root, check=r.returncode == 0)
        applied = (root / TARGET).read_text() == new_text if r.returncode == 0 else False
        check("patch_applies_to_b70254e_export_only", r.returncode == 0 and applied, {"stderr": r.stderr[-300:]})
        in_db = db.execute("SELECT count(*) FROM data_points WHERE company_id='sa:2222' AND metric_key='short_term_investments_net'").fetchone()[0]
        check("engine_db_holds_no_row_for_the_key", in_db == 0, {"rows": in_db})
        record = {
            "schema": "marefa-historical-correction/1", "id": "QB4-R01-N1", "state": "PROPOSED_NOT_APPLIED",
            "engine_commit": ENGINE_COMMIT, "target_file": TARGET, "target_file_sha256": old_sha,
            "corrected_file_sha256": hashlib.sha256(new_text.encode()).hexdigest(),
            "fact_index": idx[0], "fact": {k: fact[k] for k in ("metric", "period_start", "period_end", "period_kind", "fiscal_year", "scale", "unit")},
            "field": "value", "from": 1457, "to": -1457, "amount_sar": "-1457000000",
            "evidence": {"source_document_sha256": qb4.ARA_SHA, "pdf_page": 178, "row": ROW, "printed_2025": "(1,457)",
                         "meaning": "net purchases of short-term investments in 2025, a cash outflow"},
            "definition_basis": "cash-flow flow in currency; engine precedents store net inflows as positive; the same pack keeps the printed sign for every other line of this statement",
            "not_changed_here": {"page": f"{fact['page']} (the statement is on PDF 178; every cash-flow fact of this pack carries 181)",
                                 "table": f"{fact['table']!r} (label of the row's meaning, not of the table)",
                                 "reason": "outside this correction; reported for a separate decision"},
            "engine_database": "unchanged; the key has no row in the b70254e database",
            "patch": patch.name, "patch_sha256": hashlib.sha256(patch.read_bytes()).hexdigest(),
        }
        (HERE / "QB4-R01-HISTORICAL-CORRECTION.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n")
    finally:
        shutil.rmtree(work, ignore_errors=True)
        after = original_engine_state()
        check("original_engine_unchanged", after == before, {"before": before, "after": after})
    lines = [f"{c['status']} {c['check']}" for c in checks]
    passed = sum(c["status"] == "PASS" for c in checks)
    lines.append(f"{passed}/{len(checks)} PASS")
    (HERE / "historical-correction-checks.txt").write_text("\n".join(lines) + "\n\n" + json.dumps(checks, ensure_ascii=False, indent=1, default=str) + "\n")
    print("\n".join(lines))
    return 0 if passed == len(checks) else 1


if __name__ == "__main__":
    sys.exit(main())
