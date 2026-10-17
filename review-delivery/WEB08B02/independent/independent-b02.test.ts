import { test, expect } from "bun:test";
import {
  compareObservation,
  equalAmount,
  engineResearchGaps,
  qualificationStatus,
  type AuditObservation,
  type EngineRow,
} from "../../../research-evidence/aramco-qualification/qualification";

// Synthetic data only. No real financial amounts copied into these tests.
function sample() {
  const observation: AuditObservation = {
    audit_row: "independent-synthetic",
    identity: {
      companyId: "TEST:ONE",
      metric: "revenue",
      scope: "consolidated",
      dimensions: {},
      unit: "SAR",
      currency: "SAR",
      kind: "quarter",
      start: "2026-04-01",
      end: "2026-06-30",
      fiscalYear: 2026,
      fiscalQuarter: 2,
    },
    source: { document_key: "SYNTHETIC", pdf_page: 1, table: "income", column: "SAR/Q2" },
    observed_amount: "7.25",
    source_scale: "1000000",
    engine_mapping: "revenue",
  };
  const row: EngineRow = {
    company_id: "TEST:ONE",
    metric: "revenue",
    scope: "consolidated",
    dimensions: {},
    unit: "SAR",
    currency: "SAR",
    period_kind: "quarter",
    period_start: "2026-04-01",
    period_end: "2026-06-30",
    fiscal_year: 2026,
    fiscal_quarter: 2,
    value: "7250000",
    value_type: "decimal",
    source_url: "https://example.invalid/doc",
    version: 1,
  };
  return { observation, row, url: row.source_url! };
}
for (const [name, patch, expected] of [
  ["end", { period_end: "2026-03-31" }, "REQUESTED_PERIOD_NOT_IN_SNAPSHOT"],
  ["Q2 versus H1", { period_kind: "ytd", period_start: "2026-01-01" }, "PERIOD_DIFFERENCE"],
  ["FY versus quarter", { period_kind: "fy" }, "PERIOD_DIFFERENCE"],
  ["same end, different start", { period_start: "2026-05-01" }, "PERIOD_DIFFERENCE"],
  ["fiscal year", { fiscal_year: 2025 }, "PERIOD_DIFFERENCE"],
  ["fiscal quarter", { fiscal_quarter: 1 }, "PERIOD_DIFFERENCE"],
  ["flow versus instant", { period_kind: "instant", period_start: null }, "PERIOD_DIFFERENCE"],
  ["company", { company_id: "TEST:TWO" }, "COMPANY_IDENTITY_DIFFERENCE"],
  ["missing company", { company_id: undefined }, "COMPANY_IDENTITY_DIFFERENCE"],
  ["scope", { scope: "segment" }, "SCOPE_OR_DEFINITION_DIFFERENCE"],
  [
    "dimensions",
    { dimensions: { cash_boundary: "including_sale_group" } },
    "SCOPE_OR_DEFINITION_DIFFERENCE",
  ],
  ["currency", { currency: "USD" }, "CURRENCY_DIFFERENCE"],
  ["unit", { unit: "SAR/share" }, "UNIT_DIFFERENCE"],
  ["missing currency", { currency: null }, "CURRENCY_DIFFERENCE"],
] as const) {
  test(`independent identity: ${name}`, () => {
    const s = sample();
    expect(compareObservation(s.observation, [{ ...s.row, ...patch }], s.url).comparison).toBe(
      expected,
    );
  });
}

test("independent instant: empty start is not null", () => {
  const s = sample();
  s.observation.identity.kind = "instant";
  s.observation.identity.start = null;
  s.observation.identity.fiscalQuarter = null;
  s.row.period_kind = "instant";
  s.row.period_start = "";
  s.row.fiscal_quarter = null;
  expect(compareObservation(s.observation, [s.row], s.url).comparison).toBe("PERIOD_DIFFERENCE");
  s.row.period_start = null;
  expect(compareObservation(s.observation, [s.row], s.url).comparison).toBe(
    "NUMERICAL_SOURCE_MATCH_NOT_QUALIFICATION",
  );
});

test("independent conflict does not disappear when exact source agrees", () => {
  const s = sample();
  const other = { ...s.row, source_url: "https://example.invalid/other", value: "8000000" };
  for (const rows of [
    [s.row, other],
    [other, s.row],
  ]) {
    const r = compareObservation(s.observation, rows, s.url);
    expect(r.comparison).toBe("REVIEW_DIFFERENCE");
    expect(r.reasons).toContain("conflicting_engine_records");
  }
});

test("independent null is unavailable, not numeric mismatch or zero", () => {
  const s = sample();
  s.row.value = null;
  const r = compareObservation(s.observation, [s.row], s.url);
  expect(r.reasons).toContain("engine_value_unavailable");
  expect(r.reasons).not.toContain("numeric_or_sign_difference");
  expect(r.comparison).toBe("REVIEW_DIFFERENCE");
});

test("independent present plus null does not silently choose present", () => {
  const s = sample();
  const r = compareObservation(s.observation, [s.row, { ...s.row, value: null }], s.url);
  expect(r.reasons).toContain("engine_value_unavailable");
  expect(r.reasons).toContain("conflicting_engine_records");
});

test("independent exact decimal normalization preserves signs and EPS scale", () => {
  expect(equalAmount("7.25", "1000000", "7250000.00")).toBe(true);
  expect(equalAmount("-7.25", "1000000", "7250000")).toBe(false);
  expect(equalAmount("0.37", "1", "0.37")).toBe(true);
  expect(equalAmount("0.37", "1000000", "0.37")).toBe(false);
});

test("independent invalid numeric representation and sign require review", () => {
  const s = sample();
  const bad = compareObservation(s.observation, [{ ...s.row, value: "7,250,000" }], s.url);
  expect(bad.reasons).toContain("uncomparable_numeric_representation");
  expect(
    compareObservation(s.observation, [{ ...s.row, value: "-7250000" }], s.url).reasons,
  ).toContain("numeric_or_sign_difference");
});

test("independent source reissue and derived flags do not become direct source matches", () => {
  const s = sample();
  expect(compareObservation(s.observation, [s.row], s.url + "/reissued").reasons).toContain(
    "source_url_differs",
  );
  expect(
    compareObservation(s.observation, [{ ...s.row, is_calculated: true }], s.url).reasons,
  ).toContain("calculated_value_not_direct_original");
});

test("independent unmapped and absent metrics do not invent mappings", () => {
  const s = sample();
  expect(
    compareObservation({ ...s.observation, engine_mapping: null }, [s.row], s.url).comparison,
  ).toBe("NO_APPROVED_METRIC_MAPPING");
  expect(compareObservation(s.observation, [], s.url).comparison).toBe("MISSING_IN_SNAPSHOT");
});

test("independent impossible source period is rejected before comparison", () => {
  const s = sample();
  s.observation.identity.end = "2026-06-31";
  expect(() => compareObservation(s.observation, [s.row], s.url)).toThrow();
});

test("independent content hash and yes cannot manufacture evidence or publication", () => {
  const s = sample();
  s.row.provenance = { source: { content_hash: "a".repeat(64), filed_at: "2026-08-04" } };
  const gaps = engineResearchGaps(s.row);
  for (const gap of [
    "stable_fact_id_missing",
    "fact_revision_digest_missing",
    "original_artifact_sha256_missing",
    "document_id_missing",
    "documented_rights_grant_missing",
    "independent_review_receipt_missing",
  ])
    expect(gaps).toContain(gap);
  const result = qualificationStatus(
    gaps,
    { status: "USER_ASSERTED_NOT_DOCUMENTED", grant_reference: null },
    false,
  );
  expect(result.state).toBe("WITHHELD");
  expect(result.publicationAuthorized).toBe(false);
  expect(result.reasons).toContain("rights_evidence_pending");
  expect(result.reasons).toContain("financial_review_pending");
});
