# -*- coding: utf-8 -*-
"""
Re-applies every confirmed correction in overrides.py to Supabase.

Run this any time after a bulk financial-data refresh (a new Excel/
WiseSheets pull, a fresh FMP import) so a known-wrong source value can't
silently creep back in. It's idempotent - safe to run as many times as
you want, on a schedule or by hand.

Credentials: reads SUPABASE_URL and SUPABASE_KEY (a key with write
access - NOT the public/publishable key) from the environment. Falls
back to reading them from the .env file this project already uses for
its data-import scripts, if that path exists on this machine, purely
for local convenience - never hardcode a key in this file or commit one.

Usage:
    python apply_overrides.py             # apply everything
    python apply_overrides.py --dry-run   # preview without writing
"""
import io
import json
import os
import re
import sys
import time

import requests


class FlushingLog(list):
    """A plain list that also prints+flushes each line immediately. This
    connection keeps dropping mid-run (see _with_retries below) - if the
    whole script then crashes, a log collected only in memory and printed
    once at the very end is lost entirely, hiding which fixes before the
    crash actually landed (they did - the DB write already happened,
    only the log line was lost). Printing as we go means a crash still
    leaves a readable partial log in the redirected output file."""
    def append(self, item):
        super().append(item)
        print(item, flush=True)


def _with_retries(fn, attempts=8, base_delay=1.5):
    """This connection has been dropping requests mid-run all session
    (ConnectionReset/ConnectionAborted, not a code bug) - retry with
    exponential backoff before giving up so a flaky network doesn't kill
    a 50+ request run halfway. A flat 2s/5-attempt retry wasn't always
    enough - bumped to 8 attempts with backoff (1.5s, 3s, 6s, ... capped
    at 20s) after several runs still died mid-way."""
    last_exc = None
    for i in range(attempts):
        try:
            return fn()
        except requests.exceptions.ConnectionError as exc:
            last_exc = exc
            time.sleep(min(base_delay * (2 ** i), 20))
    raise last_exc

from overrides import (
    CONFIRMED_SHARES, CONFIRMED_REVENUE, CONFIRMED_LIABILITIES, CONFIRMED_QUARTERLY,
    CONFIRMED_CURRENCY_FIX, CONFIRMED_EQUITY, CONFIRMED_REMOVE_YEAR, CONFIRMED_ASSETS,
    CONFIRMED_STRIP_BAD_QUARTER,
)

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
    raise SystemExit(
        "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_KEY "
        "(a write-capable key) as environment variables before running this script."
    )


def sb_headers(key):
    return {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}


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


def fmt_pct(x, digits=1):
    return f"{x*100:.{digits}f}%"


def parse_money(s):
    if not s:
        return None
    m = re.match(r"(-?[\d.]+)\s*([TBMK]?)", s.strip())
    if not m:
        return None
    mult = {"T": 1e12, "B": 1e9, "M": 1e6, "K": 1e3, "": 1}[m.group(2)]
    return float(m.group(1)) * mult


def parse_price(s):
    if not s:
        return None
    m = re.match(r"([\d.]+)", s.strip())
    return float(m.group(1)) if m else None


def get_company(url, key, ticker, fields):
    r = _with_retries(lambda: requests.get(
        f"{url}/rest/v1/companies",
        headers=sb_headers(key),
        params={"select": fields, "ticker": f"eq.{ticker}"},
    ))
    r.raise_for_status()
    rows = r.json()
    return rows[0] if rows else None


def patch_company(url, key, ticker, payload, dry_run):
    if dry_run:
        return "DRY-RUN"
    r = _with_retries(lambda: requests.patch(
        f"{url}/rest/v1/companies?ticker=eq.{ticker}",
        headers={**sb_headers(key), "Prefer": "return=minimal"},
        data=json.dumps(payload, default=str).encode("utf-8"),
    ))
    return r.status_code


def apply_shares(url, key, dry_run, log):
    for ticker, shares in CONFIRMED_SHARES.items():
        c = get_company(url, key, ticker, "ticker,price,exchange,share_count")
        if not c:
            log.append(f"[shares] {ticker}: not found, skipped")
            continue
        price = parse_price(c.get("price"))
        if not price:
            log.append(f"[shares] {ticker}: no price yet, skipped")
            continue
        currency = "SAR" if c.get("exchange") in ("تداول", "نمو") else "USD"
        new_market_cap = price * shares
        old_sc = c.get("share_count") or {}
        payload = {
            "market_cap": fmt_big(new_market_cap, currency),
            "share_count": {**old_sc, "count": fmt_big(shares, "سهم" if currency == "SAR" else "share")},
        }
        status = patch_company(url, key, ticker, payload, dry_run)
        log.append(f"[shares] {ticker}: shares={shares:.0f} market_cap={payload['market_cap']} -> {status}")


def apply_revenue(url, key, dry_run, log):
    for ticker, spec in CONFIRMED_REVENUE.items():
        c = get_company(url, key, ticker, "ticker,financials,financial_ratios")
        if not c:
            log.append(f"[revenue] {ticker}: not found, skipped")
            continue
        fin = c.get("financials") or []
        year_row = next((f for f in fin if f.get("year") == spec["year"]), None)
        created = False
        if not year_row:
            if spec.get("net_income") is None:
                # Can't create a whole new year row without at least
                # revenue+netIncome both confirmed - would leave netIncome
                # blank/guessed. Only correcting an existing row is safe here.
                log.append(f"[revenue] {ticker}: year {spec['year']} not found and no net_income given "
                           f"to create a fresh row, skipped")
                continue
            year_row = {"year": spec["year"]}
            fin.insert(0, year_row)  # newest year first, matching existing convention
            created = True
        new_revenue = spec["value"]
        year_row["revenue"] = fmt_big(new_revenue, "SAR")
        if spec.get("net_income") is not None:
            year_row["netIncome"] = fmt_big(spec["net_income"], "SAR")
        net_income = parse_money(year_row.get("netIncome"))
        new_margin = None
        if net_income is not None:
            new_margin = fmt_pct(net_income / new_revenue)
            year_row["margin"] = new_margin

        payload = {"financials": fin}
        # The latest year's net margin is ALSO duplicated under
        # financial_ratios -> Profitability -> "Net margin" (a separate
        # copy computed at the same original import time) - it doesn't
        # auto-update when financials[0].margin is fixed, so it has to be
        # patched here too or the page shows two different margins.
        ratios = c.get("financial_ratios")
        if new_margin is not None and ratios:
            for group in ratios:
                if group.get("group", {}).get("en") != "Profitability":
                    continue
                for row in group.get("rows", []):
                    if row.get("label", {}).get("en") == "Net margin":
                        row["value"] = new_margin
                        payload["financial_ratios"] = ratios

        status = patch_company(url, key, ticker, payload, dry_run)
        tag = "created new row" if created else "updated"
        log.append(f"[revenue] {ticker} {spec['year']} ({tag}): revenue={year_row['revenue']} margin={year_row.get('margin')} ({spec['basis']}) -> {status}")


def apply_liabilities(url, key, dry_run, log):
    for ticker, correct_value in CONFIRMED_LIABILITIES.items():
        c = get_company(url, key, ticker, "ticker,balance_sheet")
        if not c or not c.get("balance_sheet"):
            log.append(f"[liabilities] {ticker}: not found or no balance_sheet, skipped")
            continue
        bs = c["balance_sheet"]
        row = next((r for r in bs if r.get("label", {}).get("en") == "Total Liabilities"), None)
        if not row:
            log.append(f"[liabilities] {ticker}: no Total Liabilities row, skipped")
            continue
        row["value"] = fmt_big(correct_value, "SAR")
        status = patch_company(url, key, ticker, {"balance_sheet": bs}, dry_run)
        log.append(f"[liabilities] {ticker}: Total Liabilities -> {row['value']} -> {status}")


def apply_quarterly(url, key, dry_run, log):
    for ticker, quarters in CONFIRMED_QUARTERLY.items():
        c = get_company(url, key, ticker, "ticker,quarterly_results")
        if not c:
            log.append(f"[quarterly] {ticker}: not found, skipped")
            continue
        q1_rev, q1_profit = quarters["q1_2026"]
        q2_rev, q2_profit = quarters["q2_2026"]
        pct = (q2_rev - q1_rev) / q1_rev
        reading = "good" if (q2_rev > q1_rev and q2_profit > q1_profit) else \
                  "bad" if (q2_rev < q1_rev and q2_profit < q1_profit) else "warning"
        vs_ar = f"ارتفع عن الربع السابق +{pct*100:.1f}%" if pct >= 0 else f"انخفض عن الربع السابق {pct*100:.1f}%"
        vs_en = f"{'+' if pct >= 0 else ''}{pct*100:.1f}% vs previous quarter"
        # Q1 2026 has no independently-verified prior quarter (Q4 2025
        # was dropped, see overrides.py) so its reading/comparison is left
        # blank rather than guessed - same convention the source data
        # already used for a quarter it couldn't compute (see Q3 2025 on
        # Riyad Bank before this fix).
        new_results = [
            {
                "quarter": "Q2 2026",
                "revenue": fmt_big(q2_rev, "SAR"),
                "profit": fmt_big(q2_profit, "SAR"),
                "reading": reading,
                "vsEstimate": {"ar": vs_ar, "en": vs_en},
            },
            {
                "quarter": "Q1 2026",
                "revenue": fmt_big(q1_rev, "SAR"),
                "profit": fmt_big(q1_profit, "SAR"),
                "reading": None,
                "vsEstimate": {"ar": "", "en": ""},
            },
        ]
        status = patch_company(url, key, ticker, {"quarterly_results": new_results}, dry_run)
        log.append(f"[quarterly] {ticker}: Q2={new_results[0]['revenue']}/{new_results[0]['profit']} "
                   f"Q1={new_results[1]['revenue']}/{new_results[1]['profit']} -> {status}")


def apply_equity(url, key, dry_run, log):
    for ticker, correct_value in CONFIRMED_EQUITY.items():
        c = get_company(url, key, ticker, "ticker,balance_sheet")
        if not c:
            log.append(f"[equity] {ticker}: not found, skipped")
            continue
        bs = c.get("balance_sheet") or []
        row = next((r for r in bs if r.get("label", {}).get("en") == "Total Stockholders Equity"), None)
        if row:
            row["value"] = fmt_big(correct_value, "SAR")
            action = "updated"
        else:
            # balance_sheet is empty/missing this row entirely (e.g. a
            # brand-new IPO WiseSheets never populated) - create it
            # rather than silently skip, since we DO have a confirmed value.
            bs.append({"label": {"ar": "حقوق المساهمين", "en": "Total Stockholders Equity"},
                       "value": fmt_big(correct_value, "SAR")})
            action = "created (balance_sheet was empty)"
        status = patch_company(url, key, ticker, {"balance_sheet": bs}, dry_run)
        log.append(f"[equity] {ticker}: Total Stockholders Equity {action} -> {fmt_big(correct_value, 'SAR')} -> {status}")


def apply_remove_unaudited_year(url, key, dry_run, log):
    for ticker, bad_year in CONFIRMED_REMOVE_YEAR.items():
        c = get_company(url, key, ticker, "ticker,financials")
        if not c or not c.get("financials"):
            log.append(f"[remove_year] {ticker}: not found or no financials, skipped")
            continue
        fin = c["financials"]
        before = len(fin)
        fin = [row for row in fin if row.get("year") != bad_year]
        if len(fin) == before:
            log.append(f"[remove_year] {ticker}: no {bad_year} row found (already removed?), skipped")
            continue
        status = patch_company(url, key, ticker, {"financials": fin}, dry_run)
        newest = fin[0]["year"] if fin else "none"
        log.append(f"[remove_year] {ticker}: dropped unaudited {bad_year} row, newest year now {newest} -> {status}")


def apply_assets(url, key, dry_run, log):
    for ticker, correct_value in CONFIRMED_ASSETS.items():
        c = get_company(url, key, ticker, "ticker,balance_sheet")
        if not c:
            log.append(f"[assets] {ticker}: not found, skipped")
            continue
        bs = c.get("balance_sheet") or []
        row = next((r for r in bs if r.get("label", {}).get("en") == "Total Assets"), None)
        if row:
            row["value"] = fmt_big(correct_value, "SAR")
            action = "updated"
        else:
            bs.append({"label": {"ar": "إجمالي الأصول", "en": "Total Assets"},
                       "value": fmt_big(correct_value, "SAR")})
            action = "created (balance_sheet was empty)"
        status = patch_company(url, key, ticker, {"balance_sheet": bs}, dry_run)
        log.append(f"[assets] {ticker}: Total Assets {action} -> {fmt_big(correct_value, 'SAR')} -> {status}")


def apply_strip_bad_quarter(url, key, dry_run, log):
    bad_label = CONFIRMED_STRIP_BAD_QUARTER["quarter_label"]
    for ticker in CONFIRMED_STRIP_BAD_QUARTER["tickers"]:
        c = get_company(url, key, ticker, "ticker,quarterly_results")
        if not c or not c.get("quarterly_results"):
            log.append(f"[strip_quarter] {ticker}: not found or no quarterly_results, skipped")
            continue
        qr = c["quarterly_results"]
        idx = next((i for i, r in enumerate(qr) if r.get("quarter") == bad_label), None)
        if idx is None:
            log.append(f"[strip_quarter] {ticker}: {bad_label} row not found (already fixed?), skipped")
            continue
        removed = qr.pop(idx)
        # Array is newest-first, so the entry one index BEFORE the removed
        # one (chronologically newer) is the one whose "vs previous
        # quarter" comparison referenced the now-removed bad baseline -
        # blank it rather than leave a comparison against garbage data,
        # same convention already used in CONFIRMED_QUARTERLY above for a
        # quarter that has no verified prior quarter to compare against.
        if idx - 1 >= 0:
            qr[idx - 1]["reading"] = None
            qr[idx - 1]["vsEstimate"] = {"ar": "", "en": ""}
        status = patch_company(url, key, ticker, {"quarterly_results": qr}, dry_run)
        log.append(f"[strip_quarter] {ticker}: removed broken {bad_label} (was revenue={removed.get('revenue')!r}), "
                   f"blanked comparison on new oldest shown quarter -> {status}")


def apply_currency_fix(url, key, dry_run, log):
    money_fields_financials = ("revenue", "netIncome", "cashFlow")
    for ticker, multiplier in CONFIRMED_CURRENCY_FIX.items():
        c = get_company(url, key, ticker, "ticker,financials,balance_sheet")
        if not c:
            log.append(f"[currency] {ticker}: not found, skipped")
            continue
        payload = {}
        if c.get("financials"):
            fin = c["financials"]
            for row in fin:
                for field in money_fields_financials:
                    v = parse_money(row.get(field))
                    if v is not None:
                        row[field] = fmt_big(v * multiplier, "SAR")
                # margin/roic are ratios - already currency-independent, left as-is
            payload["financials"] = fin
        if c.get("balance_sheet"):
            bs = c["balance_sheet"]
            for row in bs:
                v = parse_money(row.get("value"))
                if v is not None:
                    row["value"] = fmt_big(v * multiplier, "SAR")
            payload["balance_sheet"] = bs
        status = patch_company(url, key, ticker, payload, dry_run)
        n_years = len(payload.get("financials", []))
        log.append(f"[currency] {ticker}: x{multiplier} applied to {n_years} years of financials + balance_sheet -> {status}")


def main():
    dry_run = "--dry-run" in sys.argv
    url, key = load_credentials()
    log = FlushingLog([f"dry_run={dry_run}"])
    apply_shares(url, key, dry_run, log)
    apply_revenue(url, key, dry_run, log)
    apply_liabilities(url, key, dry_run, log)
    apply_equity(url, key, dry_run, log)
    apply_assets(url, key, dry_run, log)
    apply_quarterly(url, key, dry_run, log)
    apply_strip_bad_quarter(url, key, dry_run, log)
    apply_currency_fix(url, key, dry_run, log)
    apply_remove_unaudited_year(url, key, dry_run, log)


if __name__ == "__main__":
    main()
