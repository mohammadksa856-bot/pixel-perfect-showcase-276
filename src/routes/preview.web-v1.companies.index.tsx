import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { getDirectory } from "@/lib/web-v1/catalog.functions";
import {
  BOARD_TEXT,
  DATA_TEXT,
  englishCoverage,
  isLatinQuery,
  SEARCH_COPY,
  facets,
  queryDirectory,
  type Board,
  type DataStatus,
  type DirectoryQuery,
} from "@/lib/web-v1/catalog";
import { queryText } from "@/lib/web-v1/catalog";
import { useI18n, type LocalizedText } from "@/lib/i18n";
import { iso } from "@/lib/bidi";
import { cn } from "@/lib/utils";
import { PreviewContainer, WebV1Shell } from "@/components/web-v1/shell";
import { CompanyCard } from "@/components/web-v1/company-card";

/**
 * WEB-05A: دليل الشركات. بحث وتصفية وفرز في عنوان الصفحة (قابل للمشاركة ويُعرض على الخادم).
 * المصدر: قائمة الشركات المدرجة في السوق المالية (هوية فقط) + الشركات التي لها صفحة بيانات من المحرك.
 */
type Search = Required<Pick<DirectoryQuery, "board" | "data" | "sort">> & {
  q: string;
  sector: string;
  page: number;
};

const pick = <T extends string>(v: unknown, allowed: readonly T[], d: T): T =>
  allowed.includes(v as T) ? (v as T) : d;

export const Route = createFileRoute("/preview/web-v1/companies/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: queryText(s["q"]),
    board: pick(s["board"], ["all", "main", "nomu"] as const, "all"),
    sector: typeof s["sector"] === "string" ? s["sector"].slice(0, 80) : "all",
    data: pick(s["data"], ["all", "engine_page", "listed_only"] as const, "all"),
    sort: pick(s["sort"], ["symbol", "name"] as const, "symbol"),
    page: Math.min(100, Math.max(1, Number(s["page"]) || 1)),
  }),
  loader: async () => {
    const d = await getDirectory();
    if (!d) throw notFound();
    return d;
  },
  head: () => ({
    meta: [
      { title: "دليل الشركات | معرفة استثمار" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Directory,
});

function Directory() {
  const { entries, source } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { t } = useI18n();
  const [text, setText] = useState(search.q);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const set = (patch: Partial<Search>) =>
    navigate({ search: (s: Search) => ({ ...s, page: 1, ...patch }), replace: true });

  // الكتابة تحدّث العنوان بعد توقف قصير، فيبقى الرابط قابلًا للمشاركة دون إعادة رسم مع كل حرف.
  // يُقارن بآخر قيمة في العنوان وقت التنفيذ، لا وقت الجدولة: وإلا أعاد تحديثٌ متأخر الصفحة إلى الأولى.
  const latestQ = useRef(search.q);
  latestQ.current = search.q;
  useEffect(() => {
    if (text === latestQ.current) return;
    const id = setTimeout(() => {
      if (text !== latestQ.current) set({ q: text });
    }, 200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const f = useMemo(() => facets(entries), [entries]);
  const r = useMemo(() => queryDirectory(entries, search), [entries, search]);
  const sectors = Object.keys(f.sector)
    .filter((s) => s !== "unclassified")
    .sort();
  const active =
    (search.board !== "all" ? 1 : 0) +
    (search.sector !== "all" ? 1 : 0) +
    (search.data !== "all" ? 1 : 0);

  const filters = (
    <div className="space-y-5" data-filters>
      <FilterGroup label={{ ar: "السوق", en: "Market" }}>
        {(["all", "main", "nomu"] as const).map((b) => (
          <Chip
            key={b}
            on={search.board === b}
            onClick={() => set({ board: b })}
            count={b === "all" ? entries.length : (f.board[b] ?? 0)}
            data={`board-${b}`}
          >
            {b === "all" ? t({ ar: "الكل", en: "All" }) : t(BOARD_TEXT[b as Board])}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup label={{ ar: "توفر البيانات", en: "Data availability" }}>
        {(["all", "engine_page", "listed_only"] as const).map((d) => (
          <Chip
            key={d}
            on={search.data === d}
            onClick={() => set({ data: d })}
            count={d === "all" ? entries.length : (f.data[d] ?? 0)}
            data={`data-${d}`}
          >
            {d === "all" ? t({ ar: "الكل", en: "All" }) : t(DATA_TEXT[d as DataStatus])}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup label={{ ar: "القطاع", en: "Sector" }}>
        <Chip on={search.sector === "all"} onClick={() => set({ sector: "all" })} data="sector-all">
          {t({ ar: "الكل", en: "All" })}
        </Chip>
        {sectors.map((s) => (
          <Chip
            key={s}
            on={search.sector === s}
            onClick={() => set({ sector: s })}
            count={f.sector[s]}
            data={`sector-${s}`}
          >
            <span dir="auto">{s}</span>
          </Chip>
        ))}
        <Chip
          on={search.sector === "unclassified"}
          onClick={() => set({ sector: "unclassified" })}
          count={f.sector["unclassified"] ?? 0}
          data="sector-unclassified"
        >
          {t({ ar: "غير مصنّف في المصدر", en: "Not classified in source" })}
        </Chip>
      </FilterGroup>
      <p className="text-[11px] leading-5 text-muted-foreground">
        {t({
          ar: "القطاع لا يُعرض إلا من مصدر موثق (صفحة المحرك). قائمة السوق المالية المستخدمة لا تحمل تصنيفًا قطاعيًا، ولا نخمّنه.",
          en: "Sector is shown only from a documented source (the engine page). The exchange list used here carries no sector classification, and we do not guess it.",
        })}
      </p>
    </div>
  );

  return (
    <WebV1Shell>
      <section className="night-panel border-b border-border/40">
        <PreviewContainer className="py-9">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t({ ar: "دليل الشركات", en: "Company directory" })}
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-night-foreground/65">
            {t({
              ar: `${iso(source.count)} شركة مدرجة في السوق الرئيسية ونمو، من قائمة السوق المالية السعودية. الشركات التي لها صفحة بيانات من المحرك تُفتح على قالب الشركة.`,
              en: `${source.count} companies listed on the Main Market and Nomu, from the Saudi Exchange list. Companies with an engine data page open the company template.`,
            })}
          </p>
          <label className="mt-5 flex h-12 max-w-2xl items-center gap-3 rounded-xl border border-night-foreground/15 bg-card px-4 text-card-foreground focus-within:border-brand/60">
            <Search className="size-5 text-brand" />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t(SEARCH_COPY.placeholder)}
              className="h-full w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
              aria-label={t({ ar: "بحث في الدليل", en: "Search the directory" })}
              data-directory-input
            />
            {text && (
              <button
                type="button"
                onClick={() => setText("")}
                aria-label={t({ ar: "مسح", en: "Clear" })}
              >
                <X className="size-4 text-muted-foreground" />
              </button>
            )}
          </label>
          <p className="mt-2 text-[12px] text-night-foreground/60" data-english-coverage>
            {t(englishCoverage(entries))}
          </p>
        </PreviewContainer>
      </section>

      <PreviewContainer className="py-8">
        <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">{filters}</aside>
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px]" role="status" data-result-count={r.total}>
                {t({ ar: `${iso(r.total)} نتيجة`, en: `${r.total} results` })}
                {search.q && (
                  <span className="text-muted-foreground">
                    {" "}
                    {t({ ar: "لـ", en: "for" })} «{search.q}»
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((o) => !o)}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-[12px] lg:hidden"
                  aria-expanded={filtersOpen}
                  data-filters-toggle
                >
                  <SlidersHorizontal className="size-4" />
                  {t({ ar: "التصفية", en: "Filters" })}
                  {active > 0 && (
                    <span className="num rounded bg-brand px-1 text-brand-foreground">
                      {active}
                    </span>
                  )}
                </button>
                <select
                  value={search.sort}
                  onChange={(e) => set({ sort: e.target.value as Search["sort"] })}
                  className="h-9 rounded-lg border border-border bg-card px-2 text-[12px]"
                  aria-label={t({ ar: "الترتيب", en: "Sort" })}
                  data-sort
                >
                  <option value="symbol">{t({ ar: "ترتيب: الرمز", en: "Sort: ticker" })}</option>
                  <option value="name">{t({ ar: "ترتيب: الاسم", en: "Sort: name" })}</option>
                </select>
              </div>
            </div>
            {filtersOpen && (
              <div className="mb-6 rounded-2xl border border-border/70 bg-card p-4 lg:hidden">
                {filters}
              </div>
            )}

            {r.total === 0 ? (
              <div
                className="rounded-2xl border border-dashed border-border p-10 text-center"
                data-directory-empty
              >
                <p className="text-[14px] font-semibold">
                  {t({ ar: "لا شركات تطابق البحث", en: "No companies match" })}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {t(
                    isLatinQuery(search.q)
                      ? SEARCH_COPY.latinEmpty
                      : {
                          ar: "جرّب الرمز أو جزءًا من الاسم العربي، أو أزل بعض المرشحات.",
                          en: "Try the ticker or part of the Arabic name, or remove some filters.",
                        },
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setText("");
                    set({ q: "", board: "all", sector: "all", data: "all" });
                  }}
                  className="mt-4 rounded-lg border border-border px-3 py-1.5 text-[12px] hover:bg-muted"
                >
                  {t({ ar: "إعادة الضبط", en: "Reset" })}
                </button>
              </div>
            ) : (
              <>
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-directory-grid>
                  {r.items.map((e) => (
                    <li key={e.symbol}>
                      <CompanyCard e={e} />
                    </li>
                  ))}
                </ul>
                {r.page < r.pages && (
                  <div className="mt-6 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        navigate({
                          search: (s: Search) => ({ ...s, page: s.page + 1 }),
                          replace: true,
                          resetScroll: false,
                        })
                      }
                      className="rounded-xl border border-border px-5 py-2.5 text-[13px] hover:bg-muted"
                      data-load-more
                    >
                      {t({ ar: "عرض المزيد", en: "Show more" })}{" "}
                      <span className="num text-muted-foreground">
                        ({iso(r.items.length)} / {iso(r.total)})
                      </span>
                    </button>
                  </div>
                )}
              </>
            )}
            <p className="mt-8 text-[11px] leading-5 text-muted-foreground" data-directory-source>
              {t({ ar: "المصدر: ", en: "Source: " })}
              <code dir="ltr">{source.path}</code> · sha256{" "}
              <code dir="ltr">{source.sha256.slice(0, 12)}</code> ·{" "}
              {t({ ar: "آخر تحديث في المستودع ", en: "last updated in repo " })}
              {iso(source.updatedInRepo)}.{" "}
              {t({
                ar: "لا أسعار ولا أرقام مالية في الدليل.",
                en: "No prices or financial figures in the directory.",
              })}
            </p>
          </div>
        </div>
      </PreviewContainer>
    </WebV1Shell>
  );
}

function FilterGroup({ label, children }: { label: LocalizedText; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <fieldset>
      <legend className="mb-2 text-[12px] font-semibold">{t(label)}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

function Chip({
  on,
  onClick,
  count,
  children,
  data,
}: {
  on: boolean;
  onClick: () => void;
  count?: number | undefined;
  children: React.ReactNode;
  data: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      data-chip={data}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] transition-colors",
        on ? "border-brand bg-brand text-brand-foreground" : "border-border hover:bg-muted",
      )}
    >
      {children}
      {count !== undefined && (
        <span className={cn("num", on ? "opacity-80" : "text-muted-foreground")}>{iso(count)}</span>
      )}
    </button>
  );
}
