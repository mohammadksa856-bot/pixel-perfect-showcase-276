import {expect,test} from "bun:test";
import {compilePack,SECTIONS,numberTokens} from "../../research-evidence/aramco-research-pack/pack";
import {loadContext} from "../../research-evidence/aramco-research-pack/evidence";

export function attempt(text:string,kind="research_interpretation",english=false) {
  const sections=structuredClone(SECTIONS);
  sections[0]!.paragraphs.push({id:"final-independent",kind,ar:english?"وصف بحثي.":text,en:english?text:null,
    topics:["financials"],refs:[{t:"engine_profile",field:"legal_name"}]} as never);
  try {compilePack(loadContext(),sections);return {accepted:true,error:null as string|null,tokens:numberTokens(text)};}
  catch(e) {return {accepted:false,error:String(e),tokens:numberTokens(text)};}
}
const numericGuard=/quantity_in_research_interpretation:final-independent|ambiguous_number_format:final-independent|non_latin_digits:final-independent/;
for(let n=0;n<=6;n++){
  for(const prefix of [true,false]){
    const text=prefix?"Profit USD"+":".repeat(n)+"2025.":"Profit 2025"+")".repeat(n)+"USD.";
    test("G"+n+" repeated delimiters "+(prefix?"prefix":"suffix"),()=>expect(attempt(text).error).toMatch(numericGuard));
  }
}
const unicodeGaps=["\u00a0","\u202f","\u2009","\ufeff","\t","\n"];
for(const [i,gap] of unicodeGaps.entries()) test("U"+i+" recognized whitespace, reject at intended guard",()=>{
  expect(attempt("Profit USD"+gap+"2025.").error).toMatch(numericGuard);
  expect(attempt("الربح 2025"+gap+"ريال.").error).toMatch(numericGuard);
});
const unsupported=["MXN","ZAR","TRY","AED","XCG","ZWG","XAU"];
for(const code of unsupported) test("ISO "+code+" separated amount must not become a year",()=>{
  expect(attempt("Profit "+code+": 2025.").error).toMatch(/ambiguous_number_format:final-independent/);
  expect(attempt("Profit (2025) "+code+".").error).toMatch(/ambiguous_number_format:final-independent/);
});
const edge=[
  ["C0","Profit SAR, 2025."],
  ["C1","صافي الربح SAR، 2025."],
  ["C2","Profit USD;2025."],
  ["C3","الربح SAR؛2025."],
  ["C4","Profit USD\u200b 2025."],
  ["C5","الربح SAR\u200e 2025."],
  ["C6","Profit USD ２０２５."],
  ["C7","Profit USD 𝟚𝟘𝟚𝟝."],
];
for(const [id,text] of edge) {
  test(id+" new ambiguous amount rejected, Arabic field",()=>expect(attempt(text).error).toMatch(numericGuard));
  test(id+" same guard in English field",()=>expect(attempt(text,"research_interpretation",true).error).toMatch(numericGuard));
}
for(const text of ["Results (2025).","السنة: 2025.","رمز الشركة (2222).","الفترة 2024-2025.","WEB-08B03 وB02.","Revenue in USD rose in 2025.","try 2025 again."])
  test("positive control "+text,()=>expect(attempt(text).accepted).toBe(true));
test("credit rating Aa3 preserves bare documented token",()=>expect(numberTokens("Aa3")).toEqual([{n:"3",classes:[]}]));
test("seven delimiter boundary documented, not mistaken for passed safety coverage",()=>{
  expect(numberTokens("USD"+":".repeat(7)+"2025.")).toEqual([{n:"2025",classes:[]}]);
  expect(numberTokens("2025"+")".repeat(7)+"USD.")).toEqual([{n:"2025",classes:[]}]);
});
test("frozen draft still compiles",()=>expect(()=>compilePack()).not.toThrow());
