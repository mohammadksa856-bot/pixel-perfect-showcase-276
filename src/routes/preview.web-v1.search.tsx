import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { getWebV1Enabled } from "@/lib/web-v1/flag.functions";
import { queryText, SEARCH_COPY } from "@/lib/web-v1/catalog";
import { useI18n } from "@/lib/i18n";
import { PreviewContainer, WebV1Shell } from "@/components/web-v1/shell";
import { SearchResults, useSiteSearch } from "@/components/web-v1/site-search";

/** WEB-05A: صفحة نتائج البحث الكاملة، بنفس محرك البحث وحالاته في نافذة Ctrl+K. */
export const Route = createFileRoute("/preview/web-v1/search")({
  validateSearch: (s: Record<string, unknown>): { q: string } => ({
    q: queryText(s["q"]),
  }),
  loader: async () => {
    if (!(await getWebV1Enabled())) throw notFound();
    return null;
  },
  head: () => ({
    meta: [{ title: "البحث | معرفة استثمار" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { t } = useI18n();
  const [text, setText] = useState(q);
  useEffect(() => setText(q), [q]);
  const status = useSiteSearch(q, 0);
  return (
    <WebV1Shell>
      <PreviewContainer className="py-10">
        <h1 className="text-2xl font-bold tracking-tight">{t({ ar: "البحث", en: "Search" })}</h1>
        <form
          className="mt-4 flex h-12 max-w-2xl items-center gap-3 rounded-xl border border-border bg-card px-4 focus-within:border-brand/60"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ search: { q: text.trim() } });
          }}
        >
          <Search className="size-5 text-brand" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="h-full w-full bg-transparent text-[14px] outline-none"
            placeholder={t(SEARCH_COPY.short)}
            aria-label={t({ ar: "بحث", en: "Search" })}
            data-search-page-input
          />
          <button
            type="submit"
            className="rounded-lg bg-brand px-3 py-1.5 text-[13px] text-brand-foreground"
          >
            {t({ ar: "بحث", en: "Search" })}
          </button>
        </form>
        <div className="mt-6 max-w-3xl overflow-hidden rounded-2xl border border-border/70 bg-card">
          <SearchResults status={status} />
        </div>
      </PreviewContainer>
    </WebV1Shell>
  );
}
