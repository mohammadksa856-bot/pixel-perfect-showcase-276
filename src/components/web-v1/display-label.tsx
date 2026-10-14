import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { displayLabel, OTHER_LANGUAGE } from "@/lib/web-v1/display-labels";

/**
 * WEB-06 (D5): تسمية عامة من المحرك (قطاع، صناعة، سوق) بلغة الواجهة.
 * المترجمة تحمل الأصل في التلميح؛ غير المترجمة تُعرض بلغتها واتجاهها مع وسم لغة قصير.
 */
export function TaxonomyLabel({
  raw,
  className,
  mark = false,
}: {
  raw: string;
  className?: string;
  /** إظهار وسم اللغة نصًا (لا تلميحًا فقط) حين لا توجد ترجمة. */
  mark?: boolean;
}) {
  const { t, locale } = useI18n();
  const d = displayLabel(raw, locale);
  return (
    <span
      className={cn("[unicode-bidi:isolate]", className)}
      lang={d.lang}
      dir={d.lang === "ar" ? "rtl" : "ltr"}
      title={d.original ?? (d.untranslated ? t(OTHER_LANGUAGE[d.lang]) : undefined)}
      data-taxonomy={raw}
      data-untranslated={d.untranslated || undefined}
    >
      {d.text}
      {mark && d.untranslated && (
        <span className="ms-1 text-[10px] text-muted-foreground" lang={locale}>
          ({t(OTHER_LANGUAGE[d.lang])})
        </span>
      )}
    </span>
  );
}

/** وسم قصير بجانب نص مصدر بلغة غير لغة الواجهة (وصف، اسم قانوني...). */
export function LanguageMark({ text }: { text: string }) {
  const { t, locale } = useI18n();
  // الأرقام والتواريخ والرموز (ISIN، العملة) لا لغة لها: لا وسم. الإنجليزية = كلمة لاتينية فعلية.
  const lang = /[؀-ۿ]/.test(text) ? "ar" : /[a-z]{3,}/.test(text) ? "en" : null;
  if (lang === null || lang === locale) return null;
  return (
    <span
      className="ms-1 inline-block rounded border border-border px-1 text-[10px] leading-4 text-muted-foreground"
      data-language-mark={lang}
    >
      {t(OTHER_LANGUAGE[lang])}
    </span>
  );
}
