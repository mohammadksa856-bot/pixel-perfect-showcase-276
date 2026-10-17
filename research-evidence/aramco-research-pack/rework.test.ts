// WEB-08B04 REWORK (Codex fa3a772): regression tests for ENG-01..04, LINK-01 and FIN-01..07.
// Each block includes the case that previously passed wrongly.
import { describe, expect, test } from "bun:test";
import { loadContext, periodLabel, resolveRef } from "./evidence";
import { SECTIONS, compilePack, metricLink, numberTokens } from "./pack";
import { metricPlacements } from "./placement";
import type { Section } from "./schema";

const ctx = loadContext();
const pack = compilePack(ctx);
const text = (id: string) => pack.paragraphs.find((p) => p.id === id)!;
const withParagraph = (p: Record<string, unknown>) => () => {
  const s = structuredClone(SECTIONS) as Section[];
  s[0]!.paragraphs.push({ id: "regression", en: null, topics: ["financials"], ...p } as never);
  compilePack(loadContext(), s);
};

describe("ENG-01 per-row identities; conflicts fail closed", () => {
  test("mixed units across rows are rejected, not represented by the first row", () => {
    const c = loadContext();
    c.buckets.annual.set("synthetic", [
      { unit: "SAR", fiscal_year: 2025, source_url: "https://example.com/a" },
      { unit: "USD", fiscal_year: 2024, source_url: "https://example.com/b" },
    ]);
    expect(() => resolveRef({ t: "engine_metric", key: "synthetic", bucket: "annual" }, c)).toThrow(
      /heterogeneous_units/,
    );
  });
  test("two rows for the same period with different sources or versions are rejected", () => {
    const c = loadContext();
    c.buckets.annual.set("synthetic", [
      { unit: "SAR", fiscal_year: 2025, source_url: "https://example.com/v1", version: 1 },
      { unit: "SAR", fiscal_year: 2025, source_url: "https://example.com/v1", version: 2 },
    ]);
    expect(() => resolveRef({ t: "engine_metric", key: "synthetic", bucket: "annual" }, c)).toThrow(
      /conflicting_rows/,
    );
  });
  test("a real multi-source metric keeps each row's own source; no single source is implied", () => {
    const r = resolveRef(
      { t: "engine_metric", key: "free_cash_flow", bucket: "history_annual" },
      ctx,
    );
    expect(r.sourceCount).toBeGreaterThan(1);
    expect(r.source.url).toBeNull();
    expect(r.rows).toHaveLength(5);
    for (const row of r.rows!) expect(row.sourceUrl).toMatch(/^https:\/\//);
    expect(new Set(r.rows!.map((x) => x.sourceUrl)).size).toBe(r.sourceCount);
  });
});

describe("ENG-02 full period identity", () => {
  test("YTD, quarter, FY and instant rows get distinct labels; YTD is never a quarter", () => {
    expect(resolveRef({ t: "engine_metric", key: "revenue", bucket: "ytd" }, ctx).periods).toEqual([
      "YTD2026-01-01..2026-06-30",
    ]);
    expect(
      resolveRef({ t: "engine_metric", key: "revenue", bucket: "history_quarter" }, ctx).periods,
    ).toEqual(["2026Q1", "2026Q2"]);
    expect(
      resolveRef({ t: "engine_metric", key: "total_assets", bucket: "instant" }, ctx).periods,
    ).toEqual(["@2026-06-30"]);
    const c = loadContext();
    c.buckets.ytd.set("synthetic", [
      {
        period_kind: "ytd",
        fiscal_year: 2026,
        fiscal_quarter: 2,
        period_end: "2026-06-30",
        unit: "SAR",
      },
    ]);
    expect(
      resolveRef({ t: "engine_metric", key: "synthetic", bucket: "ytd" }, c).periods,
    ).not.toContain("2026Q2");
  });
  test("rows keep start, end, year, quarter, scope, unit, currency and version", () => {
    const row = resolveRef({ t: "engine_metric", key: "revenue", bucket: "ytd" }, ctx).rows![0]!;
    expect(row).toMatchObject({
      kind: "ytd",
      start: "2026-01-01",
      end: "2026-06-30",
      fiscalYear: 2026,
      fiscalQuarter: 2,
      unit: "SAR",
      version: 1,
    });
    expect(row).toHaveProperty("scope");
    expect(row).toHaveProperty("currency");
  });
  test("an unknown or incomplete period kind fails instead of inventing a period", () => {
    expect(() => periodLabel({ period_kind: "weird", period_end: "2026-06-30" })).toThrow(
      /unlabelled_period/,
    );
    expect(() => periodLabel({ period_kind: "quarter", fiscal_year: 2026 })).toThrow(
      /unlabelled_period/,
    );
  });
});

describe("ENG-03 numbers are typed by unit; a matching digit is not semantic support", () => {
  test("year- or ticker-shaped amounts are quantities, not exempt years or symbols", () => {
    expect(numberTokens("صافي الربح 2025 ريال")).toEqual([{ n: "2025", classes: ["currency"] }]);
    expect(
      withParagraph({
        kind: "research_interpretation",
        ar: "صافي الربح 2025 ريال.",
        refs: [{ t: "engine_profile", field: "legal_name" }],
      }),
    ).toThrow(/quantity_in_research_interpretation/);
    expect(
      withParagraph({
        kind: "reported_record",
        ar: "التدفق الحر 2222 ريال.",
        refs: [{ t: "engine_profile", field: "legal_name" }],
      }),
    ).toThrow(/unsupported_quantity/);
  });
  test("a number present in capacity evidence does not support a profit figure, even in a record", () => {
    expect(
      withParagraph({
        kind: "research_interpretation",
        ar: "صافي الربح 12 مليار ريال.",
        refs: [{ t: "b03_claim", id: "aramco-msc-12mbd" }],
      }),
    ).toThrow(/quantity_in_research_interpretation/);
    expect(
      withParagraph({
        kind: "reported_record",
        ar: "صافي الربح 12 مليار ريال.",
        refs: [{ t: "b03_claim", id: "aramco-rig-purchase-commitments" }],
      }),
    ).toThrow(/unsupported_quantity:regression:12 currency\+scale/);
  });
  test("grouped and decimal amounts are rejected; the real matched quantities still pass", () => {
    expect(
      withParagraph({
        kind: "research_interpretation",
        ar: "التدفق النقدي 123,456,789 ريال.",
        refs: [{ t: "engine_profile", field: "legal_name" }],
      }),
    ).toThrow();
    expect(
      withParagraph({
        kind: "research_interpretation",
        ar: "التدفق النقدي 123456.789 ريال.",
        refs: [{ t: "engine_profile", field: "legal_name" }],
      }),
    ).toThrow();
    expect(text("up-msc").ar).toContain("12 مليون برميل");
    expect(text("in-midstream").ar).toContain("20 سنة");
  });
  test("no interpretation, assumption, scenario or methodology paragraph carries a quantity", () => {
    for (const p of pack.paragraphs.filter(
      (x) => !["reported_record", "management_plan"].includes(x.kind),
    ))
      expect(numberTokens(p.ar).filter((t) => t.classes.length)).toEqual([]);
  });
});

describe("ENG-04 strict civil dates and as-of boundary", () => {
  test("impossible dates are rejected in any kind", () => {
    for (const d of ["2025-02-30", "2025-13-01", "2026-04-31"])
      expect(
        withParagraph({
          kind: "research_interpretation",
          ar: `تاريخ ${d}.`,
          refs: [{ t: "engine_profile", field: "legal_name" }],
        }),
      ).toThrow(/invalid_date/);
  });
  test("an engine record cannot carry a date after the snapshot, even within the snapshot year", () => {
    expect(
      withParagraph({
        kind: "reported_record",
        ar: "حدث بتاريخ 2026-12-31.",
        refs: [{ t: "engine_profile", field: "legal_name" }],
      }),
    ).toThrow(/future_date_in_record/);
    expect(
      withParagraph({
        kind: "reported_record",
        ar: "حدث بتاريخ 2026-03-09.",
        refs: [{ t: "engine_profile", field: "legal_name" }],
      }),
    ).not.toThrow();
  });
});

describe("LINK-01 links follow the metric's actual placement", () => {
  test("the realized crude price links to operations, where the metric is rendered (was competitors)", () => {
    const l = metricLink("average_realized_crude_oil_price", ["competitors"]);
    expect(l.status).toBe("FOCUSABLE");
    expect(l.topic).toBe("operations");
    expect(l.intelligence).toBe(
      "/preview/web-v1/companies/2222/intelligence?topic=operations&focus=average_realized_crude_oil_price",
    );
  });
  test("a metric not rendered in Company Intelligence gets no link and says so", () => {
    const l = metricLink("accounts_receivable_change");
    expect(l).toMatchObject({ status: "NOT_RENDERED", intelligence: null, data: null });
  });
  test("statement rows are focusable only in the financials topic; every focusable link matches a placement", () => {
    expect(metricLink("free_cash_flow")).toMatchObject({
      status: "FOCUSABLE",
      topic: "financials",
      mode: "focus_statement_row",
    });
    for (const a of pack.analyses)
      for (const i of a.inputs) {
        if (i.links.status === "NOT_RENDERED") continue;
        const pl = metricPlacements().get(i.key)!;
        expect(pl.some((x) => x.topic === i.links.topic && x.mode === i.links.mode)).toBe(true);
      }
  });
});

describe("FIN-01..07 research corrections", () => {
  test("FIN-01: spare capacity is not computed from total liquids; the perimeter mismatch is stated", () => {
    expect(text("up-spare").ar).toContain("لا تقيس المقارنة بينهما الطاقة الفائضة");
    expect(text("up-spare").ar).toContain("المكثفات");
    expect(text("dr-volume").ar).toContain("لا تحد إنتاج الغاز");
  });
  test("FIN-02/03: no profit identity per barrel or 'spread times utilization' formula is asserted", () => {
    expect(text("up-margin-logic").ar).toContain("لا تُجمع في معادلة واحدة");
    expect(text("dn-earnings-logic").ar).toContain(
      "ولا يُختصر الربح في الفرق مضروبًا في الاستغلال",
    );
    expect(text("dr-margin").ar).toContain("فلا يُوصف بأنه منخفض أو مرتفع");
  });
  test("FIN-04: Jafurah tariff is not read as capex converted to opex; minimum volumes are conditional", () => {
    expect(text("in-channels").ar).toContain(
      "فلا يُستنتج أن إنفاقًا رأسماليًا تحوّل إلى مصروف تشغيلي",
    );
    expect(text("pj-jafurah-risk-volume").ar).toContain("لا يُستنتج أن كل تأخر يصبح كلفة ثابتة");
  });
  test("FIN-05: gas expansion effect on revenue mix is a conditional scenario, not a direction", () => {
    expect(text("dr-capacity").kind).toBe("scenario");
    expect(text("pj-gas-purpose").ar).toContain("لا يثبت في الأدلة أن البرنامج سيرفع هذا الوزن");
  });
  test("FIN-06/07: coverage is not funding proof; policy is not liability; no deterministic ordering; no risk ranking", () => {
    expect(text("fa-cash-flow-d1").ar).toContain("لا اختبار لمصدر تمويلها");
    expect(text("fa-dividends-d2").ar).toContain("لا التزام قانوني قبل إعلانه");
    expect(text("fa-dividends-d1").ar).toContain("لا يعني أنه لم يُنفَّذ شيء منه");
    expect(text("rk-sc-price").ar).toContain("لا ترتيب زمنيًا محددًا");
    expect(text("rk-int-geopolitical").ar).toContain("دون ترتيب لها مقابل مخاطر الطلب");
  });
  test("the superseded overstatements are gone from every paragraph", () => {
    const all = pack.paragraphs.map((p) => p.ar).join("\n");
    for (const banned of [
      "يتحول العقد إلى كلفة ثابتة",
      "تحوّل جزءًا من الإنفاق الرأسمالي",
      "مضروب في معدل الاستغلال",
      "أهم من مخاطر الطلب",
      "يرفع البرنامج وزن",
      "يتراجع أولًا",
      "لم يُبلغ عن تنفيذ شيء منه",
      "التزام متكرر",
      "هو السعر المحقق ناقص",
      "هو طاقة فائضة",
    ])
      expect(all).not.toContain(banned);
  });
  test("analyses carry the definition gates the review required, and stay BLOCKED", () => {
    const by = new Map(pack.analyses.map((a) => [a.id, a]));
    expect(by.get("fa-dividends")!.blockers).toContain(
      "OUTPUT_DEFINITION_NOT_BOUND:fcf_dividend_coverage",
    );
    expect(by.get("fa-dividends")!.b02Inputs.map((b) => b.metric)).toEqual(["dividends_paid"]);
    expect(by.get("fa-working-capital-debt")!.inputs.map((i) => i.key)).not.toContain(
      "total_liabilities",
    );
    expect(by.get("fa-returns")!.definition.ar).toContain("فلا سلسلة زمنية قابلة للمقارنة ضمنيًا");
    for (const a of pack.analyses) expect(a.status).toBe("BLOCKED");
  });
});
