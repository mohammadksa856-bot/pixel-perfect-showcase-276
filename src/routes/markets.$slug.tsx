import { createFileRoute, notFound } from "@tanstack/react-router";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { getMarketIdentity } from "@/data/market-identities";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/markets/$slug")({
  loader: ({ params }) => {
    const market = getMarketIdentity(params.slug);
    if (!market) throw notFound();
    // Serialize identity only, never the fixture's value or change.
    return { name: market.name, symbol: market.symbol };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? ""} | معرفة استثمار` },
      { name: "description", content: "صفحة تعريف السوق. الأسعار غير متاحة دون مصدر مؤرخ." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MarketPage,
});

function MarketPage() {
  const market = Route.useLoaderData();
  const { t } = useI18n();
  return (
    <PageShell>
      <PageHero
        eyebrow={market.symbol}
        title={market.name}
        description={t({
          ar: "بيانات السوق غير متاحة حاليًا.",
          en: "Market data is currently unavailable.",
        })}
      />
      <Container>
        <div
          className="rounded-2xl border border-border/70 bg-card p-6 text-sm leading-7 text-muted-foreground"
          data-content-status="unavailable"
        >
          {t({
            ar: "لا يتوفر مصدر أسعار مرتبط بتوقيت تحديث موثق لهذا السوق. أُخفيت القيمة ونسبة التغير بدلًا من عرض أرقام تجريبية.",
            en: "A timestamped price source is not connected for this market. The value and change are hidden rather than replaced with demo numbers.",
          })}
        </div>
      </Container>
    </PageShell>
  );
}
