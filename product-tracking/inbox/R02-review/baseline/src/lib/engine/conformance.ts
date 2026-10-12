/**
 * فحص مطابقة رد صفحة الشركة لعقد الواجهة المثبت 1.0.0 (حمولة الصفحة 5).
 *
 * الموقع لا يعرض ردًا لا يطابق العقد: يرجع قائمة المخالفات، ونموذج العرض
 * يحوّلها إلى حالة «عقد غير مدعوم» بدل التخمين. القوائم أدناه منسوخة من
 * docs/api/contract-v1.0.0.json، واختبار يقارنها بالملف نفسه ليكشف أي انحراف.
 */
import { SUPPORTED_CONTRACT_VERSION } from "./contract.ts";

export const PAGE_REQUIRED = [
  "contract_version",
  "generated_at",
  "placeholder_policy",
  "company",
  "sections",
  "capabilities",
  "data_quality",
];
export const SECTIONS_REQUIRED = [
  "profile",
  "financials",
  "market",
  "ownership",
  "corporate_actions",
  "disclosures",
  "consensus",
  "peer_comparison",
  "official_sources",
];
export const FINANCIALS_REQUIRED = ["annual", "quarter", "ytd", "ttm", "instant", "history"];
export const PERIOD_REQUIRED = ["period_kind", "period_end", "status", "reason", "metrics"];
export const PERIOD_STATUS = ["available", "partial", "unavailable"];
export const FACT_REQUIRED = [
  "value",
  "unit",
  "currency",
  "period_start",
  "period_end",
  "period_kind",
  "fiscal_year",
  "fiscal_quarter",
  "version",
  "source_url",
  "source_key",
  "is_calculated",
  "dimensions",
  "provenance",
];
export const CAPABILITY_REQUIRED = ["status", "count", "reason"];
export const CAPABILITY_STATUS = ["available", "partial", "unavailable"];
export const DATA_QUALITY_REQUIRED = [
  "completeness",
  "understanding",
  "factory_readiness",
  "field_availability",
  "open_backlog",
];
export const READINESS_REQUIRED = [
  "company_id",
  "scoring_model",
  "readiness_state",
  "total_score",
  "target_score",
  "blocking_reasons",
  "categories",
];
export const READINESS_STATES = ["ready", "not_ready", "not_assessed"];
export const AVAILABILITY_REQUIRED = [
  "field_key",
  "status",
  "reason_code",
  "reason",
  "evidence_url",
  "evidence_current",
];
export const PLACEHOLDER_POLICY = "never_substitute_demo_values";

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function missing(object: Json, required: string[], path: string, problems: string[]) {
  for (const key of required) if (!(key in object)) problems.push(`${path}.${key} is required`);
}

/** يرجع مخالفات العقد؛ القائمة الفارغة تعني أن الرد مطابق. */
export function pageProblems(payload: unknown): string[] {
  const problems: string[] = [];
  if (!isObject(payload)) return ["page is not an object"];
  missing(payload, PAGE_REQUIRED, "page", problems);
  if (payload["contract_version"] !== SUPPORTED_CONTRACT_VERSION) {
    problems.push(`page.contract_version must be ${SUPPORTED_CONTRACT_VERSION}`);
  }
  if (payload["placeholder_policy"] !== PLACEHOLDER_POLICY) {
    problems.push(`page.placeholder_policy must be ${PLACEHOLDER_POLICY}`);
  }
  const sections = payload["sections"];
  if (isObject(sections)) {
    missing(sections, SECTIONS_REQUIRED, "sections", problems);
    const financials = sections["financials"];
    if (isObject(financials)) {
      missing(financials, FINANCIALS_REQUIRED, "sections.financials", problems);
      for (const kind of FINANCIALS_REQUIRED.filter((name) => name !== "history")) {
        const period = financials[kind];
        if (!isObject(period)) continue;
        const path = `sections.financials.${kind}`;
        missing(period, PERIOD_REQUIRED, path, problems);
        if (!PERIOD_STATUS.includes(String(period["status"])))
          problems.push(`${path}.status not allowed`);
        const metrics = period["metrics"];
        if (!isObject(metrics)) continue;
        for (const [metric, rows] of Object.entries(metrics)) {
          if (!Array.isArray(rows)) {
            problems.push(`${path}.metrics.${metric} must be an array`);
            continue;
          }
          rows.forEach((row, index) => {
            const factPath = `${path}.metrics.${metric}[${index}]`;
            if (!isObject(row)) {
              problems.push(`${factPath} is not an object`);
              return;
            }
            missing(row, FACT_REQUIRED, factPath, problems);
            if (row["value"] !== null && typeof row["value"] !== "string") {
              problems.push(`${factPath}.value must be a string or null`);
            }
            if (row["is_calculated"] !== 0 && row["is_calculated"] !== 1) {
              problems.push(`${factPath}.is_calculated must be 0 or 1`);
            }
          });
        }
      }
    }
  }
  const capabilities = payload["capabilities"];
  if (isObject(capabilities)) {
    for (const [name, capability] of Object.entries(capabilities)) {
      if (!isObject(capability)) continue;
      missing(capability, CAPABILITY_REQUIRED, `capabilities.${name}`, problems);
      if (!CAPABILITY_STATUS.includes(String(capability["status"]))) {
        problems.push(`capabilities.${name}.status not allowed`);
      }
    }
  }
  const quality = payload["data_quality"];
  if (isObject(quality)) {
    missing(quality, DATA_QUALITY_REQUIRED, "data_quality", problems);
    const readiness = quality["factory_readiness"];
    if (isObject(readiness)) {
      missing(readiness, READINESS_REQUIRED, "data_quality.factory_readiness", problems);
      if (!READINESS_STATES.includes(String(readiness["readiness_state"]))) {
        problems.push("data_quality.factory_readiness.readiness_state not allowed");
      }
      if (readiness["readiness_state"] === "not_assessed" && readiness["total_score"] !== null) {
        problems.push("data_quality.factory_readiness.total_score must be null when not_assessed");
      }
    }
    const availability = quality["field_availability"];
    if (Array.isArray(availability)) {
      availability.forEach((row, index) => {
        if (isObject(row))
          missing(
            row,
            AVAILABILITY_REQUIRED,
            `data_quality.field_availability[${index}]`,
            problems,
          );
      });
    }
  }
  return problems;
}
