import { createFileRoute, notFound } from "@tanstack/react-router";
import { PageShell, Container } from "@/components/page-shell";
import { ReadinessCard, TopicOverview, TopicSection } from "@/components/engine-preview";
import { getCompanyPreview } from "@/lib/engine/company-preview.functions";
import { getPeerTable } from "@/lib/engine/peer-comparison.functions";
import { useI18n } from "@/lib/i18n";

/**
 * معاينة صفحة الشركة من محرك البيانات (P02). معطّلة افتراضيًا: دون
 * ENGINE_PREVIEW_ENABLED="true" على الخادم تعيد 404 ولا تتصل بالمحرك.
 * لا تقرأ من Supabase، ولا تُفهرس.
 */
export const Route = createFileRoute("/preview/companies/$symbol")({
  loader: async ({ params }) => {
    const ref = { market: "SA", symbol: params.symbol };
    const [result, peers] = await Promise.all([
      getCompanyPreview({ data: ref }),
      getPeerTable({ data: ref }).catch(() => null),
    ]);
    if (result.state === "disabled" || result.state === "not_found") throw notFound();
    return { result, peers };
  },
  head: ({ loaderData }) => {
    const name =
      loaderData?.result.state === "ok" ? loaderData.result.preview.company.name.ar : "معاينة";
    return {
      meta: [
        { title: `معاينة: ${name} | معرفة استثمار` },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  component: PreviewPage,
});

function PreviewPage() {
  const { result, peers } = Route.useLoaderData();
  const { t } = useI18n();

  if (result.state !== "ok") {
    return (
      <PageShell>
        <Container>
          <div
            className="rounded-2xl border border-tone-rose/40 bg-tone-rose/5 p-6"
            data-engine-error
          >
            <h1 className="text-lg font-bold">
              {t({ ar: "تعذر تحميل بيانات المحرك", en: "Engine data could not be loaded" })}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t({
                ar: "لا تُعرض أي أرقام بديلة. السبب الفني: ",
                en: "No substitute figures are shown. Technical reason: ",
              })}
              <code dir="ltr">{"reason" in result ? result.reason : ""}</code>
            </p>
          </div>
        </Container>
      </PageShell>
    );
  }

  const p = result.preview;
  const c = p.company;
  return (
    <PageShell>
      <section className="night-panel border-b border-border/40">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <span
            className="inline-block rounded-full border border-tone-amber/50 px-3 py-1 text-[11px] font-medium text-tone-amber"
            data-preview-badge
          >
            {t({
              ar: "معاينة من محرك البيانات — ليست الصفحة المنشورة",
              en: "Engine data preview — not the published page",
            })}
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl" dir="auto">
            {t(c.name)}
          </h1>
          <p className="mt-2 text-sm text-night-foreground/70">
            <span dir="ltr">
              {c.market}:{c.symbol}
            </span>
            {[c.exchange, c.sector, c.industry].filter(Boolean).map((v) => ` · ${v}`)}
          </p>
          <div className="mt-6 grid gap-px overflow-hidden rounded-xl bg-night-foreground/10 sm:grid-cols-2">
            <ReadinessCard readiness={p.readiness.investorTopics} />
            <ReadinessCard readiness={p.readiness.operationalCategories} />
          </div>
          <div className="mt-px grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-night-foreground/10 sm:grid-cols-4">
            {[
              { label: { ar: "قيم معروضة", en: "Values shown" }, value: String(p.counts.shown) },
              {
                label: { ar: "قيم محجوبة", en: "Values withheld" },
                value: String(p.counts.withheld),
              },
              { label: { ar: "آخر إفصاح", en: "Latest filing" }, value: c.latestFiling ?? "—" },
              {
                label: { ar: "عملة التقارير", en: "Reporting currency" },
                value: c.currency ?? "—",
              },
            ].map((f) => (
              <div key={f.label.en} className="bg-night px-3.5 py-3">
                <div className="text-[10px] text-night-foreground/50">{t(f.label)}</div>
                <div className="mt-1 text-[13px] font-semibold tabular-nums">{f.value}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 max-w-3xl text-[12px] leading-6 text-night-foreground/60">
            {t({
              ar: "كل رقم يظهر بفترته ووحدته ومصدره وطريقة إثباته (منشور أو محسوب بمعادلة مسجّلة). الرابط يبيّن المصدر ولا يعني تحققًا مستقلًا. القيم التي لا تجتاز الفحص تُحجب ويُذكر سببها، ولا تُستبدل بتقديرات.",
              en: "Every figure shows its period, unit, source and proof (reported, or calculated with a recorded formula). A link shows the source; it is not independent verification. Values that fail checks are withheld with a reason and never replaced by estimates.",
            })}
          </p>
        </div>
      </section>
      <Container>
        {p.dataNotices.length > 0 && (
          <div
            className="mb-6 rounded-xl border border-tone-amber/40 bg-tone-amber/5 p-4 text-[13px] leading-6"
            data-data-notice
          >
            {p.dataNotices.map((n) => (
              <p key={n.en}>{t(n)}</p>
            ))}
          </div>
        )}
        <TopicOverview topics={p.topics} />
        {p.topics.map((topic) => (
          <TopicSection key={topic.key} topic={topic} preview={p} peers={peers} />
        ))}
      </Container>
    </PageShell>
  );
}
