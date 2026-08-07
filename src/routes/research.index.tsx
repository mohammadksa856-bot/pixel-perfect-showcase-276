import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { ResearchCard } from "@/components/cards";
import { ui, useI18n } from "@/lib/i18n";
import { getResearch, getSectors } from "@/lib/content";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/research/")({
  loader: async () => {
    const [research, sectors] = await Promise.all([getResearch(), getSectors()]);
    return { research, sectors };
  },
  head: () => ({
    meta: [
      { title: "الأبحاث | معرفة استثمار" },
      {
        name: "description",
        content:
          "أبحاث استثمارية معمّقة حول الأسواق والقطاعات والشركات، مع ملخصات ورسوم بيانية ومراجع موثوقة.",
      },
      { property: "og:title", content: "الأبحاث — معرفة استثمار" },
      {
        property: "og:description",
        content: "تقارير وأبحاث تحليلية عن الاقتصاد والقطاعات والشركات بالعربية.",
      },
    ],
  }),
  component: ResearchPage,
});

type SortKey = "newest" | "oldest" | "readingTime";

function ResearchPage() {
  const { t } = useI18n();
  const { research: allResearch, sectors } = Route.useLoaderData();
  const [active, setActive] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const sectorsWithResearch = useMemo(
    () => sectors.filter((s) => allResearch.some((r) => r.sectorSlug === s.slug)),
    [sectors, allResearch],
  );

  const research = useMemo(() => {
    const list =
      active === "all" ? allResearch : allResearch.filter((r) => r.sectorSlug === active);
    const sorted = [...list];
    if (sort === "newest") sorted.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    if (sort === "oldest") sorted.sort((a, b) => +new Date(a.date) - +new Date(b.date));
    if (sort === "readingTime") sorted.sort((a, b) => a.readingTime - b.readingTime);
    return sorted;
  }, [allResearch, active, sort]);

  return (
    <PageShell>
      <PageHero
        eyebrow={t(ui.research)}
        title={t(ui.latestResearch)}
        description={t({
          ar: "أبحاث مكتوبة بمنهجية واضحة: فرضية، بيانات، تحليل، وخلاصة قابلة للتطبيق.",
          en: "Research written with a clear method: thesis, data, analysis and an actionable conclusion.",
        })}
      />
      <Container>
        {sectorsWithResearch.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-2">
            <button
              onClick={() => setActive("all")}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
                active === "all"
                  ? "border-transparent bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {t({ ar: "الكل", en: "All" })}
            </button>
            {sectorsWithResearch.map((s) => (
              <button
                key={s.slug}
                onClick={() => setActive(s.slug)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
                  active === s.slug
                    ? "border-transparent bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {t(s.name)}
              </button>
            ))}
          </div>
        )}

        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {research.length} {t({ ar: "نتيجة", en: "results" })}
          </span>
          <div className="flex gap-1.5">
            {(
              [
                { key: "newest", label: { ar: "الأحدث", en: "Newest" } },
                { key: "oldest", label: { ar: "الأقدم", en: "Oldest" } },
                { key: "readingTime", label: { ar: "أقصر قراءة", en: "Shortest read" } },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSort(opt.key)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  sort === opt.key
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-border/70 bg-card hover:bg-muted",
                )}
              >
                {t(opt.label)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {research.map((r) => (
            <ResearchCard key={r.slug} item={r} />
          ))}
        </div>
        {!research.length && (
          <p className="text-sm text-muted-foreground">
            {t({ ar: "لا توجد نتائج.", en: "No results." })}
          </p>
        )}
      </Container>
    </PageShell>
  );
}
