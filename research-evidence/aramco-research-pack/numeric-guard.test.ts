// WEB-08B04 RR-ENG03-01 (Codex 0fe3312): author tests for the restructured numeric guard.
// Three paths (punctuation, ISO 4217, Unicode) plus legitimate text. Each rejection asserts the exact
// guard code; a control with the same reference proves the fixture itself compiles.
import { describe, expect, test } from "bun:test";
import { loadContext } from "./evidence";
import { ISO4217_CODES, ISO4217_SOURCE } from "./iso4217";
import { LOCAL_GAP_MAX, analyseNumbers } from "./numeric-guard";
import { SECTIONS, compilePack, numberTokens } from "./pack";
import type { Section } from "./schema";

const ctx = loadContext();
const errorFor = (
  ar: string,
  kind = "research_interpretation",
  en: string | null = null,
): string | null => {
  const s = structuredClone(SECTIONS) as Section[];
  s[0]!.paragraphs.push({
    id: "ng",
    kind,
    ar,
    en,
    topics: ["financials"],
    refs: [{ t: "engine_profile", field: "legal_name" }],
  } as never);
  try {
    compilePack(ctx, s);
    return null;
  } catch (e) {
    return String((e as Error).message);
  }
};
const cls = (s: string, n = "2025") => numberTokens(s).find((t) => t.n === n)?.classes;
const QUANTITY = /^quantity_in_research_interpretation:ng:/;
const AMBIG = /^ambiguous_number_format:ng:/;

test("fixture control: the same reference and kind compile with a plain year", () => {
  expect(errorFor("السنة 2025.")).toBeNull();
  expect(errorFor("نص.", "research_interpretation", "The year 2025.")).toBeNull();
});

describe("A punctuation: one local-gap set on both sides, Arabic and Latin", () => {
  const gaps = [
    " ",
    ",",
    "، ",
    ";",
    "؛",
    ":",
    ": ",
    " (",
    "[",
    "{",
    "«",
    '"',
    "'",
    "“",
    "‘",
    ", (",
    " ; ",
    "،(",
    ") ,",
  ];
  for (const g of gaps) {
    test(`before ${JSON.stringify(g)}`, () => {
      expect(cls(`SAR${g}2025`)).toEqual(["currency"]);
      expect(errorFor(`الربح SAR${g}2025.`)).toMatch(QUANTITY);
      expect(errorFor(`الربح SAR${g}2025.`, "reported_record")).toMatch(
        /^unsupported_quantity:ng:2025 currency/,
      );
    });
    test(`after ${JSON.stringify(g)}`, () => {
      expect(cls(`2025${g}ريال`)).toEqual(["currency"]);
      expect(errorFor(`الربح 2025${g}ريال.`)).toMatch(QUANTITY);
    });
  }
  test("Codex C0–C3 in both fields", () => {
    for (const s of [
      "Profit SAR, 2025.",
      "صافي الربح SAR، 2025.",
      "Profit USD;2025.",
      "الربح SAR؛2025.",
    ]) {
      expect(errorFor(s)).toMatch(QUANTITY);
      expect(errorFor("نص.", "research_interpretation", s)).toMatch(
        /^quantity_in_research_interpretation:ng:en:/,
      );
    }
  });
  test(`mixed repeated runs up to ${LOCAL_GAP_MAX} bind; longer runs fail closed as detached`, () => {
    expect(cls("USD ;: (2025")).toEqual(["currency"]);
    expect(cls("2025) ،; USD")).toEqual(["currency"]);
    expect(numberTokens("USD" + ":".repeat(7) + "2025")).toEqual([{ n: "2025", classes: [] }]);
    expect(errorFor("Profit USD" + ":".repeat(7) + "2025.")).toMatch(
      /^ambiguous_number_format:ng:2025:detached_unit$/,
    );
    expect(errorFor("Profit 2025" + ")".repeat(12) + "USD.")).toMatch(/:detached_unit$/);
    expect(errorFor("الربح 2025" + " ".repeat(20) + "ريال.")).toMatch(/:detached_unit$/);
  });
  test("a period, dash or slash next to a currency fails closed instead of reading as a year", () => {
    for (const s of [
      "Profit USD. 2025.",
      "Profit USD-2025.",
      "Profit SAR – 2025.",
      "Profit USD/2025.",
      "In 2025. SAR rose.",
      "2025-USD.",
      "2025 / ريال",
      "Profit AED. 2025.",
    ])
      expect({ s, e: errorFor(s) }).toEqual({
        s,
        e: expect.stringMatching(/^ambiguous_number_format:ng:2025:hard_boundary_unit$/),
      });
  });
  test("ranges, sentence ends and words between keep plain years", () => {
    for (const s of [
      "الفترة 2024-2025.",
      "2024–2025",
      "2025/2026",
      "Revenue in USD rose in 2025.",
      "The 2025. Then 2026.",
      "USD rose; then in 2025 it fell.",
      "في 2025، ثم ارتفع.",
    ])
      expect({ s, e: errorFor(s) }).toEqual({ s, e: null });
  });
});

describe("B ISO 4217: known-unsupported codes fail closed; supported codes are quantities", () => {
  test("the code list matches its documented source", () => {
    expect(ISO4217_CODES.length).toBe(ISO4217_SOURCE.count);
    expect(new Set(ISO4217_CODES).size).toBe(178);
    for (const c of ISO4217_CODES) expect(c).toMatch(/^[A-Z]{3}$/);
    for (const c of ["XCG", "ZWG", "XAU", "VED", "SLE", "SAR", "USD"])
      expect(ISO4217_CODES).toContain(c);
    expect([...ISO4217_CODES]).toEqual([...ISO4217_CODES].sort());
  });
  test("every non-supported ISO code fails closed before and after, through punctuation", () => {
    for (const c of ISO4217_CODES.filter((x) => !["SAR", "USD", "EUR", "GBP"].includes(x)))
      for (const s of [
        `${c} 2025`,
        `${c}: 2025`,
        `(2025) ${c}`,
        `2025, ${c}`,
        `${c}2025`,
        `2025${c}`,
      ])
        expect({ s, c: cls(s) }).toEqual({ s, c: ["ambiguous"] });
  });
  test("Codex XCG, ZWG, XAU rejected at the numeric guard", () => {
    for (const c of ["XCG", "ZWG", "XAU"]) {
      expect(errorFor(`Profit ${c}: 2025.`)).toMatch(
        /^ambiguous_number_format:ng:2025:unsupported_unit$/,
      );
      expect(errorFor(`Profit (2025) ${c}.`, "reported_record")).toMatch(
        /^ambiguous_number_format:ng:2025:unsupported_unit$/,
      );
    }
  });
  test("supported currencies in any letter case are quantities", () => {
    for (const s of [
      "usd 2025",
      "Usd 2025",
      "sar: 2025",
      "2025 Sar",
      "eur (2025)",
      "2025 gbp",
      "دولار 2025",
      "بالريال 2025",
      "يورو، 2025",
    ])
      expect({ s, c: cls(s) }).toEqual({ s, c: ["currency"] });
  });
  test("common unsupported codes in any case, Arabic names and currency symbols fail closed", () => {
    for (const s of [
      "aed 2025",
      "Jpy: 2025",
      "2025 mxn",
      "درهم 2025",
      "2025 دينار",
      "ليرة: 2025",
      "₹ 2025",
      "2025 ₩",
      "฿(2025)",
      "₿ 2025",
      "2025 ‰",
      "2025؉",
      "¢2025",
    ])
      expect({ s, c: cls(s) }).toEqual({ s, c: ["ambiguous"] });
  });
  test("Latin unit words match whole words only (BND is not bn, MNT is not mn)", () => {
    expect(cls("2025 bn")).toEqual(["scale"]);
    expect(cls("2025 bnx")).toEqual([]);
    expect(cls("2025 BND")).toEqual(["ambiguous"]);
    expect(cls("2025 مليارات ريال")).toEqual(["currency", "scale"]);
  });
  test("ordinary words and acronyms are not currencies", () => {
    for (const s of [
      "FY 2025",
      "GDP 2025",
      "CEO 2025",
      "ESG 2025",
      "IPO 2025",
      "try 2025",
      "Top 2025",
      "all 2025",
      "cup 2025",
      "AEDX 2025",
      "2025 Aedes",
    ])
      expect({ s, c: cls(s) }).toEqual({ s, c: [] });
    expect(errorFor("Revenue ESG 2025 and FY 2025 and CEO 2025.")).toBeNull();
  });
  test("documented limit: a non-common ISO code in lowercase is not recognised", () => {
    expect(cls("xcg 2025")).toEqual([]);
  });
  test("recognising a currency is not qualification: a matched-looking record still needs evidence", () => {
    expect(errorFor("Profit USD 2025.", "reported_record")).toMatch(
      /^unsupported_quantity:ng:2025 currency$/,
    );
  });
});

describe("C Unicode: checked on raw text before any masking", () => {
  const CONTROLS = ["​", "‌", "‍", "‎", "‏", "؜", "⁠", "﻿", "­", "‪", "⁦"];
  for (const c of CONTROLS) {
    const cp = "U+" + c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0");
    test(`format control ${cp} anywhere fails closed`, () => {
      expect(errorFor(`Profit USD${c} 2025.`)).toMatch(
        /^ambiguous_number_format:ng:2025:format_control$/,
      );
      expect(errorFor(`الربح SAR ${c}2025.`)).toMatch(AMBIG);
      expect(errorFor(`US${c}D 2025.`)).toMatch(AMBIG); // hidden inside the code
      expect(errorFor(`السنة 2025، ثم نص${c} بعيد.`)).toMatch(AMBIG); // far from the number
      expect(errorFor(`نص بلا أرقام${c}.`)).toBe(`format_control:ng:${cp}`);
      expect(errorFor("نص.", "research_interpretation", `Profit USD${c} 2025.`)).toMatch(
        /^ambiguous_number_format:ng:en:/,
      );
    });
  }
  const DIGITS: [string, string][] = [
    ["٢٠٢٥", "U+0662"],
    ["۲۰۲۵", "U+06F2"],
    ["２０２５", "U+FF12"],
    ["𝟚𝟘𝟚𝟝", "U+1D7DA"],
    ["२०२५", "U+0968"],
    ["২০২৫", "U+09E8"],
    ["2025²", "U+00B2"],
    ["½", "U+00BD"],
    ["Ⅻ", "U+216B"],
    ["①", "U+2460"],
    ["20２5", "U+FF12"],
  ];
  for (const [d, cp] of DIGITS)
    test(`non-ASCII number ${cp}`, () => {
      expect(errorFor(`Profit USD ${d}.`)).toBe(`non_latin_digits:ng:${cp}`);
      expect(errorFor(`السنة ${d}.`)).toBe(`non_latin_digits:ng:${cp}`);
      expect(errorFor("نص.", "research_interpretation", `Year ${d}.`)).toBe(
        `non_latin_digits:ng:en:${cp}`,
      );
    });
  test("non-ASCII digit runs are tokenised as ambiguous, not dropped", () => {
    const [t] = analyseNumbers("USD ２０２５");
    expect(t!.classes).toContain("ambiguous");
    expect(t!.reasons).toEqual(["non_ascii_digit"]);
  });
  test("Unicode spaces are ordinary local gaps", () => {
    for (const sp of [" ", " ", " ", " ", "　", "\t", "\n"]) {
      expect(cls(`USD${sp}2025`)).toEqual(["currency"]);
      expect(cls(`2025${sp}ريال`)).toEqual(["currency"]);
    }
  });
  test("no normalisation: dates and source codes are left as written", () => {
    expect(errorFor("التاريخ 2025-06-30.", "reported_record")).toBeNull();
    expect(numberTokens("WEB-08B03 وB02 في 2025-06-30")).toEqual([]);
  });
});

describe("D legitimate text is not corrupted", () => {
  test("years, ticker, codes, list markers and civil dates", () => {
    for (const s of [
      "في 2024 و2025.",
      "الرمز 2222.",
      "رمز الشركة (2222).",
      "WEB-08B03 وB02.",
      "التاريخ 2024-02-29.",
      "في 2025م.",
      "«2025»، ثم 2026.",
      "Results (2025), then 2026.",
    ])
      expect({
        s,
        e: errorFor(s, s.startsWith("التاريخ") ? "reported_record" : "research_interpretation"),
      }).toEqual({ s, e: null });
  });
  test("a rating grade stays a bare number that needs its evidence", () => {
    expect(numberTokens("Aa3")).toEqual([{ n: "3", classes: [] }]);
    expect(numberTokens("Moody's (Aa3)")).toEqual([{ n: "3", classes: [] }]);
  });
  test("a financial word far from a number does not block a year", () => {
    expect(errorFor("ارتفعت الإيرادات بالريال بعد أن بدأ البرنامج في 2025.")).toBeNull();
  });
  test("the frozen draft compiles unchanged, including the Aa3 rating paragraph", () => {
    const p = compilePack(ctx);
    expect(p.paragraphs).toHaveLength(99);
    expect(p.paragraphs.find((x) => x.id === "bm-rating")!.ar).toContain("Aa3");
  });
});
