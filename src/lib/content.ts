import { supabase } from "@/integrations/supabase/client";
import type {
  Board,
  Company,
  Competitor,
  DividendInfo,
  ExecutiveSummary,
  FinancialHealthItem,
  CompanySection,
  FinancialRow,
  GrowthOutlookRow,
  KnowledgeArticle,
  Research,
  Sector,
  StockPerformance,
  ValuationRow,
  RatioGroup,
  BalanceSheetRow,
  ShortInterest,
  TradingStats,
  Ownership,
  RevenueBreakdownRow,
  AnalystConsensus,
  UpcomingEvent,
  OfficialDoc,
  DataSource,
} from "@/data/types";
import type { LocalizedText } from "@/lib/i18n";

/**
 * Single access layer for all content. Components import from here only.
 * Backed by the real database (Supabase) — the admin panel edits these
 * same tables, so changes made there show up here automatically.
 */

const empty: LocalizedText = { ar: "", en: "" };

/**
 * Guards against object-shaped columns arriving as arrays or nulls
 * (older rows, or data saved before the admin shape fix). Falls back to
 * the given default so the page renders instead of crashing.
 */
function asObject<T>(value: unknown, fallback: T): T {
  if (!value || Array.isArray(value) || typeof value !== "object") return fallback;
  return { ...fallback, ...(value as object) } as T;
}

/** Guards against array-shaped columns arriving as objects or nulls. */
function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

// ---------- Sectors ----------

type SectorRow = {
  slug: string;
  name: LocalizedText;
  tagline: LocalizedText;
  description: LocalizedText;
  about: LocalizedText | null;
  performance_summary: LocalizedText | null;
  performance_updated_at: string | null;
  icon: string;
  tone: string;
};

function mapSector(row: SectorRow): Sector {
  return {
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    about: row.about ?? empty,
    performanceSummary: row.performance_summary ?? undefined,
    performanceUpdatedAt: row.performance_updated_at ?? undefined,
    icon: row.icon,
    tone: row.tone,
    companies: 0,
    research: 0,
  };
}

const sectorColumns =
  "slug, name, tagline, description, about, performance_summary, performance_updated_at, icon, tone";

export async function getSectors(): Promise<Sector[]> {
  const { data, error } = await supabase
    .from("sectors")
    .select(sectorColumns)
    .eq("published", true)
    .order("sort_order");
  if (error) throw error;
  return ((data ?? []) as unknown as SectorRow[]).map(mapSector);
}

export async function getSector(slug: string): Promise<Sector | undefined> {
  const { data, error } = await supabase
    .from("sectors")
    .select(sectorColumns)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSector(data as unknown as SectorRow) : undefined;
}

// ---------- Companies ----------

type CompanyRow = {
  id: string;
  slug: string;
  ticker: string;
  exchange: string;
  name: LocalizedText;
  country: LocalizedText;
  price: string;
  change: string;
  market_cap: string;
  short: LocalizedText;
  description: LocalizedText;
  sections: CompanySection[];
  goals: LocalizedText | null;
  financials: FinancialRow[];
  valuation: ValuationRow[];
  news: { title: LocalizedText; source: string; date: string }[];
  how_to_buy: LocalizedText[];
  ceo: LocalizedText | null;
  founded_year: number | null;
  headquarters: LocalizedText | null;
  website: string | null;
  executive_summary: ExecutiveSummary | null;
  stock_performance: StockPerformance | null;
  competitors: Competitor[] | null;
  financial_health: FinancialHealthItem[] | null;
  growth_outlook: GrowthOutlookRow[] | null;
  dividends: DividendInfo | null;
  financial_ratios: RatioGroup[] | null;
  balance_sheet: BalanceSheetRow[] | null;
  short_interest: ShortInterest | null;
  trading_stats: TradingStats | null;
  ownership: Ownership | null;
  revenue_breakdown: RevenueBreakdownRow[] | null;
  analyst_consensus: AnalystConsensus | null;
  upcoming_events: UpcomingEvent[] | null;
  official_docs: OfficialDoc[] | null;
  data_sources: DataSource[] | null;
  employee_count: string | null;
  decision_card: unknown;
  segment_profit: unknown;
  geographic_revenue: unknown;
  customer_concentration: unknown;
  operational_kpis: unknown;
  management_team: unknown;
  insider_ownership: string | null;
  current_projects: unknown;
  company_timeline: unknown;
  quarterly_results: unknown;
  cash_flow: unknown;
  share_count: unknown;
  margin_trend: unknown;
  debt_maturity: unknown;
  capital_allocation: unknown;
  historical_valuation: unknown;
  valuation_scenarios: unknown;
  forward_estimates: unknown;
  insider_trades: unknown;
  risk_items: unknown;
  regulatory_env: unknown;
  sectors: { slug: string; name: LocalizedText; tone: string } | null;
};

const companyColumns =
  "id, slug, ticker, exchange, name, country, price, change, market_cap, short, description, sections, goals, financials, valuation, news, how_to_buy, ceo, founded_year, headquarters, website, executive_summary, stock_performance, competitors, financial_health, growth_outlook, dividends, financial_ratios, balance_sheet, short_interest, trading_stats, ownership, revenue_breakdown, analyst_consensus, upcoming_events, official_docs, data_sources, employee_count, decision_card, segment_profit, geographic_revenue, customer_concentration, operational_kpis, management_team, insider_ownership, current_projects, company_timeline, quarterly_results, cash_flow, share_count, margin_trend, debt_maturity, capital_allocation, historical_valuation, valuation_scenarios, forward_estimates, insider_trades, risk_items, regulatory_env, sectors(slug, name, tone)";

const emptyExecutiveSummary: ExecutiveSummary = {
  strengths: [],
  risks: [],
  catalysts: [],
  watchPoints: [],
};

const emptyStockPerformance: StockPerformance = {
  period: empty,
  companyReturn: null,
  benchmarkName: empty,
  benchmarkReturn: null,
};

const emptyDividends: DividendInfo = {
  payer: false,
  yield: "",
  lastPayout: "",
  growth3y: "",
  sustainabilityScore: null,
  sustainabilityLabel: empty,
};

function mapCompany(row: CompanyRow, faqs: { q: LocalizedText; a: LocalizedText }[] = []): Company {
  return {
    id: row.id,
    ticker: row.ticker,
    slug: row.slug,
    name: row.name,
    exchange: row.exchange,
    sectorSlug: row.sectors?.slug ?? "",
    sectorName: row.sectors?.name ?? empty,
    sectorTone: row.sectors?.tone ?? "tone-emerald",
    country: row.country,
    price: row.price,
    change: row.change,
    marketCap: row.market_cap,
    short: row.short,
    description: row.description,
    sections: asArray(row.sections),
    goals: asObject(row.goals, empty),
    financials: asArray(row.financials),
    valuation: asArray(row.valuation),
    news: asArray(row.news),
    faqs,
    howToBuy: asArray(row.how_to_buy),
    ceo: asObject(row.ceo, empty),
    foundedYear: row.founded_year,
    headquarters: asObject(row.headquarters, empty),
    website: row.website,
    executiveSummary: asObject(row.executive_summary, emptyExecutiveSummary),
    stockPerformance: asObject(row.stock_performance, emptyStockPerformance),
    competitors: asArray(row.competitors),
    financialHealth: asArray(row.financial_health),
    growthOutlook: asArray(row.growth_outlook),
    dividends: asObject(row.dividends, emptyDividends),
    financialRatios: asArray(row.financial_ratios),
    balanceSheet: asArray(row.balance_sheet),
    shortInterest: asObject(row.short_interest, {
      percent: "",
      daysToCover: "",
      note: empty,
    }),
    tradingStats: asObject(row.trading_stats, {
      weekLow52: "",
      weekHigh52: "",
      volume: "",
      beta: "",
      creditRating: "",
    }),
    ownership: asObject(row.ownership, { government: "", freeFloat: "", holders: [] }),
    revenueBreakdown: asArray(row.revenue_breakdown),
    analystConsensus: asObject(row.analyst_consensus, {
      rating: empty,
      analystCount: null,
      targetPrice: "",
      upside: "",
    }),
    upcomingEvents: row.upcoming_events ?? [],
    officialDocs: row.official_docs ?? [],
    dataSources: row.data_sources ?? [],
    employeeCount: row.employee_count,
    decisionCard: asArray(row.decision_card),
    segmentProfit: asArray(row.segment_profit),
    geographicRevenue: asArray(row.geographic_revenue),
    customerConcentration: asArray(row.customer_concentration),
    operationalKpis: asArray(row.operational_kpis),
    managementTeam: asArray(row.management_team),
    insiderOwnership: row.insider_ownership,
    currentProjects: asArray(row.current_projects),
    companyTimeline: asArray(row.company_timeline),
    quarterlyResults: asArray(row.quarterly_results),
    cashFlow: asArray(row.cash_flow),
    shareCount: asObject(row.share_count, { count: "", yearChange: "", buyback: empty }),
    marginTrend: asObject(row.margin_trend, { note: empty, values: [] as number[] }),
    debtMaturity: asArray(row.debt_maturity),
    capitalAllocation: asArray(row.capital_allocation),
    historicalValuation: asArray(row.historical_valuation),
    valuationScenarios: asObject(row.valuation_scenarios, {
      bear: { price: "", change: "" },
      base: { price: "", change: "" },
      bull: { price: "", change: "" },
    }),
    forwardEstimates: asArray(row.forward_estimates),
    insiderTrades: asArray(row.insider_trades),
    riskItems: asArray(row.risk_items),
    regulatoryEnv: asArray(row.regulatory_env),
  };
}

export async function getCompanies(opts?: {
  sectorSlug?: string;
  limit?: number;
}): Promise<Company[]> {
  const query = supabase
    .from("companies")
    .select(companyColumns)
    .eq("published", true)
    .order("sort_order");
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as CompanyRow[];
  const filtered = opts?.sectorSlug
    ? rows.filter((r) => r.sectors?.slug === opts.sectorSlug)
    : rows;
  return opts?.limit
    ? filtered.slice(0, opts.limit).map((r) => mapCompany(r))
    : filtered.map((r) => mapCompany(r));
}

export async function getCompany(slug: string): Promise<Company | undefined> {
  const { data, error } = await supabase
    .from("companies")
    .select(companyColumns)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  const row = data as unknown as CompanyRow;

  const { data: companyIdRow } = await supabase
    .from("companies")
    .select("id")
    .eq("slug", slug)
    .single();
  let faqs: { q: LocalizedText; a: LocalizedText }[] = [];
  if (companyIdRow) {
    const { data: faqRows } = await supabase
      .from("faqs")
      .select("question, answer")
      .eq("company_id", companyIdRow.id)
      .eq("published", true)
      .order("sort_order");
    faqs = (faqRows ?? []).map((f) => ({
      q: f.question as unknown as LocalizedText,
      a: f.answer as unknown as LocalizedText,
    }));
  }

  return mapCompany(row, faqs);
}

export async function getRelatedCompanies(company: Company, limit = 4): Promise<Company[]> {
  const all = await getCompanies({ sectorSlug: company.sectorSlug });
  return all.filter((c) => c.slug !== company.slug).slice(0, limit);
}

// ---------- Research ----------

type ResearchRow = {
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  author: LocalizedText;
  author_role: LocalizedText;
  reading_time: number;
  published_at: string;
  image: string;
  tags: LocalizedText[];
  sections: { id: string; heading: LocalizedText; body: LocalizedText }[];
  refs: string[];
  sectors: { slug: string } | null;
};

const researchColumns =
  "slug, title, summary, author, author_role, reading_time, published_at, image, tags, sections, refs, sectors(slug)";

function mapResearch(row: ResearchRow): Research {
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    author: row.author,
    authorRole: row.author_role,
    readingTime: row.reading_time,
    date: row.published_at,
    image: row.image,
    tags: row.tags,
    sectorSlug: row.sectors?.slug ?? "",
    sections: row.sections,
    references: row.refs,
  };
}

export async function getResearch(opts?: {
  sectorSlug?: string;
  limit?: number;
}): Promise<Research[]> {
  const { data, error } = await supabase
    .from("research")
    .select(researchColumns)
    .eq("published", true)
    .order("published_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as ResearchRow[];
  const filtered = opts?.sectorSlug
    ? rows.filter((r) => r.sectors?.slug === opts.sectorSlug)
    : rows;
  const mapped = filtered.map(mapResearch);
  return opts?.limit ? mapped.slice(0, opts.limit) : mapped;
}

export async function getResearchItem(slug: string): Promise<Research | undefined> {
  const { data, error } = await supabase
    .from("research")
    .select(researchColumns)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  return data ? mapResearch(data as unknown as ResearchRow) : undefined;
}

export async function getRelatedResearch(item: Research, limit = 2): Promise<Research[]> {
  const all = await getResearch();
  return all.filter((r) => r.slug !== item.slug).slice(0, limit);
}

// ---------- Knowledge ----------

type KnowledgeRow = {
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  category: LocalizedText;
  icon: string;
  level: LocalizedText;
  reading_time: number;
  sections: { heading: LocalizedText; body: LocalizedText }[];
  videos: { title: LocalizedText; duration: string }[];
};

function mapKnowledge(row: KnowledgeRow): KnowledgeArticle {
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    category: row.category,
    icon: row.icon,
    level: row.level,
    readingTime: row.reading_time,
    sections: row.sections,
    videos: row.videos,
  };
}

export async function getKnowledge(limit?: number): Promise<KnowledgeArticle[]> {
  let query = supabase
    .from("knowledge_articles")
    .select("slug, title, summary, category, icon, level, reading_time, sections, videos")
    .eq("published", true)
    .order("sort_order");
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as KnowledgeRow[]).map(mapKnowledge);
}

export async function getKnowledgeItem(slug: string): Promise<KnowledgeArticle | undefined> {
  const { data, error } = await supabase
    .from("knowledge_articles")
    .select("slug, title, summary, category, icon, level, reading_time, sections, videos")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  return data ? mapKnowledge(data as unknown as KnowledgeRow) : undefined;
}

export async function getRelatedKnowledge(
  item: KnowledgeArticle,
  limit = 3,
): Promise<KnowledgeArticle[]> {
  const all = await getKnowledge();
  return all.filter((k) => k.slug !== item.slug).slice(0, limit);
}

// ---------- Boards (independent, admin-managed) ----------

type BoardRow = {
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  image: string | null;
  tone: string;
};

export async function getBoards(): Promise<Board[]> {
  const { data, error } = await supabase
    .from("community_boards")
    .select("slug, name, description, image, tone")
    .eq("published", true)
    .order("sort_order");
  if (error) throw error;
  const rows = (data ?? []) as unknown as BoardRow[];

  const counts = await Promise.all(
    rows.map((r) =>
      supabase
        .from("community_posts")
        .select("id", { count: "exact", head: true })
        .eq("board_slug", r.slug),
    ),
  );

  return rows.map((r, i) => ({
    slug: r.slug,
    name: r.name,
    description: r.description,
    image: r.image ?? undefined,
    posts: counts[i]?.count ?? 0,
    members: 0,
    tone: r.tone,
    latest: [],
  }));
}

export async function getBoard(slug: string): Promise<Board | undefined> {
  const boards = await getBoards();
  return boards.find((b) => b.slug === slug);
}

// ---------- Search ----------

export type SearchResult = {
  type: "company" | "sector" | "research" | "knowledge";
  slug: string;
  title: LocalizedText;
  subtitle: LocalizedText;
};

export async function search(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const like = `%${q}%`;
  const orFilter = `name->>ar.ilike.${like},name->>en.ilike.${like}`;
  const titleOrFilter = `title->>ar.ilike.${like},title->>en.ilike.${like}`;

  const [companiesRes, sectorsRes, researchRes, knowledgeRes] = await Promise.all([
    supabase
      .from("companies")
      .select("slug, name, short")
      .eq("published", true)
      .or(orFilter)
      .limit(6),
    supabase
      .from("sectors")
      .select("slug, name, tagline")
      .eq("published", true)
      .or(orFilter)
      .limit(6),
    supabase
      .from("research")
      .select("slug, title, summary")
      .eq("published", true)
      .or(titleOrFilter)
      .limit(6),
    supabase
      .from("knowledge_articles")
      .select("slug, title, summary")
      .eq("published", true)
      .or(titleOrFilter)
      .limit(6),
  ]);

  const results: SearchResult[] = [];
  (companiesRes.data ?? []).forEach((c) =>
    results.push({
      type: "company",
      slug: c.slug,
      title: c.name as unknown as LocalizedText,
      subtitle: c.short as unknown as LocalizedText,
    }),
  );
  (sectorsRes.data ?? []).forEach((s) =>
    results.push({
      type: "sector",
      slug: s.slug,
      title: s.name as unknown as LocalizedText,
      subtitle: s.tagline as unknown as LocalizedText,
    }),
  );
  (researchRes.data ?? []).forEach((r) =>
    results.push({
      type: "research",
      slug: r.slug,
      title: r.title as unknown as LocalizedText,
      subtitle: r.summary as unknown as LocalizedText,
    }),
  );
  (knowledgeRes.data ?? []).forEach((k) =>
    results.push({
      type: "knowledge",
      slug: k.slug,
      title: k.title as unknown as LocalizedText,
      subtitle: k.summary as unknown as LocalizedText,
    }),
  );
  return results;
}

export async function getPlatformStats() {
  const [{ count: companies }, { count: research }, { count: articles }, { count: sectors }] =
    await Promise.all([
      supabase.from("companies").select("*", { count: "exact", head: true }).eq("published", true),
      supabase.from("research").select("*", { count: "exact", head: true }).eq("published", true),
      supabase
        .from("knowledge_articles")
        .select("*", { count: "exact", head: true })
        .eq("published", true),
      supabase.from("sectors").select("*", { count: "exact", head: true }).eq("published", true),
    ]);
  return {
    companies: companies ?? 0,
    research: research ?? 0,
    articles: articles ?? 0,
    sectors: sectors ?? 0,
  };
}
