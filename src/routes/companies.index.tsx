import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { CompanyCard } from "@/components/cards";
import { ui, useI18n } from "@/lib/i18n";
import { getCompanies, getSectors } from "@/lib/content";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/companies/")({
  head: () => ({
    meta: [
      { title: "الشركات | معرفة استثمار" },
      {
        name: "description",
        content:
          "ملفات تحليلية للشركات المدرجة عالمياً ومحلياً: نموذج العمل، المزايا التنافسية، القوائم المالية، والتقييم.",
      },
      { property: "og:title", content: "الشركات — معرفة استثمار" },
      {
        property: "og:description",
        content: "استعرض ملفات الشركات مع البيانات المالية والتحليل التنافسي والتقييم.",
      },
    ],
  }),
  component: CompaniesPage,
});

type SortKey = "default" | "marketCap" | "change" | "alpha";

function parseMarketCap(v: string): number {
  const num = parseFloat(v.replace(/[^0-9.]/g, "")) || 0;
  if (v.includes("T")) return num * 1000;
  return num;
}

function CompaniesPage() {
  const { t } = useI18n();
  const [active, setActive] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("default");
  const sectors = getSectors();
  const companies = useMemo(() => {
    const list = getCompanies(active === "all" ? undefined : { sectorSlug: active });
    const sorted = [...list];
    if (sort === "marketCap")
      sorted.sort((a, b) => parseMarketCap(b.marketCap) - parseMarketCap(a.marketCap));
    if (sort === "change")
      sorted.sort(
        (a, b) =>
          parseFloat(b.change.replace(/[^0-9.-]/g, "")) -
          parseFloat(a.change.replace(/[^0-9.-]/g, "")),
      );
    if (sort === "alpha") sorted.sort((a, b) => t(a.name).localeCompare(t(b.name)));
    return sorted;
  }, [active, sort, t]);

  return (
    <PageShell>
      <Container>
        <nav className="flex items-center gap-1.5 pt-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            {t(ui.home)}
          </Link>
          <ChevronLeft className="size-3.5 rtl:rotate-180" />
          <span className="text-foreground">{t(ui.companies)}</span>
        </nav>
      </Container>

      <PageHero
        eyebrow={t(ui.companies)}
        title={t(ui.discoverCompanies)}
        description={t({
          ar: "ملفات شركات مبنية على تحليل نوعي وكمي، جاهزة للربط بمصادر بيانات مباشرة.",
          en: "Company profiles built on qualitative and quantitative analysis, ready for live data sources.",
        })}
      />
      <Container>
        <div className="mb-5 flex flex-wrap gap-2">
          {[{ slug: "all", name: { ar: "الكل", en: "All" } }, ...sectors].map((s) => (
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

        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {companies.length} {t({ ar: "نتيجة", en: "results" })}
          </span>
          <div className="flex gap-1.5">
            {(
              [
                { key: "default", label: { ar: "الافتراضي", en: "Default" } },
                { key: "marketCap", label: { ar: "القيمة السوقية", en: "Market cap" } },
                { key: "change", label: { ar: "الأداء", en: "Performance" } },
                { key: "alpha", label: { ar: "أبجدياً", en: "Alphabetical" } },
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {companies.map((c) => (
            <CompanyCard key={c.slug} company={c} />
          ))}
        </div>
        {!companies.length && (
          <p className="text-sm text-muted-foreground">
            {t({ ar: "لا توجد نتائج.", en: "No results." })}
          </p>
        )}
      </Container>
    </PageShell>
  );
}
