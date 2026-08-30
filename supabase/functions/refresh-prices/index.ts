// Refreshes live price + market cap for every company in the `companies`
// table. Saudi tickers go through Yahoo Finance's public chart endpoint
// (WiseSheets has zero Tadawul coverage on any of its products). US
// tickers go through WiseSheets' own /v1/prices/live REST endpoint —
// genuinely real-time, headless, and part of the same subscription
// already used for financials, so there's no reason to use Yahoo for them.

const SAUDI_EXCHANGES = new Set(["تداول", "نمو"]);
const YAHOO_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
const CONCURRENCY = 15;

async function wisesheetsLivePrices(tickers: string[]): Promise<{ prices: Map<string, number>; debug: Record<string, unknown> }> {
  const key = Deno.env.get("WISESHEETS_KEY");
  const result = new Map<string, number>();
  if (!key || tickers.length === 0) {
    return { prices: result, debug: { keyPresent: !!key, tickers: tickers.length } };
  }
  const res = await fetch(
    `https://api.wisesheets.io/v1/prices/live?tickers=${tickers.join(",")}`,
    { headers: { Authorization: `Bearer ${key}` } },
  );
  const text = await res.text();
  let data: { data?: Array<{ symbol: string; price: string }> } = {};
  try {
    data = JSON.parse(text);
  } catch {
    // non-JSON response, leave data empty
  }
  for (const row of data?.data ?? []) {
    const price = parseFloat(row.price);
    if (!Number.isNaN(price)) result.set(row.symbol, price);
  }
  return {
    prices: result,
    debug: { keyPresent: !!key, status: res.status, bodySnippet: text.slice(0, 300) },
  };
}

function parseShares(shareCount: unknown): number | null {
  const count = (shareCount as { count?: string } | null)?.count;
  if (!count) return null;
  const m = String(count).trim().match(/^([\d.]+)\s*([BMK]?)/);
  if (!m) return null;
  const num = parseFloat(m[1]);
  const mult: Record<string, number> = { B: 1e9, M: 1e6, K: 1e3, "": 1 };
  return num * (mult[m[2]] ?? 1);
}

// Parses "-1.4B SAR" / "250.1M USD" / "3.2 SAR" style strings used
// throughout the companies table's JSON columns.
function parseMoney(s: unknown): number | null {
  if (typeof s !== "string") return null;
  const m = s.trim().match(/^(-?[\d.]+)\s*([TBMK]?)/);
  if (!m) return null;
  const mult: Record<string, number> = { T: 1e12, B: 1e9, M: 1e6, K: 1e3, "": 1 };
  return parseFloat(m[1]) * (mult[m[2]] ?? 1);
}

function fmtX(n: number): string {
  return `${n.toFixed(1)}x`;
}

function parsePercent(s: unknown): number | null {
  if (typeof s !== "string") return null;
  const m = s.trim().match(/^(-?[\d.]+)\s*%/);
  return m ? parseFloat(m[1]) / 100 : null;
}

// Recomputes P/E, P/B, and EV/EBITDA from the just-refreshed live market
// cap against the latest reported net income / equity / EBITDA margin —
// these only change when a new financial report lands, so they stay
// valid between reports while market cap moves every refresh. Without
// this, `valuation` stays frozen at whatever it was on the last full
// data import and silently drifts out of sync with the live price shown
// right next to it.
//
// EV/EBITDA needs an EBITDA figure, which isn't stored directly - there's
// no `ebitda` field anywhere in `financials`. It's derived instead as
// revenue × the "EBITDA margin" row already stored under
// financial_ratios → "Detailed profitability margins" - a real stored
// figure, not an assumption, but ONE CAVEAT: that margin was itself
// computed at the same original import time as everything else, so if
// the source data for a given company had the kind of accuracy problems
// found across this session's review (revenue tagging, stale figures,
// etc.), the margin inherits that. This recompute only removes the
// market-cap-staleness half of the problem, same as P/E and P/B. If
// EV/EBITDA still looks wrong for a specific company after this, the
// EBITDA margin input itself needs checking against a real source -
// Argaam doesn't publish a clean EBITDA figure for most companies, so
// that wasn't independently verified this session.
function recomputeValuation(
  valuation: unknown,
  marketCap: number,
  financials: unknown,
  balanceSheet: unknown,
  financialRatios: unknown,
): unknown {
  if (!Array.isArray(valuation)) return valuation;
  const latestYear = Array.isArray(financials) ? financials[0] : null;
  const latestNetIncome = parseMoney(latestYear?.netIncome);
  const latestRevenue = parseMoney(latestYear?.revenue);

  const equityRow = Array.isArray(balanceSheet)
    ? balanceSheet.find((r: any) => r?.label?.en === "Total Stockholders Equity")
    : null;
  const equity = parseMoney(equityRow?.value);

  const debtRow = Array.isArray(balanceSheet)
    ? balanceSheet.find((r: any) => r?.label?.en === "Total Debt")
    : null;
  const cashRow = Array.isArray(balanceSheet)
    ? balanceSheet.find((r: any) => r?.label?.en === "Cash")
    : null;
  const totalDebt = parseMoney(debtRow?.value) ?? 0;
  const cash = parseMoney(cashRow?.value) ?? 0;

  const marginsGroup = Array.isArray(financialRatios)
    ? financialRatios.find((g: any) => g?.group?.en === "Detailed profitability margins")
    : null;
  const ebitdaMarginRow = marginsGroup?.rows?.find((r: any) => r?.label?.en === "EBITDA margin");
  const ebitdaMargin = parsePercent(ebitdaMarginRow?.value);
  const ebitda = ebitdaMargin != null && latestRevenue != null ? latestRevenue * ebitdaMargin : null;
  const enterpriseValue = marketCap + totalDebt - cash;

  return valuation.map((v: any) => {
    if (v?.label?.en === "P/E" && latestNetIncome) {
      return { ...v, companyValue: fmtX(marketCap / latestNetIncome) };
    }
    if (v?.label?.en === "P/B" && equity) {
      return { ...v, companyValue: fmtX(marketCap / equity) };
    }
    if (v?.label?.en === "EV/EBITDA" && ebitda) {
      return { ...v, companyValue: fmtX(enterpriseValue / ebitda) };
    }
    return v;
  });
}

function fmtBig(n: number, currency: string): string {
  const sign = n < 0 ? "-" : "";
  n = Math.abs(n);
  if (n >= 1e12) return `${sign}${(n / 1e12).toFixed(2)}T ${currency}`;
  if (n >= 1e9) return `${sign}${(n / 1e9).toFixed(1)}B ${currency}`;
  if (n >= 1e6) return `${sign}${(n / 1e6).toFixed(1)}M ${currency}`;
  return `${sign}${n.toFixed(2)} ${currency}`;
}

async function yahooPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
      { headers: { "User-Agent": YAHOO_UA } },
    );
    const data = await res.json();
    const result = data?.chart?.result;
    return result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeaders = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  };

  // ?market=sa or ?market=us restricts the run to that half — lets Saudi
  // (Yahoo) and US (WiseSheets) run on independent cron schedules instead
  // of always refreshing both together. No param = refresh everything.
  const market = new URL(req.url).searchParams.get("market");

  const listRes = await fetch(
    `${SUPABASE_URL}/rest/v1/companies?select=ticker,exchange,share_count,financials,balance_sheet,valuation,financial_ratios`,
    { headers: authHeaders },
  );
  let companies: Array<{
    ticker: string;
    exchange: string;
    share_count: unknown;
    financials: unknown;
    balance_sheet: unknown;
    valuation: unknown;
    financial_ratios: unknown;
  }> = await listRes.json();

  if (market === "sa") companies = companies.filter((c) => SAUDI_EXCHANGES.has(c.exchange));
  if (market === "us") companies = companies.filter((c) => !SAUDI_EXCHANGES.has(c.exchange));

  let ok = 0;
  let failed = 0;
  const queue = [...companies];

  const usTickers = companies.filter((c) => !SAUDI_EXCHANGES.has(c.exchange)).map((c) => c.ticker);
  const { prices: usPrices, debug } = await wisesheetsLivePrices(usTickers);

  async function worker() {
    while (queue.length) {
      const c = queue.shift();
      if (!c) break;
      const isSaudi = SAUDI_EXCHANGES.has(c.exchange);
      const currency = isSaudi ? "SAR" : "USD";
      const price = isSaudi ? await yahooPrice(`${c.ticker}.SR`) : usPrices.get(c.ticker) ?? null;
      if (price == null) {
        failed++;
        continue;
      }
      const payload: Record<string, unknown> = {
        price: `${price.toFixed(2)} ${currency}`,
      };
      const shares = parseShares(c.share_count);
      if (shares) {
        const marketCap = price * shares;
        payload.market_cap = fmtBig(marketCap, currency);
        payload.valuation = recomputeValuation(c.valuation, marketCap, c.financials, c.balance_sheet, c.financial_ratios);
      }

      const patchRes = await fetch(
        `${SUPABASE_URL}/rest/v1/companies?ticker=eq.${encodeURIComponent(c.ticker)}`,
        {
          method: "PATCH",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify(payload),
        },
      );
      if (patchRes.ok) ok++;
      else failed++;
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  return new Response(JSON.stringify({ total: companies.length, ok, failed, debug }), {
    headers: { "Content-Type": "application/json" },
  });
});
