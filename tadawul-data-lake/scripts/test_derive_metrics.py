"""Tests for derive_metrics.py.

The arithmetic is trivial; the denominator and period-pairing rules are the
whole point, so those are what get pinned. Each test states the wrong answer
it exists to prevent.

Run: python3 -m pytest scripts/test_derive_metrics.py -q
"""

import datetime as dt

from derive_metrics import (
    MISSING_INPUT,
    NEGATIVE_DENOM,
    NO_COMPARABLE,
    NON_POSITIVE_BASE,
    ZERO_DENOM,
    comparable_key,
    derive_for_company,
    level_metrics,
)


def row(period_type="annual", label="2025", end=(2025, 12, 31), **fields):
    base = {
        "symbol": "TEST",
        "period_type": period_type,
        "period_label": label,
        "period_end": dt.date(*end),
        "revenue": None,
        "net_income": None,
        "total_assets": None,
        "total_liabilities": None,
        "total_equity": None,
        "eps": None,
        "operating_cash_flow": None,
        "investing_cash_flow": None,
        "financing_cash_flow": None,
    }
    base.update(fields)
    return base


# ───────────────────────── denominator rules


def test_negative_equity_withholds_roe_instead_of_reporting_a_positive_number():
    """The failure this prevents: a loss-making, insolvent company. Dividing a
    negative profit by negative equity yields a POSITIVE ROE that reads as a
    healthy return. 11 rows in the real lake have negative equity."""
    m, s = level_metrics(row(net_income=-500, total_equity=-1000, total_assets=2000))
    assert "roe" not in m
    assert s["roe"] == NEGATIVE_DENOM
    # the naive computation would have produced +0.5, i.e. "50% return"
    assert -500 / -1000 == 0.5
    # an assets-based return still works, because assets are positive
    assert m["roa"] == -0.25


def test_negative_equity_also_withholds_the_other_equity_ratios():
    # net_income supplied deliberately: without it roe is withheld for
    # missing_input and the denominator rule is never the thing under test.
    m, s = level_metrics(
        row(net_income=-500, total_assets=2000, total_liabilities=3000, total_equity=-1000)
    )
    for name in ("roe", "debt_to_equity", "equity_multiplier"):
        assert name not in m, name
        assert s[name] == NEGATIVE_DENOM
    # asset-denominated views remain reportable and tell the real story
    assert m["liabilities_to_assets"] == 1.5


def test_zero_revenue_withholds_margins_rather_than_dividing_by_zero():
    m, s = level_metrics(row(revenue=0, net_income=-40, total_assets=100))
    # revenue is the DENOMINATOR of a margin, so a margin is not computable
    assert "net_margin" not in m and s["net_margin"] == ZERO_DENOM
    assert "ocf_margin" not in m and s["ocf_margin"] == MISSING_INPUT
    # but revenue is the NUMERATOR of asset turnover, and a turnover of 0.0
    # against positive assets is a true, meaningful figure -- not a gap. The
    # mistake this pins is withholding it as though zero revenue broke it.
    assert m["asset_turnover"] == 0.0
    assert m["roa"] == -0.4


def test_cash_conversion_withheld_when_there_are_no_earnings_to_convert():
    """OCF / net_income is read as earnings quality. At net_income <= 0 the
    quotient carries no such meaning, and a negative one inverts it."""
    m, s = level_metrics(row(operating_cash_flow=800, net_income=-200, revenue=1000))
    assert "cash_conversion" not in m
    assert s["cash_conversion"] == NEGATIVE_DENOM
    # but OCF margin is still meaningful against positive revenue
    assert m["ocf_margin"] == 0.8


def test_missing_input_is_distinguished_from_a_bad_denominator():
    m, s = level_metrics(row(net_income=100))
    assert s["roe"] == MISSING_INPUT
    assert s["net_margin"] == MISSING_INPUT


def test_healthy_company_gets_every_level_metric():
    m, s = level_metrics(
        row(
            revenue=1000, net_income=100, total_assets=2000,
            total_liabilities=800, total_equity=1200, eps=2.0,
            operating_cash_flow=150,
        )
    )
    assert m["net_margin"] == 0.1
    assert m["roa"] == 0.05
    assert abs(m["roe"] - 100 / 1200) < 1e-12
    assert m["asset_turnover"] == 0.5
    assert m["equity_ratio"] == 0.6
    assert m["liabilities_to_assets"] == 0.4
    assert abs(m["cash_conversion"] - 1.5) < 1e-12
    assert not any(v in (ZERO_DENOM, NEGATIVE_DENOM, MISSING_INPUT) for v in s.values())


def test_dupont_decomposition_reproduces_roe():
    m, _ = level_metrics(
        row(revenue=1000, net_income=100, total_assets=2000, total_equity=1200)
    )
    assert abs(m["roe_dupont"] - m["roe"]) < 1e-12


# ───────────────────────── growth rules


def test_growth_off_a_negative_base_is_withheld_not_printed_as_a_percentage():
    """SABIC went from a 2.77B loss to 1.54B profit. That is not '+155%'; a
    percentage change from a negative base has no interpretable sign."""
    rows = [
        row(label="2024", end=(2024, 12, 31), net_income=-2_770, total_assets=100),
        row(label="2025", end=(2025, 12, 31), net_income=1_540, total_assets=100),
    ]
    out = derive_for_company(rows)
    latest = next(p for p in out if p["period_label"] == "2025")
    assert "net_income_yoy" not in latest["metrics"]
    assert latest["skipped"]["net_income_yoy"] == NON_POSITIVE_BASE
    # the asset base is positive, so that growth figure is still produced
    assert latest["metrics"]["total_assets_yoy"] == 0.0


def test_annual_growth_pairs_with_the_prior_fiscal_year():
    rows = [
        row(label="2024", end=(2024, 12, 31), revenue=1000),
        row(label="2025", end=(2025, 12, 31), revenue=1200),
    ]
    out = derive_for_company(rows)
    latest = next(p for p in out if p["period_label"] == "2025")
    assert abs(latest["metrics"]["revenue_yoy"] - 0.2) < 1e-12


def test_quarterly_growth_pairs_with_the_same_quarter_a_year_earlier():
    rows = [
        row("quarterly", "Q2 2025", (2025, 6, 30), revenue=400),
        row("quarterly", "Q3 2025", (2025, 9, 30), revenue=900),
        row("quarterly", "Q2 2026", (2026, 6, 30), revenue=500),
    ]
    out = derive_for_company(rows)
    q2_26 = next(p for p in out if p["period_label"] == "Q2 2026")
    # 500 vs Q2 2025's 400 = +25%. Pairing against the adjacent Q3 2025 (900)
    # would have reported -44%, which is seasonality, not decline.
    assert abs(q2_26["metrics"]["revenue_yoy"] - 0.25) < 1e-12


def test_a_quarter_with_no_counterpart_reports_no_comparable_period():
    """Aramco really does have Q1 2026 with no Q1 2025 in this lake."""
    rows = [
        row("quarterly", "Q1 2026", (2026, 3, 31), revenue=500),
        row("quarterly", "Q3 2025", (2025, 9, 30), revenue=900),
    ]
    out = derive_for_company(rows)
    q1 = next(p for p in out if p["period_label"] == "Q1 2026")
    assert "revenue_yoy" not in q1["metrics"]
    assert q1["skipped"]["revenue_yoy"] == NO_COMPARABLE


def test_annual_and_quarterly_rows_never_pair_with_each_other():
    rows = [
        row("annual", "2025", (2025, 12, 31), revenue=4000),
        row("quarterly", "Q2 2026", (2026, 6, 30), revenue=500),
    ]
    out = derive_for_company(rows)
    q = next(p for p in out if p["period_type"] == "quarterly")
    assert q["skipped"]["revenue_yoy"] == NO_COMPARABLE
    a = next(p for p in out if p["period_type"] == "annual")
    assert a["skipped"]["revenue_yoy"] == NO_COMPARABLE


def test_comparable_key_parses_the_quarter_number():
    assert comparable_key(row("quarterly", "Q3 2025")) == ("quarterly", 3)
    assert comparable_key(row("annual", "2025")) == ("annual", None)


# ───────────────────────── scope guard


def test_no_metric_requiring_an_absent_raw_field_is_ever_produced():
    """Guards the module's stated scope. Free cash flow needs capex alone,
    which this source does not carry; OCF + investing CF is not free cash
    flow. If someone adds it, this fails."""
    m, _ = level_metrics(
        row(
            revenue=1000, net_income=100, total_assets=2000, total_equity=1200,
            operating_cash_flow=300, investing_cash_flow=-200, financing_cash_flow=-50,
        )
    )
    forbidden = ("free_cash_flow", "fcf", "net_debt", "ev_ebitda", "ebitda", "gross_margin")
    assert not [k for k in m if any(f in k for f in forbidden)]
