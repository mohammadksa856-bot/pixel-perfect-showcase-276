import { createFileRoute } from "@tanstack/react-router";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { ui, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "من نحن | معرفة استثمار" },
      {
        name: "description",
        content: "تعرّف على معرفة استثمار: منصة عربية للتحليل المالي والمحتوى المعرفي الاستثماري.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { t } = useI18n();

  return (
    <PageShell>
      <PageHero
        eyebrow={t({ ar: "عن المنصة", en: "About" })}
        title={t({ ar: "من نحن", en: "About us" })}
        description={t({
          ar: "معرفة استثمار منصة عربية متخصصة في تحليل الشركات والقطاعات والأسواق، تهدف لمساعدتك على اتخاذ قرارات استثمارية مبنية على الفهم لا التوقع.",
          en: "Ma'rifat Istithmar is an Arabic platform for company, sector and market analysis, built to help you invest with understanding rather than prediction.",
        })}
      />
      <Container>
        <div className="mx-auto max-w-2xl space-y-6 text-sm leading-8 text-muted-foreground">
          <p>
            {t({
              ar: "نقدّم تحليلات وأبحاث ومحتوى تعليمي عن الشركات والقطاعات الاقتصادية حول العالم، مع تركيز خاص على الأسواق العربية والعالمية معاً. هدفنا تبسيط المفاهيم المالية المعقّدة وجعلها متاحة لكل مستثمر، سواء كان مبتدئاً أو متمرّساً.",
              en: "We provide analysis, research and educational content on companies and sectors worldwide, with a focus on both regional and global markets. Our goal is to make complex financial concepts accessible to every investor, beginner or experienced.",
            })}
          </p>
          <p>
            {t({
              ar: "المحتوى حالياً يُكتب ويُراجع من فريق المنصة، ونعمل على استقطاب كتّاب وباحثين ضيوف لتوسيع نطاق التغطية مستقبلاً.",
              en: "Content is currently written and reviewed in-house, and we're working on bringing in guest researchers to expand coverage going forward.",
            })}
          </p>
        </div>
      </Container>
    </PageShell>
  );
}
