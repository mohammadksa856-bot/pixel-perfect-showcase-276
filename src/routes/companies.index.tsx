import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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

function CompaniesPage() {
  const { t } = useI18n();
  const [active, setActive] = useState<string>("all");
  const sectors = getSectors();
  const companies = useMemo(
    () => getCompanies(active === "all" ? undefined : { sectorSlug: active }),
    [active],
  );

  return (
    <PageShell>
      <PageHero
        eyebrow={t(ui.companies)}
        title={t(ui.discoverCompanies)}
        description={t({
          ar: "ملفات شركات مبنية على تحليل نوعي وكمي، جاهزة للربط بمصادر بيانات مباشرة.",
          en: "Company profiles built on qualitative and quantitative analysis, ready for live data sources.",
        })}
      />
      <Container>
        <div className="mb-8 flex flex-wrap gap-2">
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
