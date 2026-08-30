# -*- coding: utf-8 -*-
"""
Builds the full-market tadawul.duckdb from data-lake/raw/all_raw_extracts.json
(396 tickers, fetched via saudiexchange.sa company-profile pages) plus
company names/exchange from all_company_names.json (sourced from the
existing pixel-perfect-showcase-276 Supabase `companies` table, since
this same-origin fetch of saudiexchange.sa doesn't reliably return a
usable company name without a live browser session).

Known gap: ~99 tickers (mostly REITs, ticker range 4330-4350, plus a
handful of newer/smaller Nomu companies) use a different page layout on
saudiexchange.sa without a "قائمة الدخل" (income statement) heading -
this extractor doesn't parse those yet. They're recorded in `companies`
with null everything-else so they're visible as a known gap rather than
silently missing.

Run: python build_full_db.py
"""
import json
import re
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parent.parent
RAW_PATH = ROOT / "data-lake" / "raw" / "all_raw_extracts.json"
NAMES_PATH = ROOT / "data-lake" / "raw" / "all_company_names.json"
ALL_TICKERS_PATH = ROOT / "data-lake" / "raw" / "all_tickers.json"
DB_PATH = ROOT / "data-lake" / "database" / "tadawul.duckdb"

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


def parse_number(raw):
    if raw is None or raw.strip() in ("", "-", "^"):
        return None
    cleaned = raw.replace(",", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None


def period_label(date_str, is_quarterly):
    year, month, _ = date_str.split("-")
    if not is_quarterly:
        return year
    # Calendar-quarter bucket by month, not a fixed Dec-FYE lookup - a
    # handful of companies have non-December fiscal year ends, giving
    # quarter-end months outside {03,06,09,12} (e.g. a company whose
    # quarters end Apr/Jul/Oct/Jan). Bucketing by month keeps every
    # company's real quarter-end date intact in period_end regardless.
    q = (int(month) - 1) // 3 + 1
    return f"Q{q} {year}"


def parse_table(table, symbol, period_type):
    if not table:
        return []
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
            value_sar = num if field == "eps" else num * 1000
            records.append({
                "symbol": symbol, "period_type": period_type,
                "period_label": period_label(date_str, is_quarterly),
                "period_end": date_str, "field": field,
                "value_sar": value_sar, "source": "saudiexchange.sa",
            })
    return records


def main():
    raw = json.loads(RAW_PATH.read_text(encoding="utf-8"))
    all_tickers = json.loads(ALL_TICKERS_PATH.read_text(encoding="utf-8"))
    names = {}
    if NAMES_PATH.exists():
        names = json.loads(NAMES_PATH.read_text(encoding="utf-8"))

    companies = []
    long_records = []
    no_data_tickers = []
    for symbol in all_tickers:
        rec = raw.get(symbol, {})
        n = names.get(symbol, {})
        companies.append({
            "symbol": symbol,
            "name_ar": n.get("name_ar"),
            "exchange": n.get("exchange"),
        })
        annual_recs = parse_table(rec.get("annual"), symbol, "annual")
        quarterly_recs = parse_table(rec.get("quarterly"), symbol, "quarterly")
        long_records += annual_recs
        long_records += quarterly_recs
        if not annual_recs and not quarterly_recs:
            no_data_tickers.append(symbol)

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(str(DB_PATH))
    con.execute("drop table if exists companies")
    con.execute("drop table if exists financials_long")
    con.execute("""
        create table companies (
            symbol varchar primary key, name_ar varchar, exchange varchar
        )
    """)
    con.execute("""
        create table financials_long (
            symbol varchar, period_type varchar, period_label varchar,
            period_end date, field varchar, value_sar double, source varchar
        )
    """)
    con.executemany("insert into companies values (?, ?, ?)",
                     [(c["symbol"], c["name_ar"], c["exchange"]) for c in companies])
    con.executemany(
        "insert into financials_long values (?, ?, ?, ?, ?, ?, ?)",
        [(r["symbol"], r["period_type"], r["period_label"], r["period_end"],
          r["field"], r["value_sar"], r["source"]) for r in long_records],
    )
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

    (ROOT / "data-lake" / "raw" / "no_data_tickers.json").write_text(
        json.dumps(no_data_tickers, ensure_ascii=False), encoding="utf-8"
    )
    print(f"Loaded {len(companies)} companies, {len(long_records)} data points -> {DB_PATH}")
    print(f"{len(no_data_tickers)} tickers with no parseable financials (saved to no_data_tickers.json)")


if __name__ == "__main__":
    main()
