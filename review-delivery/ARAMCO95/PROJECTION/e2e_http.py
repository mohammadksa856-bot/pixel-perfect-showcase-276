"""End-to-end HTTP check of the publication gate and quarter-end balances. Synthetic values only (markers 777101…).

1. Export engine b70254e twice is not needed: one export with quarter-position.patch applied; a disposable DB copy
   (committed blob), migrated by Database(); synthetic Q3-2025 rows for sa:2222 synced through sync-manifests.
2. The patched engine API serves that copy on 127.0.0.1 with a local key.
3. The site dev server (live engine mode, no fixtures) points at it on 127.0.0.1; plain unauthenticated GETs of
   Overview, Investor, Data and the financials tab, first with no ledger, then with a test ledger authorising
   exactly two synthetic rows (revenue and the 30 September cash balance).
Nothing is written outside a temporary directory; the original engine is hashed before and after.
Usage (repo root): python3 review-delivery/ARAMCO95/PROJECTION/e2e_http.py
"""
import hashlib
import json
import os
import shutil
import signal
import socket
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
ENGINE = Path(os.environ.get("ENGINE", "/home/user/mohammadksa856-bot/-market-agnostic-financial-data-engine-1"))
KEY = "projection-local-only"
MARKS = {"revenue": "777101000000", "net_income": "777102000000", "cash": "777103000000", "total_equity": "777104000000"}
PAGES = ["/preview/web-v1/companies/2222/overview", "/preview/web-v1/companies/2222/intelligence",
         "/preview/web-v1/companies/2222", "/preview/web-v1/companies/2222?tab=financials"]


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); n = s.getsockname()[1]; s.close(); return n


def get(url, headers=None, timeout=120):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read().decode("utf-8", "replace")


def wait(url, headers=None, tries=240):
    for _ in range(tries):
        try:
            return get(url, headers, 30)
        except Exception:
            time.sleep(1)
    raise RuntimeError(f"no answer from {url}")


def stop(p):
    """Stop a child and its whole process group (npx starts vite as a grandchild)."""
    if p.poll() is not None:
        return
    try:
        os.killpg(p.pid, signal.SIGTERM)
    except (ProcessLookupError, PermissionError):
        p.terminate()
    try:
        p.wait(20)
    except subprocess.TimeoutExpired:
        os.killpg(p.pid, signal.SIGKILL)


def main():
    before = sha(ENGINE / "data/financial.sqlite3")
    tmp = Path(tempfile.mkdtemp(prefix="projection-e2e-"))
    procs = []
    out = {"original_engine_before": before}
    try:
        subprocess.run(["git", "-C", str(ENGINE), "archive", "-o", str(tmp / "e.tar"), "b70254e"], check=True)
        with tarfile.open(tmp / "e.tar") as t:
            t.extractall(tmp / "engine", filter="data")
        root = tmp / "engine"
        subprocess.run(["git", "apply", str(HERE / "engine/quarter-position.patch")], cwd=root, check=True)
        env = dict(os.environ, PYTHONPATH=str(root / "src"), PYTHONDONTWRITEBYTECODE="1", PROJ_KEY=KEY)
        db = tmp / "copy.sqlite3"
        shutil.copy2(root / "data/financial.sqlite3", db)
        facts = [
            {"label": "revenue", "value": 777101, "period_start": "2025-07-01", "period_kind": "quarter"},
            {"label": "net income", "value": 777102, "period_start": "2025-07-01", "period_kind": "quarter"},
            {"label": "cash and cash equivalents", "value": 777103, "period_kind": "instant"},
            {"label": "total equity", "value": 777104, "period_kind": "instant"},
        ]
        for f in facts:
            f.update(scale=1000000, currency="SAR", unit="SAR", period_end="2025-09-30", fiscal_year=2025, fiscal_quarter=3)
        (tmp / "imports").mkdir()
        manifest = tmp / "imports/synthetic-2222-q3-2025-projection.json"
        manifest.write_text(json.dumps({"company_id": "sa:2222", "filing_type": "synthetic projection test",
                                        "filed_at": "2025-11-04", "period_end": "2025-09-30",
                                        "source_url": "https://example.invalid/synthetic-projection.pdf", "facts": facts}))
        r = subprocess.run([sys.executable, "-m", "finengine", "--db", str(db), "sync-manifests", "--imports",
                            str(tmp / "imports"), "--manifest", str(manifest), "--registry", str(root / "config/companies.json"),
                            "--raw-dir", str(tmp / "raw"), "--archive-index", "", "--project-root", str(root)],
                           cwd=root, env=env, capture_output=True, text=True)
        assert r.returncode == 0, r.stderr[-2000:]
        eport = port()
        procs.append(subprocess.Popen([sys.executable, "-m", "finengine", "--db", str(db), "serve", "--host", "127.0.0.1",
                                       "--port", str(eport), "--api-key-env", "PROJ_KEY"], cwd=root, env=env,
                                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True))
        _, body = wait(f"http://127.0.0.1:{eport}/v1/companies/SA/2222/page", {"X-API-Key": KEY})
        engine_page = json.loads(body)
        fin = engine_page["sections"]["financials"]
        out["engine_page_has_synthetic"] = {k: v in body for k, v in MARKS.items()}
        out["engine_quarter_position_ends"] = [p["period_end"] for p in fin["history"]["quarter_position"]["periods"]]
        # Test ledger: identities read from the engine's own rows; only revenue and cash are authorised.
        def row(section, metric):
            for p in fin["history"][section]["periods"]:
                for r in p["metrics"].get(metric, []):
                    if r["value"] == MARKS[metric]:
                        return r
            raise KeyError(metric)
        def entry(metric, r):
            return {"kind": "fact", "identity": {"company_id": "sa:2222", "metric": metric, "period_kind": r["period_kind"],
                    "period_start": r.get("period_start") or None, "period_end": r["period_end"], "scope": r.get("scope") or "consolidated",
                    "dimensions": r.get("dimensions") or {}, "currency": r.get("currency"), "unit": r.get("unit"),
                    "version": r["version"], "source_key": r["source_key"], "value": r["value"]},
                    "source_accept": {"state": "SOURCE_ACCEPT", "receipt_sha256": "b" * 64, "reviewer": "SYNTHETIC-TEST"},
                    "financial_accept": {"state": "FINANCIAL_ACCEPT", "by": "SYNTHETIC-TEST", "at": "2026-10-01T00:00:00Z"},
                    "publication": {"state": "PUBLICATION_AUTHORIZED", "rights_basis": "SYNTHETIC-TEST", "by": "SYNTHETIC-TEST",
                                    "at": "2026-10-01T00:00:00Z", "expires_at": "2027-01-01T00:00:00Z"}}
        ledger = tmp / "ledger.json"
        ledger.write_text(json.dumps({"schema": "marefa-publication-ledger/1", "entries": [
            entry("revenue", row("quarter", "revenue")), entry("cash", row("quarter_position", "cash"))]}))

        site_env = {k: v for k, v in os.environ.items() if not k.startswith(("MAREFA_", "VERCEL_"))}
        site_env.update(ENGINE_PREVIEW_ENABLED="true", WEB_V1_PREVIEW_ENABLED="true",
                        FINENGINE_API_URL=f"http://127.0.0.1:{eport}", FINENGINE_API_KEY=KEY)
        for label, extra in (("no_ledger", {}), ("ledger_two_rows", {"MAREFA_PUBLICATION_LEDGER_PATH": str(ledger)})):
            sport = port()
            p = subprocess.Popen(["npx", "vite", "dev", "--host", "127.0.0.1", "--port", str(sport), "--strictPort"],
                                 cwd=REPO, env=site_env | extra, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                 start_new_session=True)
            procs.append(p)
            res = {}
            try:
                wait(f"http://127.0.0.1:{sport}{PAGES[0]}")  # the site root waits on Supabase, unreachable here
                for path in PAGES:
                    status, html = get(f"http://127.0.0.1:{sport}{path}", timeout=300)
                    res[path] = {"status": status, "bytes": len(html), **{k: v in html for k, v in MARKS.items()}}
            finally:
                stop(p)
            out[label] = res
    finally:
        for p in procs:
            stop(p)
        shutil.rmtree(tmp, ignore_errors=True)
        out["original_engine_after"] = sha(ENGINE / "data/financial.sqlite3")
        out["original_engine_unchanged"] = out["original_engine_after"] == before
        out["temp_removed"] = not tmp.exists()
    checks = []
    checks.append(("engine copy holds all four synthetic rows", all(out["engine_page_has_synthetic"].values())))
    checks.append(("engine quarter_position has 2025-09-30", "2025-09-30" in out["engine_quarter_position_ends"]))
    checks.append(("no ledger: no synthetic value on any page", all(not any(v[k] for k in MARKS) and v["status"] == 200 for v in out["no_ledger"].values())))
    checks.append(("ledger: unauthorised net_income/total_equity on no page", all(not v["net_income"] and not v["total_equity"] for v in out["ledger_two_rows"].values())))
    fin_tab = out["ledger_two_rows"]["/preview/web-v1/companies/2222?tab=financials"]
    checks.append(("ledger: authorised revenue and 30 Sep cash reach the Data financials tab", fin_tab["revenue"] and fin_tab["cash"]))
    checks.append(("original engine unchanged", out["original_engine_unchanged"]))
    out["checks"] = [{"check": c, "pass": bool(ok)} for c, ok in checks]
    (HERE / "E2E-HTTP-RESULTS.json").write_text(json.dumps(out, indent=2) + "\n")
    for c, ok in checks:
        print("PASS" if ok else "FAIL", c)
    print(json.dumps({k: out[k] for k in ("no_ledger", "ledger_two_rows")}, indent=1))
    return 0 if all(ok for _, ok in checks) else 1


if __name__ == "__main__":
    sys.exit(main())
