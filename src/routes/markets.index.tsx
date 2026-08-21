import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Landmark } from "lucide-react";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { ui, useI18n } from "@/lib/i18n";
import { getCompanies } from "@/lib/content";

export const Route = createFileRoute("/markets/")({
  loader: async () => {
    const companies = await getCompanies();
    const saudiCount = companies.filter(
      (c) => c.exchange === "تداول" || c.exchange === "نمو",
    ).length;
    const usCount = companies.length - saudiCount;
    return { saudiCount, usCount };
  },
  head: () => ({
    meta: [
      { title: "الأسواق | معرفة استثمار" },
      {
        name: "description",
        content: "تصفّح الشركات حسب السوق المُدرجة فيه — السوق السعودي والسوق الأمريكي.",
      },
    ],
  }),
  component: MarketsIndexPage,
});

const MARKET_CARDS = [
  {
    slug: "saudi",
    tone: "tone-emerald",
    title: { ar: "السوق السعودي", en: "Saudi Market" },
    tagline: { ar: "تاسي ونمو", en: "TASI & Nomu" },
  },
  {
    slug: "us",
    tone: "tone-sky",
    title: { ar: "السوق الأمريكي", en: "US Market" },
    tagline: { ar: "ناسداك ونيويورك", en: "NASDAQ & NYSE" },
  },
] as const;

function MarketsIndexPage() {
  const { t } = useI18n();
  const { saudiCount, usCount } = Route.useLoaderData();
  const counts: Record<(typeof MARKET_CARDS)[number]["slug"], number> = {
    saudi: saudiCount,
    us: usCount,
  };

  return (
    <PageShell>
      <Container>
        <nav className="flex items-center gap-1.5 pt-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            {t(ui.home)}
          </Link>
          <ChevronLeft className="size-3.5 rtl:rotate-180" />
          <span className="text-foreground">{t(ui.markets)}</span>
        </nav>
      </Container>

      <PageHero
        eyebrow={t(ui.markets)}
        title={t({ ar: "استكشف الأسواق", en: "Explore markets" })}
        description={t({
          ar: "كل سوق له مؤشراته وشركاته الخاصة — اختر السوق اللي يهمك.",
          en: "Each market has its own indices and listed companies — pick the one you're after.",
        })}
      />

      <Container>
        <div className="grid gap-4 sm:grid-cols-2">
          {MARKET_CARDS.map((market) => (
            <Link
              key={market.slug}
              to={market.slug === "saudi" ? "/markets/saudi" : "/markets/us"}
              className="group flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-foreground/15 hover:shadow-lift"
            >
              <span
                className="flex size-12 shrink-0 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: `color-mix(in oklch, var(--${market.tone}) 14%, transparent)`,
                }}
              >
                <Landmark
                  className="size-6"
                  style={{ color: `var(--${market.tone})` }}
                  strokeWidth={1.8}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{t(market.title)}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {t(market.tagline)}
                </span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                {counts[market.slug]} {t(ui.statCompanies)}
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </PageShell>
  );
}
