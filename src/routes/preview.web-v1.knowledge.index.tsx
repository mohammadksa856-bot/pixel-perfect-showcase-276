import { useState } from "react";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { getKnowledgeIndex } from "@/lib/web-v1/library.functions";
import {
  knowledgeFacets,
  knowledgeGroups,
  queryKnowledge,
  type KnowledgeItem,
  type KnowledgeQuery,
} from "@/lib/web-v1/library";
import { useI18n } from "@/lib/i18n";
import { iso } from "@/lib/bidi";
import { PreviewContainer, WebV1Shell } from "@/components/web-v1/shell";
import { PageHeader } from "@/components/web-v1/market-parts";
import { KnowledgeCard } from "@/components/web-v1/library-cards";
import { CardsSkeleton, Chip, L, LibraryStateView } from "@/components/web-v1/library-parts";

/**
 * WEB-05C: مكتبة المعرفة: دليل الموضوعات مجمّعًا بالتصنيف كما ورد في المصدر، مع بحث وتصفية بالتصنيف والمستوى.
 */
const s80 = (v: unknown) => (typeof v === "string" ? v.slice(0, 80) : "");

export const Route = createFileRoute("/preview/web-v1/knowledge/")({
  validateSearch: (s: Partial<KnowledgeQuery>): KnowledgeQuery => ({
    q: s80(s.q),
    category: s80(s.category) || "all",
    level: s80(s.level) || "all",
  }),
  loader: async () => {
    const r = await getKnowledgeIndex();
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
    meta: [
      { title: "مكتبة المعرفة | معرفة استثمار" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: KnowledgeIndex,
});

function KnowledgeIndex() {
  const result = Route.useLoaderData();
  const { t } = useI18n();
  return (
    <WebV1Shell>
      <PageHeader
        crumbs={[
          { label: { ar: "الرئيسية", en: "Home" }, to: "/preview/web-v1" },
          { label: { ar: "مكتبة المعرفة", en: "Knowledge library" } },
        ]}
        title={t({ ar: "مكتبة المعرفة", en: "Knowledge library" })}
        description={t({
          ar: "مفاهيم الاستثمار والتحليل المالي، مرتبة بالموضوع. ابحث أو اختر تصنيفًا.",
          en: "Investing and financial-analysis concepts, organised by topic. Search or pick a category.",
        })}
      />
      <PreviewContainer className="py-8">
        {result.state === "ok" ? (
          <KnowledgeList items={result.data} />
        ) : result.state === "not_found" ? (
          <LibraryStateView kind="not_found" />
        ) : (
          <LibraryStateView kind={result.state} reason={result.reason} />
        )}
      </PreviewContainer>
    </WebV1Shell>
  );
}

function KnowledgeList({ items }: { items: KnowledgeItem[] }) {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { t } = useI18n();
  const [text, setText] = useState(search.q);
  const set = (patch: Partial<KnowledgeQuery>) =>
    navigate({
      search: (s: KnowledgeQuery) => ({ ...s, ...patch }),
      replace: true,
      resetScroll: false,
    });

  if (!items.length) return <LibraryStateView kind="empty" />;
  const f = knowledgeFacets(items);
  const query = { ...search, q: text };
  const rows = queryKnowledge(items, query);
  const grouped = !text && search.category === "all" && search.level === "all";
  const filtered = text || search.category !== "all" || search.level !== "all";

  return (
    <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="min-w-0 space-y-5">
        <label className="flex h-11 items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 focus-within:border-brand/60">
          <Search className="size-4 shrink-0 text-brand" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => set({ q: text })}
            placeholder={t({ ar: "ابحث في الموضوعات", en: "Search topics" })}
            className="h-full w-full min-w-0 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
            aria-label={t({ ar: "بحث في المعرفة", en: "Search knowledge" })}
            data-knowledge-input
          />
          {text && (
            <button
              type="button"
              onClick={() => {
                setText("");
                set({ q: "" });
              }}
              aria-label={t({ ar: "مسح", en: "Clear" })}
            >
              <X className="size-4 text-muted-foreground" />
            </button>
          )}
        </label>
        <fieldset>
          <legend className="mb-2 text-[12px] font-semibold">
            {t({ ar: "التصنيف", en: "Category" })}
          </legend>
          <div className="flex flex-wrap gap-1.5 lg:flex-col lg:items-stretch" data-categories>
            <Chip
              on={search.category === "all"}
              onClick={() => set({ category: "all" })}
              count={items.length}
              data="category-all"
            >
              {t({ ar: "كل الموضوعات", en: "All topics" })}
            </Chip>
            {f.categories.map((c) => (
              <Chip
                key={c.key}
                on={search.category === c.key}
                onClick={() => set({ category: c.key })}
                count={c.count}
                data={`category-${c.key}`}
              >
                {c.label ? (
                  <L t={c.label} />
                ) : (
                  t({ ar: "بلا تصنيف في المصدر", en: "Uncategorised in source" })
                )}
              </Chip>
            ))}
          </div>
        </fieldset>
        {f.levels.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-[12px] font-semibold">
              {t({ ar: "المستوى", en: "Level" })}
            </legend>
            <div className="flex flex-wrap gap-1.5" data-levels>
              <Chip
                on={search.level === "all"}
                onClick={() => set({ level: "all" })}
                data="level-all"
              >
                {t({ ar: "الكل", en: "All" })}
              </Chip>
              {f.levels.map((l) => (
                <Chip
                  key={l.key}
                  on={search.level === l.key}
                  onClick={() => set({ level: l.key })}
                  count={l.count}
                  data={`level-${l.key}`}
                >
                  <L t={l.label} />
                </Chip>
              ))}
            </div>
          </fieldset>
        )}
      </aside>

      <div className="min-w-0">
        <div className="mb-4 flex items-center justify-between text-[12px]">
          <p role="status" data-knowledge-count={rows.length}>
            {t({
              ar: `${iso(rows.length)} من ${iso(items.length)} موضوع`,
              en: `${rows.length} of ${items.length} topics`,
            })}
          </p>
          {filtered && (
            <button
              type="button"
              className="text-brand hover:underline"
              onClick={() => {
                setText("");
                set({ q: "", category: "all", level: "all" });
              }}
              data-knowledge-reset
            >
              {t({ ar: "إزالة المرشحات", en: "Clear filters" })}
            </button>
          )}
        </div>
        {rows.length === 0 ? (
          <LibraryStateView
            kind="empty"
            title={{ ar: "لا موضوعات تطابق البحث", en: "No topics match" }}
            reason={{ ar: "جرّب كلمة أخرى أو تصنيفًا آخر.", en: "Try another word or category." }}
          />
        ) : grouped ? (
          <div className="space-y-10" data-knowledge-groups>
            {knowledgeGroups(rows).map((g) => (
              <section key={g.key} data-knowledge-group={g.key}>
                <h2 className="mb-3 flex items-baseline gap-2 text-lg font-bold">
                  {g.label ? (
                    <L t={g.label} />
                  ) : (
                    t({ ar: "بلا تصنيف في المصدر", en: "Uncategorised in source" })
                  )}
                  <span className="num text-[12px] font-normal text-muted-foreground">
                    {iso(g.items.length)}
                  </span>
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {g.items.map((k) => (
                    <li key={k.slug}>
                      <KnowledgeCard k={k} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2" data-knowledge-grid>
            {rows.map((k) => (
              <li key={k.slug}>
                <KnowledgeCard k={k} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
