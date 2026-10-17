/**
 * WEB-08B04 — مخطط حزمة البحث الاستثماري لأرامكو (2222).
 *
 * كل فقرة تحمل نوعًا دلاليًا وحالة مشتقة منه، ومراجع أدلة قابلة للحل آليًا. لا قيم مالية:
 * المراجع إلى مقاييس المحرك هويات (المفتاح، الفترة، البُعد، الموضع) لا أرقام، والأرقام في Marefa Data.
 */
import type { TOPICS } from "../v1/contract";

export type Topic = (typeof TOPICS)[number];
export type Bi = { ar: string; en: string };

/**
 * - reported_record: ما يقوله سجل المحرك عن المُصدر (نص أو هوية حقيقة). لم يُطابَق مع الأصل؛ WITHHELD.
 * - management_plan: توجيه أو هدف أو توقع إدارة من ادعاءات B03؛ مستقبلي، لا نتيجة؛ WITHHELD.
 * - research_interpretation: تفسير بحثي يربط الأدلة؛ غير معتمد.
 * - assumption: افتراض يحتاجه تحليل لاحق؛ غير معتمد، ولا رقم فيه.
 * - scenario: سيناريو نوعي؛ ليس نتيجة ولا توقعًا، ولا رقم فيه.
 * - methodology: تعريف أو طريقة تحليل؛ بانتظار الاعتماد.
 * - gap: فجوة دليل أو مصدر صريحة.
 */
export type Kind =
  | "reported_record"
  | "management_plan"
  | "research_interpretation"
  | "assumption"
  | "scenario"
  | "methodology"
  | "gap";

export type Status =
  | "WITHHELD"
  | "UNAPPROVED_INTERPRETATION"
  | "UNAPPROVED_ASSUMPTION"
  | "UNAPPROVED_SCENARIO"
  | "METHODOLOGY_PENDING_APPROVAL"
  | "OPEN_GAP";

/** الحالة ليست اختيارًا للمؤلف: تُشتق من النوع، ولا يوجد نوع يؤدي إلى «معتمد». */
export const STATUS_OF_KIND: Record<Kind, Status> = {
  reported_record: "WITHHELD",
  management_plan: "WITHHELD",
  research_interpretation: "UNAPPROVED_INTERPRETATION",
  assumption: "UNAPPROVED_ASSUMPTION",
  scenario: "UNAPPROVED_SCENARIO",
  methodology: "METHODOLOGY_PENDING_APPROVAL",
  gap: "OPEN_GAP",
};

export type MetricBucket =
  | "annual"
  | "quarter"
  | "ytd"
  | "instant"
  | "history_annual"
  | "history_position"
  | "history_quarter";

/** مراجعات مستقلة خارج هذا الفرع: تُذكر بالمسار وSHA فقط، ولا تُنسخ. */
export const EXTERNAL_REVIEWS = {
  CODEX_B03_ACCEPT: {
    sha: "4f7145e6927ff98559ccf82dfb6103b6953c3892",
    path: "review-delivery/WEB08B03-REREVIEW/FINDINGS.json",
    note: "B03 engineering ACCEPT, local prototype only; financial, editorial, live and release gates BLOCKED.",
  },
  CAPITAL_INVESTMENT_GUIDANCE: {
    sha: "4f7145e6927ff98559ccf82dfb6103b6953c3892",
    path: "review-delivery/WEB08B03-REREVIEW/RESEARCH-DECISIONS.json",
    note: "Official alternative source for the 2026 capital investment guidance located (FY2025 results press release, PDF page 1, web date 2026-03-10); not bound to the claim.",
  },
  GAS_TARGET: {
    sha: "4f7145e6927ff98559ccf82dfb6103b6953c3892",
    path: "review-delivery/WEB08B03-REREVIEW/RESEARCH-DECISIONS.json",
    note: "Conflict confirmed: the original uses an approximation, not 'more than'; demand and pre-FID qualifications apply. Withholding preserved.",
  },
  BONUS_CAPITALISATION: {
    sha: "4f7145e6927ff98559ccf82dfb6103b6953c3892",
    path: "review-delivery/WEB08B03-REREVIEW/RESEARCH-DECISIONS.json",
    note: "Relation supported (annual PDF 140); merge deferred; exact dates not established.",
  },
  // ملاحظات المراجع المستقل على الأصل في مراجعة B04 (fa3a772). بيانات مراجعة، لا تحقق ولا اعتماد.
  B04_LIQUIDS_SCOPE: {
    sha: "fa3a772daabaaecb44ee2eff842bb88456025f62",
    path: "review-delivery/WEB08B04-INDEPENDENT/FINDINGS.json#FIN-01",
    note: "Annual report PDF 52 footnote 1: total liquids include crude oil, condensate and NGL; maximum sustainable capacity is a crude-only target.",
  },
  B04_JAFURAH_NOTE34: {
    sha: "fa3a772daabaaecb44ee2eff842bb88456025f62",
    path: "review-delivery/WEB08B04-INDEPENDENT/FINDINGS.json#FIN-04",
    note: "Annual report PDF 231 (note 34): Aramco retains title and operational control of the Jafurah assets; upfront proceeds are non-controlling-interest equity at consolidation; commencement and relief conditions are not established.",
  },
  B04_TRANSFER_PRICING: {
    sha: "fa3a772daabaaecb44ee2eff842bb88456025f62",
    path: "review-delivery/WEB08B04-INDEPENDENT/RESEARCH-NOTES.json#in-transfer-gap",
    note: "Annual report PDF 196 (note 4): intersegment transfers on an arm's-length basis, with a pricing-basis change effective October 2024. Located, not bound.",
  },
  B04_SEGMENT_REVENUE_SCOPE: {
    sha: "fa3a772daabaaecb44ee2eff842bb88456025f62",
    path: "review-delivery/WEB08B04-INDEPENDENT/FINANCIAL-ANALYSIS-REVIEW.json#fa-revenue",
    note: "Annual report PDF 52/58 and note 4: segment revenue includes intersegment and other sales-related income; external and internal revenue are distinguished.",
  },
  B04_ISSUER_DEFINITIONS: {
    sha: "fa3a772daabaaecb44ee2eff842bb88456025f62",
    path: "review-delivery/WEB08B04-INDEPENDENT/FINANCIAL-ANALYSIS-REVIEW.json",
    note: "Annual report PDF 45-47: ROACE definition revised (new/old bridge, no implicit comparable series); issuer EBIT definition includes finance-income treatment; free cash flow = operating cash flow less capital expenditure.",
  },
  B04_PETRO_RABIGH_CONTROL: {
    sha: "fa3a772daabaaecb44ee2eff842bb88456025f62",
    path: "review-delivery/WEB08B04-INDEPENDENT/RESEARCH-NOTES.json#dn-petro-rabigh",
    note: "Annual report note 41 footnote 3: an acquired percentage does not by itself establish control or the consolidation basis.",
  },
} as const;
export type ExternalReviewId = keyof typeof EXTERNAL_REVIEWS;

export type Ref =
  | { t: "b03_claim"; id: string }
  | { t: "b03_project"; id: string }
  | { t: "b03_event"; id: string }
  | { t: "engine_profile"; field: string }
  | { t: "engine_ownership"; holder: string }
  | { t: "engine_metric"; key: string; bucket: MetricBucket; dims?: Record<string, string> }
  | { t: "b02_withheld"; metric: string }
  | { t: "b02_document"; key: string }
  | { t: "engine_capability"; name: string }
  | { t: "external_review"; id: ExternalReviewId };

export type Paragraph = {
  id: string;
  kind: Kind;
  topics: Topic[];
  ar: string;
  /** null = الترجمة الإنجليزية لم تُكتب بعد؛ البنية تسمح بها دون تغيير المعرفات. */
  en: string | null;
  refs: Ref[];
  /** أرقام في النص تخص الحزمة نفسها (عدد الموضوعات أو الادعاءات)، وتُتحقق من مصدرها آليًا. */
  metaNumbers?: string[];
};

/** تحليل مالي كمي: مُعرَّف ومُهيكل، ومحجوب حتى تتأهل مدخلاته. */
export type Analysis = {
  id: string;
  title: Bi;
  topics: Topic[];
  definition: { ar: string; basis: "ifrs_line_item" | "issuer_non_ifrs" | "standard_ratio" };
  inputs: { key: string; bucket: MetricBucket; dims?: Record<string, string> }[];
  /** هويات من سجل B02 (المدخلات الـ142) يحتاجها التحليل. */
  b02Inputs: string[];
  /** مخرجات تحتاج تعريفًا مربوطًا قبل أي حساب (بوابة تعريف لكل مخرج). */
  gates?: string[];
  questions: string[];
  drivers: Paragraph[];
};

export type ProjectNote = {
  /** معرف مشروع في سجل B03 المقبول هندسيًا. */
  b03ProjectId: string;
  nature: Paragraph;
  purpose: Paragraph;
  risks: Paragraph[];
  gaps: Paragraph[];
};

export type Section = {
  id: string;
  title: Bi;
  paragraphs: Paragraph[];
  analyses?: Analysis[];
  projects?: ProjectNote[];
};
