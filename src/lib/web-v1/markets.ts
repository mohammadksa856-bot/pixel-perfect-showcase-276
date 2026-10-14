import type { LocalizedText } from "@/lib/i18n";
import {
  queryDirectory,
  sectorSlug,
  type Board,
  type DataStatus,
  type DirectoryEntry,
} from "./catalog";

/**
 * WEB-05B: الأسواق والقطاعات. منطق خالص (بلا شبكة) فوق دليل WEB-05A نفسه:
 * - السوق من قائمة السوق المالية السعودية (الرمز والاسم العربي والسوق فقط).
 * - القطاع والصناعة من مصدر موثق فقط: صفحة الشركة في المحرك (تسمية المحرك بالإنجليزية كما وردت).
 * لا أسعار، ولا قيم مؤشرات، ولا إحصاءات قطاعية، ولا تصنيف مخمّن أو مترجم آليًا.
 */

export const UNCLASSIFIED = "unclassified";
export { sectorSlug };

export type Count = { count: number; main: number; nomu: number; withPages: number };

const tally = (entries: readonly DirectoryEntry[]): Count => ({
  count: entries.length,
  main: entries.filter((e) => e.board === "main").length,
  nomu: entries.filter((e) => e.board === "nomu").length,
  withPages: entries.filter((e) => e.dataStatus === "engine_page").length,
});

export type SectorSummary = Count & {
  slug: string;
  /** التسمية كما في المصدر (لا ترجمة). */
  name: string;
  industries: { name: string; count: number }[];
};

/** دليل القطاعات: القطاعات الموثقة فقط، مرتبة بعدد الشركات ثم الاسم، ومعها غير المصنّف. */
export function sectorIndex(entries: readonly DirectoryEntry[]) {
  const by = new Map<string, DirectoryEntry[]>();
  for (const e of entries) if (e.sector) by.set(e.sector, [...(by.get(e.sector) ?? []), e]);
  const sectors: SectorSummary[] = [...by].map(([name, list]) => {
    const ind = new Map<string, number>();
    for (const e of list) if (e.industry) ind.set(e.industry, (ind.get(e.industry) ?? 0) + 1);
    return {
      slug: sectorSlug(name),
      name,
      ...tally(list),
      industries: [...ind]
        .map(([n, count]) => ({ name: n, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    };
  });
  sectors.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const unclassified = tally(entries.filter((e) => !e.sector));
  return {
    total: entries.length,
    classified: entries.length - unclassified.count,
    sectors,
    unclassified,
  };
}

/** القطاع من رابطه. "unclassified" صفحة قائمة بذاتها (حالة نقص البيانات)، ورابط مجهول = null. */
export function findSector(
  entries: readonly DirectoryEntry[],
  slug: string,
): { kind: "sector"; sector: SectorSummary } | { kind: "unclassified"; summary: Count } | null {
  const idx = sectorIndex(entries);
  if (slug === UNCLASSIFIED) return { kind: "unclassified", summary: idx.unclassified };
  const sector = idx.sectors.find((s) => s.slug === slug);
  return sector ? { kind: "sector", sector } : null;
}

/** ملخص سوق (الرئيسية أو نمو): العدد، ومن له صفحة بيانات، والقطاعات الموثقة فيه. */
export function boardSummary(entries: readonly DirectoryEntry[], board: Board) {
  const list = entries.filter((e) => e.board === board);
  const idx = sectorIndex(list);
  return {
    board,
    ...tally(list),
    classified: idx.classified,
    sectors: idx.sectors.map((s) => ({ slug: s.slug, name: s.name, count: s.count })),
  };
}

/** ملخص السوق السعودية: المجموع والسوقان، كلها محسوبة من القائمة لا مكتوبة يدويًا. */
export function saudiSummary(entries: readonly DirectoryEntry[]) {
  return {
    ...tally(entries),
    boards: { main: boardSummary(entries, "main"), nomu: boardSummary(entries, "nomu") },
    sectors: sectorIndex(entries),
  };
}

// ───────────────────────── جدول الشركات (السوق والقطاع)

export type TableQuery = {
  q: string;
  board: Board | "all";
  /** رابط القطاع، أو "all"، أو "unclassified". */
  sector: string;
  industry: string;
  data: DataStatus | "all";
  sort: "symbol" | "name";
  page: number;
};

export const TABLE_DEFAULTS: TableQuery = {
  q: "",
  board: "all",
  sector: "all",
  industry: "all",
  data: "all",
  sort: "symbol",
  page: 1,
};

/** معاملات كاملة لرابط إلى صفحة سوق أو قطاع (الموجّه يتطلبها كاملة). */
export const tableSearch = (patch: Partial<TableQuery> = {}): TableQuery => ({
  ...TABLE_DEFAULTS,
  ...patch,
});

export const TABLE_PAGE_SIZE = 50;

const pickOf = <T extends string>(v: unknown, allowed: readonly T[], d: T): T =>
  allowed.includes(v as T) ? (v as T) : d;
const text = (v: unknown, d: string) =>
  typeof v === "number" && Number.isFinite(v)
    ? String(v)
    : typeof v === "string"
      ? v.slice(0, 80)
      : d;

/** معاملات الجدول من عنوان الصفحة (قابلة للمشاركة)، بقيم افتراضية آمنة لأي مدخل غير متوقع. */
export function parseTableQuery(s: Record<string, unknown>): TableQuery {
  return {
    q: text(s["q"], ""),
    board: pickOf(s["board"], ["all", "main", "nomu"] as const, "all"),
    sector: text(s["sector"], "all") || "all",
    industry: text(s["industry"], "all") || "all",
    data: pickOf(s["data"], ["all", "engine_page", "listed_only"] as const, "all"),
    sort: pickOf(s["sort"], ["symbol", "name"] as const, "symbol"),
    page: Math.min(100, Math.max(1, Math.floor(Number(s["page"])) || 1)),
  };
}

/**
 * جدول الشركات: البحث والترتيب بمنطق الدليل نفسه (queryDirectory)، ثم القطاع بالرابط والصناعة،
 * وتقسيم إلى صفحات ثابتة الحجم.
 */
export function queryTable(entries: readonly DirectoryEntry[], query: TableQuery) {
  const sectorName =
    query.sector === "all" || query.sector === UNCLASSIFIED
      ? query.sector
      : (entries.find((e) => e.sector && sectorSlug(e.sector) === query.sector)?.sector ?? null);
  const scoped =
    query.industry === "all" ? entries : entries.filter((e) => e.industry === query.industry);
  const all =
    sectorName === null
      ? []
      : queryDirectory(scoped, {
          q: query.q,
          board: query.board,
          sector: sectorName,
          data: query.data,
          sort: query.sort,
          page: Number.MAX_SAFE_INTEGER,
        }).items;
  const total = all.length;
  const pages = Math.max(1, Math.ceil(total / TABLE_PAGE_SIZE));
  const page = Math.min(Math.max(1, query.page), pages);
  return {
    total,
    page,
    pages,
    from: total ? (page - 1) * TABLE_PAGE_SIZE + 1 : 0,
    to: Math.min(total, page * TABLE_PAGE_SIZE),
    rows: all.slice((page - 1) * TABLE_PAGE_SIZE, page * TABLE_PAGE_SIZE),
  };
}

// ───────────────────────── نصوص مشتركة

export const MARKET_COPY = {
  saudi: { ar: "السوق المالية السعودية", en: "Saudi Exchange" },
  sectorSource: {
    ar: "القطاع والصناعة من صفحة الشركة في المحرك. تُعرض بالعربية من قاموس عرض قابل للمراجعة، والتسمية الأصلية في التلميح؛ ما لا ترجمة معتمدة له يبقى بلغته. تصنيف السوق المالية الرسمي غير متوفر في المصادر الحالية، ولا نخمّنه ولا نترجمه آليًا.",
    en: "Sector and industry come from the company's engine page, with the engine's labels as given. The exchange's official classification is not in the current sources; we do not guess or machine-translate it.",
  },
  noPrices: {
    ar: "لا أسعار ولا قيم مؤشرات ولا قيم سوقية: لا مصدر أسعار موثق في هذه المعاينة.",
    en: "No prices, index values or market caps: there is no documented price source in this preview.",
  },
  noSectorStats: {
    ar: "لا توجد بيانات قطاعية مجمّعة في المحرك بعد، فلا إحصاءات أو متوسطات للقطاع.",
    en: "No sector-level datasets in the engine yet, so no sector statistics or averages.",
  },
  unclassified: { ar: "غير مصنّف في المصدر", en: "Not classified in source" },
} as const satisfies Record<string, LocalizedText>;

/** نص تغطية التصنيف القطاعي، محسوب من القائمة. */
export function sectorCoverage(classified: number, total: number): LocalizedText {
  return {
    ar: `التصنيف القطاعي موثق لـ ${classified} من ${total} شركة؛ البقية غير مصنّفة في المصدر.`,
    en: `Sector classification is documented for ${classified} of ${total} companies; the rest are not classified in the source.`,
  };
}
