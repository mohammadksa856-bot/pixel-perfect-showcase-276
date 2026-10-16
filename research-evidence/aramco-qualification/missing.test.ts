import { test, expect } from "bun:test";
import { compareObservation, type AuditObservation } from "./qualification";
test("absence is not reported as a proven numeric disagreement", () => {
  const o: AuditObservation = {
    audit_row: "synthetic",
    identity: {
      companyId: "synthetic",
      metric: "basic_eps",
      scope: "consolidated",
      dimensions: {},
      unit: "SAR/share",
      currency: "SAR",
      kind: "fy",
      start: "2025-01-01",
      end: "2025-12-31",
      fiscalYear: 2025,
      fiscalQuarter: null,
    },
    source: { document_key: "synthetic", pdf_page: 1, table: "income", column: "2025" },
    observed_amount: "1.44",
    source_scale: "1",
    engine_mapping: "basic_eps",
  };
  const r = compareObservation(
    o,
    [
      {
        metric: "basic_eps",
        company_id: "synthetic",
        period_kind: "fy",
        period_start: "2025-01-01",
        period_end: "2025-12-31",
        fiscal_year: 2025,
        fiscal_quarter: null,
        scope: "consolidated",
        dimensions: {},
        unit: "SAR/share",
        currency: "SAR",
        value: null,
        value_type: "decimal",
        source_url: "https://example.test",
      },
    ],
    "https://example.test",
  );
  expect(r.reasons).toContain("engine_value_unavailable");
  expect(r.reasons).not.toContain("numeric_or_sign_difference");
});
