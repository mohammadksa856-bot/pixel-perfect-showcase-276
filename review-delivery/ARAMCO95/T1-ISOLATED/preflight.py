"""T1 preflight. Fail-closed: ingestion into the isolated copy is allowed only when every check passes.

Checks: original engine untouched; manifest limited to the five T1 identities with full identity and the pinned
source hash; engine label mapping and the engine's own ManifestVerifier; no existing row with the same identity in
the committed DB (read with mode=ro&immutable=1 on an exported copy); an independent SOURCE_ACCEPT receipt for this
exact manifest; an explicit owner authorisation for isolated ingestion of this exact manifest.
Writes T1-PREFLIGHT.json. Exit 0 = PASS, 2 = BLOCKED, 1 = error.
Usage: python3 preflight.py
"""
from __future__ import annotations

import json
import shutil
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone

from t1_common import (AUTHORIZATION, COMPANY_ID, ENGINE_COMMIT, ENGINE_DB_SHA256, HERE, IDENTITIES, MANIFEST,
                       Q3_2025_SHA256, SOURCE_RECEIPT, T1_SCOPE, engine_env, export_engine, load, original_engine_state,
                       ro_uri, sha256_file, workdir)

PREPARERS = {"claude", "codex"}  # preparers of this evidence cannot be the independent source reviewer
FIELD_CHECKS = ("document_sha256_matches", "page_and_row_match", "column_is_three_months_ended_2025_09_30",
                "printed_value_matches", "unit_is_sar_millions", "consolidated")
EXTRA_CHECKS = {"total_equity": "group_total_including_non_controlling_interests",
                "net_income": "group_net_income_not_attributable_share"}


def check(results: list, name: str, ok: bool, detail) -> bool:
    results.append(dict(check=name, status="PASS" if ok else "BLOCK", detail=detail))
    return ok


def ident(metric, kind, start, end):
    return (metric, kind, start or None, end)


def main() -> int:
    results: list = []
    work = workdir("t1-preflight-")
    try:
        state = original_engine_state()
        check(results, "original_engine_untouched",
              state["head"].startswith(ENGINE_COMMIT) and state["porcelain"] == "" and state["db_sha256"] == ENGINE_DB_SHA256,
              {k: state[k] for k in ("head", "db_sha256")} | {"tracked_changes": state["porcelain"]})

        manifest = load(MANIFEST)
        msha = sha256_file(MANIFEST)
        ids = load(IDENTITIES)["identities"]
        facts = manifest.get("facts", [])
        keys = [ident(i["metric_key"], i["period_kind"], i["period_start"], i["period_end"]) for i in ids]
        domain_keys = [k for k in manifest if k not in {"company_id", "filing_type", "filed_at", "filed_at_basis",
                                                        "filed_at_confidence", "filed_at_note", "period_end",
                                                        "source_url", "facts"}]
        check(results, "scope_exactly_five_t1_identities",
              len(facts) == 5 and len(ids) == 5 and set(keys) == T1_SCOPE and len(set(keys)) == 5
              and manifest.get("company_id") == COMPANY_ID and not domain_keys,
              {"facts": len(facts), "identities": sorted(map(str, keys)), "extra_top_level_keys": domain_keys})
        full = all(f.get("currency") == "SAR" and f.get("unit") == "SAR" and f.get("scale") == 1000000
                   and f.get("scope") == "consolidated" and f.get("dimensions") == {} and f.get("fiscal_year") == 2025
                   and f.get("fiscal_quarter") == 3 and f.get("page") in (27, 29, 31)
                   and (f["period_kind"] == "instant") == ("period_start" not in f) for f in facts)
        same = all(str(f["value"]) == i["value_millions"] and f["period_end"] == i["period_end"]
                   and f["period_kind"] == i["period_kind"] and f.get("period_start") == i["period_start"]
                   for f, i in zip(facts, ids))
        check(results, "full_financial_identity_units_and_source_hash",
              full and same and Q3_2025_SHA256 in manifest.get("filed_at_note", "")
              and all(i["source_document_sha256"] == Q3_2025_SHA256 for i in ids),
              {"source_document_sha256": Q3_2025_SHA256, "manifest_sha256": msha})

        root = export_engine(work)
        env = engine_env(root)
        probe = subprocess.run([sys.executable, "-c", (
            "import json,sys,shutil,tempfile,pathlib\n"
            "from finengine.mapping import canonicalize\n"
            "from finengine.verification import ManifestVerifier\n"
            "m=json.load(open(sys.argv[1]))\n"
            "maps=[[f['label'],canonicalize(f['label'],'SA')] for f in m['facts']]\n"
            "d=pathlib.Path(tempfile.mkdtemp()); shutil.copy(sys.argv[1], d/'aramco-2025-q3-t1.json')\n"
            "r=ManifestVerifier(d).verify()\n"
            "print(json.dumps({'maps':maps,'checks':r['checks'],'passed':r['passed'],'warnings':r['warnings'],"
            "'failures':r['failures'],'unmapped':len(r['unmapped_labels'])},default=str))\n"), str(MANIFEST)],
            env=env, cwd=root, capture_output=True, text=True)
        if probe.returncode:
            raise RuntimeError(probe.stderr[-2000:])
        p = json.loads(probe.stdout.strip().splitlines()[-1])
        want = {i["metric_key"] for i in ids}
        check(results, "engine_label_mapping", {m for _, m in p["maps"]} == want and all(m for _, m in p["maps"]), p["maps"])
        check(results, "engine_manifest_verifier", not p["failures"] and p["unmapped"] == 0,
              {k: p[k] for k in ("checks", "passed", "warnings", "failures", "unmapped")})

        db = sqlite3.connect(ro_uri(root / "data/financial.sqlite3"), uri=True)
        db.row_factory = sqlite3.Row
        same_identity, nearby = [], []
        for (metric, kind, start, end) in T1_SCOPE:
            for r in db.execute("SELECT id,metric_key,period_kind,period_start,period_end,scope,dimensions_json,version,"
                                "is_current,source_key FROM data_points WHERE company_id=? AND metric_key=? AND period_end=?",
                                (COMPANY_ID, metric, end)):
                r = dict(r)
                exact = (r["period_kind"] == kind and (r["period_start"] or None) == start
                         and r["scope"] == "consolidated" and r["dimensions_json"] in (None, "", "{}", "null"))
                (same_identity if exact else nearby).append(r)
        source_known = db.execute("SELECT count(*) FROM source_documents WHERE source_key=?", (f"file:{msha}",)).fetchone()[0]
        db.close()
        check(results, "no_existing_row_with_same_identity", not same_identity and source_known == 0,
              {"same_identity_rows_any_version": same_identity, "manifest_source_key_registered": source_known,
               "same_metric_and_end_other_identity": nearby})

        receipt = load(SOURCE_RECEIPT) if SOURCE_RECEIPT.is_file() else None
        problems = []
        if not receipt:
            problems.append("no T1-SOURCE-REVIEW-RECEIPT.json")
        else:
            if receipt.get("decision") != "SOURCE_ACCEPT":
                problems.append("decision is not SOURCE_ACCEPT")
            if str(receipt.get("reviewer", "")).strip().lower() in PREPARERS | {""}:
                problems.append("reviewer missing or a preparer")
            if receipt.get("document_sha256") != Q3_2025_SHA256 or receipt.get("manifest_sha256") != msha:
                problems.append("receipt does not cover this document hash and this exact manifest")
            per = {r.get("metric_key"): r for r in receipt.get("fields", [])}
            for i in ids:
                need = FIELD_CHECKS + ((EXTRA_CHECKS[i["metric_key"]],) if i["metric_key"] in EXTRA_CHECKS else ())
                if not all(per.get(i["metric_key"], {}).get(c) is True for c in need):
                    problems.append(f"{i['metric_key']}: not every source check is true")
        check(results, "independent_source_accept_receipt", not problems, problems or "accepted by " + receipt["reviewer"])

        auth = load(AUTHORIZATION) if AUTHORIZATION.is_file() else None
        problems = []
        if not auth:
            problems.append("no T1-AUTHORIZATION.json")
        else:
            if auth.get("approval") != "APPROVE_T1_ISOLATED_INGESTION" or not auth.get("approved_by"):
                problems.append("no explicit owner approval")
            if auth.get("manifest_sha256") != msha or auth.get("engine_commit") != ENGINE_COMMIT:
                problems.append("approval does not cover this manifest and engine commit")
            if auth.get("target") != "ISOLATED_COPY_ONLY":
                problems.append("target is not ISOLATED_COPY_ONLY")
            exp = auth.get("expires_at")
            if not exp or datetime.fromisoformat(exp) <= datetime.now(timezone.utc):
                problems.append("approval missing expiry or expired")
        check(results, "owner_authorization_for_isolated_ingestion", not problems, problems or "approved by " + auth["approved_by"])

        blocked = [r["check"] for r in results if r["status"] != "PASS"]
        out = dict(schema="marefa-t1-preflight/1", at_utc=datetime.now(timezone.utc).isoformat(timespec="seconds"),
                   result="PASS" if not blocked else "BLOCKED", blocked_by=blocked, manifest_sha256=msha,
                   engine_commit=ENGINE_COMMIT, original_engine_db_sha256=state["db_sha256"],
                   rights_note="Original rights UNKNOWN_NO_GRANT: an isolated trial is not publication; publication stays unauthorised.",
                   ingested=0, checks=results)
        (HERE / "T1-PREFLIGHT.json").write_text(json.dumps(out, ensure_ascii=False, indent=2, default=str) + "\n", encoding="utf-8")
        for r in results:
            print(f"{r['status']:5} {r['check']}")
        print(out["result"], blocked)
        after = original_engine_state()
        if after["db_sha256"] != state["db_sha256"] or after["db_mtime_ns"] != state["db_mtime_ns"]:
            raise RuntimeError("original engine DB changed during preflight")
        return 0 if not blocked else 2
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
