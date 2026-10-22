import type { LocalizedText } from "@/lib/i18n";

/**
 * مقارنة النظراء من محرك البيانات (P01-15).
 *
 * هذا الملف منطق خالص بلا اتصال بالشبكة: يستقبل رد المحرك
 * `GET /v1/companies/{market}/{symbol}/peers` ويطبّق قواعد الثقة قبل أي عرض.
 * القاعدة: ما لا يجتاز الفحص يُحجب بسبب مسجّل، ولا يُستبدل بتقدير.
 */

/** شكل رد المحرك كما في `FinancialQueryService.peer_comparison` (عقد v4). */
export type EnginePeerMetric = {
  value: string | null;
  unit: string | null;
  period_end: string | null;
  period_kind: string | null;
  quality_score?: string | null;
  /** ليست في عقد v4 بعد (المحرك يرفض المحجور قبل النشر). تُقرأ احتياطًا إن ظهرت. */
  quality_status?: string | null;
  quality_reasons?: string[] | null;
  is_calculated?: number | boolean | null;
  provenance?: {
    source?: {
      source_url?: string | null;
      filing_type?: string | null;
      filed_at?: string | null;
    } | null;
    derivation?: { type?: string | null; calculation?: string | null } | null;
  } | null;
};

export type EnginePeerCompany = {
  market: string;
  symbol: string;
  name: string;
  is_target: boolean;
  metrics: Record<string, EnginePeerMetric>;
};

export type EnginePeerResponse = {
  status: "available" | "partial" | "unavailable" | string;
  reason: string | null;
  methodology: string | null;
  classification_basis?: string | null;
  scope: {
    field: string;
    value: string;
    classification_source?: string;
    fallback_from?: { field: string; value: string; reason?: string } | null;
  } | null;
  peer_count: number;
  metric_count: number;
  companies: EnginePeerCompany[];
};

export type CompanyKind = "bank" | "ordinary";

/**
 * مجموعة المقاييس حسب نوع الشركة (الموضوع 7 في نموذج الـ18 فئة).
 * نسب الميزانية للبنوك (القروض إلى الودائع والقروض المتعثرة) غير مدرجة لأن
 * `peer_comparison` لا يقرأ الفترات اللحظية بعد (ACR-006).
 */
export const PEER_METRICS: Record<CompanyKind, readonly string[]> = {
  bank: [
    "return_on_equity",
    "return_on_assets",
    "cost_to_income_ratio",
    "net_interest_margin",
    "cost_of_risk",
  ],
  ordinary: [
    "revenue_growth",
    "net_margin",
    "return_on_equity",
    "return_on_assets",
    "return_on_invested_capital",
    "debt_to_equity",
    "current_ratio",
  ],
};

export const METRIC_LABELS: Record<string, LocalizedText> = {
  return_on_equity: { ar: "العائد على حقوق الملكية", en: "Return on equity" },
  return_on_assets: { ar: "العائد على الأصول", en: "Return on assets" },
  cost_to_income_ratio: { ar: "التكلفة إلى الدخل", en: "Cost to income" },
  net_interest_margin: { ar: "هامش صافي التمويل", en: "Net financing margin" },
  cost_of_risk: { ar: "تكلفة المخاطر", en: "Cost of risk" },
  revenue_growth: { ar: "نمو الإيرادات", en: "Revenue growth" },
  net_margin: { ar: "صافي الهامش", en: "Net margin" },
  return_on_invested_capital: {
    ar: "العائد على رأس المال المستثمر",
    en: "Return on invested capital",
  },
  debt_to_equity: { ar: "الدين إلى حقوق الملكية", en: "Debt to equity" },
  current_ratio: { ar: "نسبة التداول", en: "Current ratio" },
};

/** مقاييس تُعرض كنسبة مئوية. غيرها (مثل نسبة التداول والدين إلى الملكية) تُعرض كمضاعف. */
const PERCENT_METRICS = new Set([
  "return_on_equity",
  "return_on_assets",
  "cost_to_income_ratio",
  "net_interest_margin",
  "cost_of_risk",
  "revenue_growth",
  "net_margin",
  "return_on_invested_capital",
]);

/** وحدات بلا عملة فقط: المقارنة عبر الشركات لا تقارن مبالغ ولا عملات. */
const DIMENSIONLESS_UNITS = new Set(["ratio", "percent"]);
const ACCEPTED_PERIOD_KINDS = new Set(["fy", "ttm"]);
/** أقل عدد للشركات (الهدف + نظيران) حتى يكون للعمود معنى. */
export const MIN_COMPANIES_PER_METRIC = 3;

export type WithheldReason =
  | "engine_unavailable"
  | "sector_fallback_not_comparable"
  | "metric_not_in_company_set"
  | "missing_value"
  | "non_numeric_value"
  | "unit_not_dimensionless"
  | "period_kind_not_annual"
  | "period_mismatch_with_target"
  | "quality_flagged"
  | "no_source"
  | "unsafe_source_url"
  | "calculated_without_formula"
  | "too_few_companies";

/**
 * ما يثبته الدليل فعلًا، ولا شيء أكثر:
 * - `reported`: رقم منشور في المستند المرتبط.
 * - `calculated_formula_recorded`: محسوب بمعادلة مسجّلة من مدخلات ذلك المستند.
 *   قيم المدخلات نفسها لا تصل في رد المقارنة.
 * وجود رابط المصدر لا يعني أن الرقم صحيح ولا أنه تحقق منه طرف مستقل.
 * لذلك `independentlyVerified` ثابتة على false حتى يوفّر المحرك تحققًا مستقلًا.
 */
export type PeerEvidence = {
  basis: "reported" | "calculated_formula_recorded";
  sourceUrl: string;
  filingType: string | null;
  independentlyVerified: false;
};

export type PeerCell = { value: number; display: string; evidence: PeerEvidence };

export type PeerRow = {
  symbol: string;
  market: string;
  name: string;
  isTarget: boolean;
  cells: Record<string, PeerCell | null>;
};

export type PeerColumn = {
  metric: string;
  label: LocalizedText;
  periodEnd: string;
  periodKind: string;
  companies: number;
  median: number;
  medianDisplay: string;
};

export type PeerTable = {
  status: "available" | "unavailable";
  reason: WithheldReason | string | null;
  kind: CompanyKind;
  /** المحرك يصنّف النظراء استنتاجًا، وليسوا منافسين أعلنتهم الشركة. */
  basis: "inferred_peers";
  scopeLabel: string | null;
  columns: PeerColumn[];
  rows: PeerRow[];
  withheld: { symbol: string; metric: string; reason: WithheldReason }[];
};

export function companyKindFromIndustry(industry: string | null | undefined): CompanyKind {
  return industry?.trim().toLowerCase() === "banks" ? "bank" : "ordinary";
}

/** سوق المحرك من قيمة `exchange` في الموقع. أي سوق غير معروف لا يُخمَّن ولا تُعرض له مقارنة. */
export function engineMarketForExchange(exchange: string | null | undefined): "SA" | null {
  const value = exchange?.trim().toLowerCase() ?? "";
  return ["تداول", "نمو", "tadawul", "tasi", "nomu"].includes(value) ? "SA" : null;
}

export function formatMetric(metric: string, value: number): string {
  if (PERCENT_METRICS.has(metric)) return `${(value * 100).toFixed(2)}%`;
  return `${value.toFixed(2)}x`;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

type Checked =
  | { ok: true; cell: PeerCell; periodEnd: string; periodKind: string }
  | { ok: false; reason: WithheldReason };

function checkMetric(metric: string, raw: EnginePeerMetric | undefined): Checked {
  if (!raw || raw.value === null || raw.value === undefined || raw.value === "")
    return { ok: false, reason: "missing_value" };
  const value = Number(raw.value);
  if (!Number.isFinite(value)) return { ok: false, reason: "non_numeric_value" };
  if (!raw.unit || !DIMENSIONLESS_UNITS.has(raw.unit))
    return { ok: false, reason: "unit_not_dimensionless" };
  if (!raw.period_kind || !ACCEPTED_PERIOD_KINDS.has(raw.period_kind) || !raw.period_end) {
    return { ok: false, reason: "period_kind_not_annual" };
  }
  if (isQualityFlagged(raw)) return { ok: false, reason: "quality_flagged" };
  const rawUrl = raw.provenance?.source?.source_url;
  if (!rawUrl) return { ok: false, reason: "no_source" };
  const sourceUrl = safeSourceUrl(rawUrl);
  if (!sourceUrl) return { ok: false, reason: "unsafe_source_url" };
  const derivation = raw.provenance?.derivation;
  const calculated = Boolean(raw.is_calculated) || Boolean(derivation);
  if (calculated && !derivation?.calculation)
    return { ok: false, reason: "calculated_without_formula" };
  const normalized = raw.unit === "percent" ? value / 100 : value;
  return {
    ok: true,
    periodEnd: raw.period_end,
    periodKind: raw.period_kind,
    cell: {
      value: normalized,
      display: formatMetric(metric, normalized),
      evidence: {
        basis: calculated ? "calculated_formula_recorded" : "reported",
        sourceUrl,
        filingType: raw.provenance?.source?.filing_type ?? null,
        independentlyVerified: false,
      },
    },
  };
}

/** حالات جودة مقبولة صراحةً. غيابها مقبول لأن عقد v4 لا يحملها. أي قيمة أخرى تُحجب (فشل مغلق). */
const ACCEPTED_QUALITY_STATUSES = new Set(["ok", "published"]);

function isQualityFlagged(raw: EnginePeerMetric): boolean {
  const status = raw.quality_status?.trim().toLowerCase();
  if (status && !ACCEPTED_QUALITY_STATUSES.has(status)) return true;
  return Array.isArray(raw.quality_reasons) && raw.quality_reasons.length > 0;
}

/**
 * يقبل http و https فقط، بلا بيانات دخول في الرابط. أي شيء آخر (javascript: أو data:
 * أو رابط نسبي أو غير صالح) يُحجب. يحمي من تنفيذ كود عبر href ولا يثبت صحة الرقم.
 */
export function safeSourceUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  return url.href;
}

const unavailable = (kind: CompanyKind, reason: string | null): PeerTable => ({
  status: "unavailable",
  reason,
  kind,
  basis: "inferred_peers",
  scopeLabel: null,
  columns: [],
  rows: [],
  withheld: [],
});

/**
 * يبني جدول المقارنة من رد المحرك بعد تطبيق قواعد الثقة:
 * 1. المقياس ضمن مجموعة نوع الشركة فقط.
 * 2. قيمة رقمية، بوحدة بلا عملة، لفترة سنوية (fy/ttm)، بلا علامة جودة سلبية، برابط مصدر
 *    http(s) آمن، والقيمة المحسوبة معادلتها مسجّلة.
 * 3. فترة النظير مطابقة لفترة الشركة الهدف للمقياس نفسه، وإلا تُحجب الخلية.
 * 4. يُحذف العمود إذا قلّت شركاته عن MIN_COMPANIES_PER_METRIC أو لم يكن للهدف قيمة.
 * لا تُستخدم رتب المحرك لأنها محسوبة على كامل العيّنة قبل حجب الفترات المختلفة.
 */
export function buildPeerTable(response: EnginePeerResponse | null, kind: CompanyKind): PeerTable {
  if (!response || response.status !== "available" || !response.companies?.length) {
    return unavailable(kind, response?.reason ?? "engine_unavailable");
  }
  const target = response.companies.find((c) => c.is_target);
  if (!target) return unavailable(kind, "engine_unavailable");
  // المحرك يوسّع العيّنة من الصناعة إلى القطاع حين لا يجد نظيرًا (مثلًا التعاونية بين البنوك).
  // نماذج أعمال مختلفة لا تُقارن، فتُحجب المقارنة كلها.
  if (response.scope?.fallback_from) return unavailable(kind, "sector_fallback_not_comparable");

  const allowed = PEER_METRICS[kind];
  const withheld: PeerTable["withheld"] = [];
  const columns: PeerColumn[] = [];
  const cellsBySymbol = new Map<string, Record<string, PeerCell | null>>(
    response.companies.map((c) => [c.symbol, {}]),
  );

  for (const company of response.companies) {
    for (const metric of Object.keys(company.metrics ?? {})) {
      if (!allowed.includes(metric))
        withheld.push({ symbol: company.symbol, metric, reason: "metric_not_in_company_set" });
    }
  }

  for (const metric of allowed) {
    const targetCheck = checkMetric(metric, target.metrics?.[metric]);
    if (!targetCheck.ok) {
      if (target.metrics?.[metric])
        withheld.push({ symbol: target.symbol, metric, reason: targetCheck.reason });
      continue;
    }
    const accepted: { symbol: string; cell: PeerCell }[] = [];
    for (const company of response.companies) {
      const raw = company.metrics?.[metric];
      const check = checkMetric(metric, raw);
      if (!check.ok) {
        if (raw) withheld.push({ symbol: company.symbol, metric, reason: check.reason });
        continue;
      }
      if (
        check.periodEnd !== targetCheck.periodEnd ||
        check.periodKind !== targetCheck.periodKind
      ) {
        withheld.push({ symbol: company.symbol, metric, reason: "period_mismatch_with_target" });
        continue;
      }
      accepted.push({ symbol: company.symbol, cell: check.cell });
    }
    if (accepted.length < MIN_COMPANIES_PER_METRIC) {
      withheld.push({ symbol: target.symbol, metric, reason: "too_few_companies" });
      continue;
    }
    for (const { symbol, cell } of accepted) cellsBySymbol.get(symbol)![metric] = cell;
    const med = median(accepted.map((a) => a.cell.value));
    columns.push({
      metric,
      label: METRIC_LABELS[metric] ?? { ar: metric, en: metric },
      periodEnd: targetCheck.periodEnd,
      periodKind: targetCheck.periodKind,
      companies: accepted.length,
      median: med,
      medianDisplay: formatMetric(metric, med),
    });
  }

  if (!columns.length) return { ...unavailable(kind, "too_few_companies"), withheld };

  const rows: PeerRow[] = response.companies
    .map((c) => ({
      symbol: c.symbol,
      market: c.market,
      name: c.name,
      isTarget: c.is_target,
      cells: Object.fromEntries(
        columns.map((col) => [col.metric, cellsBySymbol.get(c.symbol)?.[col.metric] ?? null]),
      ),
    }))
    .filter((r) => r.isTarget || Object.values(r.cells).some(Boolean))
    .sort((a, b) => Number(b.isTarget) - Number(a.isTarget) || a.symbol.localeCompare(b.symbol));

  return {
    status: "available",
    reason: null,
    kind,
    basis: "inferred_peers",
    scopeLabel: response.scope?.value ?? null,
    columns,
    rows,
    withheld,
  };
}
