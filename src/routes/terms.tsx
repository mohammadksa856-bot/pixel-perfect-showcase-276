import { createFileRoute } from "@tanstack/react-router";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "الشروط والأحكام | معرفة استثمار" },
      { name: "description", content: "شروط استخدام منصة معرفة استثمار." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { t } = useI18n();

  return (
    <PageShell>
      <PageHero
        eyebrow={t({ ar: "عن المنصة", en: "Company" })}
        title={t({ ar: "الشروط والأحكام", en: "Terms of use" })}
        description={t({
          ar: "آخر تحديث: يُملأ عند النشر.",
          en: "Last updated: fill in on launch.",
        })}
      />
      <Container>
        <div className="mx-auto max-w-2xl space-y-6 text-sm leading-8 text-muted-foreground">
          <div className="rounded-xl border border-tone-amber/30 bg-tone-amber/10 p-4 text-xs leading-6 text-foreground">
            {t({
              ar: "هذا نص مبدئي للعرض فقط وليس صياغة قانونية نهائية. راجع محامٍ مختص قبل النشر، خصوصاً بند إخلاء المسؤولية عن المحتوى المالي.",
              en: "This is placeholder copy for demonstration only, not final legal drafting. Have a qualified lawyer review it before launch, especially the financial-content disclaimer.",
            })}
          </div>
          <p>
            {t({
              ar: "المحتوى المعروض بالمنصة (تحليلات، أبحاث، مقالات معرفية) لأغراض تعليمية وإعلامية فقط، ولا يُعتبر توصية استثمارية أو نصيحة مالية مباشرة.",
              en: "Content on this platform (analysis, research, educational articles) is for informational purposes only and does not constitute investment or financial advice.",
            })}
          </p>
          <p>
            {t({
              ar: "قرارات الاستثمار مسؤولية المستخدم وحده. ننصح دائماً باستشارة مستشار مالي مرخّص قبل اتخاذ أي قرار استثماري.",
              en: "Investment decisions remain the sole responsibility of the user. We always recommend consulting a licensed financial advisor before making any investment decision.",
            })}
          </p>
        </div>
      </Container>
    </PageShell>
  );
}
