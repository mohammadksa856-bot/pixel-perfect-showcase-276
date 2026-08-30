# -*- coding: utf-8 -*-
"""
Computes valuation ratios from the Tadawul-sourced financials
(tadawul.duckdb) combined with live price/share_count already in
Supabase (unaffected by the WiseSheets financials bug - price/shares
come from a different part of the pipeline and were never in question).

Only computes ratios that are honestly derivable from what's actually in
financials_long - no invented EBITDA. That means:
    P/E   = market_cap / latest annual net_income
    P/B   = market_cap / latest annual total_equity
    ROE   = latest annual net_income / total_equity
    ROA   = latest annual net_income / total_assets
    Net margin = latest annual net_income / revenue
    D/E   = total_liabilities / total_equity   (liabilities, not just
            interest-bearing debt - a real ratio, just a different one
            than "debt/equity" in the narrow sense; labeled accordingly)

EV/EBITDA is deliberately NOT computed here: EBITDA needs D&A, which
saudiexchange.sa's summary table doesn't expose (only the 3-statement
totals used here). Computing it would mean estimating D&A from
operating cash flow minus net income, which conflates D&A with working-
capital movements and other non-cash items - not honest. Left as a
documented gap rather than a fabricated number, same standard applied
to every other override this session.

Output: data-lake/raw/computed_ratios.json, keyed by ticker.

Run: python compute_ratios.py
"""
import json
import re
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data-lake" / "database" / "tadawul.duckdb"
PRICES_PATH = ROOT / "data-lake" / "raw" / "prices_shares.json"
OUT_PATH = ROOT / "data-lake" / "raw" / "computed_ratios.json"


def parse_money(s):
    if not isinstance(s, str):
        return None
    m = re.match(r"(-?[\d.]+)\s*([TBMK]?)", s.strip())
    if not m:
        return None
    mult = {"T": 1e12, "B": 1e9, "M": 1e6, "K": 1e3, "": 1}[m.group(2)]
    return float(m.group(1)) * mult


def parse_shares(share_count):
    if not isinstance(share_count, dict):
        return None
    count = share_count.get("count")
    if not count:
        return None
    m = re.match(r"^([\d.]+)\s*([BMK]?)", str(count).strip())
    if not m:
        return None
    mult = {"B": 1e9, "M": 1e6, "K": 1e3, "": 1}[m.group(2)]
    return float(m.group(1)) * mult


def main():
    con = duckdb.connect(str(DB_PATH))
    latest_annual = con.execute("""
        select symbol, revenue, net_income, total_assets, total_liabilities, total_equity
        from financials
        where period_type = 'annual'
        qualify row_number() over (partition by symbol order by period_end desc) = 1
    """).fetchall()
    cols = [d[0] for d in con.description]
    con.close()

    prices = {r["ticker"]: r for r in json.loads(PRICES_PATH.read_text(encoding="utf-8"))}

    ratios = {}
    skipped_no_price = []
    for row in latest_annual:
        rec = dict(zip(cols, row))
        symbol = rec["symbol"]
        price_row = prices.get(symbol, {})
        price = parse_money(price_row.get("price"))
        shares = parse_shares(price_row.get("share_count"))
        if price is None or shares is None:
            skipped_no_price.append(symbol)
            continue
        market_cap = price * shares

        revenue, net_income = rec["revenue"], rec["net_income"]
        assets, liabilities, equity = rec["total_assets"], rec["total_liabilities"], rec["total_equity"]

        r = {"market_cap": market_cap, "price": price, "shares": shares}
        if net_income:
            r["pe"] = market_cap / net_income if net_income > 0 else None
        if equity:
            r["pb"] = market_cap / equity
            r["roe"] = net_income / equity if net_income is not None else None
            r["debt_to_equity"] = liabilities / equity if liabilities is not None else None
        if assets and net_income is not None:
            r["roa"] = net_income / assets
        if revenue and net_income is not None:
            r["net_margin"] = net_income / revenue
        ratios[symbol] = r

    OUT_PATH.write_text(json.dumps(ratios, ensure_ascii=False), encoding="utf-8")
    print(f"Computed ratios for {len(ratios)} companies. "
          f"Skipped (no live price/shares in Supabase): {len(skipped_no_price)}")


if __name__ == "__main__":
    main()
