import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowUpRight, Search, X } from "lucide-react";
import { getDirectory } from "@/lib/web-v1/catalog.functions";
import { BOARD_TEXT, normalize } from "@/lib/web-v1/catalog";
import {
  MARKET_COPY,
  sectorCoverage,
  sectorIndex,
  UNCLASSIFIED,
  tableSearch,
} from "@/lib/web-v1/markets";
import { useI18n } from "@/lib/i18n";
import { iso } from "@/lib/bidi";
import { PreviewContainer, WebV1Shell } from "@/components/web-v1/shell";
import { CountTile, MissingState, PageHeader, SourceNote } from "@/components/web-v1/market-parts";

/**
 * WEB-05B: دليل القطاعات. القطاعات الموثقة فقط (من صفحات المحرك)، وبطاقة صريحة لغير المصنّف.
 * لا إحصاءات قطاعية ولا متوسطات أداء: لا بيانات قطاعية مجمّعة في المحرك بعد.
 */
export const Route = createFileRoute("/preview/web-v1/sectors/")({
  validateSearch: (s: { q?: unknown }): { q: string } => ({
    q: typeof s.q === "string" ? s.q.slice(0, 80) : "",
  }),
  loader: async () => {
    const d = await getDirectory();
    if (!d) throw notFound();
    return d;
  },
  head: () => ({
    meta: [{ title: "القطاعات | معرفة استثمار" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: SectorsIndex,
});

function SectorsIndex() {
  const { entries, source } = Route.useLoaderData();
  const { q: initial } = Route.useSearch();
  const { t } = useI18n();
  const [q, setQ] = useState(initial);
  const idx = sectorIndex(entries);
  const nq = normalize(q);
  const shown = nq
    ? idx.sectors.filter((s) =>
        [s.name, ...s.industries.map((i) => i.name)].some((n) => normalize(n).includes(nq)),
      )
    : idx.sectors;
  return (
    <WebV1Shell>
      <PageHeader
        crumbs={[
          { label: { ar: "الرئيسية", en: "Home" }, to: "/preview/web-v1" },
          { label: { ar: "القطاعات", en: "Sectors" } },
        ]}
        title={t({ ar: "القطاعات", en: "Sectors" })}
        description={t({
          ar: "القطاعات التي لها تصنيف موثق، ومن كل قطاع إلى صناعاته وشركاته وأسواقها. الشركات بلا تصنيف موثق مجمّعة في صفحة مستقلة ولا تُنسب إلى قطاع بالتخمين.",
          en: "Sectors with a documented classification, and from each sector to its industries, companies and boards. Companies without a documented classification are grouped on their own page and never assigned a sector by guesswork.",
        })}
      >
        <div className="mt-6 grid grid-cols-3 gap-3 sm:max-w-xl">
          <CountTile
            label={{ ar: "قطاعات موثقة", en: "Documented sectors" }}
            value={idx.sectors.length}
            data="sectors"
          />
          <CountTile
            label={{ ar: "شركات مصنّفة", en: "Classified companies" }}
            value={idx.classified}
            data="classified"
          />
          <CountTile
            label={MARKET_COPY.unclassified}
            value={idx.unclassified.count}
            data="unclassified"
          />
        </div>
        <p className="mt-3 text-[12px] text-night-foreground/60" data-sector-coverage>
          {t(sectorCoverage(idx.classified, idx.total))}
        </p>
      </PageHeader>

      <PreviewContainer className="py-8">
        <label className="flex h-11 max-w-md items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 focus-within:border-brand/60">
          <Search className="size-4 shrink-0 text-brand" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t({
              ar: "ابحث باسم القطاع أو الصناعة كما في المصدر (بالإنجليزية)",
              en: "Search sector or industry as named in the source",
            })}
            className="h-full w-full min-w-0 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
            aria-label={t({ ar: "بحث في القطاعات", en: "Search sectors" })}
            data-sector-input
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label={t({ ar: "مسح", en: "Clear" })}
            >
              <X className="size-4 text-muted-foreground" />
            </button>
          )}
        </label>

        {shown.length === 0 ? (
          <div
            className="mt-5 rounded-2xl border border-dashed border-border p-10 text-center"
            data-sectors-empty
          >
            <p className="text-[14px] font-semibold">
              {t({ ar: "لا قطاع موثق بهذا الاسم", en: "No documented sector by that name" })}
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {t({
                ar: "أسماء القطاعات بالإنجليزية كما في المصدر (مثل Financials). قد تكون الشركة غير مصنّفة بعد.",
                en: "Sector names are in English as in the source (e.g. Financials). The company may not be classified yet.",
              })}
            </p>
          </div>
        ) : (
          <>
            {/* سطح المكتب: جدول */}
            <div className="mt-5 hidden overflow-hidden rounded-2xl border border-border/70 bg-card md:block">
              <table className="w-full text-[13px]" data-sectors-table>
                <thead className="bg-muted/50 text-[11px] text-muted-foreground">
                  <tr>
                    {[
                      { ar: "القطاع (المصدر)", en: "Sector (source)" },
                      { ar: "الصناعات", en: "Industries" },
                      { ar: "الشركات", en: "Companies" },
                      BOARD_TEXT.main,
                      { ar: "نمو", en: "Nomu" },
                      { ar: "لها صفحة بيانات", en: "With a data page" },
                    ].map((h) => (
                      <th key={h.en} className="px-3 py-2.5 text-start font-semibold">
                        {t(h)}
                      </th>
                    ))}
                    <th className="px-3 py-2.5">
                      <span className="sr-only">{t({ ar: "فتح", en: "Open" })}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((s) => (
                    <tr key={s.slug} className="border-t border-border/60" data-sector-row={s.slug}>
                      <td className="px-3 py-3 font-bold" dir="auto">
                        <Link
                          to="/preview/web-v1/sectors/$slug"
                          params={{ slug: s.slug }}
                          search={tableSearch()}
                          className="hover:text-brand"
                        >
                          {s.name}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground" dir="auto">
                        {s.industries.map((i) => `${i.name} (${i.count})`).join(" · ")}
                      </td>
                      <td className="num px-3 py-3 font-semibold">{iso(s.count)}</td>
                      <td className="num px-3 py-3">{iso(s.main)}</td>
                      <td className="num px-3 py-3">{iso(s.nomu)}</td>
                      <td className="num px-3 py-3">{iso(s.withPages)}</td>
                      <td className="px-3 py-3 text-end">
                        <Link
                          to="/preview/web-v1/sectors/$slug"
                          params={{ slug: s.slug }}
                          search={tableSearch()}
                          aria-label={s.name}
                        >
                          <ArrowUpRight className="size-4 text-brand" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* الجوال: بطاقات */}
            <ul className="mt-5 grid gap-3 md:hidden" data-sectors-mobile>
              {shown.map((s) => (
                <li key={s.slug}>
                  <Link
                    to="/preview/web-v1/sectors/$slug"
                    params={{ slug: s.slug }}
                    search={tableSearch()}
                    className="block rounded-2xl border border-border/70 bg-card p-4"
                    data-sector-card={s.slug}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[15px] font-bold" dir="auto">
                        {s.name}
                      </span>
                      <span className="num rounded-lg bg-muted px-2 py-0.5 text-[12px] font-semibold">
                        {iso(s.count)}
                      </span>
                    </div>
                    <div className="mt-1 text-[12px] text-muted-foreground" dir="auto">
                      {s.industries.map((i) => i.name).join(" · ")}
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      {t({
                        ar: `الرئيسية ${iso(s.main)} · نمو ${iso(s.nomu)} · صفحات بيانات ${iso(s.withPages)}`,
                        en: `Main ${s.main} · Nomu ${s.nomu} · data pages ${s.withPages}`,
                      })}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <Link
          to="/preview/web-v1/sectors/$slug"
          params={{ slug: UNCLASSIFIED }}
          search={tableSearch()}
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-4 hover:border-brand/50"
          data-sector-card={UNCLASSIFIED}
        >
          <div>
            <div className="text-[14px] font-bold">{t(MARKET_COPY.unclassified)}</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">
              {t({
                ar: `${iso(idx.unclassified.count)} شركة (الرئيسية ${iso(idx.unclassified.main)}، نمو ${iso(idx.unclassified.nomu)}) بلا تصنيف قطاعي موثق في المصادر الحالية.`,
                en: `${idx.unclassified.count} companies (Main ${idx.unclassified.main}, Nomu ${idx.unclassified.nomu}) with no documented sector classification in the current sources.`,
              })}
            </div>
          </div>
          <ArrowUpRight className="size-5 shrink-0 text-brand" />
        </Link>

        <MissingState
          className="mt-6"
          data="sector-stats"
          title={{ ar: "إحصاءات القطاعات وأداؤها", en: "Sector statistics and performance" }}
          reason={MARKET_COPY.noSectorStats}
        />

        <SourceNote>
          {t(MARKET_COPY.sectorSource)} {t({ ar: "قائمة الشركات: ", en: "Company list: " })}
          <code dir="ltr">{source.path}</code> · sha256{" "}
          <code dir="ltr">{source.sha256.slice(0, 12)}</code>.
        </SourceNote>
      </PreviewContainer>
    </WebV1Shell>
  );
}
