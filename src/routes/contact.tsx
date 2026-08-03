import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تواصل معنا | معرفة استثمار" },
      { name: "description", content: "تواصل مع فريق معرفة استثمار لأي استفسار أو اقتراح." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { t } = useI18n();

  return (
    <PageShell>
      <PageHero
        eyebrow={t({ ar: "عن المنصة", en: "Company" })}
        title={t({ ar: "تواصل معنا", en: "Contact us" })}
        description={t({
          ar: "عندك سؤال، اقتراح، أو تبي تنضم كباحث أو كاتب؟ راسلنا وبنرد عليك.",
          en: "Have a question, suggestion, or want to join as a researcher or writer? Reach out and we'll get back to you.",
        })}
      />
      <Container>
        <div className="mx-auto max-w-md">
          <a
            href="mailto:hello@marifa-istithmar.example"
            className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-lift"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Mail className="size-5" />
            </span>
            <div>
              <div className="text-sm font-bold">{t({ ar: "البريد الإلكتروني", en: "Email" })}</div>
              <div className="text-xs text-muted-foreground" dir="ltr">
                hello@marifa-istithmar.example
              </div>
            </div>
          </a>
          <p className="mt-6 text-xs leading-7 text-muted-foreground">
            {t({
              ar: "ملاحظة: هذا بريد تجريبي مؤقت — استبدله ببريد فريقك الفعلي قبل النشر.",
              en: "Note: this is a placeholder address — replace it with your real team email before launch.",
            })}
          </p>
        </div>
      </Container>
    </PageShell>
  );
}
