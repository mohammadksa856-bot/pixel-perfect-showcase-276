"""End-to-end HTTP check of the publication gate and quarter-end balances. Synthetic values only (markers 777101…).

1. Export engine b70254e twice is not needed: one export with quarter-position.patch applied; a disposable DB copy
   (committed blob), migrated by Database(); synthetic Q3-2025 rows for sa:2222 synced through sync-manifests.
2. The patched engine API serves that copy on 127.0.0.1 with a local key.
3. The site dev server (live engine mode, no fixtures) points at it on 127.0.0.1; plain unauthenticated GETs of
   Overview, Investor, Data and the financials tab under four approval files: none, JSON words only, records
   correctly signed by an ephemeral key absent from the committed trust store, and an unreadable file. With the
   committed (empty) trust store no synthetic value may appear in any case.
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
        # Approval files, none of which may expose a value: (a) JSON words only, unsigned; (b) records correctly
        # signed for revenue and the 30 September cash by an ephemeral key absent from the committed trust store;
        # (c) an unreadable file. The site's trust store is empty, so live values are withheld in every case.
        page_file = tmp / "engine-page.json"
        page_file.write_text(body)
        words = tmp / "words.json"
        words.write_text(json.dumps({"schema": "marefa-publication-approvals/1", "approvals": [
            {"decision": d, "decision_ref": "WORDS-ONLY", "authority_id": "anyone", "subject": {"kind": "fact", "key": "x"},
             "issued_at": "2026-10-01T00:00:00Z", "signature": ""}
            for d in ("SOURCE_ACCEPT", "FINANCIAL_ACCEPT", "PUBLICATION_AUTHORIZED")],
            "source_accept": "SOURCE_ACCEPT", "financial_accept": "FINANCIAL_ACCEPT", "publication": "PUBLICATION_AUTHORIZED"}))
        signed = tmp / "signed-untrusted.json"
        r = subprocess.run(["bun", str(HERE / "sign_untrusted.ts"), str(page_file), str(signed),
                            f"quarter:revenue:{MARKS['revenue']}", f"quarter_position:cash:{MARKS['cash']}"],
                           cwd=REPO, capture_output=True, text=True)
        assert r.returncode == 0, r.stderr[-2000:]
        out["untrusted_signed_records"] = int(r.stdout.strip())
        garbage = tmp / "garbage.json"
        garbage.write_text("{not json")
        scenarios = (("no_approvals", {}), ("json_words_only", {"MAREFA_PUBLICATION_APPROVALS_PATH": str(words)}),
                     ("signed_by_untrusted_key", {"MAREFA_PUBLICATION_APPROVALS_PATH": str(signed)}),
                     ("unreadable_file", {"MAREFA_PUBLICATION_APPROVALS_PATH": str(garbage)}))

        site_env = {k: v for k, v in os.environ.items() if not k.startswith(("MAREFA_", "VERCEL_"))}
        site_env.update(ENGINE_PREVIEW_ENABLED="true", WEB_V1_PREVIEW_ENABLED="true",
                        FINENGINE_API_URL=f"http://127.0.0.1:{eport}", FINENGINE_API_KEY=KEY)
        for label, extra in scenarios:
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
    checks.append(("six signed records produced by the untrusted key", out["untrusted_signed_records"] == 6))
    for label, _ in scenarios:
        checks.append((f"{label}: every page 200, no synthetic value on any page",
                       all(not any(v[k] for k in MARKS) and v["status"] == 200 for v in out[label].values())))
    checks.append(("original engine unchanged", out["original_engine_unchanged"]))
    out["checks"] = [{"check": c, "pass": bool(ok)} for c, ok in checks]
    (HERE / "E2E-HTTP-RESULTS.json").write_text(json.dumps(out, indent=2) + "\n")
    for c, ok in checks:
        print("PASS" if ok else "FAIL", c)
    print(json.dumps({k: out[k] for k, _ in scenarios}, indent=1))
    return 0 if all(ok for _, ok in checks) else 1


if __name__ == "__main__":
    sys.exit(main())
