import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تواصل معنا | معرفة استثمار" },
      { name: "description", content: "حالة إتاحة قناة التواصل العامة لمعرفة استثمار." },
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
          ar: "قناة التواصل العامة غير متاحة حاليًا.",
          en: "A public contact channel is not currently available.",
        })}
      />
      <Container>
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-lift">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Mail className="size-5" />
            </span>
            <div>
              <div className="text-sm font-bold">{t({ ar: "البريد الإلكتروني", en: "Email" })}</div>
              <div className="text-xs text-muted-foreground">
                {t({ ar: "غير متاح", en: "Unavailable" })}
              </div>
            </div>
          </div>
          <p className="mt-6 text-xs leading-7 text-muted-foreground">
            {t({
              ar: "لا يوجد عنوان بريد موثق للنشر؛ لم نضع عنوانًا بديلًا غير صالح.",
              en: "No verified public email address is available; no invalid placeholder is provided.",
            })}
          </p>
        </div>
      </Container>
    </PageShell>
  );
}
