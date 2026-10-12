/**
 * عقد صفحة الشركة من محرك البيانات (finengine) — الإصدار 5.
 *
 * هذه الأنواع نسخة للقراءة فقط مما يرجعه المسار العام
 * `GET /v1/companies/{market}/{symbol}/page`. لا يضيف الموقع أي حقل للعقد،
 * ولا يحسب قيمًا: كل رقم يُعرض يأتي من هذا الرد كما هو مع مصدره وفترته.
 * أي تغيير في العقد يُتفق عليه مع Codex (مالك المحرك وواجهة API).
 */

/** إصدار حمولة صفحة الشركة (contract_version داخل الرد). */
export const SUPPORTED_CONTRACT_VERSION = 5;
/** إصدار عقد الواجهة المثبت (docs/api/contract-v1.0.0.json) وترويسته. */
export const API_CONTRACT_VERSION = "1.0.0";
export const API_CONTRACT_HEADER = "X-Marefa-API-Contract";

export type CapabilityStatus = "available" | "partial" | "unavailable";

export interface Capability {
  status: CapabilityStatus;
  count: number;
  reason: string | null;
}

export interface SourceTrace {
  source_key: string | null;
  source_url: string | null;
  filing_type?: string | null;
  filed_at?: string | null;
  content_hash?: string | null;
  artifact_sha256?: string | null;
}

export interface Extraction {
  raw_label: string | null;
  raw_value: string | null;
  page: number | string | null;
  confidence: string | null;
  mapping_method: string | null;
}

export interface Lineage {
  /** not_recorded | unverified_record | reproduced_current_inputs */
  status: string;
  current_inputs_reproduced: boolean;
  independent_source_verification: string;
}

export interface Derivation {
  type: string;
  calculation: string | null;
  lineage?: Lineage;
}

export interface Provenance {
  source: SourceTrace | null;
  extraction?: Extraction | null;
  derivation?: Derivation | null;
}

export interface MetricRow {
  display_name: string;
  category: string;
  statement: string | null;
  /** العقد 1.0.0: القيم الرقمية نصوص، والغياب null — لا تحويل إلى صفر. */
  value: string | null;
  value_type: string;
  currency: string;
  unit: string;
  period_start: string | null;
  period_end: string;
  period_kind: string;
  fiscal_year: number | null;
  fiscal_quarter: number | null;
  scope: string;
  dimensions: Record<string, string>;
  source_url: string | null;
  filed_at: string | null;
  is_calculated: number;
  calculation: string | null;
  provenance: Provenance;
}

export interface Snapshot {
  status: "available" | "partial" | "unavailable";
  reason: string | null;
  period_kind: string;
  period_end: string | null;
  metrics: Record<string, MetricRow[]>;
}

export interface History {
  status: string;
  reason: string | null;
  period_kind: string;
  periods: { period_end: string; metrics: Record<string, MetricRow[]> }[];
}

export interface Attribute {
  value: string | number | boolean | null | Record<string, unknown> | unknown[];
  category: string;
  language: string | null;
  source_key: string | null;
  effective_at: string | null;
  provenance: { source: SourceTrace | null };
}

export interface PricePoint {
  observed_at: string;
  close: string | null;
  volume: string | null;
  currency: string;
  source_url: string | null;
}

export interface OwnershipPosition {
  holder_name: string;
  holder_type: string;
  ownership_pct: string | null;
  as_of_date: string | null;
  source_url: string | null;
}

export interface CorporateAction {
  action_type: string;
  title: string;
  announcement_date: string | null;
  effective_date: string | null;
  cash_amount: string | null;
  currency: string | null;
  status: string | null;
  source_url: string | null;
}

export interface Disclosure {
  disclosure_type: string;
  title: string;
  body_text: string;
  published_at: string | null;
  period_end: string | null;
  source_url: string | null;
}

export interface OfficialSource {
  source_key: string;
  filing_type: string | null;
  filed_at: string | null;
  source_url: string | null;
  status: string;
  content_hash: string | null;
}

export interface PeerMetric {
  value: string | null;
  unit: string;
  period_end: string;
  period_kind: string;
}

export interface PeerComparison {
  status: CapabilityStatus;
  reason: string | null;
  methodology: string;
  classification_basis: string;
  scope: { field: string; value: string } | null;
  peer_count: number;
  metric_count: number;
  companies: {
    company_id: string;
    symbol: string;
    name: string;
    is_target: boolean;
    metrics: Record<string, PeerMetric>;
  }[];
}

export interface FieldAvailability {
  field_key: string;
  status: "unavailable" | "not_applicable";
  reason_code: string;
  reason: string;
  evidence_url: string;
  evidence_note: string;
  assessed_at: string;
  expires_at: string | null;
  evidence_current: boolean;
  catalog_category: string | null;
}

export interface CompletenessCategory {
  category: string;
  expected_fields: number;
  populated_fields: number;
  completeness_score: string;
  status: string;
}

export interface Completeness {
  expected_fields: number;
  populated_fields: number;
  completeness_score: string | null;
  status: "assessed" | "not_assessed";
  reason: string | null;
  categories: CompletenessCategory[];
}

export type ReadinessState = "ready" | "not_ready" | "not_assessed";

export interface Readiness {
  readiness_state: ReadinessState;
  total_score: string | null;
  target_score: string | null;
  blocking_reasons: string[];
}

export interface CompanyOverview {
  company_id: string;
  market: string;
  symbol: string;
  name: string;
  currency: string;
  isin: string | null;
  fiscal_year_end: string | null;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  latest_filing: string | null;
}

export interface CompanyPage {
  contract_version: number;
  generated_at: string;
  placeholder_policy: string;
  company: CompanyOverview;
  sections: {
    profile: Record<string, Attribute>;
    financials: {
      annual: Snapshot;
      quarter: Snapshot;
      ytd: Snapshot;
      ttm: Snapshot;
      instant: Snapshot;
      history: { annual: History; annual_position: History; quarter: History };
    };
    market: { latest: PricePoint | null; history: PricePoint[] };
    ownership: OwnershipPosition[];
    corporate_actions: CorporateAction[];
    disclosures: Disclosure[];
    consensus: unknown[];
    peer_comparison: PeerComparison;
    official_sources: OfficialSource[];
  };
  capabilities: Record<string, Capability>;
  data_quality: {
    completeness: Completeness;
    understanding: Readiness;
    factory_readiness: Readiness;
    field_availability: FieldAvailability[];
    open_backlog: number;
  };
}

/** رد الخطأ من الواجهة، مثل 404 لشركة غير موجودة في المحرك. */
export interface ApiError {
  error: string;
}

export type TopicState = "available" | "partial" | "unavailable" | "not_in_contract";

export interface TopicAssessment {
  topic_key: string;
  name_ar: string | null;
  state: TopicState;
  delivered: string[];
  reasons: string[];
  verification: Record<string, number>;
  contract_gaps: string[];
  rights: string | null;
}

export function isApiError(payload: CompanyPage | ApiError): payload is ApiError {
  return "error" in payload && !("sections" in payload);
}
