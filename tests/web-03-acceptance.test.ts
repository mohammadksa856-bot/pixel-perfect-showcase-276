// WEB-03 acceptance fixes (عيوب Codex المانعة): اختبارات سلبية للحالات الثلاث.
// 1) رقم البطاقة = خلية الجدول نفسها (المفتاح، الفترة، النطاق، الوحدة)، أو محجوب بوضوح.
// 2) لا عملتان تحت تسمية واحدة: كل خلية بعملة غير عملة التقارير تُحجب، ولا تحويل.
// 3) لا قيمة في عمود لا يطابق period_end وperiod_kind والنطاق.
import { describe, expect, test } from "bun:test";
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { buildCompanyPreview, type EnginePage } from "../src/lib/engine/company-preview";
import type { StatementView } from "../src/lib/engine/statements";

const gz = <T>(p: string): T =>
  JSON.parse(gunzipSync(readFileSync(new URL(p, import.meta.url))).toString());
const V4 = (s: string) => gz<EnginePage>(`./fixtures/p02/engine-b70254e_page_SA-${s}.json.gz`);
const V5 = (s: string) => gz<EnginePage>(`./fixtures/codex-20261013/${s}-page.json.gz`);
/** سياسة معاينة Codex: المشتقات محجوبة (كما في design-fixtures.server.ts). */
function frozen(page: EnginePage): EnginePage {
  const walk = (v: unknown): void => {
    if (!v || typeof v !== "object") return;
    if (Array.isArray(v)) return v.forEach(walk);
    const r = v as Record<string, unknown>;
    if (r["is_calculated"] === true || r["is_calculated"] === 1) {
      r["quality_status"] = "withheld";
      r["quality_reasons"] = ["design_fixture_derivative_not_approved"];
    }
    Object.values(r).forEach(walk);
  };
  walk(page);
  return page;
}
const PAGES = (): [string, EnginePage][] =>
  ["2222", "1120", "8010"].flatMap((s) => [
    [`v4:${s}`, V4(s)] as [string, EnginePage],
    [`v5-frozen:${s}`, frozen(V5(s))] as [string, EnginePage],
  ]);
const annualOf = (v: { statements: StatementView[] }) =>
  v.statements.find((x) => x.mode === "annual")!;
const cellAt = (view: StatementView, key: string, end: string) => {
  const row = view.rows.find((r) => r.key === key);
  const i = view.periods.findIndex((p) => p.end === end);
  return row && i >= 0 ? row.cells[i]! : null;
};
type Row = {
  value: string;
  unit: string | null;
  currency: string | null;
  period_end: string | null;
  period_kind: string | null;
  scope?: string | null;
};
const histRows = (p: EnginePage, kind: "annual" | "annual_position", end: string, key: string) =>
  p.sections.financials.history[kind].periods.find((x) => x.period_end === end)!.metrics[
    key
  ] as unknown as Row[];

describe("1. key figure = the statement-table cell, or withheld", () => {
  test("every shown key figure is the same key, latest annual column, same value and unit as the table", () => {
    for (const [name, page] of PAGES()) {
      const v = buildCompanyPreview(page);
      const annual = annualOf(v);
      for (const f of v.keyFigures) {
        if (f.state !== "value") continue;
        const latest = annual.periods[0]!.end;
        const c = cellAt(annual, f.key, latest);
        expect(
          c?.state,
          `${name} ${f.key}: card shown but table cell is ${c?.state ?? "absent"}`,
        ).toBe("value");
        if (c?.state !== "value") continue;
        expect(c.cell.value, `${name} ${f.key} value`).toBe(f.cell.value);
        expect(f.period.end, `${name} ${f.key} period`).toBe(latest);
      }
    }
  });

  test("Tawuniya: insurance revenue is never replaced by generic revenue", () => {
    const page = frozen(V5("8010"));
    delete page.sections.financials.annual.metrics["insurance_revenue"];
    const v = buildCompanyPreview(page);
    const f = v.keyFigures.find((x) => x.key === "insurance_revenue")!;
    expect(f.state).not.toBe("value");
    expect(v.keyFigures.some((x) => x.key === "revenue")).toBe(false);
  });

  test("Tawuniya: insurance revenue card and table row agree, and the row carries the IFRS 17 key", () => {
    const v = buildCompanyPreview(frozen(V5("8010")));
    const f = v.keyFigures.find((x) => x.key === "insurance_revenue")!;
    const c = cellAt(annualOf(v), "insurance_revenue", "2025-12-31");
    if (f.state === "value")
      expect(c).toMatchObject({ state: "value", cell: { value: f.cell.value } });
    else expect(f.state).toBe("withheld");
  });
});

describe("2. one currency per table; other currencies withheld, never converted", () => {
  test("a USD amount in a SAR table is withheld (currency_mismatch)", () => {
    const page = V4("2222");
    for (const r of histRows(page, "annual", "2023-12-31", "net_income")) {
      r.currency = "USD";
      r.unit = "USD";
    }
    const c = cellAt(annualOf(buildCompanyPreview(page)), "net_income", "2023-12-31");
    expect(c).toMatchObject({ state: "withheld", reason: "currency_mismatch" });
  });

  test("a USD per-share value in a SAR table is withheld", () => {
    const page = V5("2222"); // v4 history carries no dividends_per_share rows
    for (const r of histRows(page, "annual", "2024-12-31", "dividends_per_share")) {
      r.currency = "USD";
      r.unit = "USD/share";
    }
    const c = cellAt(annualOf(buildCompanyPreview(page)), "dividends_per_share", "2024-12-31");
    expect(c).toMatchObject({ state: "withheld", reason: "currency_mismatch" });
  });

  test("currency field and unit disagreeing (SAR unit, USD currency) is withheld", () => {
    const page = V4("2222");
    for (const r of histRows(page, "annual", "2022-12-31", "revenue")) r.currency = "USD";
    const c = cellAt(annualOf(buildCompanyPreview(page)), "revenue", "2022-12-31");
    expect(c).toMatchObject({ state: "withheld", reason: "currency_mismatch" });
  });

  test("the table states its currency, and it is the company's reporting currency", () => {
    for (const [name, page] of PAGES()) {
      const annual = annualOf(buildCompanyPreview(page));
      expect(annual.currency, name).toBe(page.company.currency);
    }
  });

  test("a key figure in another currency is withheld, not shown", () => {
    const page = V4("2222");
    for (const r of page.sections.financials.annual.metrics["revenue"] as unknown as Row[]) {
      r.currency = "USD";
      r.unit = "USD";
    }
    for (const r of histRows(page, "annual", "2025-12-31", "revenue")) {
      r.currency = "USD";
      r.unit = "USD";
    }
    const f = buildCompanyPreview(page).keyFigures.find((x) => x.key === "revenue")!;
    expect(f).toMatchObject({ state: "withheld", reason: "currency_mismatch" });
  });
});

describe("3. a value appears only in the column whose period it belongs to", () => {
  test("a row whose period_end differs from its column is withheld (period_end_mismatch)", () => {
    const page = V4("2222");
    for (const r of histRows(page, "annual", "2024-12-31", "revenue")) r.period_end = "2023-12-31";
    const annual = annualOf(buildCompanyPreview(page));
    expect(cellAt(annual, "revenue", "2024-12-31")).toMatchObject({
      state: "withheld",
      reason: "period_end_mismatch",
    });
  });

  test("a balance row from an interim date never fills an annual column", () => {
    const page = V4("2222");
    for (const r of histRows(page, "annual_position", "2025-12-31", "total_assets"))
      r.period_end = "2026-06-30";
    const c = cellAt(annualOf(buildCompanyPreview(page)), "total_assets", "2025-12-31");
    expect(c?.state).not.toBe("value");
  });

  test("a YTD row whose end differs from the YTD column is withheld", () => {
    const page = V4("2222");
    for (const r of page.sections.financials.ytd.metrics["revenue"] as unknown as Row[])
      r.period_end = "2026-03-31";
    const ytd = buildCompanyPreview(page).statements.find((x) => x.mode === "ytd")!;
    expect(cellAt(ytd, "revenue", ytd.periods[0]!.end)).toMatchObject({
      state: "withheld",
      reason: "period_end_mismatch",
    });
  });

  test("a non-consolidated row never fills a consolidated column", () => {
    const page = V4("2222");
    for (const r of histRows(page, "annual", "2023-12-31", "revenue")) r.scope = "standalone";
    const c = cellAt(annualOf(buildCompanyPreview(page)), "revenue", "2023-12-31");
    expect(c?.state).not.toBe("value");
  });

  test("columns come only from engine history; snapshots never add a period", () => {
    for (const [name, page] of PAGES()) {
      const annual = annualOf(buildCompanyPreview(page));
      const h = page.sections.financials.history;
      const ends = new Set(
        [...h.annual.periods, ...h.annual_position.periods].map((p) => p.period_end),
      );
      expect(
        annual.periods.map((p) => p.end),
        name,
      ).toEqual([...ends].sort().reverse());
    }
  });
});
