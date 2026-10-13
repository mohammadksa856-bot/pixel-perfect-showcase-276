import type { LocalizedText } from "@/lib/i18n";
import type { FactoryCondition } from "@/lib/engine/readiness";

/**
 * MAREFA-WEB-V1: قالب صفحة الشركة بخمس مجموعات تغطي موضوعات المستثمر الثمانية عشر،
 * كل موضوع في مجموعة واحدة فقط. الترقيم هو ترقيم المحرك (understanding 18-categories-v1).
 * تبويب «تغطية البيانات» منفصل: يعرض عقد المصنع (الفئات التشغيلية) ولا يخلطه بالموضوعات.
 */
export const COMPANY_GROUPS = [
  {
    id: "business",
    title: { ar: "الشركة ونشاطها", en: "The business" },
    question: {
      ar: "من هي الشركة، وكيف تكسب، ومع من تتنافس؟",
      en: "Who is the company, how does it earn, and who does it compete with?",
    },
    topics: [1, 2, 10, 11],
  },
  {
    id: "financials",
    title: { ar: "الأداء المالي", en: "Financial performance" },
    question: {
      ar: "ما الأرقام المنشورة، وما جودة الأرباح، وكيف تعمل الشركة؟",
      en: "What do the reported figures say, how good are the earnings, and how does it operate?",
    },
    topics: [5, 6, 7, 8],
  },
  {
    id: "shareholders",
    title: { ar: "المساهمون والحوكمة", en: "Shareholders and governance" },
    question: {
      ar: "من يملك الشركة ويديرها، وماذا يعود على المساهم؟",
      en: "Who owns and runs the company, and what do shareholders receive?",
    },
    topics: [4, 9, 3],
  },
  {
    id: "market",
    title: { ar: "السوق والتقييم", en: "Market and valuation" },
    question: {
      ar: "كيف يتداول السهم، وما تقييمه، وما المتوقع؟",
      en: "How does the share trade, how is it valued, and what is expected?",
    },
    topics: [12, 15, 13, 14],
  },
  {
    id: "risks",
    title: { ar: "المخاطر والإفصاحات", en: "Risks and disclosures" },
    question: {
      ar: "ما المخاطر، وما الأثر البيئي، وما آخر ما أفصحت عنه الشركة؟",
      en: "What are the risks, the environmental footprint, and the latest disclosures?",
    },
    topics: [16, 17, 18],
  },
] as const satisfies readonly {
  id: string;
  title: LocalizedText;
  question: LocalizedText;
  topics: readonly number[];
}[];

export type GroupId = (typeof COMPANY_GROUPS)[number]["id"];
export type CompanyTab = GroupId | "coverage";
export const COMPANY_TABS: readonly CompanyTab[] = [...COMPANY_GROUPS.map((g) => g.id), "coverage"];

export const COVERAGE_TAB = {
  title: { ar: "تغطية البيانات", en: "Data coverage" },
  question: {
    ar: "هل اكتملت بيانات الشركة وفق عقد المصنع (18 فئة تشغيلية، هدف 95%)؟",
    en: "Is the company's data complete under the factory contract (18 operational categories, 95% target)?",
  },
};

export const CONDITION_TEXT: Record<FactoryCondition["key"], LocalizedText> = {
  weighted_coverage_95: {
    ar: "التغطية الموزونة 95% أو أكثر",
    en: "Weighted coverage of 95% or more",
  },
  every_category_threshold: {
    ar: "كل فئة تبلغ حدّها الخاص",
    en: "Every category meets its own threshold",
  },
  all_gates_evaluated: { ar: "كل البوابات الصارمة قُيّمت", en: "Every hard gate was evaluated" },
  all_gates_passed: { ar: "كل البوابات الصارمة نجحت", en: "Every hard gate passed" },
  approved_assessment: {
    ar: "التقييم معتمد من مراجع",
    en: "The assessment is approved by a reviewer",
  },
};

/** نص سبب من رموز المحرك والواجهة. الرموز المركّبة (category_threshold:key) تُفكّ هنا. */
export function readinessReason(
  code: string,
  categoryTitle: (key: string) => LocalizedText | undefined,
): LocalizedText {
  const [kind, key, n] = code.split(":");
  const cat = key ? categoryTitle(key) : undefined;
  const name = (l: "ar" | "en") => cat?.[l] ?? key ?? "";
  switch (kind) {
    case "category_threshold":
      return { ar: `«${name("ar")}» دون حدّها`, en: `“${name("en")}” is below its threshold` };
    case "hard_gate_failed":
      return {
        ar: `بوابة صارمة فشلت في «${name("ar")}» (${n})`,
        en: `A hard gate failed in “${name("en")}” (${n})`,
      };
    case "hard_gate_evaluator_required":
      return {
        ar: `بوابة في «${name("ar")}» لم تُقيَّم بعد`,
        en: `A gate in “${name("en")}” has not been evaluated yet`,
      };
  }
  return (
    REASONS[code] ?? {
      ar: code.replace(/_/g, " "),
      en: code.replace(/_/g, " "),
    }
  );
}

const REASONS: Record<string, LocalizedText> = {
  weighted_coverage_95: { ar: "التغطية الموزونة دون 95%", en: "Weighted coverage below 95%" },
  not_in_contract: {
    ar: "لا يرسل عقد هذه الصفحة هذا التقييم",
    en: "This page contract does not carry this assessment",
  },
  run_factory_contract_readiness: {
    ar: "لم يُشغَّل تقييم عقد المصنع لهذه الشركة بعد",
    en: "The factory contract assessment has not been run for this company yet",
  },
  total_includes_not_applicable_credit: {
    ar: "المجموع يتضمن درجة لفئة غير منطبقة، فيُحجب حتى يُعتمد استبعادها من المجموع",
    en: "The total includes credit for a not-applicable category, so it is withheld until that credit is removed",
  },
  approved_assessment_missing: {
    ar: "لا يوجد تقييم معتمد بعد",
    en: "No approved assessment yet",
  },
  engine_ready_inconsistent: {
    ar: "المحرك يقول «جاهز» لكن الشروط لا تثبت ذلك",
    en: "The engine says “ready” but the conditions do not prove it",
  },
  categories_incomplete: {
    ar: "التقييم لا يشمل الفئات الثماني عشرة كلها",
    en: "The assessment does not cover all 18 categories",
  },
  scoring_model_mismatch: { ar: "نموذج تقييم غير متوقع", en: "Unexpected scoring model" },
  investor_score_not_excluded: {
    ar: "لم يؤكد المحرك استبعاد درجة موضوعات المستثمر",
    en: "The engine did not confirm the investor-topics score is excluded",
  },
  target_not_95: { ar: "الهدف المرسل ليس 95", en: "The target sent is not 95" },
  hard_gates_missing: {
    ar: "لا توجد بوابات صارمة في التقييم",
    en: "No hard gates in the assessment",
  },
  not_applicable_scored: {
    ar: "فئة غير منطبقة تحمل درجة",
    en: "A not-applicable category carries a score",
  },
  not_applicable_without_cited_rule: {
    ar: "غير منطبقة دون قاعدة مستشهد بها",
    en: "Not applicable without a cited rule",
  },
  category_not_assessed: { ar: "لم تُقيَّم هذه الفئة", en: "This category was not assessed" },
  five_annual_periods: { ar: "أقل من 5 سنوات مالية", en: "Fewer than 5 fiscal years" },
  twelve_quarters_when_available: { ar: "أقل من 12 ربعًا", en: "Fewer than 12 quarters" },
  required_core_fields: { ar: "حقول أساسية مطلوبة ناقصة", en: "Required core fields missing" },
  score_below_target: { ar: "الدرجة دون 95", en: "Score below 95" },
  unknown_state: { ar: "حالة لا يعرفها العقد", en: "State unknown to the contract" },
};
