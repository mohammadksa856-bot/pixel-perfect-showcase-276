import { useEffect, useRef, useState } from "react";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { getResearchIndex } from "@/lib/web-v1/library.functions";
import {
  hasText,
  queryResearch,
  researchFacets,
  type ResearchItem,
  type ResearchQuery,
} from "@/lib/web-v1/library";
import { useI18n } from "@/lib/i18n";
import { iso } from "@/lib/bidi";
import { PreviewContainer, WebV1Shell } from "@/components/web-v1/shell";
import { PageHeader } from "@/components/web-v1/market-parts";
import { CardsSkeleton, Chip, L, LibraryStateView } from "@/components/web-v1/library-parts";
import { ResearchCard } from "@/components/web-v1/library-cards";

/**
 * WEB-05C: استعراض الأبحاث. المحتوى المنشور فقط؛ البحث والتصفية (القطاع، الوسم) والترتيب في عنوان الصفحة.
 * في المعاينة المجمّدة أو عند تعذر المصدر: حالة صريحة لا قائمة فارغة.
 */
const pickOf = <T extends string>(v: unknown, allowed: readonly T[], d: T): T =>
  allowed.includes(v as T) ? (v as T) : d;
const s80 = (v: unknown) => (typeof v === "string" ? v.slice(0, 80) : "");

export const Route = createFileRoute("/preview/web-v1/research/")({
  validateSearch: (s: Partial<ResearchQuery>): ResearchQuery => ({
    q: s80(s.q),
    sector: s80(s.sector) || "all",
    tag: s80(s.tag) || "all",
    sort: pickOf(s.sort, ["newest", "oldest"] as const, "newest"),
  }),
  loader: async () => {
    const r = await getResearchIndex();
    if (!r) throw notFound();
    return r;
  },
  pendingComponent: () => (
    <WebV1Shell>
      <PreviewContainer className="py-10">
        <CardsSkeleton />
      </PreviewContainer>
    </WebV1Shell>
  ),
  head: () => ({
    meta: [{ title: "الأبحاث | معرفة استثمار" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: ResearchIndex,
});

function ResearchIndex() {
  const result = Route.useLoaderData();
  const { t } = useI18n();
  return (
    <WebV1Shell>
      <PageHeader
        crumbs={[
          { label: { ar: "الرئيسية", en: "Home" }, to: "/preview/web-v1" },
          { label: { ar: "الأبحاث", en: "Research" } },
        ]}
        title={t({ ar: "الأبحاث", en: "Research" })}
        description={t({
          ar: "أبحاث معمّقة منشورة في الموقع، بمراجعها وأقسامها. ابحث وصفِّ بالقطاع والوسم.",
          en: "In-depth research published on the site, with its sections and references. Search and filter by sector and tag.",
        })}
      />
      <PreviewContainer className="py-8">
        {result.state === "ok" ? (
          <ResearchList items={result.data} />
        ) : result.state === "not_found" ? (
          <LibraryStateView kind="not_found" />
        ) : (
          <LibraryStateView kind={result.state} reason={result.reason} />
        )}
      </PreviewContainer>
    </WebV1Shell>
  );
}

function ResearchList({ items }: { items: ResearchItem[] }) {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { t } = useI18n();
  const set = (patch: Partial<ResearchQuery>) =>
    navigate({
      search: (s: ResearchQuery) => ({ ...s, ...patch }),
      replace: true,
      resetScroll: false,
    });
  const [text, setText] = useState(search.q);
  const latest = useRef(search.q);
  latest.current = search.q;
  useEffect(() => {
    if (text === latest.current) return;
    const id = setTimeout(() => text !== latest.current && set({ q: text }), 200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  if (!items.length) return <LibraryStateView kind="empty" />;
  const f = researchFacets(items);
  const rows = queryResearch(items, search);
  const sectorName = (slug: string) => items.find((r) => r.sectorSlug === slug)?.sectorName;
  const filtered = search.q || search.sector !== "all" || search.tag !== "all";

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="flex h-11 w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 focus-within:border-brand/60 lg:flex-1">
          <Search className="size-4 shrink-0 text-brand" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t({
              ar: "ابحث في العناوين والملخصات والوسوم",
              en: "Search titles, summaries and tags",
            })}
            className="h-full w-full min-w-0 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
            aria-label={t({ ar: "بحث في الأبحاث", en: "Search research" })}
            data-research-input
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
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <select
            value={search.sector}
            onChange={(e) => set({ sector: e.target.value })}
            aria-label={t({ ar: "القطاع", en: "Sector" })}
            className="h-11 min-w-0 rounded-xl border border-border bg-card px-2.5 text-[12px]"
            data-filter="sector"
          >
            <option value="all">{t({ ar: "كل القطاعات", en: "All sectors" })}</option>
            {f.sectors.map((s) => {
              const n = sectorName(s.slug);
              const label =
                n && hasText(n)
                  ? t({ ar: n.ar ?? n.en ?? s.slug, en: n.en ?? n.ar ?? s.slug })
                  : s.slug;
              return (
                <option key={s.slug} value={s.slug}>
                  {label} ({s.count})
                </option>
              );
            })}
          </select>
          <select
            value={search.sort}
            onChange={(e) => set({ sort: e.target.value as ResearchQuery["sort"] })}
            aria-label={t({ ar: "الترتيب", en: "Sort" })}
            className="h-11 min-w-0 rounded-xl border border-border bg-card px-2.5 text-[12px]"
            data-filter="sort"
          >
            <option value="newest">{t({ ar: "الأحدث أولًا", en: "Newest first" })}</option>
            <option value="oldest">{t({ ar: "الأقدم أولًا", en: "Oldest first" })}</option>
          </select>
        </div>
      </div>

      {f.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5" data-tags>
          <Chip on={search.tag === "all"} onClick={() => set({ tag: "all" })} data="tag-all">
            {t({ ar: "كل الوسوم", en: "All tags" })}
          </Chip>
          {f.tags.map((x) => (
            <Chip
              key={x.key}
              on={search.tag === x.key}
              onClick={() => set({ tag: x.key })}
              count={x.count}
              data={`tag-${x.key}`}
            >
              <L t={x.label} />
            </Chip>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between text-[12px]">
        <p role="status" data-research-count={rows.length}>
          {t({
            ar: `${iso(rows.length)} من ${iso(items.length)} بحث`,
            en: `${rows.length} of ${items.length} research pieces`,
          })}
        </p>
        {filtered && (
          <button
            type="button"
            className="text-brand hover:underline"
            onClick={() => {
              setText("");
              set({ q: "", sector: "all", tag: "all" });
            }}
            data-research-reset
          >
            {t({ ar: "إزالة المرشحات", en: "Clear filters" })}
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="mt-4">
          <LibraryStateView
            kind="empty"
            title={{ ar: "لا أبحاث تطابق البحث والمرشحات", en: "No research matches" }}
            reason={{
              ar: "جرّب كلمة أخرى أو أزل بعض المرشحات.",
              en: "Try another word or remove some filters.",
            }}
          />
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-research-grid>
          {rows.map((r) => (
            <li key={r.slug}>
              <ResearchCard r={r} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
