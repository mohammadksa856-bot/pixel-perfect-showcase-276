import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, FileText, Layers, Search as SearchIcon, BookOpen } from "lucide-react";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { Panel } from "@/components/cards";
import { useI18n } from "@/lib/i18n";
import { search } from "@/lib/content";
import type { SearchResult } from "@/lib/content";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): { q: string } => ({
    q: typeof s["q"] === "string" ? (s["q"] as string) : "",
  }),
  head: () => ({
    meta: [{ title: "نتائج البحث | معرفة استثمار" }, { name: "robots", content: "noindex" }],
  }),
  component: SearchPage,
});

const typeMeta = {
  company: { icon: Building2, to: "/companies/$slug", label: { ar: "شركة", en: "Company" } },
  sector: { icon: Layers, to: "/sectors/$slug", label: { ar: "قطاع", en: "Sector" } },
  research: { icon: FileText, to: "/research/$slug", label: { ar: "بحث", en: "Research" } },
  knowledge: { icon: BookOpen, to: "/knowledge/$slug", label: { ar: "معرفة", en: "Knowledge" } },
} as const;

function SearchPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { q } = Route.useSearch();
  const [input, setInput] = useState(q);

  const resultsQuery = useQuery({
    queryKey: ["search", q],
    queryFn: () => search(q),
    enabled: q.length > 0,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/search", search: { q: input.trim() } });
  };

  const grouped = (resultsQuery.data ?? []).reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  return (
    <PageShell>
      <PageHero
        eyebrow={t({ ar: "البحث", en: "Search" })}
        title={
          q
            ? `${t({ ar: "نتائج البحث عن", en: "Results for" })} "${q}"`
            : t({ ar: "البحث", en: "Search" })
        }
      >
        <form onSubmit={submit} className="mt-8 flex max-w-lg gap-2">
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t({
              ar: "ابحث عن شركة، قطاع، مقال، أو مفهوم...",
              en: "Search companies, sectors, articles and knowledge...",
            })}
            className="flex-1 rounded-xl border border-night-foreground/15 bg-night-foreground/5 px-4 py-3 text-sm text-night-foreground outline-none placeholder:text-night-foreground/40 focus:ring-2 focus:ring-brand"
            autoFocus
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground"
          >
            <SearchIcon className="size-4" />
          </button>
        </form>
      </PageHero>

      <Container>
        {!q && (
          <p className="text-sm text-muted-foreground">
            {t({ ar: "اكتب كلمة للبحث بأعلى الصفحة.", en: "Type a search term above." })}
          </p>
        )}

        {q && resultsQuery.isLoading && (
          <p className="text-sm text-muted-foreground">
            {t({ ar: "يبحث...", en: "Searching..." })}
          </p>
        )}

        {q && resultsQuery.data && resultsQuery.data.length === 0 && (
          <Panel className="text-center">
            <p className="text-sm text-muted-foreground">
              {t({
                ar: "ما فيه نتائج مطابقة. جرّب كلمة مختلفة.",
                en: "No matching results. Try a different term.",
              })}
            </p>
          </Panel>
        )}

        <div className="space-y-10">
          {(Object.keys(grouped) as (keyof typeof typeMeta)[]).map((type) => {
            const meta = typeMeta[type];
            const Icon = meta.icon;
            return (
              <section key={type}>
                <h2 className="mb-4 flex items-center gap-2 text-sm font-bold">
                  <Icon className="size-4 text-brand" />
                  {t(meta.label)}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {grouped[type]!.map((r) => (
                    <Link
                      key={r.slug}
                      to={meta.to}
                      params={{ slug: r.slug }}
                      className="rounded-xl border border-border/70 bg-card p-4 transition-colors hover:border-foreground/15"
                    >
                      <div className="text-sm font-bold">{t(r.title)}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {t(r.subtitle)}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </Container>
    </PageShell>
  );
}
