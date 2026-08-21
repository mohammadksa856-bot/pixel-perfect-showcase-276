import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { MarketCard } from "@/components/cards";
import { ui, useI18n } from "@/lib/i18n";
import { getMarketCounts } from "@/lib/content";

export const Route = createFileRoute("/markets/")({
  loader: async () => getMarketCounts(),
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

function MarketsIndexPage() {
  const { t } = useI18n();
  const { saudi, us } = Route.useLoaderData();

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
        title={t(ui.exploreMarkets)}
        description={t({
          ar: "كل سوق له مؤشراته وشركاته الخاصة — اختر السوق اللي يهمك.",
          en: "Each market has its own indices and listed companies — pick the one you're after.",
        })}
      />

      <Container>
        <div className="grid gap-4 sm:grid-cols-2">
          <MarketCard
            to="/markets/saudi"
            tone="tone-emerald"
            title={t({ ar: "السوق السعودي", en: "Saudi Market" })}
            tagline={t({ ar: "تاسي ونمو", en: "TASI & Nomu" })}
            count={saudi}
          />
          <MarketCard
            to="/markets/us"
            tone="tone-sky"
            title={t({ ar: "السوق الأمريكي", en: "US Market" })}
            tagline={t({ ar: "ناسداك ونيويورك", en: "NASDAQ & NYSE" })}
            count={us}
          />
        </div>
      </Container>
    </PageShell>
  );
}
