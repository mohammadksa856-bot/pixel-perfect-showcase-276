"""HTTP check of the integrated kernel: a patched engine export (quarter-position.patch from 6c88655) serves a disposable
DB copy with synthetic Q3-2025 rows on 127.0.0.1; the kernel's fetchCompanyPreview (flag on, committed empty trust
store) is called over real HTTP with four approval files. No synthetic value, and no value cell at all, may come back.
Also: flag off returns "disabled" without any request. Original engine hashed before and after.
Usage (repo root): python3 review-delivery/ARAMCO95/SELECTIVE-A-PR/kernel_http_check.py
"""
import hashlib, json, os, shutil, signal, socket, subprocess, sys, tarfile, tempfile, time, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
ENGINE = Path(os.environ.get("ENGINE", "/home/user/mohammadksa856-bot/-market-agnostic-financial-data-engine-1"))
KEY = "selective-a-local-only"
MARKS = {"revenue": "777101000000", "net_income": "777102000000", "cash": "777103000000", "total_equity": "777104000000"}
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()  # noqa: E731


def port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); n = s.getsockname()[1]; s.close(); return n


def main():
    before = sha(ENGINE / "data/financial.sqlite3")
    tmp = Path(tempfile.mkdtemp(prefix="selective-a-http-"))
    proc, out, checks = None, {}, []
    try:
        subprocess.run(["git", "-C", str(ENGINE), "archive", "-o", str(tmp / "e.tar"), "b70254e"], check=True)
        with tarfile.open(tmp / "e.tar") as t:
            t.extractall(tmp / "engine", filter="data")
        root = tmp / "engine"
        patch = tmp / "quarter-position.patch"
        patch.write_bytes(subprocess.run(["git", "-C", str(REPO), "show", "6c88655:review-delivery/ARAMCO95/PROJECTION/engine/quarter-position.patch"],
                                         capture_output=True, check=True).stdout)
        subprocess.run(["git", "apply", str(patch)], cwd=root, check=True)
        env = dict(os.environ, PYTHONPATH=str(root / "src"), PYTHONDONTWRITEBYTECODE="1", SA_KEY=KEY)
        db = tmp / "copy.sqlite3"
        shutil.copy2(root / "data/financial.sqlite3", db)
        facts = [{"label": "revenue", "value": 777101, "period_start": "2025-07-01", "period_kind": "quarter"},
                 {"label": "net income", "value": 777102, "period_start": "2025-07-01", "period_kind": "quarter"},
                 {"label": "cash and cash equivalents", "value": 777103, "period_kind": "instant"},
                 {"label": "total equity", "value": 777104, "period_kind": "instant"}]
        for f in facts:
            f.update(scale=1000000, currency="SAR", unit="SAR", period_end="2025-09-30", fiscal_year=2025, fiscal_quarter=3)
        (tmp / "imports").mkdir()
        man = tmp / "imports/synthetic-2222-q3-2025-selective-a.json"
        man.write_text(json.dumps({"company_id": "sa:2222", "filing_type": "synthetic selective-A test", "filed_at": "2025-11-04",
                                   "period_end": "2025-09-30", "source_url": "https://example.invalid/synthetic.pdf", "facts": facts}))
        r = subprocess.run([sys.executable, "-m", "finengine", "--db", str(db), "sync-manifests", "--imports", str(tmp / "imports"),
                            "--manifest", str(man), "--registry", str(root / "config/companies.json"), "--raw-dir", str(tmp / "raw"),
                            "--archive-index", "", "--project-root", str(root)], cwd=root, env=env, capture_output=True, text=True)
        assert r.returncode == 0, r.stderr[-1500:]
        ep = port()
        proc = subprocess.Popen([sys.executable, "-m", "finengine", "--db", str(db), "serve", "--host", "127.0.0.1", "--port", str(ep),
                                 "--api-key-env", "SA_KEY"], cwd=root, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                start_new_session=True)
        for _ in range(120):
            try:
                with urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:{ep}/v1/companies/SA/2222/page",
                                                                   headers={"X-API-Key": KEY}), timeout=30) as x:
                    body = x.read().decode(); break
            except Exception:
                time.sleep(1)
        page = json.loads(body)
        (tmp / "page.json").write_text(body)
        out["engine_page_has_synthetic"] = {k: v in body for k, v in MARKS.items()}
        out["engine_quarter_position_ends"] = [p["period_end"] for p in page["sections"]["financials"]["history"]["quarter_position"]["periods"]]
        words = tmp / "words.json"
        words.write_text(json.dumps({"schema": "marefa-publication-approvals/1", "approvals": [
            {"decision": d, "decision_ref": "WORDS", "authority_id": "anyone", "subject": {"kind": "fact", "key": "x"},
             "issued_at": "2026-10-01T00:00:00Z", "signature": ""} for d in ("SOURCE_ACCEPT", "FINANCIAL_ACCEPT", "PUBLICATION_AUTHORIZED")]}))
        signed = tmp / "signed.json"
        r = subprocess.run(["bun", str(HERE / "sign_untrusted.ts"), str(tmp / "page.json"), str(signed),
                            f"quarter:revenue:{MARKS['revenue']}", f"quarter_position:cash:{MARKS['cash']}"], cwd=REPO, capture_output=True, text=True)
        assert r.returncode == 0, r.stderr[-1500:]
        garbage = tmp / "garbage.json"
        garbage.write_text("{not json")
        base = {"ENGINE_PREVIEW_ENABLED": "true", "FINENGINE_API_URL": f"http://127.0.0.1:{ep}", "FINENGINE_API_KEY": KEY}
        scen = {"flag_off": {"FINENGINE_API_URL": f"http://127.0.0.1:{ep}", "FINENGINE_API_KEY": KEY},
                "no_approvals": base, "json_words_only": {**base, "MAREFA_PUBLICATION_APPROVALS_PATH": str(words)},
                "signed_by_untrusted_key": {**base, "MAREFA_PUBLICATION_APPROVALS_PATH": str(signed)},
                "unreadable_file": {**base, "MAREFA_PUBLICATION_APPROVALS_PATH": str(garbage)},
                "frozen_fixture_request_outside_review_policy": {**base, "MAREFA_DESIGN_FIXTURES": "true"}}
        for name, e in scen.items():
            (tmp / "env.json").write_text(json.dumps(e))
            r = subprocess.run(["bun", str(HERE / "kernel_fetch.ts"), str(tmp / "env.json"), str(tmp / f"{name}.json")],
                               cwd=REPO, capture_output=True, text=True)
            assert r.returncode == 0, r.stderr[-1500:]
            served = (tmp / f"{name}.json").read_text()
            out[name] = {**json.loads(r.stdout.strip().splitlines()[-1]), **{k: v in served for k, v in MARKS.items()}}
    finally:
        if proc:
            os.killpg(proc.pid, signal.SIGTERM); proc.wait(20)
        shutil.rmtree(tmp, ignore_errors=True)
        out["original_engine_unchanged"] = sha(ENGINE / "data/financial.sqlite3") == before
    checks.append(("engine copy serves all four synthetic rows", all(out["engine_page_has_synthetic"].values())))
    checks.append(("patched engine serves quarter_position with 2025-09-30", "2025-09-30" in out["engine_quarter_position_ends"]))
    checks.append(("flag off: disabled", out["flag_off"]["state"] == "disabled"))
    for n in ("no_approvals", "json_words_only", "signed_by_untrusted_key", "unreadable_file"):
        checks.append((f"{n}: ok, zero value cells, no synthetic value", out[n]["state"] == "ok" and out[n]["value_cells"] == 0
                       and not any(out[n][k] for k in MARKS)))
    checks.append(("fixtures flag outside the review policy: disabled", out["frozen_fixture_request_outside_review_policy"]["state"] == "disabled"))
    checks.append(("original engine unchanged", out["original_engine_unchanged"]))
    out["checks"] = [{"check": c, "pass": bool(ok)} for c, ok in checks]
    (HERE / "KERNEL-HTTP-RESULTS.json").write_text(json.dumps(out, indent=2) + "\n")
    for c, ok in checks:
        print("PASS" if ok else "FAIL", c)
    return 0 if all(ok for _, ok in checks) else 1


if __name__ == "__main__":
    sys.exit(main())
