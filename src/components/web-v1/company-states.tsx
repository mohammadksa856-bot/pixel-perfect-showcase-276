import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { PreviewContainer, WebV1Shell } from "./shell";

/** خطأ المحرك: لا أرقام بديلة (نفس نص صفحة WEB-06). */
export function EngineError({ reason }: { reason: string }) {
  const { t } = useI18n();
  return (
    <WebV1Shell>
      <PreviewContainer className="py-16">
        <div
          className="rounded-2xl border border-status-bad/40 bg-status-bad/5 p-6"
          data-engine-error
        >
          <h1 className="text-lg font-bold">
            {t({ ar: "تعذر تحميل بيانات المحرك", en: "Engine data could not be loaded" })}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t({ ar: "لا تُعرض أي أرقام بديلة.", en: "No substitute figures are shown." })}{" "}
            <code dir="ltr">{reason}</code>
          </p>
        </div>
      </PreviewContainer>
    </WebV1Shell>
  );
}

/** WEB-07 بُني لأرامكو أولًا؛ لغيرها حالة صريحة ورابط إلى «بيانات معرفة» بدل صفحة فارغة أو مخترعة. */
export function NotBuiltYet({ symbol }: { symbol: string }) {
  const { t } = useI18n();
  return (
    <PreviewContainer className="py-12">
      <div
        className="rounded-2xl border border-dashed border-border p-8 text-center"
        data-experience-not-built
      >
        <p className="text-[15px] font-semibold">
          {t({
            ar: "النظرة العامة وتحليل الشركة غير مبنيين لهذه الشركة بعد.",
            en: "Overview and Company Intelligence are not built for this company yet.",
          })}
        </p>
        <Link
          to="/preview/web-v1/companies/$symbol"
          params={{ symbol }}
          search={{ tab: "business" }}
          className="mt-3 inline-block text-[13px] text-brand hover:underline"
        >
          {t({ ar: "افتح بيانات معرفة لهذه الشركة", en: "Open Marefa Data for this company" })}
        </Link>
      </div>
    </PreviewContainer>
  );
}
