import { createFileRoute } from "@tanstack/react-router";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { SectorCard } from "@/components/cards";
import { ui, useI18n } from "@/lib/i18n";
import { getSectors } from "@/lib/content";

export const Route = createFileRoute("/sectors/")({
  head: () => ({
    meta: [
      { title: "القطاعات | معرفة استثمار" },
      {
        name: "description",
        content:
          "استكشف القطاعات الاستثمارية من الطاقة والفضاء والدفاع إلى التقنية والذكاء الاصطناعي والرعاية الصحية والعقار.",
      },
      { property: "og:title", content: "القطاعات — معرفة استثمار" },
      {
        property: "og:description",
        content: "نظرة تحليلية على أهم القطاعات الاستثمارية العالمية وشركاتها وأبحاثها.",
      },
    ],
  }),
  component: SectorsPage,
});

function SectorsPage() {
  const { t } = useI18n();
  return (
    <PageShell>
      <PageHero
        eyebrow={t(ui.sectors)}
        title={t(ui.exploreSectors)}
        description={t({
          ar: "كل قطاع له صفحته الخاصة مع الشركات المدرجة والأبحاث المرتبطة به.",
          en: "Every sector has a dedicated page with its listed companies and related research.",
        })}
      />
      <Container>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {getSectors().map((s) => (
            <SectorCard key={s.slug} sector={s} />
          ))}
        </div>
      </Container>
    </PageShell>
  );
}
