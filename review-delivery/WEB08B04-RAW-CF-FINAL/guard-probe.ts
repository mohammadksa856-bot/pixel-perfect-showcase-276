import { compilePack, SECTIONS, numberTokens } from '../../research-evidence/aramco-research-pack/pack';
import { loadContext } from '../../research-evidence/aramco-research-pack/evidence';
for (const text of ['Profit SAR: 2025.', 'Profit USD (2025).', 'صافي الربح (2025) ريال.', 'Profit 2025, USD.', 'Profit $ (2025).', 'Margin 2025 ‰.', 'Profit ¥ 2025.', 'Profit AED 2025.', 'Profit SAR2025.']) {
  for (const kind of ['research_interpretation','reported_record']) {
    const sections = structuredClone(SECTIONS);
    sections[0]!.paragraphs.push({id:'probe',kind,ar:text,en:null,topics:['financials'],refs:[{t:'engine_profile',field:'legal_name'}]} as never);
    let error: string|null = null;
    try { compilePack(loadContext(),sections); } catch(e) { error=String(e); }
    console.log(JSON.stringify({text,kind,tokens:numberTokens(text),accepted:error===null,error}));
  }
}
