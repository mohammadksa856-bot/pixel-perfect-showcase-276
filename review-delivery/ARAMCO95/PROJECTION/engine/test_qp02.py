"""QP-02 reproduction and fix: quarter_position must accept only real fiscal quarter-end dates.

Runs every case twice on isolated exports of engine b70254e:
  * "before": the quarter-position.patch of delivery 2dad933 (read from git history), which matched MM-DD strings;
  * "after":  the corrected quarter-position.patch in this directory, which checks each date on the calendar.
The "before" run must reproduce QP-02 (2023-02-29 and 2024-02-28 accepted); the "after" run must not.

Synthetic issuers and values only (markers 6xxx), inserted into a disposable copy of the committed DB. Rows are
written with SQL on purpose: impossible dates such as 2023-02-29 must be rejected by the query layer itself,
whatever wrote them. The original engine is hashed before and after.
Usage (repo root): python3 review-delivery/ARAMCO95/PROJECTION/engine/test_qp02.py
"""
import hashlib
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import tarfile
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
ENGINE = Path(os.environ.get("ENGINE", "/home/user/mohammadksa856-bot/-market-agnostic-financial-data-engine-1"))
COMMIT = "b70254e"
DB_SHA = "2a749d7c8a051f2716128afac208a4a7e45679f2534fe81d29587f5490005867"
BEFORE_DELIVERY = "2dad93344f448b06c0bb7564e29f026de8e8ece1"
PATCH_PATH = "review-delivery/ARAMCO95/PROJECTION/engine/quarter-position.patch"
REQUESTED = ("cash", "cash_and_cash_equivalents", "current_assets", "total_assets", "current_liabilities",
             "total_liabilities", "total_debt", "net_debt", "parent_equity", "equity_parent", "total_equity",
             "shares_outstanding")

# symbol -> (fiscal_year_end, [(period_end, metric, period_kind)])
ISSUERS = {
    # November year end: February is a fiscal quarter-end month (Q1 ends in February).
    "9901": ("11-30", [("2023-02-28", "cash", "instant"), ("2023-02-29", "cash", "instant"),
                       ("2024-02-28", "cash", "instant"), ("2024-02-29", "cash", "instant"),
                       ("2024-05-31", "cash", "instant"), ("2024-05-30", "cash", "instant"),
                       ("2024-06-30", "cash", "instant"), ("2024-08-31", "cash", "instant"),
                       ("2024-11-30", "cash", "instant")]),
    # February year end (stated as 02-28): quarter ends in May, August, November; both February ends are year ends.
    "9902": ("02-28", [("2024-02-29", "cash", "instant"), ("2025-02-28", "cash", "instant"),
                       ("2024-05-31", "cash", "instant"), ("2024-08-31", "cash", "instant"),
                       ("2024-11-30", "cash", "instant"), ("2024-11-31", "cash", "instant")]),
    # February year end stated as 02-29: the same fiscal calendar.
    "9903": ("02-29", [("2025-02-28", "cash", "instant"), ("2024-05-31", "cash", "instant"),
                       ("2024-08-31", "cash", "instant"), ("2024-11-30", "cash", "instant")]),
    # March year end.
    "9904": ("03-31", [("2025-03-31", "cash", "instant"), ("2025-06-30", "cash", "instant"),
                       ("2025-09-30", "cash", "instant"), ("2025-12-31", "cash", "instant"),
                       ("2026-03-31", "cash", "instant")]),
    # June year end, plus impossible and malformed strings.
    "9905": ("06-30", [("2025-09-30", "cash", "instant"), ("2025-12-31", "cash", "instant"),
                       ("2026-03-31", "cash", "instant"), ("2026-06-30", "cash", "instant"),
                       ("2025-13-31", "cash", "instant"), ("2025-09-31", "cash", "instant"),
                       ("2025-9-30", "cash", "instant"), ("2025-12-31T00:00", "cash", "instant"),
                       ("2026-02-29", "cash", "instant")]),
    # December year end: twelve valid quarter ends 2022Q1..2025Q3, newer impossible dates that a string match
    # accepts (02-29 is not a December-year quarter end, so use dates that pass the old MM-DD filter), a newer valid
    # date that carries only a metric that is not requested, quarterly flows and year-end balances.
    "9906": ("12-31", [(f"{y}-{md}", "cash", "instant") for y in (2022, 2023, 2024) for md in ("03-31", "06-30", "09-30")]
             + [("2025-03-31", "cash", "instant"), ("2025-06-30", "cash", "instant"), ("2025-09-30", "cash", "instant")]
             + [(f"{y}-12-31", "cash", "instant") for y in (2022, 2023, 2024, 2025)]
             + [("2025-09-30", "revenue", "quarter"), ("2025-06-30", "revenue", "quarter")]
             + [("2026-03-31", "inventory", "instant")]),
    # November year end with impossible February 29ths newer than every valid date: they must not take slots.
    "9907": ("11-30", [(f"{y}-{md}", "cash", "instant") for y in (2021, 2022, 2023, 2024)
                       for md in ({2021: "02-28", 2022: "02-28", 2023: "02-28", 2024: "02-29"}[y], "05-31", "08-31")]
             + [(f"{y}-02-29", "cash", "instant") for y in (2025, 2026, 2027)]),
    # Invalid fiscal year end: nothing can be placed.
    "9908": ("06-31", [("2025-09-30", "cash", "instant")]),
}


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


def seed(db: Path) -> None:
    """Clone sa:2222's company row and one of its cash rows into synthetic issuers, one row per case."""
    con = sqlite3.connect(db)
    con.row_factory = sqlite3.Row
    company = dict(con.execute("SELECT * FROM companies WHERE company_id='sa:2222'").fetchone())
    template = dict(con.execute("SELECT * FROM data_points WHERE company_id='sa:2222' AND metric_key='cash' "
                                "AND period_kind='instant' AND is_current=1 LIMIT 1").fetchone())
    flow = dict(con.execute("SELECT * FROM data_points WHERE company_id='sa:2222' AND metric_key='revenue' "
                            "AND period_kind='quarter' AND is_current=1 LIMIT 1").fetchone())
    n = 0
    for symbol, (fye, rows) in ISSUERS.items():
        cid = f"sa:{symbol}"
        con.execute(f"INSERT INTO companies({','.join(company)}) VALUES({','.join('?' for _ in company)})",
                    [{**company, "company_id": cid, "symbol": symbol, "name": f"Synthetic {symbol}", "isin": None,
                      "fiscal_year_end": fye}[k] for k in company])
        for end, metric, kind in rows:
            n += 1
            base = flow if kind == "quarter" else template
            r = {**base, "id": None, "company_id": cid, "metric_key": metric, "period_end": end, "period_kind": kind,
                 "fiscal_year": int(end[:4]), "fiscal_quarter": 0, "value_decimal": str(6000000 + n)}
            if kind == "quarter":
                r["period_start"] = end[:8] + "01"
            con.execute(f"INSERT INTO data_points({','.join(r)}) VALUES({','.join('?' for _ in r)})", list(r.values()))
    con.commit()
    con.close()


PROBE = """
import json, sys
from finengine.query import FinancialQueryService as Q
q = Q(sys.argv[1])
requested = tuple(json.loads(sys.argv[2]))
out = {}
for symbol in json.loads(sys.argv[3]):
    h = q.period_history("SA", symbol, "instant", requested, 12, quarter_ends_only=True)
    page = q.company_page("SA", symbol)["sections"]["financials"]["history"]
    out[symbol] = {
        "status": h["status"], "ends": [p["period_end"] for p in h["periods"]],
        "kinds": sorted({r["period_kind"] for p in h["periods"] for rs in p["metrics"].values() for r in rs}),
        "page_quarter_position": [p["period_end"] for p in page["quarter_position"]["periods"]],
        "page_annual_position": [p["period_end"] for p in page["annual_position"]["periods"]],
        "page_quarter_flows": [p["period_end"] for p in page["quarter"]["periods"]],
        "metrics": sorted({m for p in h["periods"] for m in p["metrics"]}),
    }
q.close()
print(json.dumps(out))
"""


def run(root: Path, db: Path) -> dict:
    r = subprocess.run([sys.executable, "-c", PROBE, str(db), json.dumps(REQUESTED), json.dumps(list(ISSUERS))],
                       cwd=root, env=env(root), capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(r.stderr[-3000:])
    return json.loads(r.stdout)


class QP02(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.state_before = (sha(ENGINE / "data/financial.sqlite3"),
                            subprocess.run(["git", "-C", str(ENGINE), "status", "--porcelain"],
                                           capture_output=True, text=True).stdout)
        cls.tmp = Path(tempfile.mkdtemp(prefix="qp02-"))
        old = cls.tmp / "before.patch"
        old.write_bytes(subprocess.run(["git", "-C", str(REPO), "show", f"{BEFORE_DELIVERY}:{PATCH_PATH}"],
                                       capture_output=True, check=True).stdout)
        cls.results = {}
        for name, patch in (("before", old), ("after", HERE / "quarter-position.patch")):
            root = export(cls.tmp / name)
            subprocess.run(["git", "apply", str(patch)], cwd=root, check=True)
            db = cls.tmp / f"{name}.sqlite3"
            shutil.copy2(root / "data/financial.sqlite3", db)
            assert sha(db) == DB_SHA
            subprocess.run([sys.executable, "-c", "import sys\nfrom finengine.database import Database\n"
                            "Database(sys.argv[1]).close()", str(db)], cwd=root, env=env(root), check=True)
            seed(db)
            cls.results[name] = run(root, db)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def ends(self, which, symbol):
        return self.results[which][symbol]["ends"]

    # ── reproduction: the delivered patch accepted the two dates Codex reported
    def test_before_reproduces_qp02(self):
        got = self.ends("before", "9901")
        self.assertIn("2023-02-29", got)   # impossible date accepted
        self.assertIn("2024-02-28", got)   # not the end of February in a leap year, accepted

    def test_before_loses_valid_periods_to_limit(self):
        valid = set(self.ends("after", "9907"))
        self.assertIn("2027-02-29", self.ends("before", "9907"))
        self.assertLess(len(valid & set(self.ends("before", "9907"))), 12)   # impossible dates took slots
        self.assertIn("2026-03-31", self.ends("before", "9906"))              # a period with no requested metric
        self.assertNotIn("2022-03-31", self.ends("before", "9906"))           # pushed a valid one out

    # ── fix
    def test_february_leap_and_non_leap(self):
        self.assertEqual(self.ends("after", "9901"), ["2024-08-31", "2024-05-31", "2024-02-29", "2023-02-28"])

    def test_february_year_end_stated_either_way(self):
        self.assertEqual(self.ends("after", "9902"), ["2024-11-30", "2024-08-31", "2024-05-31"])
        self.assertEqual(self.ends("after", "9903"), ["2024-11-30", "2024-08-31", "2024-05-31"])

    def test_non_december_year_ends(self):
        self.assertEqual(self.ends("after", "9904"), ["2025-12-31", "2025-09-30", "2025-06-30"])
        self.assertEqual(self.ends("after", "9905"), ["2026-03-31", "2025-12-31", "2025-09-30"])

    def test_impossible_and_malformed_dates_rejected(self):
        bad = {"9901": {"2023-02-29", "2024-02-28", "2024-05-30", "2024-06-30"},  # 06-30: not a November-year quarter end
               "9902": {"2024-11-31"},
               "9905": {"2025-13-31", "2025-09-31", "2025-9-30", "2025-12-31T00:00", "2026-02-29"},
               "9907": {"2025-02-29", "2026-02-29", "2027-02-29"}}
        for symbol, dates in bad.items():
            self.assertFalse(dates & set(self.ends("after", symbol)), symbol)

    def test_only_fiscal_quarter_ends_never_the_year_end(self):
        self.assertNotIn("2024-11-30", self.ends("after", "9901"))
        self.assertFalse({"2024-02-29", "2025-02-28"} & set(self.ends("after", "9902")))
        self.assertFalse({"2025-03-31", "2026-03-31"} & set(self.ends("after", "9904")))
        self.assertNotIn("2026-06-30", self.ends("after", "9905"))
        self.assertFalse(any(e.endswith("-12-31") for e in self.ends("after", "9906")))

    def test_invalid_fiscal_year_end_gives_nothing(self):
        self.assertEqual(self.results["after"]["9908"]["status"], "unavailable")
        self.assertEqual(self.ends("after", "9908"), [])

    def test_no_valid_period_lost_to_limit_or_order(self):
        # 9906: twelve valid quarter ends, plus a newer valid date with only a non-requested metric.
        want = [f"{y}-{md}" for y in (2025, 2024, 2023, 2022) for md in ("09-30", "06-30", "03-31")]
        self.assertEqual(self.ends("after", "9906"), want)
        # 9907: twelve valid quarter ends, three newer impossible February 29ths.
        want = [f"{y}-{md}" for y in (2024, 2023, 2022, 2021)
                for md in ("08-31", "05-31", {2021: "02-28", 2022: "02-28", 2023: "02-28", 2024: "02-29"}[y])]
        self.assertEqual(self.ends("after", "9907"), want)

    def test_no_q4_duplicate_and_no_mixing_with_flows(self):
        r = self.results["after"]["9906"]
        self.assertEqual(r["kinds"], ["instant"])
        self.assertEqual(r["metrics"], ["cash"])
        self.assertEqual(sorted(set(r["page_quarter_position"]) & set(r["page_annual_position"])), [])
        self.assertTrue(all(e.endswith("-12-31") for e in r["page_annual_position"]))
        self.assertEqual(r["page_quarter_flows"], ["2025-09-30", "2025-06-30"])
        for symbol, x in self.results["after"].items():
            self.assertFalse(set(x["page_quarter_position"]) & set(x["page_annual_position"]), symbol)
            self.assertIn(x["kinds"], ([], ["instant"]), symbol)

    def test_company_page_uses_the_same_rule(self):
        for symbol, x in self.results["after"].items():
            self.assertEqual(x["page_quarter_position"], x["ends"], symbol)

    def test_original_engine_untouched(self):
        after = (sha(ENGINE / "data/financial.sqlite3"),
                 subprocess.run(["git", "-C", str(ENGINE), "status", "--porcelain"], capture_output=True, text=True).stdout)
        self.assertEqual(after, self.state_before)
        self.assertEqual(after[0], DB_SHA)


if __name__ == "__main__":
    unittest.main(verbosity=2)
