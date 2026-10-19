"""Apply the quarter-end balance proposal to an EXPORTED engine tree (never the original working tree).

Changes src/finengine/query.py of b70254e only:
  * period_history(..., quarter_ends_only=True): instant periods at fiscal quarter ends, excluding the fiscal
    year end (which stays in annual_position); exclusive with annual_only.
  * company_page: new additive key sections.financials.history.quarter_position (12 periods, instant identities).
    Every existing key and value is unchanged; contract_version is unchanged because the change is additive.
Usage: python3 apply_proposal.py <exported-engine-root>
"""
import sys
from pathlib import Path

root = Path(sys.argv[1])
q = root / "src/finengine/query.py"
s = q.read_text(encoding="utf-8")


def sub(old: str, new: str) -> None:
    global s
    if s.count(old) != 1:
        raise SystemExit(f"anchor not found exactly once: {old[:60]!r}")
    s = s.replace(old, new)


sub('''        metrics: tuple[str, ...], periods: int = 5, annual_only: bool = False,
    ) -> dict:
        """Return sourced, period-safe history for page charts and comparison tables."""''',
'''        metrics: tuple[str, ...], periods: int = 5, annual_only: bool = False,
        quarter_ends_only: bool = False,
    ) -> dict:
        """Return sourced, period-safe history for page charts and comparison tables.

        ``quarter_ends_only`` keeps instants dated at a fiscal quarter end other than the fiscal year end, so
        quarter-end balances never mix with year-end balances (``annual_only``) or with quarterly flows.
        """
        if annual_only and quarter_ends_only:
            raise ValueError("annual_only and quarter_ends_only are mutually exclusive")''')
sub('''        annual_filter = " AND substr(period_end,6,5)=?" if annual_only else ""
        annual_args = (company["fiscal_year_end"],) if annual_only else ()''',
'''        if quarter_ends_only:
            days = self._quarter_end_days(company["fiscal_year_end"])
            if period_kind != "instant" or not days:
                return {"status": "unavailable", "reason": "no_quarter_end_positions",
                        "period_kind": period_kind, "periods": []}
            annual_filter = f" AND substr(period_end,6,5) IN ({','.join('?' for _ in days)})"
            annual_args = tuple(days)
        else:
            annual_filter = " AND substr(period_end,6,5)=?" if annual_only else ""
            annual_args = (company["fiscal_year_end"],) if annual_only else ()''')
sub('''    @staticmethod
    def _availability(items: list | dict, missing_reason: str, partial: bool = False) -> dict:''',
'''    @staticmethod
    def _quarter_end_days(fiscal_year_end: str | None) -> tuple[str, ...]:
        """MM-DD month ends of the three fiscal quarter ends before the fiscal year end (both Feb ends)."""
        import calendar
        try:
            month, day = (int(x) for x in str(fiscal_year_end).split("-"))
        except (TypeError, ValueError):
            return ()
        if not 1 <= month <= 12 or day != calendar.monthrange(2001, month)[1] and not (month == 2 and day == 29):
            return ()
        out = []
        for k in (3, 6, 9):
            m = (month + k - 1) % 12 + 1
            out += ["02-28", "02-29"] if m == 2 else [f"{m:02d}-{calendar.monthrange(2001, m)[1]:02d}"]
        return tuple(out)

    @staticmethod
    def _availability(items: list | dict, missing_reason: str, partial: bool = False) -> dict:''')
sub('''        quarterly_history = self.period_history(market, symbol, "quarter", (''',
'''        quarter_position_history = self.period_history(market, symbol, "instant", (
            "cash", "cash_and_cash_equivalents", "current_assets", "total_assets",
            "current_liabilities", "total_liabilities", "total_debt", "net_debt",
            "parent_equity", "equity_parent", "total_equity", "shares_outstanding",
        ), 12, quarter_ends_only=True)
        quarterly_history = self.period_history(market, symbol, "quarter", (''')
sub('''                                           "annual_position": balance_history,
                                           "quarter": quarterly_history}},''',
'''                                           "annual_position": balance_history,
                                           "quarter": quarterly_history,
                                           "quarter_position": quarter_position_history}},''')
q.write_text(s, encoding="utf-8")
print("applied", q)
