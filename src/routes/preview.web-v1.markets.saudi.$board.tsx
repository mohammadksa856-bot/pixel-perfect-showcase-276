import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { getDirectory } from "@/lib/web-v1/catalog.functions";
import { BOARD_TEXT, type Board } from "@/lib/web-v1/catalog";
import {
  boardSummary,
  MARKET_COPY,
  parseTableQuery,
  sectorCoverage,
  type TableQuery,
  tableSearch,
} from "@/lib/web-v1/markets";
import { useI18n } from "@/lib/i18n";
import { iso } from "@/lib/bidi";
import { cn } from "@/lib/utils";
import { PreviewContainer, WebV1Shell } from "@/components/web-v1/shell";
import { CompanyTable } from "@/components/web-v1/company-table";
import { CountTile, MissingState, PageHeader, SourceNote } from "@/components/web-v1/market-parts";

/**
 * WEB-05B: صفحة السوق الرئيسية أو نمو: جدول كل شركات السوق ببحث وتصفية (القطاع الموثق، توفر البيانات)
 * وترتيب وصفحات، كلها في عنوان الصفحة. روابط إلى القطاع وصفحة الشركة.
 */
const BOARDS = ["main", "nomu"] as const;

export const Route = createFileRoute("/preview/web-v1/markets/saudi/$board")({
  validateSearch: (s: Partial<TableQuery>): TableQuery => ({
    ...parseTableQuery(s as Record<string, unknown>),
    board: "all",
  }),
  loader: async ({ params }) => {
    if (!BOARDS.includes(params.board as Board)) throw notFound();
    const d = await getDirectory();
    if (!d) throw notFound();
    return d;
  },
  head: ({ params }) => ({
    meta: [
      {
        title: `${params.board === "nomu" ? "نمو (السوق الموازية)" : "السوق الرئيسية"} | معرفة استثمار`,
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BoardPage,
});

function BoardPage() {
  const { entries, source } = Route.useLoaderData();
  const { board: raw } = Route.useParams();
  const board = raw as Board;
  const query = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { t } = useI18n();
  const list = entries.filter((e) => e.board === board);
  const s = boardSummary(entries, board);
  const other: Board = board === "main" ? "nomu" : "main";
  return (
    <WebV1Shell>
      <PageHeader
        crumbs={[
          { label: { ar: "الرئيسية", en: "Home" }, to: "/preview/web-v1" },
          { label: { ar: "الأسواق", en: "Markets" }, to: "/preview/web-v1/markets" },
          { label: MARKET_COPY.saudi, to: "/preview/web-v1/markets/saudi" },
          { label: BOARD_TEXT[board] },
        ]}
        title={t(BOARD_TEXT[board])}
        description={t({
          ar: `${iso(s.count)} شركة مدرجة في ${BOARD_TEXT[board].ar} بحسب قائمة السوق المالية السعودية.`,
          en: `${s.count} companies listed on the ${BOARD_TEXT[board].en}, per the Saudi Exchange list.`,
        })}
      >
        <div className="mt-5 flex flex-wrap gap-2" role="tablist" data-board-tabs>
          {BOARDS.map((b) => (
            <Link
              key={b}
              to="/preview/web-v1/markets/saudi/$board"
              params={{ board: b }}
              search={tableSearch()}
              role="tab"
              aria-selected={b === board}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-[12px]",
                b === board
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-night-foreground/15 text-night-foreground/75 hover:bg-night-foreground/5",
              )}
              data-board-tab={b}
            >
              {t(BOARD_TEXT[b])}
            </Link>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 sm:max-w-xl">
          <CountTile label={{ ar: "شركات", en: "Companies" }} value={s.count} data="count" />
          <CountTile
            label={{ ar: "لها صفحة بيانات", en: "With a data page" }}
            value={s.withPages}
            data="with-pages"
          />
          <CountTile
            label={{ ar: "مصنّفة قطاعيًا", en: "With a sector" }}
            value={s.classified}
            data="classified"
          />
        </div>
      </PageHeader>

      <PreviewContainer className="py-8">
        <p className="mb-4 text-[12px] text-muted-foreground" data-sector-coverage>
          {t(sectorCoverage(s.classified, s.count))}
        </p>
        <CompanyTable
          entries={list}
          query={query}
          onChange={(patch) =>
            navigate({
              search: (prev: TableQuery) => ({ ...prev, ...patch }),
              replace: true,
              resetScroll: false,
            })
          }
          show={{ sector: true }}
          sectors={s.sectors}
        />
        <MissingState
          className="mt-8"
          data="prices"
          title={{ ar: "الأسعار والقيم السوقية", en: "Prices and market caps" }}
          reason={MARKET_COPY.noPrices}
        />
        <p className="mt-6 text-[12px]">
          <Link
            to="/preview/web-v1/markets/saudi/$board"
            params={{ board: other }}
            search={tableSearch()}
            className="text-brand hover:underline"
            data-other-board
          >
            {t({ ar: "انتقل إلى ", en: "Go to " })}
            {t(BOARD_TEXT[other])}
          </Link>
        </p>
        <SourceNote>
          {t({ ar: "المصدر: ", en: "Source: " })}
          <code dir="ltr">{source.path}</code> · sha256{" "}
          <code dir="ltr">{source.sha256.slice(0, 12)}</code> ·{" "}
          {t({ ar: "آخر تحديث في المستودع ", en: "last updated in repo " })}
          {iso(source.updatedInRepo)}. {t(MARKET_COPY.sectorSource)}
        </SourceNote>
      </PreviewContainer>
    </WebV1Shell>
  );
}
