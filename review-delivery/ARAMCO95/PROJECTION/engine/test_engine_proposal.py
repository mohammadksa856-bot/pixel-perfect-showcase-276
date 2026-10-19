"""Tests for the quarter-end balance proposal on exported copies of engine b70254e. Synthetic values only.

Never touches the original engine: two git-archive exports (as-is and with quarter-position.patch applied by
`git apply`), a disposable DB copy from the committed blob, a temporary registry with a synthetic issuer.
Usage: python3 test_engine_proposal.py   (ENGINE=<engine repo> to override the path)
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
ENGINE = Path(os.environ.get("ENGINE", "/home/user/mohammadksa856-bot/-market-agnostic-financial-data-engine-1"))
COMMIT = "b70254e"
DB_SHA = "2a749d7c8a051f2716128afac208a4a7e45679f2534fe81d29587f5490005867"
PATCH = HERE / "quarter-position.patch"
SYN = "sa:9999"


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def export(dest: Path) -> Path:
    dest.mkdir(parents=True)
    tar = dest / "e.tar"
    subprocess.run(["git", "-C", str(ENGINE), "archive", "-o", str(tar), COMMIT], check=True)
    with tarfile.open(tar) as t:
        t.extractall(dest / "engine", filter="data")
    tar.unlink()
    return dest / "engine"


def env(root: Path) -> dict:
    e = dict(os.environ, PYTHONPATH=str(root / "src"), PYTHONDONTWRITEBYTECODE="1")
    e.pop("FINENGINE_API_KEY", None)
    return e


def page(root: Path, db: Path, market: str, symbol: str) -> dict:
    code = ("import json,sys\nfrom finengine.query import FinancialQueryService as Q\n"
            "q=Q(sys.argv[1]);print(json.dumps(q.company_page(sys.argv[2],sys.argv[3]),default=str));q.close()")
    r = subprocess.run([sys.executable, "-c", code, str(db), market, symbol], cwd=root, env=env(root),
                       capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(r.stderr[-2000:])
    return json.loads(r.stdout)


def synthetic_manifest() -> dict:
    """Synthetic issuer: quarterly flows, quarter-end and year-end balances. Values are arbitrary markers."""
    def bal(metric_label, end, q, v):
        return {"label": metric_label, "value": v, "scale": 1000000, "currency": "SAR", "unit": "SAR",
                "period_end": end, "period_kind": "instant", "fiscal_year": int(end[:4]), "fiscal_quarter": q}
    def flow(end, start, q, v):
        return {"label": "revenue", "value": v, "scale": 1000000, "currency": "SAR", "unit": "SAR",
                "period_start": start, "period_end": end, "period_kind": "quarter",
                "fiscal_year": int(end[:4]), "fiscal_quarter": q}
    facts = []
    for end, q, base in [("2025-03-31", 1, 910), ("2025-06-30", 2, 920), ("2025-09-30", 3, 930),
                         ("2025-12-31", 4, 940), ("2026-03-31", 1, 950)]:
        facts.append(bal("cash and cash equivalents", end, q, base + 1))
        facts.append(bal("total equity", end, q, base + 2))
    facts += [flow("2025-09-30", "2025-07-01", 3, 8803), flow("2026-03-31", "2026-01-01", 1, 8801)]
    facts.append({"label": "revenue", "value": 8000, "scale": 1000000, "currency": "SAR", "unit": "SAR",
                  "period_start": "2025-01-01", "period_end": "2025-12-31", "period_kind": "fy",
                  "fiscal_year": 2025, "fiscal_quarter": None})
    return {"company_id": SYN, "filing_type": "synthetic test filing", "filed_at": "2026-05-01",
            "period_end": "2026-03-31", "source_url": "https://example.invalid/synthetic.pdf", "facts": facts}


class EngineProposal(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.before = (sha(ENGINE / "data/financial.sqlite3"),
                      subprocess.run(["git", "-C", str(ENGINE), "status", "--porcelain"], capture_output=True,
                                     text=True).stdout)
        cls.tmp = Path(tempfile.mkdtemp(prefix="projection-engine-"))
        cls.base = export(cls.tmp / "base")
        cls.prop = export(cls.tmp / "prop")
        r = subprocess.run(["git", "apply", "--check", str(PATCH)], cwd=cls.prop, capture_output=True, text=True)
        cls.patch_check = r.returncode, r.stderr
        subprocess.run(["git", "apply", str(PATCH)], cwd=cls.prop, check=True)
        cls.db = cls.tmp / "copy.sqlite3"
        shutil.copy2(cls.base / "data/financial.sqlite3", cls.db)
        assert sha(cls.db) == DB_SHA
        # Opening through Database() applies the engine's own migrations to the copy, as the API server does.
        subprocess.run([sys.executable, "-c", "import sys\nfrom finengine.database import Database\nDatabase(sys.argv[1]).close()",
                        str(cls.db)], cwd=cls.base, env=env(cls.base), check=True)
        cls.p_base = page(cls.base, cls.db, "SA", "2222")
        cls.p_prop = page(cls.prop, cls.db, "SA", "2222")
        # Synthetic issuer through the engine's own reviewed-manifest sync, into the same disposable copy.
        reg = json.loads((cls.prop / "config/companies.json").read_text())
        b = next(c for c in reg if c["company_id"] == "sa:2222")
        reg.append(dict(b, company_id=SYN, symbol="9999", name="Synthetic Projection Co", isin=None,
                        sources=["https://example.invalid/"]))
        (cls.tmp / "reg.json").write_text(json.dumps(reg))
        imports = cls.tmp / "imports"
        imports.mkdir()
        (imports / "synthetic-projection.json").write_text(json.dumps(synthetic_manifest()))
        r = subprocess.run([sys.executable, "-m", "finengine", "--db", str(cls.db), "sync-manifests", "--imports",
                            str(imports), "--manifest", str(imports / "synthetic-projection.json"), "--registry",
                            str(cls.tmp / "reg.json"), "--raw-dir", str(cls.tmp / "raw"), "--archive-index", "",
                            "--project-root", str(cls.prop)], cwd=cls.prop, env=env(cls.prop),
                           capture_output=True, text=True)
        assert r.returncode == 0, r.stderr[-2000:]
        cls.syn = page(cls.prop, cls.db, "SA", "9999")

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_patch_applies_cleanly_to_b70254e(self):
        self.assertEqual(self.patch_check[0], 0, self.patch_check[1])

    def test_existing_page_unchanged_except_new_key(self):
        a, b = json.loads(json.dumps(self.p_base)), json.loads(json.dumps(self.p_prop))
        for p in (a, b):
            p.pop("generated_at", None)
        added = b["sections"]["financials"]["history"].pop("quarter_position")
        self.assertEqual(a, b)
        self.assertEqual(a["contract_version"], b["contract_version"])
        ends = [p["period_end"] for p in added["periods"]]
        self.assertTrue(all(e[5:] in ("03-31", "06-30", "09-30") for e in ends), ends)

    def test_quarter_positions_by_date_without_year_end(self):
        qp = self.syn["sections"]["financials"]["history"]["quarter_position"]
        self.assertEqual([p["period_end"] for p in qp["periods"]], ["2026-03-31", "2025-09-30", "2025-06-30", "2025-03-31"])
        got = {(p["period_end"], m): r["value"] for p in qp["periods"] for m, rs in p["metrics"].items() for r in rs}
        self.assertEqual(got[("2025-09-30", "cash")], "931000000")
        self.assertEqual(got[("2025-06-30", "total_equity")], "922000000")
        rows = [r for p in qp["periods"] for rs in p["metrics"].values() for r in rs]
        self.assertTrue(rows and all(r["period_kind"] == "instant" and not r.get("period_start") for r in rows))

    def test_not_flows_not_latest_not_year_end(self):
        fin = self.syn["sections"]["financials"]
        q = fin["history"]["quarter"]["periods"]
        self.assertTrue(all(r["period_kind"] == "quarter" for p in q for rs in p["metrics"].values() for r in rs))
        self.assertTrue(all(m == "revenue" for p in q for m in p["metrics"]))  # balances never become flows
        self.assertEqual(fin["instant"]["period_end"], "2026-03-31")             # latest balance snapshot as before
        ap = fin["history"]["annual_position"]["periods"]
        self.assertEqual([p["period_end"] for p in ap], ["2025-12-31"])           # year-end stays separate
        self.assertNotIn("2025-12-31", [p["period_end"] for p in fin["history"]["quarter_position"]["periods"]])

    def test_quarter_end_days(self):
        code = ("import json\nfrom finengine.query import FinancialQueryService as Q\n"
                "print(json.dumps([Q._quarter_end_days(x) for x in ['12-31','03-31','06-30','05-31','11-30','bad',None,'12-30']]))")
        r = subprocess.run([sys.executable, "-c", code], cwd=self.prop, env=env(self.prop), capture_output=True, text=True)
        self.assertEqual(json.loads(r.stdout), [
            ["03-31", "06-30", "09-30"], ["06-30", "09-30", "12-31"], ["09-30", "12-31", "03-31"],
            ["08-31", "11-30", "02-28", "02-29"], ["02-28", "02-29", "05-31", "08-31"], [], [], []])

    def test_exclusive_flags(self):
        code = ("from finengine.query import FinancialQueryService as Q\nimport sys\nq=Q(sys.argv[1])\n"
                "try:\n q.period_history('SA','2222','instant',('cash',),5,annual_only=True,quarter_ends_only=True)\n"
                " print('no error')\nexcept ValueError as e: print('ValueError')\n")
        r = subprocess.run([sys.executable, "-c", code, str(self.db)], cwd=self.prop, env=env(self.prop),
                           capture_output=True, text=True)
        self.assertEqual(r.stdout.strip(), "ValueError", r.stderr[-500:])

    def test_original_engine_untouched(self):
        after = (sha(ENGINE / "data/financial.sqlite3"),
                 subprocess.run(["git", "-C", str(ENGINE), "status", "--porcelain"], capture_output=True,
                                text=True).stdout)
        self.assertEqual(after, self.before)
        self.assertEqual(after[0], DB_SHA)


if __name__ == "__main__":
    unittest.main(verbosity=2)
