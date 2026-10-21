import type { Company } from "@/data/types";

/** Public presentation only. Never writes to or qualifies the stored CMS record.
 * This CMS schema has no quote-as-of or per-metric evidence/approval contract.
 * Unsupported advice, estimates and derived comparisons must not become public
 * merely because an administrator populated their display fields.
 */
export function publicCompanyContent(company: Company): Company {
  const blank = { ar: "", en: "" };
  return {
    ...company,
    change: "",
    decisionCard: [],
    valuation: [],
    historicalValuation: [],
    valuationScenarios: {
      bear: { price: "", change: "" },
      base: { price: "", change: "" },
      bull: { price: "", change: "" },
    },
    analystConsensus: { rating: blank, analystCount: null, targetPrice: "", upside: "" },
    forwardEstimates: [],
    growthOutlook: [],
    financialHealth: [],
    financialRatios: [],
    stockPerformance: {
      period: blank,
      companyReturn: null,
      benchmarkName: blank,
      benchmarkReturn: null,
    },
    competitors: [],
    dividends: {
      payer: false,
      yield: "",
      lastPayout: "",
      growth3y: "",
      sustainabilityScore: null,
      sustainabilityLabel: blank,
    },
    tradingStats: { weekLow52: "", weekHigh52: "", volume: "", beta: "", creditRating: "" },
    shortInterest: { percent: "", daysToCover: "", note: blank },
    priceHistory: [],
    marginTrend: { note: blank, values: [] },
    insiderTrades: [],
    upcomingEvents: [],
    dataSources: [],
    // A publisher name alone is not an article/source reference.
    news: [],
    financials: company.financials.map(({ year, revenue, netIncome, cashFlow }) => ({
      year,
      revenue,
      netIncome,
      cashFlow,
      margin: "",
      roic: "",
    })),
    quarterlyResults: company.quarterlyResults.map(({ quarter, revenue, profit }) => ({
      quarter,
      revenue,
      profit,
      vsEstimate: blank,
    })),
  };
}
