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
        <section className="mb-10 rounded-2xl border border-border/70 bg-card p-6 sm:p-8">
          <h2 className="mb-3 text-sm font-bold text-muted-foreground">
            {t({ ar: 'وش يعني "قطاع استثماري"؟', en: 'What does "sector" mean?' })}
          </h2>
          <p className="text-sm leading-8">
            {t({
              ar: "القطاع مجموعة من الشركات تشتغل بنفس المجال أو تقدم منتجات وخدمات متشابهة — مثل شركات النفط اللي تقع تحت قطاع الطاقة، أو شركات البرمجيات اللي تقع تحت قطاع التقنية. تقسيم الشركات لقطاعات يساعدك تقارن بين الشركات المتشابهة، وتفهم كيف تتأثر مجموعة كاملة من الشركات بنفس الأحداث الاقتصادية.",
              en: "A sector is a group of companies operating in the same field or offering similar products and services — like oil companies under the energy sector, or software companies under technology. Grouping companies into sectors helps you compare similar businesses and understand how a whole group reacts to the same economic events.",
            })}
          </p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {getSectors().map((s) => (
            <SectorCard key={s.slug} sector={s} />
          ))}
        </div>
      </Container>
    </PageShell>
  );
}
