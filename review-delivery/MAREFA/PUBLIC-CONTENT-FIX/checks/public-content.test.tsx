import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import type { Company } from "../../../../src/data/types";
import { publicCompanyContent } from "../../../../src/lib/public-content";
import { MarketTicker } from "../../../../src/components/MarketTicker";
import { PriceChart } from "../../../../src/components/price-chart";
import {
  CompanyPanel,
  CompanyDataUnavailable,
  UnavailableFinancialContent,
} from "../../../../src/components/company-content-status";
import { I18nProvider } from "../../../../src/lib/i18n";
import { getMarketIdentity } from "../../../../src/data/market-identities";
import { markets } from "../../../../src/data/markets";

const text = { ar: "TEST-UNSUPPORTED-ADVICE", en: "TEST-UNSUPPORTED-ADVICE" };
function fixture() {
  return {
    id: "synthetic-company",
    name: { ar: "شركة اختبار", en: "Test Company" },
    price: "12.34 TEST",
    marketCap: "50 TEST",
    change: "+991%",
    financials: [
      {
        year: "2024",
        revenue: "10 TEST",
        netIncome: "2 TEST",
        cashFlow: "3 TEST",
        margin: "TEST-MARGIN",
        roic: "TEST-ROIC",
      },
    ],
    quarterlyResults: [
      {
        quarter: "Q1 2025",
        revenue: "4 TEST",
        profit: "1 TEST",
        vsEstimate: text,
        reading: "good",
      },
    ],
    analystConsensus: {
      rating: text,
      analystCount: 999,
      targetPrice: "TEST-TARGET",
      upside: "TEST-UPSIDE",
    },
    valuationScenarios: {
      bear: { price: "TEST-BEAR" },
      base: { price: "TEST-BASE" },
      bull: { price: "TEST-BULL" },
    },
    dividends: {
      payer: true,
      yield: "TEST-YIELD",
      sustainabilityScore: 99,
      sustainabilityLabel: text,
    },
    stockPerformance: { period: text, companyReturn: 99, benchmarkName: text, benchmarkReturn: 88 },
    tradingStats: { volume: "TEST-VOLUME", beta: "TEST-BETA", creditRating: "TEST-RATING" },
    shortInterest: { percent: "TEST-SHORT" },
    ...Object.fromEntries(
      [
        "decisionCard",
        "valuation",
        "historicalValuation",
        "forwardEstimates",
        "growthOutlook",
        "financialHealth",
        "financialRatios",
        "competitors",
        "priceHistory",
        "insiderTrades",
        "upcomingEvents",
        "dataSources",
        "news",
      ].map((k) => [k, [{ marker: "TEST-UNSUPPORTED-ADVICE" }]]),
    ),
    marginTrend: { values: [99, 100], note: text },
  } as unknown as Company;
}

describe("Public CMS projection — no qualification or storage mutation", () => {
  for (const field of [
    "change",
    "decisionCard",
    "valuation",
    "historicalValuation",
    "valuationScenarios",
    "analystConsensus",
    "forwardEstimates",
    "growthOutlook",
    "financialHealth",
    "financialRatios",
    "stockPerformance",
    "competitors",
    "dividends",
    "tradingStats",
    "shortInterest",
    "priceHistory",
    "marginTrend",
    "insiderTrades",
    "upcomingEvents",
    "dataSources",
    "news",
  ] as const) {
    test(`unsupported ${field} cannot cross the content projection`, () => {
      const result = publicCompanyContent(fixture());
      expect(JSON.stringify(result[field])).not.toContain("TEST-");
      expect(result).not.toHaveProperty("financiallyApproved");
    });
  }
  test("does not mutate or delete stored input", () => {
    const input = fixture();
    const before = JSON.stringify(input);
    publicCompanyContent(input);
    expect(JSON.stringify(input)).toBe(before);
  });
  test("preserves saved quote and market cap, not stale change", () => {
    const result = publicCompanyContent(fixture());
    expect([result.price, result.marketCap, result.change]).toEqual(["12.34 TEST", "50 TEST", ""]);
  });
  test("preserves historical periods/amounts but not unverified derived columns", () => {
    expect(publicCompanyContent(fixture()).financials).toEqual([
      {
        year: "2024",
        revenue: "10 TEST",
        netIncome: "2 TEST",
        cashFlow: "3 TEST",
        margin: "",
        roic: "",
      },
    ]);
  });
  test("quarter periods/amounts preserved; estimate comparison and colour removed", () => {
    expect(publicCompanyContent(fixture()).quarterlyResults).toEqual([
      { quarter: "Q1 2025", revenue: "4 TEST", profit: "1 TEST", vsEstimate: { ar: "", en: "" } },
    ]);
  });
  test("projection is idempotent", () => {
    const once = publicCompanyContent(fixture());
    expect(publicCompanyContent(once)).toEqual(once);
  });
  test("unsupported markers absent from serialized public content", () => {
    const serialized = JSON.stringify(publicCompanyContent(fixture()));
    for (const marker of ["TEST-UNSUPPORTED", "TEST-MARGIN", "TEST-ROIC", "+991%", "TEST-TARGET"])
      expect(serialized).not.toContain(marker);
  });
});

describe("Rendered boundaries", () => {
  test("market ticker renders no figures or fake refresh time", () =>
    expect(renderToStaticMarkup(<MarketTicker />)).toBe(""));
  test("even a supplied series cannot render a demo quote or SVG chart", () => {
    const html = renderToStaticMarkup(
      <I18nProvider>
        <PriceChart
          data={[
            { date: "2024-01-01", price: 876543.21 },
            { date: "2024-01-02", price: 987654.32 },
          ]}
        />
      </I18nProvider>,
    );
    expect(html).not.toContain("876543");
    expect(html).not.toContain("987654");
    expect(html).not.toContain("<svg");
    expect(html).toContain('data-content-status="unavailable"');
  });
  test("retained section has local evidence status", () => {
    const html = renderToStaticMarkup(
      <I18nProvider>
        <CompanyPanel title="Test">
          <span>Stored text</span>
        </CompanyPanel>
      </I18nProvider>,
    );
    expect(html).toContain('data-content-status="unverified"');
    expect(html).toContain("Stored text");
  });
  test("valuation missingness is stated, not replaced", () => {
    expect(
      renderToStaticMarkup(
        <I18nProvider>
          <UnavailableFinancialContent />
        </I18nProvider>,
      ),
    ).toContain("غير متاحة");
  });
  test("source failure shows unavailable without exception detail or financial substitute", () => {
    const html = renderToStaticMarkup(
      <I18nProvider>
        <CompanyDataUnavailable />
      </I18nProvider>,
    );
    expect(html).toContain("تعذر الوصول");
    expect(html).not.toContain("TEST");
    expect(html).not.toContain("stack");
  });
});

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../../../../${path}`, import.meta.url)), "utf8");
describe("Shared public paths and static claims", () => {
  test("all seven existing market identities preserved without quote values", () => {
    for (const { slug, name, symbol } of markets)
      expect(getMarketIdentity(slug)).toEqual({ slug, name, symbol });
  });
  test("unknown market identity remains unavailable", () =>
    expect(getMarketIdentity("not-a-market")).toBeUndefined());
  test("public route does not import stored demo market quotes", () =>
    expect(source("src/routes/markets.$slug.tsx")).not.toContain('from "@/data/markets"'));
  test("public access layer projects company records and throws on fetch error", () => {
    const code = source("src/lib/content.ts");
    expect(code).toContain("return publicCompanyContent({");
    expect(code.match(/if \(error\) throw error;/g)!.length).toBeGreaterThan(2);
  });
  test("market loader serializes identity only", () => {
    const code = source("src/routes/markets.$slug.tsx");
    expect(code).toContain("return { name: market.name, symbol: market.symbol }");
    expect(code).not.toMatch(/market\.(value|change)/);
  });
  test("fixed update time and contact developer note removed", () => {
    expect(source("src/lib/i18n.tsx")).not.toContain("2 minutes ago");
    expect(source("src/lib/i18n.tsx")).not.toContain("قبل دقيقتين");
    const contact = source("src/routes/contact.tsx");
    expect(contact).not.toContain(".example");
    expect(contact).not.toContain("replace it");
  });
  test("sector has no unsupported cadence or stale performance aggregate", () => {
    const code = source("src/routes/sectors.$slug.tsx");
    for (const fragment of ["avgChange", "updates weekly", "بشكل أسبوعي", "moving to daily"])
      expect(code).not.toContain(fragment);
  });
  test("unavailable performance sort removed from every company listing", () => {
    for (const route of ["companies.index", "markets.saudi", "markets.us"])
      expect(source(`src/routes/${route}.tsx`)).not.toContain('sort === "change"');
  });
  test("company route uses unavailable state on error and section-level status", () => {
    const code = source("src/routes/companies.$slug.tsx");
    expect(code).toContain("errorComponent: CompanyDataUnavailable");
    expect(code).toContain("CompanyPanel as Panel");
    expect(code).not.toContain("company.change");
  });
});
