// WEB-03 (إصلاح التعارض النهائي): لا اختيار لأول قيمة. اختبارات اصطناعية بالكامل:
// قيم رقمية وهمية ومصدر example.com، لا بيانات مُصدِر ولا شبكة.
// 1) قيمتان متناقضتان داخل مصدر واحد → source_conflict.
// 2) قيمتان متناقضتان بين مصدرين (السجل واللقطة، أو قسمان من السجل) → source_conflict.
// 3) سجل مرفوض التاريخ + لقطة بديلة صحيحة → لا تجاوز صامت للرفض.
import { describe, expect, test } from "bun:test";
import {
  pickValue,
  type EngineMetricRow,
  type EnginePage,
} from "../src/lib/engine/company-preview";
import { buildStatements, keyFigures, type StatementView } from "../src/lib/engine/statements";

const END = "2025-12-31";
const PREV = "2024-12-31";
let seq = 0;
function row(value: string, end: string, over: Partial<EngineMetricRow> = {}): EngineMetricRow {
  seq += 1;
  return {
    value,
    currency: "SAR",
    unit: "SAR",
    period_end: end,
    period_kind: "fy",
    fiscal_year: Number(end.slice(0, 4)),
    scope: "consolidated",
    dimensions: {},
    is_calculated: 0,
    quality_status: "ok",
    provenance: {
      source: {
        source_url: `https://example.com/synthetic-${seq}`,
        content_type: "application/pdf",
      },
      extraction: { page: seq },
    },
    ...over,
  };
}
const unavailable = { status: "unavailable", reason: "synthetic", metrics: {} };
function page(opts: {
  snapshot?: Record<string, EngineMetricRow[]>;
  instant?: Record<string, EngineMetricRow[]>;
  history?: Record<string, EngineMetricRow[]>;
  position?: Record<string, EngineMetricRow[]>;
  quarter?: Record<string, EngineMetricRow[]>;
}): EnginePage {
  return {
    company: { currency: "SAR" },
    sections: {
      financials: {
        annual: opts.snapshot
          ? { status: "available", reason: null, period_end: END, metrics: opts.snapshot }
          : unavailable,
        instant: opts.instant
          ? { status: "available", reason: null, period_end: END, metrics: opts.instant }
          : unavailable,
        ytd: unavailable,
        history: {
          annual: {
            status: "available",
            reason: null,
            periods: [
              { period_end: END, metrics: opts.history ?? {} },
              { period_end: PREV, metrics: { revenue: [row("900", PREV)] } },
            ],
          },
          annual_position: opts.position
            ? {
                status: "available",
                reason: null,
                periods: [{ period_end: END, metrics: opts.position }],
              }
            : { status: "unavailable", reason: "synthetic", periods: [] },
          quarter: opts.quarter
            ? {
                status: "available",
                reason: null,
                periods: [{ period_end: "2025-09-30", metrics: opts.quarter }],
              }
            : { status: "unavailable", reason: "synthetic", periods: [] },
        },
      },
    },
  } as unknown as EnginePage;
}
const annualOf = (p: EnginePage, kind: "ordinary" | "insurer" = "ordinary") =>
  buildStatements(p, kind).find((v) => v.mode === "annual")!;
const cell = (v: StatementView, key: string, end = END) => {
  const r = v.rows.find((x) => x.key === key);
  const i = v.periods.findIndex((p) => p.end === end);
  return r && i >= 0 ? r.cells[i]! : null;
};
const card = (p: EnginePage, key: string, kind: "ordinary" | "insurer" = "ordinary") =>
  keyFigures(p, kind).find((f) => f.key === key)!;

describe("1. contradictory values inside one source", () => {
  test("two eligible rows for the same key/period/scope/unit/currency → source_conflict, card withheld", () => {
    const p = page({ history: { revenue: [row("1234567", END), row("7654321", END)] } });
    const v = annualOf(p);
    expect(cell(v, "revenue")).toEqual({ state: "withheld", reason: "source_conflict" });
    expect(card(p, "revenue")).toMatchObject({ state: "withheld", reason: "source_conflict" });
    // العمود الآخر غير متأثر.
    expect(cell(v, "revenue", PREV)?.state).toBe("value");
  });

  test("the result does not depend on row order (no 'first wins')", () => {
    const a = annualOf(page({ history: { revenue: [row("1", END), row("2", END)] } }));
    const b = annualOf(page({ history: { revenue: [row("2", END), row("1", END)] } }));
    expect(cell(a, "revenue")).toEqual(cell(b, "revenue"));
    expect(cell(a, "revenue")?.state).toBe("withheld");
  });

  test("the same value twice (corroboration) is not a conflict", () => {
    const v = annualOf(page({ history: { revenue: [row("500", END), row("500", END)] } }));
    expect(cell(v, "revenue")).toMatchObject({ state: "value", cell: { value: 500 } });
  });

  test("the same number under two different units is a conflict, not a match", () => {
    const v = annualOf(
      page({ history: { revenue: [row("500", END), row("500", END, { unit: "ratio" })] } }),
    );
    expect(cell(v, "revenue")).toEqual({ state: "withheld", reason: "source_conflict" });
  });

  test("a segment or non-consolidated row is not a candidate for the consolidated cell", () => {
    const v = annualOf(
      page({
        history: {
          revenue: [
            row("500", END),
            row("90", END, { dimensions: { segment: "x" } }),
            row("80", END, { scope: "parent_only" }),
          ],
        },
      }),
    );
    expect(cell(v, "revenue")).toMatchObject({ state: "value", cell: { value: 500 } });
  });

  test("P02 snapshot groups (pickValue) also refuse to pick the first of two contradictory rows", () => {
    expect(pickValue("revenue", [row("1", END), row("2", END)], "fy")).toEqual({
      ok: false,
      reason: "source_conflict",
    });
    expect(pickValue("revenue", [row("3", END), row("3", END)], "fy").ok).toBe(true);
  });

  test("quarterly table: same rule", () => {
    const q = (v: string) => row(v, "2025-09-30", { period_kind: "quarter" });
    const views = buildStatements(page({ quarter: { revenue: [q("10"), q("11")] } }), "ordinary");
    const quarter = views.find((x) => x.mode === "quarter")!;
    expect(cell(quarter, "revenue", "2025-09-30")).toEqual({
      state: "withheld",
      reason: "source_conflict",
    });
  });
});

describe("2. contradictory values between two sources", () => {
  test("history vs annual snapshot for the same column → source_conflict (card too)", () => {
    const p = page({
      history: { revenue: [row("1000", END)] },
      snapshot: { revenue: [row("1500", END)] },
    });
    expect(cell(annualOf(p), "revenue")).toEqual({ state: "withheld", reason: "source_conflict" });
    expect(card(p, "revenue")).toMatchObject({ state: "withheld", reason: "source_conflict" });
  });

  test("history vs a second history part (annual vs annual_position) → source_conflict", () => {
    const inst = (v: string) => row(v, END, { period_kind: "instant" });
    const p = page({
      history: { total_assets: [inst("100")] },
      position: { total_assets: [inst("200")] },
    });
    // قبل الإصلاح: كان الجزء الأول المقبول يفوز. الآن تُقارن كل المرشحات.
    const v = annualOf(p);
    expect(cell(v, "total_assets")?.state).toBe("withheld");
    expect(card(p, "total_assets").state).toBe("withheld");
  });

  test("position history vs instant snapshot → source_conflict", () => {
    const inst = (v: string) => row(v, END, { period_kind: "instant" });
    const p = page({
      position: { total_assets: [inst("100")] },
      instant: { total_assets: [inst("101")] },
    });
    expect(cell(annualOf(p), "total_assets")).toEqual({
      state: "withheld",
      reason: "source_conflict",
    });
  });

  test("snapshot with two contradictory rows conflicts even when history has none", () => {
    const p = page({ history: {}, snapshot: { net_income: [row("7", END), row("8", END)] } });
    expect(cell(annualOf(p), "net_income")).toEqual({
      state: "withheld",
      reason: "source_conflict",
    });
  });

  test("agreeing sources keep the value; the history record is the cited proof", () => {
    const h = row("1000", END);
    const p = page({ history: { revenue: [h] }, snapshot: { revenue: [row("1000", END)] } });
    const c = cell(annualOf(p), "revenue");
    expect(c).toMatchObject({ state: "value", cell: { value: 1000 } });
    if (c?.state === "value")
      expect(c.cell.proof.sourceUrl).toBe(h.provenance!.source!.source_url!);
    expect(card(p, "revenue")).toMatchObject({ state: "value", cell: { value: 1000 } });
  });
});

describe("3. rejected-date record + substitute snapshot: rejection is not silently overridden", () => {
  test("history row dated 2020 in the 2025 column + correct snapshot → withheld period_end_mismatch", () => {
    const p = page({
      history: { revenue: [row("1000", "2020-12-31")] },
      snapshot: { revenue: [row("1000", END)] },
    });
    const v = annualOf(p);
    expect(cell(v, "revenue")).toEqual({ state: "withheld", reason: "period_end_mismatch" });
    expect(card(p, "revenue")).toMatchObject({ state: "withheld", reason: "period_end_mismatch" });
  });

  test("same inside one source: a wrong-dated row does not hide behind a right-dated one", () => {
    const v = annualOf(page({ history: { revenue: [row("1", "2020-12-31"), row("2", END)] } }));
    expect(cell(v, "revenue")).toEqual({ state: "withheld", reason: "period_end_mismatch" });
  });

  test("other identity rejections also block a substitute: currency, period kind, unit, quality", () => {
    const cases: [Partial<EngineMetricRow>, string][] = [
      [{ currency: "USD", unit: "USD" }, "currency_mismatch"],
      [{ period_kind: "quarter" }, "period_kind_mismatch"],
      [{ currency: null }, "unit_conflict"],
      [{ quality_status: "rejected", quality_reasons: ["synthetic"] }, "quality_flagged"],
    ];
    for (const [over, reason] of cases) {
      const p = page({
        history: { revenue: [row("1000", END, over)] },
        snapshot: { revenue: [row("1000", END)] },
      });
      expect(cell(annualOf(p), "revenue"), reason).toEqual({ state: "withheld", reason });
    }
  });

  test("a quarantined record WITHOUT a value claims nothing and does not mask an eligible value", () => {
    const quarantined = row("", END, {
      quality_status: "quarantined",
      quality_reasons: ["missing_or_nonfinite_value"],
    });
    (quarantined as { value: string | null }).value = null;
    const v = annualOf(
      page({ history: {}, snapshot: { revenue: [row("1000", END), quarantined] } }),
    );
    expect(cell(v, "revenue")).toMatchObject({ state: "value", cell: { value: 1000 } });
    expect(v.review[0]).toMatchObject({
      rule: "accepted_unproven_candidate_ignored",
      reason: null,
    });
  });

  test("a numeric record with the wrong unit (scale error) blocks the agreeing-looking one", () => {
    const v = annualOf(
      page({
        history: {},
        snapshot: { revenue: [row("5.85", END), row("5853702", END, { currency: null })] },
      }),
    );
    expect(cell(v, "revenue")).toEqual({ state: "withheld", reason: "unit_conflict" });
  });

  test("an unproven record (no source) does not block a proven one, but is recorded for review", () => {
    const noSource = row("1000", END, { provenance: { source: { source_url: null } } });
    const v = annualOf(
      page({ history: { revenue: [noSource] }, snapshot: { revenue: [row("1000", END)] } }),
    );
    expect(cell(v, "revenue")).toMatchObject({ state: "value", cell: { value: 1000 } });
    const r = v.review.find((x) => x.key === "revenue" && x.periodEnd === END)!;
    expect(r.rule).toBe("accepted_unproven_candidate_ignored");
    expect(r.candidates.map((c) => c.verdict)).toEqual(["no_source", "eligible"]);
  });

  test("a snapshot alone fills an empty history column (documented merge rule, unchanged)", () => {
    const v = annualOf(page({ history: {}, snapshot: { revenue: [row("1000", END)] } }));
    expect(cell(v, "revenue")).toMatchObject({ state: "value", cell: { value: 1000 } });
  });
});

describe("4. evidence for review, without leaking withheld values", () => {
  test("each blocked cell has a review entry: rule, reason, candidate origins, no values", () => {
    const p = page({
      history: { revenue: [row("1234567", END)], net_income: [row("1000", "2020-12-31")] },
      snapshot: { revenue: [row("7654321", END)], net_income: [row("1000", END)] },
    });
    const v = annualOf(p);
    const conflict = v.review.find((x) => x.key === "revenue")!;
    expect(conflict).toMatchObject({
      periodEnd: END,
      reason: "source_conflict",
      rule: "contradictory_eligible_values",
      distinctValues: 2,
    });
    expect(conflict.candidates.map((c) => [c.origin, c.verdict])).toEqual([
      ["history", "eligible"],
      ["snapshot", "eligible"],
    ]);
    const date = v.review.find((x) => x.key === "net_income")!;
    expect(date).toMatchObject({ reason: "period_end_mismatch", rule: "rejection_not_overridden" });
    expect(date.candidates.map((c) => [c.origin, c.verdict])).toEqual([
      ["history", "period_end_mismatch"],
      ["snapshot", "eligible"],
    ]);
    // لا قيمة محجوبة في أي مكان من نموذج العرض (ولا في البطاقات).
    const json = JSON.stringify([buildStatements(p, "ordinary"), keyFigures(p, "ordinary")]);
    for (const leaked of ["1234567", "7654321", "1,234,567", "7,654,321"])
      expect(json).not.toContain(leaked);
  });

  test("clean cells produce no review noise", () => {
    const v = annualOf(page({ history: { revenue: [row("5", END)] } }));
    expect(v.review).toEqual([]);
  });
});
