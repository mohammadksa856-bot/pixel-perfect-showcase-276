import { createFileRoute, notFound } from "@tanstack/react-router";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { getMarket } from "@/data/markets";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/markets/$slug")({
  loader: ({ params }) => {
    const market = getMarket(params.slug);
    if (!market) throw notFound();
    return market;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? ""} | معرفة استثمار` },
      {
        name: "description",
        content: "نظرة عامة على أداء المؤشر وحالته الحالية.",
      },
    ],
  }),
  component: MarketPage,
});

function MarketPage() {
  const market = Route.useLoaderData();
  const { t } = useI18n();
  const positive = market.change.startsWith("+");
  const negative = market.change.startsWith("-");

  return (
    <PageShell>
      <PageHero
        eyebrow={market.symbol}
        title={market.name}
        description={t({
          ar: "نظرة عامة على أداء المؤشر. بيانات هذه الصفحة تجريبية حالياً وتحتاج ربطها بمصدر أسعار مباشر قبل الإطلاق.",
          en: "An overview of the index's performance. This page currently uses placeholder data and needs a live pricing feed before launch.",
        })}
      />
      <Container>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-card p-6">
            <div className="text-xs text-muted-foreground">
              {t({ ar: "القيمة الحالية", en: "Current value" })}
            </div>
            <div className="mt-2 text-3xl font-bold tracking-tight">{market.value}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card p-6">
            <div className="text-xs text-muted-foreground">
              {t({ ar: "التغيّر", en: "Change" })}
            </div>
            <div
              className={cn(
                "mt-2 text-3xl font-bold tracking-tight",
                positive && "text-tone-emerald",
                negative && "text-tone-rose",
                !positive && !negative && "text-tone-sky",
              )}
            >
              {market.change}
            </div>
          </div>
        </div>
      </Container>
    </PageShell>
  );
}
