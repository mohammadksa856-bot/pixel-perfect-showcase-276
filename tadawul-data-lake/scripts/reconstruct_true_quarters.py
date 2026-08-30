# -*- coding: utf-8 -*-
"""
Supersedes apply_real_semiannual_results.py's "H1/9M/FY" cumulative
labels with REAL discrete quarters, computed by subtracting consecutive
cumulative filings - not fabricated, not guessed, exact arithmetic on
numbers the company itself filed:

    Q1          = filed directly (already a single quarter)
    Q2 = H1  - Q1
    Q3 = 9M  - H1
    Q4 = FY  - 9M      (falls back to H2 = FY - H1 when no 9M was filed)

This only applies to revenue and net income - both FLOW measures
(cumulative over the period), which is why they subtract cleanly.
Equity is a STOCK measure (balance as of a date), so a quarter's equity
is simply whatever the cumulative filing ending on that same date
reported - Q2's equity is H1's reported equity, not a subtraction.

Where a company never filed the building block needed for a full split
(most commonly: no Q1 and no 9M, i.e. genuine semi-annual-only filers
like ticker 9552), the period is kept honest instead of fabricated -
labeled "H1 2026" / "FY 2025" rather than invented as a "quarter".

Input: data-lake/raw/announce_results_depth10.json - per ticker, every
distinct (year, period-type) filing found among that company's last ~10
"النتائج المالية" announcements (browser-side extraction, run via
javascript_tool against saudiexchange.sa - see
apply_real_semiannual_results.py's module docstring for the mechanism).
Each entry already carries its own per-announcement unit-scale
correction.

Run:
    python reconstruct_true_quarters.py --dry-run
    python reconstruct_true_quarters.py
"""
import argparse
import io
import json
import os
import statistics
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
RAW_PATH = ROOT / "data-lake" / "raw" / "announce_results_depth10.json"
FALLBACK_ENV_PATH = r"C:\Users\Mohammed856\OneDrive\Documents\GitHub\marefa-telegram-bot\.env"
REQUEST_TIMEOUT = 30
PERIOD_END_MONTH = {"Q1": 3, "H1": 6, "9M": 9, "FY": 12}


def load_credentials():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if url and key:
        return url, key
    env = {}
    with io.open(FALLBACK_ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"')
    return env["SUPABASE_URL"], env["SUPABASE_KEY"]


def sb_headers(key):
    return {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def with_retries(fn, attempts=8, base_delay=1.5):
    last_exc = None
    for i in range(attempts):
        try:
            return fn()
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as exc:
            last_exc = exc
            time.sleep(min(base_delay * (2 ** i), 20))
    raise last_exc


def fmt_big(n, currency="SAR"):
    sign = "-" if n < 0 else ""
    n = abs(n)
    if n >= 1e9:
        return f"{sign}{n/1e9:.1f}B {currency}"
    if n >= 1e6:
        return f"{sign}{n/1e6:.1f}M {currency}"
    if n >= 1e3:
        return f"{sign}{n/1e3:.1f}K {currency}"
    return f"{sign}{n:.2f} {currency}"


def sub(a, b):
    if a is None or b is None:
        return None
    return a - b


def sub_revenue(a, b):
    """Revenue is a subtraction of two cumulative filings, which only
    makes sense if both share the same accounting scope. A negative
    result (a "quarter" that undid more revenue than the whole company
    made) is the signature of a scope break between filings - a
    restatement, a business combination, a segment disposal - not a
    real negative-revenue quarter (which is virtually never genuine for
    an operating company). Drop it rather than publish a number that
    contradicts the filed data it came from."""
    v = sub(a, b)
    return v if v is not None and v >= 0 else None


def build_periods(entries):
    """entries: list of {year, type, revenue, netIncome, equity, anId}.
    Returns a list of {label, end_year, end_month, revenue, netIncome,
    equity} - real quarters where derivable, honest cumulative labels
    otherwise."""
    by_year = {}
    for e in entries:
        y = e["year"]
        by_year.setdefault(y, {})
        # Keep the first (most recent announcement) seen per (year, type) -
        # entries arrive already sorted newest-first.
        by_year[y].setdefault(e["type"], e)

    periods = []
    for year, types in by_year.items():
        q1, h1, m9, fy = types.get("Q1"), types.get("H1"), types.get("9M"), types.get("FY")

        if q1:
            periods.append({
                "label": f"Q1 {year}", "end_year": year, "end_month": 3,
                "revenue": q1["revenue"], "netIncome": q1["netIncome"], "equity": q1["equity"],
            })

        if h1:
            if q1:
                periods.append({
                    "label": f"Q2 {year}", "end_year": year, "end_month": 6,
                    "revenue": sub_revenue(h1["revenue"], q1["revenue"]),
                    "netIncome": sub(h1["netIncome"], q1["netIncome"]),
                    "equity": h1["equity"],
                })
            else:
                periods.append({
                    "label": f"H1 {year}", "end_year": year, "end_month": 6,
                    "revenue": h1["revenue"], "netIncome": h1["netIncome"], "equity": h1["equity"],
                })

        if m9 and h1:
            periods.append({
                "label": f"Q3 {year}", "end_year": year, "end_month": 9,
                "revenue": sub_revenue(m9["revenue"], h1["revenue"]),
                "netIncome": sub(m9["netIncome"], h1["netIncome"]),
                "equity": m9["equity"],
            })
        elif m9:
            periods.append({
                "label": f"9M {year}", "end_year": year, "end_month": 9,
                "revenue": m9["revenue"], "netIncome": m9["netIncome"], "equity": m9["equity"],
            })

        if fy:
            if m9:
                periods.append({
                    "label": f"Q4 {year}", "end_year": year, "end_month": 12,
                    "revenue": sub_revenue(fy["revenue"], m9["revenue"]),
                    "netIncome": sub(fy["netIncome"], m9["netIncome"]),
                    "equity": fy["equity"],
                })
            elif h1:
                periods.append({
                    "label": f"H2 {year}", "end_year": year, "end_month": 12,
                    "revenue": sub_revenue(fy["revenue"], h1["revenue"]),
                    "netIncome": sub(fy["netIncome"], h1["netIncome"]),
                    "equity": fy["equity"],
                })
            else:
                periods.append({
                    "label": f"FY {year}", "end_year": year, "end_month": 12,
                    "revenue": fy["revenue"], "netIncome": fy["netIncome"], "equity": fy["equity"],
                })

    periods.sort(key=lambda p: (p["end_year"], p["end_month"]), reverse=True)
    return periods


def drop_outliers(periods, field):
    values = [p[field] for p in periods if p.get(field) is not None]
    if len(values) < 2:
        return
    med = statistics.median(abs(v) for v in values)
    if med == 0:
        return
    for p in periods:
        v = p.get(field)
        if v is not None and abs(v) > med * 50:
            p[field] = None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    url, key = load_credentials()
    raw = json.loads(RAW_PATH.read_text(encoding="utf-8"))

    ok, skipped = 0, 0
    for ticker, entries in raw.items():
        if not entries:
            skipped += 1
            continue
        periods = build_periods(entries)
        for field in ("revenue", "netIncome", "equity"):
            drop_outliers(periods, field)
        periods = periods[:4]
        rows = []
        for p in periods:
            if p.get("revenue") is None and p.get("netIncome") is None:
                continue
            rows.append({
                "quarter": p["label"],
                "revenue": fmt_big(p["revenue"]) if p.get("revenue") is not None else "",
                "profit": fmt_big(p["netIncome"]) if p.get("netIncome") is not None else "",
                "reading": None,
                "vsEstimate": {"ar": "", "en": ""},
            })
        if not rows:
            skipped += 1
            continue
        if args.dry_run:
            print(f"[dry-run] {ticker}: {[r['quarter'] for r in rows]}")
            ok += 1
            continue
        patch = with_retries(lambda: requests.patch(
            f"{url}/rest/v1/companies?ticker=eq.{ticker}",
            headers={**sb_headers(key), "Prefer": "return=minimal"},
            data=json.dumps({"quarterly_results": rows}).encode("utf-8"),
            timeout=REQUEST_TIMEOUT,
        ))
        print(f"{ticker}: set {[r['quarter'] for r in rows]} -> {patch.status_code}")
        ok += 1

    print(f"\nDone. {ok} updated, {skipped} skipped (no usable data).")


if __name__ == "__main__":
    main()
