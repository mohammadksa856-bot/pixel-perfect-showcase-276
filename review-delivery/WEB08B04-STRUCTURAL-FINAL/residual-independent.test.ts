import { expect, test } from "bun:test";
import { compilePack, SECTIONS, numberTokens } from "../../research-evidence/aramco-research-pack/pack";
import { loadContext, periodLabel } from "../../research-evidence/aramco-research-pack/evidence";

function errorFor(text: string, kind = "research_interpretation"): string | null {
  const sections = structuredClone(SECTIONS);
  sections[0]!.paragraphs.push({ id: "residual-independent", kind, ar: text, en: null,
    topics: ["financials"], refs: [{t: "engine_profile", field: "legal_name"}] } as never);
  try { compilePack(loadContext(), sections); return null; }
  catch(e) { return String(e); }
}
const quantities = [
  "Profit SAR2025.", "Profit 2025USD.", "الربح ﷼2025.", "Profit €2025.",
  "Profit 2025£.", "Profit USD\u00a02025.", "Profit 2025\u202fUSD.",
  "Profit SAR\t2025.", "هامش الربح 2025％.", "Profit 2222%.",
  "الربح 2222ريال.", "Margin 2025 per cent.", "الهامش 2025 في المئة.",
];
for(const [i,text] of quantities.entries()) {
  test("N"+i+" typed quantity rejected by numeric guard, interpretation", () =>
    expect(errorFor(text)).toMatch(/quantity_in_research_interpretation:residual-independent/));
  test("NR"+i+" unsupported quantity rejected by intended evidence guard", () =>
    expect(errorFor(text,"reported_record")).toMatch(/unsupported_quantity:residual-independent/));
}
// Punctuation must not turn an unmistakable financial amount into a bare calendar year.
for(const [i,text] of [
  "Profit SAR: 2025.", "Profit USD (2025).", "صافي الربح (2025) ريال.",
  "Profit 2025, USD.", "Profit $ (2025).", "Margin 2025 ‰.",
  "Profit ¥ 2025.", "Profit AED 2025.",
].entries()) test("P"+i+" ambiguous financial syntax fails closed", () =>
  expect(errorFor(text)).toMatch(/quantity_in_research_interpretation|ambiguous_number_format/));
for(const text of ["Profit x2025.", "Profit 2025k.", "Profit 2025\u200bUSD."])
  test("ambiguous adjacent form "+JSON.stringify(text), () =>
    expect(errorFor(text)).toMatch(/ambiguous_number_format/));
for(const text of ["السنة 2025.", "الرمز 2222.", "WEB-08B03 وB02.",
  "الفترة 2024-2025.", "السنة 2025م."])
  test("legitimate year or source code "+text, () => expect(errorFor(text)).toBeNull());
test("rating Aa3 remains a number token, not a quantity or ambiguity", () =>
  expect(numberTokens("Aa3")).toEqual([{n:"3",classes:[]}]));
test("existing credit rating and full draft remain buildable", () => expect(()=>compilePack()).not.toThrow());

const q = {period_kind:"quarter",fiscal_year:2025,fiscal_quarter:2,period_start:"2025-04-01",period_end:"2025-06-30"};
for(const n of [0,-1,5,99,1.5,NaN,Infinity]) test("quarter rejects "+n, () =>
  expect(()=>periodLabel({...q,fiscal_quarter:n})).toThrow(/invalid_fiscal_quarter/));
for(const n of [0,-1,1899,2101,2025.5,NaN,Infinity]) test("year rejects "+n, () =>
  expect(()=>periodLabel({...q,fiscal_year:n})).toThrow(/invalid_fiscal_year/));
for(const date of ["2025-02-29","2100-02-29","2025-04-31","2025-13-01","2025-00-10","2025-01-00","2025-1-01"])
  test("invalid end "+date,()=>expect(()=>periodLabel({period_kind:"instant",period_end:date})).toThrow(/invalid_end_date/));
test("invalid start rejected separately",()=>expect(()=>periodLabel({...q,period_start:"2025-02-30"})).toThrow(/invalid_start_date/));
test("reversed bounds rejected separately",()=>expect(()=>periodLabel({...q,period_start:"2025-07-01"})).toThrow(/start_after_end/));
for(const date of ["2000-02-29","2024-02-29"]) test("valid leap "+date,()=>expect(periodLabel({period_kind:"instant",period_end:date})).toBe("@"+date));
test("missing quarter stays missing",()=>expect(()=>periodLabel({period_kind:"quarter",fiscal_year:2025})).toThrow(/quarter_identity/));
test("missing instant end not invented",()=>expect(()=>periodLabel({period_kind:"instant"})).toThrow(/instant_without_end/));
test("null start allowed without invention",()=>expect(periodLabel({period_kind:"instant",period_start:null,period_end:"2025-06-30"})).toBe("@2025-06-30"));

