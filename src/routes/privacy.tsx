import { createFileRoute } from "@tanstack/react-router";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية | معرفة استثمار" },
      { name: "description", content: "كيف نتعامل مع بياناتك على منصة معرفة استثمار." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { t } = useI18n();

  return (
    <PageShell>
      <PageHero
        eyebrow={t({ ar: "عن المنصة", en: "Company" })}
        title={t({ ar: "سياسة الخصوصية", en: "Privacy policy" })}
        description={t({
          ar: "آخر تحديث: يُملأ عند النشر.",
          en: "Last updated: fill in on launch.",
        })}
      />
      <Container>
        <div className="mx-auto max-w-2xl space-y-6 text-sm leading-8 text-muted-foreground">
          <div className="rounded-xl border border-tone-amber/30 bg-tone-amber/10 p-4 text-xs leading-6 text-foreground">
            {t({
              ar: "هذا نص مبدئي للعرض فقط وليس صياغة قانونية نهائية. بما إن المنصة تتعامل مع بيانات مالية واشتراكات بريدية، ننصح بمراجعة محامٍ مختص قبل النشر الفعلي.",
              en: "This is placeholder copy for demonstration only, not final legal drafting. Since the platform handles financial data and email subscriptions, have a qualified lawyer review it before going live.",
            })}
          </div>
          <p>
            {t({
              ar: "نجمع معلومات محدودة عند استخدامك للمنصة، مثل بريدك الإلكتروني عند الاشتراك بالنشرة، وبيانات استخدام عامة لتحسين تجربتك.",
              en: "We collect limited information when you use the platform, such as your email when you subscribe to the newsletter, and general usage data to improve your experience.",
            })}
          </p>
          <p>
            {t({
              ar: "لا نبيع بياناتك لأطراف ثالثة. يمكنك طلب حذف بياناتك بالتواصل معنا عبر صفحة تواصل معنا.",
              en: "We do not sell your data to third parties. You can request deletion of your data by reaching out via the contact page.",
            })}
          </p>
        </div>
      </Container>
    </PageShell>
  );
}
