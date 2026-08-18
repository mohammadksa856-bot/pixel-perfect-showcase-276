import type { LocalizedText } from "@/lib/i18n";

export type Sector = {
  slug: string;
  name: LocalizedText;
  tagline: LocalizedText;
  description: LocalizedText;
  about: LocalizedText;
  performanceSummary?: LocalizedText | undefined;
  performanceUpdatedAt?: string | undefined;
  icon: string;
  tone: string;
  companies: number;
  research: number;
};

export type CompanyMetric = { label: LocalizedText; value: string };

export type ValuationRow = {
  label: LocalizedText;
  companyValue: string;
  sectorAvg?: string | undefined;
  marketAvg?: string | undefined;
  reading?: "good" | "warning" | "bad" | undefined;
  readingText?: LocalizedText | undefined;
};

export type CompanySection = { key: string; title: LocalizedText; body: LocalizedText };

export type FinancialRow = {
  year: string;
  revenue: string;
  netIncome: string;
  cashFlow: string;
  margin: string;
  roic: string;
};

export type ExecutiveSummary = {
  strengths: LocalizedText[];
  risks: LocalizedText[];
  catalysts: LocalizedText[];
  watchPoints: LocalizedText[];
};

export type StockPerformance = {
  period: LocalizedText;
  companyReturn: number | null;
  benchmarkName: LocalizedText;
  benchmarkReturn: number | null;
};

export type Competitor = {
  name: string;
  marketCap: string;
  pe: string;
  dividend: string;
};

export type FinancialHealthItem = {
  status: "good" | "warning" | "bad";
  text: LocalizedText;
};

export type GrowthOutlookRow = { label: LocalizedText; value: string };

export type DividendInfo = {
  payer: boolean;
  yield: string;
  lastPayout: string;
  growth3y: string;
  sustainabilityScore: number | null;
  sustainabilityLabel: LocalizedText;
};

export type RatioRow = {
  label: LocalizedText;
  value: string;
  reading?: "good" | "warning" | "bad" | undefined;
};

export type RatioGroup = { group: LocalizedText; rows: RatioRow[] };

export type BalanceSheetRow = { label: LocalizedText; value: string };

export type ShortInterest = {
  percent: string;
  daysToCover: string;
  note: LocalizedText;
};

export type TradingStats = {
  weekLow52: string;
  weekHigh52: string;
  volume: string;
  beta: string;
  creditRating: string;
};

export type Ownership = {
  government: string;
  freeFloat: string;
  holders: { name: LocalizedText; percent: string }[];
};

export type RevenueBreakdownRow = { label: LocalizedText; percent: number };

export type AnalystConsensus = {
  rating: LocalizedText;
  analystCount: number | null;
  targetPrice: string;
  upside: string;
};

export type UpcomingEvent = {
  title: LocalizedText;
  date: string;
  type: "earnings" | "dividend" | "other";
};

export type OfficialDoc = { label: LocalizedText; url: string };

export type DataSource = {
  label: LocalizedText;
  note: LocalizedText;
  kind: "live" | "official" | "ai";
};

export type DecisionCardItem = {
  label: LocalizedText;
  value: LocalizedText;
  reading?: "good" | "warning" | "bad" | undefined;
};
export type SegmentProfitRow = {
  label: LocalizedText;
  revenueShare: string;
  profitShare: string;
};
export type GeoRevenueRow = { label: LocalizedText; percent: number };
export type ConcentrationItem = {
  status: "good" | "warning" | "bad";
  text: LocalizedText;
};
export type KpiRow = { label: LocalizedText; value: string };
export type ManagementRow = { role: LocalizedText; name: LocalizedText; tenure: LocalizedText };
export type ProjectRow = { title: LocalizedText; status: LocalizedText };
export type TimelineRow = { year: string; event: LocalizedText };
export type QuarterRow = {
  quarter: string;
  revenue: string;
  profit: string;
  vsEstimate: LocalizedText;
  reading?: "good" | "warning" | "bad" | undefined;
};
export type CashFlowRow = {
  label: LocalizedText;
  value: string;
  reading?: "good" | "warning" | "bad" | undefined;
};
export type ShareCount = { count: string; yearChange: string; buyback: LocalizedText };
export type MarginTrend = { note: LocalizedText; values: number[] };
export type DebtMaturityRow = { year: string; amount: string };
export type CapitalAllocationRow = { label: LocalizedText; percent: number };
export type HistoricalValuationRow = {
  label: LocalizedText;
  current: string;
  avg5y: string;
  reading?: "good" | "warning" | "bad" | undefined;
  readingText: LocalizedText;
};
export type Scenario = { price: string; change: string };
export type ValuationScenarios = { bear: Scenario; base: Scenario; bull: Scenario };
export type ForwardEstimateRow = { year: string; revenue: string; forwardPe: string };
export type InsiderTrade = { text: LocalizedText; direction: "buy" | "sell" | "neutral" };
export type RiskItem = {
  category: LocalizedText;
  kind: "operational" | "market" | "regulatory" | "financial";
  text: LocalizedText;
};
export type RegulatoryItem = { title: LocalizedText; note: LocalizedText };

export type PricePoint = { date: string; price: number };

export type Company = {
  id: string;
  ticker: string;
  slug: string;
  name: LocalizedText;
  exchange: string;
  sectorSlug: string;
  country: LocalizedText;
  price: string;
  change: string;
  marketCap: string;
  short: LocalizedText;
  description: LocalizedText;
  sections: CompanySection[];
  goals: LocalizedText;
  financials: FinancialRow[];
  valuation: ValuationRow[];
  news: { title: LocalizedText; source: string; date: string }[];
  faqs: { q: LocalizedText; a: LocalizedText }[];
  howToBuy: LocalizedText[];
  sectorName: LocalizedText;
  sectorTone: string;
  ceo: LocalizedText;
  foundedYear: number | null;
  headquarters: LocalizedText;
  website: string | null;
  executiveSummary: ExecutiveSummary;
  stockPerformance: StockPerformance;
  competitors: Competitor[];
  financialHealth: FinancialHealthItem[];
  growthOutlook: GrowthOutlookRow[];
  dividends: DividendInfo;
  financialRatios: RatioGroup[];
  balanceSheet: BalanceSheetRow[];
  shortInterest: ShortInterest;
  tradingStats: TradingStats;
  ownership: Ownership;
  revenueBreakdown: RevenueBreakdownRow[];
  analystConsensus: AnalystConsensus;
  upcomingEvents: UpcomingEvent[];
  officialDocs: OfficialDoc[];
  dataSources: DataSource[];
  logo: string | null;
  employeeCount: string | null;
  decisionCard: DecisionCardItem[];
  segmentProfit: SegmentProfitRow[];
  geographicRevenue: GeoRevenueRow[];
  customerConcentration: ConcentrationItem[];
  operationalKpis: KpiRow[];
  managementTeam: ManagementRow[];
  insiderOwnership: string | null;
  currentProjects: ProjectRow[];
  companyTimeline: TimelineRow[];
  quarterlyResults: QuarterRow[];
  cashFlow: CashFlowRow[];
  shareCount: ShareCount;
  marginTrend: MarginTrend;
  debtMaturity: DebtMaturityRow[];
  capitalAllocation: CapitalAllocationRow[];
  historicalValuation: HistoricalValuationRow[];
  valuationScenarios: ValuationScenarios;
  forwardEstimates: ForwardEstimateRow[];
  insiderTrades: InsiderTrade[];
  riskItems: RiskItem[];
  regulatoryEnv: RegulatoryItem[];
  priceHistory: PricePoint[];
};

export type Research = {
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  author: LocalizedText;
  authorRole: LocalizedText;
  readingTime: number;
  date: string;
  image: string;
  tags: LocalizedText[];
  sectorSlug: string;
  sections: { id: string; heading: LocalizedText; body: LocalizedText }[];
  references: string[];
};

export type KnowledgeArticle = {
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  category: LocalizedText;
  icon: string;
  level: LocalizedText;
  readingTime: number;
  sections: { heading: LocalizedText; body: LocalizedText }[];
  videos: { title: LocalizedText; duration: string; url?: string }[];
};

export type Board = {
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  image?: string | undefined;
  posts: number;
  members: number;
  tone: string;
  latest: {
    title: LocalizedText;
    author: LocalizedText;
    likes: number;
    comments: number;
    time: LocalizedText;
  }[];
};
