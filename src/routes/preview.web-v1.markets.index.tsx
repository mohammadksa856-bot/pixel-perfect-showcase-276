import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowUpRight, Globe2 } from "lucide-react";
import { getDirectory } from "@/lib/web-v1/catalog.functions";
import { BOARD_TEXT } from "@/lib/web-v1/catalog";
import { MARKET_COPY, saudiSummary } from "@/lib/web-v1/markets";
import { useI18n } from "@/lib/i18n";
import { iso } from "@/lib/bidi";
import { PreviewContainer, WebV1Shell } from "@/components/web-v1/shell";
import { MissingState, PageHeader, SourceNote } from "@/components/web-v1/market-parts";

/**
 * WEB-05B: دليل الأسواق. يحافظ على بنية الموقع الحالية (السوق السعودية والسوق الأمريكية)؛
 * السوق السعودية مغطاة بقائمة السوق المالية، والأمريكية خارج مصادر هذه المعاينة فتُعلن كذلك.
 */
export const Route = createFileRoute("/preview/web-v1/markets/")({
  loader: async () => {
    const d = await getDirectory();
    if (!d) throw notFound();
    return d;
  },
  head: () => ({
    meta: [{ title: "الأسواق | معرفة استثمار" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: MarketsIndex,
});

function MarketsIndex() {
  const { entries, source } = Route.useLoaderData();
  const { t } = useI18n();
  const s = saudiSummary(entries);
  return (
    <WebV1Shell>
      <PageHeader
        crumbs={[
          { label: { ar: "الرئيسية", en: "Home" }, to: "/preview/web-v1" },
          { label: { ar: "الأسواق", en: "Markets" } },
        ]}
        title={t({ ar: "الأسواق", en: "Markets" })}
        description={t({
          ar: "اختر السوق، ثم السوق الفرعية أو القطاع، ثم الشركة. الأعداد محسوبة من قائمة الشركات المدرجة؛ لا أسعار في هذه الصفحات.",
          en: "Pick a market, then a board or sector, then a company. Counts come from the listed-company list; there are no prices on these pages.",
        })}
      />
      <PreviewContainer className="py-8">
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            to="/preview/web-v1/markets/saudi"
            className="group rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:border-brand/50"
            data-market-card="saudi"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-medium text-brand">
                  {t({ ar: "مغطاة في المعاينة", en: "Covered in this preview" })}
                </div>
                <h2 className="mt-1 text-lg font-bold">{t(MARKET_COPY.saudi)}</h2>
              </div>
              <ArrowUpRight className="size-5 text-brand" />
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              {(
                [
                  [{ ar: "الشركات", en: "Companies" }, s.count, "total"],
                  [BOARD_TEXT.main, s.main, "main"],
                  [{ ar: "نمو", en: "Nomu" }, s.nomu, "nomu"],
                ] as const
              ).map(([label, n, k]) => (
                <div key={k} className="rounded-xl bg-muted/50 p-2.5" data-market-count={k}>
                  <dt className="text-[11px] text-muted-foreground">{t(label)}</dt>
                  <dd className="num mt-0.5 text-lg font-bold">{iso(n)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[12px] text-muted-foreground">
              {t({
                ar: `${iso(s.withPages)} منها لها صفحة بيانات من المحرك.`,
                en: `${s.withPages} of them have an engine data page.`,
              })}
            </p>
          </Link>

          <div
            className="rounded-2xl border border-dashed border-border bg-card/60 p-5"
            data-market-card="us"
            data-market-state="not_covered"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-medium text-muted-foreground">
                  {t({ ar: "غير مشمولة في المعاينة", en: "Not covered in this preview" })}
                </div>
                <h2 className="mt-1 text-lg font-bold">
                  {t({ ar: "السوق الأمريكية", en: "US market" })}
                </h2>
              </div>
              <Globe2 className="size-5 text-muted-foreground" />
            </div>
            <p className="mt-4 text-[12px] leading-5 text-muted-foreground">
              {t({
                ar: "مكانها محفوظ في بنية الأسواق، وصفحة الموقع الحالية باقية كما هي. لا قائمة شركات موثقة لها في مصادر هذه المعاينة، فلا أعداد ولا شركات هنا.",
                en: "Its place in the markets structure is kept, and the current site page stays as is. There is no documented company list for it in this preview's sources, so no counts or companies here.",
              })}
            </p>
          </div>
        </div>

        <MissingState
          className="mt-6"
          data="prices"
          title={{ ar: "المؤشرات والأسعار", en: "Indices and prices" }}
          reason={MARKET_COPY.noPrices}
        />

        <SourceNote>
          {t({ ar: "المصدر: ", en: "Source: " })}
          <code dir="ltr">{source.path}</code> · sha256{" "}
          <code dir="ltr">{source.sha256.slice(0, 12)}</code> ·{" "}
          {t({ ar: "آخر تحديث في المستودع ", en: "last updated in repo " })}
          {iso(source.updatedInRepo)}.
        </SourceNote>
      </PreviewContainer>
    </WebV1Shell>
  );
}
