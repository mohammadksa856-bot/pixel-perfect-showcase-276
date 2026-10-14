import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { getDirectory } from "@/lib/web-v1/catalog.functions";
import { BOARD_TEXT, type Board } from "@/lib/web-v1/catalog";
import {
  MARKET_COPY,
  saudiSummary,
  sectorCoverage,
  UNCLASSIFIED,
  tableSearch,
} from "@/lib/web-v1/markets";
import { TaxonomyLabel } from "@/components/web-v1/display-label";
import { useI18n } from "@/lib/i18n";
import { iso } from "@/lib/bidi";
import { cn } from "@/lib/utils";
import { CompanyCard } from "@/components/web-v1/company-card";
import { PreviewContainer, WebV1Shell } from "@/components/web-v1/shell";
import { SectionTitle } from "@/components/web-v1/primitives";
import { CountTile, MissingState, PageHeader, SourceNote } from "@/components/web-v1/market-parts";

/**
 * WEB-05B: السوق المالية السعودية. السوقان (الرئيسية ونمو) بأعداد من القائمة، والقطاعات الموثقة،
 * والشركات التي لها صفحة بيانات. المؤشرات بلا قيم: لا مصدر أسعار موثق في المعاينة.
 */
export const Route = createFileRoute("/preview/web-v1/markets/saudi/")({
  loader: async () => {
    const d = await getDirectory();
    if (!d) throw notFound();
    return d;
  },
  head: () => ({
    meta: [
      { title: "السوق المالية السعودية | معرفة استثمار" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SaudiMarket,
});

const INDICES = [
  { key: "main", name: { ar: "مؤشر السوق الرئيسية (تاسي)", en: "Main Market index (TASI)" } },
  { key: "nomu", name: { ar: "مؤشر نمو", en: "Nomu index" } },
] as const;

function SaudiMarket() {
  const { entries, source } = Route.useLoaderData();
  const { t } = useI18n();
  const s = saudiSummary(entries);
  const withPages = entries.filter((e) => e.dataStatus === "engine_page");
  return (
    <WebV1Shell>
      <PageHeader
        crumbs={[
          { label: { ar: "الرئيسية", en: "Home" }, to: "/preview/web-v1" },
          { label: { ar: "الأسواق", en: "Markets" }, to: "/preview/web-v1/markets" },
          { label: MARKET_COPY.saudi },
        ]}
        title={t(MARKET_COPY.saudi)}
        description={t({
          ar: "السوق الرئيسية والسوق الموازية (نمو). تصفّح كل سوق في جدول قابل للبحث والتصفية، أو انتقل إلى القطاعات الموثقة.",
          en: "The Main Market and the Parallel Market (Nomu). Browse each board in a searchable, filterable table, or go to the documented sectors.",
        })}
      >
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <CountTile
            label={{ ar: "شركات مدرجة", en: "Listed companies" }}
            value={s.count}
            data="total"
          />
          <CountTile label={BOARD_TEXT.main} value={s.main} data="main" />
          <CountTile label={BOARD_TEXT.nomu} value={s.nomu} data="nomu" />
          <CountTile
            label={{ ar: "لها صفحة بيانات", en: "With a data page" }}
            value={s.withPages}
            hint={{ ar: "من المحرك", en: "from the engine" }}
            data="with-pages"
          />
        </div>
      </PageHeader>

      <PreviewContainer className="space-y-12 py-10">
        <section>
          <SectionTitle
            title={t({ ar: "السوقان", en: "Boards" })}
            hint={t({
              ar: "لكل سوق صفحة بجدول شركاتها كاملًا.",
              en: "Each board has a page with its full company table.",
            })}
          />
          <div className="grid gap-4 md:grid-cols-2">
            {(["main", "nomu"] as Board[]).map((b) => {
              const x = s.boards[b];
              return (
                <Link
                  key={b}
                  to="/preview/web-v1/markets/saudi/$board"
                  params={{ board: b }}
                  search={tableSearch()}
                  className="rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:border-brand/50"
                  data-board-card={b}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className={cn("text-[16px] font-bold", b === "nomu" && "text-tone-violet")}>
                      {t(BOARD_TEXT[b])}
                    </h3>
                    <ArrowUpRight className="size-5 text-brand" />
                  </div>
                  <p className="num mt-3 text-3xl font-bold">{iso(x.count)}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {t({ ar: "شركة مدرجة", en: "listed companies" })}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded-md border border-border px-1.5 py-0.5 text-muted-foreground">
                      {t({
                        ar: `${iso(x.withPages)} لها صفحة بيانات`,
                        en: `${x.withPages} with a data page`,
                      })}
                    </span>
                    <span className="rounded-md border border-border px-1.5 py-0.5 text-muted-foreground">
                      {t({
                        ar: `${iso(x.classified)} مصنّفة قطاعيًا`,
                        en: `${x.classified} with a sector`,
                      })}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section>
          <SectionTitle
            title={t({ ar: "المؤشرات", en: "Indices" })}
            hint={t(MARKET_COPY.noPrices)}
          />
          <div className="grid gap-3 md:grid-cols-2">
            {INDICES.map((i) => (
              <MissingState
                key={i.key}
                data={`index-${i.key}`}
                title={i.name}
                reason={{
                  ar: "القيمة والتغير غير متاحين: لا مصدر أسعار موثق في هذه المعاينة.",
                  en: "Value and change unavailable: no documented price source in this preview.",
                }}
              />
            ))}
          </div>
        </section>

        <section>
          <SectionTitle
            title={t({ ar: "القطاعات في السوق", en: "Sectors in this market" })}
            hint={t(sectorCoverage(s.sectors.classified, s.sectors.total))}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {s.sectors.sectors.map((x) => (
              <Link
                key={x.slug}
                to="/preview/web-v1/sectors/$slug"
                params={{ slug: x.slug }}
                search={tableSearch()}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4 hover:border-brand/50"
                data-sector-card={x.slug}
              >
                <div className="min-w-0">
                  <div className="text-[14px] font-bold break-words">
                    <TaxonomyLabel raw={x.name} />
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {x.industries.map((i, n) => (
                      <span key={i.name}>
                        {n > 0 && " · "}
                        <TaxonomyLabel raw={i.name} />
                      </span>
                    ))}
                  </div>
                </div>
                <span className="num shrink-0 rounded-lg bg-muted px-2 py-1 text-[12px] font-semibold">
                  {iso(x.count)}
                </span>
              </Link>
            ))}
            <Link
              to="/preview/web-v1/sectors/$slug"
              params={{ slug: UNCLASSIFIED }}
              search={tableSearch()}
              className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-4 hover:border-brand/50"
              data-sector-card={UNCLASSIFIED}
            >
              <div className="min-w-0">
                <div className="text-[14px] font-bold">{t(MARKET_COPY.unclassified)}</div>
                <div className="text-[11px] text-muted-foreground">
                  {t({
                    ar: "لا تصنيف قطاعيًا موثقًا لها بعد",
                    en: "No documented sector classification yet",
                  })}
                </div>
              </div>
              <span className="num shrink-0 rounded-lg bg-muted px-2 py-1 text-[12px] font-semibold">
                {iso(s.sectors.unclassified.count)}
              </span>
            </Link>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
            {t(MARKET_COPY.sectorSource)}
          </p>
        </section>

        <section>
          <SectionTitle
            title={t({ ar: "شركات لها صفحة بيانات", en: "Companies with a data page" })}
            hint={t({
              ar: "تفتح على قالب الشركة. البقية مدرجة بلا صفحة بيانات بعد.",
              en: "These open the company template. The rest are listed without a data page yet.",
            })}
          />
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {withPages.map((e) => (
              <li key={e.symbol}>
                <CompanyCard e={e} />
              </li>
            ))}
          </ul>
        </section>

        <SourceNote>
          {t({ ar: "المصدر: ", en: "Source: " })}
          <code dir="ltr">{source.path}</code> · sha256{" "}
          <code dir="ltr">{source.sha256.slice(0, 12)}</code> ·{" "}
          {t({ ar: "آخر تحديث في المستودع ", en: "last updated in repo " })}
          {iso(source.updatedInRepo)}. {t(MARKET_COPY.noPrices)}
        </SourceNote>
      </PreviewContainer>
    </WebV1Shell>
  );
}
