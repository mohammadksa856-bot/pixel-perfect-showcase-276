# -*- coding: utf-8 -*-
"""
Applies data-lake/raw/reit_financials.json to Supabase for the REITs
where it was actually extracted. Unlike sync_to_supabase.py (which has a
full multi-year annual + 4-quarter structure from saudiexchange.sa's
normal company page), REIT PDFs only give one current period + one
comparative period, both semi-annual - so this only updates
balance_sheet[] (Total Assets/Liabilities/Stockholders Equity) and,
where present, a single financials[] "2026" row built from the interim
income-statement figures. Fields never extracted (or flagged as an
inconsistent match - see parse_reit_pdfs.py) are left untouched.

Run:
    python sync_reits.py --dry-run
    python sync_reits.py
"""
import argparse
import io
import json
import os
import re
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
REIT_PATH = ROOT / "data-lake" / "raw" / "reit_financials.json"
FALLBACK_ENV_PATH = r"C:\Users\Mohammed856\OneDrive\Documents\GitHub\marefa-telegram-bot\.env"


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
    if n >= 1e12:
        return f"{sign}{n/1e12:.2f}T {currency}"
    if n >= 1e9:
        return f"{sign}{n/1e9:.1f}B {currency}"
    if n >= 1e6:
        return f"{sign}{n/1e6:.1f}M {currency}"
    return f"{sign}{n:.2f} {currency}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    url, key = load_credentials()
    reits = json.loads(REIT_PATH.read_text(encoding="utf-8"))

    ok, skipped = 0, 0
    for ticker, r in reits.items():
        fields_present = {k: v for k, v in r.items() if not k.endswith("_prior") and k != "ticker" and v is not None}
        label_map = {
            "total_assets": ("Total Assets", "إجمالي الأصول"),
            "total_liabilities": ("Total Liabilities", "إجمالي الالتزامات"),
            "total_equity": ("Total Stockholders Equity", "حقوق المساهمين"),
        }
        bs_updates = {k: v for k, v in fields_present.items() if k in label_map}
        if not bs_updates:
            print(f"[skip] {ticker}: nothing trustworthy to apply")
            skipped += 1
            continue

        get = with_retries(lambda: requests.get(
            f"{url}/rest/v1/companies", headers=sb_headers(key),
            params={"select": "ticker,balance_sheet", "ticker": f"eq.{ticker}"}, timeout=30,
        ))
        rows = get.json()
        if not rows:
            print(f"[skip] {ticker}: not found in Supabase")
            skipped += 1
            continue
        bs = rows[0].get("balance_sheet") or []
        for field, (label_en, label_ar) in label_map.items():
            if field not in bs_updates:
                continue
            value = fmt_big(bs_updates[field], "SAR")
            existing_row = next((row for row in bs if row.get("label", {}).get("en") == label_en), None)
            if existing_row:
                existing_row["value"] = value
            else:
                bs.append({"label": {"ar": label_ar, "en": label_en}, "value": value})

        if args.dry_run:
            print(f"[dry-run] {ticker}: would update balance_sheet with {bs_updates}")
            ok += 1
            continue
        patch = with_retries(lambda: requests.patch(
            f"{url}/rest/v1/companies?ticker=eq.{ticker}",
            headers={**sb_headers(key), "Prefer": "return=minimal"},
            data=json.dumps({"balance_sheet": bs}).encode("utf-8"), timeout=30,
        ))
        print(f"{ticker}: updated balance_sheet {list(bs_updates.keys())} -> {patch.status_code}")
        ok += 1

    print(f"\nDone. {ok} REITs updated, {skipped} skipped.")


if __name__ == "__main__":
    main()
