import { test, expect } from "bun:test";
import { compareObservation, type AuditObservation } from "./qualification";
test("same period and amount from another issuer never matches", () => {
  const o: AuditObservation = {
    audit_row: "synthetic",
    identity: {
      companyId: "sa:one",
      metric: "revenue",
      scope: "consolidated",
      dimensions: {},
      unit: "SAR",
      currency: "SAR",
      kind: "fy",
      start: "2025-01-01",
      end: "2025-12-31",
      fiscalYear: 2025,
      fiscalQuarter: null,
    },
    source: { document_key: "synthetic", pdf_page: 1, table: "income", column: "2025" },
    observed_amount: "12",
    source_scale: "1",
    engine_mapping: "revenue",
  };
  expect(
    compareObservation(o, [{ company_id: "sa:other", metric: "revenue" }], "https://example.test")
      .comparison,
  ).toBe("COMPANY_IDENTITY_DIFFERENCE");
});
