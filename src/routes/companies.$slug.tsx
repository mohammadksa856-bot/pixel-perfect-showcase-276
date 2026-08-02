import { createFileRoute, notFound } from "@tanstack/react-router";
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
        meta: [{ title: "الشركة غير موجودة | معرفة استثمار" }, { name: "robots", content: "noindex" }],
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

  const facts = [
    { label: ui.price, value: company.price },
    { label: ui.marketCap, value: company.marketCap },
    { label: ui.exchange, value: company.exchange },
    { label: ui.sector, value: sector ? t(sector.name) : "—" },
    { label: ui.country, value: t(company.country) },
  ];

  return (
    <PageShell>
      <section className="night-panel relative isolate overflow-hidden border-b border-border/40">
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
            {facts.map((f) => (
              <div key={f.label.en} className="bg-night px-4 py-5">
                <div className="text-[11px] text-night-foreground/50">{t(f.label)}</div>
                <div className="mt-1.5 text-sm font-semibold">{f.value}</div>
              </div>
            ))}
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

        <div className="mt-14">
          <SectionHeading title={t({ ar: "القوائم المالية", en: "Financial statements" })} />
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
              {company.financials.map((f, i) => (
                <div key={f.year} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-md bg-brand/70 transition-all"
                    style={{ height: `${40 + i * 22}%` }}
                  />
                  <span className="text-[11px] text-muted-foreground">{f.year}</span>
                </div>
              ))}
            </div>
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
      </Container>
    </PageShell>
  );
}
