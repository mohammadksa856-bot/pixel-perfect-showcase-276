import { test, expect } from "bun:test";
import {
  compareObservation,
  equalAmount,
  qualificationStatus,
  engineResearchGaps,
  type AuditObservation,
} from "./qualification";
const o: AuditObservation = {
  audit_row: "SYNTHETIC",
  identity: {
    companyId: "sa:test",
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
  observed_amount: "12",
  source_scale: "1000000",
  engine_mapping: "revenue",
};
const row = () => ({
  company_id: "sa:test",
  metric: "revenue",
  period_kind: "quarter",
  period_start: "2026-04-01",
  period_end: "2026-06-30",
  fiscal_year: 2026,
  fiscal_quarter: 2,
  scope: "consolidated",
  dimensions: {},
  currency: "SAR",
  unit: "SAR",
  value: "12000000",
  value_type: "decimal",
  source_url: "https://example.test/source",
  version: 2,
  paths: ["synthetic"],
});
const url = "https://example.test/source";
test("exact comparison is not B01 qualification", () =>
  expect(compareObservation(o, [row()], url).comparison).toBe(
    "NUMERICAL_SOURCE_MATCH_NOT_QUALIFICATION",
  ));
for (const [name, patch, expected] of [
  [
    "FY vs quarter",
    { period_kind: "fy", period_start: "2026-01-01", fiscal_quarter: null },
    "PERIOD_DIFFERENCE",
  ],
  ["YTD vs standalone", { period_kind: "ytd", period_start: "2026-01-01" }, "PERIOD_DIFFERENCE"],
  ["same end different start", { period_start: "2026-01-01" }, "PERIOD_DIFFERENCE"],
  ["flow vs stock", { period_kind: "instant", period_start: null }, "PERIOD_DIFFERENCE"],
  ["currency", { currency: "USD" }, "CURRENCY_DIFFERENCE"],
  ["unit", { unit: "SAR billion" }, "UNIT_DIFFERENCE"],
  ["scope", { scope: "standalone" }, "SCOPE_OR_DEFINITION_DIFFERENCE"],
  [
    "dimensions",
    { dimensions: { boundary: "including_held_for_sale" } },
    "SCOPE_OR_DEFINITION_DIFFERENCE",
  ],
] as const)
  test(name, () =>
    expect(compareObservation(o, [{ ...row(), ...patch }], url).comparison).toBe(expected),
  );
test("conflict blocks even if first record is equal, order invariant", () => {
  const a = compareObservation(o, [row(), { ...row(), value: "13000000", version: 3 }], url);
  const b = compareObservation(o, [{ ...row(), value: "13000000", version: 3 }, row()], url);
  expect(a.reasons).toContain("conflicting_engine_records");
  expect(b.reasons).toEqual(a.reasons);
});
test("different source is not silently accepted", () =>
  expect(compareObservation(o, [row()], "https://example.test/reissue").reasons).toContain(
    "source_url_differs",
  ));
test("signs are preserved, never abs-corrected", () =>
  expect(equalAmount("-12", "1000000", "12000000")).toBe(false));
test("decimal EPS is not scaled by million", () => {
  expect(equalAmount("1.44", "1", "1.44")).toBe(true);
  expect(equalAmount("1.44", "1000000", "1.44")).toBe(false);
});
test("missing never means zero", () =>
  expect(compareObservation(o, [{ ...row(), value: null }], url).reasons).toContain(
    "engine_value_unavailable",
  ));
test("derived copy not original", () =>
  expect(compareObservation(o, [{ ...row(), is_calculated: 1 }], url).reasons).toContain(
    "calculated_value_not_direct_original",
  ));
test("date-only publication and content hash cannot stand for artifact proof", () => {
  const g = engineResearchGaps({
    ...row(),
    source_key: "file:" + "a".repeat(64),
    provenance: { source: { content_hash: "a".repeat(64), filed_at: "2026-08-04" } },
  });
  expect(g).toContain("original_artifact_sha256_missing");
  expect(g).toContain("publication_time_precision_missing");
  expect(g).toContain("stable_fact_id_missing");
});
test("user yes does not grant permission", () =>
  expect(
    qualificationStatus([], { status: "USER_ASSERTED_NOT_DOCUMENTED", grant_reference: null }, true)
      .state,
  ).toBe("WITHHELD"));
test("rights cannot substitute for financial review", () =>
  expect(
    qualificationStatus(
      [],
      { status: "DOCUMENTED_AND_REVIEWED", grant_reference: "synthetic-grant" },
      false,
    ).state,
  ).toBe("WITHHELD"));
test("no code path grants publication", () =>
  expect(
    qualificationStatus(
      [],
      { status: "DOCUMENTED_AND_REVIEWED", grant_reference: "synthetic-grant" },
      true,
    ).publicationAuthorized,
  ).toBe(false));
test("invalid calendars use B01 rejection", () =>
  expect(() =>
    compareObservation({ ...o, identity: { ...o.identity, start: "2026-02-30" } }, [row()], url),
  ).toThrow());
test("unmapped segment remains explicit, not guessed", () =>
  expect(compareObservation({ ...o, engine_mapping: null }, [row()], url).comparison).toBe(
    "NO_APPROVED_METRIC_MAPPING",
  ));
