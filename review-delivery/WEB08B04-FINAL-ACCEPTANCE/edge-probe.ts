import {compilePack,SECTIONS,numberTokens} from '../../research-evidence/aramco-research-pack/pack';
import {loadContext} from '../../research-evidence/aramco-research-pack/evidence';
const cases=['Profit SAR, 2025.','صافي الربح SAR، 2025.','Profit USD;2025.','الربح SAR؛2025.',
'Profit USD\u200b 2025.','الربح SAR\u200e 2025.','Profit USD ２０２５.','Profit USD 𝟚𝟘𝟚𝟝.',
'Profit XCG: 2025.','Profit (2025) XCG.','Profit ZWG: 2025.','Profit (2025) ZWG.','Profit XAU: 2025.','Profit (2025) XAU.',
'Profit SAR: 2025.','Profit SAR'+':'.repeat(6)+'2025.','Profit SAR'+':'.repeat(7)+'2025.'];
for(const text of cases) for(const kind of ['research_interpretation','reported_record']) {
 const sections=structuredClone(SECTIONS);
 sections[0]!.paragraphs.push({id:'edge-probe',kind,ar:text,en:null,topics:['financials'],refs:[{t:'engine_profile',field:'legal_name'}]} as never);
 let error:string|null=null;
 try{compilePack(loadContext(),sections);}catch(e){error=String(e);}
 console.log(JSON.stringify({text,kind,tokens:numberTokens(text),accepted:error===null,error}));
}
