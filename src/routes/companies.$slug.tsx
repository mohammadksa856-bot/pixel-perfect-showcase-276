import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { ChevronLeft, Info, MessagesSquare } from "lucide-react";
import { PageShell, Container } from "@/components/page-shell";
import { CompanyCard, Panel, ResearchCard, SectionHeading } from "@/components/cards";
import { ui, useI18n } from "@/lib/i18n";
import { getCompany, getRelatedCompanies, getResearch, getSector } from "@/lib/content";
import type { Company } from "@/data/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/companies/$slug")({
  loader: ({ params }) => {
    const company = getCompany(params.slug);
    if (!company) throw notFound();
    return { company };
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
  const { company } = Route.useLoaderData() as { company: Company };
  const { t } = useI18n();
  const sector = getSector(company.sectorSlug);
  const related = getRelatedCompanies(company);
  const research = getResearch({ sectorSlug: company.sectorSlug, limit: 2 });

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
        <div className="grid gap-5 lg:grid-cols-2">
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
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          <Panel title={t({ ar: "التقييم", en: "Valuation" })}>
            <dl className="space-y-3.5 text-sm">
              {company.valuation.map((v) => (
                <div key={v.label.en} className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{t(v.label)}</dt>
                  <dd className="font-semibold">{v.value}</dd>
                </div>
              ))}
            </dl>
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
      </Container>
    </PageShell>
  );
}
