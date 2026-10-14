/** Synthetic display-contract challenges only. No issuer data, PDFs or network. */
import { test, expect } from "bun:test";
import { buildStatements, keyFigures } from "../../src/lib/engine/statements";
import type { EnginePage, EngineMetricRow } from "../../src/lib/engine/company-preview";

function row(end: string, currency = "SAR"): EngineMetricRow {
  return {value:"1000000", currency, unit:currency, period_end:end, period_kind:"fy", fiscal_year:Number(end.slice(0,4)),
    scope:"consolidated", dimensions:{}, is_calculated:0, quality_status:"ok",
    provenance:{source:{source_url:"https://example.com/synthetic-test-only",content_type:"application/pdf"},extraction:{page:1}}};
}
function fixture(): EnginePage {
  const snapshot={status:"available",reason:null,period_end:"2025-12-31",metrics:{revenue:[row("2025-12-31")]}};
  return {sections:{financials:{annual:structuredClone(snapshot),instant:{status:"unavailable",reason:"synthetic",metrics:{}},
    ytd:{status:"unavailable",reason:"synthetic",metrics:{}},history:{annual:{status:"available",reason:null,
      periods:[{period_end:"2025-12-31",metrics:{revenue:[row("2025-12-31")]}},{period_end:"2024-12-31",metrics:{revenue:[row("2024-12-31")]}}]},
      annual_position:{status:"unavailable",reason:"synthetic",periods:[]},quarter:{status:"unavailable",reason:"synthetic",periods:[]}}}}} as unknown as EnginePage;
}

test("WEB03-F01: insurance headline and annual table must expose the same qualified metric",()=>{
  const p=fixture(); p.sections.financials.annual.metrics={insurance_revenue:[row("2025-12-31")]};
  const f=keyFigures(p,"insurer").find(x=>x.key==="insurance_revenue")!;
  expect(f.state).toBe("value");
  const annual=buildStatements(p,"insurer")[0]!;
  const r=annual.rows.find(x=>x.key==="insurance_revenue");
  expect(r).toBeDefined();
  if(f.state==="value" && r){const index=annual.periods.findIndex(x=>x.end===f.cell.period.end);expect(r.cells[index]?.state).toBe("value");}
});
test("WEB03-F02: mixed currencies require explicit per-cell identity or withholding",()=>{
  const p=fixture(); p.sections.financials.history.annual.periods[1]!.metrics["revenue"]=[row("2024-12-31","USD")];
  const annual=buildStatements(p,"ordinary")[0]!;
  const c=annual.rows.find(x=>x.key==="revenue")!.cells[1]!;
  expect(c.state!=="value" || "currency" in c.cell).toBe(true);
});
test("WEB03-F03: the fact date must match its column, not just its period kind",()=>{
  const p=fixture(); p.sections.financials.history.annual.periods[0]!.metrics["revenue"]=[row("2020-12-31")];
  const annual=buildStatements(p,"ordinary")[0]!;
  expect(annual.rows.find(x=>x.key==="revenue")!.cells[0]!.state).not.toBe("value");
});
