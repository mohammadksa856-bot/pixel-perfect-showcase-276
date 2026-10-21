import type { ComponentProps } from "react";
import { Panel } from "@/components/cards";
import { useI18n } from "@/lib/i18n";

export function CompanyPanel({ children, ...props }: ComponentProps<typeof Panel>) {
  const { t } = useI18n();
  return (
    <Panel {...props}>
      <p
        className="mb-4 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs leading-6 text-foreground/80"
        data-content-status="unverified"
      >
        {t({
          ar: "محتوى محفوظ غير متحقق منه مستقلًا؛ قد يتضمن بيانات توضيحية. لا يتوفر توثيق المصدر والتاريخ لكل بند، ولا يُعد تحليلًا معتمدًا أو توصية.",
          en: "Unverified stored content; may include illustrative data. Per-item sources and dates are unavailable. This is not approved analysis or advice.",
        })}
      </p>
      {children}
    </Panel>
  );
}

export function UnavailableFinancialContent() {
  const { t } = useI18n();
  return (
    <p className="text-sm leading-7 text-muted-foreground">
      {t({
        ar: "التوصيات والأسعار المستهدفة وسيناريوهات التقييم والمضاعفات والتقديرات غير متاحة: لم تتوفر مصادر مؤرخة ومدخلات متجانسة متحقق منها. لم تُستبدل بأرقام تجريبية.",
        en: "Recommendations, price targets, valuation scenarios, multiples and estimates are unavailable: dated sources and verified consistent inputs are missing. No demo values are substituted.",
      })}
    </p>
  );
}

export function CompanyDataUnavailable() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-xl px-4 py-20" role="alert">
      <h1 className="text-xl font-bold">
        {t({ ar: "بيانات الشركة غير متاحة", en: "Company data unavailable" })}
      </h1>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        {t({
          ar: "تعذر الوصول إلى مصدر المحتوى. لا نعرض أرقامًا تجريبية بديلة. حاول لاحقًا.",
          en: "The content source could not be reached. No demo figures are substituted. Please try again later.",
        })}
      </p>
      <a className="mt-5 inline-block underline" href="/companies">
        {t({ ar: "العودة إلى الشركات", en: "Back to companies" })}
      </a>
    </div>
  );
}
