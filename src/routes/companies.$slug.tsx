import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { CalendarDays, ChevronLeft, ExternalLink, Info, MessagesSquare } from "lucide-react";
import { PageShell, Container } from "@/components/page-shell";
import { CompanyCard, Panel, ResearchCard, SectionHeading } from "@/components/cards";
import { ui, useI18n } from "@/lib/i18n";
import { getCompany, getRelatedCompanies, getResearch, getSector } from "@/lib/content";
import type { Company } from "@/data/types";
import { cn } from "@/lib/utils";
import { WatchlistButton } from "@/components/watchlist-button";

export const Route = createFileRoute("/companies/$slug")({
  loader: async ({ params }) => {
    const company = await getCompany(params.slug);
    if (!company) throw notFound();
    const [sector, related, research] = await Promise.all([
      getSector(company.sectorSlug),
      getRelatedCompanies(company),
      getResearch({ sectorSlug: company.sectorSlug, limit: 2 }),
    ]);
    return { company, sector, related, research };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "الشركة غير موجودة | معرفة استثمار" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { company } = loaderData;
    const title = `${company.name.ar} (${company.ticker}) | معرفة استثمار`;
    return {
      meta: [
        { title },
        { name: "description", content: company.description.ar.slice(0, 155) },
        { property: "og:title", content: title },
        { property: "og:description", content: company.short.ar },
      ],
    };
  },
  component: CompanyPage,
});

function CompanyPage() {
  const { company, sector, related, research } = Route.useLoaderData() as {
    company: Company;
    sector: Awaited<ReturnType<typeof getSector>>;
    related: Awaited<ReturnType<typeof getRelatedCompanies>>;
    research: Awaited<ReturnType<typeof getResearch>>;
  };
  const { t } = useI18n();

  const facts: { label: (typeof ui)["price"]; value: string; sectorLink: string | undefined }[] = [
    { label: ui.price, value: company.price, sectorLink: undefined },
    { label: ui.marketCap, value: company.marketCap, sectorLink: undefined },
    { label: ui.exchange, value: company.exchange, sectorLink: undefined },
    {
      label: ui.sector,
      value: sector ? t(sector.name) : "—",
      sectorLink: sector?.slug,
    },
    { label: ui.country, value: t(company.country), sectorLink: undefined },
  ];

  return (
    <PageShell>
      <Container>
        <nav className="flex items-center gap-1.5 pt-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            {t(ui.home)}
          </Link>
          <ChevronLeft className="size-3.5 rtl:rotate-180" />
          <Link to="/companies" className="hover:text-foreground">
            {t(ui.companies)}
          </Link>
          <ChevronLeft className="size-3.5 rtl:rotate-180" />
          <span className="text-foreground">{t(company.name)}</span>
        </nav>
      </Container>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-tone-amber/30 bg-tone-amber/10 px-4 py-3 text-xs leading-6">
          <Info className="mt-0.5 size-3.5 shrink-0 text-tone-amber" />
          <span>
            {t({
              ar: "الأرقام والبيانات بهذه الصفحة تجريبية حالياً لأغراض العرض، وستُربط بمصدر بيانات مباشر لاحقاً.",
              en: "The figures on this page are currently placeholder data for demonstration, and will be connected to a live data source later.",
            })}
          </span>
        </div>
      </div>

      <section className="night-panel relative isolate mt-6 overflow-hidden border-b border-border/40">
        <div className="chart-grid absolute inset-0 -z-10 opacity-30" />
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-center gap-5">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-night-foreground/10 text-sm font-bold">
              {company.ticker}
            </span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t(company.name)}</h1>
              <p className="mt-2 text-sm text-night-foreground/60">
                {company.exchange} · {company.ticker} · {t(company.country)}
              </p>
            </div>
            <span
              className={cn(
                "ms-auto rounded-full px-4 py-2 text-sm font-semibold",
                company.change.startsWith("-")
                  ? "bg-tone-rose/15 text-tone-rose"
                  : "bg-brand/15 text-brand",
              )}
            >
              {company.price} · {company.change}
            </span>
          </div>

          <p className="mt-6 max-w-3xl text-sm leading-8 text-night-foreground/70">
            {t(company.description)}
          </p>

          <div className="mt-6">
            <WatchlistButton companyId={company.id} />
          </div>

          <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-night-foreground/10 sm:grid-cols-5">
            {facts.map((f) =>
              f.sectorLink ? (
                <Link
                  key={f.label.en}
                  to="/sectors/$slug"
                  params={{ slug: f.sectorLink }}
                  className="bg-night px-4 py-5 transition-colors hover:bg-night-foreground/5"
                >
                  <div className="text-[11px] text-night-foreground/50">{t(f.label)}</div>
                  <div className="mt-1.5 text-sm font-semibold text-brand">{f.value}</div>
                </Link>
              ) : (
                <div key={f.label.en} className="bg-night px-4 py-5">
                  <div className="text-[11px] text-night-foreground/50">{t(f.label)}</div>
                  <div className="mt-1.5 text-sm font-semibold">{f.value}</div>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <Container>
        {(company.executiveSummary.strengths.length > 0 ||
          company.executiveSummary.risks.length > 0 ||
          company.executiveSummary.catalysts.length > 0 ||
          company.executiveSummary.watchPoints.length > 0) && (
          <div className="mt-10">
            <Panel
              title={t({ ar: "الملخص التنفيذي", en: "Executive summary" })}
              className="border-brand/25 bg-brand/5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    {
                      key: "strengths",
                      label: { ar: "نقاط القوة", en: "Strengths" },
                      items: company.executiveSummary.strengths,
                      dot: "bg-tone-emerald",
                    },
                    {
                      key: "risks",
                      label: { ar: "المخاطر", en: "Risks" },
                      items: company.executiveSummary.risks,
                      dot: "bg-tone-rose",
                    },
                    {
                      key: "catalysts",
                      label: { ar: "المحفزات", en: "Catalysts" },
                      items: company.executiveSummary.catalysts,
                      dot: "bg-tone-sky",
                    },
                    {
                      key: "watchPoints",
                      label: { ar: "ما يجب مراقبته", en: "What to watch" },
                      items: company.executiveSummary.watchPoints,
                      dot: "bg-tone-amber",
                    },
                  ] as const
                ).map(
                  (group) =>
                    group.items.length > 0 && (
                      <div key={group.key} className="rounded-xl bg-card/60 p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-bold">
                          <span className={cn("size-2 rounded-full", group.dot)} />
                          {t(group.label)}
                        </div>
                        <ul className="space-y-1.5 text-xs leading-6 text-muted-foreground">
                          {group.items.map((item) => (
                            <li key={item.en}>{t(item)}</li>
                          ))}
                        </ul>
                      </div>
                    ),
                )}
              </div>
            </Panel>
          </div>
        )}

        {(company.ceo.ar || company.foundedYear || company.headquarters.ar || company.website) && (
          <div className="mt-5">
            <Panel title={t({ ar: "معلومات الشركة", en: "Company information" })}>
              <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                {company.ceo.ar && (
                  <div>
                    <dt className="text-[11px] text-muted-foreground">
                      {t({ ar: "الرئيس التنفيذي", en: "CEO" })}
                    </dt>
                    <dd className="mt-1 font-semibold">{t(company.ceo)}</dd>
                  </div>
                )}
                {company.foundedYear && (
                  <div>
                    <dt className="text-[11px] text-muted-foreground">
                      {t({ ar: "سنة التأسيس", en: "Founded" })}
                    </dt>
                    <dd className="mt-1 font-semibold">{company.foundedYear}</dd>
                  </div>
                )}
                {company.headquarters.ar && (
                  <div>
                    <dt className="text-[11px] text-muted-foreground">
                      {t({ ar: "المقر الرئيسي", en: "Headquarters" })}
                    </dt>
                    <dd className="mt-1 font-semibold">{t(company.headquarters)}</dd>
                  </div>
                )}
                {company.website && (
                  <div>
                    <dt className="text-[11px] text-muted-foreground">
                      {t({ ar: "الموقع الإلكتروني", en: "Website" })}
                    </dt>
                    <dd className="mt-1 font-semibold">
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand hover:underline"
                        dir="ltr"
                      >
                        {company.website.replace(/^https?:\/\//, "")}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </Panel>
          </div>
        )}

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {company.sections.map((s) => (
            <Panel key={s.key} title={t(s.title)}>
              <p className="text-sm leading-8 text-muted-foreground">{t(s.body)}</p>
            </Panel>
          ))}
        </div>

        <div className="mt-5">
          <Panel
            title={t({ ar: "الأهداف والخطط المستقبلية", en: "Goals & Future Plans" })}
            className="border-brand/25 bg-brand/5"
          >
            <p className="text-sm leading-8 text-muted-foreground">{t(company.goals)}</p>
          </Panel>
        </div>

        {company.stockPerformance.companyReturn !== null &&
          company.stockPerformance.benchmarkReturn !== null && (
            <div className="mt-5">
              <Panel
                title={
                  t({ ar: "أداء السهم مقابل ", en: "Stock performance vs " }) +
                  t(company.stockPerformance.benchmarkName)
                }
              >
                <p className="mb-4 text-[11px] text-muted-foreground">
                  {t({ ar: "الفترة", en: "Period" })}: {t(company.stockPerformance.period)}
                </p>
                <div className="space-y-3">
                  {[
                    { label: t(company.name), value: company.stockPerformance.companyReturn },
                    {
                      label: t(company.stockPerformance.benchmarkName),
                      value: company.stockPerformance.benchmarkReturn,
                    },
                  ].map((row) => {
                    const max = Math.max(
                      Math.abs(company.stockPerformance.companyReturn ?? 0),
                      Math.abs(company.stockPerformance.benchmarkReturn ?? 0),
                      1,
                    );
                    return (
                      <div key={row.label}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-medium">{row.label}</span>
                          <span
                            className={cn(
                              "font-semibold",
                              (row.value ?? 0) >= 0 ? "text-tone-emerald" : "text-tone-rose",
                            )}
                          >
                            {(row.value ?? 0) >= 0 ? "+" : ""}
                            {row.value}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              (row.value ?? 0) >= 0 ? "bg-tone-emerald" : "bg-tone-rose",
                            )}
                            style={{ width: `${(Math.abs(row.value ?? 0) / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>
          )}

        {(company.tradingStats.weekLow52 || company.shortInterest.percent) && (
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {company.tradingStats.weekLow52 && (
              <Panel title={t({ ar: "إحصاءات التداول", en: "Trading stats" })}>
                <div className="mb-4">
                  <div className="mb-1.5 text-[11px] text-muted-foreground">
                    {t({ ar: "مدى 52 أسبوع", en: "52-week range" })}
                  </div>
                  <div className="h-1.5 rounded-full bg-muted" />
                  <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                    <span dir="ltr">{company.tradingStats.weekLow52}</span>
                    <span dir="ltr">{company.tradingStats.weekHigh52}</span>
                  </div>
                </div>
                <dl className="space-y-2.5 text-sm">
                  {[
                    {
                      label: { ar: "حجم التداول", en: "Volume" },
                      value: company.tradingStats.volume,
                    },
                    { label: { ar: "بيتا", en: "Beta" }, value: company.tradingStats.beta },
                    {
                      label: { ar: "التصنيف الائتماني", en: "Credit rating" },
                      value: company.tradingStats.creditRating,
                    },
                  ].map(
                    (row) =>
                      row.value && (
                        <div key={row.label.en} className="flex items-center justify-between">
                          <dt className="text-muted-foreground">{t(row.label)}</dt>
                          <dd className="font-semibold">{row.value}</dd>
                        </div>
                      ),
                  )}
                </dl>
              </Panel>
            )}

            {company.shortInterest.percent && (
              <Panel title={t({ ar: "البيع على المكشوف", en: "Short interest" })}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[11px] text-muted-foreground">
                      {t({ ar: "نسبة البيع على المكشوف", en: "Short interest" })}
                    </div>
                    <div className="mt-1 text-lg font-semibold">
                      {company.shortInterest.percent}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">
                      {t({ ar: "أيام التغطية", en: "Days to cover" })}
                    </div>
                    <div className="mt-1 text-lg font-semibold">
                      {company.shortInterest.daysToCover}
                    </div>
                  </div>
                </div>
                {company.shortInterest.note.ar && (
                  <p className="mt-4 text-xs leading-6 text-muted-foreground">
                    {t(company.shortInterest.note)}
                  </p>
                )}
              </Panel>
            )}
          </div>
        )}

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          <Panel title={t({ ar: "التقييم", en: "Valuation" })} className="lg:col-span-1">
            <div className="space-y-4 text-sm">
              {company.valuation.map((v) => (
                <div key={v.label.en}>
                  <div className="mb-1 flex items-center justify-between">
                    <dt className="text-muted-foreground">{t(v.label)}</dt>
                    <dd className="font-semibold">{v.companyValue}</dd>
                  </div>
                  {(v.sectorAvg || v.marketAvg) && (
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        {v.sectorAvg && `${t({ ar: "القطاع", en: "Sector" })}: ${v.sectorAvg}`}
                        {v.sectorAvg && v.marketAvg && " · "}
                        {v.marketAvg && `${t({ ar: "السوق", en: "Market" })}: ${v.marketAvg}`}
                      </span>
                      {v.reading && v.readingText && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 font-medium",
                            v.reading === "good" && "bg-tone-emerald/10 text-tone-emerald",
                            v.reading === "warning" && "bg-tone-amber/10 text-tone-amber",
                            v.reading === "bad" && "bg-tone-rose/10 text-tone-rose",
                          )}
                        >
                          {t(v.readingText)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title={t({ ar: "الأداء التاريخي", en: "Historical performance" })}>
            <div className="flex h-40 items-end gap-2">
              {(() => {
                const parseValue = (v: string) => parseFloat(v.replace(/[^0-9.]/g, "")) || 0;
                const values = company.financials.map((f) => parseValue(f.revenue));
                const max = Math.max(...values, 1);
                return company.financials.map((f, i) => (
                  <div key={f.year} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-md bg-brand/70 transition-all"
                      style={{ height: `${Math.max((values[i]! / max) * 100, 6)}%` }}
                      title={f.revenue}
                    />
                    <span className="text-[11px] text-muted-foreground">{f.year}</span>
                  </div>
                ));
              })()}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              {t({
                ar: "مقياس نسبي للإيرادات عبر السنوات.",
                en: "Relative scale of revenue across years.",
              })}
            </p>
          </Panel>

          <Panel title={t({ ar: "الأخبار", en: "News" })}>
            <ul className="space-y-4 text-sm">
              {company.news.map((n) => (
                <li key={n.title.en}>
                  <div className="font-medium leading-6">{t(n.title)}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {n.source} · {n.date}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {company.analystConsensus.rating.ar && (
          <div className="mt-5">
            <Panel title={t({ ar: "إجماع المحللين", en: "Analyst consensus" })}>
              <div className="mb-4 flex items-center gap-3">
                <span className="text-xl font-bold text-brand">
                  {t(company.analystConsensus.rating)}
                </span>
                {company.analystConsensus.analystCount && (
                  <span className="text-xs text-muted-foreground">
                    {t({ ar: "بناءً على", en: "Based on" })} {company.analystConsensus.analystCount}{" "}
                    {t({ ar: "محلل", en: "analysts" })}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] text-muted-foreground">
                    {t({ ar: "متوسط السعر المستهدف", en: "Avg. target price" })}
                  </div>
                  <div className="mt-1 text-lg font-semibold">
                    {company.analystConsensus.targetPrice}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">
                    {t({ ar: "مقارنة بالسعر الحالي", en: "vs current price" })}
                  </div>
                  <div
                    className={cn(
                      "mt-1 text-lg font-semibold",
                      company.analystConsensus.upside.startsWith("-")
                        ? "text-tone-rose"
                        : "text-tone-emerald",
                    )}
                  >
                    {company.analystConsensus.upside}
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        )}

        <div className="mt-14">
          <SectionHeading title={t({ ar: "القوائم المالية", en: "Financial statements" })} />
          <div className="relative">
            <Panel className="overflow-x-auto p-0">
              <table className="w-full min-w-3xl text-start text-sm">
                <thead className="bg-muted/60 text-xs text-muted-foreground">
                  <tr>
                    {[
                      { ar: "السنة", en: "Year" },
                      { ar: "الإيرادات", en: "Revenue" },
                      { ar: "صافي الدخل", en: "Net income" },
                      { ar: "التدفق النقدي", en: "Cash flow" },
                      { ar: "الهامش", en: "Margin" },
                      { ar: "العائد على رأس المال", en: "ROIC" },
                    ].map((h) => (
                      <th key={h.en} className="px-5 py-3.5 text-start font-medium">
                        {t(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {company.financials.map((row) => (
                    <tr key={row.year} className="border-t border-border/60">
                      <td className="px-5 py-3.5 font-semibold">{row.year}</td>
                      <td className="px-5 py-3.5">{row.revenue}</td>
                      <td className="px-5 py-3.5">{row.netIncome}</td>
                      <td className="px-5 py-3.5">{row.cashFlow}</td>
                      <td className="px-5 py-3.5 text-brand">{row.margin}</td>
                      <td className="px-5 py-3.5 text-brand">{row.roic}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-e-2xl bg-gradient-to-l from-card to-transparent"
              aria-hidden
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t({
              ar: "المصدر: بيانات تجريبية للعرض حالياً — سيتم ربطها بمصدر بيانات مباشر.",
              en: "Source: demo data for now — will be connected to a live data feed.",
            })}
          </p>
        </div>

        {company.balanceSheet.length > 0 && (
          <div className="mt-5">
            <Panel title={t({ ar: "الميزانية العمومية", en: "Balance sheet" })}>
              <dl className="space-y-3.5 text-sm">
                {company.balanceSheet.map((b) => (
                  <div
                    key={b.label.en}
                    className="flex items-center justify-between border-b border-border/50 pb-2.5 last:border-0 last:pb-0"
                  >
                    <dt className="text-muted-foreground">{t(b.label)}</dt>
                    <dd className="font-semibold">{b.value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          </div>
        )}

        {company.financialRatios.length > 0 && (
          <div className="mt-5">
            <Panel title={t({ ar: "المؤشرات المالية", en: "Financial ratios" })}>
              <div className="space-y-6">
                {company.financialRatios.map((group) => (
                  <div key={group.group.en}>
                    <h3 className="mb-3 text-xs font-bold text-muted-foreground">
                      {t(group.group)}
                    </h3>
                    <dl className="space-y-2.5 text-sm">
                      {group.rows.map((r) => (
                        <div key={r.label.en} className="flex items-center justify-between">
                          <dt className="text-muted-foreground">{t(r.label)}</dt>
                          <dd
                            className={cn(
                              "font-semibold",
                              r.reading === "good" && "text-tone-emerald",
                              r.reading === "warning" && "text-tone-amber",
                              r.reading === "bad" && "text-tone-rose",
                            )}
                          >
                            {r.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {(company.financialHealth.length > 0 || company.growthOutlook.length > 0) && (
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {company.financialHealth.length > 0 && (
              <Panel title={t({ ar: "الصحة المالية", en: "Financial health" })}>
                <ul className="space-y-3">
                  {company.financialHealth.map((item) => (
                    <li key={item.text.en} className="flex items-start gap-2.5 text-sm">
                      <span
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                          item.status === "good" && "bg-tone-emerald/15 text-tone-emerald",
                          item.status === "warning" && "bg-tone-amber/15 text-tone-amber",
                          item.status === "bad" && "bg-tone-rose/15 text-tone-rose",
                        )}
                      >
                        {item.status === "good" ? "✓" : item.status === "warning" ? "!" : "✕"}
                      </span>
                      <span className="text-muted-foreground">{t(item.text)}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {company.growthOutlook.length > 0 && (
              <Panel title={t({ ar: "النمو المتوقع", en: "Growth outlook" })}>
                <dl className="space-y-3.5 text-sm">
                  {company.growthOutlook.map((g) => (
                    <div key={g.label.en} className="flex items-center justify-between">
                      <dt className="text-muted-foreground">{t(g.label)}</dt>
                      <dd
                        className={cn(
                          "font-semibold",
                          g.value.startsWith("-") ? "text-tone-rose" : "text-tone-emerald",
                        )}
                      >
                        {g.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Panel>
            )}
          </div>
        )}

        {company.revenueBreakdown.length > 0 && (
          <div className="mt-5">
            <Panel title={t({ ar: "تفصيل الإيرادات", en: "Revenue breakdown" })}>
              <div className="space-y-4">
                {company.revenueBreakdown.map((r) => (
                  <div key={r.label.en}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t(r.label)}</span>
                      <span className="font-semibold">{r.percent}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${r.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {company.dividends.payer && (
          <div className="mt-5">
            <Panel title={t({ ar: "التوزيعات", en: "Dividends" })}>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <div className="text-[11px] text-muted-foreground">
                    {t({ ar: "العائد", en: "Yield" })}
                  </div>
                  <div className="mt-1 text-lg font-semibold">{company.dividends.yield}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">
                    {t({ ar: "آخر توزيع", en: "Last payout" })}
                  </div>
                  <div className="mt-1 text-lg font-semibold">{company.dividends.lastPayout}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">
                    {t({ ar: "النمو (3 سنوات)", en: "3-year growth" })}
                  </div>
                  <div className="mt-1 text-lg font-semibold">{company.dividends.growth3y}</div>
                </div>
              </div>
              {company.dividends.sustainabilityScore !== null && (
                <div className="mt-5">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t({ ar: "استدامة التوزيع", en: "Payout sustainability" })}
                    </span>
                    <span className="font-semibold text-brand">
                      {t(company.dividends.sustainabilityLabel)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${company.dividends.sustainabilityScore}%` }}
                    />
                  </div>
                </div>
              )}
            </Panel>
          </div>
        )}

        {company.competitors.length > 0 && (
          <div className="mt-5">
            <Panel
              title={t({ ar: "المنافسون", en: "Competitors" })}
              className="overflow-x-auto p-0"
            >
              <table className="w-full min-w-xl text-start text-sm">
                <thead className="bg-muted/60 text-xs text-muted-foreground">
                  <tr>
                    {[
                      { ar: "الشركة", en: "Company" },
                      { ar: "القيمة السوقية", en: "Market cap" },
                      { ar: "مكرر الربحية", en: "P/E" },
                      { ar: "العائد", en: "Dividend" },
                    ].map((h) => (
                      <th key={h.en} className="px-5 py-3.5 text-start font-medium">
                        {t(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {company.competitors.map((c) => (
                    <tr key={c.name} className="border-t border-border/60">
                      <td className="px-5 py-3.5 font-semibold">{c.name}</td>
                      <td className="px-5 py-3.5">{c.marketCap}</td>
                      <td className="px-5 py-3.5">{c.pe}</td>
                      <td className="px-5 py-3.5">{c.dividend}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>
        )}

        {(company.ownership.government || company.ownership.holders.length > 0) && (
          <div className="mt-5">
            <Panel title={t({ ar: "الملكية والمساهمون", en: "Ownership" })}>
              {(company.ownership.government || company.ownership.freeFloat) && (
                <div className="mb-5 grid grid-cols-2 gap-4">
                  {company.ownership.government && (
                    <div>
                      <div className="text-[11px] text-muted-foreground">
                        {t({ ar: "ملكية حكومية", en: "Government" })}
                      </div>
                      <div className="mt-1 text-lg font-semibold">
                        {company.ownership.government}
                      </div>
                    </div>
                  )}
                  {company.ownership.freeFloat && (
                    <div>
                      <div className="text-[11px] text-muted-foreground">
                        {t({ ar: "تداول حر", en: "Free float" })}
                      </div>
                      <div className="mt-1 text-lg font-semibold">
                        {company.ownership.freeFloat}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {company.ownership.holders.length > 0 && (
                <dl className="space-y-2.5 text-sm">
                  {company.ownership.holders.map((h) => (
                    <div key={h.name.en} className="flex items-center justify-between">
                      <dt className="text-muted-foreground">{t(h.name)}</dt>
                      <dd className="font-semibold">{h.percent}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Panel>
          </div>
        )}

        {(company.upcomingEvents.length > 0 || company.officialDocs.length > 0) && (
          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            {company.upcomingEvents.length > 0 && (
              <Panel title={t({ ar: "أحداث قادمة", en: "Upcoming events" })}>
                <ul className="space-y-3.5">
                  {company.upcomingEvents.map((e) => (
                    <li key={e.title.en} className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                          e.type === "earnings" && "bg-tone-sky/15 text-tone-sky",
                          e.type === "dividend" && "bg-tone-emerald/15 text-tone-emerald",
                          e.type === "other" && "bg-muted text-muted-foreground",
                        )}
                      >
                        <CalendarDays className="size-3.5" />
                      </span>
                      <div>
                        <div className="text-sm font-medium">{t(e.title)}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">{e.date}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {company.officialDocs.length > 0 && (
              <Panel title={t({ ar: "مستندات رسمية", en: "Official documents" })}>
                <ul className="space-y-2.5">
                  {company.officialDocs.map((d) => (
                    <li key={d.label.en}>
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-sm text-brand hover:underline"
                      >
                        <ExternalLink className="size-3.5 shrink-0" />
                        {t(d.label)}
                      </a>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>
        )}

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <Panel title={t({ ar: "الأسئلة الشائعة", en: "FAQs" })}>
            <div className="space-y-4">
              {company.faqs.map((f) => (
                <details key={f.q.en} className="group rounded-xl bg-muted/50 p-4">
                  <summary className="cursor-pointer list-none text-sm font-semibold">
                    {t(f.q)}
                  </summary>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{t(f.a)}</p>
                </details>
              ))}
            </div>
          </Panel>

          <Panel title={t({ ar: "كيف تشتري السهم", en: "How to buy the stock" })}>
            <ol className="space-y-4 text-sm">
              {company.howToBuy.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[11px] font-bold text-brand">
                    {i + 1}
                  </span>
                  <span className="leading-7 text-muted-foreground">{t(step)}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        {research.length > 0 && (
          <div className="mt-14">
            <SectionHeading title={t(ui.research)} />
            <div className="grid gap-5 md:grid-cols-3">
              {research.map((r) => (
                <ResearchCard key={r.slug} item={r} />
              ))}
            </div>
          </div>
        )}

        {related.length > 0 && (
          <div className="mt-14">
            <SectionHeading title={t(ui.relatedCompanies)} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((c) => (
                <CompanyCard key={c.slug} company={c} />
              ))}
            </div>
          </div>
        )}

        <section className="mt-16 flex flex-col items-center gap-3 rounded-2xl border border-border/70 bg-card p-8 text-center sm:flex-row sm:justify-between sm:text-start">
          <div>
            <h3 className="text-sm font-bold">
              {t({ ar: "ناقش ", en: "Discuss " }) +
                t(company.name) +
                t({ ar: " مع مستثمرين آخرين", en: " with other investors" })}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t({
                ar: "انضم للوحة النقاش المخصصة لقطاعها بمجتمعنا.",
                en: "Join the discussion board dedicated to its sector.",
              })}
            </p>
          </div>
          <Link
            to="/community"
            className="flex shrink-0 items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-transform hover:scale-[1.03]"
          >
            <MessagesSquare className="size-4" />
            {t({ ar: "افتح لوحة المجتمع", en: "Open community board" })}
          </Link>
        </section>

        {company.dataSources.length > 0 && (
          <div className="mt-5">
            <Panel title={t({ ar: "المصادر وحداثة البيانات", en: "Data sources & freshness" })}>
              <ul className="space-y-3">
                {company.dataSources.map((s) => (
                  <li key={s.label.en} className="flex items-start gap-2.5 text-sm">
                    <span
                      className={cn(
                        "mt-1 size-2 shrink-0 rounded-full",
                        s.kind === "live" && "bg-tone-sky",
                        s.kind === "official" && "bg-tone-emerald",
                        s.kind === "ai" && "bg-brand",
                      )}
                    />
                    <div>
                      <span className="font-medium">{t(s.label)}</span>
                      <span className="text-muted-foreground"> — {t(s.note)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        )}

        <p className="mt-6 rounded-xl border border-border/70 bg-muted/30 p-4 text-[11px] leading-6 text-muted-foreground">
          {t({
            ar: "إخلاء مسؤولية: هذا المحتوى لأغراض تعليمية ومعلوماتية فقط، ولا يمثل توصية بشراء أو بيع أو الاحتفاظ بأي ورقة مالية. راجع المصادر الرسمية واستشر مختصاً مؤهلاً قبل اتخاذ أي قرار استثماري.",
            en: "Disclaimer: this content is for educational and informational purposes only and does not constitute investment advice to buy, sell, or hold any security. Verify with official sources and consult a qualified advisor before making any investment decision.",
          })}
        </p>
      </Container>
    </PageShell>
  );
}
