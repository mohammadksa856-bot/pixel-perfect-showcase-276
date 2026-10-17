// WEB-08B04 residual REWORK (Codex a4150fe): RR-ENG03-01 and RR-ENG02-01.
// Each case asserts the intended guard code, so a pass cannot come from an incidental error.
import { describe, expect, test } from "bun:test";
import { loadContext, periodLabel } from "./evidence";
import { SECTIONS, compilePack, numberTokens } from "./pack";
import type { Section } from "./schema";

const LEGAL = [{ t: "engine_profile", field: "legal_name" }];
const RATING = [{ t: "engine_profile", field: "credit_rating" }];
const withParagraph =
  (kind: string, ar: string, refs: unknown[] = LEGAL, en: string | null = null) =>
  () => {
    const s = structuredClone(SECTIONS) as Section[];
    s[0]!.paragraphs.push({ id: "residual", kind, ar, en, topics: ["financials"], refs } as never);
    compilePack(loadContext(), s);
  };

describe("RR-ENG03-01 currency and percent are read before and after the number, with or without a space", () => {
  const forms: [string, string][] = [
    ["صافي الربح SAR 2025.", "currency"],
    ["صافي الربح SAR2025.", "currency"],
    ["صافي الربح 2025ريال.", "currency"],
    ["صافي الربح 2025 ريال.", "currency"],
    ["صافي الربح ريال 2025.", "currency"],
    ["صافي الربح ﷼2025.", "currency"],
    ["Profit $2025.", "currency"],
    ["Profit US$ 2025.", "currency"],
    ["Profit USD2025.", "currency"],
    ["Profit 2025USD.", "currency"],
    ["Profit 2025 SAR.", "currency"],
    ["صافي الربح 2025\nSAR.", "currency"],
    ["هامش الربح 2025٪.", "percent"],
    ["هامش الربح 2025 ٪.", "percent"],
    ["هامش الربح 2025%.", "percent"],
    ["هامش الربح 2025％.", "percent"],
    ["Margin 2025 per cent.", "percent"],
    ["Margin 2025 percent.", "percent"],
    ["هامش الربح 2025 في المئة.", "percent"],
  ];
  test("every form is classified as a quantity, not a bare year", () => {
    for (const [s, c] of forms)
      expect({ s, classes: numberTokens(s).find((t) => t.n === "2025")!.classes }).toEqual({
        s,
        classes: [c],
      });
  });
  test("ticker-shaped amounts are quantities too", () => {
    expect(numberTokens("SAR 2222")[0]!.classes).toEqual(["currency"]);
    expect(numberTokens("2222٪")[0]!.classes).toEqual(["percent"]);
  });
  test("in an interpretation each form is rejected as a quantity (Arabic and English text)", () => {
    for (const [s] of forms) {
      expect(withParagraph("research_interpretation", s)).toThrow(
        /quantity_in_research_interpretation:residual:2025/,
      );
      expect(withParagraph("research_interpretation", "نص.", LEGAL, s)).toThrow(
        /quantity_in_research_interpretation:residual:en:2025/,
      );
    }
  });
  test("in an engine record an unsupported prefixed or glued amount is rejected as unsupported", () => {
    for (const s of [
      "صافي الربح SAR 2025.",
      "صافي الربح 2025ريال.",
      "هامش الربح 2025٪.",
      "Profit $2025.",
    ])
      expect(withParagraph("reported_record", s)).toThrow(/unsupported_quantity:residual:2025/);
  });
  test("ambiguous glued formats fail closed instead of passing as years", () => {
    for (const s of [
      "الربح 2025x.",
      "الربح x2025.",
      "الربح 2025ر.",
      "Profit 2025k.",
      "الربح ¥2025.",
    ])
      expect({
        s,
        err: (() => {
          try {
            withParagraph("research_interpretation", s)();
            return null;
          } catch (e) {
            return String(e);
          }
        })(),
      }).toEqual({
        s,
        err: expect.stringMatching(/ambiguous_number_format:residual:2025/),
      });
  });
  test("valid years, the ticker, Arabic proclitics, year markers and rating grades still pass", () => {
    for (const s of [
      "في عام 2025.",
      "في 2025م.",
      "و2024 ثم 2025.",
      "بـ2025.",
      "(2025).",
      "«2222».",
      "2024-2025.",
      "FY 2025.",
    ])
      expect(withParagraph("research_interpretation", s)).not.toThrow();
    expect(numberTokens("Aa3")).toEqual([{ n: "3", classes: [] }]);
  });
  test("a rating grade is a bare number that still needs its evidence", () => {
    expect(withParagraph("reported_record", "التصنيف Aa9.", RATING)).toThrow(
      /ambiguous_number_format|unsupported_number/,
    );
  });
});

describe("RR-ENG02-01 row periods are validated before labelling", () => {
  test("fiscal quarters outside 1..4 are rejected", () => {
    for (const fq of [0, 5, 2.5, -1])
      expect(() =>
        periodLabel({ period_kind: "quarter", fiscal_year: 2025, fiscal_quarter: fq }),
      ).toThrow(/unlabelled_period:invalid_fiscal_quarter/);
    for (const fq of [1, 4])
      expect(periodLabel({ period_kind: "quarter", fiscal_year: 2025, fiscal_quarter: fq })).toBe(
        `2025Q${fq}`,
      );
  });
  test("non-integer or out-of-range fiscal years are rejected", () => {
    for (const fy of [2025.5, 0, 99999])
      expect(() => periodLabel({ period_kind: "fy", fiscal_year: fy })).toThrow(
        /invalid_fiscal_year/,
      );
  });
  test("impossible civil dates are rejected for start and end, in every kind", () => {
    expect(() => periodLabel({ period_kind: "instant", period_end: "2025-02-30" })).toThrow(
      /invalid_end_date/,
    );
    expect(() => periodLabel({ period_kind: "instant", period_end: "2025-02-29" })).toThrow(
      /invalid_end_date/,
    );
    expect(() =>
      periodLabel({ period_kind: "ytd", period_start: "2025-13-01", period_end: "2025-12-31" }),
    ).toThrow(/invalid_start_date/);
    expect(() =>
      periodLabel({
        period_kind: "quarter",
        fiscal_year: 2025,
        fiscal_quarter: 4,
        period_end: "2025-12-32",
      }),
    ).toThrow(/invalid_end_date/);
    expect(() =>
      periodLabel({ period_kind: "fy", fiscal_year: 2025, period_end: "2025-00-10" }),
    ).toThrow(/invalid_end_date/);
  });
  test("leap days: valid in a leap year, including the century rule", () => {
    expect(periodLabel({ period_kind: "instant", period_end: "2024-02-29" })).toBe("@2024-02-29");
    expect(periodLabel({ period_kind: "instant", period_end: "2000-02-29" })).toBe("@2000-02-29");
    expect(() => periodLabel({ period_kind: "instant", period_end: "2100-02-29" })).toThrow(
      /invalid_end_date/,
    );
  });
  test("start after end is rejected; year-boundary ranges are kept as given", () => {
    expect(() =>
      periodLabel({ period_kind: "ytd", period_start: "2026-01-01", period_end: "2025-12-31" }),
    ).toThrow(/start_after_end/);
    expect(
      periodLabel({ period_kind: "ytd", period_start: "2025-12-31", period_end: "2026-01-01" }),
    ).toBe("YTD2025-12-31..2026-01-01");
    expect(
      periodLabel({
        period_kind: "quarter",
        fiscal_year: 2025,
        fiscal_quarter: 4,
        period_start: "2025-10-01",
        period_end: "2025-12-31",
      }),
    ).toBe("2025Q4");
  });
  test("an instant's optional start is kept as given, but never after its end", () => {
    expect(
      periodLabel({ period_kind: "instant", period_start: "2025-01-01", period_end: "2025-12-31" }),
    ).toBe("@2025-12-31");
    expect(() =>
      periodLabel({ period_kind: "instant", period_start: "2026-01-01", period_end: "2025-12-31" }),
    ).toThrow(/start_after_end/);
  });
  test("incomplete periods are not completed by inference; FY, quarter, YTD and instant stay distinct", () => {
    expect(() => periodLabel({ period_kind: "instant" })).toThrow(/instant_without_end/);
    expect(() => periodLabel({ period_kind: "quarter", fiscal_year: 2025 })).toThrow(
      /quarter_identity/,
    );
    expect(periodLabel({ period_kind: "ytd", period_end: "2026-06-30" })).toBe("YTD...2026-06-30");
    const end = "2025-12-31";
    expect(
      new Set([
        periodLabel({
          period_kind: "fy",
          fiscal_year: 2025,
          period_start: "2025-01-01",
          period_end: end,
        }),
        periodLabel({
          period_kind: "quarter",
          fiscal_year: 2025,
          fiscal_quarter: 4,
          period_start: "2025-10-01",
          period_end: end,
        }),
        periodLabel({ period_kind: "ytd", period_start: "2025-01-01", period_end: end }),
        periodLabel({ period_kind: "instant", period_end: end }),
      ]).size,
    ).toBe(4);
  });
});
