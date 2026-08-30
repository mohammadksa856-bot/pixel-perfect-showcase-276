# -*- coding: utf-8 -*-
"""
Adds balance-sheet figures for REITs whose statement pages are scanned
images with NO extractable text layer (pdfplumber gets 0 characters on
every page) - parse_reit_pdfs.py structurally cannot help here, since
there is no text to match labels against.

Installed Tesseract OCR (tessdata/ under this repo, TESSDATA_PREFIX env
var) to try automated OCR first. It read the Arabic LABELS on these
pages perfectly, but the NUMBER columns came out as unusable garbage
(e.g. "ذو التمصحقطغفت" where a real value should be) - the scan's ~200
DPI is fine for word shapes but not for the tighter digit-grouping
characters (Eastern Arabic commas/thousands separators) in these
particular tables. Rather than trust OCR'd numbers a human can't quickly
verify, each page was instead rendered at native resolution and read
directly (a human/vision pass, not a text-extraction algorithm) - the
scans are sharp enough for that even where OCR's character segmentation
fails. Every figure below was cross-checked against the sanity rule used
throughout this module: assets - liabilities == equity, exact to the
SAR - see the per-ticker comments.

Of the 7 tickers with zero extractable text, 4 turned out to be legible
scans (this module); the other 3 (4339, 4340, 4350) are genuinely
degraded scans - most of each page is blank/near-white even under
strong contrast enhancement (checked directly), not a formatting or
resolution problem OCR or a closer look could fix. Left untouched.

Run: python add_manual_reit_reads.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / "data-lake" / "raw" / "reit_financials.json"

# ticker -> (total_assets, total_assets_prior, total_liabilities,
#            total_liabilities_prior, total_equity, total_equity_prior)
# Current period = 30 June 2026 (unaudited); prior = 31 Dec 2025 (audited),
# matching every other REIT's period pairing in this file. All in SAR
# (4338's source page states the table is in thousands of SAR - scaled
# up here for consistency with the rest of the file, which stores raw
# SAR throughout).
MANUAL_READS = {
    # 4334 - المعذر ريت: 717,440,533 - 214,221,040 = 503,219,493 (exact);
    # 728,733,581 - 221,532,263 = 507,201,318 (exact).
    "4334": (717440533, 728733581, 214221040, 221532263, 503219493, 507201318),
    # 4338 - الأهلي ريت 1 (figures in thousands SAR on the source page,
    # x1000 here): 2,009,631 - 854,839 = 1,154,792 (exact);
    # 1,988,410 - 836,095 = 1,152,315 (exact).
    "4338": (2009631000, 1988410000, 854839000, 836095000, 1154792000, 1152315000),
    # 4345 - الإنماء ريت للتجزئة: 1,401,080,151 - 694,095,402 = 706,984,749
    # (exact); 1,460,792,499 - 687,378,635 = 773,413,864 (exact).
    "4345": (1401080151, 1460792499, 694095402, 687378635, 706984749, 773413864),
    # 4349 - الإنماء ريت الفندقي: 1,023,831,894 - 17,041,247 = 1,006,790,647
    # (exact); 1,024,885,298 - 9,809,060 = 1,015,076,238 (exact).
    "4349": (1023831894, 1024885298, 17041247, 9809060, 1006790647, 1015076238),
}


def main():
    data = json.loads(OUT_PATH.read_text(encoding="utf-8"))
    for ticker, (ta, ta_p, tl, tl_p, te, te_p) in MANUAL_READS.items():
        entry = data.setdefault(ticker, {"ticker": ticker})
        entry.update({
            "total_assets": ta, "total_assets_prior": ta_p,
            "total_liabilities": tl, "total_liabilities_prior": tl_p,
            "total_equity": te, "total_equity_prior": te_p,
        })
        implied = ta - tl
        assert implied == te, f"{ticker}: {implied} != {te}"
        implied_p = ta_p - tl_p
        assert implied_p == te_p, f"{ticker} prior: {implied_p} != {te_p}"
    OUT_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Added/updated {len(MANUAL_READS)} tickers -> {OUT_PATH}")


if __name__ == "__main__":
    main()
