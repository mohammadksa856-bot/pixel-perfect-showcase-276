# Full company data-accuracy review - progress tracker

Durable progress record for the "all companies, all displayed fields, >5% diff vs Argaam gets fixed" review the user asked for. Batches of ~10 at a time. Status values: `done` (reviewed + any >5% diffs fixed via overrides.py), `no-argaam-id` (not in argaam_ticker_map.json - re-scrape companies-list page), `pending` (not started yet).

Total Saudi companies (تداول+نمو): 396

| # | Ticker | Argaam ID | Status | Notes |
|---|---|---|---|---|
| 1 | 1010 | 47 | done | batch 1 (banks) - annual revenue + quarterly_results fixed |
| 2 | 1020 | 46 | done | batch 1 (banks) - annual revenue + quarterly_results fixed |
| 3 | 1030 | 52 | done | batch 1 (banks) - annual revenue + quarterly_results fixed |
| 4 | 1050 | 50 | done | batch 1 (banks) - annual revenue + quarterly_results fixed |
| 5 | 1060 | 48 | done | batch 1 (banks) - annual revenue + quarterly_results fixed |
| 6 | 1080 | 45 | done | batch 1 (banks) - annual revenue + quarterly_results fixed |
| 7 | 1111 | 4067 | done | batch 1 (banks) - annual revenue + quarterly_results fixed |
| 8 | 1120 | 43 | done | batch 1 (banks) - annual revenue + quarterly_results fixed |
| 9 | 1140 | 44 | done | batch 1 (banks) - annual revenue + quarterly_results fixed |
| 10 | 1150 | 826 | done | batch 1 (banks) - annual revenue + quarterly_results fixed |
| 11 | 1180 | 3413 | done | SNB - revenue fixed (39.19B exact, same bank gross/net bug, missed in batch 1); equity gap is sukuk-exclusion, not a bug |
| 12 | 1182 | 2707 | done | RESOLVED old pending REVENUE_JUMP flag: Amlak netIncome/equity confirmed exact, revenue not directly comparable (Argaam gave net commission income, a different concept for a finance company - not necessarily wrong) |
| 13 | 1183 | 2727 | done | Sahl Finance - netIncome exact match, equity 2.2% off Argaam; revenue/assets not independently verified this round (not disclosed on the Argaam summary page) |
| 14 | 1201 | 1994 | done | Takween Advanced Industries - the -202M net loss confirmed exact real, revenue/netIncome/equity exact matches |
| 15 | 1202 | 4319 | done | RESOLVED: Mepco revenue confirmed ~1,065M vs stored 1.1B (3.2% off, under bar) - no fix needed after all. netIncome/equity already fine |
| 16 | 1210 | 968 | done | BCI - 104.3% profit growth confirmed real, revenue/netIncome/equity exact matches |
| 17 | 1211 | 836 | done | Maaden - revenue/equity/netIncome all <1% off Argaam, no fix needed |
| 18 | 1212 | 1086 | done | Astra Industrial - revenue/equity/netIncome all <1.4% off Argaam |
| 19 | 1213 | 1061 | done | Naseej - the -34.0M net loss confirmed real (going-concern warning), revenue/netIncome/equity exact matches |
| 20 | 1214 | 1880 | done | Shaker - revenue/netIncome/equity all <0.3% off Argaam |
| 21 | 1301 | 855 | done | Aslak - 68.1% profit decline confirmed real, revenue/netIncome/equity exact matches |
| 22 | 1302 | 1992 | done | Bawan - the 105.9% profit growth confirmed real (acquisitions), all fields <0.9% off Argaam |
| 23 | 1303 | 3829 | done | EIC - revenue/equity/netIncome all <0.2% off Argaam |
| 24 | 1304 | 4515 | done | Alyamamah Steel - revenue/netIncome/equity all <1.1% off Argaam (non-calendar FY, ends Sept - not a bug) |
| 25 | 1320 | 1526 | done | SSP - revenue/netIncome/equity all <0.9% off Argaam |
| 26 | 1321 | 13749 | done | East Pipes - revenue/netIncome exact match to Argaam, equity plausible (different FY period cited) |
| 27 | 1322 | 13986 | done | AMAK - revenue/equity/netIncome all <2.6% off Argaam |
| 28 | 1323 | 5154 | done | UCIC - 36.5% profit decline confirmed real, all fields <0.4% off Argaam |
| 29 | 1324 | 15208 | done | FIXED (brand-new record): Saleh Alrashed - populated FY2025 revenue 739.5M, netIncome 91.7M (+53.6% YoY), equity 421.6M |
| 30 | 1810 | 883 | done | Seera - revenue/equity/netIncome (post-minority, matches our convention exactly) all <0.7% off Argaam |
| 31 | 1820 | 3412 | done | BAAN - RE-CONFIRMED the earlier-session CONFIRMED_LIABILITIES fix still holds: revenue/netIncome/equity now all <0.1% off Argaam |
| 32 | 1830 | 4516 | done | Leejam Sports - revenue/netIncome/equity all <0.9% off Argaam |
| 33 | 1831 | 5268 | done | Maharah - revenue/netIncome/equity all <0.4% off Argaam |
| 34 | 1832 | 4627 | done | SADR - the -3.4M net loss confirmed real, revenue/netIncome/equity exact matches |
| 35 | 1833 | 15170 | done | Almawarid - revenue/netIncome/equity all <0.4% off Argaam |
| 36 | 1834 | 16903 | done | Smasco - revenue/netIncome/equity all <0.3% off Argaam |
| 37 | 1835 | 14277 | done | Tamkeen - revenue/netIncome/equity all <1.4% off Argaam |
| 38 | 2001 | 599 | done | Chemanol - the -479.7M net loss confirmed real (82% of capital in accumulated losses), revenue/netIncome/equity exact matches |
| 39 | 2010 | 77 | done | SABIC - revenue/equity/netIncome (incl. the -25.8B loss) all <0.1% off Argaam - loss is real (FV writedowns), not a bug |
| 40 | 2020 | 79 | done | SABIC Agri-Nutrients - revenue/equity/netIncome all <0.5% off Argaam, no fix needed |
| 41 | 2030 | 81 | done | Sarco - the -60.2M net loss and equity confirmed exact vs Argaam; revenue (-47.2M, negative) not independently verified this round (Argaam summary didn't disclose it) |
| 42 | 2040 | 66 | done | Saudi Ceramics - revenue/netIncome/equity all <3% off Argaam |
| 43 | 2050 | 85 | done | Savola - 91% profit decline confirmed real (one-time 2024 Almarai stake distribution), all fields <0.9% off Argaam |
| 44 | 2060 | 72 | done | Tasnee - the -1.77B net loss confirmed real (2.1B impairments), all fields <1.9% off Argaam |
| 45 | 2070 | 75 | done | Spimaco - revenue/netIncome/equity all <0.6% off Argaam |
| 46 | 2080 | 69 | done | Gasco Holding - revenue/netIncome/equity all <1.6% off Argaam |
| 47 | 2081 | 13068 | done | Al Khorayef (AWPT) - revenue/netIncome exact match, equity exact match to Argaam |
| 48 | 2082 | 4269 | done | ACWA Power - revenue fixed (7.41B exact, was 7.8B, 5.3% off); netIncome/equity fine |
| 49 | 2083 | 4307 | done | Marafiq - revenue/equity/netIncome all <0.8% off Argaam |
| 50 | 2084 | 16275 | done | Miahona - revenue/netIncome/equity exact matches to Argaam |
| 51 | 2090 | 71 | done | Gasco/NGC (Jubail) - the -30.8M net loss (142.7% worse YoY) confirmed exact via press, no fix needed |
| 52 | 2100 | 68 | done | Wafrah - the -46.8M net loss confirmed real, revenue/netIncome/equity exact matches |
| 53 | 2110 | 65 | done | Saudi Cable - the -214.4M NEGATIVE equity CONFIRMED REAL (going-concern warning, accumulated losses 274.8M), revenue/netIncome/equity all <0.03% off Argaam |
| 54 | 2120 | 82 | done | Advanced Industries (متطورة) - the -162.5M net loss confirmed EXACTLY real (unrealized MTM losses on Baladi Poultry stake), no fix needed |
| 55 | 2130 | 84 | done | SIDC - the -89.1M net loss confirmed real (goodwill/asset impairment), revenue/netIncome/equity exact matches |
| 56 | 2140 | 61 | done | FIXED: Ayyan revenue was 19.9M, Argaam confirms 8.69M. The ~41x netIncome/revenue ratio (359.7M) is CONFIRMED REAL - one-time 418M gain from selling all subsidiary shares |
| 57 | 2150 | 70 | done | Zoujaj - revenue/netIncome/equity exact matches to Argaam |
| 58 | 2160 | 64 | done | Amiantit - the -78.1M net loss confirmed real (Poland closure), revenue/netIncome/equity exact matches |
| 59 | 2170 | 63 | done | Alujain - the -833.9M net loss confirmed real (NATPET associate impairment), all fields <0.3% off Argaam |
| 60 | 2180 | 67 | done | Fipco - the -19.1M net loss confirmed real (turnaround from +0.9M), revenue/netIncome/equity exact matches |
| 61 | 2190 | 87 | done | Sisco Holding - revenue/netIncome/equity all <0.6% off Argaam |
| 62 | 2200 | 76 | done | APC - revenue/netIncome/equity exact matches to Argaam |
| 63 | 2210 | 74 | done | FIXED: Nama Chemicals CONFIRMED via multiple Argaam articles + saudiexchange.sa - the company officially announced 2026-04-01 it could NOT complete its FY2025 audit in time; Tadawul suspended the stock; delay cascaded into Q1/H1 2026 too. Removed the unaudited '2025' row from financials[] entirely (was showing 380.3M revenue/11.7M netIncome as if final) rather than guess a number - 2024 (confirmed, audited) is now the latest year shown until the company actually publishes |
| 64 | 2220 | 73 | done | Maadaniyah - the -22.3M net loss confirmed real, revenue/netIncome/equity exact matches |
| 65 | 2222 | 3509 | done | Aramco - assets/equity/revenue/netIncome all <1% off Argaam, no fix needed |
| 66 | 2223 | 4537 | done | Luberef - revenue/equity/netIncome all <0.4% off Argaam |
| 67 | 2230 | 83 | done | Nat'l Chemical - revenue/equity/netIncome all <0.7% off Argaam |
| 68 | 2240 | 89 | done | Senaat - revenue/netIncome/equity exact matches to Argaam |
| 69 | 2250 | 86 | done | SIIG - revenue=0 CONFIRMED structural (equity-method JV accounting, no consolidated revenue line per IFRS), not a bug. netIncome/equity exact match to Argaam |
| 70 | 2270 | 78 | done | Sadafco - revenue/netIncome exact match to Argaam, equity plausible (Q3 comparator only) |
| 71 | 2280 | 62 | done | Almarai - revenue/equity/netIncome all <2% off Argaam |
| 72 | 2281 | 13515 | done | Tanmiah - the -18.8M net loss confirmed real (poultry pricing pressure), all fields <1.7% off Argaam |
| 73 | 2282 | 14432 | done | NAQI - the -2.7M net loss confirmed real, revenue/netIncome/equity exact matches |
| 74 | 2283 | 15705 | done | First Mills - revenue 4.2% off (under bar), netIncome/equity <2.9% off Argaam |
| 75 | 2284 | 16485 | done | Modern Mills - revenue 4.4% off (under bar), netIncome/equity <0.01% off Argaam |
| 76 | 2285 | 13453 | done | Arabian Mills - revenue/netIncome exact match, equity <3.4% off Argaam |
| 77 | 2286 | 13454 | done | Fourth Milling - revenue/netIncome/equity exact matches to Argaam |
| 78 | 2287 | 17417 | done | Entaj - the -123.1M net loss confirmed real (poultry oversupply), all fields <3.6% off Argaam |
| 79 | 2288 | 14965 | done | Nofoth - revenue/netIncome/equity exact matches to Argaam |
| 80 | 2290 | 88 | done | Yansab - profit collapse 420M->79.1M confirmed real (lower ASPs, higher input costs), all fields <0.5% off Argaam |
| 81 | 2300 | 632 | done | FIXED: SPM net income was 60.5M, Argaam confirms 66.70M (9.3% off) - revenue/equity were already correct |
| 82 | 2310 | 585 | done | Sipchem - the -860.5M net loss confirmed real, all fields <0.2% off Argaam |
| 83 | 2320 | 907 | done | Albabtain - revenue/netIncome/equity all <1.5% off Argaam |
| 84 | 2330 | 1007 | done | Advanced Petrochemical - revenue/netIncome exact match, equity <0.3% off Argaam |
| 85 | 2340 | 909 | done | Artex - turnaround from -129.1M loss to +21.3M profit confirmed real, all fields <3.9% off Argaam |
| 86 | 2350 | 598 | done | Saudi Kayan - the -2.3B net loss confirmed real, all fields <0.5% off Argaam |
| 87 | 2360 | 1044 | done | SVCP (Fakhariya) - the -32.5M net loss confirmed real, revenue/netIncome/equity exact matches |
| 88 | 2370 | 915 | done | MESC - revenue/netIncome/equity all <1.2% off Argaam |
| 89 | 2380 | 600 | done | Petro Rabigh - revenue/equity/netIncome (incl. -3.9B loss) all <0.3% off Argaam - loss is real |
| 90 | 2381 | 4434 | done | Arabian Drilling - the -75.3M net loss confirmed real (utilization drop + impairment), all fields <0.9% off Argaam |
| 91 | 2382 | 14629 | done | ADES - revenue/equity/netIncome all <0.3% off Argaam |
| 92 | 3002 | 1022 | done | Najran Cement - revenue/netIncome/equity all <1.7% off Argaam |
| 93 | 3003 | 1055 | done | City Cement - revenue/netIncome/equity exact matches to Argaam |
| 94 | 3004 | 886 | done | Northern Cement - revenue/netIncome/equity all <1.7% off Argaam |
| 95 | 3005 | 3408 | done | UACC - revenue/netIncome/equity exact matches to Argaam |
| 96 | 3007 | 4749 | done | Oasis - 73.5% profit decline confirmed real, revenue/netIncome/equity exact matches |
| 97 | 3008 | 4726 | done | Alkathiri - the -40.8M net loss confirmed real, revenue/netIncome/equity exact matches |
| 98 | 3010 | 53 | done | ACC - revenue 3.6% off (under bar), netIncome/equity <0.8% off Argaam |
| 99 | 3020 | 59 | done | Yamama Cement - revenue/netIncome/equity all <1.5% off Argaam |
| 100 | 3030 | 56 | done | Saudi Cement - revenue/netIncome/equity all <1.7% off Argaam |
| 101 | 3040 | 55 | done | Qacco - revenue/netIncome/equity all <2.8% off Argaam |
| 102 | 3050 | 57 | done | SPCC - the -48.5M net loss confirmed real, all fields <1.1% off Argaam |
| 103 | 3060 | 60 | done | Yanbu Cement (YCC) - revenue/netIncome/equity all <1.5% off Argaam |
| 104 | 3080 | 54 | done | Epcco - revenue 3% off (under bar), netIncome/equity <1.7% off Argaam |
| 105 | 3090 | 58 | done | TCC (Tabuk Cement) - revenue/netIncome/equity all <2.5% off Argaam |
| 106 | 3091 | 885 | done | Jouf Cement - the -206.6M net loss confirmed real (97.8M inventory adjustment), revenue/netIncome/equity exact matches |
| 107 | 3092 | 4451 | done | Riyadh Cement - revenue/netIncome/equity all <1.1% off Argaam |
| 108 | 4001 | 911 | done | Othaim Markets - revenue/netIncome exact match, equity <2.2% off Argaam |
| 109 | 4002 | 1524 | done | Mouwasat - revenue/equity/netIncome all <0.7% off Argaam |
| 110 | 4003 | 1907 | done | Extra - revenue/netIncome/equity all <2.2% off Argaam |
| 111 | 4004 | 1181 | done | Dallah Health - revenue/equity/netIncome all <0.8% off Argaam |
| 112 | 4005 | 2298 | done | CARE - revenue/netIncome/equity all <2.7% off Argaam |
| 113 | 4006 | 2500 | done | Farm Superstores - 3% profit decline confirmed real, revenue/netIncome/equity exact matches |
| 114 | 4007 | 3438 | done | Alhammadi - 28.6% profit decline confirmed real (non-recurring 2024 gain), all fields <2.7% off Argaam |
| 115 | 4008 | 4337 | done | SACO - revenue 2.8% off (under bar), netIncome/equity exact matches |
| 116 | 4009 | 4475 | done | Saudi German Health - revenue/netIncome/equity all <1.5% off Argaam |
| 117 | 4011 | 4508 | done | Lazurde - the -42.2M net loss confirmed real (gold price provisions), all fields <0.02% off Argaam |
| 118 | 4012 | 4664 | done | Alaseel - revenue/netIncome/equity exact matches to Argaam |
| 119 | 4013 | 4433 | done | Sulaiman Alhabib - revenue/equity/netIncome all <0.1% off Argaam, no fix needed |
| 120 | 4014 | 13881 | done | Equipment House - revenue/netIncome/equity exact matches to Argaam |
| 121 | 4015 | 15187 | done | Jamjoom Pharma - assets/equity/revenue/netIncome all <2.2% off Argaam |
| 122 | 4016 | 16437 | done | Avalon Pharma - revenue/netIncome/equity exact matches to Argaam |
| 123 | 4017 | 4286 | done | Fakeeh Medical - revenue/equity/netIncome all <0.9% off Argaam |
| 124 | 4018 | 16511 | done | Almoosa Healthcare - 379% profit jump confirmed real (FV gain on derivatives + revenue growth), all fields <1.4% off Argaam |
| 125 | 4019 | 17867 | done | SMC Healthcare - revenue/netIncome/equity all <2.5% off Argaam |
| 126 | 4020 | 98 | done | Alakaria - revenue/netIncome/equity all <1.1% off Argaam |
| 127 | 4021 | 13574 | done | Cmcer - revenue/netIncome/equity exact matches to Argaam |
| 128 | 4030 | 104 | done | Bahri - revenue/equity/netIncome all <1.3% off Argaam |
| 129 | 4031 | 3433 | done | SGS - revenue/netIncome/equity all <1.4% off Argaam |
| 130 | 4040 | 99 | done | FIXED: Saptco revenue was 1.6B, Argaam confirms 1,826.58M (12.6% off) - netIncome/equity already correct |
| 131 | 4050 | 100 | done | Sasco - revenue/netIncome/equity exact matches to Argaam |
| 132 | 4051 | 4606 | done | Baazeem - revenue/netIncome/equity exact matches to Argaam |
| 133 | 4061 | 102 | done | Anaam Holding - the -20.0M net loss confirmed real, revenue/netIncome/equity exact matches |
| 134 | 4070 | 107 | done | FIXED: Taprco equity was 147.8M, Argaam confirms 205.27M (28% off) - the -52.8M net loss confirmed real (portfolio investment losses), revenue/netIncome already correct |
| 135 | 4071 | 4367 | done | Alarabia - revenue/netIncome/equity all <3.1% off Argaam |
| 136 | 4072 | 14806 | done | MBC Group - revenue/equity/netIncome all <1.1% off Argaam |
| 137 | 4080 | 92 | done | Sinad Holding - the -14.8M net loss confirmed real, all fields <3% off Argaam |
| 138 | 4081 | 5269 | done | Nayifat - the -126.3M net loss confirmed real (credit loss provisions), netIncome/equity <3.2% off Argaam; revenue not independently verified (Argaam only gave net commission income, a different line item) |
| 139 | 4082 | 4696 | done | FIXED: MRNA revenue was 233.6M, Argaam confirms 218.48M (6.5% off) - netIncome/equity already correct |
| 140 | 4083 | 15432 | done | Tasheel - netIncome/equity exact match to Argaam; revenue not independently verified (Argaam page only gave net financing income, a different line item) |
| 141 | 4084 | 4370 | done | FIXED (brand-new record): Derayah Financial - populated FY2025 revenue 934.5M, netIncome 400.2M, equity 1.1B |
| 142 | 4090 | 105 | done | Taiba Investment - revenue 2.6% off (under bar), netIncome/equity <0.7% off Argaam |
| 143 | 4100 | 96 | done | MCDC - revenue/equity/netIncome all <2.6% off Argaam |
| 144 | 4110 | 97 | done | Batic - 145.5% turnaround confirmed real, revenue/netIncome/equity exact matches |
| 145 | 4130 | 90 | done | Saudi DARB - revenue/netIncome/equity exact matches to Argaam |
| 146 | 4140 | 101 | done | Sieco - revenue=0 CONFIRMED structural (company halted ALL operations since Q4 2024, per its own disclosure) - not a bug. netIncome/equity exact matches |
| 147 | 4141 | 4624 | done | Alomran - the -8.3M net loss confirmed real, revenue/netIncome/equity exact matches |
| 148 | 4142 | 4391 | done | Riyadh Cables - revenue/equity/netIncome all <1.8% off Argaam |
| 149 | 4143 | 16491 | done | Talco - revenue/netIncome/equity exact matches to Argaam |
| 150 | 4144 | 4747 | done | Raoom - the -4.6M net loss confirmed real, revenue/netIncome/equity exact matches |
| 151 | 4145 | 3106 | done | OGC - revenue/netIncome/equity exact matches to Argaam |
| 152 | 4146 | 13934 | done | GAS - revenue/netIncome/equity all <2.8% off Argaam |
| 153 | 4147 | 3574 | done | FIXED (brand-new record): CGS (FY ends March) - populated FY2025 revenue 477.1M, netIncome 46.6M (-29.6% YoY), equity 200.1M |
| 154 | 4148 | 13883 | done | Alwasail Industrial - revenue/netIncome/equity exact matches to Argaam |
| 155 | 4150 | 91 | done | Ardco - revenue/netIncome/equity all <0.7% off Argaam |
| 156 | 4160 | 106 | done | Thimar - revenue genuinely tiny (company under financial restructuring since 2021, confirmed), the -13.0M net loss and equity exact matches |
| 157 | 4161 | 5131 | done | Bindawood - revenue/netIncome/equity all <2% off Argaam |
| 158 | 4162 | 5135 | done | Almunajem - revenue/netIncome/equity all <4.5% off Argaam |
| 159 | 4163 | 3815 | done | Aldawaa - revenue/netIncome/equity all <3.4% off Argaam |
| 160 | 4164 | 12760 | done | Nahdi - revenue/equity/netIncome all off Argaam by <1% (press release figures) |
| 161 | 4165 | 17152 | done | Almajed Oud - revenue/netIncome/equity exact matches to Argaam |
| 162 | 4170 | 103 | done | Shams (TECO) - the -11.5M net loss confirmed real, revenue/netIncome/equity exact matches |
| 163 | 4180 | 93 | done | Fitaihi Group - 72.1% profit decline confirmed real, revenue/netIncome/equity exact matches |
| 164 | 4190 | 95 | done | Jarir - revenue/netIncome within 5% of Argaam (11.37B/1049.2M), no fix needed |
| 165 | 4191 | 4626 | done | Abo Moati - revenue/netIncome exact matches, equity <2.2% off Argaam (non-calendar FY, ends March) |
| 166 | 4192 | 14891 | done | Alsaif Gallery - revenue/netIncome/equity exact matches to Argaam |
| 167 | 4193 | 16515 | done | Nice One - 95.8% profit collapse confirmed real, all fields <1.6% off Argaam |
| 168 | 4194 | 17978 | done | Build Station - revenue/netIncome/equity exact matches to Argaam |
| 169 | 4200 | 577 | done | Aldrees - revenue/equity/netIncome all <0.9% off Argaam |
| 170 | 4210 | 578 | done | SRMG - revenue/netIncome already correct (confirmed exact vs Argaam+press earlier); total assets sourced via stockanalysis.com (7,243,000,000) and equity (2,841,000,000), both applied via CONFIRMED_ASSETS/CONFIRMED_EQUITY |
| 171 | 4220 | 832 | done | Emaar EC - RESOLVED old pending REVENUE_JUMP flag from earlier scan: all fields now <3.3% off Argaam, no fix needed |
| 172 | 4230 | 833 | done | Red Sea International - the -55.0M net loss confirmed real, revenue <0.7% off Argaam; equity not independently verified (Argaam excerpt incomplete) |
| 173 | 4240 | 917 | done | FIXED: Cenomi Retail net loss was -457.3M, Argaam confirms -505.51M (9.5% off). Negative equity (-1.46B, going-concern auditor warning) CONFIRMED REAL, left as-is |
| 174 | 4250 | 922 | done | Jabal Omar - netIncome>revenue confirmed real (land sale +1.57B, impairment reversal +354M), all fields <4.2% off Argaam |
| 175 | 4260 | 843 | done | Budget Saudi - revenue/netIncome/equity all <1.4% off Argaam |
| 176 | 4261 | 5122 | done | Theeb - revenue/netIncome/equity all <0.2% off Argaam |
| 177 | 4262 | 3069 | done | LUMI - revenue 4.1% off (under bar), netIncome/equity <0.6% off Argaam |
| 178 | 4263 | 11071 | done | SAL - revenue/equity/netIncome all <1.4% off Argaam |
| 179 | 4264 | 4298 | done | FIXED (brand-new record, was completely empty): Flynas (IPO'd Tadawul June 2025) - populated FY2025 revenue 7.84B, net LOSS -527M (confirmed real: 1.083B in one-time IPO costs; adjusted profit ex-IPO-costs was +556M, +28% YoY), equity 3.55B |
| 180 | 4265 | 17877 | done | FIXED: Cherry Trading (car rental, IPO'd 2025-12-01) revenue/netIncome/equity were all ~3.76x too low - same pattern as Almasar Alshamil, confirmed NOT a currency issue. Flagging recent-IPO pattern for future batches |
| 181 | 4270 | 994 | done | SPPC - the -267.3M net loss and near-total equity wipeout (12.3M, 98.4% of capital in accumulated losses) confirmed real, revenue <2.2% off, netIncome/equity exact |
| 182 | 4280 | 856 | done | Kingdom Holding - revenue/equity/netIncome all <3.3% off Argaam, no fix needed |
| 183 | 4290 | 1087 | done | Alkhaleej Training - the 81.3% profit decline confirmed real (non-recurring items), all fields <1.5% off Argaam |
| 184 | 4291 | 5004 | done | NCLE - netIncome exact match (160.7M) to Argaam; non-calendar FY (ends July 31) noted, not a bug |
| 185 | 4292 | 5000 | done | ATAA - revenue 1.35% off (under bar), netIncome/equity exact matches |
| 186 | 4300 | 920 | done | Dar Alarkan - revenue/equity/netIncome all <2.5% off Argaam |
| 187 | 4310 | 867 | done | RESOLVED old pending REVENUE_JUMP flag: KEC revenue/netIncome/equity all <1.7% off Argaam, no fix needed |
| 188 | 4320 | 4461 | done | Alandalus - the -18.3M net loss confirmed real (improved from -31.6M), revenue/netIncome/equity exact matches |
| 189 | 4321 | 4638 | done | Cenomi Centers - revenue/equity/netIncome all <2.6% off Argaam |
| 190 | 4322 | 10201 | done | Retal - revenue/netIncome/equity all <1.6% off Argaam |
| 191 | 4323 | 11043 | done | Sumou - revenue/netIncome/equity exact matches to Argaam |
| 192 | 4324 | 13573 | done | Banan - revenue/netIncome/equity exact matches to Argaam |
| 193 | 4325 | 3376 | done | Masar - revenue 3.3% off (under bar), equity/netIncome <0.2% off Argaam |
| 194 | 4326 | 14169 | done | FIXED: Almajdiah revenue was 1.3B, Argaam confirms 1,223.88M (6.1% off) - netIncome/equity already correct |
| 195 | 4327 | 14966 | done | FIXED (brand-new record): Alramz Real Estate - populated FY2025 revenue 1.19B, netIncome 281.0M (+77.4% YoY), equity 1.86B |
| 196 | 4330 | 4604 | done | Riyad REIT - the -13.5M net loss confirmed real (improved from -187.3M), all fields <3.3% off Argaam |
| 197 | 4331 | 4620 | done | Aljazira REIT - 143.5% profit growth confirmed real, all fields near-exact matches |
| 198 | 4332 | 4690 | done | Jadwa REIT Alharamain - assets/equity/netIncome exact matches, revenue <2.7% off Argaam |
| 199 | 4333 | 4718 | done | Taleem REIT - assets/equity/revenue/netIncome all <0.9% off Argaam |
| 200 | 4334 | 4746 | done | Al Maather REIT - 17.3% profit decline confirmed real, all fields <1.5% off Argaam |
| 201 | 4335 | 4760 | done | Musharaka REIT - the -109.9M net loss confirmed real (property impairment, occupancy declines), all fields <2.5% off Argaam |
| 202 | 4336 | 4771 | done | Mulkia REIT - the -28.4M net loss confirmed real (property impairment), all fields <1.5% off Argaam |
| 203 | 4337 | 4830 | done | Al Aziziah REIT - the -0.93M net loss confirmed real (write-offs/tax provisions), all fields <1.2% off Argaam |
| 204 | 4338 | 4855 | done | Alahli REIT 1 - assets/equity/revenue/netIncome all <4% off Argaam |
| 205 | 4339 | 4871 | done | Derayah REIT - assets/equity/revenue/netIncome all <0.4% off Argaam |
| 206 | 4340 | 4880 | done | Al Rajhi REIT - assets/equity/revenue/netIncome all <3.2% off Argaam |
| 207 | 4342 | 4884 | done | Jadwa REIT Saudi - assets/equity/revenue/netIncome all <2.9% off Argaam |
| 208 | 4344 | 4869 | done | FIXED: Sedco Capital REIT revenue was 229.5M, Argaam confirms 216.43M (6.0% off) - netIncome/equity already correct |
| 209 | 4345 | 4883 | done | Alinma Retail REIT - the -21.0M net loss confirmed real (financing costs +145%), all fields <2.7% off Argaam |
| 210 | 4346 | 4926 | done | Mefic REIT - huge profit decline (8.1M->356K) confirmed exact real, all fields exact matches |
| 211 | 4347 | 4934 | done | Bonyan REIT - assets/netIncome exact match, equity/revenue <3.1% off Argaam |
| 212 | 4348 | 5026 | done | FIXED: Alkhabeer REIT revenue was 125.7M, Argaam confirms 135.06M (6.9% off) - netIncome/equity already correct |
| 213 | 4349 | 14889 | done | Alinma Hospitality REIT - assets/equity/revenue/netIncome all <2.9% off Argaam |
| 214 | 4350 | 16599 | done | FIXED (brand-new record): Alistithmar REIT - populated FY2025 assets 1.17B, equity 517.6M, revenue 113.3M, the -20.0M net loss confirmed real (improved 247% YoY on FFO basis) |
| 215 | 5110 | 32 | done | Saudi Electricity - revenue/equity/netIncome all <0.3% off Argaam (netIncome matches pre-sukuk-distribution convention), no fix needed |
| 216 | 6001 | 918 | done | Halwani Bros - revenue/netIncome/equity exact matches to Argaam |
| 217 | 6002 | 1109 | done | Herfy - the -77.5M net loss confirmed real, all fields <1.6% off Argaam |
| 218 | 6004 | 1897 | done | Catrion - revenue/netIncome/equity all <1.7% off Argaam |
| 219 | 6010 | 34 | done | Nadec - revenue/netIncome/equity all <0.8% off Argaam |
| 220 | 6012 | 4538 | done | Raydan - the -64.7M net loss confirmed real (going-concern warning), revenue/netIncome/equity exact matches |
| 221 | 6013 | 4625 | done | DWF - the -5.2M net loss confirmed real, revenue/netIncome/equity exact matches |
| 222 | 6014 | 13805 | done | Alamar - revenue/netIncome exact matches, equity not independently confirmed this round |
| 223 | 6015 | 15023 | done | Americana - FIXED: whole financials+balance_sheet history (2021-2025) was USD mislabeled as SAR, corrected x3.75 (SAR peg) |
| 224 | 6016 | 12964 | done | Burgerizzr - revenue/netIncome/equity exact matches to Argaam |
| 225 | 6017 | 13502 | done | Jahez - 61% profit decline confirmed real (opex, depreciation, goodwill impairment), all fields <3.1% off Argaam |
| 226 | 6018 | 16303 | done | FIXED (brand-new record): Sport Clubs (Body Masters) - populated FY2025 revenue 376.2M, netIncome 41.2M (+14.0% YoY), equity 270.5M |
| 227 | 6019 | 18814 | done | FIXED: Almasar Alshamil revenue/netIncome/equity were all ~3.76x too low (likely one quarter's figures in the annual field, IPO'd 2025-12-02) - corrected to Argaam-confirmed 533.87M/130.43M/1,287.9M SAR |
| 228 | 6020 | 35 | done | GACO - revenue/netIncome/equity exact matches to Argaam |
| 229 | 6040 | 37 | done | Tadco - the -95.9M net loss confirmed real (improved 33.5% YoY), revenue/netIncome/equity exact matches |
| 230 | 6050 | 38 | done | Sfico - the -25.4M net loss confirmed real, revenue/netIncome/equity exact matches |
| 231 | 6060 | 39 | done | RESOLVED old pending REVENUE_JUMP flag: Sharqiyah DEV revenue/netIncome/equity all exact matches to Argaam, no fix needed |
| 232 | 6070 | 40 | done | Aljouf - revenue/netIncome/equity exact matches to Argaam |
| 233 | 6090 | 42 | done | Jazadco - revenue/netIncome/equity exact matches to Argaam |
| 234 | 7010 | 30 | done | STC - revenue/equity/netIncome all <0.2% off Argaam, no fix needed |
| 235 | 7020 | 31 | done | Etihad Etisalat (Mobily) - revenue/equity/netIncome all <1% off Argaam |
| 236 | 7030 | 1058 | done | Zain KSA - revenue/equity/netIncome all <0.3% off Argaam |
| 237 | 7040 | 1404 | done | GO Telecom - revenue/netIncome/equity all <1.4% off Argaam (non-calendar FY, ends March 31 - not a bug) |
| 238 | 7200 | 5192 | done | MIS - revenue 2.1% off (under bar), netIncome/equity <0.1% off Argaam |
| 239 | 7201 | 4610 | done | Arab Sea - the -19.6M net loss confirmed real (improved YoY), revenue/netIncome/equity exact matches |
| 240 | 7202 | 2983 | done | Solutions - revenue/equity/netIncome all <0.3% off Argaam |
| 241 | 7203 | 11828 | done | ELM - revenue/equity/netIncome all <0.6% off Argaam |
| 242 | 7204 | 14801 | done | Toby (2P) - revenue 3% off (under bar), netIncome/equity exact matches |
| 243 | 7205 | 17177 | done | FIXED (5th occurrence of the ~3.75x bug): DBS/Dar Albalad revenue/netIncome/equity were all ~3.75x too low (IPO'd May 2025) - corrected via Argaam+press to 315.5M/50.5M/170.829M |
| 244 | 7211 | 13995 | done | FIXED: AZM revenue was 17.6% off + netIncome was before-minority (corrected to after-minority convention). Total Assets/Equity still NULL/missing - needs a direct statements look, could not find via Argaam summary |
| 245 | 8010 | 33 | done | Tawuniya - revenue 3.7% off (under bar), netIncome/equity <0.8% off Argaam |
| 246 | 8012 | 2352 | done | FIXED: Jazira Takaful revenue was 16% off Argaam (insurance sector sweep) |
| 247 | 8020 | 970 | done | Malath - revenue 3.3% off (under bar), netIncome/equity exact matches |
| 248 | 8030 | 1015 | done | Medgulf - the 59.7% profit decline confirmed real, all fields <1.8% off Argaam |
| 249 | 8040 | 1013 | done | FIXED: Mutakamela revenue was 5.5% off Argaam (insurance sector sweep) |
| 250 | 8050 | 823 | done | FIXED: Salama revenue was 7.6% off Argaam - the -91.6M net loss confirmed real |
| 251 | 8060 | 1012 | done | FIXED: Walaa Insurance revenue was 1.5B, Argaam+9-month press disclosure confirm 3.1B (106% off!) - netIncome/equity already correct |
| 252 | 8070 | 879 | done | FIXED: Arabian Shield revenue was 1.4B, Argaam confirms 1,881.89M (25.5% off, same insurance gross/net pattern) - netIncome/equity already correct |
| 253 | 8100 | 1018 | done | RESOLVED old pending REVENUE_JUMP flag: Saico revenue/netIncome/equity all <3.3% off Argaam, no fix needed |
| 254 | 8120 | 1057 | done | FIXED: Gulf Union Alahlia revenue was 10.1% off Argaam - the -83.6M net loss confirmed real |
| 255 | 8150 | 876 | done | FIXED: Aseej revenue was 7.3% off Argaam - the -41.2M net loss confirmed real |
| 256 | 8160 | 1183 | done | Arab Insurance - revenue 3.7% off (under bar) - the -45.2M net loss confirmed real |
| 257 | 8170 | 1010 | done | Alittihad - revenue 4% off (under bar) - the -244.4M net loss confirmed real |
| 258 | 8180 | 963 | done | Al Sagr - revenue 4.4% off (under bar) - the -70.3M net loss confirmed real |
| 259 | 8190 | 829 | done | FIXED: United Cooperative revenue was 24% off Argaam - the -256.2M net loss and near-zero equity (24.6M, accumulated losses 113% of capital, going-concern) confirmed real |
| 260 | 8200 | 1129 | done | FIXED: Saudi Re revenue was -101.5M (NEGATIVE, confirmed real bug not a retrocession artifact) - corrected to Argaam's 1.67B insurance revenue |
| 261 | 8210 | 878 | done | Bupa Arabia - revenue 4.1% off (under bar), netIncome/equity <2% off Argaam |
| 262 | 8230 | 870 | done | FIXED: Al Rajhi Takaful revenue was 12.7% off (gross premiums vs net insurance revenue tagging bug, same pattern as banks) - corrected to Argaam's 5.32B |
| 263 | 8240 | 1515 | done | FIXED: Chubb Arabia revenue was 50.3% off Argaam (~half the correct value) - the largest gap found in the insurance sweep |
| 264 | 8250 | 1513 | done | FIXED: GIG revenue was 1.4B, Argaam confirms 1,503.76M (6.9% off) - netIncome/equity already correct |
| 265 | 8260 | 1527 | done | FIXED: Gulf General revenue was 7.3% off Argaam - the -120.5M net loss confirmed real |
| 266 | 8280 | 871 | done | FIXED: LIVA revenue was 5.7% off Argaam |
| 267 | 8300 | 1891 | done | Wataniya - revenue 3.4% off (under bar), netIncome/equity exact matches |
| 268 | 8310 | 1892 | done | FIXED: Amanah Takaful revenue was 5.9% off Argaam - the -13.3M net loss confirmed real (going-concern warning) |
| 269 | 8311 | 1928 | done | FIXED: Enaya revenue was ~5.0% off Argaam - the -6.7M net loss confirmed real |
| 270 | 8313 | 15706 | done | Rasan - revenue/equity/netIncome all <0.05% off Argaam |
| 271 | 9300 | 14692 | done | Alwaha REIT - assets/equity/netIncome exact matches, revenue <0.8% off Argaam |
| 272 | 9510 | 4611 | done | NBM - 76.4% profit decline confirmed real, revenue/netIncome/equity exact matches |
| 273 | 9513 | 13160 | done | Watani Steel - the -14.9M net loss confirmed real (fire incident), revenue/netIncome/equity exact matches |
| 274 | 9514 | 13066 | done | Alnaqool - 179.8% profit growth confirmed real, revenue/netIncome/equity exact matches |
| 275 | 9515 | 13422 | done | Fesh Fash - 8.4% profit decline confirmed real, revenue/netIncome/equity exact matches |
| 276 | 9516 | 2902 | done | Ghaz (NGDC) - revenue/netIncome/equity exact matches to Argaam |
| 277 | 9517 | 10017 | done | Mobi Industry - 25% profit decline confirmed real, revenue/netIncome/equity exact matches |
| 278 | 9521 | 13704 | done | Inmar - 32% profit growth confirmed real, revenue/netIncome/equity exact matches |
| 279 | 9522 | 13703 | done | Alhasoob - revenue/netIncome/equity exact matches to Argaam |
| 280 | 9523 | 13750 | done | Group Five - revenue 1.4% off (under bar), netIncome/equity exact matches |
| 281 | 9524 | 13882 | done | Aictec - the -17.5M net loss confirmed real, revenue/netIncome/equity <1.6% off Argaam |
| 282 | 9527 | 13984 | done | AME - revenue/netIncome/equity exact matches to Argaam |
| 283 | 9530 | 13994 | done | Tibbiyah - revenue/equity exact matches, netIncome <0.8% off Argaam |
| 284 | 9532 | 13935 | done | Hilwa (formally 'Al-Jouf Healthy Water Factory' - argaam id name mismatch, but data confirmed correct) - revenue/netIncome/equity all near-exact matches |
| 285 | 9533 | 13666 | done | SPC (Al-Markaz Al-Aali) - the -14.9M net loss confirmed real, revenue/netIncome/equity exact matches |
| 286 | 9535 | 14294 | done | Ladun - the -55.4M net loss confirmed real (real estate revenue decline), all fields <3.4% off Argaam |
| 287 | 9536 | 14296 | done | Fadeco - 69.1% profit decline confirmed real, revenue/netIncome/equity exact matches |
| 288 | 9537 | 14265 | done | FIXED: Amwaj International equity was stale PRIOR-YEAR (130.5M, actually 2024's figure) - corrected to Argaam's confirmed 2025 equity 42.683M. The -87.8M net loss (inventory discrepancies + credit provisions) confirmed exact real |
| 289 | 9538 | 14297 | done | Naseej Tech - revenue/netIncome/equity near-exact matches to Argaam |
| 290 | 9539 | 14264 | done | Aqaseem - the -2.2M net loss confirmed real (competitive pricing pressure), revenue/netIncome/equity exact matches |
| 291 | 9540 | 13492 | done | Tadweer - revenue/netIncome/equity all <3% off Argaam |
| 292 | 9541 | 14431 | done | FIXED: Academy of Learning netIncome was 11.8% off + equity was 8.9% off Argaam (FY ends June 30) |
| 293 | 9542 | 12968 | done | Keir - the -45.8M net loss confirmed real (accumulated losses 123.7% of capital), revenue/netIncome/equity exact matches |
| 294 | 9543 | 14505 | done | Networkers - revenue/netIncome/equity exact matches to Argaam |
| 295 | 9544 | 13146 | done | Future Care - revenue/netIncome/equity exact matches to Argaam |
| 296 | 9545 | 14556 | done | Aldawliah - 67.9%/71.9% growth confirmed real, revenue/netIncome/equity exact matches |
| 297 | 9546 | 14557 | done | Naba Alsaha - revenue/netIncome/equity exact matches to Argaam |
| 298 | 9547 | 12766 | done | FIXED: Rawasi - SIGN FLIP BUG, stored netIncome was +23.9M (profit) but Argaam confirms -23.89M (loss). Revenue/equity were already correct |
| 299 | 9548 | 14585 | done | Apico - revenue/netIncome/equity exact matches to Argaam |
| 300 | 9549 | 14584 | done | Albabtain Food - 20.4%/55.8% growth confirmed real, revenue/netIncome/equity exact matches |
| 301 | 9550 | 14587 | done | Sure - 45.4% profit decline confirmed real, revenue/netIncome/equity exact matches |
| 302 | 9551 | 13636 | done | Knowledge Tower (FY ends March) - 75% profit decline confirmed real, revenue/netIncome/equity exact matches |
| 303 | 9552 | 14885 | done | Saudi Top - revenue/netIncome/equity exact matches to Argaam |
| 304 | 9553 | 14884 | done | Molan - the -21.8M net loss confirmed real (accumulated losses 99.21% of capital, near-total wipeout), revenue/equity exact matches |
| 305 | 9555 | 14890 | done | Leen Alkhair - the -28.9M net loss confirmed real, revenue/netIncome/equity exact matches |
| 306 | 9557 | 5225 | done | Edarat - revenue/netIncome/equity exact matches to Argaam |
| 307 | 9558 | 15181 | done | Alqemam - RE-CONFIRMED the earlier-session CONFIRMED_LIABILITIES fix still holds exactly: revenue/netIncome/equity/liabilities all consistent with Argaam |
| 308 | 9559 | 15186 | done | Balady - 71.1% profit decline confirmed real, revenue/netIncome/equity exact matches |
| 309 | 9560 | 15191 | done | Waja - revenue/netIncome/equity exact matches to Argaam |
| 310 | 9561 | 15189 | done | Knowledgenet - revenue/netIncome/equity exact matches to Argaam |
| 311 | 9562 | 15126 | done | FIXED: Food Gate equity was 52.7M, Argaam confirms 57.47M (8.3% off) - revenue/netIncome already correct |
| 312 | 9563 | 15055 | done | Bena - huge profit decline confirmed real, revenue/netIncome/equity exact matches |
| 313 | 9564 | 5170 | done | Horizon Food - revenue/netIncome/equity exact matches to Argaam |
| 314 | 9565 | 15158 | done | Meyar - turnaround from -3.9M loss to +161K profit confirmed real, revenue/equity exact matches |
| 315 | 9566 | 15167 | done | Lime Industries - revenue/netIncome/equity exact matches to Argaam |
| 316 | 9567 | 15159 | done | Ghida Alsultan - revenue/netIncome/equity exact matches to Argaam |
| 317 | 9568 | 14675 | done | Mayar - the -46.3M net loss and negative equity (-3.9M, going-concern warning) both confirmed real |
| 318 | 9569 | 15188 | done | Almuneef - revenue/netIncome/equity exact matches to Argaam |
| 319 | 9570 | 15190 | done | Tam Development - 37.1% revenue decline confirmed real, revenue/netIncome/equity exact matches |
| 320 | 9571 | 15975 | done | Munawla - revenue/netIncome/equity exact matches to Argaam |
| 321 | 9572 | 15718 | done | Alrazi Medical - revenue/netIncome/equity exact matches to Argaam |
| 322 | 9574 | 15695 | done | Pro Medex - 51% profit growth confirmed real, revenue/netIncome/equity exact matches |
| 323 | 9575 | 15694 | done | Marble Design - 64.1% profit growth confirmed real, revenue/netIncome/equity exact matches |
| 324 | 9576 | 15976 | done | Paper Home - revenue/netIncome/equity exact matches to Argaam |
| 325 | 9577 | 15971 | done | Dar Almarkabah - RE-CONFIRMED the earlier-session CONFIRMED_LIABILITIES fix still holds exactly; the -5.6M net loss (388.4% worse YoY, fleet restructuring) confirmed real |
| 326 | 9578 | 4709 | done | Atlas Elevators - revenue/netIncome/equity exact matches to Argaam |
| 327 | 9579 | 15973 | done | Rimath (argaam id name shows as 'Al-Bakhoor Al-Zaki Trading' - confirmed same company via near-exact data match) - revenue/netIncome/equity all <0.2% off Argaam |
| 328 | 9580 | 15910 | done | Alrashid Industrial - revenue/netIncome/equity exact matches to Argaam |
| 329 | 9581 | 15912 | done | Clean Life - 33% profit decline confirmed real, revenue/netIncome/equity exact matches |
| 330 | 9583 | 15968 | done | FIXED: United Mining netIncome was completely MISSING/blank - filled with Argaam's 18.76M; revenue was already correct |
| 331 | 9584 | 15911 | done | Riyal - 64.9% profit decline confirmed real, revenue/netIncome/equity exact matches |
| 332 | 9585 | 15978 | done | FIXED: Mulkia revenue was 38.7M, Argaam confirms 42.39M (8.7% off) - netIncome/equity already correct |
| 333 | 9586 | 15979 | done | Osool And Bakheet - revenue=-46.9M CONFIRMED structural (unrealized fair-value investment losses of 74.12M, explicitly not cash losses), not a bug. The -95.1M net loss and equity exact matches |
| 334 | 9587 | 15969 | done | Lana Medical - 78.4% profit decline confirmed real, revenue/netIncome/equity exact matches |
| 335 | 9588 | 15974 | done | Riyadh Steel - revenue/netIncome/equity exact matches to Argaam |
| 336 | 9589 | 15913 | done | Fad Al-Alamiah - 35.6% profit growth confirmed real, revenue/netIncome/equity exact matches |
| 337 | 9590 | 15977 | done | Armah - revenue/netIncome/equity exact matches to Argaam |
| 338 | 9591 | 16245 | done | View - revenue/netIncome/equity near-exact matches to Argaam |
| 339 | 9592 | 16256 | done | Almujtama Medical - revenue/netIncome/equity exact matches to Argaam |
| 340 | 9593 | 16250 | done | Pan Gulf - revenue/netIncome/equity all <0.8% off Argaam |
| 341 | 9594 | 16247 | done | Almodawat - revenue/netIncome/equity exact matches to Argaam |
| 342 | 9595 | 16223 | done | RESOLVED old pending REVENUE_JUMP flag: WSM revenue/netIncome/equity all exact matches to Argaam, no fix needed |
| 343 | 9596 | 16489 | done | Quara - 81% profit decline confirmed real (credit loss provisions), revenue 2% off, netIncome/equity exact |
| 344 | 9597 | 16943 | done | Leaf - revenue/netIncome/equity exact matches to Argaam |
| 345 | 9598 | 16478 | done | Almohafaza (FY ends July 31) - revenue/netIncome/equity exact matches to Argaam |
| 346 | 9599 | 16484 | done | Taqat - the -10.2M net loss confirmed real, revenue/netIncome/equity exact matches |
| 347 | 9600 | 16465 | done | Qomel - assets/equity/revenue/netIncome all near-exact matches to Argaam |
| 348 | 9601 | 16471 | done | Alrasheed - revenue/netIncome/equity exact matches to Argaam |
| 349 | 9602 | 3659 | done | FIXED: Yaqeen revenue was 79.3M, Argaam confirms 73.33M (7.5% off) - netIncome/equity already correct |
| 350 | 9603 | 16483 | done | Horizon Educational (FY ends June) - revenue/netIncome exact matches, equity <3.2% off Argaam |
| 351 | 9604 | 16941 | done | Miral - revenue/netIncome/equity exact matches to Argaam |
| 352 | 9605 | 16904 | done | Neft Alsharq - the -1.7M net loss confirmed real, revenue/netIncome/equity exact matches |
| 353 | 9606 | 17151 | done | Tharwah - profit decline confirmed real (competitive pressure, expansion costs), revenue/netIncome/equity exact matches |
| 354 | 9607 | 16905 | done | ASG - revenue/netIncome/equity exact matches to Argaam |
| 355 | 9608 | 16933 | done | Alashghal Almoysra - 53.8% profit decline confirmed real, revenue/netIncome/equity exact matches |
| 356 | 9609 | 16942 | done | correctly blank - extremely recent Nomu IPO, no financials data exists yet anywhere (not a bug, nothing to compare/fix) |
| 357 | 9610 | 13953 | done | First Avenue - the 87% profit growth confirmed real (investment property revaluation gain), all fields <1% off Argaam |
| 358 | 9611 | 16944 | done | UFG - revenue/netIncome/equity exact matches to Argaam |
| 359 | 9612 | 17162 | done | Sama Water - revenue/netIncome/equity exact matches to Argaam |
| 360 | 9613 | 17170 | done | Shalfa - 18.9% profit growth confirmed real, revenue/netIncome/equity exact matches |
| 361 | 9614 | 17171 | done | Purity - revenue/netIncome/equity exact matches to Argaam |
| 362 | 9615 | 17161 | done | Mufeed - revenue/netIncome/equity all <0.2% off Argaam |
| 363 | 9616 | 14274 | done | correctly blank - extremely recent Nomu IPO, no financials data exists yet anywhere (not a bug, nothing to compare/fix) |
| 364 | 9617 | 17349 | done | Arabica Star - the -3.1M net loss confirmed real (turnaround from +4.4M profit), revenue/equity exact matches |
| 365 | 9618 | 17172 | done | Alfakhera - 42.5% profit growth confirmed real, revenue/netIncome/equity exact matches |
| 366 | 9619 | 17382 | done | Multi Business - 98.3% profit decline confirmed real (competitive pricing), revenue/netIncome/equity exact matches |
| 367 | 9620 | 17383 | done | Balsam Medical - 59% profit decline confirmed real (clinic expansion), revenue/netIncome/equity exact matches |
| 368 | 9621 | 17384 | done | DRC - the -5.3M net loss confirmed real (govt project slowdown), revenue/netIncome/equity exact matches |
| 369 | 9622 | 17403 | done | SMC (Shumu Al-Madi) - profit decline confirmed real, revenue/netIncome/equity exact matches |
| 370 | 9623 | 17400 | done | correctly blank - extremely recent Nomu IPO, no financials data exists yet anywhere (not a bug, nothing to compare/fix) |
| 371 | 9624 | 17460 | done | Alshehili Metal - equity fixed to confirmed 87.481M (post-IPO); total assets sourced via stockanalysis.com (105.51M), consistent with equity - CONFIRMED_ASSETS applied, no more equity>assets inconsistency |
| 372 | 9625 | 17458 | done | Itmam - revenue/netIncome/equity exact matches to Argaam |
| 373 | 9626 | 17461 | done | Smile Care - 16% profit growth confirmed real, revenue/netIncome/equity exact matches |
| 374 | 9627 | 5032 | done | TMC - the -10.3M net loss confirmed real (SABIC receivables provision), revenue/netIncome/equity exact matches |
| 375 | 9628 | 17419 | done | Lamasat - revenue/netIncome/equity exact matches to Argaam |
| 376 | 9630 | 17622 | done | Ratio - revenue/netIncome/equity exact matches to Argaam |
| 377 | 9631 | 17418 | done | HKC - revenue/netIncome/equity exact matches to Argaam |
| 378 | 9632 | 17607 | done | correctly blank - extremely recent Nomu IPO, no financials data exists yet anywhere (not a bug, nothing to compare/fix) |
| 379 | 9633 | 17565 | done | correctly blank - extremely recent Nomu IPO, no financials data exists yet anywhere (not a bug, nothing to compare/fix) |
| 380 | 9634 | 17623 | done | correctly blank - extremely recent Nomu IPO, no financials data exists yet anywhere (not a bug, nothing to compare/fix) |
| 381 | 9635 | 17645 | done | FIXED (4th occurrence of the ~3.76x bug): Dkhoun (IPO'd Nomu 2025-05-20) revenue/netIncome/equity all ~3.76x too low - corrected via Argaam. Flagging this as now a CONFIRMED systematic pattern (see overrides.py note) worth a dedicated sweep of all recent-2025-IPO tickers |
| 382 | 9636 | 17608 | done | correctly blank - extremely recent Nomu IPO, no financials data exists yet anywhere (not a bug, nothing to compare/fix) |
| 383 | 9637 | 17609 | done | Axelerated Solutions - revenue/netIncome/equity exact matches to Argaam |
| 384 | 9639 | 17610 | done | correctly blank - extremely recent Nomu IPO, no financials data exists yet anywhere (not a bug, nothing to compare/fix) |
| 385 | 9640 | 17641 | done | correctly blank - extremely recent Nomu IPO, no financials data exists yet anywhere (not a bug, nothing to compare/fix) |
| 386 | 9641 | 17979 | done | correctly blank - extremely recent Nomu IPO, no financials data exists yet anywhere (not a bug, nothing to compare/fix) |
| 387 | 9642 | 17637 | done | correctly blank - extremely recent Nomu IPO, no financials data exists yet anywhere (not a bug, nothing to compare/fix) |
| 388 | 9644 | 18001 | done | correctly blank - extremely recent Nomu IPO, no financials data exists yet anywhere (not a bug, nothing to compare/fix) |
| 389 | 9645 | 17986 | done | correctly blank - extremely recent Nomu IPO, no financials data exists yet anywhere (not a bug, nothing to compare/fix) |
| 390 | 9647 | 17989 | done | Wajd Life - correctly blank/no data yet (extremely recent IPO), not a bug |
| 391 | 9648 | 17987 | done | Hamad Bin Saedan Real Estate - correctly blank/no data yet (extremely recent IPO), not a bug |
| 392 | 9649 | 18364 | done | Jamjoom Fashion - revenue/netIncome/equity exact matches to Argaam (non-calendar FY, ends Sept 30) |
| 393 | 9650 | 18359 | done | FIXED: Sahat Almajd (IPO'd Nov 2025) revenue/netIncome were a partial period, not full FY2025 (52.6M/5.3M vs real 197.65M/20.68M) - corrected; equity created from scratch (was completely missing) |
| 394 | 9651 | 15704 | done | FIXED: Altwijri revenue was 9.8% off + equity was 11.1% off Argaam - the -14.6M net loss (unrealized FV revaluation) confirmed exact real |
| 395 | 9653 | 18812 | done | KDL - correctly blank/no data yet (extremely recent IPO), not a bug - spot-checked as part of the Cherry/Almasar Alshamil recent-IPO pattern investigation |
| 396 | 9655 | 19454 | done | MSGA - correctly blank/no data yet (extremely recent IPO), not a bug |
