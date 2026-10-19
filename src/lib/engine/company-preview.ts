import type { LocalizedText } from "@/lib/i18n";
import { safeSourceUrl } from "./peer-comparison";
import { iso } from "@/lib/bidi";
import {
  normalizeFactoryCoverage,
  normalizeInvestorReadiness,
  type FactoryCoverage,
  type RawFactoryReadiness,
  type Readiness,
} from "./readiness";
import { buildStatements, keyFigures, type KeyFigure, type StatementView } from "./statements";

/**
 * معاينة صفحة الشركة من محرك البيانات (P02).
 *
 * منطق خالص بلا شبكة: يحوّل رد `GET /v1/companies/{market}/{symbol}/page` (عقد v4)
 * إلى نموذج عرض صغير. يعمل على الخادم قبل إرسال أي شيء إلى المتصفح، فلا تصل
 * القيم المحجوبة إلى العميل أصلًا.
 *
 * القواعد:
 * - لا قيمة تُعرض دون: رقم صالح، ووحدة متسقة مع معنى المقياس، وفترة صريحة،
 *   ورابط مصدر http(s) آمن، ومعادلة مسجّلة إن كانت محسوبة، وغياب علامة جودة سلبية.
 * - كل قسم يقبل نوع فترة واحدًا: السنوي لا يقبل ربعًا والعكس.
 * - «غير منطبق» يُطبَّق على مستوى المقياس فقط، وفق قاعدة مجموعات النسب حسب نوع
 *   الشركة في docs/DATA_MODEL_18_CATEGORIES.md (الفئة 7) بالمحرك.
 * - حالة كل موضوع من 18 تأتي من تقييم المحرك (`understanding`) ولا تُستنتج هنا.
 */

/** إصدارات عقد الصفحة المدعومة. v5 (المحرك 1d27419) يضيف derivation.lineage؛ بقية الحقول المستخدمة لم تتغير. */
export const PAGE_CONTRACT_VERSIONS: readonly number[] = [4, 5];

// ───────────────────────── عقد المحرك (الحقول المستخدمة فقط)

export type EngineMetricRow = {
  display_name?: string | null;
  statement?: string | null;
  value: string | null;
  value_type?: string | null;
  currency: string | null;
  unit: string | null;
  period_start?: string | null;
  period_end: string | null;
  period_kind: string | null;
  fiscal_year?: number | null;
  fiscal_quarter?: number | null;
  scope?: string | null;
  dimensions?: Record<string, string> | null;
  is_calculated?: number | boolean | null;
  calculation?: string | null;
  quality_status?: string | null;
  quality_reasons?: string[] | null;
  provenance?: {
    source?: {
      source_url?: string | null;
      filing_type?: string | null;
      filed_at?: string | null;
      /** نوع المستند المؤرشف فعليًا. application/json يعني ملف إدخال لا المستند الأصلي. */
      content_type?: string | null;
    } | null;
    extraction?: { page?: number | string | null } | null;
    derivation?: {
      type?: string | null;
      calculation?: string | null;
      /** v5: هل أُعيد إنتاج المدخلات الحالية للمعادلة؟ غيابه يعني لا (فشل مغلق). */
      lineage?: { status?: string | null; current_inputs_reproduced?: boolean | null } | null;
    } | null;
  } | null;
};

export type Snapshot = {
  status: string;
  reason: string | null;
  period_kind?: string | null;
  period_end?: string | null;
  metrics: Record<string, EngineMetricRow[]>;
};

export type History = {
  status: string;
  reason: string | null;
  periods: { period_end: string; metrics: Record<string, EngineMetricRow[]> }[];
};

type Attribute = {
  value: unknown;
  category?: string | null;
  effective_at?: string | null;
  provenance?: {
    source?: { source_url?: string | null; filing_type?: string | null } | null;
  } | null;
};

type Capability = { status: string; count: number; reason: string | null };

export type EnginePage = {
  contract_version: number;
  placeholder_policy?: string;
  company: {
    market: string;
    symbol: string;
    name: string;
    currency: string | null;
    sector: string | null;
    industry: string | null;
    exchange: string | null;
    fiscal_year_end: string | null;
    latest_filing: string | null;
  };
  sections: {
    profile: Record<string, Attribute>;
    financials: {
      annual: Snapshot;
      quarter: Snapshot;
      ytd: Snapshot;
      ttm: Snapshot;
      instant: Snapshot;
      history: {
        annual: History;
        annual_position: History;
        quarter: History;
        /**
         * مقترح العقد (ARAMCO95 PROJECTION): أرصدة نهاية الأرباع التاريخية، period_kind=instant،
         * دون نهاية السنة المالية (تلك في annual_position). اختيارية: المحرك الحالي لا يرسلها.
         */
        quarter_position?: History;
      };
    };
    market: { latest: Record<string, unknown> | null; history: unknown[] };
    ownership: Record<string, unknown>[];
    corporate_actions: Record<string, unknown>[];
    disclosures: Record<string, unknown>[];
    consensus: unknown[];
    peer_comparison: { status: string; reason: string | null };
    official_sources: Record<string, unknown>[];
  };
  capabilities: Record<string, Capability>;
  data_quality: {
    /** الفئات التشغيلية الـ18 (عقد v5). غيابها في v4 يعني «لم تُقيَّم». */
    factory_readiness?: RawFactoryReadiness;
    understanding: {
      readiness_state: string | null;
      total_score: string | null;
      target_score: string | null;
      blocking_reasons?: string[];
      hard_gates?: Record<string, { passed: boolean }>;
      categories: {
        category_key: string;
        ordinal: number;
        name_ar: string;
        name_en: string;
        score: string | null;
        status: string | null;
        gaps: string[];
      }[];
    };
  };
};

/** فحص بنية الرد قبل استخدامه. أي نقص يعني أن العقد تغيّر، فلا نخمّن. */
export function contractProblems(page: unknown): string[] {
  const problems: string[] = [];
  const p = page as Partial<EnginePage> | null;
  if (!p || typeof p !== "object") return ["not_an_object"];
  if (!PAGE_CONTRACT_VERSIONS.includes(p.contract_version as number))
    problems.push("contract_version");
  if (p.placeholder_policy !== "never_substitute_demo_values") problems.push("placeholder_policy");
  if (!p.company?.symbol || !p.company?.market) problems.push("company");
  const f = p.sections?.financials;
  for (const k of ["annual", "quarter", "ytd", "instant"] as const)
    if (!f?.[k] || typeof f[k].metrics !== "object") problems.push(`financials.${k}`);
  if (!Array.isArray(p.sections?.ownership)) problems.push("ownership");
  if (!Array.isArray(p.sections?.disclosures)) problems.push("disclosures");
  if (!p.capabilities || typeof p.capabilities !== "object") problems.push("capabilities");
  if (!Array.isArray(p.data_quality?.understanding?.categories)) problems.push("understanding");
  return problems;
}

// ───────────────────────── نموذج العرض

export type CompanyKind = "bank" | "insurer" | "ordinary";
/** لا توجد حالة «غير منطبق»: دون قاعدة مستشهد بها يبقى الموضوع «غير مقاس» ولا يأخذ درجة. */
export type TopicStatus = "available" | "partial" | "unavailable" | "not_measured";
export type ProofKind = "reported_extracted" | "reported_manifest" | "calculated_inputs_reproduced";
/** هل المستند المؤرشف هو الأصلي (PDF/Excel) أم ملف إدخال JSON فقط؟ */
/** المستند المؤرشف: أصلي مؤكد، أو ملف إدخال مؤكد، أو غير مذكور في الرد (لا نفترض أيًا منهما). */
export type DocumentKind = "original_document" | "import_file_only" | "not_stated";

export type Period = { kind: string; end: string; label: LocalizedText };

export type ValueCell = {
  key: string;
  label: LocalizedText;
  value: number;
  display: LocalizedText;
  unit: string;
  period: Period;
  proof: {
    kind: ProofKind;
    page: number | null;
    formula: string | null;
    sourceUrl: string;
    filingType: string | null;
    document: DocumentKind;
    /** وجود المصدر ليس تحققًا مستقلًا من صحة الرقم. */
    independentlyVerified: false;
  };
};

export type WithheldReason =
  | "quality_flagged"
  | "non_numeric_value"
  | "unit_conflict"
  | "period_kind_mismatch"
  | "no_source"
  | "unsafe_source_url"
  | "calculated_without_formula"
  /** محسوبة دون إعادة إنتاج مدخلاتها (lineage غير مسجّل). قاعدة Codex للمشتقات القديمة. */
  | "calculated_inputs_not_reproduced"
  /** WEB-03: period_end لا يطابق العمود الذي ستظهر فيه القيمة. */
  | "period_end_mismatch"
  /** WEB-03: عملة غير عملة التقارير (أو العملة تخالف الوحدة). لا تحويل في الواجهة. */
  | "currency_mismatch"
  /** WEB-03: مرشحان مقبولان (من مصدر واحد أو مصدرين) للمقياس والفترة والنطاق نفسها بقيمتين مختلفتين. */
  | "source_conflict"
  /** WEB-03: للمقياس قيمة في المحرك لكنها لم تجتز شروط الجدول، فلا تُعرض في البطاقة. */
  | "not_in_statement_table";

export type MetricGroup = {
  id: string;
  title: LocalizedText;
  expectedPeriod: string;
  cells: ValueCell[];
  withheld: { key: string; label: LocalizedText; reason: WithheldReason }[];
  missing: { key: string; label: LocalizedText }[];
};

export type TextFact = {
  key: string;
  label: LocalizedText;
  text: string;
  asOf: string | null;
  sourceUrl: string;
};

export type Block =
  | { type: "metrics"; group: MetricGroup }
  | { type: "facts"; facts: TextFact[] }
  | { type: "segments"; title: LocalizedText; rows: (ValueCell & { segment: string })[] }
  | { type: "history"; series: HistorySeries[] }
  | { type: "ownership"; rows: OwnershipRow[] }
  | { type: "actions"; rows: ActionRow[] }
  | { type: "documents"; rows: DocumentRow[] }
  | { type: "market"; latest: MarketQuote | null; historyCount: number }
  | { type: "peers" };

export type HistorySeries = {
  key: string;
  label: LocalizedText;
  points: { periodEnd: string; label: LocalizedText; value: number; display: LocalizedText }[];
};

export type OwnershipRow = {
  holder: string;
  type: string | null;
  pct: number;
  asOf: string;
  sourceUrl: string;
};
export type ActionRow = {
  title: string;
  type: string;
  date: string | null;
  amount: LocalizedText | null;
  status: string | null;
  sourceUrl: string;
};
export type DocumentRow = { title: string; type: string; date: string | null; sourceUrl: string };
export type MarketQuote = { close: LocalizedText; observedAt: string; sourceUrl: string };

export type Topic = {
  key: string;
  ordinal: number;
  title: LocalizedText;
  status: TopicStatus;
  score: number | null;
  reasons: LocalizedText[];
  blocks: Block[];
  shownCount: number;
};

export type CompanyPreview = {
  company: {
    market: string;
    symbol: string;
    name: LocalizedText;
    sector: string | null;
    industry: string | null;
    exchange: string | null;
    currency: string | null;
    fiscalYearEnd: string | null;
    latestFiling: string | null;
  };
  kind: CompanyKind;
  /** نموذجان منفصلان: موضوعات المستثمر، والفئات التشغيلية. */
  readiness: { investorTopics: Readiness; operationalCategories: Readiness };
  /** لوحة الفئات التشغيلية الـ18 (عقد المصنع). لا تُقرأ من نموذج المستثمر. */
  factory: FactoryCoverage;
  /** WEB-03: القوائم متعددة الفترات (سنوي، ربعي، منذ بداية السنة) بنفس قواعد الثقة. */
  statements: StatementView[];
  /** WEB-03: أرقام المفتاح من آخر سنة مالية، حسب نوع الشركة. */
  keyFigures: KeyFigure[];
  topics: Topic[];
  counts: { shown: number; withheld: number };
  /** تنبيهات على مستوى الشركة عن طبيعة المصدر (مثلًا: ملف إدخال دون المستند الأصلي). */
  dataNotices: LocalizedText[];
};

// ───────────────────────── قواعد

export function companyKind(industry: string | null | undefined): CompanyKind {
  const v = industry?.trim().toLowerCase();
  if (v === "banks") return "bank";
  if (v === "insurance") return "insurer";
  return "ordinary";
}

const PER_SHARE_KEY = /(_per_share$|^basic_eps$|^eps_diluted$|^earnings_per_share)/;
const SHARE_COUNT_KEY = /^(weighted_average_shares|shares_outstanding|shares_issued_count)/;
export const AMOUNT_UNITS = new Set(["SAR", "USD"]);

/**
 * اتساق الوحدة مع معنى المقياس (من R02): القيمة لكل سهم بوحدة {العملة}/share، وعدد الأسهم
 * بوحدة shares، والمبلغ بعملة مطابقة. مثال حقيقي محجوب: توزيع الراجحي للسهم 2,500,000 SAR.
 */
export function unitConflict(
  key: string,
  row: Pick<EngineMetricRow, "unit" | "currency" | "statement">,
): boolean {
  const unit = row.unit ?? "";
  if (PER_SHARE_KEY.test(key) || (row.statement === "per_share" && !key.endsWith("_growth"))) {
    return !row.currency || ![`${row.currency}/share`, "currency/share"].includes(unit);
  }
  if (SHARE_COUNT_KEY.test(key)) return unit !== "shares";
  if (AMOUNT_UNITS.has(unit)) return !row.currency || row.currency !== unit;
  return false;
}

const ACCEPTED_QUALITY = new Set(["ok", "published"]);

function qualityFlagged(row: EngineMetricRow): boolean {
  const s = row.quality_status?.trim().toLowerCase();
  if (s && !ACCEPTED_QUALITY.has(s)) return true;
  return Array.isArray(row.quality_reasons) && row.quality_reasons.length > 0;
}

// ───────────────────────── تنسيق

const UNIT_LABELS: Record<string, LocalizedText> = {
  mmboed: { ar: "مليون برميل مكافئ/يوم", en: "mmboe/d" },
  mmbpd: { ar: "مليون برميل/يوم", en: "mmb/d" },
  bscfd: { ar: "مليار قدم³ قياسي/يوم", en: "bscf/d" },
  "USD/bbl": { ar: "دولار/برميل", en: "USD/bbl" },
  "USD/boe": { ar: "دولار/برميل مكافئ", en: "USD/boe" },
  years: { ar: "سنة", en: "years" },
  million_tonnes_co2e: { ar: "مليون طن مكافئ CO₂", en: "Mt CO₂e" },
  kg_co2e_per_boe: { ar: "كغ CO₂e/برميل مكافئ", en: "kg CO₂e/boe" },
  scf_per_boe: { ar: "قدم³ قياسي/برميل مكافئ", en: "scf/boe" },
  thousand_btu_per_boe: { ar: "ألف وحدة حرارية/برميل مكافئ", en: "thousand BTU/boe" },
  million_m3: { ar: "مليون م³", en: "million m³" },
  kilotonnes: { ar: "ألف طن", en: "kt" },
  tonnes: { ar: "طن", en: "t" },
  million_tonnes: { ar: "مليون طن", en: "Mt" },
  barrels: { ar: "برميل", en: "bbl" },
  shares: { ar: "سهم", en: "shares" },
  score: { ar: "نقطة", en: "score" },
};

const CURRENCY_LABEL: Record<string, LocalizedText> = {
  SAR: { ar: "ريال", en: "SAR" },
  USD: { ar: "دولار", en: "USD" },
};

const group = (n: number, digits: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function formatAmount(value: number, currency: string): LocalizedText {
  const cur = CURRENCY_LABEL[currency] ?? { ar: currency, en: currency };
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1e9)
    return {
      ar: `${iso(sign + group(abs / 1e9, 2))} مليار ${cur.ar}`,
      en: `${cur.en} ${sign}${group(abs / 1e9, 2)}bn`,
    };
  if (abs >= 1e6)
    return {
      ar: `${iso(sign + group(abs / 1e6, 2))} مليون ${cur.ar}`,
      en: `${cur.en} ${sign}${group(abs / 1e6, 2)}m`,
    };
  return { ar: `${iso(sign + group(abs, 0))} ${cur.ar}`, en: `${cur.en} ${sign}${group(abs, 0)}` };
}

export function formatValue(value: number, unit: string, currency: string | null): LocalizedText {
  if (unit === "ratio") {
    const s = `${group(value * 100, 2)}%`;
    return { ar: iso(s), en: s };
  }
  if (unit === "percent") {
    const s = `${group(value, 2)}%`;
    return { ar: iso(s), en: s };
  }
  if (AMOUNT_UNITS.has(unit) && currency) return formatAmount(value, currency);
  if (unit.endsWith("/share") && currency) {
    const cur = CURRENCY_LABEL[currency] ?? { ar: currency, en: currency };
    return {
      ar: `${iso(group(value, 2))} ${cur.ar}/سهم`,
      en: `${cur.en} ${group(value, 2)}/share`,
    };
  }
  const u = UNIT_LABELS[unit] ?? { ar: unit, en: unit };
  const digits = Number.isInteger(value) ? 0 : Math.abs(value) >= 100 ? 1 : 2;
  return { ar: `${iso(group(value, digits))} ${u.ar}`, en: `${group(value, digits)} ${u.en}` };
}

export function periodOf(
  row: Pick<EngineMetricRow, "period_kind" | "period_end" | "fiscal_year" | "fiscal_quarter">,
): Period {
  const kind = row.period_kind ?? "";
  const end = row.period_end ?? "";
  const fy = row.fiscal_year ?? (end ? Number(end.slice(0, 4)) : null);
  if (kind === "fy")
    return { kind, end, label: { ar: `السنة المالية ${iso(fy ?? "")}`, en: `FY ${fy}` } };
  if (kind === "quarter") {
    const q = row.fiscal_quarter;
    return q
      ? {
          kind,
          end,
          label: {
            ar: `الربع ${iso(q)} من ${iso(fy ?? "")} (ربع منفرد)`,
            en: `Q${q} ${fy} (single quarter)`,
          },
        }
      : {
          kind,
          end,
          label: { ar: `ربع منفرد منتهٍ في ${iso(end)}`, en: `Single quarter ended ${end}` },
        };
  }
  if (kind === "ytd")
    return {
      kind,
      end,
      label: { ar: `منذ بداية ${iso(fy ?? "")} حتى ${iso(end)}`, en: `Year to date to ${end}` },
    };
  if (kind === "ttm")
    return {
      kind,
      end,
      label: { ar: `آخر 12 شهرًا حتى ${iso(end)}`, en: `Trailing 12 months to ${end}` },
    };
  if (kind === "instant")
    return { kind, end, label: { ar: `كما في ${iso(end)}`, en: `As of ${end}` } };
  return { kind, end, label: { ar: end, en: end } };
}

// ───────────────────────── تسميات المقاييس

const L = (ar: string, en: string): LocalizedText => ({ ar, en });

export const METRIC_LABELS: Record<string, LocalizedText> = {
  revenue: L("الإيرادات", "Revenue"),
  ebitda: L("الربح قبل الفوائد والضرائب والإهلاك", "EBITDA"),
  ebit: L("الربح قبل الفوائد والضرائب", "EBIT"),
  operating_income: L("الدخل التشغيلي", "Operating income"),
  finance_costs: L("تكاليف التمويل", "Finance costs"),
  income_before_income_taxes_and_zakat: L(
    "الدخل قبل الزكاة والضرائب",
    "Income before zakat and tax",
  ),
  income_taxes_and_zakat: L("الزكاة وضريبة الدخل", "Zakat and income tax"),
  net_income: L("صافي الدخل", "Net income"),
  net_income_parent: L("صافي الدخل العائد للمساهمين", "Net income to shareholders"),
  basic_eps: L("ربحية السهم الأساسية", "Basic EPS"),
  eps_diluted: L("ربحية السهم المخففة", "Diluted EPS"),
  weighted_average_shares_diluted: L("متوسط عدد الأسهم المخفف", "Weighted average diluted shares"),
  financing_income: L("دخل التمويل والاستثمار", "Financing and investment income"),
  financing_expense: L("مصروف التمويل", "Financing expense"),
  net_financing_income: L("صافي دخل التمويل", "Net financing income"),
  fee_income: L("دخل الرسوم", "Fee income"),
  exchange_income: L("دخل تحويل العملات", "Exchange income"),
  other_income: L("دخل آخر", "Other income"),
  total_operating_income: L("إجمالي دخل العمليات", "Total operating income"),
  salaries_and_employee_expenses: L("الرواتب ومزايا الموظفين", "Salaries and employee expenses"),
  total_operating_expenses: L("إجمالي مصاريف العمليات", "Total operating expenses"),
  provision_expense: L("مخصص خسائر الائتمان", "Credit loss provision"),
  insurance_revenue: L("إيرادات التأمين", "Insurance revenue"),
  insurance_service_expense: L("مصاريف خدمات التأمين", "Insurance service expense"),
  insurance_service_result: L("نتيجة خدمات التأمين", "Insurance service result"),
  reinsurance_premiums: L("أقساط إعادة التأمين", "Reinsurance premiums"),
  reinsurance_recoveries: L("مستردات إعادة التأمين", "Reinsurance recoveries"),
  reinsurance_result: L("نتيجة إعادة التأمين", "Reinsurance result"),
  insurance_investment_income: L("دخل استثمارات التأمين", "Insurance investment income"),
  finance_income: L("دخل التمويل", "Finance income"),
  other_operating_revenue: L("إيرادات تشغيلية أخرى", "Other operating revenue"),
  other_expense: L("مصاريف أخرى", "Other expenses"),
  cash: L("النقد وما في حكمه", "Cash and equivalents"),
  cash_and_balances_with_central_bank: L(
    "النقد والأرصدة لدى البنك المركزي",
    "Cash and balances with central bank",
  ),
  due_from_banks: L("مستحق من البنوك", "Due from banks"),
  bank_investments: L("الاستثمارات", "Investments"),
  gross_loans: L("إجمالي التمويل", "Gross financing"),
  net_loans: L("صافي التمويل", "Net financing"),
  credit_loss_allowance: L("مخصص خسائر الائتمان المتراكم", "Credit loss allowance"),
  nonperforming_loans: L("التمويل المتعثر", "Non-performing financing"),
  customer_deposits: L("ودائع العملاء", "Customer deposits"),
  due_to_banks: L("مستحق للبنوك", "Due to banks"),
  debt_securities_issued: L("صكوك وأوراق دين مصدرة", "Debt securities issued"),
  risk_weighted_assets: L("الأصول المرجحة بالمخاطر", "Risk-weighted assets"),
  total_assets: L("إجمالي الأصول", "Total assets"),
  total_liabilities: L("إجمالي المطلوبات", "Total liabilities"),
  total_equity: L("إجمالي حقوق الملكية", "Total equity"),
  current_assets: L("الأصول المتداولة", "Current assets"),
  current_liabilities: L("المطلوبات المتداولة", "Current liabilities"),
  net_debt: L("صافي الدين", "Net debt"),
  shares_outstanding: L("الأسهم القائمة", "Shares outstanding"),
  equity_parent: L("حقوق الملكية العائدة للمساهمين", "Equity attributable to shareholders"),
  share_capital: L("رأس المال", "Share capital"),
  retained_earnings: L("الأرباح المبقاة", "Retained earnings"),
  tangible_book_value: L("القيمة الدفترية الملموسة", "Tangible book value"),
  intangible_assets: L("الأصول غير الملموسة", "Intangible assets"),
  property_plant_equipment: L("الممتلكات والمعدات", "Property and equipment"),
  insurance_contract_liabilities: L("مطلوبات عقود التأمين", "Insurance contract liabilities"),
  reinsurance_contract_assets: L("أصول عقود إعادة التأمين", "Reinsurance contract assets"),
  reinsurance_contract_liabilities: L(
    "مطلوبات عقود إعادة التأمين",
    "Reinsurance contract liabilities",
  ),
  operating_cash_flow: L("التدفق النقدي التشغيلي", "Operating cash flow"),
  investing_cash_flow: L("التدفق النقدي الاستثماري", "Investing cash flow"),
  financing_cash_flow: L("التدفق النقدي التمويلي", "Financing cash flow"),
  capex: L("الإنفاق الرأسمالي", "Capital expenditure"),
  free_cash_flow: L("التدفق النقدي الحر", "Free cash flow"),
  dividends_paid: L("التوزيعات المدفوعة", "Dividends paid"),
  cash_end: L("النقد في نهاية الفترة", "Cash at end of period"),
  adjusted_net_income: L("صافي الدخل المعدّل", "Adjusted net income"),
  income_quality: L(
    "جودة الدخل (التدفق التشغيلي ÷ صافي الدخل)",
    "Income quality (CFO ÷ net income)",
  ),
  accrual_ratio: L("نسبة الاستحقاق", "Accrual ratio"),
  cash_conversion_of_earnings: L("تحويل الأرباح إلى نقد", "Cash conversion of earnings"),
  effective_tax_rate: L("معدل الزكاة والضريبة الفعلي", "Effective tax rate"),
  operating_margin: L("الهامش التشغيلي", "Operating margin"),
  ebitda_margin: L("هامش EBITDA", "EBITDA margin"),
  net_margin: L("صافي الهامش", "Net margin"),
  return_on_equity: L("العائد على حقوق الملكية", "Return on equity"),
  return_on_assets: L("العائد على الأصول", "Return on assets"),
  roace: L("العائد على متوسط رأس المال المستخدم", "ROACE"),
  debt_to_ebitda: L("الدين إلى EBITDA", "Debt to EBITDA"),
  net_debt_to_ebitda: L("صافي الدين إلى EBITDA", "Net debt to EBITDA"),
  interest_coverage: L("تغطية الفوائد", "Interest coverage"),
  asset_turnover: L("دوران الأصول", "Asset turnover"),
  equity_ratio: L("حقوق الملكية إلى الأصول", "Equity to assets"),
  liabilities_to_assets: L("المطلوبات إلى الأصول", "Liabilities to assets"),
  liabilities_to_equity: L("المطلوبات إلى حقوق الملكية", "Liabilities to equity"),
  net_interest_margin: L("هامش صافي التمويل", "Net financing margin"),
  cost_to_income_ratio: L("التكلفة إلى الدخل", "Cost to income"),
  cost_of_risk: L("تكلفة المخاطر", "Cost of risk"),
  loans_to_deposits_ratio: L("التمويل إلى الودائع", "Financing to deposits"),
  nonperforming_loans_ratio: L("نسبة التمويل المتعثر", "Non-performing financing ratio"),
  nonperforming_loans_coverage: L("تغطية التمويل المتعثر", "Non-performing financing coverage"),
  revenue_growth: L("نمو الإيرادات", "Revenue growth"),
  net_income_growth: L("نمو صافي الدخل", "Net income growth"),
  eps_growth: L("نمو ربحية السهم", "EPS growth"),
  revenue_cagr_5y: L("النمو السنوي المركب للإيرادات (5 سنوات)", "Revenue CAGR (5y)"),
  net_income_cagr_5y: L("النمو السنوي المركب لصافي الدخل (5 سنوات)", "Net income CAGR (5y)"),
  eps_cagr_3y: L("النمو السنوي المركب لربحية السهم (3 سنوات)", "EPS CAGR (3y)"),
  dividends_per_share: L("التوزيع للسهم", "Dividend per share"),
  payout_ratio: L("نسبة التوزيع", "Payout ratio"),
  dividend_cagr_3y: L("النمو السنوي المركب للتوزيع (3 سنوات)", "Dividend CAGR (3y)"),
  total_hydrocarbon_production: L(
    "إجمالي إنتاج المواد الهيدروكربونية",
    "Total hydrocarbon production",
  ),
  total_liquids_production: L("إنتاج السوائل", "Liquids production"),
  total_gas_production: L("إنتاج الغاز", "Gas production"),
  average_realized_crude_oil_price: L("متوسط سعر النفط المحقق", "Average realized crude price"),
  lifting_cost_per_boe: L("تكلفة الرفع لكل برميل مكافئ", "Lifting cost per boe"),
  reserve_life_index: L("العمر المتبقي للاحتياطيات", "Reserve life index"),
  downstream_crude_utilization: L("استغلال النفط في قطاع التكرير", "Downstream crude utilization"),
  supply_reliability: L("موثوقية الإمداد", "Supply reliability"),
  scope_1_emissions: L("انبعاثات النطاق 1", "Scope 1 emissions"),
  scope_2_emissions: L("انبعاثات النطاق 2", "Scope 2 emissions"),
  upstream_carbon_intensity: L("كثافة الكربون في التنقيب والإنتاج", "Upstream carbon intensity"),
  methane_intensity: L("كثافة الميثان", "Methane intensity"),
  flaring_intensity: L("كثافة الحرق", "Flaring intensity"),
  energy_intensity: L("كثافة الطاقة", "Energy intensity"),
  water_consumption: L("استهلاك المياه", "Water consumption"),
  sox_emissions: L("انبعاثات أكاسيد الكبريت", "SOx emissions"),
  upstream_revenue: L("إيرادات التنقيب والإنتاج", "Upstream revenue"),
  downstream_revenue: L("إيرادات التكرير والكيميائيات", "Downstream revenue"),
  upstream_ebit: L("EBIT التنقيب والإنتاج", "Upstream EBIT"),
  downstream_ebit: L("EBIT التكرير والكيميائيات", "Downstream EBIT"),
  revenue_by_product: L("الإيرادات حسب المنتج", "Revenue by product"),
  revenue_by_geography: L("الإيرادات حسب الجغرافيا", "Revenue by geography"),
};

export const labelOf = (key: string, row?: EngineMetricRow | null): LocalizedText =>
  METRIC_LABELS[key] ?? { ar: row?.display_name ?? key, en: row?.display_name ?? key };

// ───────────────────────── اختيار القيمة وفحصها

export type Pick_ =
  { ok: true; cell: ValueCell } | { ok: false; reason: WithheldReason } | { ok: "missing" };

export function checkRow(
  key: string,
  row: EngineMetricRow,
  expectedPeriod: string,
): ValueCell | WithheldReason {
  if (qualityFlagged(row)) return "quality_flagged";
  if (row.period_kind !== expectedPeriod || !row.period_end) return "period_kind_mismatch";
  const value = Number(row.value);
  if (row.value === null || row.value === "" || !Number.isFinite(value)) return "non_numeric_value";
  if (!row.unit || unitConflict(key, row)) return "unit_conflict";
  const raw = row.provenance?.source?.source_url;
  if (!raw) return "no_source";
  const sourceUrl = safeSourceUrl(raw);
  if (!sourceUrl) return "unsafe_source_url";
  const derivation = row.provenance?.derivation;
  const calculated = Boolean(row.is_calculated) || Boolean(derivation);
  const formula = derivation?.calculation ?? row.calculation ?? null;
  if (calculated && !formula) return "calculated_without_formula";
  // المعادلة وحدها لا تثبت الرقم: يلزم أن يكون المحرك قد أعاد إنتاج مدخلاتها الحالية.
  if (calculated && derivation?.lineage?.current_inputs_reproduced !== true)
    return "calculated_inputs_not_reproduced";
  const contentType = row.provenance?.source?.content_type?.toLowerCase() ?? "";
  const pageRaw = row.provenance?.extraction?.page;
  const page = pageRaw === null || pageRaw === undefined || pageRaw === "" ? null : Number(pageRaw);
  return {
    key,
    label: labelOf(key, row),
    value,
    display: formatValue(value, row.unit, row.currency || null),
    unit: row.unit,
    period: periodOf(row),
    proof: {
      kind: calculated
        ? "calculated_inputs_reproduced"
        : row.provenance?.extraction
          ? "reported_extracted"
          : "reported_manifest",
      page: page !== null && Number.isFinite(page) ? page : null,
      formula: calculated ? formula : null,
      sourceUrl,
      filingType: row.provenance?.source?.filing_type ?? null,
      document: !contentType
        ? "not_stated"
        : contentType.includes("json")
          ? "import_file_only"
          : "original_document",
      independentlyVerified: false,
    },
  };
}

const isConsolidated = (r: EngineMetricRow) =>
  (r.scope ?? "consolidated") === "consolidated" && Object.keys(r.dimensions ?? {}).length === 0;

/**
 * هوية القيمة المعروضة: الرقم مع وحدته ونوع فترته ونهايتها. مرشحان مقبولان بهويتين مختلفتين
 * للمقياس نفسه متناقضان، ولا يُختار أحدهما (WEB-03: لا "الأول يفوز").
 */
export const valueIdentity = (c: ValueCell): string =>
  JSON.stringify([c.value, c.unit, c.period.kind, c.period.end]);

/**
 * يفحص كل الصفوف الموحّدة قبل الاختيار. صف لا يجتاز الفحوص لا يغطي على صف صحيح للفترة نفسها،
 * لكن صفّين مقبولين بقيمتين مختلفتين يُحجبان معًا (source_conflict) أيًّا كان ترتيبهما.
 */
export function pickValue(
  key: string,
  rows: EngineMetricRow[] | undefined,
  expectedPeriod: string,
): Pick_ {
  const candidates = (rows ?? []).filter(isConsolidated);
  if (!candidates.length) return { ok: "missing" };
  let firstReason: WithheldReason | null = null;
  const eligible: ValueCell[] = [];
  for (const row of candidates) {
    const r = checkRow(key, row, expectedPeriod);
    if (typeof r !== "string") eligible.push(r);
    else firstReason ??= r;
  }
  if (!eligible.length) return { ok: false, reason: firstReason! };
  if (new Set(eligible.map(valueIdentity)).size > 1)
    return { ok: false, reason: "source_conflict" };
  return { ok: true, cell: eligible[0]! };
}

function buildGroup(
  id: string,
  title: LocalizedText,
  keys: readonly string[],
  snapshot: Snapshot | undefined,
  expectedPeriod: string,
): MetricGroup {
  const g: MetricGroup = {
    id,
    title,
    expectedPeriod,
    cells: [],
    withheld: [],
    missing: [],
  };
  for (const key of keys) {
    const rows = snapshot?.metrics?.[key];
    const picked = pickValue(key, rows, expectedPeriod);
    if (picked.ok === true) g.cells.push(picked.cell);
    else if (picked.ok === false)
      g.withheld.push({ key, label: labelOf(key, rows?.[0]), reason: picked.reason });
    else g.missing.push({ key, label: labelOf(key) });
  }
  return g;
}

// ───────────────────────── تعريف الأقسام حسب نوع الشركة

export const INCOME: Record<CompanyKind, string[]> = {
  ordinary: [
    "revenue",
    "ebitda",
    "ebit",
    "operating_income",
    "finance_costs",
    "income_before_income_taxes_and_zakat",
    "income_taxes_and_zakat",
    "net_income",
    "net_income_parent",
    "basic_eps",
    "eps_diluted",
  ],
  bank: [
    "financing_income",
    "financing_expense",
    "net_financing_income",
    "fee_income",
    "exchange_income",
    "other_income",
    "total_operating_income",
    "salaries_and_employee_expenses",
    "total_operating_expenses",
    "provision_expense",
    "income_before_income_taxes_and_zakat",
    "income_taxes_and_zakat",
    "net_income",
    "net_income_parent",
    "eps_diluted",
    "weighted_average_shares_diluted",
  ],
  insurer: [
    "insurance_revenue",
    "insurance_service_expense",
    "insurance_service_result",
    "reinsurance_premiums",
    "reinsurance_recoveries",
    "reinsurance_result",
    "insurance_investment_income",
    "finance_income",
    "other_operating_revenue",
    "other_expense",
    "net_income",
  ],
};

export const BALANCE: Record<CompanyKind, string[]> = {
  ordinary: ["cash", "total_assets", "total_liabilities", "total_equity", "tangible_book_value"],
  bank: [
    "cash_and_balances_with_central_bank",
    "due_from_banks",
    "bank_investments",
    "gross_loans",
    "credit_loss_allowance",
    "net_loans",
    "nonperforming_loans",
    "total_assets",
    "customer_deposits",
    "due_to_banks",
    "debt_securities_issued",
    "total_liabilities",
    "share_capital",
    "equity_parent",
    "total_equity",
    "risk_weighted_assets",
  ],
  insurer: [
    "cash",
    "reinsurance_contract_assets",
    "intangible_assets",
    "property_plant_equipment",
    "total_assets",
    "insurance_contract_liabilities",
    "reinsurance_contract_liabilities",
    "total_liabilities",
    "share_capital",
    "retained_earnings",
    "total_equity",
  ],
};

export const CASH_FLOW = [
  "operating_cash_flow",
  "investing_cash_flow",
  "financing_cash_flow",
  "capex",
  "free_cash_flow",
  "dividends_paid",
  "cash_end",
];
const INTERIM = [
  "revenue",
  "net_income",
  "operating_cash_flow",
  "capex",
  "free_cash_flow",
  "net_margin",
];
const EARNINGS_QUALITY = [
  "adjusted_net_income",
  "income_quality",
  "accrual_ratio",
  "cash_conversion_of_earnings",
  "effective_tax_rate",
];

export const RATIOS: Record<CompanyKind, string[]> = {
  ordinary: [
    "operating_margin",
    "ebitda_margin",
    "net_margin",
    "return_on_equity",
    "return_on_assets",
    "roace",
    "debt_to_ebitda",
    "net_debt_to_ebitda",
    "interest_coverage",
    "asset_turnover",
  ],
  bank: [
    "return_on_equity",
    "return_on_assets",
    "net_interest_margin",
    "cost_to_income_ratio",
    "cost_of_risk",
  ],
  insurer: ["net_margin", "return_on_equity", "return_on_assets"],
};
const POSITION_RATIOS: Record<CompanyKind, string[]> = {
  ordinary: ["equity_ratio", "liabilities_to_equity"],
  bank: [
    "loans_to_deposits_ratio",
    "nonperforming_loans_ratio",
    "nonperforming_loans_coverage",
    "equity_ratio",
    "liabilities_to_equity",
  ],
  insurer: ["equity_ratio", "liabilities_to_assets", "liabilities_to_equity"],
};
const GROWTH = [
  "revenue_growth",
  "net_income_growth",
  "eps_growth",
  "revenue_cagr_5y",
  "net_income_cagr_5y",
  "eps_cagr_3y",
];
const OPERATIONS = [
  "total_hydrocarbon_production",
  "total_liquids_production",
  "total_gas_production",
  "average_realized_crude_oil_price",
  "lifting_cost_per_boe",
  "reserve_life_index",
  "downstream_crude_utilization",
  "supply_reliability",
];
const DIVIDENDS = ["dividends_per_share", "payout_ratio", "dividends_paid", "dividend_cagr_3y"];
const ESG = [
  "scope_1_emissions",
  "scope_2_emissions",
  "upstream_carbon_intensity",
  "methane_intensity",
  "flaring_intensity",
  "energy_intensity",
  "water_consumption",
  "sox_emissions",
];
const SEGMENT_TOTALS = [
  "upstream_revenue",
  "downstream_revenue",
  "upstream_ebit",
  "downstream_ebit",
];

/** تُرسم السلسلة فقط إن كان لها سنتان صالحتان على الأقل. للبنك: صافي الدخل العائد للمساهمين
 *  هو ما يغطي خمس سنوات في المحرك، بينما صافي الدخل الإجمالي لسنة واحدة. */
const HISTORY_SERIES: Record<CompanyKind, string[]> = {
  ordinary: ["revenue", "net_income"],
  bank: ["net_income_parent", "net_income"],
  insurer: ["net_income_parent", "net_income"],
};

// ───────────────────────── حقائق نصية

const ATTRIBUTE_LABELS: Record<string, LocalizedText> = {
  legal_name: L("الاسم القانوني", "Legal name"),
  legal_name_ar: L("الاسم القانوني بالعربية", "Legal name (Arabic)"),
  isin: L("رمز ISIN", "ISIN"),
  listing_date: L("تاريخ الإدراج", "Listing date"),
  legal_form: L("الشكل القانوني", "Legal form"),
  founding_date: L("تاريخ التأسيس", "Founded"),
  headquarters_address: L("المقر الرئيسي", "Headquarters"),
  reporting_standard: L("المعيار المحاسبي", "Reporting standard"),
  website: L("الموقع الإلكتروني", "Website"),
  investor_relations_url: L("علاقات المستثمرين", "Investor relations"),
  business_description_ar: L("وصف النشاط", "Business description (Arabic)"),
  business_description: L("وصف النشاط (إنجليزي)", "Business description"),
  products_services: L("المنتجات والخدمات", "Products and services"),
  business_segments: L("قطاعات الأعمال", "Business segments"),
  geographic_presence: L("الانتشار الجغرافي", "Geographic presence"),
  subsidiaries_count: L("الشركات التابعة", "Subsidiaries"),
  ceo_name: L("الرئيس التنفيذي", "Chief executive"),
  chairman_name: L("رئيس مجلس الإدارة", "Chairman"),
  auditor: L("المراجع الخارجي", "External auditor"),
  employees: L("عدد الموظفين", "Employees"),
  credit_rating: L("التصنيف الائتماني", "Credit rating"),
};

const humanize = (k: string) => k.replace(/_/g, " ");

/** يعرض القيم المركبة (قوائم وكائنات) كنص مقروء دون تغيير محتواها. */
export function attributeText(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return value.toLocaleString("en-US");
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (Array.isArray(value)) {
    const parts = value.map(attributeText).filter(Boolean);
    return parts.length ? parts.join("، ") : null;
  }
  if (typeof value === "object") {
    const parts = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => {
        const t = attributeText(v);
        return t ? `${humanize(k)}: ${t}` : null;
      })
      .filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
  }
  return null;
}

function facts(profile: Record<string, Attribute>, keys: readonly string[]): TextFact[] {
  const out: TextFact[] = [];
  for (const key of keys) {
    const a = profile?.[key];
    if (!a) continue;
    const text = attributeText(a.value);
    const sourceUrl = safeSourceUrl(a.provenance?.source?.source_url ?? "");
    if (!text || !sourceUrl) continue;
    out.push({
      key,
      label: ATTRIBUTE_LABELS[key] ?? L(humanize(key), humanize(key)),
      text,
      asOf: a.effective_at ?? null,
      sourceUrl,
    });
  }
  return out;
}

// ───────────────────────── أسباب

const REASONS: Record<string, LocalizedText> = {
  category_coverage_below_95_percent: L(
    "التغطية أقل من 95% من الحقول المطلوبة",
    "Coverage below 95% of required fields",
  ),
  no_sourced_company_attributes: L(
    "لا توجد بيانات تعريفية موثقة المصدر لهذه الشركة بعد",
    "No sourced company attributes yet",
  ),
  authorized_market_history_feed_required: L(
    "يحتاج تغذية أسعار مرخّصة؛ السجل الحالي جزئي أو غير موجود",
    "Needs an authorized price feed; current history is partial or absent",
  ),
  no_sourced_ownership_positions: L(
    "لا توجد بيانات ملكية موثقة المصدر",
    "No sourced ownership positions",
  ),
  no_sourced_corporate_actions: L(
    "لا توجد إجراءات شركة موثقة المصدر",
    "No sourced corporate actions",
  ),
  announcement_feed_not_connected: L(
    "تغذية الإعلانات غير متصلة",
    "Announcement feed not connected",
  ),
  licensed_consensus_feed_required: L(
    "يحتاج ترخيص بيانات إجماع المحللين",
    "Needs a licensed analyst-consensus feed",
  ),
  authorized_news_feed_required: L("يحتاج مصدر أخبار مرخّص", "Needs an authorized news feed"),
  fewer_than_five_annual_periods: L(
    "أقل من خمس سنوات مالية متاحة",
    "Fewer than five annual periods",
  ),
  no_quarter_facts: L("لا توجد بيانات ربعية", "No quarterly data"),
  no_other_peer_with_comparable_facts: L(
    "لا توجد شركة مماثلة ببيانات قابلة للمقارنة",
    "No peer with comparable data",
  ),
  no_valuation_multiples_in_contract: L(
    "مكررات التقييم لا تصل في عقد API الحالي (ACR-001)",
    "Valuation multiples are not in the current API contract (ACR-001)",
  ),
  no_forecasts_in_contract: L(
    "لا توجد توقعات أو توجيهات في عقد الصفحة الحالي",
    "No forecasts or guidance in the current page contract",
  ),
  no_sector_datasets: L(
    "لا توجد بيانات قطاعية مجمّعة في المحرك بعد",
    "No sector-level datasets in the engine yet",
  ),
  bank_operational_kpis_not_delivered: L(
    "مؤشرات البنوك التشغيلية موجودة في ملف مراجَع لدى المحرك لكنها لا تُسلَّم في العقد بعد",
    "Bank operating KPIs exist in a reviewed engine manifest but are not delivered in the contract yet",
  ),
  no_operational_kpis_for_kind: L(
    "لا توجد مؤشرات تشغيلية لهذا النوع من الشركات في المحرك بعد",
    "No operating KPIs for this company type in the engine yet",
  ),
  not_assessed: L("لم يُقيَّم هذا الموضوع في المحرك بعد", "Not yet assessed by the engine"),
  not_applicable_without_cited_rule: L(
    "وصفه المحرك بأنه غير منطبق دون قاعدة مستشهد بها، فيبقى غير مقاس ولا يُحتسب مكتملًا",
    "Marked not applicable by the engine without a cited rule, so it stays not measured and is never counted as complete",
  ),
};

const reasonText = (code: string): LocalizedText =>
  REASONS[code] ?? L(humanize(code), humanize(code));

// ───────────────────────── البناء

function topicStatus(
  cat: { status: string | null; score: string | null } | undefined,
): TopicStatus {
  if (!cat || cat.status === null || cat.score === null) return "not_measured";
  // «غير منطبق» دون قاعدة مستشهد بها لا يمنح الموضوع حالة ولا درجة.
  if (cat.status === "not_applicable") return "not_measured";
  if (cat.status === "complete") return "available";
  if (cat.status === "partial") return "partial";
  return "unavailable";
}

function capabilityReason(page: EnginePage, key: string): string | null {
  const c = page.sections && page.capabilities?.[key];
  return c && c.status !== "available" ? c.reason : null;
}

function segmentRows(
  snapshot: Snapshot | undefined,
  key: string,
): (ValueCell & { segment: string })[] {
  const rows = (snapshot?.metrics?.[key] ?? []).filter(
    (r) => Object.keys(r.dimensions ?? {}).length > 0,
  );
  const out: (ValueCell & { segment: string })[] = [];
  for (const row of rows) {
    const r = checkRow(key, row, "fy");
    if (typeof r === "string") continue;
    const d = row.dimensions ?? {};
    const segment = d["product"] ?? d["geography"] ?? d["segment"] ?? Object.values(d).join(" / ");
    out.push({ ...r, segment });
  }
  return out;
}

function historySeries(page: EnginePage, kind: CompanyKind): HistorySeries[] {
  const periods = page.sections.financials.history?.annual?.periods ?? [];
  const series: HistorySeries[] = [];
  for (const key of HISTORY_SERIES[kind]) {
    const points: HistorySeries["points"] = [];
    for (const p of [...periods].sort((a, b) => a.period_end.localeCompare(b.period_end))) {
      const picked = pickValue(key, p.metrics?.[key], "fy");
      if (picked.ok === true)
        points.push({
          periodEnd: picked.cell.period.end,
          label: picked.cell.period.label,
          value: picked.cell.value,
          display: picked.cell.display,
        });
    }
    if (points.length >= 2) series.push({ key, label: labelOf(key), points });
  }
  return series;
}

function safeRows<T>(
  rows: Record<string, unknown>[] | undefined,
  map: (r: Record<string, unknown>, url: string) => T | null,
): T[] {
  const out: T[] = [];
  for (const r of rows ?? []) {
    const url = safeSourceUrl(String(r["source_url"] ?? ""));
    if (!url) continue;
    const item = map(r, url);
    if (item) out.push(item);
  }
  return out;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

export function buildCompanyPreview(page: EnginePage): CompanyPreview {
  const problems = contractProblems(page);
  if (problems.length) throw new Error(`engine page contract mismatch: ${problems.join(", ")}`);

  const kind = companyKind(page.company.industry);
  const fin = page.sections.financials;
  const profile = page.sections.profile ?? {};
  const cats = new Map(page.data_quality.understanding.categories.map((c) => [c.ordinal, c]));

  const m = (
    id: string,
    title: LocalizedText,
    keys: readonly string[],
    snap: Snapshot,
    period: string,
  ): Block => ({
    type: "metrics",
    group: buildGroup(id, title, keys, snap, period),
  });

  const interim: Block[] = [];
  if (fin.quarter?.status === "available")
    interim.push(
      m(
        "quarter",
        L("آخر ربع (ربع منفرد)", "Latest quarter (single quarter)"),
        INTERIM,
        fin.quarter,
        "quarter",
      ),
    );
  if (fin.ytd?.status === "available")
    interim.push(m("ytd", L("منذ بداية السنة", "Year to date"), INTERIM, fin.ytd, "ytd"));

  const ownership = safeRows<OwnershipRow>(page.sections.ownership, (r, url) => {
    const pct = Number(r["ownership_pct"]);
    const holder = str(r["holder_name"]);
    const asOf = str(r["as_of_date"]);
    if (!holder || !asOf || !Number.isFinite(pct) || pct < 0 || pct > 1) return null;
    return { holder, type: str(r["holder_type"]), pct, asOf, sourceUrl: url };
  });

  const actions = safeRows<ActionRow>(page.sections.corporate_actions, (r, url) => {
    const title = str(r["title"]);
    if (!title) return null;
    const amount = Number(r["cash_amount"]);
    const currency = str(r["currency"]);
    return {
      title,
      type: String(r["action_type"] ?? ""),
      date: str(r["announcement_date"]) ?? str(r["effective_date"]),
      amount:
        r["cash_amount"] != null && Number.isFinite(amount) && currency
          ? formatAmount(amount, currency)
          : null,
      status: str(r["status"]),
      sourceUrl: url,
    };
  });

  const documents = [
    ...safeRows<DocumentRow>(page.sections.disclosures, (r, url) => {
      const title = str(r["title"]);
      return title
        ? {
            title,
            type: String(r["disclosure_type"] ?? ""),
            date: str(r["published_at"]),
            sourceUrl: url,
          }
        : null;
    }),
    ...safeRows<DocumentRow>(page.sections.official_sources, (r, url) => {
      const type = str(r["filing_type"]);
      return type
        ? { title: type, type: "official_source", date: str(r["filed_at"]), sourceUrl: url }
        : null;
    }),
  ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  const latest = page.sections.market?.latest;
  let quote: MarketQuote | null = null;
  if (latest) {
    const close = Number(latest["close"]);
    const currency = str(latest["currency"]);
    const observedAt = str(latest["observed_at"]);
    const url = safeSourceUrl(String(latest["source_url"] ?? ""));
    if (Number.isFinite(close) && currency && observedAt && url)
      quote = {
        close: formatValue(close, `${currency}/share`, currency),
        observedAt,
        sourceUrl: url,
      };
  }

  const segments = ["revenue_by_product", "revenue_by_geography"]
    .map((key) => ({ key, rows: segmentRows(fin.annual, key) }))
    .filter((s) => s.rows.length);

  const blocksByTopic: Record<number, Block[]> = {
    1: [
      {
        type: "facts",
        facts: facts(profile, [
          "legal_name",
          "legal_name_ar",
          "isin",
          "listing_date",
          "legal_form",
          "founding_date",
          "headquarters_address",
          "reporting_standard",
          "website",
          "investor_relations_url",
        ]),
      },
    ],
    2: [
      {
        type: "facts",
        facts: facts(profile, [
          "business_description_ar",
          "business_description",
          "products_services",
          "business_segments",
          "geographic_presence",
          "subsidiaries_count",
        ]),
      },
      ...segments.map((s): Block => ({ type: "segments", title: labelOf(s.key), rows: s.rows })),
      m("segments", L("نتائج القطاعات", "Segment results"), SEGMENT_TOTALS, fin.annual, "fy"),
    ],
    3: [
      {
        type: "facts",
        facts: facts(profile, ["ceo_name", "chairman_name", "auditor", "employees"]),
      },
    ],
    4: [{ type: "ownership", rows: ownership }],
    5: [
      m("income", L("قائمة الدخل", "Income statement"), INCOME[kind], fin.annual, "fy"),
      m("balance", L("المركز المالي", "Financial position"), BALANCE[kind], fin.instant, "instant"),
      m("cash_flow", L("التدفقات النقدية", "Cash flows"), CASH_FLOW, fin.annual, "fy"),
      ...interim,
      { type: "history", series: historySeries(page, kind) },
    ],
    6: [
      m(
        "earnings_quality",
        L("جودة الأرباح", "Earnings quality"),
        EARNINGS_QUALITY,
        fin.annual,
        "fy",
      ),
    ],
    7: [
      m(
        "ratios",
        L("الربحية والكفاءة", "Profitability and efficiency"),
        RATIOS[kind],
        fin.annual,
        "fy",
      ),
      m(
        "position_ratios",
        L("المركز المالي والملاءة", "Balance sheet and solvency"),
        POSITION_RATIOS[kind],
        fin.instant,
        "instant",
      ),
      m("growth", L("النمو", "Growth"), GROWTH, fin.annual, "fy"),
    ],
    8:
      kind === "ordinary"
        ? [
            m(
              "operations",
              L("المؤشرات التشغيلية", "Operating indicators"),
              OPERATIONS,
              fin.annual,
              "fy",
            ),
          ]
        : [],
    9: [
      m("dividends", L("التوزيعات", "Dividends"), DIVIDENDS, fin.annual, "fy"),
      { type: "actions", rows: actions },
    ],
    11: [{ type: "peers" }],
    12: [
      { type: "market", latest: quote, historyCount: page.sections.market?.history?.length ?? 0 },
    ],
    16: [{ type: "facts", facts: facts(profile, ["credit_rating"]) }],
    17: [m("esg", L("البيئة والانبعاثات", "Environment and emissions"), ESG, fin.annual, "fy")],
    18: [{ type: "documents", rows: documents }],
  };

  const extraReasons: Record<number, string[]> = {
    1: [capabilityReason(page, "profile")].filter(Boolean) as string[],
    4: [capabilityReason(page, "ownership")].filter(Boolean) as string[],
    5: [
      capabilityReason(page, "quarterly_financials"),
      capabilityReason(page, "five_year_history"),
    ].filter(Boolean) as string[],
    8:
      kind === "bank"
        ? ["bank_operational_kpis_not_delivered"]
        : kind === "insurer"
          ? ["no_operational_kpis_for_kind"]
          : [],
    9: [capabilityReason(page, "corporate_actions")].filter(Boolean) as string[],
    10: ["no_sector_datasets"],
    11: [
      page.sections.peer_comparison?.status !== "available"
        ? page.sections.peer_comparison?.reason
        : null,
    ].filter(Boolean) as string[],
    12: [capabilityReason(page, "market_history")].filter(Boolean) as string[],
    13: ["no_forecasts_in_contract"],
    14: [capabilityReason(page, "consensus") ?? "licensed_consensus_feed_required"],
    15: ["no_valuation_multiples_in_contract"],
    18: [capabilityReason(page, "disclosures"), capabilityReason(page, "news")].filter(
      Boolean,
    ) as string[],
  };

  const topics: Topic[] = [...cats.values()]
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((cat) => {
      const blocks = (blocksByTopic[cat.ordinal] ?? []).filter(blockHasContent);
      const status = topicStatus(cat);
      const codes = [
        ...(cat.status === "not_applicable"
          ? ["not_applicable_without_cited_rule"]
          : status === "not_measured"
            ? ["not_assessed"]
            : (cat.gaps ?? [])),
        ...(extraReasons[cat.ordinal] ?? []),
      ];
      return {
        key: cat.category_key,
        ordinal: cat.ordinal,
        title: { ar: cat.name_ar, en: cat.name_en },
        status,
        // لا تغطية لموضوع غير مقاس: الدرجة تُعرض فقط حين قاس المحرك الموضوع فعلًا.
        score: status === "not_measured" || cat.score === null ? null : Number(cat.score),
        reasons: [...new Set(codes)].map(reasonText),
        blocks,
        shownCount: blocks.reduce((n, b) => n + blockCount(b), 0),
      };
    });

  const groups = topics
    .flatMap((t) => t.blocks)
    .filter((b): b is Extract<Block, { type: "metrics" }> => b.type === "metrics")
    .map((b) => b.group);
  const u = page.data_quality.understanding;
  const factory = normalizeFactoryCoverage(page.data_quality.factory_readiness);
  const statements = buildStatements(page, kind);
  const nameAr = attributeText(profile["company_name_ar"]?.value);
  return {
    company: {
      market: page.company.market,
      symbol: page.company.symbol,
      name: { ar: nameAr ?? page.company.name, en: page.company.name },
      sector: page.company.sector,
      industry: page.company.industry,
      exchange: page.company.exchange,
      currency: page.company.currency,
      fiscalYearEnd: page.company.fiscal_year_end,
      latestFiling: page.company.latest_filing,
    },
    kind,
    readiness: {
      investorTopics: normalizeInvestorReadiness(u),
      operationalCategories: factory.readiness,
    },
    factory,
    statements,
    keyFigures: keyFigures(page, kind, statements),
    topics,
    counts: {
      shown: groups.reduce((n, g) => n + g.cells.length, 0),
      withheld: groups.reduce((n, g) => n + g.withheld.length, 0),
    },
    dataNotices: groups.some((g) => g.cells.some((c) => c.proof.document === "import_file_only"))
      ? [
          L(
            "بعض أرقام هذه الشركة مأخوذة من ملف إدخال مراجَع، والمستند الأصلي غير مؤرشف لدى المحرك؛ لم يُتحقق منها مقابل المستند نفسه.",
            "Some figures for this company come from a reviewed import file; the original document is not archived by the engine, so they have not been checked against the document itself.",
          ),
        ]
      : [],
  };
}

function blockCount(b: Block): number {
  switch (b.type) {
    case "metrics":
      return b.group.cells.length;
    case "facts":
      return b.facts.length;
    case "segments":
    case "ownership":
    case "actions":
    case "documents":
      return b.rows.length;
    case "history":
      return b.series.length;
    case "market":
      return b.latest ? 1 : 0;
    case "peers":
      return 0;
  }
}

function blockHasContent(b: Block): boolean {
  if (b.type === "metrics") return b.group.cells.length + b.group.withheld.length > 0;
  // التاريخ يبقى ظاهرًا حتى دون سلاسل، ليشرح للمستخدم أن السنوات غير كافية.
  if (b.type === "peers" || b.type === "market" || b.type === "history") return true;
  return blockCount(b) > 0;
}
