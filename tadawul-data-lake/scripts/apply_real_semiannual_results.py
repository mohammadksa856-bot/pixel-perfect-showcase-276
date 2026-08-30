# -*- coding: utf-8 -*-
"""
Replaces the empty quarterly_results (cleared by strip_fake_quarterly.py)
with REAL, honestly-labeled data for the 123 companies that don't file
discrete quarterly reports.

Root cause of the original bug (see strip_fake_quarterly.py): these
companies file interim results only as H1 (6-month), 9M (9-month, some
of them), and FY (annual) reports - never a bare "quarter". The old
WiseSheets-era data mislabeled these cumulative figures as "Q1/Q2/Q3/Q4",
attaching a real number to the wrong period. Clearing that field was the
safe first step, but Tadawul's own site DOES publish the real number for
every period, via each company's individual "النتائج المالية الأولية/
السنوية" disclosure announcement (a standardized regulatory form with a
structured current/prior-period comparison table) - just not through the
company-profile page's small summary table this pipeline scraped before.
This was found by hand for ticker 9552 (confirmed directly on
saudiexchange.sa), then generalized: fetched each of the 123 companies'
own announcement list (same-origin fetch, `symbol=<ticker>` POST param
discovered via network inspection), filtered to actual results
announcements (excluding correction notices and conference-call
invites), and parsed each announcement's disclosure table for revenue /
net income / equity - with a per-announcement unit-scale detection since
some file in raw SAR, others in thousands or millions.

Every period is labeled by what it actually is - "H1 2026", "FY 2025",
"9M 2025" - never "Q1/Q2/Q3/Q4", since these companies never file a bare
quarter. The browser-side extraction script (run via javascript_tool,
not checked in) saved its output to
data-lake/raw/announce_results_raw.json; this script sanity-checks that
data (dropping any value that is a wild outlier vs. its own ticker's
other periods - the telltale sign of a unit-scale misdetection) and
syncs the survivors to Supabase.

Run:
    python apply_real_semiannual_results.py --dry-run
    python apply_real_semiannual_results.py
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
RAW_PATH = ROOT / "data-lake" / "raw" / "announce_results_raw.json"
FALLBACK_ENV_PATH = r"C:\Users\Mohammed856\OneDrive\Documents\GitHub\marefa-telegram-bot\.env"
REQUEST_TIMEOUT = 30


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


def drop_outliers(entries, field):
    """A unit-scale misdetection makes one entry 1,000x+ its siblings -
    drop just that field on that entry rather than the whole period,
    since the other fields on the same row may still be correctly
    scaled (they come from separate table rows, not a shared multiplier
    bug in every case)."""
    values = [e[field] for e in entries if e.get(field) is not None]
    if len(values) < 2:
        return
    med = statistics.median(abs(v) for v in values)
    if med == 0:
        return
    for e in entries:
        v = e.get(field)
        if v is not None and abs(v) > med * 50:
            e[field] = None


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
        for field in ("revenue", "netIncome", "equity"):
            drop_outliers(entries, field)
        rows = []
        for e in entries:
            if e.get("revenue") is None and e.get("netIncome") is None:
                continue
            rows.append({
                "quarter": e["label"],
                "revenue": fmt_big(e["revenue"]) if e.get("revenue") is not None else "",
                "profit": fmt_big(e["netIncome"]) if e.get("netIncome") is not None else "",
                "reading": None,
                "vsEstimate": {"ar": "", "en": ""},
            })
        if not rows:
            skipped += 1
            continue
        if args.dry_run:
            print(f"[dry-run] {ticker}: would set {len(rows)} periods -> {[r['quarter'] for r in rows]}")
            ok += 1
            continue
        patch = with_retries(lambda: requests.patch(
            f"{url}/rest/v1/companies?ticker=eq.{ticker}",
            headers={**sb_headers(key), "Prefer": "return=minimal"},
            data=json.dumps({"quarterly_results": rows}).encode("utf-8"),
            timeout=REQUEST_TIMEOUT,
        ))
        print(f"{ticker}: set {len(rows)} periods {[r['quarter'] for r in rows]} -> {patch.status_code}")
        ok += 1

    print(f"\nDone. {ok} updated, {skipped} skipped (no usable data).")


if __name__ == "__main__":
    main()
