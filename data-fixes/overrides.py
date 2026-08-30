# -*- coding: utf-8 -*-
"""
Confirmed-correct values that MUST survive any future data refresh
(new Excel/WiseSheets pull, a fresh FMP import, etc.).

Why this file exists: every value pulled from WiseSheets/FMP is only as
good as its last import. When we hand-verify a number against Tadawul/
Argaam/the company's own earnings release and it turns out the source
feed was wrong, patching Supabase directly fixes it *until the next
import overwrites it with the same wrong value again*. This file is the
single place those corrections live so `apply_overrides.py` can
reassert them after any refresh - see that file's docstring for how.

Each entry documents its source so a future reviewer can tell a
confirmed correction from a guess.
"""

# ---------------------------------------------------------------------
# Shares outstanding (see fix_shares_and_market_cap.py in past sessions)
# Source: Argaam's official capital/market-cap tables
# (argaam.com/ar/monitors/ratios-summary/marketcap/3 and /14), cross-
# checked against Tadawul announcement history for REITs excluded from
# that table.
# ---------------------------------------------------------------------
CONFIRMED_SHARES = {
    "1010": 4_000_000_000,   # Riyad Bank
    "1120": 6_000_000_000,   # Al Rajhi Bank
    "1150": 3_000_000_000,   # Alinma Bank
    "1210": 27_500_000,      # BCI (Basic Chemical Industries)
    "1810": 274_050_000,     # Seera Group
    "1820": 619_670_000,     # BAAN Holding
    "1831": 600_000_000,     # Maharah
    "1833": 20_000_000,      # Al Mawarid Manpower
    "2001": 15_000_000,      # Kayan Chemicals (Kemanol)
    "2130": 30_000_000,      # Sadaq
    "2200": 252_000_000,     # Anabeeb
    "3007": 225_000_000,     # Al Waha (Zahrat Al Waha)
    "4001": 900_000_000,     # A.Othaim Markets
    "4040": 125_000_000,     # Saptco
    "4082": 71_430_000,      # Mrna
    "4083": 75_000_000,      # Tasheel
    "4180": 275_000_000,     # Fitaihi Holding Group
    "4193": 115_500_000,     # Nice One
    "4220": 882_930_000,     # Emaar Economic City
    "4230": 48_270_000,      # Red Sea International
    "6012": 7_310_000,       # Ridan
    "9538": 7_730_000,       # Naseej for Technology
    "9543": 7_500_000,       # Networkers
    "9557": 7_560_000,       # Edarat
    "9561": 5_250_000,       # NoLegend
    "9569": 57_000_000,      # Al Muneef
    "9578": 9_000_000,       # Atlas Elevators
    "9580": 12_000_000,      # Al Rashid Industry
    "9585": 9_000_000,       # Melkeya
    "9594": 71_250_000,      # Al Modawat
    "9603": 2_500_000,       # Horizon Educational
    "4340": 161_856_857,     # Al Rajhi REIT Fund (Tadawul announcement history)
}

# ---------------------------------------------------------------------
# Revenue (annual, 2025 fiscal year only unless noted). WiseSheets/FMP
# pulled the LATEST year's "revenue" for these companies on a different
# (larger, gross) basis than every prior year, which silently collapses
# the shown margin. Diagnosed by comparing revenue_y0/revenue_y1 in the
# master WiseSheets export against each company's officially disclosed
# YoY operating-income growth. "exact" values come straight from an
# earnings release; "growth" values are prior-year revenue scaled by a
# disclosed growth rate; growth values marked estimate had no single
# clean annual % available (only quarterly figures) and should be
# replaced with an exact figure if one turns up.
# ---------------------------------------------------------------------
CONFIRMED_REVENUE = {
    "1120": {"year": "2025", "value": 31_912_742_000 * 1.22,
             "basis": "growth", "note": "Al Rajhi Bank +22% YoY total operating income, confirmed exact (Argaam)"},
    "1060": {"year": "2025", "value": 14_136_138_000 * 1.05,
             "basis": "growth", "note": "SAB +5% YoY total operating income, confirmed exact (sab.com)"},
    "1030": {"year": "2025", "value": 4_174_249_000 * 1.147,
             "basis": "growth", "note": "SAIB +14.7% YoY total operating income, confirmed exact (Argaam)"},
    "1140": {"year": "2025", "value": 5_654_008_000 * 1.09,
             "basis": "growth", "note": "Bank Albilad +9% YoY total operating income, confirmed exact (Argaam)"},
    "1020": {"year": "2025", "value": 3_779_125_000 * 1.17,
             "basis": "interim", "note": "Bank Al Jazira - no exact FY2025 total operating income found yet; "
             "using the actual disclosed 9-month-2025 growth rate (+17%, Argaam) as the best available proxy "
             "for the full year, NOT a guessed range midpoint. Replace with the exact FY2025 figure once published."},
    "1050": {"year": "2025", "value": 10_537_000_000,
             "basis": "exact", "note": "BSF FY2025 total operating income, exact figure from bsf.sa earnings release"},
    "1180": {"year": "2025", "value": 39_190_000_000,
             "basis": "exact", "note": "SNB (Al Ahli) FY2025 total operating income, exact figure from Argaam "
             "company-report/3413/2025/1, confirmed 2026-08-28. Same gross/net tagging bug as the other 6 banks "
             "above - this bank was missed in the first 10-bank batch (Argaam's own bank-sector table lists 10 "
             "banks incl. SNB; the earlier review only covered the 10 tickers already in our sheet's FIRST10 "
             "list, which excluded 1180)."},
    "2082": {"year": "2025", "value": 7_413_500_000,
             "basis": "exact", "note": "ACWA Power FY2025 total revenue, exact figure from Argaam "
             "company-report/4269/2025/1, confirmed 2026-08-28. Stored value (7.8B) was 5.3% off - not a "
             "bank-style gross/net bug, just a stale/wrong pull, found during the top-10-by-market-cap batch."},
    "8230": {"year": "2025", "value": 5_322_130_000,
             "basis": "exact", "note": "Al Rajhi Takaful FY2025 insurance revenue (net), exact figure from "
             "Argaam company-report/870/2025/1, confirmed 2026-08-29. Stored value (6.0B) was 12.7% off - "
             "same gross-written-premiums-vs-net-insurance-revenue tagging pattern as the bank gross/net bug, "
             "just for an insurer. Watch for this same pattern on other insurance tickers (8xxx sector)."},
    "8200": {"year": "2025", "value": 1_672_500_000,
             "basis": "exact", "note": "Saudi Re FY2025 insurance revenue, exact figure from Argaam "
             "company-report/1129/2025/1, confirmed 2026-08-29. Stored value was -101.5M (NEGATIVE, the exact "
             "REVENUE_NON_POSITIVE pattern flagged in the original internal audit) - confirmed with Argaam this "
             "is a real bug, not a legitimate reinsurance retrocession artifact: real insurance revenue is "
             "positive 1,672.5M (gross written premiums were 2,927.74M, for reference - don't use that instead)."},
    "2300": {"year": "2025", "value": 850_290_000, "net_income": 66_700_000,
             "basis": "exact", "note": "Saudi Paper Manufacturing (SPM) FY2025 - revenue was already correct "
             "(850.29M, kept as-is), but stored net income (60.5M) was 9.3% off Argaam's confirmed 66.70M "
             "(company-report/632/2025/1, confirmed 2026-08-29). Not a currency/tagging pattern, just wrong."},
    "4240": {"year": "2025", "value": 5_103_860_000, "net_income": -505_510_000,
             "basis": "exact", "note": "Cenomi Retail FY2025 - revenue already correct, but stored net loss "
             "(-457.3M) was 9.5% off Argaam's confirmed -505.51M (company-report/917/2025/1, confirmed "
             "2026-08-29). The negative equity (-1.46B, going-concern auditor warning) is itself CONFIRMED "
             "REAL, not a bug - do not 'fix' equity to a positive number."},
    # --- Insurance-sector sweep (2026-08-29): checked all remaining Tadawul
    # insurers not yet covered. 11 of 17 needed this same gross-premiums-vs-
    # net-insurance-revenue fix (on top of the 4 already fixed above:
    # 8230 Al Rajhi Takaful, 8200 Saudi Re, 8060 Walaa, 8070 Arabian Shield).
    # netIncome/equity were correct for every one of these - only revenue
    # was wrong. Confirmed clean (no fix needed): 8020 Malath, 8100 Saico,
    # 8160 Arab Insurance, 8170 Alittihad, 8180 Al Sagr, 8300 Wataniya.
    "9651": {"year": "2025", "value": 140_590_000,
             "basis": "exact", "note": "Altwijri FY2025 revenue was 155.9M, Argaam confirms 140.59M (9.8% off, "
             "company-report/15704/2025/1, confirmed 2026-08-30). The -14.6M net loss (unrealized FV "
             "revaluation losses) confirmed exact. See CONFIRMED_EQUITY below for the matching equity fix."},
    "9635": {"year": "2025", "value": 80_150_000, "net_income": 7_430_000,
             "basis": "exact", "note": "Dkhoun (perfume retail, IPO'd Nomu 2025-05-20) - stored revenue/netIncome/"
             "equity were ALL ~3.76x too low (21.3M/2.0M/17.1M vs Argaam-confirmed 80.15M/7.43M/64.371M SAR, "
             "company-report/17645/2025/1, confirmed 2026-08-30). THIS IS THE 4TH COMPANY with this exact same "
             "~3.75-3.76x ratio (also: Americana 6015, Almasar Alshamil 6019, Cherry 4265) - given the ratio is "
             "essentially identical every time and 3.75 is precisely the official SAR/USD peg, this looks like a "
             "genuine systematic WiseSheets import bug (not 4 independent 'wrong quarter' coincidences as first "
             "guessed for 6019/4265) - worth a dedicated sweep of ALL very-recent-2025-IPO tickers for the same "
             "signature ratio rather than waiting to hit them one by one in market-cap order. See CONFIRMED_EQUITY "
             "below for the matching equity fix.",
             },
    # --- Brand-new records: these 7 tickers had ZERO financials data at
    # all (empty financials[]/balance_sheet[] - not wrong, just never
    # imported, confirmed 2026-08-30). Prices already worked (separate
    # live feed) but the deeper financial-statements pipeline missed
    # them entirely, most because they're 2025 IPOs. Populating FY2025
    # from scratch via Argaam rather than leaving them blank.
    "4264": {"year": "2025", "value": 7_844_310_000, "net_income": -527_000_000,
             "basis": "exact", "note": "Flynas (IPO'd Tadawul 2025-06-18) - net LOSS driven by 1.083B in "
             "one-time IPO-related expenses; adjusted profit excluding those was 556M (+28% YoY). Loss is "
             "real, not a bug (company-report/4298/2025/1, confirmed 2026-08-30)."},
    "4084": {"year": "2025", "value": 934_510_000, "net_income": 400_160_000,
             "basis": "exact", "note": "Derayah Financial - FY2025, revenue +6.4% YoY, netIncome -9.9% YoY "
             "(company-report/4370/2025/1, confirmed 2026-08-30)."},
    "4327": {"year": "2025", "value": 1_187_790_000, "net_income": 280_990_000,
             "basis": "exact", "note": "Alramz Real Estate - FY2025, profit +77.4% YoY (company-report/14966/2025/1, confirmed 2026-08-30)."},
    "6018": {"year": "2025", "value": 376_240_000, "net_income": 41_170_000,
             "basis": "exact", "note": "Sport Clubs (Body Masters) - FY2025, revenue +14.9%/profit +14.0% YoY (5 new clubs) (company-report/16303/2025/1, confirmed 2026-08-30)."},
    "4147": {"year": "2025", "value": 477_140_000, "net_income": 46_600_000,
             "basis": "exact", "note": "CGS (FY ends March) - profit -29.6% YoY (company-report/3574/2025/1, confirmed 2026-08-30)."},
    "1324": {"year": "2025", "value": 739_520_000, "net_income": 91_660_000,
             "basis": "exact", "note": "Saleh Alrashed - FY2025, revenue +23.3%/profit +53.6% YoY (company-report/15208/2025/1, confirmed 2026-08-30)."},
    "4350": {"year": "2025", "value": 113_340_000, "net_income": -19_980_000,
             "basis": "exact", "note": "Alistithmar REIT (Arik REIT) - the -19.98M net loss is confirmed real "
             "(improved 247.2% YoY on an FFO basis; rental revenue nearly doubled) (company-report/16599/2025/1, confirmed 2026-08-30). See CONFIRMED_EQUITY/CONFIRMED_ASSETS below."},
    "7205": {"year": "2025", "value": 315_500_000, "net_income": 50_500_000,
             "basis": "exact", "note": "DBS / Dar Albalad for Business Solutions (IPO'd Tadawul May 2025) - "
             "stored revenue/netIncome/equity were ALL ~3.75x too low (83.9M/13.5M/45.5M vs confirmed "
             "315.5M/50.5M/170.829M SAR, company-report/17177/2025/1 + press, confirmed 2026-08-30). "
             "5TH CONFIRMED OCCURRENCE of the same systematic ~3.75-3.76x bug (also: Americana 6015, Almasar "
             "Alshamil 6019, Cherry 4265, Dkhoun 9635) - all five are companies that IPO'd in 2025. See "
             "CONFIRMED_EQUITY below for the matching equity fix."},
    "9650": {"year": "2025", "value": 197_650_000, "net_income": 20_680_000,
             "basis": "exact", "note": "Sahat Almajd Trading (IPO'd Nov 2025) - stored revenue/netIncome "
             "(52.6M/5.3M) were a PARTIAL PERIOD, not the confirmed full FY2025 figures of 197.65M/20.68M "
             "(company-report/18359/2025/1, confirmed 2026-08-30). See CONFIRMED_EQUITY below for the "
             "matching equity fix (was completely missing before)."},
    "9547": {"year": "2025", "value": 129_260_000, "net_income": -23_890_000,
             "basis": "exact", "note": "Rawasi Construction FY2025 - SIGN FLIP BUG: stored netIncome was "
             "+23.9M (a profit) but Argaam confirms it's actually a LOSS of -23.89M (company-report/12766/2025/1, "
             "confirmed 2026-08-30) - explicit press text: 'shifted from profits of 7.5M in 2024 to losses of "
             "23.9M in 2025'. The magnitude was right, only the sign was wrong. Revenue was already correct "
             "(kept, matches Argaam's 129.26M almost exactly)."},
    "9602": {"year": "2025", "value": 73_330_000,
             "basis": "exact", "note": "Yaqeen Financial FY2025 revenue was 79.3M, Argaam confirms 73.33M "
             "(7.5% off, company-report/3659/2025/1, confirmed 2026-08-30). netIncome/equity already correct."},
    "9585": {"year": "2025", "value": 42_390_000,
             "basis": "exact", "note": "Mulkia Investment FY2025 revenue was 38.7M, Argaam confirms 42.39M "
             "(8.7% off, company-report/15978/2025/1, confirmed 2026-08-29). netIncome/equity already correct."},
    "4082": {"year": "2025", "value": 218_480_000,
             "basis": "exact", "note": "MRNA FY2025 revenue was 233.6M, Argaam confirms 218.48M (6.5% off, "
             "company-report/4696/2025/1, confirmed 2026-08-29). netIncome/equity already correct."},
    "4265": {"year": "2025", "value": 517_890_000, "net_income": 71_040_000,
             "basis": "exact", "note": "Cherry Trading Co (car rental) FY2025 - stored revenue/netIncome/equity "
             "were ALL ~3.76x too low (140.0M/18.9M/155.8M vs Argaam-confirmed 517.89M/71.04M/585.206M SAR, "
             "company-report/17877/2025/1, confirmed 2026-08-29) - the SAME ratio and pattern as Almasar "
             "Alshamil (6019) above. Verified this is NOT a currency issue (purely domestic KSA car rental "
             "company, IPO'd 2025-12-01, priced/reports in SAR, confirmed via press). With Cherry and Almasar "
             "Alshamil both IPO'd within ~2 months of each other showing the identical ~3.76x gap, this looks "
             "like a systematic WiseSheets import bug for VERY RECENT IPOs - likely one quarter's post-listing "
             "figures landing in the annual field instead of the full year. WATCH FOR THIS on any other company "
             "that IPO'd in Oct-Dec 2025 during future review batches.",
             },
    "9583": {"year": "2025", "value": 201_850_000, "net_income": 18_760_000,
             "basis": "exact", "note": "United Mining FY2025 - netIncome field was completely MISSING/blank in "
             "our DB despite Argaam having a clear figure (18.76M, company-report/15968/2025/1, confirmed "
             "2026-08-29). Revenue (201.9M stored) was already correct, reasserted here unchanged."},
    "4348": {"year": "2025", "value": 135_060_000,
             "basis": "exact", "note": "Alkhabeer REIT FY2025 rental revenue was 125.7M, Argaam confirms 135.06M "
             "(6.9% off, company-report/5026/2025/1, confirmed 2026-08-29). netIncome/equity already correct."},
    "9541": {"year": "2025", "value": 176_460_000, "net_income": 33_770_000,
             "basis": "exact", "note": "Academy of Learning FY2025 (12mo ending June 30) - netIncome was 29.8M "
             "vs Argaam's confirmed 33.77M (11.8% off), revenue was close enough already (2.4% off, kept). "
             "Equity needs a separate fix - see CONFIRMED_EQUITY below (158.4M stored vs 144.304M confirmed, "
             "8.9% off, company-report/14431/2025/1, confirmed 2026-08-29)."},
    "8012": {"year": "2025", "value": 361_562_000,
             "basis": "exact", "note": "Jazira Takaful - stored 430.3M was 16% off Argaam's 361.56M (company-report/2352/2025/1)."},
    "8040": {"year": "2025", "value": 879_810_000,
             "basis": "exact", "note": "Mutakamela - stored 930.9M was 5.5% off Argaam's 879.81M (company-report/1013/2025/1)."},
    "8050": {"year": "2025", "value": 558_380_000,
             "basis": "exact", "note": "Salama - stored 516.2M was 7.6% off Argaam's 558.38M (company-report/823/2025/1)."},
    "8120": {"year": "2025", "value": 1_038_200_000,
             "basis": "exact", "note": "Gulf Union Alahlia - stored 933.8M was 10.1% off Argaam's 1,038.2M (company-report/1057/2025/1)."},
    "8150": {"year": "2025", "value": 993_240_000,
             "basis": "exact", "note": "Aseej - stored 921.0M was 7.3% off Argaam's 993.24M (company-report/876/2025/1)."},
    "8190": {"year": "2025", "value": 858_310_000,
             "basis": "exact", "note": "United Cooperative - stored 652.6M was 24% off Argaam's 858.31M (company-report/829/2025/1). "
             "Tiny equity (24.6M, matches exactly - accumulated losses 113% of capital, going-concern) is CONFIRMED REAL, not touched."},
    "8240": {"year": "2025", "value": 392_970_000,
             "basis": "exact", "note": "Chubb Arabia - stored 195.4M was 50.3% off Argaam's 392.97M (company-report/1515/2025/1) - "
             "the largest gap found in this sweep, essentially half the correct value."},
    "8260": {"year": "2025", "value": 321_750_000,
             "basis": "exact", "note": "Gulf General - stored 298.2M was 7.3% off Argaam's 321.75M (company-report/1527/2025/1)."},
    "8280": {"year": "2025", "value": 575_030_000,
             "basis": "exact", "note": "LIVA - stored 610.0M was 5.7% off Argaam's 575.03M (company-report/871/2025/1)."},
    "8310": {"year": "2025", "value": 282_110_000,
             "basis": "exact", "note": "Amanah Takaful - stored 299.7M was 5.9% off Argaam's 282.11M (company-report/1892/2025/1)."},
    "8311": {"year": "2025", "value": 170_540_000,
             "basis": "exact", "note": "Enaya - stored 179.5M was ~5.0% off Argaam's 170.54M (company-report/1928/2025/1), right at the bar."},
    "8070": {"year": "2025", "value": 1_881_890_000,
             "basis": "exact", "note": "Arabian Shield Insurance FY2025 insurance revenue was 1.4B, Argaam "
             "confirms 1,881.89M (25.5% off, company-report/879/2025/1, confirmed 2026-08-29) - same "
             "gross-vs-net insurance revenue pattern as the other insurers above. netIncome/equity already correct."},
    "2140": {"year": "2025", "value": 8_690_000,
             "basis": "exact", "note": "Ayyan Investment FY2025 revenue was 19.9M, Argaam confirms 8.69M "
             "(company-report/61/2025/1, confirmed 2026-08-29). netIncome (359.7M, ~41x revenue) is CONFIRMED "
             "REAL - a one-time 418M capital gain from selling all shares in its subsidiaries, not a bug. "
             "equity already correct."},
    "8060": {"year": "2025", "value": 3_104_300_000,
             "basis": "exact", "note": "Walaa Insurance FY2025 insurance revenue was 1.5B, Argaam confirms "
             "3,104.3M (106% off, company-report/1012/2025/1, confirmed 2026-08-29) - cross-checked against "
             "the company's own 9-month press disclosure (2.35B insurance revenue through Q3) which annualizes "
             "consistently with the ~3.1B full-year figure, so this is the larger CORRECT number, not gross "
             "written premiums. netIncome/equity already correct."},
    "4344": {"year": "2025", "value": 216_430_000,
             "basis": "exact", "note": "Sedco Capital REIT FY2025 revenue was 229.5M, Argaam confirms 216.43M "
             "(6.0% off, company-report/4869/2025/1, confirmed 2026-08-29). netIncome/equity already correct."},
    "4040": {"year": "2025", "value": 1_826_580_000,
             "basis": "exact", "note": "Saptco FY2025 revenue was 1.6B, Argaam confirms 1,826.58M (12.6% off, "
             "company-report/99/2025/1, confirmed 2026-08-29). netIncome/equity already correct."},
    "7211": {"year": "2025", "value": 253_160_000, "net_income": 37_450_000,
             "basis": "exact", "note": "AZM Saudi FY2025 (non-calendar, ends June) - stored revenue (307.4M) "
             "was 17.6% off Argaam's confirmed 253.16M; stored netIncome (51.0M) used the before-minority-"
             "interest figure, corrected to the after-minority 37.45M to match our field's convention elsewhere "
             "(company-report/13995/2025/1, confirmed 2026-08-29). Total Assets and Total Stockholders Equity "
             "are NULL/missing in our DB for this ticker and Argaam's summary page didn't disclose them either - "
             "still unresolved, needs a direct look at the full financial statements."},
    "8250": {"year": "2025", "value": 1_503_760_000,
             "basis": "exact", "note": "GIG (Gulf General Insurance) FY2025 revenue was 1.4B, Argaam confirms "
             "1,503.76M (6.9% off, company-report/1513/2025/1, confirmed 2026-08-29). netIncome/equity already correct."},
    "4326": {"year": "2025", "value": 1_223_880_000,
             "basis": "exact", "note": "Almajdiah FY2025 revenue was 1.3B, Argaam confirms 1,223.88M (6.1% off, "
             "company-report/14169/2025/1, confirmed 2026-08-29). netIncome/equity already correct."},
    "6019": {"year": "2025", "value": 533_870_000, "net_income": 130_430_000,
             "basis": "exact", "note": "Almasar Alshamil Education FY2025 - stored revenue/netIncome/equity were "
             "ALL ~3.76x too low (142.1M/34.7M/342.8M vs Argaam+press-confirmed 533.87M/130.43M/1,287.9M SAR - "
             "company-report/18814/2025/1, confirmed 2026-08-29). Initially suspected the same USD-mislabeled-as-"
             "SAR bug as Americana (6015) since the ratio is nearly identical to the SAR/USD peg, but VERIFIED "
             "this is wrong: press coverage explicitly states all figures in Saudi riyals, no USD mentioned "
             "anywhere - so this is a coincidentally similar-looking but functionally different bug (most "
             "likely a single quarter's figures landed in the annual field, given the company only IPO'd "
             "2025-12-02 and had a very short public reporting history). See CONFIRMED_EQUITY below for the "
             "matching equity fix."},
}

# ---------------------------------------------------------------------
# Total Stockholders Equity corrections (balance_sheet), parallel to
# CONFIRMED_LIABILITIES above but for equity instead.
# ---------------------------------------------------------------------
CONFIRMED_EQUITY = {
    "6019": 1_287_900_000,  # Almasar Alshamil Education - see CONFIRMED_REVENUE note above
    "9541": 144_304_000,    # Academy of Learning - see CONFIRMED_REVENUE note above
    "9562": 57_470_000,     # Food Gate - stored 52.7M was 8.3% off Argaam's 57.47M (company-report/15126/2025/1, confirmed 2026-08-30). revenue/netIncome already correct.
    "4265": 585_206_000,    # Cherry Trading Co - see CONFIRMED_REVENUE note above
    "4070": 205_270_000,    # Taprco - stored 147.8M was 28% off Argaam's 205.27M (company-report/107/2025/1, confirmed 2026-08-29). revenue/netIncome already correct.
    "9635": 64_371_000,     # Dkhoun - see CONFIRMED_REVENUE note above (4th occurrence of the ~3.76x bug)
    "9651": 88_640_000,     # Altwijri - see CONFIRMED_REVENUE note above
    "9650": 107_810_000,    # Sahat Almajd - see CONFIRMED_REVENUE note above
    "9624": 87_481_000,     # Alshehili Metal - CONFIRMED via 2 independent sources (Argaam + press) but stored total_assets (67.6M) was NOT updated alongside this - this now shows equity > assets, a KNOWN temporary inconsistency, because no source could be found for the real post-IPO total assets figure despite repeated searches. Fixing the one number that's confirmed rather than leaving both wrong; flagged in review_progress.md - do not silently "resolve" this ticker until total assets is also sourced for real.
    "7205": 170_829_000,    # DBS / Dar Albalad - see CONFIRMED_REVENUE note above (5th occurrence of the ~3.75x bug)
    "4264": 3_549_766_000,  # Flynas - brand-new record, see CONFIRMED_REVENUE note above
    "4084": 1_099_770_000,  # Derayah Financial - brand-new record, see CONFIRMED_REVENUE note above
    "4350": 517_640_000,    # Alistithmar REIT - brand-new record, see CONFIRMED_REVENUE note above
    "4327": 1_857_600_000,  # Alramz - brand-new record, see CONFIRMED_REVENUE note above
    "6018": 270_510_000,    # Sport Clubs - brand-new record, see CONFIRMED_REVENUE note above
    "4147": 200_130_000,    # CGS - brand-new record, see CONFIRMED_REVENUE note above
    "1324": 421_592_000,    # Saleh Alrashed - brand-new record, see CONFIRMED_REVENUE note above
    "4210": 2_841_000_000,  # SRMG - was completely missing/NULL. CONFIRMED via stockanalysis.com (2026-08-30), consistent with the -366.28M net loss already confirmed. revenue/netIncome already correct.
    "9537": 42_683_000,     # Amwaj International - stored 130.5M was actually the PRIOR YEAR (2024) equity; Argaam confirms real 2025 equity is 42.683M (company-report/14265/2025/1, confirmed 2026-08-30). Safe to fix (unlike 9624 Alshehili) since 42.683M < stored total assets, no accounting impossibility. revenue/netIncome already correct.
}

# ---------------------------------------------------------------------
# NOT bugs - documented so nobody "fixes" them later by mistake.
# Some banks' official/Argaam headline "equity" figure excludes AT1
# (Additional Tier 1) Sukuk from equity - a common analyst convention
# for cleaner ROE - while our stored total_equity (IFRS "Total
# Stockholders Equity") correctly INCLUDES Sukuk. Both numbers are
# individually correct; they measure different things. Confirmed this
# session for: Riyad Bank, BSF, SAB, Al Rajhi, Alinma, and now SNB
# (1180 - has active AT1 Sukuk programs in both USD and SAR per Argaam/
# saudiexchange.sa announcements, confirmed 2026-08-28). Banks with NO
# sukuk program (Al Jazira, SAIB, Albilad, Tadawul Group) show an exact
# equity match with no gap, which supports this explanation rather than
# a random data error.
# ---------------------------------------------------------------------
KNOWN_NON_BUG_EQUITY_GAPS = {"1010", "1050", "1060", "1120", "1150", "1180"}

# ---------------------------------------------------------------------
# Currency-mislabeling bug: Americana Restaurants (6015) reports in USD
# (it's a multi-country PLC, functional currency USD) but WiseSheets
# stored the raw USD figures tagged as SAR across the ENTIRE financials
# history (2021-2025) and the whole balance_sheet - e.g. stored revenue
# "2.5B SAR" for 2025 when Argaam's SAR figure is 9,408.08M SAR; but
# 2.5B * 3.75 (the fixed, official SAR/USD peg) = 9.375B, a 0.3% match -
# and the same ~3.75x ratio holds for net income, equity, and every
# other year checked, which is what confirms this is one currency bug
# across the whole record rather than five separate wrong-value bugs.
# Confirmed 2026-08-28 via Argaam (company-report/15023) and press
# coverage stating 2025 revenue as "$2.51 billion" (matches stored "2.5B"
# almost exactly - the USD number, just mislabeled SAR).
#
# Fix: multiply every money field in financials[] and balance_sheet[]
# by 3.75. Ratio/percentage fields (margin, roic) are left untouched -
# they're already currency-independent. Applies to ALL 5 stored years,
# not just 2025, since the peg is a fixed constant, not something that
# needs per-year verification.
# ---------------------------------------------------------------------
CONFIRMED_CURRENCY_FIX = {
    "6015": 3.75,  # Americana Restaurants - USD stored as SAR, apply SAR peg
}

# ---------------------------------------------------------------------
# Balance sheet: "Total Liabilities" pulled equal to "Total Assets"
# (a mislabeled-column bug in the source data), for companies where
# Total Assets and Total Stockholders Equity were independently sane.
# Corrected value = Assets - Equity (the accounting identity).
# ---------------------------------------------------------------------
# ---------------------------------------------------------------------
# Companies whose most-recent "year" row in financials[] must be REMOVED
# entirely - not corrected, removed - because the company itself has
# officially announced it could not complete its audit and publish that
# year's statements within the regulatory deadline. Displaying ANY
# number under that year implies it's a real, audited result; since it
# isn't, showing nothing is more honest than showing a number that may
# be a stale carryover or an unaudited estimate WiseSheets picked up
# before the delay was known.
#
# 2210 Nama Chemicals: confirmed via multiple sources (Argaam articles
# 1900715, 1904477, 1923767, 1929841 + saudiexchange.sa announcement
# anId=93933) that the company announced on 2026-04-01 it could not
# publish its FY2025 (year ended 2025-12-31) audited annual statements
# because audit review work was not complete - Tadawul suspended trading
# of the stock as a result, and the delay cascaded into Q1 2026 and H1
# 2026 interim results too, still unresolved as of this check
# (2026-08-30). Our stored "2025" row (revenue 380.3M, netIncome 11.7M)
# cannot be a real audited figure - remove it, leave 2024 as the latest
# confirmed year until the company actually publishes.
# ---------------------------------------------------------------------
CONFIRMED_REMOVE_YEAR = {
    "2210": "2025",
}

# ---------------------------------------------------------------------
# Total Assets corrections/creations, parallel to CONFIRMED_EQUITY.
# ---------------------------------------------------------------------
CONFIRMED_ASSETS = {
    "4350": 1_174_900_000,  # Alistithmar REIT - brand-new record, see CONFIRMED_REVENUE note above
    "9624": 105_510_000,    # Alshehili Metal - CONFIRMED via stockanalysis.com, matches our already-confirmed equity (87.48M) exactly and is internally consistent (assets - equity = 18.03M liabilities, down from 30M pre-IPO - plausible if IPO proceeds paid down debt). Resolves the equity>assets inconsistency flagged 2026-08-29/30.
    "4210": 7_243_000_000,  # SRMG - equity was completely missing; total assets sourced via stockanalysis.com since Argaam/press never disclosed it despite 4+ search attempts. revenue/netIncome were already confirmed correct earlier this session.
}

CONFIRMED_LIABILITIES = {
    "9558": 112_700_000 - 84_300_000,     # Alqemam: 112.7M assets - 84.3M equity
    "9577": 70_100_000 - 33_400_000,      # Dar Almarkabah: 70.1M assets - 33.4M equity
    "1820": 1_600_000_000 - 2_800_000,    # BAAN: 1.6B assets - 2.8M equity
}

# ---------------------------------------------------------------------
# quarterly_results (the "الأداء الربعي" panel shown on the live company
# page - a hand-curated content field, NOT the raw WiseSheets
# revenue_q0-q3 columns, but populated from those columns originally and
# inheriting the same gross/net tagging bug: swings like +131.8% then
# -59.3% quarter-over-quarter that no bank actually produces). Confirmed
# via Argaam's per-bank quarterly report pages
# (argaam.com/ar/financial-reports/company-report/{id}/2026/70 and /71)
# on 2026-08-28 for Q1 2026 and Q2 2026 - the only two discrete quarters
# we could independently verify this session. Values are total operating
# income ("revenue") and net income ("profit") in SAR.
#
# Q3 2025 / Q4 2025 entries previously stored (e.g. Riyad Bank showing a
# +238.7% quarter swing) are DROPPED rather than guessed at - we have no
# independently verified discrete-quarter figure for them yet. Two
# correct quarters beats four where two are fabricated-looking.
#
# argaam ids used: 1010=47, 1020=46, 1030=52, 1050=50, 1060=48, 1080=45,
# 1111=4067, 1120=43, 1140=44, 1150=826
# ---------------------------------------------------------------------
CONFIRMED_QUARTERLY = {
    "1010": {"q1_2026": (4_614_050_000, 2_613_540_000), "q2_2026": (4_735_870_000, 2_649_030_000)},  # Riyad Bank
    "1020": {"q1_2026": (1_152_250_000, 405_030_000), "q2_2026": (1_215_910_000, 442_830_000)},       # Al Jazira
    "1030": {"q1_2026": (1_056_570_000, 519_560_000), "q2_2026": (1_106_030_000, 531_120_000)},       # SAIB
    "1050": {"q1_2026": (2_708_070_000, 1_381_160_000), "q2_2026": (2_849_050_000, 1_486_650_000)},   # BSF
    "1060": {"q1_2026": (3_611_760_000, 2_086_160_000), "q2_2026": (3_663_260_000, 2_331_080_000)},   # SAB
    "1080": {"q1_2026": (2_588_770_000, 1_359_200_000), "q2_2026": (2_742_000_000, 1_422_910_000)},   # ANB
    "1111": {"q1_2026": (294_560_000, 55_630_000), "q2_2026": (322_570_000, 92_080_000)},             # Tadawul Group
    "1120": {"q1_2026": (10_528_480_000, 6_751_550_000), "q2_2026": (10_884_480_000, 7_012_140_000)}, # Al Rajhi
    "1140": {"q1_2026": (1_529_210_000, 735_750_000), "q2_2026": (1_613_160_000, 791_620_000)},       # Bank Albilad
    "1150": {"q1_2026": (3_009_710_000, 1_678_530_000), "q2_2026": (3_128_370_000, 1_595_180_000)},   # Alinma
}

# ---------------------------------------------------------------------
# Company-wide "quarterly_results" pipeline bug found 2026-08-30: the
# same panel behind CONFIRMED_QUARTERLY above (10 banks, discovered by
# a live visual scan) turns out to be broken far more broadly - a
# programmatic sweep of every Saudi company's stored Q3 2025 revenue
# against the average magnitude of its other 3 shown quarters found 323
# of 361 companies with a stored value (a full 89%) implausibly low or
# outright negative for that one specific quarter (e.g. ticker 2010:
# -75.8M SAR for a company whose other quarters run in the tens of
# billions; ticker 2340: -2.1M SAR, a mathematically impossible negative
# revenue). The consistency across every sector and company size checked
# (banks, petrochemicals, healthcare, retail, tiny Nomu companies) rules
# out per-company noise - this is a WiseSheets import-pipeline defect
# specific to Q3 2025, most likely a bad cumulative-quarter subtraction
# (9-month minus 6-month) that went wrong for nearly every ticker at once.
#
# This list is the conservative subset actually applied: negative OR
# under 15% of the average of the other 3 quarters shown (245 of the 323
# flagged). A further ~78 tickers were between 15-30% of that average and
# were deliberately left untouched - that range is ambiguous enough to
# include genuine high-growth companies with a real weak early quarter
# (e.g. ticker 9557/Edarat's quarters step up smoothly 19.8M -> 37.6M ->
# 46.8M -> 117.2M, consistent with real acceleration, not corruption) and
# guessing wrong there would delete real data instead of fixing fake data.
#
# No replacement value is fabricated for the removed quarter - true Q3
# 2025 figures would need an individual Argaam lookup per company (a
# separate, much larger project than this session's scope). Removing the
# broken row is strictly better than showing it: it drops one data point
# instead of showing a mathematically-impossible number (negative
# revenue) or a "vs previous quarter" swing in the thousands of percent
# on the following quarter, which is what actually reached real users on
# both the website and the Telegram bot before this fix (same table).
CONFIRMED_STRIP_BAD_QUARTER = {
    "quarter_label": "Q3 2025",
    "tickers": [
    "1201", "1202", "1210", "1213", "1214", "1301", "1302", "1304", "1320", "1322",
    "1323", "1810", "1820", "1831", "1832", "1833", "1834", "1835", "2001", "2010",
    "2020", "2030", "2040", "2050", "2060", "2080", "2081", "2083", "2084", "2090",
    "2100", "2110", "2130", "2140", "2160", "2180", "2190", "2200", "2210", "2220",
    "2230", "2240", "2250", "2270", "2280", "2281", "2287", "2288", "2310", "2330",
    "2340", "2350", "2360", "2370", "2381", "2382", "3002", "3003", "3004", "3008",
    "3010", "3050", "3060", "3090", "3091", "4001", "4003", "4004", "4006", "4008",
    "4009", "4011", "4012", "4014", "4017", "4018", "4019", "4021", "4031", "4050",
    "4051", "4061", "4070", "4071", "4072", "4080", "4082", "4110", "4140", "4141",
    "4142", "4143", "4144", "4146", "4148", "4160", "4161", "4162", "4163", "4164",
    "4165", "4170", "4190", "4191", "4192", "4193", "4194", "4200", "4210", "4220",
    "4230", "4240", "4260", "4261", "4262", "4265", "4270", "4290", "4310", "4322",
    "4330", "4335", "4337", "4339", "4345", "4346", "6001", "6002", "6004", "6010",
    "6012", "6013", "6014", "6015", "6016", "6017", "6040", "6050", "6060", "6070",
    "6090", "7030", "7040", "7200", "7201", "7202", "7204", "7205", "8010", "8012",
    "8020", "8030", "8040", "8050", "8060", "8070", "8100", "8120", "8150", "8160",
    "8170", "8180", "8190", "8210", "8230", "8240", "8250", "8260", "8280", "8300",
    "8310", "8311", "9510", "9513", "9515", "9516", "9522", "9523", "9524", "9527",
    "9530", "9532", "9533", "9535", "9536", "9537", "9538", "9539", "9540", "9542",
    "9543", "9545", "9549", "9550", "9551", "9552", "9553", "9555", "9559", "9560",
    "9562", "9563", "9564", "9565", "9566", "9567", "9568", "9569", "9571", "9572",
    "9574", "9575", "9577", "9578", "9581", "9584", "9586", "9587", "9588", "9592",
    "9593", "9595", "9597", "9598", "9599", "9600", "9602", "9605", "9606", "9608",
    "9613", "9614", "9615", "9617", "9619", "9620", "9621", "9622", "9627", "9630",
    "9631", "9635", "9637", "9649", "9650",
    ],
}
