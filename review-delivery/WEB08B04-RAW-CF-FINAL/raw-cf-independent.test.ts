import {expect,test} from "bun:test";
import {compilePack,SECTIONS} from "../../research-evidence/aramco-research-pack/pack";
import {loadContext} from "../../research-evidence/aramco-research-pack/evidence";
const cf=(cp:number)=>String.fromCodePoint(cp);
function result(text:string,kind:string,field:string):string|null{
 const sections=structuredClone(SECTIONS);
 sections[0]!.paragraphs.push({id:"raw-cf-final",kind,ar:field==="ar"?text:"وصف بحثي.",en:field==="en"?text:null,
 topics:["financials"],refs:[{t:"engine_profile",field:"legal_name"}]} as never);
 try{compilePack(loadContext(),sections);return null;}catch(e){return String(e).replace(/^Error: /,"");}
}
const bad=[
 {id:"first-control",text:cf(0x2069)+"Date 2025-06-30",tail:"ambiguous_number_format:WHERE:2025:format_control"},
 {id:"last-control",text:"WEB-08B03"+cf(0x061c),tail:"ambiguous_number_format:WHERE:08:format_control"},
 {id:"inside-number",text:"20"+cf(0x200c)+"25",tail:"ambiguous_number_format:WHERE:20:format_control"},
 {id:"inside-identifier",text:"WE"+cf(0x200d)+"B-08B03",tail:"ambiguous_number_format:WHERE:08:format_control"},
 {id:"date-and-code",text:"2025-06-30 B02"+cf(0x2060),tail:"ambiguous_number_format:WHERE:2025:format_control"},
 {id:"no-number",text:"وصف"+cf(0x00ad)+" نصي",tail:"format_control:WHERE:U+00AD"},
 {id:"supplementary-control",text:"وصف"+cf(0xe0001),tail:"format_control:WHERE:U+E0001"},
 {id:"currency-obfuscation",text:"US"+cf(0x200b)+"D 2025",tail:"ambiguous_number_format:WHERE:2025:format_control"},
 {id:"non-ascii-priority-arabic",text:cf(0x200b)+"رقم "+cf(0x0661),tail:"non_latin_digits:WHERE:U+0661"},
 {id:"non-ascii-priority-fullwidth",text:"2025"+cf(0x2066)+" "+cf(0xff12),tail:"non_latin_digits:WHERE:U+FF12"},
 {id:"non-ascii-priority-supplementary",text:cf(0x200b)+"2025 "+cf(0x1d7da),tail:"non_latin_digits:WHERE:U+1D7DA"},
 {id:"multiple-controls-first-codepoint",text:cf(0xe0001)+"وصف"+cf(0x200b),tail:"format_control:WHERE:U+E0001"},
];
for(const x of bad) test(x.id+" exact raw rejection across field/type",()=>{
 for(const kind of ["research_interpretation","reported_record"])for(const field of ["ar","en"]){
  const where="raw-cf-final"+(field==="en"?":en":"");
  expect(result(x.text,kind,field)).toBe(x.tail.replace("WHERE",where));
 }
});
for(const text of ["التاريخ 2025-06-30","WEB-08B03 وB02","1. وصف","السنة 2025 والرمز 2222","وصف نصي","الفترة 2024-2025"])
 test("positive control without Cf: "+text,()=>{
  for(const kind of ["research_interpretation","reported_record"])for(const field of ["ar","en"])
   expect(result(text,kind,field)).toBeNull();
 });
