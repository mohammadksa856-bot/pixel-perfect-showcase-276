import { createFileRoute, notFound } from "@tanstack/react-router";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { CompanyCard, ResearchCard, SectionHeading } from "@/components/cards";
import { ui, useI18n } from "@/lib/i18n";
import { getCompanies, getResearch, getSector } from "@/lib/content";

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

  return (
    <PageShell>
      <PageHero eyebrow={t(ui.sectors)} title={t(sector.name)} description={t(sector.description)}>
        <div className="mt-8 flex flex-wrap gap-3 text-xs">
          <span className="rounded-full border border-night-foreground/15 px-4 py-2">
            {companies.length} {t(ui.statCompanies)}
          </span>
          <span className="rounded-full border border-night-foreground/15 px-4 py-2">
            {research.length} {t(ui.statResearch)}
          </span>
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
      </Container>
    </PageShell>
  );
}
