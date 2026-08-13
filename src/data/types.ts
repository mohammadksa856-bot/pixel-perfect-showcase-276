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
