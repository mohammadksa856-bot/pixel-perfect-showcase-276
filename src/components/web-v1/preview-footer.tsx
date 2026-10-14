import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { ui, useI18n, type LocalizedText } from "@/lib/i18n";
import { DIRECTORY_DEFAULT_SEARCH } from "@/lib/web-v1/catalog";
import { KNOWLEDGE_DEFAULTS, RESEARCH_DEFAULTS } from "@/lib/web-v1/library";

/**
 * WEB-05B (إصلاح حدود المعاينة): تذييل المعاينة المستقل. التذييل الإنتاجي (site-footer.tsx) لم يُعدَّل.
 * - كل رابط هنا يبقى داخل /preview/web-v1.
 * - ما لم يُنفَّذ في المعاينة يُعرض نصًا بشارة "خارج المعاينة"، لا رابطًا إلى صفحة قديمة.
 * - نموذج النشرة البريدية معطّل: لا يستورد Supabase ولا يرسل أي بيانات.
 */
const AVAILABLE = [
  { to: "/preview/web-v1/markets", label: ui.markets, search: undefined },
  { to: "/preview/web-v1/sectors", label: ui.sectors, search: { q: "" } },
  { to: "/preview/web-v1/companies", label: ui.companies, search: DIRECTORY_DEFAULT_SEARCH },
  { to: "/preview/web-v1/research", label: ui.research, search: RESEARCH_DEFAULTS },
  { to: "/preview/web-v1/knowledge", label: ui.knowledge, search: KNOWLEDGE_DEFAULTS },
] as const;

/** صفحات قائمة في الموقع أو مخططة، ليست جزءًا من هذه المعاينة. */
export const NOT_IN_PREVIEW: { key: string; label: LocalizedText }[] = [
  { key: "watchlist", label: { ar: "متابعتي", en: "Watchlist" } },
  { key: "community", label: ui.community },
  { key: "accounts", label: { ar: "الحسابات والاشتراكات", en: "Accounts and subscriptions" } },
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
            {t({ ar: "لم يُنفَّذ في المعاينة بعد", en: "Not in this preview yet" })}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-1.5" data-not-in-preview>
            {NOT_IN_PREVIEW.map((x) => (
              <li
                key={x.key}
                className="rounded-md border border-night-foreground/15 px-2 py-0.5 text-[12px] text-night-foreground/55"
                data-not-in-preview-item={x.key}
              >
                {t(x.label)}
              </li>
            ))}
          </ul>

          <form
            className="mt-6"
            onSubmit={(e) => e.preventDefault()}
            data-preview-form="newsletter"
            aria-describedby="newsletter-disabled-note"
          >
            <label className="text-[13px] font-semibold" htmlFor="preview-newsletter-email">
              {t({ ar: "النشرة البريدية", en: "Newsletter" })}
            </label>
            <div className="mt-2 flex overflow-hidden rounded-xl border border-night-foreground/15 opacity-60">
              <input
                id="preview-newsletter-email"
                type="email"
                disabled
                placeholder={t({ ar: "بريدك الإلكتروني", en: "Your email" })}
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[13px] outline-none"
              />
              <button
                type="submit"
                disabled
                className="flex items-center gap-1.5 bg-night-foreground/10 px-3 text-[12px]"
              >
                <Lock className="size-3.5" />
                {t(ui.subscribe)}
              </button>
            </div>
            <p
              id="newsletter-disabled-note"
              className="mt-2 text-[11px] leading-5 text-night-foreground/55"
            >
              {t({
                ar: "معطّل في المعاينة: لا يُرسل أي بريد ولا يُكتب شيء.",
                en: "Disabled in this preview: no email is sent and nothing is written.",
              })}
            </p>
          </form>
        </div>
      </div>
    </footer>
  );
}
