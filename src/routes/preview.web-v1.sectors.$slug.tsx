import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { getDirectory } from "@/lib/web-v1/catalog.functions";
import { BOARD_TEXT } from "@/lib/web-v1/catalog";
import {
  findSector,
  MARKET_COPY,
  parseTableQuery,
  sectorSlug,
  UNCLASSIFIED,
  type TableQuery,
  tableSearch,
} from "@/lib/web-v1/markets";
import { TaxonomyLabel } from "@/components/web-v1/display-label";
import { labelText } from "@/lib/web-v1/display-labels";
import { useI18n } from "@/lib/i18n";
import { iso } from "@/lib/bidi";
import { cn } from "@/lib/utils";
import { PreviewContainer, WebV1Shell } from "@/components/web-v1/shell";
import { CompanyTable } from "@/components/web-v1/company-table";
import { SectionTitle } from "@/components/web-v1/primitives";
import { CountTile, MissingState, PageHeader, SourceNote } from "@/components/web-v1/market-parts";

/**
 * WEB-05B: صفحة القطاع: الصناعات (مرشح)، والتوزيع على السوقين (روابط)، وجدول الشركات إلى صفحاتها.
 * "unclassified" صفحة حالة نقص بيانات قائمة بذاتها؛ والرابط المجهول يعرض حالة "غير موثق" لا صفحة فارغة.
 */
export const Route = createFileRoute("/preview/web-v1/sectors/$slug")({
  validateSearch: (s: Partial<TableQuery>): TableQuery => ({
    ...parseTableQuery(s as Record<string, unknown>),
    sector: "all",
  }),
  loader: async () => {
    const d = await getDirectory();
    if (!d) throw notFound();
    return d;
  },
  head: () => ({
    meta: [{ title: "القطاع | معرفة استثمار" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: SectorPage,
});

function SectorPage() {
  const { entries, source } = Route.useLoaderData();
  const { slug } = Route.useParams();
  const query = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { t, locale } = useI18n();
  const found = findSector(entries, slug);
  const crumbs = [
    { label: { ar: "الرئيسية", en: "Home" }, to: "/preview/web-v1" },
    { label: { ar: "القطاعات", en: "Sectors" }, to: "/preview/web-v1/sectors" },
  ];
  const onChange = (patch: Partial<TableQuery>) =>
    navigate({
      search: (prev: TableQuery) => ({ ...prev, ...patch }),
      replace: true,
      resetScroll: false,
    });

  if (!found)
    return (
      <WebV1Shell>
        <PageHeader
          crumbs={[...crumbs, { label: { ar: "غير موثق", en: "Not documented" } }]}
          title={t({ ar: "قطاع غير موثق", en: "Sector not documented" })}
        />
        <PreviewContainer className="py-10">
          <div data-sector-page="not_documented" />
          <MissingState
            data="sector"
            title={{
              ar: "لا قطاع بهذا الرابط في المصدر",
              en: "No sector with this link in the source",
            }}
            reason={MARKET_COPY.sectorSource}
          />
          <Link
            to="/preview/web-v1/sectors"
            search={{ q: "" }}
            className="mt-4 inline-block text-[13px] text-brand hover:underline"
          >
            {t({ ar: "كل القطاعات الموثقة", en: "All documented sectors" })}
          </Link>
        </PreviewContainer>
      </WebV1Shell>
    );

  const isSector = found.kind === "sector";
  const name = isSector ? found.sector.name : t(MARKET_COPY.unclassified);
  const summary = isSector ? found.sector : found.summary;
  const list = entries.filter((e) =>
    isSector ? e.sector && sectorSlug(e.sector) === slug : !e.sector,
  );

  return (
    <WebV1Shell>
      <PageHeader
        crumbs={[
          ...crumbs,
          { label: isSector ? { ar: labelText(name, "ar"), en: name } : { ar: name, en: name } },
        ]}
        title={isSector ? labelText(name, locale) : name}
        titleDir={isSector ? "auto" : undefined}
        description={t(
          isSector
            ? {
                ar: "قطاع بحسب تصنيف المحرك، بالتسمية الإنجليزية كما وردت في المصدر.",
                en: "A sector per the engine classification, with the English label as given in the source.",
              }
            : {
                ar: "شركات مدرجة لا تصنيف قطاعيًا موثقًا لها في المصادر الحالية. لا تُنسب إلى قطاع حتى يتوفر مصدر.",
                en: "Listed companies with no documented sector classification in the current sources. They are not assigned a sector until a source exists.",
              },
        )}
      >
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CountTile label={{ ar: "شركات", en: "Companies" }} value={summary.count} data="count" />
          <CountTile label={BOARD_TEXT.main} value={summary.main} data="main" />
          <CountTile label={BOARD_TEXT.nomu} value={summary.nomu} data="nomu" />
          <CountTile
            label={{ ar: "لها صفحة بيانات", en: "With a data page" }}
            value={summary.withPages}
            data="with-pages"
          />
        </div>
      </PageHeader>

      <PreviewContainer className="space-y-10 py-8">
        <div data-sector-page={found.kind} hidden />
        {isSector && (
          <section>
            <SectionTitle
              title={t({ ar: "الصناعات", en: "Industries" })}
              hint={t({
                ar: "اختر صناعة لتصفية جدول الشركات.",
                en: "Pick an industry to filter the company table.",
              })}
            />
            <div className="flex flex-wrap gap-2" data-industries>
              {[{ name: "all", count: found.sector.count }, ...found.sector.industries].map((i) => (
                <button
                  key={i.name}
                  type="button"
                  onClick={() => onChange({ industry: i.name, page: 1 })}
                  aria-pressed={query.industry === i.name}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px]",
                    query.industry === i.name
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-border hover:bg-muted",
                  )}
                  data-industry={i.name}
                >
                  <span dir="auto">
                    {i.name === "all" ? (
                      t({ ar: "كل الصناعات", en: "All industries" })
                    ) : (
                      <TaxonomyLabel raw={i.name} />
                    )}
                  </span>
                  <span className="num opacity-70">{iso(i.count)}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionTitle
            title={t({ ar: "حسب السوق", en: "By board" })}
            hint={t({
              ar: "انتقل إلى صفحة السوق لتصفّح كل شركاته.",
              en: "Go to the board page to browse all its companies.",
            })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {(["main", "nomu"] as const).map((b) => (
              <div
                key={b}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4"
                data-sector-board={b}
              >
                <div>
                  <Link
                    to="/preview/web-v1/markets/saudi/$board"
                    params={{ board: b }}
                    search={tableSearch({ sector: isSector ? slug : UNCLASSIFIED })}
                    className="text-[14px] font-bold hover:text-brand"
                    data-board-link={b}
                  >
                    {t(BOARD_TEXT[b])}
                  </Link>
                  <div className="text-[11px] text-muted-foreground">
                    {t({
                      ar: "في صفحة السوق، مصفّاة على هذا القطاع",
                      en: "On the board page, filtered to this sector",
                    })}
                  </div>
                </div>
                <span className="num rounded-lg bg-muted px-2 py-1 text-[13px] font-semibold">
                  {iso(summary[b])}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle title={t({ ar: "الشركات", en: "Companies" })} />
          <CompanyTable
            entries={list}
            query={query}
            onChange={onChange}
            show={{ board: true }}
            emptyHint={{
              ar: "لا شركات بهذه المرشحات في هذا القطاع. أزل بعض المرشحات.",
              en: "No companies in this sector with these filters. Remove some filters.",
            }}
          />
        </section>

        <MissingState
          data="sector-stats"
          title={{ ar: "إحصاءات القطاع وأداؤه", en: "Sector statistics and performance" }}
          reason={MARKET_COPY.noSectorStats}
        />

        <SourceNote>
          {t(MARKET_COPY.sectorSource)} {t({ ar: "قائمة الشركات: ", en: "Company list: " })}
          <code dir="ltr">{source.path}</code> · sha256{" "}
          <code dir="ltr">{source.sha256.slice(0, 12)}</code> ·{" "}
          {t({ ar: "آخر تحديث في المستودع ", en: "last updated in repo " })}
          {iso(source.updatedInRepo)}.
        </SourceNote>
      </PreviewContainer>
    </WebV1Shell>
  );
}
