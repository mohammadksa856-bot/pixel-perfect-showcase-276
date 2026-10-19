"""T1 isolated ingestion run. Refuses to touch anything unless a fresh preflight returns PASS.

Everything happens in a disposable directory holding a git-archive export of engine b70254e (with its committed DB
blob). Steps: pristine copy; baseline qualification; ingestion through the engine's own reviewed-manifest sync
(sync_reviewed_manifests: verifier, online-clone preflight, then the copy); retrieval of every row by identity,
version and source; local /page API on the copy; site CompanyPreview on that payload; qualification after;
rollback to the pristine copy and its proof; original engine before/after proof.

  python3 isolated_run.py            T1 (requires preflight PASS: independent SOURCE_ACCEPT + owner approval)
  python3 isolated_run.py --selftest mechanism self-test with a SYNTHETIC company in a temporary registry; no T1
                                     value is used, nothing is kept, and the result is not a T1 result
"""
from __future__ import annotations

import json
import shutil
import socket
import sqlite3
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import preflight
from t1_common import (COMPANY_ID, HERE, MANIFEST, REPO, T1_SCOPE, dump, engine_env, export_engine, load,
                       original_engine_state, sha256_file, workdir)

SELFTEST = "--selftest" in sys.argv
SYN_ID, SYN_SYMBOL = "sa:9999", "9999"


def synthetic_manifest() -> dict:
    """Same shape as T1, for a synthetic issuer; values are arbitrary and not Aramco data."""
    m = load(MANIFEST)
    m = json.loads(json.dumps(m))
    m.update(company_id=SYN_ID, source_url="https://example.invalid/synthetic-q3.pdf",
             filed_at_note="SYNTHETIC SELF-TEST ONLY")
    for i, f in enumerate(m["facts"]):
        f["value"] = 1000 + i
        f["row"] = "synthetic"
        f["cell"] = "synthetic"
    return m


def run_engine(root: Path, db: Path, *args: str) -> dict:
    r = subprocess.run([sys.executable, "-m", "finengine", "--db", str(db), *args], cwd=root, env=engine_env(root),
                       capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(f"finengine {args[0]} failed: {r.stderr[-3000:]}")
    return json.loads(r.stdout[r.stdout.index("{"):])


def qualification(root: Path, db: Path, market: str, symbol: str) -> dict:
    """Test-mode qualification on a copy: the engine's own understanding refresh and 18-category contract."""
    u = run_engine(root, db, "understanding", market, symbol, "--refresh")
    f = run_engine(root, db, "factory-contract-readiness", market, symbol)
    pick = lambda cats, key: next(({k: c.get(k) for k in ("score", "weighted_score", "status")}
                                   for c in cats if c.get("category_key") == key), None)
    return dict(
        understanding=dict(total_score=u.get("total_score"), readiness_state=u.get("readiness_state"),
                           hard_gates=u.get("hard_gates"),
                           financial_statements=pick(u.get("categories", []), "financial_statements")),
        factory_contract=dict(total_score=f.get("total_score"), readiness_state=f.get("readiness_state"),
                              coverage_thresholds_passed=f.get("coverage_thresholds_passed"),
                              all_hard_gates_passed=f.get("all_hard_gates_passed"),
                              financial_statements=pick(f.get("categories", []), "financial_statements"),
                              blocking_reasons=f.get("blocking_reasons")))


def rows_for(db: Path, company: str) -> list[dict]:
    # mode=ro without immutable: the test copy may hold committed pages in its WAL.
    con = sqlite3.connect(f"file:{db.resolve().as_posix()}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    out = []
    for (metric, kind, start, end) in sorted(T1_SCOPE, key=str):
        rs = [dict(r) for r in con.execute(
            "SELECT id,metric_key,period_kind,period_start,period_end,fiscal_year,fiscal_quarter,scope,dimensions_json,"
            "unit,currency,value_decimal,version,is_current,is_calculated,source_key,source_url,form,quality_score,published_at FROM data_points "
            "WHERE company_id=? AND metric_key=? AND period_kind=? AND period_end=?", (company, metric, kind, end))]
        out.append(dict(identity=[metric, kind, start, end], rows=rs))
    src = [dict(r) for r in con.execute("SELECT source_key,source_url,filing_type,filed_at,status,content_hash "
                                        "FROM source_documents WHERE company_id=? ORDER BY rowid DESC LIMIT 3", (company,))]
    con.close()
    return out + [dict(sources=src)]


def free_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def page_api(root: Path, db: Path, market: str, symbol: str, out: Path) -> dict:
    port = free_port()
    env = engine_env(root) | {"T1_API_KEY": "t1-local-only"}
    proc = subprocess.Popen([sys.executable, "-m", "finengine", "--db", str(db), "serve", "--port", str(port),
                             "--api-key-env", "T1_API_KEY"], cwd=root, env=env, stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL)
    try:
        url = f"http://127.0.0.1:{port}/v1/companies/{market}/{symbol}/page"
        for _ in range(60):
            try:
                req = urllib.request.Request(url, headers={"X-API-Key": "t1-local-only"})
                with urllib.request.urlopen(req, timeout=30) as r:
                    body = r.read()
                    status = r.status
                break
            except OSError:
                time.sleep(0.5)
        else:
            raise RuntimeError("engine API did not start")
        with urllib.request.urlopen(url, timeout=30) as r:  # no key
            raise RuntimeError(f"API answered without key: {r.status}")
    except urllib.error.HTTPError as e:
        unauth = e.code
    finally:
        proc.terminate()
        proc.wait(10)
    out.write_bytes(body)
    page = json.loads(body)
    fin = page["sections"]["financials"]
    found = []
    for (metric, kind, start, end) in sorted(T1_SCOPE, key=str):
        snap = {"quarter": "quarter", "instant": "instant"}[kind]
        hist = {"quarter": "quarter", "instant": "annual_position"}[kind]
        rs = [r for r in fin.get(snap, {}).get("metrics", {}).get(metric, []) if r["period_end"] == end]
        rs += [r for p in fin.get("history", {}).get(hist, {}).get("periods", []) if p["period_end"] == end
               for r in p["metrics"].get(metric, [])]
        found.append(dict(identity=[metric, kind, start, end], payload_rows=len(rs),
                          values=sorted({r["value"] for r in rs}), versions=sorted({r["version"] for r in rs}),
                          source_keys=sorted({r["source_key"] for r in rs}),
                          quality=sorted({str(r.get("quality_status")) for r in rs})))
    return dict(status=status, unauthenticated_status=unauth, bytes=len(body), t1_rows=found)


def preview(page_json: Path, out: Path) -> dict:
    r = subprocess.run(["bun", str(HERE / "preview_check.ts"), str(page_json), str(out)], cwd=REPO,
                       capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(r.stderr[-2000:])
    return load(out)


def main() -> int:
    before = original_engine_state()
    if not SELFTEST:
        code = preflight.main()
        if code != 0:
            print("REFUSED: preflight is not PASS; no copy was created and nothing was ingested.")
            return 2
    work = workdir("t1-isolated-")
    report: dict = dict(schema="marefa-t1-isolated-run/1", mode="SELFTEST_SYNTHETIC" if SELFTEST else "T1",
                        started_utc=datetime.now(timezone.utc).isoformat(timespec="seconds"),
                        original_before={k: before[k] for k in ("head", "db_sha256", "db_size", "db_mtime_ns")})
    try:
        root = export_engine(work)
        copy = root / "data/financial.sqlite3"
        pristine = work / "pristine.sqlite3"
        shutil.copy2(copy, pristine)
        report["copy"] = dict(pristine_sha256=sha256_file(pristine), note="git-archive blob of b70254e, never the original file")

        registry = root / "config/companies.json"
        market, symbol, company = "SA", "2222", COMPANY_ID
        imports = work / "imports"
        imports.mkdir()
        if SELFTEST:
            reg = load(registry)
            base = next(c for c in reg if c["company_id"] == COMPANY_ID)
            reg.append(dict(base, company_id=SYN_ID, symbol=SYN_SYMBOL, name="Synthetic Self-Test Co", isin=None,
                            sources=["https://example.invalid/"]))
            registry = work / "registry.json"
            dump(registry, reg)
            symbol, company = SYN_SYMBOL, SYN_ID
            manifest = imports / "synthetic-2025-q3-selftest.json"
            dump(manifest, synthetic_manifest())
        else:
            manifest = imports / "aramco-2025-q3-t1.json"
            shutil.copy2(MANIFEST, manifest)

        baseline_db = work / "baseline.sqlite3"
        shutil.copy2(pristine, baseline_db)
        report["qualification_before"] = qualification(root, baseline_db, "SA", "2222")

        sync = run_engine(root, copy, "sync-manifests", "--imports", str(imports), "--manifest", str(manifest),
                          "--registry", str(registry), "--raw-dir", str(work / "raw"), "--archive-index", "",
                          "--project-root", str(root), "--backup-dir", str(work / "backups"))
        report["ingestion"] = dict(preflight_clone=sync.get("preflight"), verification=sync.get("verification"),
                                   counts=sync.get("counts"), published_manifests=sync.get("published_manifests"),
                                   integrity=sync.get("integrity"),
                                   source_key=sync["results"][0]["source_key"],
                                   manifest_sha256=sha256_file(manifest))
        retrieved = rows_for(copy, company)
        expected = {f["label"]: f for f in load(manifest)["facts"]}
        checks = []
        for item in retrieved[:-1]:
            cur = [r for r in item["rows"] if r["is_current"]]
            checks.append(dict(identity=item["identity"], current_rows=len(cur),
                               ok=len(cur) == 1 and cur[0]["source_key"] == report["ingestion"]["source_key"]
                               and cur[0]["scope"] == "consolidated" and cur[0]["currency"] == "SAR"
                               and cur[0]["dimensions_json"] in (None, "", "{}", "null") and not cur[0]["is_calculated"],
                               row=cur[0] if cur else None))
        report["retrieval"] = dict(all_ok=all(c["ok"] for c in checks), rows=checks, sources=retrieved[-1]["sources"],
                                   ingested_values=sum(c["current_rows"] for c in checks))
        report["sync_replay_idempotent"] = run_engine(
            root, copy, "sync-manifests", "--imports", str(imports), "--manifest", str(manifest), "--registry",
            str(registry), "--raw-dir", str(work / "raw"), "--archive-index", "", "--project-root", str(root)
        ).get("counts")

        page_json = work / "page.json"
        report["api_page"] = page_api(root, copy, market, symbol, page_json)
        if SELFTEST:
            # Baseline for 2222 on the same copy (the synthetic issuer does not touch it): how the five T1 cells look now.
            base_json = work / "page-2222.json"
            report["api_page_2222_baseline"] = page_api(root, copy, "SA", "2222", base_json)
            report["company_preview_2222_baseline"] = preview(base_json, work / "preview-2222.json")
        else:
            report["company_preview"] = preview(page_json, work / "preview.json")
        report["qualification_after"] = qualification(root, copy, "SA", "2222")
        report["financially_qualified"] = 0
        report["publication_authorized"] = False

        # Rollback: restore the copy byte-for-byte from the pristine snapshot and prove the T1 rows are gone.
        for suffix in ("-wal", "-shm"):
            Path(str(copy) + suffix).unlink(missing_ok=True)
        shutil.copy2(pristine, copy)
        after_rows = rows_for(copy, company)
        report["rollback"] = dict(method="byte restore from pristine snapshot",
                                  copy_sha256_after=sha256_file(copy),
                                  equals_pristine=sha256_file(copy) == report["copy"]["pristine_sha256"],
                                  identity_rows_after=sum(len(i["rows"]) for i in after_rows[:-1]))
    finally:
        shutil.rmtree(work, ignore_errors=True)
        after = original_engine_state()
        report["original_after"] = {k: after[k] for k in ("head", "db_sha256", "db_size", "db_mtime_ns")}
        report["original_unchanged"] = all(after[k] == before[k] for k in ("head", "db_sha256", "db_size", "db_mtime_ns")) \
            and after["porcelain"] == before["porcelain"]
        report["workdir_removed"] = not work.exists()
        name = "T1-SELFTEST-SYNTHETIC.json" if SELFTEST else "T1-ISOLATED-RUN.json"
        (HERE / name).write_text(json.dumps(report, ensure_ascii=False, indent=2, default=str) + "\n", encoding="utf-8")
    print(json.dumps({k: report.get(k) for k in ("mode", "original_unchanged", "rollback")}, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(main())
