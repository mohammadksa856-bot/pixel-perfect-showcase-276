import {expect,test} from 'bun:test';
import {compilePack,SECTIONS} from '../../research-evidence/aramco-research-pack/pack';
import {loadContext,resolveRef,periodLabel} from '../../research-evidence/aramco-research-pack/evidence';
function mutation(text:string,kind='research_interpretation'){
 return ()=>{const s=structuredClone(SECTIONS);s[0]!.paragraphs.push({id:'additional',kind,ar:text,en:null,topics:['financials'],refs:[{t:'engine_profile',field:'legal_name'}]} as never);compilePack(loadContext(),s);};
}
test('A01 currency prefix: unsupported profit SAR 2025 is not a year',()=>expect(mutation('صافي الربح SAR 2025.')).toThrow());
test('A02 no-space suffix: unsupported profit2025ريال is a quantity',()=>expect(mutation('صافي الربح 2025ريال.')).toThrow());
test('A03 Arabic percent glyph: margin2025٪ is not a year',()=>expect(mutation('هامش الربح 2025٪.')).toThrow());
test('A04 currency symbol prefix: profit $2025 is not a year',()=>expect(mutation('Profit $2025.')).toThrow());
test('A05 newline currency remains rejected',()=>expect(mutation('صافي الربح 2025\nSAR.')).toThrow());
test('A06 impossible leap day remains rejected',()=>expect(mutation('التاريخ 2025-02-29.','reported_record')).toThrow(/invalid_date/));
test('A07 valid historical leap day is accepted without qualification',()=>expect(mutation('التاريخ 2024-02-29.','reported_record')).not.toThrow());
test('A08 future exact date rejected',()=>expect(mutation('التاريخ 2027-01-01.','reported_record')).toThrow(/future_date/));
test('A09 explicit currency conflict rejected even if unit is identical',()=>{
 const c=loadContext();c.buckets.annual.set('synthetic',[{fiscal_year:2024,unit:'million',currency:'SAR'},{fiscal_year:2025,unit:'million',currency:'USD'}]);expect(()=>resolveRef({t:'engine_metric',key:'synthetic',bucket:'annual'},c)).toThrow(/heterogeneous_units/);
});
test('A10 explicit FY quarter YTD instant have distinct identities at common end',()=>{
 const c=loadContext();c.buckets.annual.set('synthetic',['fy','quarter','ytd','instant'].map(period_kind=>({period_kind,fiscal_year:2025,fiscal_quarter:4,period_start:period_kind==='quarter'?'2025-10-01':'2025-01-01',period_end:'2025-12-31',unit:'SAR'})));const r=resolveRef({t:'engine_metric',key:'synthetic',bucket:'annual'},c);expect(new Set(r.periods).size).toBe(4);expect(r.rows).toHaveLength(4);
});
test('A11 same source but different version fails closed',()=>{
 const c=loadContext();c.buckets.annual.set('synthetic',[1,2].map(version=>({fiscal_year:2025,unit:'SAR',version,source_url:'https://example.com/a'})));expect(()=>resolveRef({t:'engine_metric',key:'synthetic',bucket:'annual'},c)).toThrow(/conflicting_rows/);
});
test('A12 different fiscal-year sources retained per row not summarized as first source',()=>{
 const c=loadContext();c.buckets.annual.set('synthetic',[2024,2025].map(fiscal_year=>({fiscal_year,unit:'SAR',source_url:'https://example.com/'+fiscal_year})));const r=resolveRef({t:'engine_metric',key:'synthetic',bucket:'annual'},c);expect(r.source.url).toBeNull();expect(r.rows!.map(x=>x.sourceUrl)).toEqual(['https://example.com/2024','https://example.com/2025']);
});
test('A13 impossible fiscal quarter rejected not labelled Q5',()=>expect(()=>periodLabel({period_kind:'quarter',fiscal_year:2025,fiscal_quarter:5})).toThrow());
test('A14 impossible instant calendar rejected in row label',()=>expect(()=>periodLabel({period_kind:'instant',period_end:'2025-02-30'})).toThrow());
