"""
Derive every metric that is honestly implied by the nine raw fields in the
Tadawul data lake, for EVERY company and EVERY period -- not just the latest
annual snapshot that compute_ratios.py produces.

Why this exists
---------------
`compute_ratios.py` computes 7 ratios for 297 companies, latest annual only.
That is a single snapshot: no growth, no cash quality, no turnover, no DuPont,
and nothing at all for the 988 quarterly rows. The company page has sections
for margin trend, historical performance and ratio groups that cannot be fed
from a snapshot. This fills that gap from data already on disk -- no new
scraping, no new facts, no manual entry.

What it will NOT do
-------------------
The raw table has exactly nine fields: revenue, net_income, total_assets,
total_liabilities, total_equity, eps, and the three cash-flow lines. Anything
needing a field we do not have is omitted rather than approximated:

  - free cash flow      needs capex alone; we only have TOTAL investing cash
                        flow, which also contains acquisitions and securities.
                        OCF + ICF is NOT free cash flow and is not reported.
  - EV/EBITDA, net debt needs cash and interest-bearing debt separately;
                        total_liabilities is not debt.
  - gross margin        needs cost of revenue.
  - dividend metrics    not in the source.

Honest denominators (the rule that matters)
-------------------------------------------
A ratio whose denominator is zero, negative or missing is reported as null
with a reason code -- never as a number. This is not pedantry; it is the
difference between a figure and a lie:

  - ROE with NEGATIVE equity returns a POSITIVE number that reads as healthy
    while describing an insolvent balance sheet. 11 rows in this lake have
    negative equity.
  - a growth rate off a NEGATIVE base has no interpretable sign: SABIC going
    from -2.77B to +1.54B is not "+155% growth". 8 rows have negative revenue
    and many more have negative net income.
  - cash conversion (OCF / net income) is meaningless when net income <= 0.

Period pairing
--------------
Growth compares like with like, keyed off `period_end` rather than the label:
annual to the prior fiscal year, quarterly to the SAME quarter one year
earlier. Quarterly coverage in this lake is gappy -- Aramco has Q1 2026 with
no Q1 2025 -- so a missing counterpart yields null with `no_comparable_period`
instead of silently pairing against whatever row happens to be adjacent.

Output: data-lake/raw/derived_metrics.json
  { symbol: [ { period_type, period_label, period_end, metrics: {...},
                skipped: { metric: reason } }, ... ] }

Run: python3 scripts/derive_metrics.py [--db PATH] [--out PATH]
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB = ROOT / "data-lake" / "database" / "tadawul.duckdb"
DEFAULT_OUT = ROOT / "data-lake" / "raw" / "derived_metrics.json"

RAW_FIELDS = (
    "revenue",
    "net_income",
    "total_assets",
    "total_liabilities",
    "total_equity",
    "eps",
    "operating_cash_flow",
    "investing_cash_flow",
    "financing_cash_flow",
)

# Reason codes, so a gap is always explained rather than merely absent.
MISSING_INPUT = "missing_input"
ZERO_DENOM = "zero_denominator"
NEGATIVE_DENOM = "negative_denominator"
NON_POSITIVE_BASE = "non_positive_base"
NO_COMPARABLE = "no_comparable_period"


def _ratio(num, den, *, require_positive_den: bool) -> tuple[float | None, str | None]:
    """num/den with the denominator rule applied. Returns (value, reason)."""
    if num is None or den is None:
        return None, MISSING_INPUT
    den = float(den)
    if den == 0:
        return None, ZERO_DENOM
    if require_positive_den and den < 0:
        return None, NEGATIVE_DENOM
    return float(num) / den, None


def level_metrics(row: dict) -> tuple[dict, dict]:
    """Metrics computable from one period alone."""
    g = row.get
    out: dict[str, float] = {}
    skipped: dict[str, str] = {}

    # (name, numerator, denominator, denominator must be > 0)
    #
    # require_positive=True wherever a negative denominator would flip the
    # sign and produce a healthy-looking number for an unhealthy balance
    # sheet: equity-based ratios, and anything divided by revenue or income.
    spec = [
        ("net_margin", g("net_income"), g("revenue"), True),
        ("roa", g("net_income"), g("total_assets"), True),
        ("roe", g("net_income"), g("total_equity"), True),
        ("asset_turnover", g("revenue"), g("total_assets"), True),
        ("equity_ratio", g("total_equity"), g("total_assets"), True),
        ("liabilities_to_assets", g("total_liabilities"), g("total_assets"), True),
        ("debt_to_equity", g("total_liabilities"), g("total_equity"), True),
        ("equity_multiplier", g("total_assets"), g("total_equity"), True),
        ("ocf_margin", g("operating_cash_flow"), g("revenue"), True),
        # Cash conversion only reads as "quality of earnings" when there are
        # earnings to convert; at net_income <= 0 the quotient is noise.
        ("cash_conversion", g("operating_cash_flow"), g("net_income"), True),
    ]
    for name, num, den, pos in spec:
        v, why = _ratio(num, den, require_positive_den=pos)
        if v is None:
            skipped[name] = why
        else:
            out[name] = v

    # DuPont identity, reported only when all three legs exist. It is a
    # decomposition of ROE, not an extra estimate of it -- so if it disagrees
    # with the directly computed ROE, one of the raw fields is inconsistent,
    # which is worth surfacing rather than hiding.
    legs = ("net_margin", "asset_turnover", "equity_multiplier")
    if all(k in out for k in legs):
        dupont = out["net_margin"] * out["asset_turnover"] * out["equity_multiplier"]
        out["roe_dupont"] = dupont
        if "roe" in out and abs(dupont - out["roe"]) > 1e-6 * max(1.0, abs(out["roe"])):
            skipped["roe_dupont_matches_roe"] = "identity_mismatch"
    else:
        skipped["roe_dupont"] = MISSING_INPUT

    return out, skipped


def _growth(current, base) -> tuple[float | None, str | None]:
    """Period-over-period change. Requires a POSITIVE base: a percentage
    change measured from a negative or zero starting value has no
    interpretable sign, so it is withheld rather than printed."""
    if current is None or base is None:
        return None, MISSING_INPUT
    base = float(base)
    if base <= 0:
        return None, NON_POSITIVE_BASE
    return (float(current) - base) / base, None


def comparable_key(row: dict) -> tuple[str, int | None]:
    """The slot a period occupies within its year, so growth pairs like with
    like. Annual rows share one slot; quarterly rows are keyed by quarter
    number parsed from the label ("Q3 2025" -> 3)."""
    if row["period_type"] == "annual":
        return ("annual", None)
    label = str(row.get("period_label") or "")
    q = None
    if label.upper().startswith("Q") and len(label) > 1 and label[1].isdigit():
        q = int(label[1])
    return ("quarterly", q)


def growth_metrics(row: dict, by_key: dict) -> tuple[dict, dict]:
    """Year-over-year change against the same slot one year earlier."""
    out: dict[str, float] = {}
    skipped: dict[str, str] = {}
    kind, slot = comparable_key(row)
    year = row["period_end"].year
    prior = by_key.get((kind, slot, year - 1))
    fields = ("revenue", "net_income", "total_assets", "eps")
    if prior is None:
        for f in fields:
            skipped[f"{f}_yoy"] = NO_COMPARABLE
        return out, skipped
    for f in fields:
        v, why = _growth(row.get(f), prior.get(f))
        if v is None:
            skipped[f"{f}_yoy"] = why
        else:
            out[f"{f}_yoy"] = v
    return out, skipped


def derive_for_company(rows: list[dict]) -> list[dict]:
    by_key = {}
    for r in rows:
        kind, slot = comparable_key(r)
        by_key[(kind, slot, r["period_end"].year)] = r

    out = []
    for r in sorted(rows, key=lambda x: (x["period_type"], x["period_end"])):
        m, s = level_metrics(r)
        gm, gs = growth_metrics(r, by_key)
        m.update(gm)
        s.update(gs)
        out.append(
            {
                "period_type": r["period_type"],
                "period_label": r["period_label"],
                "period_end": r["period_end"].isoformat(),
                "metrics": m,
                "skipped": s,
            }
        )
    return out


def load_rows(db_path: Path) -> dict[str, list[dict]]:
    import duckdb

    con = duckdb.connect(str(db_path), read_only=True)
    cols = ["symbol", "period_type", "period_label", "period_end", *RAW_FIELDS]
    sql = f"SELECT {', '.join(cols)} FROM financials"
    by_symbol: dict[str, list[dict]] = {}
    for rec in con.execute(sql).fetchall():
        row = dict(zip(cols, rec))
        by_symbol.setdefault(row["symbol"], []).append(row)
    con.close()
    return by_symbol


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--db", default=str(DEFAULT_DB))
    p.add_argument("--out", default=str(DEFAULT_OUT))
    args = p.parse_args()

    by_symbol = load_rows(Path(args.db))
    derived = {sym: derive_for_company(rows) for sym, rows in by_symbol.items()}

    n_periods = sum(len(v) for v in derived.values())
    n_values = sum(len(p["metrics"]) for v in derived.values() for p in v)
    n_skipped = sum(len(p["skipped"]) for v in derived.values() for p in v)
    reasons: dict[str, int] = {}
    for v in derived.values():
        for per in v:
            for why in per["skipped"].values():
                reasons[why] = reasons.get(why, 0) + 1

    Path(args.out).write_text(json.dumps(derived, ensure_ascii=False), encoding="utf-8")
    print(f"companies      : {len(derived)}")
    print(f"periods        : {n_periods}")
    print(f"derived values : {n_values}")
    print(f"withheld       : {n_skipped}")
    for why, n in sorted(reasons.items(), key=lambda kv: -kv[1]):
        print(f"   {why:24s} {n}")
    print(f"-> {args.out}")


if __name__ == "__main__":
    main()
