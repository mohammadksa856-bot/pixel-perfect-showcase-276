# Tadawul Data Lake (POC)

Structured financial-statements data lake sourced directly from the Saudi
Exchange's own public company-profile pages (`saudiexchange.sa`) — not a
third-party aggregator (Argaam) and not WiseSheets, both of which the
sibling `pixel-perfect-showcase-276` project found repeatedly wrong
(gross/net revenue tagging bugs, a ~3.75x IPO-year scaling bug, sign
flips, stale years, and a quarter-label-shift bug that mislabeled Q3 as
Q4 for most companies). Tadawul is the exchange itself — one hop closer
to the primary source than any aggregator.

**Goal:** eventually replace WiseSheets as the data source feeding the
`companies` table in the `pixel-perfect-showcase-276` Supabase project
(financials, balance sheet, cash flow, and every ratio computed from
them) for all ~396 Saudi-listed (تداول + نمو) companies.

## Status: POC validated on 5 companies

`2222` (Aramco), `2010` (SABIC), `7010` (STC), `1120` (Al Rajhi), `1211`
(Ma'aden) — company profile, 3 years annual + 4 quarters of financials,
and a handful of real announcements, loaded into `data-lake/database/tadawul.duckdb`.
Every number cross-checked against Argaam and matched exactly (e.g.
Aramco Q3 2025 revenue: 418.16B SAR both places).

## Layout

```
data-lake/
├── raw/                     # source JSON exactly as scraped
│   ├── poc_raw_extracts.json       # financial statement tables
│   ├── poc_company_profiles.json   # founding/listing/auditor/employees
│   ├── poc_announcements.json      # sample announcements + the URL pattern
│   └── all_tickers.json            # full 396-ticker universe (تداول+نمو)
└── database/
    └── tadawul.duckdb        # built by scripts/build_poc_db.py

scripts/
└── build_poc_db.py           # raw JSON -> normalized DuckDB tables
```

## How extraction works

No public API exists for this data - `saudiexchange.sa` is a legacy
WebSphere Portal site. Two ways to get the rendered financials table,
both proven to return identical, correct numbers:

1. **Browser navigation** (slow, ~1 nav + 1 click + wait per company):
   navigate to
   `.../hidden/company-profile-main/!ut/p/z1/<fixed-portal-state>/?companySymbol={TICKER}`,
   click the "ربع سنوي" toggle (dispatch a real click event on the `<li>`
   whose text is exactly "ربع سنوي"), then read whichever of the 3
   duplicate `قائمة الدخل` table copies in the DOM is currently visible
   (`offsetParent !== null`) - the page renders annual, quarterly, AND
   an older 4-year-annual view all at once and toggles visibility with
   CSS rather than re-fetching data.

2. **Same-origin `fetch()`** (fast, no navigation needed): fetching the
   same profile URL and parsing the response with `DOMParser` returns
   the exact same 3 table copies already in the raw HTML (all 3 exist
   server-side; the toggle only ever flips which one is shown). Verified
   byte-identical to method 1 for ticker 2340. This lets many tickers be
   pulled in parallel from a single browser tab via `Promise.all`,
   without a real page navigation per ticker.

Money figures on the page are in **thousands SAR**; the loader script
converts to whole SAR.

## Next steps (not done yet)

- Scale extraction to all 396 tickers in `all_tickers.json`.
- Compute ratios (P/E, P/B, EV/EBITDA, ROE, ROIC, margins) from the raw
  statement data + live price/share-count.
- Build a sync script writing this into `pixel-perfect-showcase-276`'s
  Supabase `companies` table schema, retiring WiseSheets for the Saudi
  market.
- Announcement archival beyond the 3-per-company sample (URL pattern
  proven, not yet crawled in bulk) and PDF attachment archival (lower
  priority - not needed for the ratios/Supabase goal).
