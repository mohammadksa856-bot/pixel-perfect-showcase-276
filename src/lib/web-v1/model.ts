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

/**
 * WEB-06 (D3): نص السبب العام الذي تضيفه المعاينة المجمّدة لكل موضوع (design-fixtures.server.ts).
 * يُعرض مرة واحدة على مستوى الصفحة ويُخفى من الموضوعات. يُطابق بالنص الإنجليزي حرفيًا؛ اختبار يتحقق من التطابق.
 */
export const FROZEN_SAMPLE_TOPIC_REASON_EN =
  "Frozen development sample; no approved assessment or independent financial verification.";

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

/**
 * WEB-03: الواجهة المخصصة لكل موضوع من الـ18، وما تحتاجه من البيانات لتظهر.
 * تُستخدم في الحالة الفارغة (بدل «لا توجد بيانات») وفي مصفوفة القبول. لا تُعرض أي قيمة هنا.
 */
export const TOPIC_DESIGN: Record<number, { component: LocalizedText; needs: LocalizedText }> = {
  1: {
    component: {
      ar: "بطاقة هوية: الاسم القانوني، ISIN، الإدراج، المقر، المعيار المحاسبي",
      en: "Identity card: legal name, ISIN, listing, HQ, accounting standard",
    },
    needs: { ar: "خصائص ملف الشركة بمصدر", en: "Sourced profile attributes" },
  },
  2: {
    component: {
      ar: "وصف النشاط + أشرطة الإيرادات حسب المنتج والجغرافيا + نتائج القطاعات",
      en: "Business description + revenue by product/geography bars + segment results",
    },
    needs: { ar: "إيضاح القطاعات التشغيلية (IFRS 8)", en: "Operating segment note (IFRS 8)" },
  },
  3: {
    component: {
      ar: "رئيس المجلس والرئيس التنفيذي والمراجع، ثم المجلس واللجان والمكافآت",
      en: "Chair, CEO and auditor, then board, committees and remuneration",
    },
    needs: { ar: "تقرير مجلس الإدارة والحوكمة", en: "Board and governance report" },
  },
  4: {
    component: {
      ar: "جدول كبار الملاك بأشرطة النسب وتاريخ «كما في»",
      en: "Major holders table with stake bars and as-of date",
    },
    needs: { ar: "إفصاحات الملكية المؤرخة", en: "Dated ownership disclosures" },
  },
  5: {
    component: {
      ar: "مستكشف القوائم: سنوي/ربعي/منذ بداية السنة، مقياس مليون/مليار، رسم اتجاه",
      en: "Statement explorer: annual/quarterly/YTD, million/billion scale, trend chart",
    },
    needs: { ar: "قوائم مدققة لخمس سنوات و12 ربعًا", en: "Five audited years and twelve quarters" },
  },
  6: {
    component: {
      ar: "جدول جودة الأرباح: الأرباح المعدّلة، جودة الدخل، الاستحقاقات",
      en: "Earnings-quality table: adjusted earnings, income quality, accruals",
    },
    needs: { ar: "مشتقات بمدخلات مُعاد إنتاجها", en: "Derivatives with reproduced inputs" },
  },
  7: {
    component: {
      ar: "مجموعات النسب حسب نوع الشركة (عادية/بنك/تأمين)",
      en: "Ratio sets by company type (ordinary/bank/insurer)",
    },
    needs: {
      ar: "نسب محسوبة بمعادلة ومدخلات معتمدة",
      en: "Ratios with recorded formula and approved inputs",
    },
  },
  8: {
    component: {
      ar: "مؤشرات تشغيلية خاصة بالقطاع (إنتاج، فروع، وثائق…)",
      en: "Sector operating KPIs (production, branches, policies…)",
    },
    needs: { ar: "مؤشرات القطاع في عقد الصفحة", en: "Sector KPIs delivered in the page contract" },
  },
  9: {
    component: {
      ar: "التوزيع للسهم ونسبة التوزيع + سجل إجراءات التوزيع بتواريخها",
      en: "DPS and payout + dated distribution actions log",
    },
    needs: {
      ar: "إعلانات التوزيع وإجراءات الشركة",
      en: "Dividend announcements and corporate actions",
    },
  },
  10: {
    component: {
      ar: "تصنيف القطاع والصناعة ومؤشرات القطاع المجمعة",
      en: "Sector and industry classification with aggregate sector indicators",
    },
    needs: { ar: "بيانات قطاعية من جهة رسمية", en: "Official sector datasets" },
  },
  11: {
    component: {
      ar: "جدول مقارنة النظراء (نظراء مستنتجون لا منافسون معلنون)",
      en: "Peer comparison table (inferred peers, not declared competitors)",
    },
    needs: {
      ar: "نظراء من الصناعة نفسها ببيانات قابلة للمقارنة",
      en: "Same-industry peers with comparable data",
    },
  },
  12: {
    component: {
      ar: "آخر إغلاق بتاريخه + رسم الأسعار + السيولة",
      en: "Last close with date + price chart + liquidity",
    },
    needs: { ar: "تغذية أسعار مرخصة", en: "Licensed price feed" },
  },
  13: {
    component: {
      ar: "توجيهات الإدارة كنصوص مقتبسة بمصدرها (لا أرقام متوقعة)",
      en: "Management guidance as sourced quotes (no projected figures)",
    },
    needs: { ar: "توجيهات منشورة من الشركة", en: "Company-published guidance" },
  },
  14: {
    component: {
      ar: "إجماع المحللين مع تاريخ ومصدر مرخص",
      en: "Analyst consensus with date and licensed source",
    },
    needs: { ar: "ترخيص بيانات الإجماع", en: "Consensus data licence" },
  },
  15: {
    component: {
      ar: "مكررات التقييم (P/E، P/B، عائد التوزيع) بتاريخ السعر",
      en: "Valuation multiples (P/E, P/B, yield) with price date",
    },
    needs: {
      ar: "سعر مرخص ومقاييس سهم معتمدة في التاريخ نفسه",
      en: "Licensed price and approved per-share data on the same date",
    },
  },
  16: {
    component: {
      ar: "عوامل المخاطر المصنفة + التصنيف الائتماني + استحقاقات الدين",
      en: "Classified risk factors + credit rating + debt maturities",
    },
    needs: { ar: "إفصاح المخاطر وإيضاح الدين", en: "Risk disclosure and debt note" },
  },
  17: {
    component: {
      ar: "مؤشرات الانبعاثات والطاقة والمياه بوحداتها",
      en: "Emissions, energy and water indicators with units",
    },
    needs: { ar: "تقرير استدامة بمصدر", en: "Sourced sustainability report" },
  },
  18: {
    component: {
      ar: "قائمة الإفصاحات الرسمية مرتبة زمنيًا مع نوع المستند",
      en: "Official disclosures in date order with document type",
    },
    needs: {
      ar: "إفصاحات السوق والمستندات الرسمية",
      en: "Exchange disclosures and official documents",
    },
  },
};
