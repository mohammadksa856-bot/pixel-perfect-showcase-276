/**
 * WEB-08B04 — حارس الأرقام (ENG-03، RR-ENG03-01). مسار واحد مرتب لتحليل كل رقم في نص الحزمة:
 *
 *   0. النص الخام قبل أي تنظيف: محارف رقمية غير لاتينية (أي \p{N} غير 0–9، بكل الكتابات والأشكال)
 *      ومحارف التنسيق غير المرئية (\p{Cf}). كلاهما يُرفض، لأنه يخفي الرقم أو علاقته بوحدته.
 *   1. حجب ما ليس رقمًا: التواريخ، وأكواد المراحل (WEB-08B03، B02)، وترقيم القوائم.
 *   2. لكل رقم: قراءة جانبيه محليًا بقاموس واحد للوحدات والعملات:
 *        ملاصق ← فاصل محلي (ترقيم ومسافات فقط، بلا كلمات) ← حد صلب (نقطة، شرطة، شرطة مائلة).
 *   3. التصنيف: كمية (صنف وحدة مدعوم)، أو صيغة ملتبسة (ambiguous)، أو رقم مجرد.
 *   4. الاستثناءات (سنة، رمز السهم، درجة تصنيف، عدد معلن) تُطبَّق في checkText على الرقم المجرد
 *      فقط، أي بعد التأكد من عدم وجود كمية أو التباس. لا يصبح الإعفاء مخرجًا احتياطيًا.
 *
 * تصنيف العملات:
 *   - مدعومة (صنف «عملة» يُطابَق مع الدليل): SAR وUSD وEUR وGBP، والريال والدولار واليورو والجنيه،
 *     و$ و﷼ و€ و£. الصنف عام: لا يميز أي عملة بعينها عند المطابقة مع الدليل (حد موثق).
 *   - معروفة غير مدعومة (تفشل مغلقة): كل رموز ISO 4217 الأخرى بحروف كبيرة، وقائمة شائعة بأي حالة
 *     أحرف، وأسماء عربية، وكل رمز عملة Unicode (\p{Sc}) غير $ و﷼ و€ و£، وعلامات الألف ‰ ‱ ؉ ؊.
 *   - مجهولة: أي ملاصق غير معروف للرقم يفشل مغلقًا.
 *
 * التعرف على العملة ليس اعتمادًا ماليًا للمبلغ؛ الكمية المكتشفة تمر فقط بقواعد checkText.
 */
import { ISO4217_CODES } from "./iso4217";

export type NumberToken = { n: string; classes: string[] };
/** صنف الصيغة الملتبسة: يُرفض في كل الأنواع بدل اعتبار الرقم سنة (fail closed). */
export const AMBIGUOUS = "ambiguous";
/** أقصى طول للفاصل المحلي بين الوحدة والرقم. ما بعده لا يربط، لكنه لا يمر سنةً (detached_unit). */
export const LOCAL_GAP_MAX = 6;

export type Analysed = NumberToken & {
  /** أسباب الالتباس حين توجد، بترتيب اكتشافها. */
  reasons?: AmbiguityReason[];
};
export type AmbiguityReason =
  | "non_ascii_digit"
  | "format_control"
  | "glued_unknown"
  | "unsupported_unit"
  | "hard_boundary_unit"
  | "detached_unit";

// ── 0. النص الخام
/** أي محرف رقمي Unicode غير 0–9 (Nd وNl وNo): هندية-عربية، وfullwidth، ورياضية، وأسية، وكسور… */
export const NON_ASCII_NUMBER = /[^\P{N}0-9]/u;
/** محارف التنسيق غير المرئية: ZWSP وLRM/RLM وALM وBOM وZWJ/ZWNJ والشرطة اللينة… */
export const FORMAT_CONTROL = /\p{Cf}/u;

// ── 1. ما ليس رقمًا
export const DATE = /\b\d{4}-\d{2}-\d{2}\b/g;
/** ترقيم القوائم في بداية السطر («1. »). */
const LIST_MARKER = /(^|\n)\s*\d{1,2}\.\s/g;
/** معرفات مراحل المشروع (WEB-08B03، B02). */
const CODES = /\bWEB-\d{2}[A-Z]\d{2}[A-Z]?\b|\bB0\d[A-Z]?\b/g;

// ── 2. الفواصل
/** فاصل محلي: مسافات Unicode، وأقواس، وعلامات اقتباس، ونقطتان، وفاصلة وفاصلة منقوطة (عربية ولاتينية). */
const GAP_CHARS = String.raw`\s()[\]{}«»‹›"'“”‘’„:,،;؛`;
/** حد صلب: نقطة، وشرطات، وشرطة مائلة. لا يربط وحدة برقم، لكن العملة الملاصقة له صيغة ملتبسة. */
const HARD_CHARS = String.raw`.\-‐-―/`;
const STOP = String.raw`${GAP_CHARS}${HARD_CHARS}!?؟…`;
const GAP_RUN_END = new RegExp(`[${GAP_CHARS}]*$`, "u");
const GAP_RUN_START = new RegExp(`^[${GAP_CHARS}]*`, "u");
/** آخر كلمة (بلا أرقام ولا فواصل) قبل موضع. */
const WORD_END = new RegExp(`[^${STOP}\\p{Nd}]+$`, "u");
/** أول كلمة بعد موضع. */
const WORD_START = new RegExp(`^[^${STOP}\\p{Nd}]+`, "u");
const HARD_BEFORE = new RegExp(`([^${STOP}\\p{Nd}]+)\\s*[${HARD_CHARS}]\\s*$`, "u");
const HARD_AFTER = new RegExp(`^\\s*[${HARD_CHARS}]\\s*([^${STOP}\\p{Nd}]+)`, "u");

// ── 2. القاموس
const PROCLITIC_RE = "(?:و|ف|ب|ل|ك|وب|ول|فب|فل|وك|ال|بال|لل|وال|كال|فال)ـ?";
/** سوابق عربية تلتصق بالرقم ولا تغيّر دلالته. */
const PROCLITIC = new RegExp(`^${PROCLITIC_RE}$`, "u");
/** درجة التصنيف الائتماني (Aa3، Baa1): رقم مجرد يلزم وروده في الدليل. */
const RATING_PREFIX = /^(Aa|A|Baa|Ba|B|Caa)$/;
/** علامة السنة الميلادية أو الهجرية الملاصقة. */
const YEAR_MARK = /^(م|هـ)$/u;

/** العملة المدعومة كلمةً كاملة (قبل الرقم أو بعده). */
const SUPPORTED_CURRENCY = new RegExp(
  `^(?:SAR|USD|EUR|GBP|US\\$|\\$|﷼|€|£|(?:${PROCLITIC_RE})?(?:ريال|ريالات|دولار|دولارات|يورو|جنيه))$`,
  "iu",
);
/** رموز ISO المدعومة صنفًا (عملة). */
const SUPPORTED_ISO = ["SAR", "USD", "EUR", "GBP"];
const ISO_UNSUPPORTED = new RegExp(
  `^(?:${ISO4217_CODES.filter((c) => !SUPPORTED_ISO.includes(c)).join("|")})$`,
  "u",
);
/** رموز شائعة غير مدعومة بأي حالة أحرف (ليست كلمات إنجليزية عادية). */
const COMMON_UNSUPPORTED =
  /^(?:aed|jpy|cny|rmb|inr|kwd|qar|bhd|omr|egp|chf|aud|hkd|sgd|krw|mxn|zar)$/i;
const ARABIC_UNSUPPORTED = new RegExp(
  `^(?:${PROCLITIC_RE})?(?:درهم|دراهم|دينار|دنانير|ين|ليرة|روبية|يوان|فرنك|روبل)$`,
  "u",
);
/** كل رمز عملة Unicode غير $ و﷼، وعلامات الألف. */
const SYMBOL_UNSUPPORTED = /^(?:[^\P{Sc}$﷼€£]|[‰‱؉؊])$/u;
const isUnsupported = (w: string) =>
  ISO_UNSUPPORTED.test(w) ||
  COMMON_UNSUPPORTED.test(w) ||
  ARABIC_UNSUPPORTED.test(w) ||
  SYMBOL_UNSUPPORTED.test(w) ||
  // رمز ملاصق لرمز آخر («€US»): يكفي أن يبدأ أو ينتهي بمحرف عملة غير مدعوم.
  /^[^\P{Sc}$﷼€£]|[^\P{Sc}$﷼€£]$/u.test(w);
const isCurrency = (w: string) => SUPPORTED_CURRENCY.test(w) || isUnsupported(w);

/**
 * أصناف الوحدات المدعومة بعد الرقم، تُطابَق على النص التالي لا على كلمة واحدة لأن بعضها عبارة
 * («في المئة»، «per cent»). كلمة مقياس (مليون/مليار) تُضاف إليها وحدة الكلمة التالية.
 */
/** وحدة: الصيغ العربية بادئةً (تقبل اللواحق مثل «ريالًا» و«مليارات»)، واللاتينية كلمةً كاملة. */
const unit = (arabic: string, latin: string) =>
  new RegExp(`^(?:${arabic}|(?:${latin})(?![A-Za-z]))`, "i");
const UNIT_CLASSES: [RegExp, string][] = [
  [unit("%|٪|％|في\\s?المئة|بالمئة", "percent|per\\s?cent"), "percent"],
  [unit("ريال|ريالات|دولار|دولارات|يورو|جنيه|\\$|﷼|€|£", "SAR|USD|US\\$|EUR|GBP"), "currency"],
  [unit("مليون|مليار|ألف|آلاف|تريليون", "million|mn|billion|bn|thousand|trillion"), "scale"],
  [unit("برميل|براميل|قدم|طن|أطنان", "barrels?|bbl|boe|cubic|scf|tonnes?"), "volume"],
  [
    unit("سنة|سنوات|عامًا|عاما|أعوام|شهرًا|شهرا|أشهر|شهور|يومًا|أيام", "years?|months?|days?"),
    "duration",
  ],
];
const SCALE = "scale";
const classOf = (tail: string) => UNIT_CLASSES.find(([re]) => re.test(tail))?.[1];
const isUnitAfter = (tail: string) =>
  Boolean(classOf(tail)) || isUnsupported(WORD_START.exec(tail)?.[0] ?? "");

/** النص بعد حجب ما ليس رقمًا. الطول يتغير، ولا يهم لأن التحليل نسبي لكل رقم. */
const mask = (s: string) => s.replace(DATE, " ").replace(CODES, " ").replace(LIST_MARKER, "$1");

/** يحلل كل رقم في النص بالمسار المرتب أعلاه. */
export function analyseNumbers(s: string): Analysed[] {
  const clean = mask(s);
  const hidden = FORMAT_CONTROL.test(s);
  const out: Analysed[] = [];
  for (const m of clean.matchAll(/\p{Nd}+(?:[.,]\p{Nd}+)*/gu)) {
    const raw = m[0];
    const n = raw.replace(/,/g, "");
    const before = clean.slice(0, m.index);
    const after = clean.slice(m.index! + raw.length);
    const classes = new Set<string>();
    const reasons: AmbiguityReason[] = [];
    const ambiguous = (r: AmbiguityReason) => {
      if (!reasons.includes(r)) reasons.push(r);
      classes.add(AMBIGUOUS);
    };

    if (/[^0-9.,]/.test(raw)) ambiguous("non_ascii_digit");
    if (hidden) ambiguous("format_control");

    // يسار الرقم
    const gapL = GAP_RUN_END.exec(before)![0].length;
    const wordL = WORD_END.exec(before.slice(0, before.length - gapL))?.[0] ?? "";
    if (gapL === 0 && wordL) {
      if (SUPPORTED_CURRENCY.test(wordL)) classes.add("currency");
      else if (isUnsupported(wordL)) ambiguous("unsupported_unit");
      else if (!PROCLITIC.test(wordL) && !(RATING_PREFIX.test(wordL) && /^[1-3]$/.test(n)))
        ambiguous("glued_unknown");
    } else if (wordL && isCurrency(wordL)) {
      if (gapL > LOCAL_GAP_MAX) ambiguous("detached_unit");
      else if (SUPPORTED_CURRENCY.test(wordL)) classes.add("currency");
      else ambiguous("unsupported_unit");
    } else if (!wordL) {
      const hard = HARD_BEFORE.exec(before)?.[1];
      if (hard && isCurrency(hard)) ambiguous("hard_boundary_unit");
    }

    // يمين الرقم
    const gapR = GAP_RUN_START.exec(after)![0].length;
    const tail = after.slice(gapR);
    const glued = gapR === 0 ? (WORD_START.exec(after)?.[0] ?? "") : "";
    if (glued) {
      const c = classOf(after);
      if (c) addUnit(classes, c, after);
      else if (isUnsupported(glued)) ambiguous("unsupported_unit");
      else if (!YEAR_MARK.test(glued)) ambiguous("glued_unknown");
    } else if (gapR > 0 && isUnitAfter(tail)) {
      const c = classOf(tail);
      if (gapR > LOCAL_GAP_MAX) ambiguous("detached_unit");
      else if (c) addUnit(classes, c, tail);
      else ambiguous("unsupported_unit");
    } else {
      const hard = HARD_AFTER.exec(after)?.[1];
      if (hard && (isCurrency(hard) || classOf(hard))) ambiguous("hard_boundary_unit");
    }

    const t: Analysed = { n, classes: [...classes].sort() };
    if (reasons.length) t.reasons = reasons;
    out.push(t);
  }
  return out;
}

function addUnit(classes: Set<string>, c: string, tail: string) {
  classes.add(c);
  if (c === SCALE) {
    const c2 = classOf(tail.replace(/^\S+\s*/, ""));
    if (c2) classes.add(c2);
  }
}

/**
 * الأرقام مع أصناف وحداتها (العقد العام منذ ENG-03). الفاصل الأطول من LOCAL_GAP_MAX يظهر هنا رقمًا
 * بلا صنف، كما يوثّق اختبار المراجع لحد الستة؛ وanalyseNumbers وcheckText يرفضانه (detached_unit).
 */
export function numberTokens(s: string): NumberToken[] {
  return analyseNumbers(s).map(({ n, classes, reasons }) => ({
    n,
    classes:
      reasons?.length && reasons.every((r) => r === "detached_unit")
        ? classes.filter((c) => c !== AMBIGUOUS)
        : classes,
  }));
}
