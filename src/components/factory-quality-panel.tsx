import { ShieldCheck, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import contract from "@/design/factory-contract.json";
import { QUALITY_LABELS } from "@/design/model";

/** Policy disclosure only: never invent a company assessment from site demo data. */
export function FactoryQualityPanel() {
  const { t } = useI18n();
  return (
    <details
      id="factory-quality"
      className="mt-8 rounded-2xl border border-border bg-card p-4 sm:p-6"
      data-current-factory-quality
    >
      <summary className="flex cursor-pointer list-none items-center gap-3">
        <ShieldCheck className="size-5 text-brand" />
        <span className="flex-1 text-sm font-semibold">
          {t({ ar: "جودة البيانات والمصادر", en: "Data quality & sources" })}
        </span>
        <span className="text-[11px] text-muted-foreground">
          18 · {t({ ar: "غير مقاسة", en: "Not measured" })}
        </span>
        <ChevronDown size={16} />
      </summary>
      <div className="mt-5 flex items-start gap-3 border-t border-border pt-5">
        <ShieldCheck className="mt-1 size-6 shrink-0 text-brand" />
        <div>
          <h2 className="text-lg font-bold">
            {t({ ar: "جودة البيانات والمصادر", en: "Data quality & sources" })}
          </h2>
          <p className="mt-2 max-w-4xl text-xs leading-7 text-muted-foreground">
            {t({
              ar: "الهدف الموزون 95% شرط تعاقدي، وليس درجة لهذه الشركة. يلزم اجتياز حد كل فئة وبواباتها. لا توجد نتيجة قياس مصنع معتمدة مرتبطة ببيانات الموقع التجريبية؛ جميع الفئات غير مقاسة.",
              en: "The weighted 95% target is a contract requirement, not this company’s score. Each category threshold and hard gate must pass. No approved factory assessment accompanies the site demonstration data; all categories are not measured.",
            })}
          </p>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {t({ ar: "نسخة العقد", en: "Contract version" })}: {contract.contract_version} ·{" "}
            {t({
              ar: "موضوعات المستثمر ليست فئات المصنع",
              en: "Investor topics are not factory categories",
            })}
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {contract.categories.map((c) => (
          <details
            key={c.category_key}
            className="rounded-xl border border-border bg-background/40"
            data-factory-category={c.category_key}
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-semibold">{t(QUALITY_LABELS[c.category_key])}</h3>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {t({ ar: "الوزن", en: "Weight" })} {c.weight} ·{" "}
                  {t({ ar: "الحد", en: "Threshold" })} {Math.round(c.completeness_threshold * 100)}%
                </p>
              </div>
              <span className="rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground">
                {t({ ar: "غير مقاسة", en: "Not measured" })}
              </span>
              <ChevronDown size={14} />
            </summary>
            <div className="space-y-3 border-t border-border p-4 text-[11px] leading-6 text-muted-foreground">
              <p>
                {t({
                  ar: "لا توجد لقطة مؤهلة مثبتة الإصدار والفترة. لا نفترض صفرًا ولا اعتمادًا كاملًا.",
                  en: "No qualified versioned, period-bound snapshot is available. Neither zero nor full approval is assumed.",
                })}
              </p>
              <h4 className="font-semibold text-foreground">
                {t({ ar: "نص البوابات التعاقدية الأصلية", en: "Original contract gate wording" })}
              </h4>
              {c.hard_gates.map((g) => (
                <p key={g.condition} dir="ltr">
                  <strong>{g.condition}</strong>
                  <br />
                  {g.action}
                </p>
              ))}
              <h4 className="font-semibold text-foreground">
                {t({ ar: "أنواع المصادر المطلوبة", en: "Required source types" })}
              </h4>
              <ul dir="ltr" className="break-words">
                {c.official_sources.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </details>
        ))}
      </div>
    </details>
  );
}
