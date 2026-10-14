import { Link } from "@tanstack/react-router";
import { ui, useI18n, type LocalizedText } from "@/lib/i18n";
import { DIRECTORY_DEFAULT_SEARCH } from "@/lib/web-v1/catalog";
import { KNOWLEDGE_DEFAULTS, RESEARCH_DEFAULTS } from "@/lib/web-v1/library";

/**
 * WEB-05B (إصلاح حدود المعاينة): تذييل المعاينة المستقل. التذييل الإنتاجي (site-footer.tsx) لم يُعدَّل.
 * - كل رابط هنا يبقى داخل /preview/web-v1.
 * - ما لم يُنفَّذ في المعاينة يُعرض نصًا بشارة "خارج المعاينة"، لا رابطًا إلى صفحة قديمة.
 * - WEB-06 (D10، قرار معتمد): متابعتي والمجتمع والحسابات والاشتراكات وإرسال النشرة وظائف مؤجلة؛ أُزيلت
 *   مداخلها من التذييل (لا شارات ولا نموذج معطّل يبدو قابلًا للتشغيل). سجلها في
 *   product-tracking/SCOPE_DEFERRED.md. لا يُعاد إدخال التذييل الإنتاجي ولا نماذج الكتابة.
 * - صفحات ما قبل الإطلاق (من نحن، التواصل، الخصوصية، الشروط) تُذكر نصًا عاديًا فقط، دون محتوى مخترع.
 */
const AVAILABLE = [
  { to: "/preview/web-v1/markets", label: ui.markets, search: undefined },
  { to: "/preview/web-v1/sectors", label: ui.sectors, search: { q: "" } },
  { to: "/preview/web-v1/companies", label: ui.companies, search: DIRECTORY_DEFAULT_SEARCH },
  { to: "/preview/web-v1/research", label: ui.research, search: RESEARCH_DEFAULTS },
  { to: "/preview/web-v1/knowledge", label: ui.knowledge, search: KNOWLEDGE_DEFAULTS },
] as const;

/** صفحات مطلوبة قبل الإطلاق، ليست جزءًا من هذه المعاينة (نص عادي، لا روابط ولا أزرار). */
export const NOT_IN_PREVIEW: { key: string; label: LocalizedText }[] = [
  { key: "about", label: { ar: "من نحن", en: "About" } },
  { key: "contact", label: { ar: "تواصل معنا", en: "Contact" } },
  { key: "privacy", label: { ar: "سياسة الخصوصية", en: "Privacy" } },
  { key: "terms", label: { ar: "الشروط والأحكام", en: "Terms" } },
];

export function PreviewFooter() {
  const { t } = useI18n();
  return (
    <footer className="night-panel mt-16 border-t border-border/40" data-preview-footer>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="font-display text-lg font-bold">
            {t({ ar: "معرفة استثمار", en: "Marefa Invest" })}
          </div>
          <p className="mt-2 text-[13px] leading-6 text-night-foreground/65">
            {t({
              ar: "معاينة تصميم بعينات مجمّدة. الروابط هنا تبقى داخل المعاينة.",
              en: "A design preview on frozen samples. Links here stay inside the preview.",
            })}
          </p>
        </div>

        <nav aria-label={t({ ar: "صفحات المعاينة", en: "Preview pages" })}>
          <h2 className="text-[13px] font-semibold">
            {t({ ar: "متاح في المعاينة", en: "Available in this preview" })}
          </h2>
          <ul className="mt-3 space-y-2 text-[13px]">
            {AVAILABLE.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to as never}
                  search={l.search as never}
                  className="text-night-foreground/75 hover:text-night-foreground"
                  data-footer-link={l.to}
                >
                  {t(l.label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-[13px] font-semibold">
            {t({ ar: "صفحات لم تُبنَ في المعاينة", en: "Pages not built in this preview" })}
          </h2>
          <p className="mt-3 text-[12px] leading-6 text-night-foreground/70" data-not-in-preview>
            {NOT_IN_PREVIEW.map((x, i) => (
              <span key={x.key} data-not-in-preview-item={x.key}>
                {i > 0 && t({ ar: "، ", en: ", " })}
                {t(x.label)}
              </span>
            ))}
            {t({ ar: ". مطلوبة قبل الإطلاق.", en: ". Required before launch." })}
          </p>
        </div>
      </div>
    </footer>
  );
}
