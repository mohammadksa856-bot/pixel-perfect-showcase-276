// WEB-08B04 RR-ENG03-01 (Codex b58ecc2): the raw format-control policy runs before masking and does
// not depend on any number surviving it. Exact error strings prove the raw policy is the cause.
import { describe, expect, test } from "bun:test";
import { loadContext } from "./evidence";
import { FORMAT_CONTROL, analyseNumbers } from "./numeric-guard";
import { SECTIONS, compilePack } from "./pack";
import type { Section } from "./schema";

const ctx = loadContext();
const build = (text: string, kind: string, field: "ar" | "en"): string | null => {
  const s = structuredClone(SECTIONS) as Section[];
  s[0]!.paragraphs.push({
    id: "rfc",
    kind,
    ar: field === "ar" ? text : "وصف بحثي.",
    en: field === "en" ? text : null,
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

const ZWSP = "​";
// base text, first raw ASCII digit run (null when the text has no digit)
const BASES: [string, string | null][] = [
  ["التاريخ 2025-06-30", "2025"], // date: masked
  ["WEB-08B03", "08"], // stage code: masked
  ["B02", "02"], // stage code: masked
  ["1. وصف", "1"], // list marker: masked
  ["2025-06-30 WEB-08B03", "2025"], // every digit masked
  ["USD (2025-06-30)", "2025"], // currency next to a masked date
  ["السنة 2025", "2025"], // unmasked year
  ["وصف بلا أرقام", null], // no digit
];
const KINDS = ["research_interpretation", "reported_record"];

describe("controls: the same texts without a format control compile", () => {
  for (const [base] of BASES)
    for (const kind of KINDS)
      test(`${kind} ${base}`, () => expect(build(base + ".", kind, "ar")).toBeNull());
});

describe("raw format control rejects in ar and en, interpretation and record", () => {
  for (const [base, digits] of BASES)
    for (const kind of KINDS)
      for (const field of ["ar", "en"] as const)
        test(`${field} ${kind} ${base}`, () => {
          const where = field === "en" ? "rfc:en" : "rfc";
          expect(build(base + ZWSP, kind, field)).toBe(
            digits
              ? `ambiguous_number_format:${where}:${digits}:format_control`
              : `format_control:${where}:U+200B`,
          );
        });
});

describe("the rejection does not depend on tokens surviving the mask", () => {
  for (const base of ["التاريخ 2025-06-30", "WEB-08B03", "B02", "1. وصف", "2025-06-30 WEB-08B03"])
    test(`every number masked: ${base}`, () => {
      const text = base + ZWSP;
      expect(FORMAT_CONTROL.test(text)).toBe(true);
      expect(/[0-9]/.test(text)).toBe(true);
      // after masking no token remains, so the numeric loop alone could not reject it
      expect(analyseNumbers(text)).toEqual([]);
      expect(build(text, "research_interpretation", "ar")).toMatch(
        /^ambiguous_number_format:rfc:\d+:format_control$/,
      );
    });
});

describe("every format control, anywhere in the text", () => {
  for (const cp of [
    0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x061c, 0x2060, 0x202e, 0x2066, 0xfeff, 0x00ad,
  ])
    test(`U+${cp.toString(16).toUpperCase().padStart(4, "0")}`, () => {
      const c = String.fromCodePoint(cp);
      for (const t of [
        "WEB-08B03" + c,
        c + "B02",
        "التاريخ" + c + " 2025-06-30",
        "1." + c + " وصف",
      ])
        expect(build(t, "reported_record", "ar")).toMatch(
          /^ambiguous_number_format:rfc:\d+:format_control$/,
        );
      expect(build("وصف" + c, "research_interpretation", "en")).toMatch(
        /^format_control:rfc:en:U\+/,
      );
    });
});

test("unchanged: non-ASCII digits are still rejected first, even with a control present", () => {
  expect(build("التاريخ ２０２５-06-30" + ZWSP, "research_interpretation", "ar")).toBe(
    "non_latin_digits:rfc:U+FF12",
  );
});
