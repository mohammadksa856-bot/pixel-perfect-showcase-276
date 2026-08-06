import { supabase } from "@/integrations/supabase/client";
import type {
  Board,
  Company,
  CompanySection,
  FinancialRow,
  CompanyMetric,
  KnowledgeArticle,
  Research,
  Sector,
} from "@/data/types";
import type { LocalizedText } from "@/lib/i18n";

/**
 * Single access layer for all content. Components import from here only.
 * Backed by the real database (Supabase) — the admin panel edits these
 * same tables, so changes made there show up here automatically.
 */

const empty: LocalizedText = { ar: "", en: "" };

// ---------- Sectors ----------

type SectorRow = {
  slug: string;
  name: LocalizedText;
  tagline: LocalizedText;
  description: LocalizedText;
  about: LocalizedText | null;
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
    icon: row.icon,
    tone: row.tone,
    companies: 0,
    research: 0,
  };
}

export async function getSectors(): Promise<Sector[]> {
  const { data, error } = await supabase
    .from("sectors")
    .select("slug, name, tagline, description, about, icon, tone")
    .eq("published", true)
    .order("sort_order");
  if (error) throw error;
  return ((data ?? []) as unknown as SectorRow[]).map(mapSector);
}

export async function getSector(slug: string): Promise<Sector | undefined> {
  const { data, error } = await supabase
    .from("sectors")
    .select("slug, name, tagline, description, about, icon, tone")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSector(data as unknown as SectorRow) : undefined;
}

// ---------- Companies ----------

type CompanyRow = {
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
  valuation: CompanyMetric[];
  news: { title: LocalizedText; source: string; date: string }[];
  how_to_buy: LocalizedText[];
  sectors: { slug: string; name: LocalizedText; tone: string } | null;
};

const companyColumns =
  "slug, ticker, exchange, name, country, price, change, market_cap, short, description, sections, goals, financials, valuation, news, how_to_buy, sectors(slug, name, tone)";

function mapCompany(row: CompanyRow, faqs: { q: LocalizedText; a: LocalizedText }[] = []): Company {
  return {
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
    sections: row.sections,
    goals: row.goals ?? empty,
    financials: row.financials,
    valuation: row.valuation,
    news: row.news,
    faqs,
    howToBuy: row.how_to_buy,
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

// ---------- Boards (derived from sectors) ----------

export async function getBoards(): Promise<Board[]> {
  const sectors = await getSectors();
  return sectors.slice(0, 8).map((s) => ({
    slug: s.slug,
    name: s.name,
    description: s.tagline,
    posts: 0,
    members: 0,
    tone: s.tone,
    latest: [],
  }));
}

export async function getBoard(slug: string): Promise<Board | undefined> {
  const boards = await getBoards();
  return boards.find((b) => b.slug === slug);
}

// ---------- Platform stats ----------

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
