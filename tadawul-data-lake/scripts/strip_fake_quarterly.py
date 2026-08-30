# -*- coding: utf-8 -*-
"""
Strips fabricated "quarterly_results" entries for companies that don't
actually file discrete quarterly (3-month) interim statements at all -
only semi-annual (6-month) and annual reports.

Root cause: this session's Tadawul-sourced pipeline correctly recorded
`quarterly: null` in data-lake/raw/all_raw_extracts.json for these
companies (there is no quarterly toggle/table for them on
saudiexchange.sa - confirmed by direct inspection of a sample). But the
production `quarterly_results` field in Supabase for most of them still
holds leftover data from the pre-Tadawul (WiseSheets-era) pipeline,
labeled "Q1 2026" / "Q2 2026" / "Q3 2025" / "Q4 2025" - fake quarterly
labels. Cross-checking 3 of these against Argaam confirmed the actual
*values* are real, but are H1/H2 SEMI-ANNUAL cumulative figures from
entirely different periods, silently relabeled as if they were single
quarters (e.g. ticker 9586's "Q1 2026" of -49.8M SAR is really its true
H1-2025 six-month cumulative loss).

We don't have real H1/H2 interim figures for these companies in the
Tadawul-sourced raw data to substitute honest replacement labels - only
the annual (12-month) columns were ever available for them. Rather than
keep showing numbers attributed to the wrong period (or fabricate H1/H2
splits we can't verify), this clears the field outright. The Telegram
bot's format.ts already skips the "quarterly results" section entirely
when the array is empty (`if (quarterly.length > 0)`) - so cleared
companies simply stop showing a quarterly section instead of showing a
blank or broken one; their correct annual trend (financials[]) and
balance sheet are untouched and still display normally.

Run:
    python strip_fake_quarterly.py --dry-run
    python strip_fake_quarterly.py
"""
import argparse
import io
import json
import os
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
RAW_EXTRACTS_PATH = ROOT / "data-lake" / "raw" / "all_raw_extracts.json"
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    url, key = load_credentials()
    raw = json.loads(RAW_EXTRACTS_PATH.read_text(encoding="utf-8"))
    candidate_tickers = sorted(t for t, v in raw.items() if v.get("quarterly") is None)

    print(f"{len(candidate_tickers)} tickers have no real quarterly data per Tadawul.")

    cleared, already_empty, not_found = 0, 0, 0
    for i in range(0, len(candidate_tickers), 50):
        chunk = candidate_tickers[i:i + 50]
        get = with_retries(lambda: requests.get(
            f"{url}/rest/v1/companies", headers=sb_headers(key),
            params={"select": "ticker,quarterly_results", "ticker": f"in.({','.join(chunk)})"},
            timeout=REQUEST_TIMEOUT,
        ))
        rows = {r["ticker"]: r for r in get.json()}
        for ticker in chunk:
            row = rows.get(ticker)
            if row is None:
                not_found += 1
                continue
            if not row.get("quarterly_results"):
                already_empty += 1
                continue
            if args.dry_run:
                print(f"[dry-run] {ticker}: would clear {len(row['quarterly_results'])} fake quarterly entries")
                cleared += 1
                continue
            patch = with_retries(lambda: requests.patch(
                f"{url}/rest/v1/companies?ticker=eq.{ticker}",
                headers={**sb_headers(key), "Prefer": "return=minimal"},
                data=json.dumps({"quarterly_results": []}).encode("utf-8"),
                timeout=REQUEST_TIMEOUT,
            ))
            print(f"{ticker}: cleared -> {patch.status_code}")
            cleared += 1

    print(f"\nDone. {cleared} cleared, {already_empty} already empty, {not_found} not found in Supabase.")


if __name__ == "__main__":
    main()
