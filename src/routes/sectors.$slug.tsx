import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { ChevronLeft, MessagesSquare } from "lucide-react";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { CompanyCard, ResearchCard, KnowledgeCard, SectionHeading } from "@/components/cards";
import { ui, useI18n } from "@/lib/i18n";
import { getCompanies, getKnowledge, getResearch, getSector } from "@/lib/content";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sectors/$slug")({
  loader: ({ params }) => {
    const sector = getSector(params.slug);
    if (!sector) throw notFound();
    return { sector };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "القطاع غير موجود | معرفة استثمار" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { sector } = loaderData;
    const title = `${sector.name.ar} | معرفة استثمار`;
    return {
      meta: [
        { title },
        { name: "description", content: sector.description.ar },
        { property: "og:title", content: title },
        { property: "og:description", content: sector.description.ar },
      ],
    };
  },
  component: SectorPage,
});

function SectorPage() {
  const { sector } = Route.useLoaderData();
  const { t } = useI18n();
  const companies = getCompanies({ sectorSlug: sector.slug });
  const research = getResearch({ sectorSlug: sector.slug });
  const relatedKnowledge = ["valuation", "financial-statements"]
    .map((slug) => getKnowledge().find((k) => k.slug === slug))
    .filter((k): k is NonNullable<typeof k> => Boolean(k));

  const changes = companies
    .map((c) => parseFloat(c.change.replace(/[^0-9.-]/g, "")))
    .filter((n) => !Number.isNaN(n));
  const avgChange = changes.length ? changes.reduce((sum, n) => sum + n, 0) / changes.length : null;

  return (
    <PageShell>
      <Container>
        <nav className="flex items-center gap-1.5 pt-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            {t(ui.home)}
          </Link>
          <ChevronLeft className="size-3.5 rtl:rotate-180" />
          <Link to="/sectors" className="hover:text-foreground">
            {t(ui.sectors)}
          </Link>
          <ChevronLeft className="size-3.5 rtl:rotate-180" />
          <span className="text-foreground">{t(sector.name)}</span>
        </nav>
      </Container>

      <PageHero eyebrow={t(ui.sectors)} title={t(sector.name)} description={t(sector.description)}>
        <div className="mt-8 flex flex-wrap items-center gap-3 text-xs">
          <span className="rounded-full border border-night-foreground/15 px-4 py-2">
            {companies.length} {t(ui.statCompanies)}
          </span>
          <span className="rounded-full border border-night-foreground/15 px-4 py-2">
            {research.length} {t(ui.statResearch)}
          </span>
          {avgChange !== null && (
            <span
              className={cn(
                "rounded-full border px-4 py-2 font-semibold",
                avgChange >= 0
                  ? "border-tone-emerald/30 text-tone-emerald"
                  : "border-tone-rose/30 text-tone-rose",
              )}
            >
              {t({ ar: "متوسط أداء الشركات", en: "Avg. company performance" })}:{" "}
              {avgChange >= 0 ? "+" : ""}
              {avgChange.toFixed(1)}%
            </span>
          )}
        </div>
      </PageHero>

      <Container>
        <section className="mb-14 rounded-2xl border border-border/70 bg-card p-6 sm:p-8">
          <h2 className="mb-3 text-sm font-bold text-muted-foreground">
            {t({
              ar: "ما هو قطاع " + t(sector.name) + "؟",
              en: `What is the ${t(sector.name)} sector?`,
            })}
          </h2>
          <p className="text-sm leading-8">{t(sector.about)}</p>
        </section>

        <section className="mb-16">
          <SectionHeading title={t(ui.companies)} />
          {companies.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {companies.map((c) => (
                <CompanyCard key={c.slug} company={c} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t({ ar: "لا توجد شركات مضافة بعد.", en: "No companies added yet." })}
            </p>
          )}
        </section>

        <section>
          <SectionHeading title={t(ui.research)} />
          {research.length ? (
            <div className="grid gap-5 md:grid-cols-3">
              {research.map((r) => (
                <ResearchCard key={r.slug} item={r} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t({ ar: "لا توجد أبحاث منشورة بعد.", en: "No research published yet." })}
            </p>
          )}
        </section>

        {relatedKnowledge.length > 0 && (
          <section className="mt-16">
            <SectionHeading
              title={t({ ar: "قبل ما تستثمر بهذا القطاع", en: "Before you invest in this sector" })}
            />
            <div className="grid gap-5 md:grid-cols-2">
              {relatedKnowledge.map((item) => (
                <KnowledgeCard key={item.slug} item={item} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-16 flex flex-col items-center gap-3 rounded-2xl border border-border/70 bg-card p-8 text-center sm:flex-row sm:justify-between sm:text-start">
          <div>
            <h3 className="text-sm font-bold">
              {t({ ar: "ناقش قطاع ", en: "Discuss the " }) +
                t(sector.name) +
                t({ ar: " مع مستثمرين آخرين", en: " sector with other investors" })}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t({
                ar: "انضم للوحة النقاش المخصصة لهذا القطاع بمجتمعنا.",
                en: "Join the discussion board dedicated to this sector.",
              })}
            </p>
          </div>
          <Link
            to="/community"
            className="flex shrink-0 items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-transform hover:scale-[1.03]"
          >
            <MessagesSquare className="size-4" />
            {t({ ar: "افتح لوحة المجتمع", en: "Open community board" })}
          </Link>
        </section>
      </Container>
    </PageShell>
  );
}
