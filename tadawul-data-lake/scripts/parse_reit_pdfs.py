# -*- coding: utf-8 -*-
"""
Parses the 20 REIT interim financial-statement PDFs downloaded from
saudiexchange.sa (data-lake/pdf_test/{ticker}.pdf) into the same
financials_long shape used for regular companies.

Why this exists: saudiexchange.sa's public company-profile page shows
REITs a report-publication-date schedule instead of an actual income
statement/balance sheet table (unlike every other company on the
exchange) - the real numbers only exist in the linked PDF financial
statements. See tadawul-data-lake/README.md for how the PDF URLs were
found (per-REIT announcement search, not a generic pattern).

RTL text handling: pdfplumber (no external binary needed, unlike
pdftoppm/poppler) extracts each line's glyphs in physical left-to-right
x-position order. For a right-to-left page this makes Arabic LETTER
sequences read backward, but Eastern Arabic NUMBER sequences stay in
correct reading order (numbers are a "weak" LTR run embedded in RTL
text per the Unicode bidi algorithm, so naive left-to-right extraction
doesn't scramble them the way it does letters). Fix applied here:
reverse the whole line's characters, then re-reverse just the digit-
group substrings back to their original order - a minimal bidi
correction sufficient for finding labeled rows, not a full bidi engine.

Run: python parse_reit_pdfs.py
"""
import io
import json
import re
import unicodedata
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parent.parent
PDF_DIR = ROOT / "data-lake" / "pdf_test"
OUT_PATH = ROOT / "data-lake" / "raw" / "reit_financials.json"

EASTERN_DIGITS = "٠١٢٣٤٥٦٧٨٩"
DIGIT_RUN_RE = re.compile(r"[0-9٠-٩][0-9٠-٩,،٬.\-]*[0-9٠-٩]|[0-9٠-٩]")


def fix_bidi_line(line: str) -> str:
    reversed_line = line[::-1]
    def restore_digits(m):
        return m.group(0)[::-1]
    fixed = DIGIT_RUN_RE.sub(restore_digits, reversed_line)
    # Arabic presentation-form ligatures (e.g. the single glyph for
    # "لأ") survive the character reversal as one unit but don't match
    # a plain "لأ" substring search - NFKC expands them back to their
    # base letter sequence.
    return unicodedata.normalize("NFKC", fixed)


def to_ascii_number(s: str):
    s = s.translate(str.maketrans(EASTERN_DIGITS, "0123456789"))
    s = s.replace(",", "").replace("،", "").replace("٬", "")
    neg = s.strip().startswith("(") and s.strip().endswith(")")
    s = s.strip("()").strip()
    try:
        val = float(s)
        return -val if neg else val
    except ValueError:
        return None


# Canonical (already bidi-fixed, i.e. normal reading-order) label ->
# our field name. Matched as a substring so minor per-fund wording
# differences (e.g. extra spaces) still hit.
# Each field: list of (all-required-substrings) alternatives, checked in
# order - first alternative whose every substring is present wins. Built
# from the actual wording seen across the 20 REITs, which vary in verb
# gender ("العائد" vs "العائدة"), "الأصول" vs "الموجودات", and
# "الالتزامات" vs "المطلوبات". A pure exact-phrase match kept missing
# these gender/synonym variants, so this checks for co-occurring stems
# instead of one fixed phrase.
LABEL_RULES = [
    ("total_assets", [("مجموع", "الأصول"), ("إجمالي", "الأصول"),
                       ("مجموع", "الموجودات"), ("إجمالي", "الموجودات")]),
    ("total_liabilities", [("مجموع", "الالتزامات"), ("إجمالي", "الالتزامات"),
                            ("مجموع", "المطلوبات"), ("إجمالي", "المطلوبات")]),
    ("total_equity", [("صافي", "الوحدات"), ("صافي", "المساهمين")]),
    ("revenue", [("إيرادات", "إيجار"), ("إجمالي", "الإيرادات"), ("مجموع", "الإيرادات")]),
    ("net_income", [("الربح", "للفترة"), ("الخسارة", "للفترة"),
                     ("ربح", "الفترة"), ("خسارة", "الفترة")]),
]


def parse_one(ticker: str):
    path = PDF_DIR / f"{ticker}.pdf"
    if not path.exists():
        return None
    result = {}
    with pdfplumber.open(str(path)) as pdf:
        for page in pdf.pages[:10]:  # statements are always in the first ~10 pages
            text = page.extract_text() or ""
            for raw_line in text.split("\n"):
                # Not every REIT's PDF was generated the same way: some
                # extract with each line's Arabic glyphs in reversed
                # (mirror) order needing fix_bidi_line, others (a
                # different PDF generator, seen on 4346/4347) already
                # extract in correct reading order - applying the bidi
                # fix to those would scramble otherwise-correct text.
                # Try both and use whichever orientation actually
                # contains a real Arabic label stem, rather than
                # guessing per-file up front.
                candidates = [raw_line, fix_bidi_line(raw_line)]
                stems_present = lambda s: any(
                    any(all(st in s for st in stems) for stems in alts) for _, alts in LABEL_RULES
                )
                line = next((c for c in candidates if stems_present(c)), raw_line)
                # Exclude lines that would false-positive-match a totals
                # rule but are actually a different, adjacent line item:
                # "unearned rental revenue" is a liability line containing
                # both "إيرادات" and "إيجار" (would look like the revenue
                # rule); "per-unit" NAV lines contain "الوحدة" + "بالقيمة"
                # and would look like the total_equity rule.
                if "غير مكتسبة" in line or "بالقيمة" in line:
                    continue
                for field, alternatives in LABEL_RULES:
                    if field in result:
                        continue
                    matched_stems = next((stems for stems in alternatives if all(s in line for s in stems)), None)
                    if matched_stems is None:
                        continue
                    # Numbers sit after the label text in the bidi-fixed
                    # line (label was originally rightmost on the RTL
                    # page = read first; columns follow left-to-right:
                    # [most recent period, comparative period, ...]).
                    last_stem = matched_stems[-1]
                    idx = line.rfind(last_stem)
                    suffix = line[idx + len(last_stem):] if idx >= 0 else line
                    nums = re.findall(r"\(?-?[\d,.٬]+\)?", suffix)
                    parsed = [to_ascii_number(n) for n in nums]
                    parsed = [p for p in parsed if p is not None]
                    # A lone number under 1,000 with nothing after it is
                    # almost always a table-of-contents page reference
                    # (e.g. "...قائمة التغيرات... 4" = "see page 4"), not
                    # a real financial figure - every genuine line item
                    # in these statements is in the thousands at least.
                    if len(parsed) == 1 and abs(parsed[0]) < 1000:
                        continue
                    if parsed:
                        result[field] = parsed[0]
                        result[field + "_prior"] = parsed[1] if len(parsed) > 1 else None
    result["ticker"] = ticker
    # Sanity check: assets - liabilities should equal equity (a REIT's
    # net-assets-attributable-to-unit-holders line) to within rounding.
    # A big mismatch means a wrong line was matched (e.g. a per-unit NAV
    # figure instead of the total) - drop that field rather than keep a
    # silently-wrong number, consistent with this session's standing
    # rule of removing bad data instead of guessing.
    if all(k in result for k in ("total_assets", "total_liabilities", "total_equity")):
        implied = result["total_assets"] - result["total_liabilities"]
        if result["total_equity"] and abs(implied - result["total_equity"]) / max(abs(implied), 1) > 0.05:
            result["total_equity_flagged_wrong"] = result.pop("total_equity")
            result.pop("total_equity_prior", None)
    return result


def main():
    all_tickers = ["4330", "4331", "4332", "4333", "4334", "4335", "4336", "4337", "4338", "4339",
                   "4340", "4342", "4344", "4345", "4346", "4347", "4348", "4349", "4350", "9300"]
    results = {}
    for t in all_tickers:
        r = parse_one(t)
        if r:
            results[t] = r
            got = [k for k in r if not k.endswith("_prior") and k != "ticker"]
            print(f"{t}: parsed fields = {got}")
        else:
            print(f"{t}: PDF not found")
    OUT_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nSaved {len(results)} REITs -> {OUT_PATH}")


if __name__ == "__main__":
    main()
