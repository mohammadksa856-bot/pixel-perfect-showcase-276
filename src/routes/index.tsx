import { MarketTicker } from "@/components/MarketTicker";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ResearchHero } from "@/components/research-hero";
import { usableEditorialTitle } from "@/lib/editorial-display";
import { PageShell } from "@/components/page-shell";
import { SearchBox } from "@/components/search-box";
import {
  Arrow,
  CompanyCard,
  KnowledgeCard,
  MarketCard,
  ResearchCard,
  SectionHeading,
  SectorCard,
} from "@/components/cards";
import { ui, useI18n } from "@/lib/i18n";
import {
  getCompanies,
  getKnowledge,
  getMarketCounts,
  getPlatformStats,
  getResearch,
  getSectors,
} from "@/lib/content";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [stats, markets, sectors, companies, research, knowledge] = await Promise.all([
      getPlatformStats(),
      getMarketCounts(),
      getSectors(),
      getCompanies({ limit: 5 }),
      getResearch(),
      getKnowledge(5),
    ]);
    return { stats, markets, sectors, companies, research, knowledge };
  },
  head: () => ({
    meta: [
      { title: "معرفة استثمار | منصة تحليل الشركات والأسواق والاستثمار" },
      {
        name: "description",
        content:
          "منصة متخصصة في تحليل الشركات والقطاعات والأسواق والاقتصاد، مع أبحاث ومحتوى معرفي يساعدك على الاستثمار بمعرفة.",
      },
      { property: "og:title", content: "معرفة استثمار — استثمر بمعرفة" },
      {
        property: "og:description",
        content: "تحليلات وأبحاث ومحتوى معرفي عن الشركات والقطاعات العالمية بالعربية والإنجليزية.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { t } = useI18n();
  const { stats, markets, sectors, companies, research, knowledge } = Route.useLoaderData();
  const displayedResearch = research.filter((r) => usableEditorialTitle(t(r.title)));
  const displayedKnowledge = knowledge.filter((k) => usableEditorialTitle(t(k.title)));

  return (
    <PageShell>
      <ResearchHero />

      <MarketTicker />

      {/* Floating stats */}
      <div className="mx-auto mt-10 max-w-5xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border/70 bg-border/60 shadow-panel sm:grid-cols-4">
          {[
            { value: stats.companies, label: ui.statCompanies },
            { value: stats.research, label: ui.statResearch },
            { value: stats.articles, label: ui.statArticles },
            { value: stats.sectors, label: ui.statSectors },
          ].map((s) => (
            <div key={s.label.en} className="bg-card px-6 py-7 text-center">
              <div className="text-3xl font-bold tracking-tight">{s.value}</div>
              <div className="mt-1.5 text-xs text-muted-foreground">{t(s.label)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-20 px-4 py-20 sm:px-6">
        <section>
          <SectionHeading title={t(ui.exploreMarkets)} to="/markets" />
          <div className="grid gap-4 sm:grid-cols-2">
            <MarketCard
              to="/markets/saudi"
              tone="tone-emerald"
              title={t({ ar: "السوق السعودي", en: "Saudi Market" })}
              tagline={t({ ar: "تاسي ونمو", en: "TASI & Nomu" })}
              count={markets.saudi}
            />
            <MarketCard
              to="/markets/us"
              tone="tone-sky"
              title={t({ ar: "السوق الأمريكي", en: "US Market" })}
              tagline={t({ ar: "ناسداك ونيويورك", en: "NASDAQ & NYSE" })}
              count={markets.us}
            />
          </div>
        </section>

        <section>
          <SectionHeading title={t(ui.exploreSectors)} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sectors.slice(0, 5).map((s) => (
              <SectorCard key={s.slug} sector={s} />
            ))}
            <MoreCard to="/sectors" />
          </div>
        </section>

        <section>
          <SectionHeading title={t(ui.discoverCompanies)} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {companies.slice(0, 5).map((c) => (
              <CompanyCard key={c.slug} company={c} />
            ))}
            <MoreCard to="/companies" />
          </div>
        </section>

        <section>
          <SectionHeading title={t(ui.latestResearch)} />
          <div className="grid gap-5 md:grid-cols-3">
            {displayedResearch.slice(0, 3).map((r) => (
              <ResearchCard key={r.slug} item={r} />
            ))}
            <MoreCard to="/research" />
          </div>
          {displayedResearch.length === 0 && (
            <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-xs leading-7 text-muted-foreground">
              {t({
                ar: "لا توجد مواد مؤهلة للعرض في هذه القائمة حاليًا. تظهر المواد بعد مراجعة عنوانها ومحتواها.",
                en: "No display-eligible items in this list right now. Materials appear after title and content review.",
              })}
            </p>
          )}
        </section>

        <section>
          <SectionHeading title={t(ui.knowledgeLibrary)} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {displayedKnowledge.slice(0, 5).map((k) => (
              <KnowledgeCard key={k.slug} item={k} />
            ))}
            <MoreCard to="/knowledge" />
          </div>
        </section>

        <section className="night-panel relative isolate overflow-hidden rounded-3xl px-6 py-12 sm:px-12">
          <div className="chart-grid absolute inset-0 -z-10 opacity-30" />
          <div className="flex flex-col items-center gap-8 text-center md:flex-row md:justify-between md:text-start">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">{t(ui.ctaTitle)}</h2>
              <p className="mt-3 text-sm text-night-foreground/65">{t(ui.ctaCopy)}</p>
            </div>
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-7 py-3.5 text-sm font-semibold text-brand-foreground transition-transform hover:scale-[1.03]"
            >
              {t(ui.ctaButton)}
              <Arrow />
            </a>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function MoreCard({ to }: { to: string }) {
  const { t } = useI18n();
  return (
    <Link
      to={to}
      className="group flex h-full min-h-[110px] flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card p-5 text-center text-muted-foreground transition-all duration-300 hover:-translate-y-1 hover:border-foreground/15 hover:text-foreground hover:shadow-lift"
    >
      <Arrow className="size-5 rotate-180 transition-transform group-hover:-translate-x-1 rtl:rotate-0 rtl:group-hover:translate-x-1" />
      <span className="text-xs font-semibold">{t(ui.viewAll)}</span>
    </Link>
  );
}
