import {expect,test} from "bun:test";
import {compilePack,SECTIONS} from "../../research-evidence/aramco-research-pack/pack";
import {loadContext} from "../../research-evidence/aramco-research-pack/evidence";

function attempt(text:string,english=false):string|null{
 const sections=structuredClone(SECTIONS);
 sections[0]!.paragraphs.push({id:"structural-independent",kind:"research_interpretation",ar:english?"وصف بحثي.":text,en:english?text:null,
 topics:["financials"],refs:[{t:"engine_profile",field:"legal_name"}]} as never);
 try{compilePack(loadContext(),sections);return null;}catch(e){return String(e);}
}
const formatGuard=/format_control:structural-independent|ambiguous_number_format:structural-independent.*format_control/;
const controls=[0x200b,0x200e,0x061c,0x2060,0x202e,0xfeff];
for(const cp of controls){
 const cf=String.fromCodePoint(cp),id="U+"+cp.toString(16).toUpperCase();
 for(const base of ["التاريخ 2025-06-30","WEB-08B03"])
  test(id+" masked numeric text must reject at raw format guard: "+base,()=>expect(attempt(base+cf)).toMatch(formatGuard));
 test(id+" no-number control rejects explicitly",()=>expect(attempt("وصف"+cf)).toMatch(formatGuard));
 test(id+" unmasked-year control rejects explicitly",()=>expect(attempt("السنة 2025"+cf)).toMatch(formatGuard));
}
for(const base of ["Date 2025-06-30","WEB-08B03"])
 test("English masked text still rejects: "+base,()=>expect(attempt(base+String.fromCodePoint(0x200b),true)).toMatch(formatGuard));
for(const base of ["B02","1. وصف","2025-06-30 WEB-08B03"])
 test("mask interaction must not discard raw-control rejection: "+base,()=>expect(attempt(base+String.fromCodePoint(0x200b))).toMatch(formatGuard));
for(const base of ["التاريخ 2025-06-30","WEB-08B03","B02","1. وصف"])
 test("positive control without Cf: "+base,()=>expect(attempt(base)).toBeNull());
for(const text of ["التاريخ ２０２５-06-30","WEB-08B０３","USD ²"])
 test("raw non-ASCII numeric evidence preserved: "+text,()=>expect(attempt(text)).toMatch(/non_latin_digits:structural-independent/));
test("masked date plus remaining year triggers numeric format guard",()=>expect(attempt("2025-06-30"+String.fromCodePoint(0x200b)+" السنة 2025")).toMatch(formatGuard));
for(const base of ["USD (2025-06-30)","SAR: WEB-08B03"])
 test("currency plus mask still cannot suppress raw format guard: "+base,()=>expect(attempt(base+String.fromCodePoint(0x200b))).toMatch(formatGuard));
