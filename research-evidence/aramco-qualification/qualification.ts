import { canonical, IdentitySchema } from "../v1/contract";

export type AuditObservation = {
  audit_row: string;
  identity: {
    companyId: string;
    metric: string;
    scope: string;
    dimensions: Record<string, string>;
    unit: string;
    currency: string | null;
    kind: string;
    start: string | null;
    end: string;
    fiscalYear: number;
    fiscalQuarter: number | null;
  };
  source: { document_key: string; pdf_page: number; table: string; column: string };
  observed_amount: string;
  source_scale: string;
  engine_mapping: string | null;
  source_check?: string;
};
export type EngineRow = {
  company_id?: string;
  metric?: string;
  period_kind?: string;
  period_start?: string | null;
  period_end?: string;
  fiscal_year?: number | null;
  fiscal_quarter?: number | null;
  scope?: string;
  dimensions?: Record<string, string>;
  currency?: string | null;
  unit?: string;
  value?: string | number | null;
  value_type?: string;
  fact_id?: string;
  fact_sha256?: string;
  version?: number;
  source_key?: string;
  source_url?: string;
  paths?: string[];
  path?: string;
  is_calculated?: number | boolean;
  provenance?: {
    source?: {
      document_id?: string;
      document_version?: number;
      artifact_sha256?: string | null;
      page?: number;
      table?: string;
      anchor?: string;
      published_at?: string;
      content_hash?: string;
      filed_at?: string;
      rights_grant?: { document_sha256?: string };
    };
    derivation?: { lineage?: { current_inputs_reproduced?: boolean } };
  };
  independent_verification?: { report_sha256?: string };
};
export function identity(o: AuditObservation) {
  const { kind, start, end, fiscalYear, fiscalQuarter, ...rest } = o.identity;
  return IdentitySchema.parse({ ...rest, period: { kind, start, end, fiscalYear, fiscalQuarter } });
}
function decimal(s: string): [bigint, bigint] {
  if (!/^-?\d+(\.\d+)?$/.test(s)) throw Error("invalid_decimal");
  const [whole, fraction = ""] = s.split(".");
  return [BigInt(whole + fraction), 10n ** BigInt(fraction.length)];
}
/** Exact audit unit normalization only; not an investment formula or engine recalculation. */
export function equalAmount(amount: string, scale: string, normalized: string) {
  if (!/^\d+$/.test(scale) || BigInt(scale) <= 0n) throw Error("invalid_scale");
  const [a, d] = decimal(amount),
    [b, e] = decimal(normalized);
  return a * BigInt(scale) * e === b * d;
}
export function engineResearchGaps(f: EngineRow): string[] {
  const s = f.provenance?.source ?? {};
  const gaps: string[] = [];
  if (!f.fact_id) gaps.push("stable_fact_id_missing");
  if (!Number.isInteger(f.version) || (f.version ?? 0) < 1) gaps.push("fact_version_missing");
  if (!/^[a-f0-9]{64}$/.test(f.fact_sha256 ?? "")) gaps.push("fact_revision_digest_missing");
  if (!s.document_id) gaps.push("document_id_missing");
  if (!Number.isInteger(s.document_version)) gaps.push("document_version_missing");
  if (!/^[a-f0-9]{64}$/.test(s.artifact_sha256 ?? ""))
    gaps.push("original_artifact_sha256_missing");
  if (!s.page && !s.table && !s.anchor) gaps.push("source_locator_missing");
  if (!/^\d{4}-\d\d-\d\dT/.test(s.published_at ?? ""))
    gaps.push("publication_time_precision_missing");
  if (!s.rights_grant?.document_sha256) gaps.push("documented_rights_grant_missing");
  if (!f.independent_verification?.report_sha256) gaps.push("independent_review_receipt_missing");
  if (f.is_calculated && !f.provenance?.derivation?.lineage?.current_inputs_reproduced)
    gaps.push("derived_input_versions_not_reproduced");
  return gaps;
}
function matchingPeriod(o: AuditObservation, f: EngineRow) {
  const p = identity(o).period;
  return (
    p.kind === f.period_kind &&
    p.start === (f.period_start ?? null) &&
    p.end === f.period_end &&
    p.fiscalYear === (f.fiscal_year ?? null) &&
    p.fiscalQuarter === (f.fiscal_quarter ?? null)
  );
}
export function compareObservation(
  o: AuditObservation,
  candidates: EngineRow[],
  sourceUrl: string,
) {
  identity(o); // strict calendar/type validation from B01, no new measurement policy
  const reasons: string[] = [];
  if (!o.engine_mapping)
    return {
      comparison: "NO_APPROVED_METRIC_MAPPING",
      reasons: ["definition_mapping_required"],
      matches: [],
    };
  let pool = candidates.filter((f) => f.metric === o.engine_mapping);
  if (!pool.length)
    return { comparison: "MISSING_IN_SNAPSHOT", reasons: ["engine_metric_missing"], matches: [] };
  pool = pool.filter((f) => f.company_id === o.identity.companyId);
  if (!pool.length)
    return {
      comparison: "COMPANY_IDENTITY_DIFFERENCE",
      reasons: ["issuer_context_missing_or_different"],
      matches: [],
    };
  if (!pool.some((f) => f.period_end === o.identity.end))
    return {
      comparison: "REQUESTED_PERIOD_NOT_IN_SNAPSHOT",
      reasons: ["requested_period_end_missing"],
      matches: [],
    };
  pool = pool.filter((f) => matchingPeriod(o, f));
  if (!pool.length)
    return {
      comparison: "PERIOD_DIFFERENCE",
      reasons: ["full_period_identity_differs"],
      matches: [],
    };
  pool = pool.filter(
    (f) =>
      f.scope === o.identity.scope &&
      canonical(f.dimensions ?? {}) === canonical(o.identity.dimensions),
  );
  if (!pool.length)
    return {
      comparison: "SCOPE_OR_DEFINITION_DIFFERENCE",
      reasons: ["scope_dimensions_differ"],
      matches: [],
    };
  pool = pool.filter((f) => (f.currency || null) === o.identity.currency);
  if (!pool.length)
    return { comparison: "CURRENCY_DIFFERENCE", reasons: ["currency_differs"], matches: [] };
  pool = pool.filter((f) => f.unit === o.identity.unit);
  if (!pool.length)
    return { comparison: "UNIT_DIFFERENCE", reasons: ["unit_differs"], matches: [] };
  // Do not choose the first equal value when a conflicting record also exists.
  const values = new Set(pool.map((f) => canonical([f.value, f.value_type])));
  if (values.size > 1) reasons.push("conflicting_engine_records");
  const exact = pool.filter((f) => f.source_url === sourceUrl);
  if (!exact.length) reasons.push("source_url_differs");
  const compared = exact.length ? exact : pool;
  if (compared.some((f) => f.value === null || f.value === undefined))
    reasons.push("engine_value_unavailable");
  if (compared.some((f) => f.is_calculated)) reasons.push("calculated_value_not_direct_original");
  const available = compared.filter((f) => f.value !== null && f.value !== undefined);
  if (available.length) {
    try {
      if (!available.every((f) => equalAmount(o.observed_amount, o.source_scale, String(f.value))))
        reasons.push("numeric_or_sign_difference");
    } catch {
      reasons.push("uncomparable_numeric_representation");
    }
  }
  return {
    comparison: reasons.length ? "REVIEW_DIFFERENCE" : "NUMERICAL_SOURCE_MATCH_NOT_QUALIFICATION",
    reasons,
    matches: compared.map((f) => ({
      paths: f.paths,
      version: f.version,
      source_key: f.source_key,
      source_url: f.source_url,
      missing_for_B01: engineResearchGaps(f),
    })),
  };
}
/** A user assertion is not a grant document. Never activates data or creates B01 references. */
export function qualificationStatus(
  gaps: string[],
  rights: { status: string; grant_reference: string | null },
  financialReview: boolean,
) {
  const reasons = [...gaps];
  if (rights.status !== "DOCUMENTED_AND_REVIEWED" || !rights.grant_reference)
    reasons.push("rights_evidence_pending");
  if (!financialReview) reasons.push("financial_review_pending");
  return {
    state: reasons.length ? "WITHHELD" : "TECHNICALLY_REVIEWABLE_NOT_PUBLISHED",
    reasons,
    publicationAuthorized: false,
  };
}
