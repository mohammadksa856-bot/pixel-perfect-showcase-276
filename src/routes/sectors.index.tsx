import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { getIcon } from "@/lib/icons";
import { ui, useI18n } from "@/lib/i18n";
import { getSectorDirectory } from "@/lib/sector-stats";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sectors/")({
  loader: getSectorDirectory,
  head: () => ({
    meta: [
      { title: "القطاعات | معرفة استثمار" },
      {
        name: "description",
        content:
          "استكشف القطاعات الاستثمارية من الطاقة والفضاء والدفاع إلى التقنية والذكاء الاصطناعي والرعاية الصحية والعقار.",
      },
      { property: "og:title", content: "القطاعات — معرفة استثمار" },
      {
        property: "og:description",
        content: "نظرة تحليلية على أهم القطاعات الاستثمارية العالمية وشركاتها وأبحاثها.",
      },
    ],
  }),
  component: SectorsPage,
});

type SortKey = "default" | "mostCompanies" | "alpha";

function SectorsPage() {
  const { t } = useI18n();
  const [sort, setSort] = useState<SortKey>("default");
  const [hideEmpty, setHideEmpty] = useState(false);
  const { stats, status } = Route.useLoaderData();
  const countsAvailable = status === "available";

  const sorted = useMemo(() => {
    let list = [...stats];
    if (hideEmpty && countsAvailable)
      list = list.filter((s) => (s.companiesCount ?? 0) > 0 || (s.researchCount ?? 0) > 0);
    if (sort === "mostCompanies" && countsAvailable)
      list.sort((a, b) => (b.companiesCount ?? 0) - (a.companiesCount ?? 0));
    if (sort === "alpha") list.sort((a, b) => t(a.sector.name).localeCompare(t(b.sector.name)));
    return list;
  }, [stats, sort, hideEmpty, t, countsAvailable]);
  return (
    <PageShell>
      <Container>
        <nav className="flex items-center gap-1.5 pt-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            {t(ui.home)}
          </Link>
          <ChevronLeft className="size-3.5 rtl:rotate-180" />
          <span className="text-foreground">{t(ui.sectors)}</span>
        </nav>
      </Container>

      <PageHero
        eyebrow={t(ui.sectors)}
        title={t(ui.exploreSectors)}
        description={t({
          ar: "كل قطاع له صفحته الخاصة مع الشركات المدرجة والأبحاث المرتبطة به.",
          en: "Every sector has a dedicated page with its listed companies and related research.",
        })}
      />
      <Container>
        <section className="mb-10 rounded-2xl border border-border/70 bg-card p-6 sm:p-8">
          <h2 className="mb-3 text-sm font-bold text-muted-foreground">
            {t({ ar: 'وش يعني "قطاع"؟', en: 'What does "sector" mean?' })}
          </h2>
          <p className="text-sm leading-8">
            {t({
              ar: "القطاع مجموعة من الشركات تشتغل بنفس المجال أو تقدم منتجات وخدمات متشابهة — زي شركات النفط اللي تقع تحت قطاع الطاقة، أو شركات البرمجيات اللي تقع تحت قطاع التقنية. تقسيم الشركات لقطاعات يساعدك تقارن بين الشركات المتشابهة، وتفهم كيف تتأثر مجموعة كاملة من الشركات بنفس الأحداث الاقتصادية.",
              en: "A sector is a group of companies operating in the same field or offering similar products and services — like oil companies under the energy sector, or software companies under technology. Grouping companies into sectors helps you compare similar businesses and understand how a whole group reacts to the same economic events.",
            })}
          </p>
        </section>

        {status !== "available" && (
          <p role="status" className="mb-4 rounded-xl border border-border bg-muted p-4 text-sm">
            {t(
              status === "unavailable"
                ? {
                    ar: "قائمة القطاعات غير متاحة حاليًا. يرجى المحاولة لاحقًا.",
                    en: "The sector directory is currently unavailable. Please try again later.",
                  }
                : {
                    ar: "بعض إحصاءات القطاعات غير متاحة حاليًا. لا يمكن تصفية القطاعات حسب النشاط أو ترتيبها حسب عدد الشركات.",
                    en: "Some sector counts are currently unavailable. Activity filtering and company-count sorting are unavailable.",
                  },
            )}
          </p>
        )}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={hideEmpty}
              disabled={!countsAvailable}
              onChange={(e) => setHideEmpty(e.target.checked)}
              className="size-3.5 accent-brand"
            />
            {t({ ar: "أظهر القطاعات النشطة فقط", en: "Show active sectors only" })}
          </label>
          <div className="flex gap-1.5">
            {(
              [
                { key: "default", label: { ar: "الافتراضي", en: "Default" } },
                { key: "mostCompanies", label: { ar: "عدد الشركات", en: "Most companies" } },
                { key: "alpha", label: { ar: "أبجدياً", en: "Alphabetical" } },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                aria-pressed={sort === opt.key}
                disabled={opt.key === "mostCompanies" && !countsAvailable}
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

        {status === "available" && sorted.length === 0 && (
          <p className="mb-6 text-sm text-muted-foreground">
            {t({ ar: "لا توجد قطاعات تطابق هذا الخيار.", en: "No sectors match this selection." })}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map(({ sector, companiesCount, researchCount }) => {
            const Icon = getIcon(sector.icon);
            const isEmpty = companiesCount === 0 && researchCount === 0;
            return (
              <Link
                key={sector.slug}
                to="/sectors/$slug"
                params={{ slug: sector.slug }}
                className="group flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-foreground/15 hover:shadow-lift"
              >
                <span
                  className="flex size-12 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: `color-mix(in oklch, var(--${sector.tone}) 14%, transparent)`,
                  }}
                >
                  <Icon
                    className="size-6"
                    style={{ color: `var(--${sector.tone})` }}
                    strokeWidth={1.8}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="block text-sm font-bold">{t(sector.name)}</span>
                    {isEmpty && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {t({ ar: "قريباً", en: "Coming soon" })}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {t(sector.tagline)}
                  </span>
                  <span className="mt-2 block text-xs text-muted-foreground">
                    {t({ ar: "الشركات", en: "Companies" })}:{" "}
                    {companiesCount ?? t({ ar: "غير متاح", en: "Unavailable" })}
                    {" · "}
                    {t({ ar: "الأبحاث", en: "Research" })}:{" "}
                    {researchCount ?? t({ ar: "غير متاح", en: "Unavailable" })}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </Container>
    </PageShell>
  );
}
