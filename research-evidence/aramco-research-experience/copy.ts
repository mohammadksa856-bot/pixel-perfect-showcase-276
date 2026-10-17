/**
 * WEB-08B05 — نصوص الواجهة (لا نص بحثي هنا). النص البحثي كله من حزمة B04 كما هو.
 * التسميات تصف البنية والحالة فقط، ولا تضيف ادعاءً عن أرامكو.
 */
import type { Bi } from "../aramco-research-pack/schema";
import type { Kind } from "../aramco-research-pack/schema";

export type Lang = "ar" | "en";
export const tr = (b: Bi, l: Lang) => b[l];

export type Tone = "withheld" | "target" | "brand" | "warn" | "scenario" | "neutral" | "bad" | "ok";

export const KIND: Record<Kind, { label: Bi; hint: Bi; tone: Tone }> = {
  reported_record: {
    label: { ar: "سجل المحرك", en: "Engine record" },
    hint: {
      ar: "ما يقوله سجل المحرك؛ لم يُطابَق مع الأصل، ومحجوب",
      en: "What the engine record says; not matched to the original, withheld",
    },
    tone: "withheld",
  },
  management_plan: {
    label: { ar: "توجيه إدارة", en: "Management guidance" },
    hint: {
      ar: "هدف أو توجيه مستقبلي من الإدارة؛ ليس نتيجة",
      en: "A forward target or guidance from management; not a result",
    },
    tone: "target",
  },
  research_interpretation: {
    label: { ar: "تفسير بحثي", en: "Research interpretation" },
    hint: {
      ar: "قراءة بحثية تربط الأدلة؛ غير معتمدة",
      en: "A research reading linking the evidence; unapproved",
    },
    tone: "brand",
  },
  assumption: {
    label: { ar: "افتراض", en: "Assumption" },
    hint: {
      ar: "افتراض يحتاجه تحليل لاحق؛ بلا أرقام، غير معتمد",
      en: "An assumption a later analysis needs; no figures, unapproved",
    },
    tone: "warn",
  },
  scenario: {
    label: { ar: "سيناريو نوعي", en: "Qualitative scenario" },
    hint: {
      ar: "سيناريو نوعي؛ ليس توقعًا ولا نتيجة، بلا أرقام",
      en: "A qualitative scenario; not a forecast or a result, no figures",
    },
    tone: "scenario",
  },
  methodology: {
    label: { ar: "طريقة تحليل", en: "Methodology" },
    hint: { ar: "تعريف أو طريقة بانتظار الاعتماد", en: "A definition or method pending approval" },
    tone: "neutral",
  },
  gap: {
    label: { ar: "فجوة", en: "Gap" },
    hint: {
      ar: "فجوة دليل أو مصدر معلنة؛ لا تُكمَّل",
      en: "A declared evidence or source gap; not filled in",
    },
    tone: "bad",
  },
};

export const STATUS: Record<string, Bi> = {
  WITHHELD: { ar: "محجوب", en: "Withheld" },
  UNAPPROVED_INTERPRETATION: { ar: "تفسير غير معتمد", en: "Unapproved interpretation" },
  UNAPPROVED_ASSUMPTION: { ar: "افتراض غير معتمد", en: "Unapproved assumption" },
  UNAPPROVED_SCENARIO: { ar: "سيناريو غير معتمد", en: "Unapproved scenario" },
  METHODOLOGY_PENDING_APPROVAL: { ar: "بانتظار الاعتماد", en: "Pending approval" },
  OPEN_GAP: { ar: "فجوة مفتوحة", en: "Open gap" },
  REVIEW_RECORD_NOT_APPROVAL: { ar: "سجل مراجعة، لا اعتماد", en: "Review record, not approval" },
  PARTIAL: { ar: "جزئي", en: "Partial" },
  UNAVAILABLE: { ar: "غير متاح", en: "Unavailable" },
  BLOCKED: { ar: "محجوب كميًا", en: "Quantitatively blocked" },
};

export const REF_TYPE: Record<string, Bi> = {
  b03_claim: { ar: "ادعاء B03", en: "B03 claim" },
  b03_project: { ar: "مشروع B03", en: "B03 project" },
  b03_event: { ar: "حدث B03", en: "B03 event group" },
  engine_profile: { ar: "ملف التعريف", en: "Engine profile" },
  engine_ownership: { ar: "سجل الملكية", en: "Ownership record" },
  engine_metric: { ar: "هوية مقياس", en: "Metric identity" },
  b02_withheld: { ar: "مدخل B02 محجوب", en: "Withheld B02 input" },
  b02_document: { ar: "مستند B02", en: "B02 document" },
  engine_capability: { ar: "قدرة المحرك", en: "Engine capability" },
  external_review: { ar: "مراجعة مستقلة", en: "Independent review" },
};

export const BLOCKER: Record<string, Bi> = {
  B02_WITHHELD_INPUT: {
    ar: "مدخل من المدخلات الـ142 المحجوبة في B02",
    en: "One of the 142 withheld B02 inputs",
  },
  NO_FINANCIAL_REVIEW: { ar: "لا مراجعة مالية مخولة", en: "No authorised financial review" },
  UNREVIEWED_ENGINE_FACT: {
    ar: "حقيقة محرك لم تُراجع مقابل الأصل",
    en: "Engine fact not reviewed against the original",
  },
  ISSUER_DEFINITION_NOT_BOUND: {
    ar: "تعريف المُصدر (غير IFRS) غير مربوط",
    en: "Issuer (non-IFRS) definition not bound",
  },
  UNAPPROVED_DERIVED_METRIC: { ar: "مقياس مشتق غير معتمد", en: "Unapproved derived metric" },
  OUTPUT_DEFINITION_NOT_BOUND: { ar: "تعريف المخرج غير مربوط", en: "Output definition not bound" },
};
export const blockerLabel = (code: string, l: Lang) => {
  const [head, gate] = code.split(":");
  const b = BLOCKER[head!];
  return b ? `${b[l]}${gate ? ` (${gate})` : ""}` : code;
};

export const INPUT_STATUS: Record<string, Bi> = {
  B02_WITHHELD_INPUT: { ar: "محجوب ضمن الـ142", en: "Withheld (one of the 142)" },
  UNREVIEWED_ENGINE_FACT: { ar: "حقيقة محرك غير مراجعة", en: "Unreviewed engine fact" },
  UNAPPROVED_DERIVED_METRIC: { ar: "مشتق غير معتمد", en: "Unapproved derived metric" },
  NOT_IN_SNAPSHOT: { ar: "غير موجود في اللقطة", en: "Not in the snapshot" },
};

export const BASIS_LABEL: Record<string, Bi> = {
  ifrs_line_item: { ar: "بند IFRS", en: "IFRS line item" },
  issuer_non_ifrs: { ar: "مقياس المُصدر (غير IFRS)", en: "Issuer measure (non-IFRS)" },
  standard_ratio: { ar: "نسبة معيارية", en: "Standard ratio" },
};

export const FIELD: Record<string, Bi> = {
  commenced_production: {
    ar: "بدأ الإنتاج (تقرير 2025)",
    en: "Commenced production (2025 report)",
  },
  commenced_operations: {
    ar: "بدأ التشغيل (تقرير 2025)",
    en: "Commenced operations (2025 report)",
  },
  onstream: { ar: "دخل الخدمة (تقرير 2025)", en: "Came onstream (2025 report)" },
  target: { ar: "هدف إدارة، لا إنجاز", en: "Management target, not an achievement" },
  stated_in_engine_quote_not_extracted: {
    ar: "مذكور في مقطع المحرك؛ لم يُستخرج",
    en: "Stated in the engine excerpt; not extracted",
  },
  in_original_per_independent_review_not_extracted: {
    ar: "في الأصل وفق المراجع؛ لم يُستخرج",
    en: "In the original per the reviewer; not extracted",
  },
  not_in_engine_record_original_unchecked: {
    ar: "غير مذكور في السجل؛ الأصل لم يُفحص",
    en: "Not in the record; original unchecked",
  },
};

export const GAP_KIND: Record<string, Bi> = {
  financial_input: { ar: "مدخلات مالية", en: "Financial inputs" },
  issuer_definition: { ar: "تعريفات المُصدر", en: "Issuer definitions" },
  source: { ar: "المصادر", en: "Sources" },
  coverage: { ar: "التغطية", en: "Coverage" },
  claim_qualification: { ar: "تأهيل الادعاءات", en: "Claim qualification" },
};

export const PART_TITLE: Record<string, Bi> = {
  overview: { ar: "نظرة بحثية عامة", en: "Research overview" },
  business: { ar: "نموذج الأعمال", en: "Business model" },
  projects: { ar: "المشاريع والنمو", en: "Projects and growth" },
  financial: { ar: "المحركات المالية", en: "Financial drivers" },
  risks: { ar: "المخاطر والتوقعات", en: "Risks and outlook" },
  topics: { ar: "الموضوعات الثمانية عشر", en: "The 18 investor topics" },
};

export const SUB: Record<string, Bi> = {
  "overview.status": { ar: "حالة البحث", en: "Research status" },
  "overview.intro": { ar: "أرامكو ونموذج أعمالها", en: "Aramco and its business model" },
  "overview.map": { ar: "خريطة القطاعات وقنوات الإيراد", en: "Segments and revenue channels" },
  "overview.drivers": { ar: "محركات الأداء الاقتصادي", en: "Economic performance drivers" },
  "overview.projects": { ar: "المشاريع والأحداث الرئيسية", en: "Key projects and milestones" },
  "overview.risks": { ar: "المخاطر والفجوات باختصار", en: "Risks and gaps at a glance" },
  "overview.scope": { ar: "نطاق البحث وحدوده", en: "Scope and limits of the research" },
  "business.ownership": { ar: "الملكية والحوكمة والتصنيف", en: "Ownership, governance and rating" },
  "business.upstream": { ar: "التنقيب والإنتاج (Upstream)", en: "Upstream" },
  "business.downstream": {
    ar: "التكرير والكيميائيات والتسويق (Downstream)",
    en: "Downstream: refining, chemicals and marketing",
  },
  "business.revenue": { ar: "تولّد الإيرادات والأرباح", en: "How revenue and earnings arise" },
  "business.integration": {
    ar: "التكامل والتعاملات بين القطاعات",
    en: "Integration and inter-segment dealings",
  },
  "business.drivers": {
    ar: "السعر والكمية والهامش والطاقة",
    en: "Price, volume, margin and capacity",
  },
  "projects.program": { ar: "إطار المشاريع والإنفاق", en: "Project frame and capital spending" },
  "projects.reported": { ar: "تحقق في فترة تقرير 2025", en: "Reached in the 2025 report period" },
  "projects.targets": { ar: "أهداف الإدارة — ليست نتائج", en: "Management targets — not results" },
  "projects.relations": {
    ar: "علاقة المشاريع بمحركات الأداء والمخاطر",
    en: "How projects relate to drivers and risks",
  },
  "financial.frame": {
    ar: "إطار التحليل والتغطية الزمنية",
    en: "Analysis frame and time coverage",
  },
  "risks.disclosures": {
    ar: "إفصاحات رسمية (سجل المحرك)",
    en: "Official disclosures (engine record)",
  },
  "risks.guidance": { ar: "توجيهات الإدارة", en: "Management guidance" },
  "risks.interpretations": { ar: "تفسيرات بحثية للمخاطر", en: "Research interpretations of risk" },
  "risks.assumptions": { ar: "افتراضات", en: "Assumptions" },
  "risks.scenarios": { ar: "سيناريوهات نوعية", en: "Qualitative scenarios" },
  "risks.gaps": { ar: "فجوات المعلومات", en: "Information gaps" },
  "risks.register": { ar: "سجل الفجوات", en: "Gap register" },
};

/** تسمية قصيرة لموضع الفقرة الأساسي (للروابط من خريطة الموضوعات والعلاقات). */
export const SLOT_SHORT: Record<string, Bi> = {
  "overview.intro": { ar: "نظرة عامة", en: "Overview" },
  "overview.scope": { ar: "نطاق البحث", en: "Scope" },
  "business.ownership": { ar: "الملكية والحوكمة", en: "Ownership and governance" },
  "business.upstream": { ar: "التنقيب والإنتاج", en: "Upstream" },
  "business.downstream": { ar: "التكرير والكيميائيات", en: "Downstream" },
  "business.revenue": { ar: "الإيرادات", en: "Revenue" },
  "business.integration": { ar: "التكامل", en: "Integration" },
  "business.drivers": { ar: "المحركات", en: "Drivers" },
  "projects.program": { ar: "إطار المشاريع", en: "Project frame" },
  "financial.frame": { ar: "إطار التحليل", en: "Analysis frame" },
  "risks.disclosures": { ar: "إفصاحات", en: "Disclosures" },
  "risks.guidance": { ar: "توجيهات", en: "Guidance" },
  "risks.interpretations": { ar: "قراءة المخاطر", en: "Risk reading" },
  "risks.assumptions": { ar: "افتراضات", en: "Assumptions" },
  "risks.scenarios": { ar: "سيناريوهات", en: "Scenarios" },
  "risks.gaps": { ar: "فجوات", en: "Gaps" },
};

export const VIA: Record<string, Bi> = {
  b03_project: { ar: "سجل المشروع في B03", en: "B03 project record" },
  b03_claim: { ar: "ادعاء المشروع في B03", en: "B03 project claim" },
};

export const RISK_CATEGORY: Record<string, Bi> = {
  "rk-int-operational": { ar: "تشغيلية", en: "Operational" },
  "rk-int-financial": { ar: "مالية", en: "Financial" },
  "rk-int-sector": { ar: "قطاعية", en: "Sector" },
  "rk-int-geopolitical": {
    ar: "جيوسياسية وسياسات الإنتاج",
    en: "Geopolitical and production policy",
  },
};

/** تسميات هويات المقاييس في خريطة الأعمال (أبعاد المحرك كما هي، مترجمة كتسمية فقط). */
export const DIM: Record<string, Bi> = {
  Upstream: { ar: "التنقيب والإنتاج", en: "Upstream" },
  Downstream: { ar: "التكرير والكيميائيات والتسويق", en: "Downstream" },
  Corporate: { ar: "الشركة (مركزي)", en: "Corporate" },
  "Crude oil": { ar: "النفط الخام", en: "Crude oil" },
  "Refined and chemical products": {
    ar: "المنتجات المكررة والكيميائية",
    en: "Refined and chemical products",
  },
  "Natural gas and NGLs": { ar: "الغاز الطبيعي وسوائله", en: "Natural gas and NGLs" },
  "In-Kingdom": { ar: "داخل المملكة", en: "In-Kingdom" },
  "Out-of-Kingdom": { ar: "خارج المملكة", en: "Out-of-Kingdom" },
};

export const UI = {
  brand: { ar: "معرفة استثمار", en: "Marefa Investment" },
  privateReader: { ar: "قارئ بحث خاص · محلي", en: "Private research reader · local" },
  title: { ar: "أرامكو السعودية (2222)", en: "Saudi Aramco (2222)" },
  subtitle: {
    ar: "بحث استثماري متعمق: نموذج الأعمال، والمشاريع، والمحركات المالية، والمخاطر — مع أدلة كل فقرة وفجواتها.",
    en: "In-depth investment research: business model, projects, financial drivers and risks — with each paragraph's evidence and gaps.",
  },
  draftBanner: {
    ar: "مسودة بحث غير معتمدة · محجوبة · محلية فقط · لا تُنشر",
    en: "Unapproved research draft · withheld · local only · not for publication",
  },
  draftDetail: {
    ar: "القبول الهندسي لحزمة البحث لا يصرّح بعرض محتواها على الموقع العام. لا فقرة معتمدة، ولا رقم مالي في هذه الصفحة؛ الأرقام في بيانات معرفة عبر الروابط.",
    en: "Engineering acceptance of the research pack does not authorise showing it on the public site. No paragraph is approved and this page shows no financial figure; figures live in Marefa Data via the links.",
  },
  snapshot: { ar: "تاريخ اللقطة", en: "Snapshot date" },
  researchStatus: { ar: "حالة البحث", en: "Research status" },
  researchStatusValue: { ar: "مسودة غير معتمدة", en: "Unapproved draft" },
  engineering: { ar: "القبول الهندسي (B04)", en: "Engineering acceptance (B04)" },
  analysesBlocked: { ar: "تحليلات كمية محجوبة", en: "Quantitative analyses blocked" },
  claimsWithheld: { ar: "ادعاءات محجوبة", en: "Claims withheld" },
  inputsWithheld: { ar: "مدخلات مالية محجوبة", en: "Financial inputs withheld" },
  qualified: { ar: "مدخلات مؤهلة ماليًا", en: "Financially qualified inputs" },
  kinds: { ar: "أنواع الفقرات", en: "Paragraph kinds" },
  contents: { ar: "فهرس البحث", en: "Research contents" },
  skip: { ar: "انتقل إلى المحتوى", en: "Skip to content" },
  language: { ar: "English", en: "العربية" },
  languageLabel: { ar: "التبديل إلى الإنجليزية", en: "Switch to Arabic" },
  evidence: { ar: "الأدلة", en: "Evidence" },
  primaryTopic: { ar: "الموضوع الأساسي", en: "Primary topic" },
  alsoTopics: { ar: "يمس أيضًا", en: "Also touches" },
  arabicOriginal: { ar: "النص العربي الأصلي", en: "Arabic original — English translation pending" },
  englishDraft: { ar: "نص إنجليزي", en: "English text: author draft, unapproved" },
  sourcePage: { ar: "صفحة المحرك", en: "Engine page" },
  table: { ar: "جدول", en: "Table" },
  filed: { ar: "تاريخ الإفصاح", en: "Filed" },
  periods: { ar: "الفترات", en: "Periods" },
  sources: { ar: "المصادر", en: "Sources" },
  multiSource: { ar: "مصادر متعددة؛ لكل صف مصدره", en: "Multiple sources; each row keeps its own" },
  inIntelligence: { ar: "في تحليل الشركة", en: "In Company Intelligence" },
  inData: { ar: "في بيانات معرفة", en: "In Marefa Data" },
  notRendered: { ar: "غير معروض في تحليل الشركة", en: "Not rendered in Company Intelligence" },
  chartOnly: { ar: "منحنى دون تركيز", en: "Chart, no focus" },
  notInRegister: { ar: "خارج سجل الروابط", en: "Not in the link register" },
  appLinksDisabled: {
    ar: "روابط التطبيق معطلة: APP_BASE مرفوض",
    en: "App links disabled: APP_BASE rejected",
  },
  noValues: { ar: "هويات فقط، بلا قيم", en: "Identities only, no values" },
  measures: { ar: "ما الذي يقيسه", en: "What it measures" },
  investorQuestions: {
    ar: "لماذا يهم المستثمر: الأسئلة التي يجيب عنها",
    en: "Why it matters: the questions it answers",
  },
  drivers: { ar: "العوامل الاقتصادية المؤثرة", en: "Economic factors" },
  inputs: { ar: "المدخلات اللازمة", en: "Required inputs" },
  b02Inputs: { ar: "مدخلات B02 المحجوبة", en: "Withheld B02 inputs" },
  whyBlocked: { ar: "سبب الحجب الحالي", en: "Why it is blocked now" },
  basis: { ar: "الأساس", en: "Basis" },
  input: { ar: "المدخل", en: "Input" },
  status: { ar: "الحالة", en: "Status" },
  link: { ar: "الرابط", en: "Link" },
  observations: { ar: "ملاحظة", en: "observations" },
  blockedNote: {
    ar: "إطار تحليل متاح للقراءة. كل نتيجة كمية محجوبة حتى تتأهل مدخلاتها وتُربط تعريفاتها.",
    en: "A readable analysis frame. Every quantitative result is blocked until its inputs qualify and its definitions are bound.",
  },
  projectStatus: { ar: "حالة التنفيذ", en: "Execution status" },
  capacity: { ar: "السعة", en: "Capacity" },
  timing: { ar: "التوقيت", en: "Timing" },
  cost: { ar: "التكلفة", en: "Cost" },
  qualification: { ar: "التأهيل", en: "Qualification" },
  milestone: { ar: "إنجاز مسجل (محجوب)", en: "Recorded milestone (withheld)" },
  target: { ar: "هدف إدارة", en: "Management target" },
  relationRule: {
    ar: "العلاقة تعني أن الفقرة تستشهد بهوية دليل تخص المشروع وحده (سجل المشروع في B03 أو ادعاء وصفه غير المركّب). غياب العلاقة لا ينفي الأثر؛ يعني أن الأدلة لا تربطهما.",
    en: "A relation means the paragraph cites an evidence identity specific to that project (its B03 record or its own description claim). No relation does not deny an effect; it means the evidence does not connect them.",
  },
  relatedVia: { ar: "عبر", en: "via" },
  otherLinked: { ar: "فقرات مخاطر وتوقعات مرتبطة", en: "Linked risk and outlook paragraphs" },
  noRelation: { ar: "لا رابط بدليل مشترك", en: "No shared-evidence link" },
  relatedProjects: { ar: "مشاريع مرتبطة بدليل مشترك", en: "Projects linked by shared evidence" },
  none: { ar: "لا يوجد", en: "None" },
  open: { ar: "افتح", en: "Open" },
  researchContent: { ar: "محتوى بحثي", en: "Research content" },
  declaredGap: { ar: "فجوة معلنة — لا محتوى يُكمَّل", en: "Declared gap — nothing is filled in" },
  primaryParagraphs: {
    ar: "فقرات موضعها الأساسي هذا الموضوع",
    en: "Paragraphs whose primary topic this is",
  },
  contextParagraphs: { ar: "روابط سياقية", en: "Contextual links" },
  analysesFor: { ar: "تحليلات", en: "Analyses" },
  paragraphs: { ar: "فقرة", en: "paragraphs" },
  gapCount: { ar: "فجوة مسجلة", en: "registered gaps" },
  usedBy: { ar: "يستخدمها", en: "Used by" },
  mapNote: {
    ar: "خريطة نوعية من هويات المحرك وأبعاده، لا من قيم. كل عقدة تقود إلى فقرتها.",
    en: "A qualitative map from engine identities and dimensions, not values. Each node leads to its paragraph.",
  },
  segments: { ar: "القطاعات المعلنة", en: "Reported segments" },
  interSegment: {
    ar: "إيرادات بين القطاعات (هوية B02 محجوبة)",
    en: "Inter-segment revenue (withheld B02 identity)",
  },
  productStreams: { ar: "تيارات الإيراد حسب المنتج", en: "Revenue streams by product" },
  geography: {
    ar: "التقسيم الجغرافي (موقع الكيان البائع)",
    en: "Geography (location of the selling entity)",
  },
  chemicalsNote: {
    ar: "الكيميائيات ليست قطاعًا مستقلًا في سجل المحرك: تقع ضمن قطاع التكرير والكيميائيات والتسويق، ولا فقرة مستقلة لها في B04.",
    en: "Chemicals are not a separate segment in the engine record: they sit inside the Downstream segment, and B04 has no separate chemicals paragraph.",
  },
  topicMapNote: {
    ar: "لكل فقرة موضع أساسي واحد في البحث. هنا روابط إليه فقط، دون تكرار النص.",
    en: "Every paragraph has one primary place in the research. This map only links to it, without repeating the text.",
  },
  translationNote: {
    ar: "العربية هي النسخة الأساسية. الفقرات بلا مسودة إنجليزية تظهر بالعربية في الواجهة الإنجليزية، ومعلّمة بأنها غير مترجمة. لا ترجمة آلية.",
    en: "Arabic is the primary text. Paragraphs without an English draft are shown in Arabic and marked as untranslated. No machine translation.",
  },
  englishDrafts: { ar: "مسودات إنجليزية", en: "English drafts" },
  footer: {
    ar: "قارئ محلي على loopback (127.0.0.1)، GET فقط، بلا سكربتات. ليس مسارًا في التطبيق ولا API، ولا يُنشر.",
    en: "Local loopback reader (127.0.0.1), GET only, no scripts. Not an app route or API, and not published.",
  },
} satisfies Record<string, Bi>;
