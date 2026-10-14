import type { LocalizedText } from "@/lib/i18n";
import type { ReadinessState } from "@/lib/engine/readiness";

/**
 * WEB-05A: دليل الشركات والبحث الموحد. منطق خالص (بلا شبكة) قابل للاختبار:
 * تطبيع النص العربي والإنجليزي، والتصفية، والفرز، والتقسيم إلى صفحات.
 * يتسع لكل الشركات المدرجة: يعمل على أي قائمة، والتصفية تتم على الخادم أو العميل بالمنطق نفسه.
 */

export type Board = "main" | "nomu";
export type DataStatus = "engine_page" | "listed_only";

export type DirectoryEntry = {
  symbol: string;
  board: Board;
  name: { ar: string; en: string | null };
  /** من مصدر موثق فقط (صفحة المحرك). null = غير مصنّف في المصدر. */
  sector: string | null;
  industry: string | null;
  dataStatus: DataStatus;
  /** حالتا الجاهزية كما يعرضهما قالب الشركة؛ فقط لمن لديه صفحة بيانات. */
  readiness: { investorTopics: ReadinessState; operationalCategories: ReadinessState } | null;
  latestFiling: string | null;
};

export type DirectoryQuery = {
  q?: string;
  board?: Board | "all";
  sector?: string | "all" | "unclassified";
  data?: DataStatus | "all";
  sort?: "symbol" | "name";
  page?: number;
};

export const PAGE_SIZE = 24;

export const BOARD_TEXT: Record<Board, LocalizedText> = {
  main: { ar: "السوق الرئيسية", en: "Main Market" },
  nomu: { ar: "نمو (السوق الموازية)", en: "Nomu (Parallel Market)" },
};
export const DATA_TEXT: Record<DataStatus, LocalizedText> = {
  engine_page: { ar: "صفحة بيانات من المحرك", en: "Engine data page" },
  listed_only: { ar: "مدرجة، بلا صفحة بيانات بعد", en: "Listed, no data page yet" },
};

/** تطبيع للبحث: يزيل التشكيل والتطويل، ويوحّد الألف والياء والتاء المربوطة، ويصغّر اللاتينية. */
export function normalize(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** درجة تطابق: الرمز الكامل > بداية الرمز > بداية الاسم > احتواء الاسم. 0 = لا تطابق. */
export function matchScore(e: DirectoryEntry, raw: string): number {
  const q = normalize(raw);
  if (!q) return 1;
  if (e.symbol === q) return 100;
  if (/^\d+$/.test(q)) return e.symbol.startsWith(q) ? 80 : 0;
  const names = [e.name.ar, e.name.en ?? "", e.sector ?? "", e.industry ?? ""].map(normalize);
  if (names.slice(0, 2).some((n) => n.startsWith(q))) return 60;
  if (names.slice(0, 2).some((n) => n.split(" ").some((w) => w.startsWith(q)))) return 50;
  if (names.slice(0, 2).some((n) => n.includes(q))) return 40;
  if (names.slice(2).some((n) => n.includes(q))) return 20;
  return 0;
}

export function queryDirectory(entries: readonly DirectoryEntry[], query: DirectoryQuery) {
  const q = query.q?.trim() ?? "";
  let rows = entries
    .map((e) => ({ e, score: matchScore(e, q) }))
    .filter((x) => x.score > 0)
    .filter((x) => !query.board || query.board === "all" || x.e.board === query.board)
    .filter(
      (x) =>
        !query.sector ||
        query.sector === "all" ||
        (query.sector === "unclassified" ? x.e.sector === null : x.e.sector === query.sector),
    )
    .filter((x) => !query.data || query.data === "all" || x.e.dataStatus === query.data);
  const sort = query.sort ?? "symbol";
  rows = rows.sort(
    (a, b) =>
      (q ? b.score - a.score : 0) ||
      (sort === "name"
        ? a.e.name.ar.localeCompare(b.e.name.ar, "ar")
        : a.e.symbol.localeCompare(b.e.symbol)),
  );
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, query.page ?? 1), pages);
  return {
    total,
    page,
    pages,
    items: rows.slice(0, page * PAGE_SIZE).map((x) => x.e),
  };
}

/** الأوجه (للمرشحات): العدد لكل سوق وقطاع وحالة بيانات، من القائمة كاملة. */
export function facets(entries: readonly DirectoryEntry[]) {
  const count = <K extends string>(f: (e: DirectoryEntry) => K) =>
    entries.reduce<Record<string, number>>((acc, e) => {
      const k = f(e);
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
  return {
    board: count((e) => e.board),
    sector: count((e) => e.sector ?? "unclassified"),
    data: count((e) => e.dataStatus),
  };
}

// ───────────────────────── البحث الموحد

export type SearchGroupState =
  | { state: "results"; items: SearchItem[] }
  | { state: "empty" }
  | { state: "unavailable"; reason: LocalizedText }
  | { state: "error"; reason: LocalizedText };

export type SearchItem = {
  id: string;
  title: LocalizedText;
  subtitle: LocalizedText | null;
  /** مسار داخلي، أو null حين لا توجد صفحة بعد. */
  href: string | null;
  badge: string | null;
};

export type SearchResponse = {
  query: string;
  source: "frozen_catalog" | "live_content";
  groups: {
    companies: SearchGroupState;
    sectors: SearchGroupState;
    research: SearchGroupState;
    knowledge: SearchGroupState;
  };
};

export const SEARCH_GROUP_TEXT: Record<keyof SearchResponse["groups"], LocalizedText> = {
  companies: { ar: "الشركات", en: "Companies" },
  sectors: { ar: "القطاعات", en: "Sectors" },
  research: { ar: "الأبحاث", en: "Research" },
  knowledge: { ar: "المعرفة", en: "Knowledge" },
};

const group = (items: SearchItem[]): SearchGroupState =>
  items.length ? { state: "results", items } : { state: "empty" };

/** بحث في القائمة المجمّدة. الأبحاث والمعرفة غير متاحة في العينة (مصدرها Supabase) فتُعلن كذلك، لا تُختلق. */
export function searchCatalog(
  entries: readonly DirectoryEntry[],
  q: string,
  limit = 8,
): SearchResponse {
  const companies = queryDirectory(entries, { q }).items.slice(0, limit);
  const nq = normalize(q);
  const sectorNames = [...new Set(entries.map((e) => e.sector).filter(Boolean) as string[])];
  const sectors = nq ? sectorNames.filter((s) => normalize(s).includes(nq)) : [];
  const unavailable: SearchGroupState = {
    state: "unavailable",
    reason: {
      ar: "غير متاحة في عينة المعاينة؛ مصدرها محتوى الموقع الحي (Supabase).",
      en: "Not available in the preview sample; its source is the live site content (Supabase).",
    },
  };
  return {
    query: q,
    source: "frozen_catalog",
    groups: {
      companies: group(
        companies.map((e) => ({
          id: e.symbol,
          title: { ar: e.name.ar, en: e.name.en ?? e.name.ar },
          subtitle: e.sector ? { ar: e.sector, en: e.sector } : BOARD_TEXT[e.board],
          href: e.dataStatus === "engine_page" ? `/preview/web-v1/companies/${e.symbol}` : null,
          badge: e.symbol,
        })),
      ),
      sectors: group(
        sectors.map((s) => ({
          id: s,
          title: { ar: s, en: s },
          subtitle: null,
          href: `/preview/web-v1/companies?sector=${encodeURIComponent(s)}`,
          badge: null,
        })),
      ),
      research: unavailable,
      knowledge: unavailable,
    },
  };
}

/** معاملات الدليل الافتراضية، لروابط تفتح الدليل دون مرشحات. */
export const DIRECTORY_DEFAULT_SEARCH = {
  q: "",
  board: "all",
  sector: "all",
  data: "all",
  sort: "symbol",
  page: 1,
} as const;

/**
 * نص البحث من عنوان الصفحة. الموجّه يحلّل `q=1120` رقمًا لا نصًا، فيُقبل الرقم والنص معًا
 * (وإلا ضاع البحث برمز الشركة القادم من رابط خارجي).
 */
export function queryText(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return typeof v === "string" ? v.slice(0, 80) : "";
}

/**
 * WEB-05A (ملاحظة Codex): نصوص البحث تَعِد بما يدعمه المصدر فقط. قائمة الشركات الـ396 فيها
 * الاسم العربي والرمز؛ الاسم الإنجليزي متوفر فقط لمن له صفحة من المحرك. مصدر واحد لكل النصوص.
 */
export const SEARCH_COPY = {
  placeholder: {
    ar: "ابحث باسم الشركة العربي أو رمزها، وبالإنجليزية عند توفر الاسم",
    en: "Search by ticker or Arabic company name. English names are supported where available.",
  },
  short: {
    ar: "اسم الشركة العربي أو رمزها",
    en: "Ticker or Arabic company name",
  },
  dialog: {
    ar: "اسم الشركة العربي أو رمزها أو موضوع…",
    en: "Ticker, Arabic company name or topic…",
  },
  idle: {
    ar: "اكتب اسم الشركة بالعربية أو رمزها مثل 1120. الأسماء الإنجليزية متاحة لعدد محدود من الشركات فقط.",
    en: "Type the Arabic company name or its ticker, such as 1120. English names are available for a limited number of companies only.",
  },
  empty: {
    ar: "جرّب الرمز أو جزءًا من الاسم العربي، أو تصفّح دليل الشركات.",
    en: "Try the ticker or part of the Arabic name, or browse the company directory.",
  },
  latinEmpty: {
    ar: "معظم الشركات بلا اسم إنجليزي في المصدر الحالي؛ ابحث بالاسم العربي أو الرمز.",
    en: "Most companies have no English name in the current source; search by Arabic name or ticker.",
  },
} as const satisfies Record<string, LocalizedText>;

/** هل الاستعلام بحروف لاتينية؟ (لتوضيح حدود المصدر عند عدم وجود نتائج). */
export const isLatinQuery = (q: string) => /[a-z]/i.test(q) && !/[؀-ۿ]/.test(q);

/** نص التغطية الفعلية للأسماء الإنجليزية، محسوب من القائمة لا مكتوب يدويًا. */
export function englishCoverage(entries: readonly DirectoryEntry[]): LocalizedText {
  const n = entries.filter((e) => e.name.en).length;
  return {
    ar: `الأسماء الإنجليزية متوفرة لـ ${n} من ${entries.length} شركة؛ البقية بالاسم العربي والرمز.`,
    en: `English names are available for ${n} of ${entries.length} companies; the rest by Arabic name and ticker.`,
  };
}
