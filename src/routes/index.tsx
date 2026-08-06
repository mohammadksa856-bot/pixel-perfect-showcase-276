import { MarketTicker } from "@/components/MarketTicker";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import heroSpace from "@/assets/hero-space.jpg";
import { PageShell } from "@/components/page-shell";
import {
  Arrow,
  CompanyCard,
  KnowledgeCard,
  ResearchCard,
  SectionHeading,
  SectorCard,
} from "@/components/cards";
import { ui, useI18n } from "@/lib/i18n";
import {
  getBoards,
  getCompanies,
  getKnowledge,
  getPlatformStats,
  getResearch,
  getSectors,
} from "@/lib/content";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [stats, sectors, companies, research, knowledge, boards] = await Promise.all([
      getPlatformStats(),
      getSectors(),
      getCompanies({ limit: 8 }),
      getResearch(),
      getKnowledge(5),
      getBoards(),
    ]);
    return { stats, sectors, companies, research, knowledge, boards };
  },
  head: () => ({
    meta: [
      { title: "معرفة استثمار | منصة تحليل الشركات والأسواق والاستثمار" },
      {
        name: "description",
        content:
          "منصة عربية متخصصة في تحليل الشركات والقطاعات والأسواق والاقتصاد، مع أبحاث ومحتوى معرفي يساعدك على الاستثمار بفهم لا بتوقع.",
      },
      { property: "og:title", content: "معرفة استثمار — استثمر بفهم، لا بتوقع" },
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
  const { stats, sectors, companies, research, knowledge, boards } = Route.useLoaderData();

  return (
    <PageShell>
      {/* Hero */}
      <section className="night-panel relative isolate overflow-hidden">
        <img
          src={heroSpace}
          alt=""
          width={1920}
          height={900}
          className="absolute inset-0 -z-10 size-full object-cover opacity-60"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-night/70 via-night/45 to-night/90" />
        <div className="chart-grid absolute inset-0 -z-10 opacity-40" />
        <svg
          className="absolute inset-x-0 bottom-0 -z-10 h-40 w-full opacity-40"
          viewBox="0 0 1200 200"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            className="chart-line"
            d="M0,160 L100,140 L200,150 L300,110 L400,125 L500,80 L600,95 L700,60 L800,72 L900,40 L1000,55 L1100,25 L1200,35"
            fill="none"
            stroke="var(--brand)"
            strokeWidth="2"
          />
        </svg>

        <div className="mx-auto max-w-3xl px-4 pb-40 pt-24 text-center sm:px-6 sm:pt-32">
          <h1 className="animate-rise text-4xl font-bold tracking-tight sm:text-6xl">
            {t(ui.heroTitle)}
          </h1>
          <p className="animate-rise mt-5 text-base font-medium text-night-foreground/90 sm:text-lg">
            {t(ui.heroSubtitle)}
          </p>
          <p className="animate-rise mx-auto mt-4 max-w-2xl text-sm leading-8 text-night-foreground/65">
            {t(ui.heroDescription)}
          </p>

          <label className="animate-rise mt-10 flex items-center gap-3 rounded-2xl bg-card px-5 py-4 shadow-panel">
            <Search className="size-5 shrink-0 text-muted-foreground" />
            <input
              type="search"
              placeholder={t(ui.searchPlaceholder)}
              className="w-full bg-transparent text-sm text-card-foreground outline-none placeholder:text-muted-foreground"
            />
            <span className="hidden shrink-0 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground sm:block">
              {t(ui.search)}
            </span>
          </label>
        </div>
      </section>

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
          <SectionHeading title={t(ui.exploreSectors)} to="/sectors" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sectors.map((s) => (
              <SectorCard key={s.slug} sector={s} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeading title={t(ui.discoverCompanies)} to="/companies" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {companies.map((c) => (
              <CompanyCard key={c.slug} company={c} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeading title={t(ui.latestResearch)} to="/research" />
          <div className="grid gap-5 md:grid-cols-3">
            {research.map((r) => (
              <ResearchCard key={r.slug} item={r} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeading title={t(ui.knowledgeLibrary)} to="/knowledge" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {knowledge.map((k) => (
              <KnowledgeCard key={k.slug} item={k} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeading title={t(ui.communityBoards)} to="/community" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {boards.slice(0, 4).map((b) => (
              <Link
                key={b.slug}
                to="/community"
                className="rounded-2xl border border-border/70 bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="text-sm font-bold">{t(b.name)}</div>
                <p className="mt-1.5 text-xs text-muted-foreground">{t(b.description)}</p>
                <div className="mt-4 text-[11px] text-muted-foreground">
                  {b.posts} {t(ui.posts)} · {b.members} {t(ui.members)}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="night-panel relative isolate overflow-hidden rounded-3xl px-6 py-12 sm:px-12">
          <div className="chart-grid absolute inset-0 -z-10 opacity-30" />
          <div className="flex flex-col items-center gap-8 text-center md:flex-row md:justify-between md:text-start">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">{t(ui.ctaTitle)}</h2>
              <p className="mt-3 text-sm text-night-foreground/65">{t(ui.ctaCopy)}</p>
            </div>
            <Link
              to="/companies"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-7 py-3.5 text-sm font-semibold text-brand-foreground transition-transform hover:scale-[1.03]"
            >
              {t(ui.ctaButton)}
              <Arrow />
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
