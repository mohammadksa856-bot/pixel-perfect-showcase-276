import {compilePack,SECTIONS} from '../../research-evidence/aramco-research-pack/pack';
import {loadContext} from '../../research-evidence/aramco-research-pack/evidence';
import {analyseNumbers,FORMAT_CONTROL} from '../../research-evidence/aramco-research-pack/numeric-guard';
const cp=0x200b,cf=String.fromCodePoint(cp);
for(const base of ['التاريخ 2025-06-30','WEB-08B03','B02','1. وصف','USD (2025-06-30)','SAR: WEB-08B03','وصف','السنة 2025','2025-06-30 السنة 2025']){
 for(const kind of ['research_interpretation','reported_record']) for(const field of ['ar','en']){
  const text=base+cf,sections=structuredClone(SECTIONS);
  sections[0]!.paragraphs.push({id:'mask-probe',kind,ar:field==='ar'?text:'وصف بحثي.',en:field==='en'?text:null,topics:['financials'],refs:[{t:'engine_profile',field:'legal_name'}]} as never);
  let error:string|null=null;
  try{compilePack(loadContext(),sections);}catch(e){error=String(e);}
  console.log(JSON.stringify({textEscaped:base+'\\u200B',field,kind,rawAsciiDigit:/[0-9]/.test(text),rawCf:FORMAT_CONTROL.test(text),analysed:analyseNumbers(text),accepted:error===null,error}));
 }
}
