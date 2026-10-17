/**
 * WEB-08B03 — طبقة المراجعة المستقلة للمصدر الأصلي (R03).
 *
 * ملاحظات المراجع المستقل على كل ادعاء مقابل التقرير الأصلي، منقولة كبيانات مراجعة لا كحقائق:
 * - لا تعدّل نص المحرك ولا موضعه؛ نص الاقتباس يبقى نص اللقطة، ويُعلَن أنه لم يُطابَق حرفيًا مع الأصل.
 * - لا تؤهل أي ادعاء ولا تفك حجبًا: هي مراجعة معنى وموضع، لا اعتماد مالي أو تحريري.
 * - المؤلف لم يطّلع على الأصل (الشبكة تحجب الناشر في بيئته)؛ المصدر هو حزمة المراجع عند SHA المرجعي.
 * الصفحات أرقام صفحات PDF، لا الأرقام المطبوعة.
 */

export const SOURCE_REVIEW_REF = {
  package: "review-delivery/WEB08B03-INDEPENDENT/RESEARCH-SOURCE-REVIEW.json",
  branch: "review/web08b03-independent-20261017",
  sha: "dcdecad97c3c8babd67931a817e69d0cd7a7d6d6",
  reviewedImplementation: "b72ad3a1c1a9d5bd43bfec78523aa287300a4639",
} as const;

export type ReviewStatus =
  | "SUPPORTED_MEANING_NOT_APPROVED"
  | "SUPPORTED_COMPOSITE_NOT_APPROVED"
  | "SUPPORTED_WITH_DERIVATION_CAVEAT"
  | "SUPPORTED_MANAGEMENT_ESTIMATE_NOT_APPROVED"
  | "SUPPORTED_TITLE_NOT_NUMERIC_APPROVAL"
  | "REVIEW"
  | "REWORK";

/**
 * - consistent: صفحة المحرك تطابق ما وجده المراجع.
 * - conflict: صفحة المحرك تخالف صفحة المراجع؛ تبقى صفحة المحرك مسجلة كما هي، ويُمنع البناء.
 * - not_located: لم يحدد المراجع موضعًا في الأصل.
 * - engine_none: لا صفحة في المحرك؛ صفحات المراجع مرجع مراجعة فقط.
 */
export type LocatorFinding = "consistent" | "conflict" | "not_located" | "engine_none";

export type SourceFinding = {
  status: ReviewStatus;
  reviewerPdfPages: number[];
  locator: LocatorFinding;
  /** نص المحرك يغيّر معنى الأصل (مثل تقوية «نحو» إلى «أكثر من»). */
  meaningConflict?: string;
  /** نص المحرك يعرض رقمًا مشتقًا كأنه منشور حرفيًا. */
  derivationInEngineText?: string;
  /** التاريخ الدقيق (اليوم) غير مثبت في المقطع الأصلي. */
  exactDateUnverified?: boolean;
  note: string;
};

export const SOURCE_REVIEW: Record<string, SourceFinding> = {
  "aramco-capex-guidance-2026": {
    status: "REVIEW",
    reviewerPdfPages: [],
    locator: "not_located",
    note: "Guidance sentence/range not located in the annual report; not a finding of falsity. Needs an exact original or release locator.",
  },
  "aramco-sales-gas-growth-2030": {
    status: "REWORK",
    reviewerPdfPages: [13, 50, 54],
    locator: "engine_none",
    meaningConflict:
      "Engine text says 'more than 80%'; the original states approximately 80% and carries demand and pre-FID project qualifications that the engine text omits.",
    note: "Engine excerpt withheld as the claim text; original wording not reproduced here.",
  },
  "aramco-msc-12mbd": {
    status: "SUPPORTED_MEANING_NOT_APPROVED",
    reviewerPdfPages: [13, 26],
    locator: "engine_none",
    note: "Maximum sustainable capacity, not actual production; no dated output forecast.",
  },
  "aramco-project-milestones-2025": {
    status: "SUPPORTED_COMPOSITE_NOT_APPROVED",
    reviewerPdfPages: [13, 15, 54],
    locator: "engine_none",
    note: "Three distinct project milestones summarised in one record. Capacities and timing appear in the original and are not extracted.",
  },
  "aramco-jafurah-midstream-contract": {
    status: "SUPPORTED_MEANING_NOT_APPROVED",
    reviewerPdfPages: [71],
    locator: "consistent",
    note: "Stand-alone FY2025 statements PDF 71 (same note at annual report PDF 231).",
  },
  "aramco-rig-purchase-commitments": {
    status: "SUPPORTED_WITH_DERIVATION_CAVEAT",
    reviewerPdfPages: [69],
    locator: "consistent",
    derivationInEngineText:
      "18 remaining offshore rigs is explicit; '36 onshore rigs' is derived (50 ordered less 14 delivered), not a printed count.",
    note: "Stand-alone FY2025 statements PDF 69 (annual report PDF 229). Currency magnitudes agree with source units.",
  },
  "aramco-contingencies-ordinary-course": {
    status: "SUPPORTED_MEANING_NOT_APPROVED",
    reviewerPdfPages: [230],
    locator: "consistent",
    note: "PDF 230 = printed 228, note 33.",
  },
  "aramco-contingencies-management-view": {
    status: "SUPPORTED_MANAGEMENT_ESTIMATE_NOT_APPROVED",
    reviewerPdfPages: [230],
    locator: "consistent",
    note: "Management expectation, not a verified outcome.",
  },
  "aramco-sadara-petro-rabigh-support": {
    status: "SUPPORTED_MEANING_NOT_APPROVED",
    reviewerPdfPages: [230, 231],
    locator: "consistent",
    note: "Note 33 spans two pages; no aggregate amount is inferred.",
  },
  "aramco-customer-credit-concentration": {
    status: "SUPPORTED_MEANING_NOT_APPROVED",
    reviewerPdfPages: [192],
    locator: "consistent",
    note: "PDF 192 = printed 190, note 3(a). Numbering basis is PDF pages.",
  },
  "aramco-hydrocarbon-risk-factors": {
    status: "REVIEW",
    reviewerPdfPages: [],
    locator: "not_located",
    note: "Composite risk summary with no exact original paragraph.",
  },
  "aramco-q4-2025-base-dividend": {
    status: "SUPPORTED_MEANING_NOT_APPROVED",
    reviewerPdfPages: [235],
    locator: "engine_none",
    note: "Board declaration (note 37), not payment.",
  },
  "aramco-q4-2025-base-dividend-action": {
    status: "SUPPORTED_MEANING_NOT_APPROVED",
    reviewerPdfPages: [235],
    locator: "engine_none",
    note: "Same declaration as the disclosure record; not a second dividend.",
  },
  "aramco-buyback-2026": {
    status: "SUPPORTED_MEANING_NOT_APPROVED",
    reviewerPdfPages: [140, 246],
    locator: "engine_none",
    note: "Approved program, not completed purchases. The original dates the approval and the 18-month term.",
  },
  "aramco-buyback-2026-action": {
    status: "SUPPORTED_MEANING_NOT_APPROVED",
    reviewerPdfPages: [140, 246],
    locator: "engine_none",
    note: "Same program; no execution asserted.",
  },
  "aramco-fy2025-results-publication": {
    status: "REVIEW",
    reviewerPdfPages: [34, 36],
    locator: "engine_none",
    note: "Publication-event metadata; exact publication date needs official release or archive proof.",
  },
  "aramco-fy2025-dividends-paid": {
    status: "SUPPORTED_TITLE_NOT_NUMERIC_APPROVAL",
    reviewerPdfPages: [40, 235],
    locator: "engine_none",
    note: "Concept supported; no amount approved.",
  },
  "aramco-petro-rabigh-stake-2025": {
    status: "REWORK",
    reviewerPdfPages: [233],
    locator: "conflict",
    exactDateUnverified: true,
    note: "Discussed at PDF 233 (printed 231), not the engine's 232. A completion announcement date is not automatically the legal effective date.",
  },
  "aramco-bonus-2023": {
    status: "REWORK",
    reviewerPdfPages: [140],
    locator: "conflict",
    exactDateUnverified: true,
    note: "PDF 140 (printed 138) supports the month; the engine's 139 points elsewhere. Exact day unverified.",
  },
  "aramco-capital-increase-2023": {
    status: "REWORK",
    reviewerPdfPages: [140],
    locator: "conflict",
    exactDateUnverified: true,
    note: "The original links the capitalisation to the bonus shares. Engine page 139 is wrong; exact day unverified.",
  },
  "aramco-bonus-2022": {
    status: "REWORK",
    reviewerPdfPages: [140],
    locator: "conflict",
    exactDateUnverified: true,
    note: "Same locator mismatch; the passage supports the month, not the exact effective day.",
  },
  "aramco-capital-increase-2022": {
    status: "REWORK",
    reviewerPdfPages: [140],
    locator: "conflict",
    exactDateUnverified: true,
    note: "Same locator mismatch; not a separately proven economic event.",
  },
};
