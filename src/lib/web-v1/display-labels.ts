import type { LocalizedText } from "@/lib/i18n";

/**
 * WEB-06 (D5): قاموس عرض قابل للمراجعة لتسميات المحرك العامة في الواجهة العربية.
 *
 * - عرض فقط: لا يغيّر مفتاحًا ولا رابطًا ولا تصنيفًا ولا بيانات. القيمة الأصلية تبقى المرجع (روابط القطاعات
 *   والبحث والتصفية تعمل على التسمية الأصلية)، وتظهر في الواجهة الإنجليزية وفي تلميح العنصر العربي.
 * - يغطي فقط التسميات الموجودة فعلًا في بيانات المعاينة (صفحات المحرك الثلاث). أي تسمية غير موجودة هنا
 *   تُعرض بلغتها الأصلية مع وسم اللغة، ولا تُترجم آليًا.
 * - ترجمة تسمية قطاع ليست إسنادًا لقطاع: الشركة لا تُنسب إلى قطاع إلا من صفحة المحرك.
 * - لا يشمل الأوصاف ولا الأسماء القانونية ولا نصوص المصدر: تبقى بلغتها.
 */
export const TAXONOMY_AR: Readonly<Record<string, string>> = {
  // القطاعات (تسمية المحرك)
  Energy: "الطاقة",
  Financials: "القطاع المالي",
  // الصناعات (تسمية المحرك)
  "Integrated Oil & Gas": "النفط والغاز المتكاملة",
  Banks: "البنوك",
  Insurance: "التأمين",
  // السوق
  "Saudi Exchange": "السوق المالية السعودية",
};

export type DisplayLabel = {
  /** النص المعروض بلغة الواجهة. */
  text: string;
  /** لغة النص المعروض (لاتجاهه ووسمه). */
  lang: "ar" | "en";
  /** التسمية الأصلية إن عُرضت ترجمتها (للتلميح)، أو null. */
  original: string | null;
  /** النص بلغة غير لغة الواجهة ولا ترجمة معتمدة له في القاموس. */
  untranslated: boolean;
};

const hasArabic = (s: string) => /[؀-ۿ]/.test(s);

/** تسمية عامة من المحرك بلغة الواجهة إن وُجدت في القاموس، وإلا بلغتها الأصلية مع وسم. */
export function displayLabel(raw: string, locale: string): DisplayLabel {
  const sourceLang = hasArabic(raw) ? "ar" : "en";
  if (locale === "ar" && sourceLang === "en") {
    const ar = TAXONOMY_AR[raw];
    return ar
      ? { text: ar, lang: "ar", original: raw, untranslated: false }
      : { text: raw, lang: "en", original: null, untranslated: true };
  }
  return { text: raw, lang: sourceLang, original: null, untranslated: locale !== sourceLang };
}

/** نص بسيط (لعناصر select وtitle): الترجمة المعروضة أو الأصل. */
export const labelText = (raw: string, locale: string) => displayLabel(raw, locale).text;

/** كل الصيغ المعروضة لتسمية (للبحث بالعربية عن تسمية أصلها إنجليزي). */
export const labelVariants = (raw: string): string[] =>
  TAXONOMY_AR[raw] ? [raw, TAXONOMY_AR[raw]!] : [raw];

/** وسم قصير لنص معروض بغير لغة الواجهة (D5). */
export const OTHER_LANGUAGE: Record<"ar" | "en", LocalizedText> = {
  en: { ar: "بالإنجليزية في المصدر", en: "In English in the source" },
  ar: { ar: "بالعربية في المصدر", en: "In Arabic in the source" },
};
