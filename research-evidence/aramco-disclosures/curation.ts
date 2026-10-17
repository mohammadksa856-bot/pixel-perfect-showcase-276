/**
 * WEB-08B03 — قرارات التصنيف البشرية القابلة للمراجعة لإفصاحات أرامكو الموجودة في العينة المجمدة.
 *
 * هذا الملف هو المكان الوحيد الذي تُتخذ فيه قرارات تحريرية (النوع، الفئة، الموضوع، فترة الأثر، الاقتباس).
 * - كل اقتباس `quote` يجب أن يكون جزءًا حرفيًا من نص المحرك (`body_text` أو `title`)؛ الاختبار يرفض أي إعادة صياغة.
 * - لا قيم مالية هنا: الأرقام تبقى في سجلات المحرك، وتُعرض عند الحاجة منها مع حالة عدم التأهيل.
 * - نتائج القوائم المالية لا تُقتبس؛ تُربط بـ Marefa Data (لا قاعدة مالية موازية).
 * - الفئة: official_fact (واقعة رسمية منشورة)، management_plan (خطة/توجيه/هدف/توقع إدارة)،
 *   assumption (افتراض)، research_opinion (رأي بحثي). لا يوجد في هذه الدفعة افتراض أو رأي بحثي معتمد.
 */
import type { TOPICS } from "../v1/contract";

export type Topic = (typeof TOPICS)[number];
export type Category = "official_fact" | "management_plan" | "assumption" | "research_opinion";
export type EventType =
  | "capital_guidance"
  | "strategy_target"
  | "project_milestone"
  | "commercial_contract"
  | "purchase_commitment"
  | "contingency"
  | "customer_credit_concentration"
  | "risk_factor"
  | "dividend_declaration"
  | "dividend_paid"
  | "buyback_program"
  | "acquisition"
  | "bonus_shares"
  | "capital_increase"
  | "results_publication";

/** فترة الأثر كما يذكرها المصدر فقط. ما لا يذكره المصدر = not_disclosed، ولا يُستنتج. */
export type EffectPeriod =
  | { kind: "fiscal_year"; fiscalYear: number; note: string }
  | { kind: "as_of"; date: string; note: string }
  | { kind: "reporting_period"; start: string; end: string; note: string }
  | { kind: "through_year"; baseYear: number | null; targetYear: number; note: string }
  | { kind: "term"; years: number | null; months: number | null; start: null; note: string }
  | { kind: "event_date"; date: string; note: string }
  | { kind: "not_disclosed"; note: string };

/** مرجع سجل في لقطة المحرك. للإفصاحات لا يوجد معرف ثابت، فالمفتاح مركّب ومعلَن كفجوة. */
export type RecordRef =
  | { section: "disclosures"; type: string; title: string; publishedAt: string; version: number }
  | { section: "corporate_actions"; actionKey: string; version: number };

export type ClaimCuration = {
  id: string;
  /** نوع الحدث بعد التصنيف (قد يخالف تصنيف المحرك؛ انظر override). */
  eventType: EventType;
  category: Category;
  /** للخطط: نوعها الفرعي، دون تحويلها إلى واقعة. */
  planKind?: "issuer_guidance" | "management_target" | "management_expectation";
  topic: Topic;
  crossTopics: Topic[];
  /** اقتباس حرفي من النص، أو null حين لا يُقتبس (نتائج مالية → Marefa Data). */
  quote: string | null;
  quoteField: "body_text" | "title";
  effect: EffectPeriod;
  /** حدث واحد قد يظهر في أكثر من سجل؛ نفس eventId يجمعها دون عدّها مرتين. */
  eventId: string;
  projectIds: string[];
  /** حين يخالف تصنيفنا تصنيف المحرك: السبب. لا يُعدّل المحرك. */
  override?: string;
  /** ربط Marefa Data بدل الاقتباس (مثلًا للنتائج والتوزيعات المدفوعة). */
  marefaDataTab?: "financials" | "shareholders" | "business" | "market" | "risks";
  rationale: string;
};

export type DocumentCuration = {
  record: DisclosureRef;
  family: "annual_report" | "interim_report" | "earnings_release";
  edition: string;
};

export type CurationEntry = { record: RecordRef; claims: ClaimCuration[] } | DocumentCuration;

type DisclosureRef = Extract<RecordRef, { section: "disclosures" }>;
const D = (type: string, title: string, publishedAt: string, version = 1): DisclosureRef => ({
  section: "disclosures",
  type,
  title,
  publishedAt,
  version,
});
const A = (actionKey: string, version = 1): RecordRef => ({
  section: "corporate_actions",
  actionKey,
  version,
});

/** الوثائق (إصدارات تقارير) — ليست أحداثًا. */
export const DOCUMENT_CURATION: DocumentCuration[] = [
  {
    record: D("interim_report", "Saudi Aramco H1 2026 interim report", "2026-08-04"),
    family: "interim_report",
    edition: "H1/Q2 2026",
  },
  {
    record: D("interim_report", "Saudi Aramco Q1 2026 interim report", "2026-05-11"),
    family: "interim_report",
    edition: "Q1 2026",
  },
  {
    record: D("annual_report", "Saudi Aramco Annual Report 2025", "2026-03-09"),
    family: "annual_report",
    edition: "FY 2025",
  },
  {
    record: D("earnings_release", "FY 2025 earnings release", "2026-03-09"),
    family: "earnings_release",
    edition: "FY 2025",
  },
];

/** الأحداث والادعاءات المرشحة. */
export const CLAIM_CURATION: { record: RecordRef; claims: ClaimCuration[] }[] = [
  {
    record: D("guidance", "2026 capital investment guidance", "2026-03-09"),
    claims: [
      {
        id: "aramco-capex-guidance-2026",
        eventType: "capital_guidance",
        category: "management_plan",
        planKind: "issuer_guidance",
        topic: "forecasts",
        crossTopics: ["financials"],
        quote:
          "Aramco stated 2026 capital investment guidance of USD 50 billion to USD 55 billion.",
        quoteField: "body_text",
        effect: { kind: "fiscal_year", fiscalYear: 2026, note: "التوجيه لسنة 2026 كما ورد" },
        eventId: "evt-capex-guidance-2026",
        projectIds: [],
        rationale:
          "توجيه مُصدر لفترة مستقبلية: temporalBasis=issuer_guidance، لا يُعرض كبيان فعلي ولا يُقارن بإنفاق فعلي.",
      },
    ],
  },
  {
    record: D("strategy_update", "2030 gas growth and crude capacity strategy", "2026-03-09"),
    claims: [
      {
        id: "aramco-sales-gas-growth-2030",
        eventType: "strategy_target",
        category: "management_plan",
        planKind: "management_target",
        topic: "forecasts",
        crossTopics: ["operations"],
        quote:
          "Aramco targets growth in sales gas production capacity of more than 80% by 2030 compared with 2021 levels",
        quoteField: "body_text",
        effect: {
          kind: "through_year",
          baseYear: 2021,
          targetYear: 2030,
          note: "هدف إدارة مقابل مستوى 2021",
        },
        eventId: "evt-strategy-2030",
        projectIds: ["sales-gas-growth-2030"],
        rationale: "هدف إداري لا إنجاز؛ لا يُحوَّل إلى سعة فعلية أو توقع إنتاج.",
      },
      {
        id: "aramco-msc-12mbd",
        eventType: "strategy_target",
        category: "management_plan",
        planKind: "management_target",
        topic: "forecasts",
        crossTopics: ["operations"],
        quote: "while maintaining maximum sustainable crude capacity at 12 million barrels per day",
        quoteField: "body_text",
        effect: {
          kind: "not_disclosed",
          note: "الجملة لا تذكر تاريخًا للحفاظ على السعة؛ عنوان السجل يذكر 2030 ولا يُنسب إليها بالاستنتاج",
        },
        eventId: "evt-strategy-2030",
        projectIds: ["msc-12mbd"],
        rationale:
          "خطة إدارة (الحفاظ على سعة)، ليست قياس إنتاج فعلي، ولا تاريخ مستهدف منسوب إليها.",
      },
    ],
  },
  {
    record: D("material_event", "Jafurah, Tanajib and Marjan project milestones", "2026-03-09"),
    claims: [
      {
        id: "aramco-project-milestones-2025",
        eventType: "project_milestone",
        category: "official_fact",
        topic: "operations",
        crossTopics: ["business"],
        quote:
          "Jafurah commenced production, Tanajib commenced operations, and the Marjan increment came onstream during the period covered by the 2025 report.",
        quoteField: "body_text",
        effect: {
          kind: "reporting_period",
          start: "2025-01-01",
          end: "2025-12-31",
          note: "خلال فترة تقرير 2025؛ التاريخ الدقيق لكل مرحلة غير معلن في السجل",
        },
        eventId: "evt-projects-2025",
        projectIds: ["jafurah", "tanajib", "marjan-increment"],
        rationale: "واقعة منشورة عن حالة التنفيذ؛ لا سعة ولا تكلفة في السجل.",
      },
    ],
  },
  {
    record: D("commercial_contract", "Jafurah midstream minimum-volume commitment", "2026-03-10"),
    claims: [
      {
        id: "aramco-jafurah-midstream-contract",
        eventType: "commercial_contract",
        category: "official_fact",
        topic: "business",
        crossTopics: ["operations", "risks"],
        quote:
          "Aramco retained exclusive use of the Jafurah Field Gas Plant and Riyas NGL Fractionation Plant for 20 years under a quarterly volume-based tariff backed by minimum volume commitments.",
        quoteField: "body_text",
        effect: {
          kind: "term",
          years: 20,
          months: null,
          start: null,
          note: "مدة 20 سنة؛ تاريخ بدايتها غير معلن في السجل",
        },
        eventId: "evt-jafurah-midstream",
        projectIds: ["jafurah"],
        rationale:
          "شروط عقد منشورة. الحجم الملتزم به غير منشور صراحةً ويبقى مجهولًا (المصدر نفسه يقول ذلك).",
      },
    ],
  },
  {
    record: D("purchase_commitment", "Guaranteed offshore and onshore rig purchases", "2026-03-10"),
    claims: [
      {
        id: "aramco-rig-purchase-commitments",
        eventType: "purchase_commitment",
        category: "official_fact",
        topic: "risks",
        crossTopics: ["operations"],
        quote:
          "At year-end 2025, Aramco-related entities had remaining guaranteed commitments for 18 offshore rigs valued at SAR 22.275 billion and 36 onshore rigs valued at SAR 6.789 billion.",
        quoteField: "body_text",
        effect: {
          kind: "as_of",
          date: "2025-12-31",
          note: "رصيد التزام في نهاية 2025؛ جدول التسليم والدفع غير معلن في السجل",
        },
        eventId: "evt-rig-commitments",
        projectIds: [],
        rationale: "التزام قائم (تعرض)، لا إنفاق رأسمالي فعلي ولا توقع إنفاق.",
      },
    ],
  },
  {
    record: D(
      "contingency",
      "Ordinary-course disputed matters and project support obligations",
      "2026-03-09",
    ),
    claims: [
      {
        id: "aramco-contingencies-ordinary-course",
        eventType: "contingency",
        category: "official_fact",
        topic: "risks",
        crossTopics: [],
        quote:
          "Aramco reports contingent assets and liabilities arising from contractor claims, lawsuits and arbitrations in the ordinary course of business.",
        quoteField: "body_text",
        effect: { kind: "as_of", date: "2025-12-31", note: "كما في نهاية 2025" },
        eventId: "evt-contingencies-2025",
        projectIds: [],
        rationale: "واقعة منشورة: وجود مطالبات ونزاعات اعتيادية؛ لا مبلغ مجمّع منشور.",
      },
      {
        id: "aramco-contingencies-management-view",
        eventType: "contingency",
        category: "management_plan",
        planKind: "management_expectation",
        topic: "risks",
        crossTopics: [],
        quote: "Management does not anticipate material adjustments from those matters.",
        quoteField: "body_text",
        effect: { kind: "as_of", date: "2025-12-31", note: "تقدير الإدارة كما في نهاية 2025" },
        eventId: "evt-contingencies-2025",
        projectIds: [],
        rationale: "توقع إدارة، يُفصل عن الواقعة ولا يُعرض كنتيجة مؤكدة.",
      },
      {
        id: "aramco-sadara-petro-rabigh-support",
        eventType: "contingency",
        category: "official_fact",
        topic: "risks",
        crossTopics: ["business"],
        quote:
          "The note separately describes support and guarantee arrangements involving Sadara and Petro Rabigh, but does not publish one aggregate contingency amount.",
        quoteField: "body_text",
        effect: { kind: "as_of", date: "2025-12-31", note: "كما في نهاية 2025" },
        eventId: "evt-contingencies-2025",
        projectIds: [],
        rationale:
          "واقعة منشورة عن وجود ترتيبات دعم وضمان؛ المبلغ المجمّع غير منشور ويبقى مجهولًا.",
      },
    ],
  },
  {
    record: D(
      "customer_concentration",
      "Global customer base limits geographic credit concentration",
      "2026-03-09",
    ),
    claims: [
      {
        id: "aramco-customer-credit-concentration",
        eventType: "customer_credit_concentration",
        category: "official_fact",
        topic: "risks",
        crossTopics: [],
        quote:
          "Aramco states that its trade receivables arise from a global customer base, limiting geographic concentration of credit risk.",
        quoteField: "body_text",
        effect: { kind: "as_of", date: "2025-12-31", note: "كما في نهاية 2025" },
        eventId: "evt-customer-credit-2025",
        projectIds: [],
        rationale:
          "بيان المُصدر عن تركّز الائتمان؛ لا مبلغ أو نسبة لعميل رئيسي منشورة، فلا يُستنتج تركّز رقمي.",
      },
    ],
  },
  {
    record: D("risk_factor", "Hydrocarbon market and production risks", "2026-03-09"),
    claims: [
      {
        id: "aramco-hydrocarbon-risk-factors",
        eventType: "risk_factor",
        category: "official_fact",
        topic: "risks",
        crossTopics: ["industry"],
        quote:
          "Results are exposed to crude oil and gas prices, global demand, regulation and government production decisions, in addition to operational, project and geopolitical risks.",
        quoteField: "body_text",
        effect: { kind: "as_of", date: "2025-12-31", note: "كما وردت في تقرير 2025" },
        eventId: "evt-risk-factors-2025",
        projectIds: [],
        rationale: "عوامل مخاطر يفصح عنها المُصدر؛ لا قياس حساسية ولا ترتيب أهمية من عندنا.",
      },
    ],
  },
  {
    record: D("guidance", "Fourth quarter 2025 base dividend", "2026-03-09"),
    claims: [
      {
        id: "aramco-q4-2025-base-dividend",
        eventType: "dividend_declaration",
        category: "official_fact",
        topic: "dividends_actions",
        crossTopics: [],
        quote: "The Board declared a fourth-quarter 2025 base dividend",
        quoteField: "body_text",
        effect: {
          kind: "not_disclosed",
          note: "تواريخ الاستحقاق والدفع غير معلنة في السجل",
        },
        eventId: "evt-q4-2025-base-dividend",
        projectIds: [],
        override:
          "المحرك يصنّف هذا السجل disclosure_type=guidance، لكن نصه إعلان مجلس عن توزيع مُقرّ؛ صُنّف واقعةً رسمية. لم يُعدَّل المحرك.",
        marefaDataTab: "shareholders",
        rationale: "إعلان توزيع مُقرّ، لا توجيه؛ المبلغ يبقى في سجل المحرك.",
      },
    ],
  },
  {
    record: A("sa:2222:dividend:2025:q4-base"),
    claims: [
      {
        id: "aramco-q4-2025-base-dividend-action",
        eventType: "dividend_declaration",
        category: "official_fact",
        topic: "dividends_actions",
        crossTopics: [],
        quote: "Fourth quarter 2025 base dividend",
        quoteField: "title",
        effect: { kind: "not_disclosed", note: "لا تاريخ استحقاق أو دفع في السجل" },
        eventId: "evt-q4-2025-base-dividend",
        projectIds: [],
        marefaDataTab: "shareholders",
        rationale: "السجل الثاني للحدث نفسه (إجراء شركة)؛ يُجمع مع الإفصاح ولا يُعدّ مرتين.",
      },
    ],
  },
  {
    record: D("material_event", "Share buyback program", "2026-03-09"),
    claims: [
      {
        id: "aramco-buyback-2026",
        eventType: "buyback_program",
        category: "official_fact",
        topic: "dividends_actions",
        crossTopics: [],
        quote:
          "Aramco announced a share buyback program of up to SAR 11.3 billion, equivalent to USD 3 billion, over 18 months.",
        quoteField: "body_text",
        effect: {
          kind: "term",
          years: null,
          months: 18,
          start: null,
          note: "18 شهرًا؛ بداية التنفيذ وما نُفّذ منه غير معلنين في السجل",
        },
        eventId: "evt-buyback-2026",
        projectIds: [],
        rationale: "الإعلان واقعة؛ التنفيذ خلال 18 شهرًا غير مُبلغ عنه، فلا يُفترض تنفيذ أي جزء.",
      },
    ],
  },
  {
    record: A("sa:2222:buyback:2026"),
    claims: [
      {
        id: "aramco-buyback-2026-action",
        eventType: "buyback_program",
        category: "official_fact",
        topic: "dividends_actions",
        crossTopics: [],
        quote: "Share buyback program up to SAR 11.3 billion",
        quoteField: "title",
        effect: { kind: "term", years: null, months: 18, start: null, note: "كما في الإفصاح" },
        eventId: "evt-buyback-2026",
        projectIds: [],
        rationale: "السجل الثاني للحدث نفسه؛ يُجمع مع الإفصاح.",
      },
    ],
  },
  {
    record: D("financial_results_announcement", "FY 2025 financial results", "2026-03-09"),
    claims: [
      {
        id: "aramco-fy2025-results-publication",
        eventType: "results_publication",
        category: "official_fact",
        topic: "financials",
        crossTopics: ["news"],
        quote: null,
        quoteField: "body_text",
        effect: { kind: "fiscal_year", fiscalYear: 2025, note: "نتائج السنة المالية 2025" },
        eventId: "evt-fy2025-results",
        projectIds: [],
        marefaDataTab: "financials",
        rationale:
          "نص السجل يحمل أرقام القوائم المالية؛ لا تُقتبس هنا (لا قاعدة مالية موازية). الرابط إلى Marefa Data.",
      },
    ],
  },
  {
    record: A("sa:2222:dividends:fy2025-paid"),
    claims: [
      {
        id: "aramco-fy2025-dividends-paid",
        eventType: "dividend_paid",
        category: "official_fact",
        topic: "dividends_actions",
        crossTopics: ["financials"],
        quote: "FY 2025 dividends paid (aggregate)",
        quoteField: "title",
        effect: { kind: "fiscal_year", fiscalYear: 2025, note: "مجموع ما دُفع خلال 2025" },
        eventId: "evt-fy2025-dividends-paid",
        projectIds: [],
        marefaDataTab: "shareholders",
        rationale: "رقم مدفوع من القوائم؛ يُعرض في Marefa Data ولا يُكرر هنا.",
      },
    ],
  },
  {
    record: A("sa:2222:acquisition:petro-rabigh:2025"),
    claims: [
      {
        id: "aramco-petro-rabigh-stake-2025",
        eventType: "acquisition",
        category: "official_fact",
        topic: "dividends_actions",
        crossTopics: ["business"],
        quote: "Acquisition of an additional 22.5% stake in Petro Rabigh",
        quoteField: "title",
        effect: { kind: "event_date", date: "2025-10-09", note: "تاريخ السريان في سجل المحرك" },
        eventId: "evt-petro-rabigh-2025",
        projectIds: [],
        rationale: "صفقة مكتملة؛ ليست مشروعًا. مصدرها تقرير لاحق (استرجاعي).",
      },
    ],
  },
  ...(
    [
      [
        "sa:2222:bonus:2023",
        "2023 bonus share issue",
        "bonus_shares",
        "2023-05-08",
        "evt-bonus-2023",
      ],
      [
        "sa:2222:capital-increase:2023",
        "2023 capital increase through retained earnings capitalization",
        "capital_increase",
        "2023-05-08",
        "evt-capital-increase-2023",
      ],
      [
        "sa:2222:bonus:2022",
        "2022 bonus share issue",
        "bonus_shares",
        "2022-05-12",
        "evt-bonus-2022",
      ],
      [
        "sa:2222:capital-increase:2022",
        "2022 capital increase through retained earnings capitalization",
        "capital_increase",
        "2022-05-12",
        "evt-capital-increase-2022",
      ],
    ] as const
  ).map(([key, title, type, date, eventId]) => ({
    record: A(key),
    claims: [
      {
        id: `aramco-${key.split(":").slice(2).join("-")}`,
        eventType: type,
        category: "official_fact" as const,
        topic: "dividends_actions" as const,
        crossTopics: ["ownership"] as Topic[],
        quote: title,
        quoteField: "title" as const,
        effect: { kind: "event_date" as const, date, note: "تاريخ السريان في سجل المحرك" },
        eventId,
        projectIds: [],
        rationale:
          "حدث مستقل. زيادة رأس المال بالرسملة وإصدار المنحة في التاريخ نفسه قد يكونان حدثًا واحدًا؛ لم يُربطا دون تأكيد (قرار مطلوب في تقرير الفجوات). المصدر تقرير لاحق.",
      },
    ],
  })),
];

/** نموذج المشاريع: ما لا يذكره المصدر يبقى not_disclosed. لا سعة ولا تكلفة ولا موعد مستنتج. */
export type ProjectCuration = {
  id: string;
  name: string;
  kind: "project" | "program_target";
  /** معرفات الادعاءات التي تصف المشروع (الوصف والحالة من اقتباساتها فقط). */
  claimIds: string[];
  executionStatus:
    | { state: "commenced_production" | "commenced_operations" | "onstream"; claimId: string }
    | { state: "target"; claimId: string }
    | { state: "not_disclosed" };
  /** ادعاء يذكر السعة أو نموها نصًا كهدف إدارة؛ تبقى نصًا في الاقتباس ولا تُستخرج قيمة. */
  capacityStatedIn?: string;
  /** مقاييس منشورة ذات صلة في صفحة المحرك (روابط فقط، لا قيم ولا أثر محسوب). */
  relatedEngineMetrics: string[];
};

export const PROJECT_CURATION: ProjectCuration[] = [
  {
    id: "jafurah",
    name: "Jafurah",
    kind: "project",
    claimIds: ["aramco-project-milestones-2025", "aramco-jafurah-midstream-contract"],
    executionStatus: { state: "commenced_production", claimId: "aramco-project-milestones-2025" },
    relatedEngineMetrics: ["total_gas_production"],
  },
  {
    id: "tanajib",
    name: "Tanajib",
    kind: "project",
    claimIds: ["aramco-project-milestones-2025"],
    executionStatus: { state: "commenced_operations", claimId: "aramco-project-milestones-2025" },
    relatedEngineMetrics: ["total_gas_production"],
  },
  {
    id: "marjan-increment",
    name: "Marjan increment",
    kind: "project",
    claimIds: ["aramco-project-milestones-2025"],
    executionStatus: { state: "onstream", claimId: "aramco-project-milestones-2025" },
    relatedEngineMetrics: ["total_liquids_production", "total_gas_production"],
  },
  {
    id: "sales-gas-growth-2030",
    name: "Sales gas capacity growth to 2030",
    kind: "program_target",
    claimIds: ["aramco-sales-gas-growth-2030"],
    executionStatus: { state: "target", claimId: "aramco-sales-gas-growth-2030" },
    capacityStatedIn: "aramco-sales-gas-growth-2030",
    relatedEngineMetrics: ["total_gas_production"],
  },
  {
    id: "msc-12mbd",
    name: "Maximum sustainable crude capacity",
    kind: "program_target",
    claimIds: ["aramco-msc-12mbd"],
    executionStatus: { state: "target", claimId: "aramco-msc-12mbd" },
    capacityStatedIn: "aramco-msc-12mbd",
    relatedEngineMetrics: ["total_liquids_production"],
  },
];
