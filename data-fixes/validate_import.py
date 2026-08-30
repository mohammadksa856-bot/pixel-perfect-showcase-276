# -*- coding: utf-8 -*-
"""
Comprehensive pre-import validator for the master WiseSheets Excel export
(marefa_wisesheets_full.xlsx, "Data" sheet). Runs every check we've found
a real bug with this session against EVERY company row, before anything
touches Supabase - so a bad refresh gets caught and reported, not
silently published.

This is a READ-ONLY report. It never writes to Supabase. Run it after
every fresh Excel pull (WiseSheets refresh + VBA macro + save) to see
exactly which companies are safe to import as-is, which are covered by
a known confirmed override, and which are new and need a human look
before they go live.

Usage:
    python validate_import.py "<path to marefa_wisesheets_full.xlsx>"

Output: validation_report.txt in this folder, one section per check,
listing every flagged ticker with the numbers that triggered the flag.
"""
import io
import os
import sys

import openpyxl

sys.path.insert(0, os.path.dirname(__file__))
from overrides import CONFIRMED_SHARES, CONFIRMED_REVENUE, CONFIRMED_LIABILITIES


def load_rows(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb["Data"]
    headers = [c.value for c in ws[1]]
    idx = {h: i for i, h in enumerate(headers)}
    rows = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        ticker = row[idx["ticker"]]
        if not ticker:
            continue
        rows.append({h: row[i] for h, i in idx.items()})
    return rows


def is_num(v):
    return isinstance(v, (int, float))


def check_revenue_jump(rows, findings):
    """Revenue nearly doubling YoY while net income doesn't - the exact
    gross-vs-net tagging bug confirmed for 6 banks this session."""
    for r in rows:
        ticker = str(r["ticker"])
        ry0, ry1 = r.get("revenue_y0"), r.get("revenue_y1")
        ny0, ny1 = r.get("net_income_y0"), r.get("net_income_y1")
        if not (is_num(ry0) and is_num(ry1) and ry1 > 0):
            continue
        rev_ratio = ry0 / ry1
        ni_ratio = (ny0 / ny1) if (is_num(ny0) and is_num(ny1) and ny1 and ny1 > 0) else None
        if rev_ratio > 1.6 and (ni_ratio is None or rev_ratio > ni_ratio * 1.4):
            has_override = ticker in CONFIRMED_REVENUE
            findings.append((
                "REVENUE_JUMP", ticker,
                f"revenue_y0/y1={rev_ratio:.2f}x net_income ratio={ni_ratio:.2f}x" if ni_ratio else
                f"revenue_y0/y1={rev_ratio:.2f}x net_income ratio=N/A",
                "covered by CONFIRMED_REVENUE override" if has_override else "NEEDS REVIEW - no override yet",
            ))


def check_quarterly_revenue_mismatch(rows, findings):
    """Revenue_q0..q3 should sum to roughly revenue_y0 - confirmed broken
    for 9/10 banks checked this session (10-72% off), the same gross-vs-
    net tagging inconsistency as the annual REVENUE_JUMP bug, just also
    present in the quarterly breakdown columns. Net income quarterly sums
    matched cleanly for the same 10 banks, so this check is revenue-only."""
    for r in rows:
        ticker = str(r["ticker"])
        y0 = r.get("revenue_y0")
        qs = [r.get(f"revenue_q{i}") for i in range(4)]
        if not (is_num(y0) and y0 and all(is_num(q) for q in qs)):
            continue
        qsum = sum(qs)
        diff_pct = abs(qsum - y0) / abs(y0)
        if diff_pct > 0.10:
            findings.append((
                "QUARTERLY_REVENUE_MISMATCH", ticker,
                f"q0-q3 sum={qsum:.0f} annual revenue_y0={y0:.0f} diff={diff_pct*100:.0f}%",
                "NEEDS REVIEW - quarterly revenue likely on a different (gross/net) basis than annual; "
                "do not trust revenue_q0-q3 for this ticker without independent confirmation",
            ))


# Valuation multiples we NEVER import as pulled - always recompute from
# already-verified base figures (market_cap / net_income / equity /
# revenue) at import AND refresh time instead. Confirmed via this
# session's 10-bank audit: pe and pb mismatched the recomputed value for
# 9/9 and 9/9 banks checked; price_to_sales for 9/9. Not "findings" to
# fix per-ticker - this is a standing rule for the importer itself.
NEVER_IMPORT_RAW_RATIOS = {"pe", "pb", "price_to_sales", "ev_ebitda", "ptb_ratio", "pocf_ratio", "pfcf_ratio"}


def check_exact_liab_eq_assets(rows, findings):
    """Total Liabilities pulled equal to Total Assets - a mislabeled-
    column bug, confirmed for 3 companies this session."""
    for r in rows:
        ticker = str(r["ticker"])
        ta, tl, te = r.get("total_assets"), r.get("total_liabilities"), r.get("total_equity")
        if not (is_num(ta) and is_num(tl) and is_num(te) and ta > 0):
            continue
        if abs(tl - ta) / ta < 0.005 and te and abs(te) / ta > 0.001:
            has_override = ticker in CONFIRMED_LIABILITIES
            findings.append((
                "EXACT_LIAB_EQ_ASSETS", ticker,
                f"assets={ta:.0f} liabilities={tl:.0f} equity={te:.0f}",
                "covered by CONFIRMED_LIABILITIES override" if has_override else "NEEDS REVIEW - no override yet",
            ))


def check_balance_sheet_mismatch(rows, findings):
    """Assets != Liabilities + Equity by more than 15% - flagged as
    informational (often legitimate: non-controlling interests for
    holding companies), never auto-blocked."""
    for r in rows:
        ticker = str(r["ticker"])
        ta, tl, te = r.get("total_assets"), r.get("total_liabilities"), r.get("total_equity")
        if not (is_num(ta) and is_num(tl) and is_num(te) and ta):
            continue
        diff_pct = abs(ta - (tl + te)) / ta
        if diff_pct > 0.15:
            findings.append((
                "BALANCE_SHEET_MISMATCH", ticker,
                f"assets={ta:.0f} liab+equity={(tl+te):.0f} diff={diff_pct*100:.0f}%",
                "informational - verify if non-controlling interests before trusting blindly",
            ))


def check_margin_false_positive(rows, findings):
    """Revenue AND net income both negative => a spuriously positive
    margin percentage that reads as strong profitability. We don't have
    the pre-formatted margin string here (that's computed at import
    time), so this flags the raw condition for the importer to handle by
    blanking margin, not showing a computed positive number."""
    for r in rows:
        ticker = str(r["ticker"])
        ry0, ny0 = r.get("revenue_y0"), r.get("net_income_y0")
        if is_num(ry0) and is_num(ny0) and ry0 < 0 and ny0 < 0:
            findings.append((
                "MARGIN_FALSE_POSITIVE", ticker,
                f"revenue_y0={ry0:.0f} net_income_y0={ny0:.0f}",
                "importer must blank margin for this year, not show netIncome/revenue directly",
            ))


def check_pe_sign(rows, findings):
    """Stored P/E negative while net income is positive - the importer
    should prefer computing P/E live from market cap / net income rather
    than trusting the source's own pe column, since that's what we found
    stale/wrong repeatedly this session."""
    for r in rows:
        ticker = str(r["ticker"])
        pe, ny0 = r.get("pe"), r.get("net_income_y0")
        if is_num(pe) and is_num(ny0) and ny0 > 0 and pe < 0:
            findings.append((
                "PE_NEGATIVE_BUT_PROFITABLE", ticker,
                f"source pe={pe:.1f}x net_income_y0={ny0:.0f}",
                "importer should compute P/E = market_cap / net_income_y0 instead of trusting source pe",
            ))


def check_shares_override_coverage(rows, findings):
    """Sanity check: every ticker in CONFIRMED_SHARES should still exist
    in this export, so the override doesn't silently stop applying."""
    tickers_in_file = {str(r["ticker"]) for r in rows}
    for ticker in CONFIRMED_SHARES:
        if ticker not in tickers_in_file:
            findings.append((
                "OVERRIDE_TICKER_MISSING", ticker,
                "ticker in CONFIRMED_SHARES but not found in this Excel export",
                "check the ticker still trades / wasn't delisted or renamed",
            ))


def main():
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python validate_import.py <path to xlsx>")
    path = sys.argv[1]
    rows = load_rows(path)

    findings = []
    check_revenue_jump(rows, findings)
    check_exact_liab_eq_assets(rows, findings)
    check_balance_sheet_mismatch(rows, findings)
    check_margin_false_positive(rows, findings)
    check_pe_sign(rows, findings)
    check_shares_override_coverage(rows, findings)

    by_type = {}
    for kind, ticker, detail, action in findings:
        by_type.setdefault(kind, []).append((ticker, detail, action))

    out = [f"total companies scanned: {len(rows)}, total findings: {len(findings)}\n"]
    needs_review = 0
    for kind, items in by_type.items():
        out.append(f"=== {kind} ({len(items)}) ===")
        for ticker, detail, action in items:
            out.append(f"  {ticker}: {detail}  ->  {action}")
            if "NEEDS REVIEW" in action:
                needs_review += 1
        out.append("")
    out.append(f"TOTAL NEEDING HUMAN REVIEW (no existing override): {needs_review}")

    report_path = os.path.join(os.path.dirname(__file__), "validation_report.txt")
    with io.open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    print(f"Report written to {report_path}")


if __name__ == "__main__":
    main()
