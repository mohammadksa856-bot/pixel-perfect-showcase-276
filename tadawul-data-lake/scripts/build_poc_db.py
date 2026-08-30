# -*- coding: utf-8 -*-
"""
POC: Saudi Exchange (Tadawul) financial-statements data lake.

Source of truth: saudiexchange.sa's own public company-profile page
(النظام: https://www.saudiexchange.sa/wps/.../company-profile-main/?companySymbol={TICKER}),
NOT a third-party aggregator (Argaam) and NOT WiseSheets - both of which
this session found repeatedly wrong (gross/net revenue tagging, ~3.75x
IPO scaling bug, sign flips, stale years, and a quarter-label-shift bug
found 2026-08-30 that mislabeled Q3 as Q4 and vice versa for most
companies). Tadawul is the exchange itself - the filer's own disclosure,
one hop closer to the primary source than any aggregator.

This script parses the 5 raw company extracts in
data-lake/raw/poc_raw_extracts.json (captured via browser automation:
navigate to the profile page, click the "ربع سنوي" toggle, read the
rendered table - there is no public JSON API, this is the same data a
human sees) into a normalized long-format table and loads it into a
DuckDB file. Money figures on the page are in thousands SAR; this
script converts to whole SAR on load so all financials/ dashboards can
assume one consistent unit.

Run: python build_poc_db.py
"""
import json
import re
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parent.parent
RAW_PATH = ROOT / "data-lake" / "raw" / "poc_raw_extracts.json"
PROFILES_PATH = ROOT / "data-lake" / "raw" / "poc_company_profiles.json"
ANNOUNCEMENTS_PATH = ROOT / "data-lake" / "raw" / "poc_announcements.json"
DB_PATH = ROOT / "data-lake" / "database" / "tadawul.duckdb"

# Row-label -> our canonical field name. Only rows we actually want to
# keep long-term; everything else in the raw table is dropped after
# parsing (still preserved verbatim in poc_raw_extracts.json).
FIELD_MAP = {
    "إجمالي الموجودات": "total_assets",
    "إجمالي المطلوبات": "total_liabilities",
    "إجمالي حقوق الملكية (بعد استبعاد الحصص غير المسيطرة)": "total_equity",
    "إجمالي الإيرادات (المبيعات/العمليات)": "revenue",
    "صافي الربح (الخسارة) العائد لمساهمي المصدر": "net_income",
    "ربحية (خسارة) السهم": "eps",
    "صافي النقد من الأنشطة التشغيلية": "operating_cash_flow",
    "صافي النقد من الأنشطة الإستثمارية": "investing_cash_flow",
    "صافي النقد من الأنشطة التمويلية": "financing_cash_flow",
}


def parse_number(raw: str):
    if raw is None or raw.strip() in ("", "-", "^"):
        return None
    cleaned = raw.replace(",", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None


def period_label(date_str: str, is_quarterly: bool) -> str:
    """'2025-09-30' -> 'Q3 2025' (quarterly) or '2025' (annual)."""
    year, month, _ = date_str.split("-")
    if not is_quarterly:
        return year
    q = {"03": "Q1", "06": "Q2", "09": "Q3", "12": "Q4"}[month]
    return f"{q} {year}"


def parse_table(table, symbol, period_type):
    """table: list of rows, each [label, val1, val2, ...]. First row of
    each of the 3 statement blocks is a header giving the period-end
    dates for that block's columns (all 3 blocks share the same dates
    on this page, but we key off each block's own header defensively)."""
    is_quarterly = period_type == "quarterly"
    records = []
    dates = None
    for row in table:
        label, values = row[0], row[1:]
        if label in ("قائمة المركز المالي", "قائمة الدخل", "قائمة التدفقات النقدية"):
            dates = values
            continue
        field = FIELD_MAP.get(label)
        if field is None or dates is None:
            continue
        for date_str, raw_val in zip(dates, values):
            if not re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
                continue
            num = parse_number(raw_val)
            if num is None:
                continue
            # EPS is already a per-share SAR figure, not in thousands.
            value_sar = num if field == "eps" else num * 1000
            records.append({
                "symbol": symbol,
                "period_type": period_type,
                "period_label": period_label(date_str, is_quarterly),
                "period_end": date_str,
                "field": field,
                "value_sar": value_sar,
                "source": "saudiexchange.sa",
            })
    return records


def main():
    raw = json.loads(RAW_PATH.read_text(encoding="utf-8"))
    profiles = json.loads(PROFILES_PATH.read_text(encoding="utf-8"))
    announcements_raw = json.loads(ANNOUNCEMENTS_PATH.read_text(encoding="utf-8"))

    companies = []
    long_records = []
    announcements = []
    for symbol, c in raw.items():
        p = profiles.get(symbol, {})
        companies.append({
            "symbol": symbol,
            "name_ar": c["name_ar"],
            "market": c["market"],
            "founded": p.get("founded"),
            "listing_date": p.get("listing_date"),
            "auditor": p.get("auditor"),
            "isin": p.get("isin"),
            "employees": p.get("employees"),
        })
        long_records += parse_table(c["annual"], symbol, "annual")
        long_records += parse_table(c["quarterly"], symbol, "quarterly")
        for a in announcements_raw.get(symbol, []):
            announcements.append({
                "symbol": symbol,
                "an_id": a["an_id"],
                "date": a["date"],
                "title_ar": a["title_ar"],
                "url": a["url"],
            })

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(str(DB_PATH))
    con.execute("drop table if exists companies")
    con.execute("drop table if exists financials_long")
    con.execute("drop table if exists announcements")
    con.execute("""
        create table companies (
            symbol varchar primary key,
            name_ar varchar,
            market varchar,
            founded varchar,
            listing_date varchar,
            auditor varchar,
            isin varchar,
            employees integer
        )
    """)
    con.execute("""
        create table announcements (
            symbol varchar,
            an_id bigint primary key,
            announced_at timestamp,
            title_ar varchar,
            url varchar
        )
    """)
    con.execute("""
        create table financials_long (
            symbol varchar,
            period_type varchar,   -- 'annual' | 'quarterly'
            period_label varchar,  -- '2025' | 'Q3 2025'
            period_end date,
            field varchar,         -- revenue | net_income | total_assets | ...
            value_sar double,
            source varchar
        )
    """)
    con.executemany(
        "insert into companies values (?, ?, ?, ?, ?, ?, ?, ?)",
        [(c["symbol"], c["name_ar"], c["market"], c["founded"], c["listing_date"],
          c["auditor"], c["isin"], c["employees"]) for c in companies],
    )
    con.executemany(
        "insert into financials_long values (?, ?, ?, ?, ?, ?, ?)",
        [(r["symbol"], r["period_type"], r["period_label"], r["period_end"],
          r["field"], r["value_sar"], r["source"]) for r in long_records],
    )
    con.executemany(
        "insert into announcements values (?, ?, ?, ?, ?)",
        [(a["symbol"], a["an_id"], a["date"], a["title_ar"], a["url"]) for a in announcements],
    )

    # A wide view - one row per company+period, one column per field -
    # is what most queries/dashboards actually want, long-format is just
    # the durable storage shape (easy to add new fields later without a
    # schema migration).
    con.execute("""
        create or replace view financials as
        select
            symbol, period_type, period_label, period_end,
            max(case when field='revenue' then value_sar end) as revenue,
            max(case when field='net_income' then value_sar end) as net_income,
            max(case when field='total_assets' then value_sar end) as total_assets,
            max(case when field='total_liabilities' then value_sar end) as total_liabilities,
            max(case when field='total_equity' then value_sar end) as total_equity,
            max(case when field='eps' then value_sar end) as eps,
            max(case when field='operating_cash_flow' then value_sar end) as operating_cash_flow,
            max(case when field='investing_cash_flow' then value_sar end) as investing_cash_flow,
            max(case when field='financing_cash_flow' then value_sar end) as financing_cash_flow
        from financials_long
        group by symbol, period_type, period_label, period_end
    """)
    con.close()
    print(f"Loaded {len(companies)} companies, {len(long_records)} financial data points, "
          f"{len(announcements)} announcements -> {DB_PATH}")


if __name__ == "__main__":
    main()
