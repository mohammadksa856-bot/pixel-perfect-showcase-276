import { useI18n } from "@/lib/i18n";
import { GROUPS } from "@/design/model";
const TOPICS = [
  ["هوية الشركة", "Identity", "c1"],
  ["نموذج الأعمال", "Business model", "c2"],
  ["الإدارة والحوكمة", "Management & governance", "c2"],
  ["الملكية والمساهمون", "Ownership", "c2"],
  ["القوائم المالية التاريخية", "Historical statements", "c3"],
  ["جودة الأرباح", "Earnings quality", "c3"],
  ["النسب المالية", "Financial ratios", "c3"],
  ["المؤشرات التشغيلية", "Operational KPIs", "c2"],
  ["التوزيعات وإجراءات الشركة", "Dividends & actions", "c4"],
  ["القطاع والصناعة", "Industry & sector", "c5"],
  ["المنافسون والحصة السوقية", "Competitors & market share", "c2"],
  ["التداول والسيولة", "Trading & liquidity", "c4"],
  ["التوجيهات والتوقعات", "Guidance & forecasts", "c5"],
  ["تغطية المحللين", "Analyst coverage", "c4"],
  ["التقييم", "Valuation", "c4"],
  ["المخاطر والتعرضات", "Risks & exposures", "c5"],
  ["الاستدامة", "ESG", "c5"],
  ["الإفصاحات ومواد المستثمر", "Disclosures & investor materials", "c6"],
] as const;
export function CompanyResearchGuide() {
  const { t } = useI18n();
  return (
    <section
      className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-6"
      aria-label={t({ ar: "دليل موضوعات المستثمر", en: "Investor research guide" })}
      data-current-research-guide
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold">
          {t({ ar: "صورة الشركة في خمس مجموعات", en: "The company in five research groups" })}
        </h2>
        <a
          className="text-xs font-medium text-brand"
          href="#factory-quality"
          onClick={() => {
            const panel = document.getElementById("factory-quality");
            if (panel instanceof HTMLDetailsElement) panel.open = true;
          }}
        >
          {t({ ar: "راجع جودة البيانات", en: "Review data quality" })} ↗
        </a>
      </div>
      <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
        {t({
          ar: "موضوعات البحث الثمانية عشر تبقى ظاهرة. الروابط تصل إلى الأقسام القائمة؛ وجود قسم تجريبي لا يثبت اكتمال الموضوع أو صحة أرقامه. التغطية غير مقاسة.",
          en: "All eighteen research topics remain visible. Links lead to existing sections; a demonstration section does not prove completeness or numerical accuracy. Coverage is not measured.",
        })}
      </p>
      <nav
        className="mt-4 flex flex-wrap gap-2 border-b border-border pb-4"
        aria-label={t({ ar: "اختصارات قراءة الشركة", en: "Company reading shortcuts" })}
      >
        {[
          { href: "#c1", ar: "ابدأ بفهم الشركة", en: "Understand the company" },
          { href: "#c3", ar: "انتقل للقوائم والأرقام", en: "Go to statements & numbers" },
          { href: "#c6", ar: "راجع المصادر والمواد", en: "Review sources & materials" },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-full border border-border px-4 py-2 text-xs font-medium hover:border-brand hover:text-brand"
          >
            {t(item)}
          </a>
        ))}
      </nav>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {GROUPS.map((g) => (
          <div key={g.id} data-investor-group={g.id}>
            <h3 className="mb-2 text-xs font-semibold">{t(g)}</h3>
            <ul className="space-y-2">
              {g.ordinals.map((n) => {
                const topic = TOPICS[n - 1]!;
                return (
                  <li key={n} data-investor-topic={n}>
                    <a
                      href={"#" + topic[2]}
                      className="flex gap-2 text-[11px] leading-6 text-muted-foreground hover:text-foreground"
                    >
                      <span className="font-mono text-[9px] text-brand">
                        {String(n).padStart(2, "0")}
                      </span>
                      {t({ ar: topic[0], en: topic[1] })}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
