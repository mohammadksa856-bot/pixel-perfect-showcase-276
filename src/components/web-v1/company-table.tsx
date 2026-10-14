import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useI18n, type LocalizedText } from "@/lib/i18n";
import { iso } from "@/lib/bidi";
import { cn } from "@/lib/utils";
import {
  BOARD_TEXT,
  DATA_TEXT,
  isLatinQuery,
  SEARCH_COPY,
  type DirectoryEntry,
} from "@/lib/web-v1/catalog";
import {
  MARKET_COPY,
  queryTable,
  sectorSlug,
  UNCLASSIFIED,
  type TableQuery,
  tableSearch,
} from "@/lib/web-v1/markets";
import { labelText } from "@/lib/web-v1/display-labels";
import { TaxonomyLabel } from "./display-label";
import { Pill, READINESS_META } from "./primitives";

/**
 * WEB-05B: جدول الشركات المشترك بين صفحات الأسواق والقطاعات. البحث والتصفية والترتيب والصفحات
 * كلها في عنوان الصفحة (onChange)، فيُعرض على الخادم ويُشارك الرابط. على الجوال يصبح قائمة بطاقات
 * مختصرة بلا تمرير أفقي. كل خلية من القائمة أو من صفحة المحرك فقط؛ لا أسعار.
 */
export function CompanyTable({
  entries,
  query,
  onChange,
  show = {},
  sectors = [],
  industries = [],
  emptyHint,
}: {
  entries: readonly DirectoryEntry[];
  query: TableQuery;
  onChange: (patch: Partial<TableQuery>) => void;
  /** الأعمدة والمرشحات المعروضة؛ في صفحة السوق لا معنى لمرشح السوق، وفي صفحة القطاع لا معنى لمرشح القطاع. */
  show?: { board?: boolean; sector?: boolean };
  sectors?: { slug: string; name: string; count: number }[];
  industries?: { name: string; count: number }[];
  emptyHint?: LocalizedText;
}) {
  const { t, locale } = useI18n();
  const [text, setText] = useState(query.q);
  const latest = useRef(query.q);
  latest.current = query.q;
  useEffect(() => setText(query.q), [query.q]);
  useEffect(() => {
    if (text === latest.current) return;
    const id = setTimeout(() => {
      if (text !== latest.current) onChange({ q: text, page: 1 });
    }, 200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const r = queryTable(entries, query);
  const set = (patch: Partial<TableQuery>) => onChange({ page: 1, ...patch });
  const filtered =
    query.q !== "" ||
    query.board !== "all" ||
    query.sector !== "all" ||
    query.industry !== "all" ||
    query.data !== "all";

  return (
    <div data-company-table>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="flex h-11 w-full shrink-0 items-center gap-2.5 lg:flex-1 rounded-xl border border-border bg-card px-3.5 focus-within:border-brand/60">
          <Search className="size-4 shrink-0 text-brand" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t(SEARCH_COPY.short)}
            className="h-full w-full min-w-0 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
            aria-label={t({ ar: "بحث في الجدول", en: "Search the table" })}
            data-table-input
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
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {show.board && (
            <Select
              label={{ ar: "السوق", en: "Market" }}
              value={query.board}
              onChange={(v) => set({ board: v as TableQuery["board"] })}
              data="board"
              options={[
                ["all", t({ ar: "كل الأسواق", en: "All markets" })],
                ["main", t(BOARD_TEXT.main)],
                ["nomu", t(BOARD_TEXT.nomu)],
              ]}
            />
          )}
          {show.sector && (
            <Select
              label={{ ar: "القطاع", en: "Sector" }}
              value={query.sector}
              onChange={(v) => set({ sector: v, industry: "all" })}
              data="sector"
              options={[
                ["all", t({ ar: "كل القطاعات", en: "All sectors" })],
                ...sectors.map(
                  (s) => [s.slug, `${labelText(s.name, locale)} (${s.count})`] as [string, string],
                ),
                [UNCLASSIFIED, t(MARKET_COPY.unclassified)],
              ]}
            />
          )}
          {industries.length > 0 && (
            <Select
              label={{ ar: "الصناعة", en: "Industry" }}
              value={query.industry}
              onChange={(v) => set({ industry: v })}
              data="industry"
              options={[
                ["all", t({ ar: "كل الصناعات", en: "All industries" })],
                ...industries.map(
                  (i) => [i.name, `${labelText(i.name, locale)} (${i.count})`] as [string, string],
                ),
              ]}
            />
          )}
          <Select
            label={{ ar: "البيانات", en: "Data" }}
            value={query.data}
            onChange={(v) => set({ data: v as TableQuery["data"] })}
            data="data"
            options={[
              ["all", t({ ar: "كل الحالات", en: "Any data status" })],
              ["engine_page", t(DATA_TEXT.engine_page)],
              ["listed_only", t(DATA_TEXT.listed_only)],
            ]}
          />
          <Select
            label={{ ar: "الترتيب", en: "Sort" }}
            value={query.sort}
            onChange={(v) => set({ sort: v as TableQuery["sort"] })}
            data="sort"
            options={[
              ["symbol", t({ ar: "ترتيب: الرمز", en: "Sort: ticker" })],
              ["name", t({ ar: "ترتيب: الاسم", en: "Sort: name" })],
            ]}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <p role="status" data-table-count={r.total}>
          {r.total
            ? t({
                ar: `${iso(r.from)}–${iso(r.to)} من ${iso(r.total)} شركة`,
                en: `${r.from}–${r.to} of ${r.total} companies`,
              })
            : t({ ar: "لا نتائج", en: "No results" })}
        </p>
        {filtered && (
          <button
            type="button"
            onClick={() => {
              setText("");
              set({ q: "", board: "all", sector: "all", industry: "all", data: "all" });
            }}
            className="text-brand hover:underline"
            data-table-reset
          >
            {t({ ar: "إزالة المرشحات", en: "Clear filters" })}
          </button>
        )}
      </div>

      <StateLegend />

      {r.total === 0 ? (
        <div
          className="mt-3 rounded-2xl border border-dashed border-border p-10 text-center"
          data-table-empty
        >
          <p className="text-[14px] font-semibold">
            {t({ ar: "لا شركات تطابق البحث والمرشحات", en: "No companies match" })}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {t(
              isLatinQuery(query.q)
                ? SEARCH_COPY.latinEmpty
                : (emptyHint ?? {
                    ar: "جرّب الرمز أو جزءًا من الاسم العربي، أو أزل بعض المرشحات.",
                    en: "Try the ticker or part of the Arabic name, or remove some filters.",
                  }),
            )}
          </p>
        </div>
      ) : (
        <>
          {/* سطح المكتب: جدول */}
          <div className="mt-3 hidden overflow-hidden rounded-2xl border border-border/70 bg-card md:block">
            <table className="w-full text-[13px]" data-table-desktop>
              <thead className="bg-muted/50 text-[11px] text-muted-foreground">
                <tr>
                  <Th>{t({ ar: "الرمز", en: "Ticker" })}</Th>
                  <Th>{t({ ar: "الشركة", en: "Company" })}</Th>
                  {show.board && <Th>{t({ ar: "السوق", en: "Market" })}</Th>}
                  <Th>{t({ ar: "القطاع (المصدر)", en: "Sector (source)" })}</Th>
                  <Th>{t({ ar: "الصناعة", en: "Industry" })}</Th>
                  <Th>{t({ ar: "البيانات", en: "Data" })}</Th>
                  <Th>
                    <span className="sr-only">{t({ ar: "فتح", en: "Open" })}</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {r.rows.map((e) => (
                  <tr
                    key={e.symbol}
                    className="border-t border-border/60 hover:bg-muted/30"
                    data-row={e.symbol}
                  >
                    <td className="px-3 py-2.5">
                      <code dir="ltr" className="rounded bg-muted px-1.5 py-0.5 font-semibold">
                        {e.symbol}
                      </code>
                    </td>
                    <td className="px-3 py-2.5">
                      <CompanyName e={e} />
                    </td>
                    {show.board && (
                      <td className="px-3 py-2.5">
                        <BoardLink board={e.board} />
                      </td>
                    )}
                    <td className="px-3 py-2.5">
                      <SectorLink e={e} />
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      <IndustryCell e={e} />
                    </td>
                    <td className="px-3 py-2.5">
                      <DataState e={e} />
                    </td>
                    <td className="px-3 py-2.5 text-end">
                      <OpenLink e={e} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* الجوال: قائمة */}
          <ul
            className="mt-3 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card md:hidden"
            data-table-mobile
          >
            {r.rows.map((e) => (
              <li key={e.symbol} className="p-3.5" data-row-mobile={e.symbol}>
                <div className="flex items-start justify-between gap-3">
                  <CompanyName e={e} />
                  <code
                    dir="ltr"
                    className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[12px] font-semibold"
                  >
                    {e.symbol}
                  </code>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px]">
                  {show.board && <BoardLink board={e.board} />}
                  <SectorLink e={e} />
                  <DataState e={e} />
                </div>
                {e.dataStatus === "engine_page" && (
                  <div className="mt-2">
                    <OpenLink e={e} withText />
                  </div>
                )}
              </li>
            ))}
          </ul>

          {r.pages > 1 && (
            <nav
              className="mt-4 flex items-center justify-center gap-2 text-[12px]"
              aria-label={t({ ar: "الصفحات", en: "Pages" })}
              data-pagination
            >
              <PageButton
                disabled={r.page <= 1}
                onClick={() => onChange({ page: r.page - 1 })}
                data="prev"
                label={{ ar: "السابق", en: "Previous" }}
              >
                <ChevronRight className="size-4 ltr:rotate-180" />
              </PageButton>
              <span className="num px-2" data-page={r.page}>
                {t({
                  ar: `صفحة ${iso(r.page)} من ${iso(r.pages)}`,
                  en: `Page ${r.page} of ${r.pages}`,
                })}
              </span>
              <PageButton
                disabled={r.page >= r.pages}
                onClick={() => onChange({ page: r.page + 1 })}
                data="next"
                label={{ ar: "التالي", en: "Next" }}
              >
                <ChevronLeft className="size-4 ltr:rotate-180" />
              </PageButton>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-3 py-2.5 text-start font-semibold">{children}</th>;
}

function Select({
  label,
  value,
  onChange,
  options,
  data,
}: {
  label: LocalizedText;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  data: string;
}) {
  const { t } = useI18n();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={t(label)}
      className="h-11 min-w-0 rounded-xl border border-border bg-card px-2.5 text-[12px]"
      data-filter={data}
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

function PageButton({
  disabled,
  onClick,
  children,
  data,
  label,
}: {
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
  data: string;
  label: LocalizedText;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={t(label)}
      className="flex h-9 items-center gap-1 rounded-lg border border-border px-3 hover:bg-muted disabled:opacity-40"
      data-page-button={data}
    >
      {children}
      <span>{t(label)}</span>
    </button>
  );
}

function CompanyName({ e }: { e: DirectoryEntry }) {
  const { locale } = useI18n();
  const name = locale === "en" && e.name.en ? e.name.en : e.name.ar;
  const alt = locale === "en" ? e.name.ar : e.name.en;
  return (
    <div className="min-w-0">
      {/* plaintext: اتجاه كل اسم من نصه، والمحاذاة من اتجاه الصفحة (فلا ينفصل الاسم البديل إلى الطرف الآخر). */}
      <div className="font-semibold [unicode-bidi:plaintext] ltr:text-left rtl:text-right">
        {name}
      </div>
      {alt && alt !== name && (
        <div className="text-[11px] text-muted-foreground [unicode-bidi:plaintext] ltr:text-left rtl:text-right">
          {alt}
        </div>
      )}
    </div>
  );
}

export function BoardLink({ board }: { board: DirectoryEntry["board"] }) {
  const { t } = useI18n();
  return (
    <Link
      to="/preview/web-v1/markets/saudi/$board"
      params={{ board }}
      search={tableSearch()}
      className={cn(
        "rounded-md border px-1.5 py-0.5 text-[11px] hover:border-brand/50",
        board === "nomu"
          ? "border-tone-violet/40 text-tone-violet"
          : "border-border text-muted-foreground",
      )}
      data-board-link={board}
    >
      {t(BOARD_TEXT[board])}
    </Link>
  );
}

/**
 * WEB-06 (D4): حالات قصيرة في خلايا الجدول، وكل حالة بنصها (لا رمز مشترك ولا لون وحده):
 * «غير مصنّف» ≠ «بلا صفحة بيانات» ≠ «لم يُقيَّم». الشرح العام مرة واحدة في StateLegend.
 */
const SHORT_STATE = {
  unclassified: { ar: "غير مصنّف", en: "Unclassified" },
  noPage: { ar: "بلا صفحة بيانات", en: "No data page" },
} satisfies Record<string, LocalizedText>;

function StateLegend() {
  const { t } = useI18n();
  return (
    <details className="mt-2 text-[12px]" data-table-legend>
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
        {t({ ar: "معنى الحالات في الجدول", en: "What the table states mean" })}
      </summary>
      <dl className="mt-2 grid gap-x-3 gap-y-1.5 rounded-xl border border-border/70 bg-card p-3 text-muted-foreground sm:grid-cols-[auto_1fr]">
        <dt className="font-semibold text-foreground" data-legend="unclassified">
          {t(SHORT_STATE.unclassified)}
        </dt>
        <dd>
          {t({
            ar: "لا قطاع أو صناعة للشركة في المصادر الحالية؛ لا نخمّن التصنيف.",
            en: "No sector or industry for the company in the current sources; we do not guess it.",
          })}
        </dd>
        <dt className="font-semibold text-foreground" data-legend="no-page">
          {t(SHORT_STATE.noPage)}
        </dt>
        <dd>
          {t({
            ar: "الشركة مدرجة في القائمة، ولا صفحة بيانات لها من المحرك بعد.",
            en: "The company is listed, but has no engine data page yet.",
          })}
        </dd>
        <dt className="font-semibold text-foreground" data-legend="not-assessed">
          {t(READINESS_META.not_assessed.label)}
        </dt>
        <dd>
          {t({
            ar: "للشركة صفحة بيانات، ولم يُشغَّل تقييم معتمد لموضوعات المستثمر بعد؛ لا درجة.",
            en: "The company has a data page, but no approved investor-topic assessment has run yet; no score.",
          })}
        </dd>
      </dl>
    </details>
  );
}

function SectorLink({ e }: { e: DirectoryEntry }) {
  const { t } = useI18n();
  if (!e.sector)
    return (
      <span
        className="text-[12px] text-muted-foreground"
        data-sector-cell="unclassified"
        title={t(MARKET_COPY.unclassified)}
      >
        {t(SHORT_STATE.unclassified)}
      </span>
    );
  return (
    <Link
      to="/preview/web-v1/sectors/$slug"
      params={{ slug: sectorSlug(e.sector) }}
      search={tableSearch()}
      className="text-[12px] font-medium text-brand hover:underline"
      data-sector-link={sectorSlug(e.sector)}
    >
      <TaxonomyLabel raw={e.sector} />
    </Link>
  );
}

function IndustryCell({ e }: { e: DirectoryEntry }) {
  const { t } = useI18n();
  if (!e.industry)
    return (
      <span className="text-[12px]" data-industry-cell="unclassified">
        {t(SHORT_STATE.unclassified)}
      </span>
    );
  return <TaxonomyLabel raw={e.industry} className="text-[12px]" />;
}

function DataState({ e }: { e: DirectoryEntry }) {
  const { t } = useI18n();
  if (e.dataStatus === "engine_page" && e.readiness)
    return (
      <span
        className="inline-flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground"
        data-data-cell="engine_page"
      >
        {t({ ar: "موضوعات", en: "Topics" })}
        <Pill meta={READINESS_META[e.readiness.investorTopics]} />
      </span>
    );
  return (
    <span
      className="text-[11px] text-muted-foreground"
      data-data-cell={e.dataStatus}
      title={t(DATA_TEXT[e.dataStatus])}
    >
      {e.dataStatus === "listed_only" ? t(SHORT_STATE.noPage) : t(DATA_TEXT[e.dataStatus])}
    </span>
  );
}

function OpenLink({ e, withText = false }: { e: DirectoryEntry; withText?: boolean }) {
  const { t } = useI18n();
  if (e.dataStatus !== "engine_page") return null;
  return (
    <Link
      to="/preview/web-v1/companies/$symbol"
      params={{ symbol: e.symbol }}
      search={{ tab: "business" }}
      className="inline-flex items-center gap-1 text-[12px] font-medium text-brand hover:underline"
      data-open-company={e.symbol}
    >
      {withText && t({ ar: "صفحة الشركة", en: "Company page" })}
      <ArrowUpRight className="size-4" aria-label={t({ ar: "صفحة الشركة", en: "Company page" })} />
    </Link>
  );
}
