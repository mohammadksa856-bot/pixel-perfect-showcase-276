import { createFileRoute } from "@tanstack/react-router";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { ResearchCard } from "@/components/cards";
import { ui, useI18n } from "@/lib/i18n";
import { getResearch } from "@/lib/content";

export const Route = createFileRoute("/research/")({
  loader: async () => ({ research: await getResearch() }),
  head: () => ({
    meta: [
      { title: "الأبحاث | معرفة استثمار" },
      {
        name: "description",
        content:
          "أبحاث استثمارية معمّقة حول الأسواق والقطاعات والشركات، مع ملخصات ورسوم بيانية ومراجع موثوقة.",
      },
      { property: "og:title", content: "الأبحاث — معرفة استثمار" },
      {
        property: "og:description",
        content: "تقارير وأبحاث تحليلية عن الاقتصاد والقطاعات والشركات بالعربية.",
      },
    ],
  }),
  component: ResearchPage,
});

function ResearchPage() {
  const { t } = useI18n();
  const { research } = Route.useLoaderData();
  return (
    <PageShell>
      <PageHero
        eyebrow={t(ui.research)}
        title={t(ui.latestResearch)}
        description={t({
          ar: "أبحاث مكتوبة بمنهجية واضحة: فرضية، بيانات، تحليل، وخلاصة قابلة للتطبيق.",
          en: "Research written with a clear method: thesis, data, analysis and an actionable conclusion.",
        })}
      />
      <Container>
        <div className="grid gap-5 md:grid-cols-3">
          {research.map((r) => (
            <ResearchCard key={r.slug} item={r} />
          ))}
        </div>
      </Container>
    </PageShell>
  );
}
