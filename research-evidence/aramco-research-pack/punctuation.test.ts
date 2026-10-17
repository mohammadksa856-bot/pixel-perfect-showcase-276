// WEB-08B04 RR-ENG03-01 (Codex 08f8b75): a unit separated from the number by punctuation stays bound to it.
// Each case asserts the exact guard and token, so a pass cannot come from an incidental evidence or text error.
import { describe, expect, test } from "bun:test";
import { loadContext } from "./evidence";
import { SECTIONS, compilePack, numberTokens } from "./pack";
import type { Section } from "./schema";

const errorFor = (kind: string, ar: string, en: string | null = null): string | null => {
  const s = structuredClone(SECTIONS) as Section[];
  s[0]!.paragraphs.push({
    id: "punct",
    kind,
    ar,
    en,
    topics: ["financials"],
    refs: [{ t: "engine_profile", field: "legal_name" }],
  } as never);
  try {
    compilePack(loadContext(), s);
    return null;
  } catch (e) {
    return String((e as Error).message);
  }
};
const classesOf = (s: string, n = "2025") => numberTokens(s).find((t) => t.n === n)!.classes;

// Codex P0–P7, with the guard each must hit in an interpretation and in an engine record.
const P: [string, string, string, string][] = [
  [
    "Profit SAR: 2025.",
    "currency",
    "quantity_in_research_interpretation:punct:2025 currency",
    "unsupported_quantity:punct:2025 currency",
  ],
  [
    "Profit USD (2025).",
    "currency",
    "quantity_in_research_interpretation:punct:2025 currency",
    "unsupported_quantity:punct:2025 currency",
  ],
  [
    "صافي الربح (2025) ريال.",
    "currency",
    "quantity_in_research_interpretation:punct:2025 currency",
    "unsupported_quantity:punct:2025 currency",
  ],
  [
    "Profit 2025, USD.",
    "currency",
    "quantity_in_research_interpretation:punct:2025 currency",
    "unsupported_quantity:punct:2025 currency",
  ],
  [
    "Profit $ (2025).",
    "currency",
    "quantity_in_research_interpretation:punct:2025 currency",
    "unsupported_quantity:punct:2025 currency",
  ],
  [
    "Margin 2025 ‰.",
    "ambiguous",
    "ambiguous_number_format:punct:2025:unsupported_unit",
    "ambiguous_number_format:punct:2025:unsupported_unit",
  ],
  [
    "Profit ¥ 2025.",
    "ambiguous",
    "ambiguous_number_format:punct:2025:unsupported_unit",
    "ambiguous_number_format:punct:2025:unsupported_unit",
  ],
  [
    "Profit AED 2025.",
    "ambiguous",
    "ambiguous_number_format:punct:2025:unsupported_unit",
    "ambiguous_number_format:punct:2025:unsupported_unit",
  ],
];

describe("RR-ENG03-01 P0–P7 are rejected by the intended guard", () => {
  for (const [i, [text, cls, interp, record]] of P.entries())
    test(`P${i} ${text}`, () => {
      expect(classesOf(text)).toEqual([cls]);
      expect(errorFor("research_interpretation", text)).toBe(interp);
      expect(errorFor("reported_record", text)).toBe(record);
      // Same text in the English field: same guard, on the :en location.
      expect(errorFor("research_interpretation", "نص.", text)).toBe(
        interp.replace("punct:", "punct:en:"),
      );
    });
});

describe("local delimiters bind a unit to its number on either side", () => {
  const bound: [string, string][] = [
    ["SAR:2025", "currency"],
    ["SAR : 2025", "currency"],
    ["SAR (2025)", "currency"],
    ["SAR [2025]", "currency"],
    ['SAR "2025"', "currency"],
    ["SAR «2025»", "currency"],
    ["USD: (2025)", "currency"],
    ["$(2025)", "currency"],
    ["€ (2025)", "currency"],
    ["EUR 2025", "currency"],
    ["(2025) GBP", "currency"],
    ["2025 ((ريال", "currency"], // brackets are local delimiters on both sides
    ["عام 2025 (ريال سعودي)", "currency"],
    ["(2025)ريال", "currency"],
    ["2025) USD", "currency"],
    ["2025 ) , USD", "currency"],
    ["2025، ريال", "currency"],
    ["2025: SAR", "currency"],
    ["(2025) %", "percent"],
    ["2025, ٪", "percent"],
    ["(2025) مليار ريال", "currency,scale"],
    ["2025 USD", "currency"],
    ["USD (2025)", "currency"],
  ];
  for (const [s, c] of bound) test(JSON.stringify(s), () => expect(classesOf(s).join(",")).toBe(c));
});

describe("unsupported currencies and per-mille fail closed, before or after, through punctuation", () => {
  for (const s of [
    "AED (2025)",
    "AED: 2025",
    "JPY 2025",
    "2025 JPY",
    "(2025) CHF",
    "2025, درهم",
    "دينار 2025",
    "₹ (2025)",
    "2025 ‱",
    "(2025) ‰",
    "2025‰",
    "MXN 2025", // any ISO 4217 code, uppercase
    "(2025) ZAR",
    "TRY: 2025",
  ])
    test(JSON.stringify(s), () => expect(classesOf(s)).toEqual(["ambiguous"]));
});

describe("the binding stays local: no distant words, sentence ends or ranges", () => {
  const free = [
    "Revenue in SAR rose in 2025.", // words between the unit and the number
    "الإيرادات بالريال ارتفعت في 2025.",
    "SAR ( ( ( (2025", // seven delimiters: not local
    "في 2025، ثم ارتفع",
    "الفترة 2024-2025.",
    "FY 2025.",
    "في 2025م.",
    "2026 results in SAR", // words between the number and the unit
    "AEDX 2025", // not a currency code
    "2025 Aedes", // code must be a whole word
    "try 2025 again", // ISO codes match uppercase only
    "Top results 2025",
  ];
  for (const s of free)
    test(JSON.stringify(s), () => {
      for (const t of numberTokens(s))
        expect({ n: t.n, classes: t.classes }).toEqual({ n: t.n, classes: [] });
    });
  test("codes, ticker and rating are untouched", () => {
    expect(numberTokens("WEB-08B03 وB02.")).toEqual([]);
    expect(numberTokens("الرمز (2222).")).toEqual([{ n: "2222", classes: [] }]);
    expect(numberTokens("Moody's (Aa3)")).toEqual([{ n: "3", classes: [] }]);
  });
  test("legitimate years with punctuation still pass in an interpretation", () => {
    for (const s of [
      "في (2025).",
      "السنة: 2025.",
      "«2025»، ثم 2026.",
      "Results (2025), then 2026.",
      "Revenue in SAR rose in 2025.",
    ])
      expect({ s, err: errorFor("research_interpretation", s) }).toEqual({ s, err: null });
  });
  test("the frozen draft still compiles", () =>
    expect(() => compilePack(loadContext())).not.toThrow());
});
