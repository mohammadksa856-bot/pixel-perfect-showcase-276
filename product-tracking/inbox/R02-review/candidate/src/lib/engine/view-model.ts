/**
 * يحوّل رد واجهة المحرك (عقد الصفحة v5) إلى نموذج عرض لصفحة الشركة.
 *
 * دالة نقية بلا شبكة ولا حالة. لا تحسب أي رقم، ولا تملأ فراغًا، ولا ترفع
 * مستوى التحقق: كل خلية تحمل فترتها ومصدرها وطريقة إنتاجها كما في العقد،
 * وكل غياب يحمل سبب الواجهة نفسها.
 */
import type {
  ApiError,
  Capability,
  CompanyPage,
  History,
  MetricRow,
  Snapshot,
  TopicAssessment,
} from "./contract.ts";
import { isApiError } from "./contract.ts";
import { pageProblems } from "./conformance.ts";
import { formatDate, formatPercentShare, formatValue } from "./format.ts";
import {
  CAPABILITY_AR,
  METRIC_AR,
  PERIOD_KIND_AR,
  STATEMENT_AR,
  TOPIC_STATE_AR,
  VERIFICATION_AR,
  dimensionLabel,
  metricLabel,
  reasonAr,
} from "./labels.ts";

export interface ValueCell {
  key: string;
  label: string;
  text: string;
  raw: string;
  negative: boolean;
  periodKind: string;
  periodEnd: string;
  periodLabel: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
  verification: string;
  verificationLabel: string;
  calculation: string | null;
  /** الوحدة تناقض معنى المقياس؛ القيمة محجوبة حتى يصححها المحرك. */
  unitConflict: boolean;
  /**
   * دليل المصدر كما في العقد: archived = رابط + بصمة وثيقة مؤرشفة؛
   * url_only = رابط بلا وثيقة مؤرشفة؛ none = بلا مصدر. البصمة دليل أصل لا شهادة دقة.
   */
  sourceEvidence: SourceEvidence;
  sourceEvidenceLabel: string;
}

export interface SegmentTable {
  title: string;
  dimension: string;
  periodLabel: string;
  measures: { key: string; label: string }[];
  rows: { value: string; cells: (ValueCell | null)[] }[];
}

export interface NoteTable {
  key: string;
  label: string;
  periodLabel: string;
  dimensions: { key: string; label: string }[];
  rows: { values: string[]; cell: ValueCell }[];
}

export type SourceEvidence = "archived" | "url_only" | "none";

export const SOURCE_EVIDENCE_AR: Record<SourceEvidence, string> = {
  archived: "مصدر مؤرشف ببصمة",
  url_only: "رابط مصدر بلا وثيقة مؤرشفة",
  none: "بلا مصدر",
};

export function sourceEvidenceOf(
  row: Pick<MetricRow, "source_url" | "provenance">,
): SourceEvidence {
  const source = row.provenance?.source;
  const url = source?.source_url ?? row.source_url;
  if (!url) return "none";
  return /^[0-9a-f]{64}$/.test(source?.content_hash ?? "") ? "archived" : "url_only";
}

export interface StatementGroup {
  statement: string;
  label: string;
  cells: ValueCell[];
}

export interface PeriodBlock {
  kind: "annual" | "quarter" | "ytd" | "ttm" | "instant";
  title: string;
  periodEnd: string | null;
  available: boolean;
  reason: string | null;
  groups: StatementGroup[];
}

export interface HistoryTable {
  title: string;
  periods: string[];
  rows: { key: string; label: string; cells: (ValueCell | null)[] }[];
  reason: string | null;
}

export interface Banner {
  tone: "info" | "warning";
  text: string;
}

export interface CapabilityView {
  key: string;
  label: string;
  status: Capability["status"];
  count: number;
  reason: string;
}

export interface TopicView {
  key: string;
  name: string;
  state: TopicAssessment["state"];
  stateLabel: string;
  reasons: string[];
  deliveredCount: number;
  contractGaps: string[];
}

export interface PeerView {
  status: Capability["status"];
  reason: string;
  basis: string;
  metrics: { key: string; label: string }[];
  rows: { symbol: string; name: string; isTarget: boolean; cells: (string | null)[] }[];
}

export interface CompanyView {
  state: "ok";
  company: {
    symbol: string;
    market: string;
    name: string;
    nameAr: string | null;
    sector: string | null;
    industry: string | null;
    exchange: string | null;
    isin: string | null;
    currency: string;
    latestFiling: string | null;
  };
  generatedAt: string;
  banners: Banner[];
  headline: ValueCell[];
  market: {
    close: string | null;
    observedAt: string | null;
    sourceUrl: string | null;
    reason: string;
  };
  periods: PeriodBlock[];
  sectorKpis: StatementGroup[];
  /** جداول القطاعات/المناطق من الصفوف المنشورة بنطاق غير موحد؛ بلا مجاميع محسوبة. */
  segmentTables: SegmentTable[];
  /** الإيضاحات المفصلة: صفوف موحدة لها أبعاد (حسب المنتج، حسب فئة الأصل...). */
  notes: NoteTable[];
  history: HistoryTable[];
  peers: PeerView;
  profile: { key: string; label: string; value: string; sourceUrl: string | null }[];
  ownership: {
    holder: string;
    type: string;
    share: string | null;
    asOf: string | null;
    sourceUrl: string | null;
  }[];
  actions: {
    title: string;
    type: string;
    date: string | null;
    amount: string | null;
    sourceUrl: string | null;
  }[];
  disclosures: { title: string; type: string; date: string | null; sourceUrl: string | null }[];
  sources: { title: string; filedAt: string | null; url: string | null; hash: string | null }[];
  missing: {
    key: string;
    status: string;
    reason: string;
    evidenceUrl: string;
    note: string;
    current: boolean;
  }[];
  capabilities: CapabilityView[];
  topics: TopicView[];
  verification: { key: string; label: string; count: number }[];
  completenessText: string;
  /** عدد القيم المعروضة حسب دليل المصدر (archived / url_only / none). */
  sourceEvidenceCounts: { key: SourceEvidence; label: string; count: number }[];
  dataIssues: {
    key: string;
    label: string;
    periodLabel: string;
    raw: string;
    sourceUrl: string | null;
  }[];
}

export interface NotCoveredView {
  state: "not_covered";
  market: string;
  symbol: string;
  message: string;
}

export interface UnsupportedView {
  state: "unsupported_contract";
  version: number;
  /** مخالفات العقد 1.0.0 كما وجدها فحص المطابقة. */
  problems: string[];
}

/** تعذر الوصول للواجهة أو رد بعقد مختلف: رسالة فقط، بلا أي رقم. */
export interface UnavailableView {
  state: "engine_unavailable";
  message: string;
}

export type EngineView = CompanyView | NotCoveredView | UnsupportedView | UnavailableView;

/** المجموعات التي تظهر في القوائم المالية، بترتيب العرض. */
const STATEMENT_ORDER = [
  "income_statement",
  "banking_income",
  "insurance_income",
  "balance_sheet",
  "banking_balance_sheet",
  "insurance_balance_sheet",
  "cash_flow",
  "per_share",
  "dividends",
  "ratios",
  "banking_ratios",
  "insurance_ratios",
  "growth",
  "analytics",
  "valuation",
];

/** مجموعات المؤشرات التشغيلية والقطاعية. */
const SECTOR_STATEMENTS = new Set([
  "operational",
  "production",
  "reliability",
  "market_driver",
  "capacity",
  "reserves",
  "commercial",
]);
const isSectorStatement = (statement: string) =>
  SECTOR_STATEMENTS.has(statement) || statement.endsWith("_operations");

const HEADLINE_KEYS = [
  "revenue",
  "total_operating_income",
  "net_income",
  "basic_eps",
  "eps_diluted",
  "free_cash_flow",
  "total_assets",
  "total_equity",
  "dividends_per_share",
];

const PERIOD_TITLES: Record<PeriodBlock["kind"], string> = {
  annual: "آخر سنة مالية",
  quarter: "آخر ربع",
  ytd: "منذ بداية السنة",
  ttm: "آخر 12 شهرًا",
  instant: "المركز المالي",
};

const PROFILE_KEYS: [string, string][] = [
  ["company_name_ar", "الاسم"],
  ["legal_name", "الاسم القانوني"],
  ["business_description_ar", "النشاط"],
  ["business_description", "النشاط (بالإنجليزية)"],
  ["business_segments", "القطاعات"],
  ["products_services", "المنتجات والخدمات"],
  ["geographic_presence", "الانتشار الجغرافي"],
  ["ceo_name", "الرئيس التنفيذي"],
  ["chairman_name", "رئيس مجلس الإدارة"],
  ["auditor", "المراجع الخارجي"],
  ["listing_date", "تاريخ الإدراج"],
  ["employees", "عدد الموظفين"],
  ["headquarters_address", "المقر الرئيسي"],
  ["website", "الموقع الإلكتروني"],
];

const METRIC_ORDER = Object.keys(METRIC_AR);

/** ترتيب البنود كما في القوائم (الإيرادات أولًا...) ثم الباقي أبجديًا. */
export function byStatementOrder(a: ValueCell, b: ValueCell): number {
  const rank = (key: string) => {
    const index = METRIC_ORDER.indexOf(key);
    return index === -1 ? METRIC_ORDER.length : index;
  };
  return rank(a.key) - rank(b.key) || a.label.localeCompare(b.label, "ar");
}

/**
 * أسباب الموضوع كما تُعرض للمستخدم: أسباب الواجهة المفهومة فقط. رموز
 * "missing:*" تفاصيل تقنية للتقرير، ولا تُعرض إلا بصيغة عامة إن لم يوجد غيرها.
 */
export function topicReasonsForUser(reasons: string[]): string[] {
  const readable = reasons.filter((reason) => !reason.startsWith("missing:")).map(reasonAr);
  if (readable.length) return readable;
  return reasons.length ? ["لا تصل بيانات هذا الموضوع في رد الواجهة بعد"] : [];
}

export function verificationOf(row: MetricRow): string {
  const derivation = row.provenance?.derivation;
  if (derivation) return `calculated_${derivation.lineage?.status ?? "not_recorded"}`;
  if (row.is_calculated) return "calculated_not_recorded";
  if (row.provenance?.extraction) return "reported_extracted";
  return "reported_manifest";
}

/** الصف الموحّد غير المجزأ فقط — صفوف القطاعات والأبعاد لها مكانها الخاص. */
export function consolidatedRow(rows: MetricRow[] | undefined): MetricRow | null {
  if (!rows) return null;
  return (
    rows.find(
      (row) => row.value !== null && (row as MetricRow & { quality_status?: string }).quality_status !== "quarantined" && row.scope === "consolidated" && Object.keys(row.dimensions ?? {}).length === 0,
    ) ?? null
  );
}

export function periodLabel(
  row: Pick<MetricRow, "period_kind" | "period_end" | "fiscal_year" | "fiscal_quarter">,
): string {
  if (row.period_kind === "quarter" && row.fiscal_year && row.fiscal_quarter) {
    return `الربع ${row.fiscal_quarter} ${row.fiscal_year}`;
  }
  if (row.period_kind === "fy" && row.fiscal_year) return `السنة المالية ${row.fiscal_year}`;
  return `${PERIOD_KIND_AR[row.period_kind] ?? row.period_kind} ${row.period_end}`;
}

const PER_SHARE_KEY = /(_per_share$|^basic_eps$|^eps_diluted$|^earnings_per_share)/;
const SHARE_COUNT_KEY = /^(weighted_average_shares|shares_outstanding|shares_issued_count)/;

/**
 * فحص اتساق الوحدة مع معنى المقياس. لا يصحح القيمة: يحجبها فقط ويُبلغ عنها.
 * مثال حقيقي: توزيع للسهم مخزّن بوحدة SAR وبمقياس القوائم (2,500,000 بدل 2.5).
 */
export function unitConflict(key: string, row: Pick<MetricRow, "unit" | "statement" | "currency">): boolean {
  if (PER_SHARE_KEY.test(key) || (row.statement === "per_share" && !key.endsWith("_growth"))) {
    return !row.currency || !["currency/share", `${row.currency}/share`].includes(row.unit);
  }
  if (SHARE_COUNT_KEY.test(key)) return row.unit !== "shares";
  return false;
}

export function toCell(key: string, row: MetricRow): ValueCell | null {
  const formatted = formatValue(key, row.value, row.unit, row.currency);
  if (!formatted) return null;
  const conflict = unitConflict(key, row);
  const verification = verificationOf(row);
  const source = row.provenance?.source;
  return {
    key,
    label: metricLabel(key, row.display_name),
    text: conflict ? "محجوب: وحدة غير متسقة في المصدر (طُلب تصحيحها)" : formatted.text,
    raw: `${formatted.raw} ${row.unit}`.trim(),
    negative: conflict ? false : formatted.negative,
    periodKind: row.period_kind,
    periodEnd: row.period_end,
    periodLabel: periodLabel(row),
    sourceUrl: source?.source_url ?? row.source_url ?? null,
    sourceTitle: source?.filing_type ?? null,
    verification,
    verificationLabel: VERIFICATION_AR[verification] ?? verification,
    calculation: row.provenance?.derivation?.calculation ?? null,
    unitConflict: conflict,
    sourceEvidence: sourceEvidenceOf(row),
    sourceEvidenceLabel: SOURCE_EVIDENCE_AR[sourceEvidenceOf(row)],
  };
}

function groupSnapshot(
  snapshot: Snapshot,
  include: (statement: string) => boolean,
): StatementGroup[] {
  const groups = new Map<string, ValueCell[]>();
  for (const [key, rows] of Object.entries(snapshot.metrics)) {
    const row = consolidatedRow(rows);
    if (!row || !row.statement || !include(row.statement)) continue;
    const cell = toCell(key, row);
    if (!cell) continue;
    const list = groups.get(row.statement) ?? [];
    list.push(cell);
    groups.set(row.statement, list);
  }
  const order = (statement: string) => {
    const index = STATEMENT_ORDER.indexOf(statement);
    return index === -1 ? STATEMENT_ORDER.length : index;
  };
  return [...groups.entries()]
    .sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b))
    .map(([statement, cells]) => ({
      statement,
      label: STATEMENT_AR[statement] ?? statement,
      cells: cells.sort(byStatementOrder),
    }));
}

function historyTable(title: string, history: History): HistoryTable {
  const periods = history.periods.map((period) => period.period_end);
  const keys: string[] = [];
  for (const period of history.periods) {
    for (const key of Object.keys(period.metrics)) if (!keys.includes(key)) keys.push(key);
  }
  const rows = keys
    .map((key) => {
      const cells = history.periods.map((period) => {
        const row = consolidatedRow(period.metrics[key]);
        return row ? toCell(key, row) : null;
      });
      const first = cells.find((cell) => cell !== null);
      return { key, label: first?.label ?? key, cells };
    })
    .filter((row) => row.cells.some((cell) => cell !== null));
  return {
    title,
    periods,
    rows,
    reason: history.status === "available" ? null : reasonAr(history.reason),
  };
}

function attributeText(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value))
    return value
      .map((item) => attributeText(item) ?? "")
      .filter(Boolean)
      .join("، ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key}: ${attributeText(item) ?? ""}`)
      .join("، ");
  }
  return String(value);
}

/** مقاييس القطاع المعروفة؛ الأطول أولًا حتى لا تبتلع ebit المقياس adjusted_ebit. */
const SEGMENT_MEASURES = [
  "depreciation_amortization",
  "adjusted_ebit",
  "ebitda",
  "revenue",
  "capex",
  "ebit",
];

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

/** المقياس من المفتاح نفسه: upstream_revenue مع القطاع Upstream → revenue. */
export function segmentMeasure(metricKey: string, dimensionValue: string): string {
  const prefix = `${slug(dimensionValue)}_`;
  if (metricKey.startsWith(prefix)) return metricKey.slice(prefix.length);
  return SEGMENT_MEASURES.find((measure) => metricKey.endsWith(`_${measure}`)) ?? metricKey;
}

export function buildSegmentTables(snapshot: Snapshot, periodTitle: string): SegmentTable[] {
  const groups = new Map<
    string,
    { measures: string[]; rows: Map<string, Map<string, ValueCell>> }
  >();
  for (const [key, rows] of Object.entries(snapshot.metrics)) {
    for (const row of rows) {
      const dims = Object.keys(row.dimensions ?? {});
      if (row.scope === "consolidated" || dims.length !== 1) continue;
      const dimension = dims[0]!;
      const value = row.dimensions[dimension]!;
      const cell = toCell(key, row);
      if (!cell) continue;
      const measure = segmentMeasure(key, value);
      const group = groups.get(dimension) ?? {
        measures: [] as string[],
        rows: new Map<string, Map<string, ValueCell>>(),
      };
      if (!group.measures.includes(measure)) group.measures.push(measure);
      const line = group.rows.get(value) ?? new Map<string, ValueCell>();
      line.set(measure, cell);
      group.rows.set(value, line);
      groups.set(dimension, group);
    }
  }
  const order = (measure: string) => {
    const index = SEGMENT_MEASURES.indexOf(measure);
    return index === -1 ? SEGMENT_MEASURES.length : index;
  };
  return [...groups.entries()].map(([dimension, group]) => {
    const measures = [...group.measures].sort((a, b) => order(a) - order(b) || a.localeCompare(b));
    return {
      title: `حسب ${dimensionLabel(dimension)} · ${periodTitle}`,
      dimension,
      periodLabel: snapshot.period_end ?? "",
      measures: measures.map((key) => ({ key, label: metricLabel(key, key) })),
      rows: [...group.rows.entries()].map(([value, cells]) => ({
        value,
        cells: measures.map((measure) => cells.get(measure) ?? null),
      })),
    };
  });
}

export function buildNotes(snapshot: Snapshot): NoteTable[] {
  const notes: NoteTable[] = [];
  for (const [key, rows] of Object.entries(snapshot.metrics)) {
    const dimensioned = rows.filter(
      (row) => row.scope === "consolidated" && Object.keys(row.dimensions ?? {}).length > 0,
    );
    if (!dimensioned.length) continue;
    const dimensionKeys = [...new Set(dimensioned.flatMap((row) => Object.keys(row.dimensions)))];
    const tableRows = dimensioned.flatMap((row) => {
      const cell = toCell(key, row);
      return cell ? [{ values: dimensionKeys.map((dim) => row.dimensions[dim] ?? "—"), cell }] : [];
    });
    if (!tableRows.length) continue;
    notes.push({
      key,
      label: metricLabel(key, dimensioned[0]!.display_name),
      periodLabel: tableRows[0]!.cell.periodLabel,
      dimensions: dimensionKeys.map((dim) => ({ key: dim, label: dimensionLabel(dim) })),
      rows: tableRows,
    });
  }
  return notes.sort((a, b) => a.label.localeCompare(b.label, "ar"));
}

function evidenceCounts(cells: ValueCell[]) {
  const counts: Record<SourceEvidence, number> = { archived: 0, url_only: 0, none: 0 };
  for (const cell of cells) counts[cell.sourceEvidence] += 1;
  return (Object.keys(counts) as SourceEvidence[]).map((key) => ({
    key,
    label: SOURCE_EVIDENCE_AR[key],
    count: counts[key],
  }));
}

function dataIssues(cells: ValueCell[]) {
  const seen = new Set<string>();
  return cells
    .filter((cell) => cell.unitConflict)
    .filter((cell) => {
      const id = `${cell.key}|${cell.periodEnd}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((cell) => ({
      key: cell.key,
      label: cell.label,
      periodLabel: cell.periodLabel,
      raw: cell.raw,
      sourceUrl: cell.sourceUrl,
    }));
}

export function buildCompanyView(
  payload: CompanyPage | ApiError,
  topics: TopicAssessment[] | null,
  request: { market: string; symbol: string },
): EngineView {
  if (isApiError(payload)) {
    return {
      state: "not_covered",
      market: request.market,
      symbol: request.symbol,
      message: "هذه الشركة غير موجودة في محرك البيانات بعد. لا نعرض لها أي رقم بديل.",
    };
  }
  const problems = pageProblems(payload);
  if (problems.length) {
    return { state: "unsupported_contract", version: payload.contract_version, problems };
  }
  const { sections, capabilities, data_quality: quality, company } = payload;
  const financials = sections.financials;

  const banners: Banner[] = [];
  const readiness = quality.factory_readiness;
  if (readiness.readiness_state === "ready") {
    banners.push({
      tone: "info",
      text: `جاهزية الفئات الـ18: جاهزة — الدرجة ${readiness.total_score ?? "—"} مقابل هدف ${readiness.target_score ?? "95"}. الجاهزية تعني اكتمال التغطية حسب عقد المصنع، وليست شهادة بدقة كل رقم.`,
    });
  } else {
    banners.push({
      tone: "warning",
      text:
        readiness.readiness_state === "not_assessed"
          ? "لم تُقيَّم جاهزية بيانات هذه الشركة بعد. الأرقام معروضة كما نُشرت مع مصدرها وفترتها، ولم تُعتمد اعتمادًا كاملًا."
          : "بيانات هذه الشركة لم تبلغ حد الجاهزية بعد حسب عقد المصنع. الأرقام معروضة كما نُشرت مع مصدرها وفترتها.",
    });
  }
  for (const reason of readiness.blocking_reasons)
    banners.push({ tone: "info", text: reasonAr(reason) });

  const completeness = quality.completeness;
  const share = formatPercentShare(completeness.completeness_score);
  const completenessText =
    completeness.status === "assessed" && share
      ? `تغطية الحقول: ${share} (${completeness.populated_fields} من ${completeness.expected_fields} حقلًا متوقعًا)`
      : `تغطية الحقول: غير مُقاسة — ${reasonAr(completeness.reason ?? "completeness_not_measured")}`;

  const periods: PeriodBlock[] = (["annual", "quarter", "ytd", "ttm", "instant"] as const).map(
    (kind) => {
      const snapshot = financials[kind];
      return {
        kind,
        title: PERIOD_TITLES[kind],
        periodEnd: snapshot.period_end,
        available: snapshot.status === "available",
        reason: snapshot.status === "available" ? null : reasonAr(snapshot.reason),
        groups: groupSnapshot(
          snapshot,
          (statement) =>
            !isSectorStatement(statement) &&
            statement !== "segments" &&
            statement !== "financial_notes",
        ),
      };
    },
  );

  const sectorKpis = (["annual", "instant", "quarter"] as const).flatMap((kind) =>
    groupSnapshot(
      financials[kind],
      (statement) => isSectorStatement(statement) || statement === "segments",
    ).map((group) => ({ ...group, label: `${group.label} · ${PERIOD_TITLES[kind]}` })),
  );

  const segmentTables = (["annual", "quarter"] as const).flatMap((kind) =>
    buildSegmentTables(financials[kind], PERIOD_TITLES[kind]),
  );
  const notes = buildNotes(financials.annual);

  const headline: ValueCell[] = [];
  for (const key of HEADLINE_KEYS) {
    for (const kind of ["annual", "instant"] as const) {
      const row = consolidatedRow(financials[kind].metrics[key]);
      const cell = row ? toCell(key, row) : null;
      if (cell && !headline.some((item) => item.key === key)) headline.push(cell);
    }
  }

  const history = [
    historyTable("تاريخ سنوي", financials.history.annual),
    historyTable("المركز المالي السنوي", financials.history.annual_position),
    historyTable("تاريخ ربعي", financials.history.quarter),
  ];

  const peerData = sections.peer_comparison;
  const peerMetricKeys = Object.keys(peerData.companies[0]?.metrics ?? {});
  const peers: PeerView = {
    status: peerData.status,
    reason: reasonAr(peerData.reason),
    basis:
      peerData.classification_basis === "inferred_peer_not_issuer_declared_competitor"
        ? `شركات من نفس ${peerData.scope?.field === "industry" ? "الصناعة" : "القطاع"} (${peerData.scope?.value ?? "—"}) — ليست قائمة منافسين أعلنتها الشركة`
        : peerData.classification_basis,
    metrics: peerMetricKeys.map((key) => ({ key, label: metricLabel(key, key) })),
    rows: peerData.companies.map((peer) => ({
      symbol: peer.symbol,
      name: peer.name,
      isTarget: peer.is_target,
      cells: peerMetricKeys.map((key) => {
        const metric = peer.metrics[key];
        return metric ? (formatValue(key, metric.value, metric.unit, "")?.text ?? null) : null;
      }),
    })),
  };

  const profile = PROFILE_KEYS.flatMap(([key, label]) => {
    const attribute = sections.profile[key];
    const value = attribute ? attributeText(attribute.value) : null;
    return value
      ? [{ key, label, value, sourceUrl: attribute?.provenance?.source?.source_url ?? null }]
      : [];
  });

  const latest = sections.market.latest;
  const marketCapability = capabilities["market_history"];
  const capabilityViews: CapabilityView[] = Object.entries(capabilities).map(
    ([key, capability]) => ({
      key,
      label: CAPABILITY_AR[key] ?? key,
      status: capability.status,
      count: capability.count,
      reason: reasonAr(capability.reason),
    }),
  );

  const counts = new Map<string, number>();
  for (const block of periods)
    for (const group of block.groups)
      for (const cell of group.cells) {
        counts.set(cell.verification, (counts.get(cell.verification) ?? 0) + 1);
      }
  for (const group of sectorKpis)
    for (const cell of group.cells) {
      counts.set(cell.verification, (counts.get(cell.verification) ?? 0) + 1);
    }

  const shownCells = [
    ...periods.flatMap((block) => block.groups.flatMap((group) => group.cells)),
    ...sectorKpis.flatMap((group) => group.cells),
    ...segmentTables.flatMap((table) =>
      table.rows.flatMap((row) => row.cells.filter((cell) => cell !== null)),
    ),
    ...notes.flatMap((note) => note.rows.map((row) => row.cell)),
  ];

  return {
    state: "ok",
    company: {
      symbol: company.symbol,
      market: company.market,
      name: company.name,
      nameAr: attributeText(sections.profile["company_name_ar"]?.value),
      sector: company.sector,
      industry: company.industry,
      exchange: company.exchange,
      isin: company.isin,
      currency: company.currency,
      latestFiling: company.latest_filing,
    },
    generatedAt: payload.generated_at,
    banners,
    headline,
    market: {
      close: latest
        ? (formatValue("close", latest.close, latest.currency, latest.currency)?.text ?? null)
        : null,
      observedAt: latest?.observed_at ?? null,
      sourceUrl: latest?.source_url ?? null,
      reason:
        marketCapability && marketCapability.status !== "available"
          ? reasonAr(marketCapability.reason)
          : "",
    },
    periods,
    sectorKpis,
    segmentTables,
    notes,
    history,
    peers,
    profile,
    ownership: sections.ownership.map((item) => ({
      holder: item.holder_name,
      type: item.holder_type,
      share: formatPercentShare(item.ownership_pct),
      asOf: formatDate(item.as_of_date),
      sourceUrl: item.source_url,
    })),
    actions: sections.corporate_actions.map((item) => ({
      title: item.title,
      type: item.action_type,
      date: formatDate(item.announcement_date ?? item.effective_date),
      amount: item.cash_amount
        ? (formatValue("cash_amount", item.cash_amount, item.currency ?? "", item.currency ?? "")
            ?.text ?? null)
        : null,
      sourceUrl: item.source_url,
    })),
    disclosures: sections.disclosures.map((item) => ({
      title: item.title,
      type: item.disclosure_type,
      date: formatDate(item.published_at),
      sourceUrl: item.source_url,
    })),
    sources: sections.official_sources.map((item) => ({
      title: item.filing_type ?? item.source_key,
      filedAt: formatDate(item.filed_at),
      url: item.source_url,
      hash: item.content_hash,
    })),
    missing: quality.field_availability.map((item) => ({
      key: item.field_key,
      status: item.status,
      reason: `${reasonAr(item.reason_code)} — ${item.reason}`,
      evidenceUrl: item.evidence_url,
      note: item.evidence_note,
      current: item.evidence_current,
    })),
    capabilities: capabilityViews,
    topics: (topics ?? []).map((topic) => ({
      key: topic.topic_key,
      name: topic.name_ar ?? topic.topic_key,
      state: topic.state,
      stateLabel: TOPIC_STATE_AR[topic.state] ?? topic.state,
      reasons: topicReasonsForUser(topic.reasons),
      deliveredCount: topic.delivered.length,
      contractGaps: topic.contract_gaps,
    })),
    verification: [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({ key, label: VERIFICATION_AR[key] ?? key, count })),
    completenessText,
    sourceEvidenceCounts: evidenceCounts(shownCells),
    dataIssues: dataIssues([...headline, ...shownCells]),
  };
}
