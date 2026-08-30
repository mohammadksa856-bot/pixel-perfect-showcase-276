# -*- coding: utf-8 -*-
"""
Syncs Tadawul-sourced financials into the pixel-perfect-showcase-276
Supabase `companies` table, replacing the WiseSheets-derived numbers
this session found repeatedly wrong.

SCOPE - what this touches vs. leaves alone:
  UPDATES (real Tadawul data exists for these):
    - financials[]: revenue, netIncome, margin, cashFlow (operating CF)
      for years 2023/2024/2025 only - merged into the existing 5-year
      array by year, so 2021/2022 rows (already reviewed this session,
      no Tadawul quarterly/annual coverage that far back on the public
      page) are left untouched.
    - balance_sheet[]: Total Assets, Total Liabilities, Total
      Stockholders Equity rows.
    - quarterly_results[]: fully replaced with real, correctly-labeled
      quarters from Tadawul (this is the fix for the quarter-label-shift
      bug found 2026-08-30).
    - valuation[]: P/E and P/B rows only (computed from live market cap
      / last-annual net income or equity - same convention already used
      by the refresh-prices edge function, confirmed to already match:
      2340's stored P/E 43.9x equals this script's 43.89x independently).

  DELIBERATELY NOT TOUCHED (no honest Tadawul-sourced replacement):
    - financials[].roic - ROIC needs invested-capital detail the
      saudiexchange.sa summary page doesn't expose. Left as whatever was
      already there rather than fabricated.
    - valuation[] EV/EBITDA - needs EBITDA (revenue x margin, from
      financial_ratios) which is a separate live-recompute already
      deployed in refresh-prices; not re-derived here.
    - balance_sheet[] Cash, Total Debt - not extracted from the Tadawul
      summary page in this pass.
    - Every other column (segments, competitors, dividends, forward
      estimates, ownership, news, FAQs, etc.) - these are curated/
      narrative content beyond what a company's raw financial statements
      contain; Tadawul's public page has no equivalent to replace them
      with, WiseSheets-sourced or otherwise.

Usage:
    python sync_to_supabase.py --dry-run          # preview only
    python sync_to_supabase.py --dry-run --tickers 2340,7010,1211
    python sync_to_supabase.py                    # apply for real
"""
import argparse
import io
import json
import os
import re
import sys
import time
from pathlib import Path

import duckdb
import requests

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data-lake" / "database" / "tadawul.duckdb"
RATIOS_PATH = ROOT / "data-lake" / "raw" / "computed_ratios.json"
FALLBACK_ENV_PATH = r"C:\Users\Mohammed856\OneDrive\Documents\GitHub\marefa-telegram-bot\.env"


def load_credentials():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if url and key:
        return url, key
    if os.path.exists(FALLBACK_ENV_PATH):
        env = {}
        with io.open(FALLBACK_ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"')
        if "SUPABASE_URL" in env and "SUPABASE_KEY" in env:
            return env["SUPABASE_URL"], env["SUPABASE_KEY"]
    raise SystemExit("Missing SUPABASE_URL / SUPABASE_KEY.")


def sb_headers(key):
    return {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def with_retries(fn, attempts=8, base_delay=1.5):
    """Retries on both connection errors AND timeouts. The earlier
    version of this pattern (data-fixes/apply_overrides.py in the main
    repo) only caught ConnectionError - a request that hangs instead of
    erroring (no response, no exception) would block forever with no
    retry ever triggered. Every requests call below now passes an
    explicit timeout so a hang becomes a caught, retryable exception
    instead of an indefinite freeze - this is what actually happened
    partway through the first full-market sync run (stuck ~19 minutes
    on one ticker with zero progress) before this fix."""
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


def fmt_pct(x):
    return f"{x*100:.1f}%"


def fmt_x(n):
    return f"{n:.1f}x"


def quarter_reading(cur_rev, prev_rev):
    if cur_rev is None or prev_rev is None or prev_rev == 0:
        return None, {"ar": "", "en": ""}
    pct = (cur_rev - prev_rev) / prev_rev
    reading = "good" if pct > 0.02 else "bad" if pct < -0.02 else "warning"
    vs_ar = f"تجاوز الربع السابق +{pct*100:.1f}%" if pct >= 0 else f"أقل من الربع السابق {pct*100:.1f}%"
    vs_en = f"{'+' if pct >= 0 else ''}{pct*100:.1f}% vs previous quarter"
    return reading, {"ar": vs_ar, "en": vs_en}


def build_quarterly_results(con, ticker):
    rows = con.execute("""
        select period_label, period_end, revenue, net_income
        from financials
        where symbol = ? and period_type = 'quarterly'
        order by period_end desc
    """, [ticker]).fetchall()
    if not rows:
        return None
    results = []
    for i, (label, period_end, revenue, net_income) in enumerate(rows):
        prev_revenue = rows[i + 1][2] if i + 1 < len(rows) else None
        reading, vs_estimate = quarter_reading(revenue, prev_revenue)
        results.append({
            "quarter": label,
            "revenue": fmt_big(revenue, "SAR") if revenue is not None else "",
            "profit": fmt_big(net_income, "SAR") if net_income is not None else "",
            "reading": reading,
            "vsEstimate": vs_estimate,
        })
    return results


def build_financials_patch(con, ticker, existing_financials):
    rows = con.execute("""
        select period_label, revenue, net_income, operating_cash_flow
        from financials
        where symbol = ? and period_type = 'annual' and period_label in ('2023','2024','2025')
    """, [ticker]).fetchall()
    if not rows:
        return None
    by_year = {r.get("year"): r for r in (existing_financials or [])}
    for year, revenue, net_income, ocf in rows:
        row = by_year.get(year, {"year": year})
        row["revenue"] = fmt_big(revenue, "SAR") if revenue is not None else row.get("revenue")
        row["netIncome"] = fmt_big(net_income, "SAR") if net_income is not None else row.get("netIncome")
        if revenue and net_income is not None:
            row["margin"] = fmt_pct(net_income / revenue)
        if ocf is not None:
            row["cashFlow"] = fmt_big(ocf, "SAR")
        # roic deliberately untouched - see module docstring
        by_year[year] = row
    merged = sorted(by_year.values(), key=lambda r: r.get("year", ""), reverse=True)
    return merged


def build_balance_sheet_patch(con, ticker, existing_balance_sheet):
    row = con.execute("""
        select total_assets, total_liabilities, total_equity
        from financials
        where symbol = ? and period_type = 'annual'
        order by period_end desc limit 1
    """, [ticker]).fetchone()
    if not row or all(v is None for v in row):
        return None
    assets, liabilities, equity = row
    bs = list(existing_balance_sheet or [])
    label_map = {
        "Total Assets": assets, "Total Liabilities": liabilities,
        "Total Stockholders Equity": equity,
    }
    for label_en, value in label_map.items():
        if value is None:
            continue
        existing_row = next((r for r in bs if r.get("label", {}).get("en") == label_en), None)
        if existing_row:
            existing_row["value"] = fmt_big(value, "SAR")
        else:
            ar_labels = {"Total Assets": "إجمالي الأصول", "Total Liabilities": "إجمالي الالتزامات",
                         "Total Stockholders Equity": "حقوق المساهمين"}
            bs.append({"label": {"ar": ar_labels[label_en], "en": label_en}, "value": fmt_big(value, "SAR")})
    return bs


def build_valuation_patch(existing_valuation, ratios_row):
    if not ratios_row:
        return None
    val = list(existing_valuation or [])
    updates = {}
    if ratios_row.get("pe"):
        updates["P/E"] = fmt_x(ratios_row["pe"])
    if ratios_row.get("pb"):
        updates["P/B"] = fmt_x(ratios_row["pb"])
    if not updates:
        return None
    for row in val:
        label_en = row.get("label", {}).get("en")
        if label_en in updates:
            row["companyValue"] = updates.pop(label_en)
    return val


REQUEST_TIMEOUT = 30  # seconds - see with_retries() docstring for why this matters


def get_company(url, key, ticker, fields):
    r = with_retries(lambda: requests.get(
        f"{url}/rest/v1/companies", headers=sb_headers(key),
        params={"select": fields, "ticker": f"eq.{ticker}"},
        timeout=REQUEST_TIMEOUT,
    ))
    r.raise_for_status()
    rows = r.json()
    return rows[0] if rows else None


def patch_company(url, key, ticker, payload, dry_run):
    if dry_run:
        return "DRY-RUN"
    r = with_retries(lambda: requests.patch(
        f"{url}/rest/v1/companies?ticker=eq.{ticker}",
        headers={**sb_headers(key), "Prefer": "return=minimal"},
        data=json.dumps(payload, default=str).encode("utf-8"),
        timeout=REQUEST_TIMEOUT,
    ))
    return r.status_code


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--tickers", help="comma-separated list to restrict to")
    ap.add_argument("--resume-after", help="skip tickers up to and including this one (sorted order)")
    args = ap.parse_args()

    url, key = load_credentials()
    con = duckdb.connect(str(DB_PATH))
    ratios = json.loads(RATIOS_PATH.read_text(encoding="utf-8"))

    tickers = con.execute("select symbol from companies order by symbol").fetchall()
    tickers = [t[0] for t in tickers]
    if args.tickers:
        wanted = set(args.tickers.split(","))
        tickers = [t for t in tickers if t in wanted]
    if args.resume_after:
        idx = tickers.index(args.resume_after) + 1 if args.resume_after in tickers else 0
        tickers = tickers[idx:]

    ok, skipped = 0, 0
    for ticker in tickers:
        existing = get_company(url, key, ticker, "ticker,financials,balance_sheet,valuation,quarterly_results")
        if not existing:
            print(f"[skip] {ticker}: not found in Supabase")
            skipped += 1
            continue

        payload = {}
        new_financials = build_financials_patch(con, ticker, existing.get("financials"))
        if new_financials:
            payload["financials"] = new_financials
        new_bs = build_balance_sheet_patch(con, ticker, existing.get("balance_sheet"))
        if new_bs:
            payload["balance_sheet"] = new_bs
        new_q = build_quarterly_results(con, ticker)
        if new_q:
            payload["quarterly_results"] = new_q
        new_val = build_valuation_patch(existing.get("valuation"), ratios.get(ticker))
        if new_val:
            payload["valuation"] = new_val

        if not payload:
            print(f"[skip] {ticker}: no Tadawul data to apply")
            skipped += 1
            continue

        status = patch_company(url, key, ticker, payload, args.dry_run)
        fields_touched = ", ".join(payload.keys())
        print(f"[{ok+1}] {ticker}: updated [{fields_touched}] -> {status}")
        if args.dry_run:
            print(json.dumps(payload, ensure_ascii=False, indent=1)[:1500])
        ok += 1

    con.close()
    print(f"\nDone. {ok} companies updated, {skipped} skipped.")


if __name__ == "__main__":
    main()
