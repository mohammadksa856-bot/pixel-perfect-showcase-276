import { expect, test } from 'bun:test';
import { loadContext, resolveRef } from '../../research-evidence/aramco-research-pack/evidence';
import { compilePack, SECTIONS } from '../../research-evidence/aramco-research-pack/pack';
import { renderReader } from '../../research-evidence/aramco-research-pack/reader';
const mutate=(text:string,kind='research_interpretation',ref:any={t:'engine_profile',field:'legal_name'})=>{
 const s=structuredClone(SECTIONS);s[0]!.paragraphs.push({id:'independent-mutation',kind,ar:text,en:null,topics:['financials'],refs:[ref]} as any);return ()=>{compilePack(loadContext(),s);};
};
test('R01: mixed units must not be represented by first-row unit',()=>{
 const c=loadContext();c.buckets.annual.set('synthetic',[{unit:'SAR',fiscal_year:2025,source_url:'https://example.com/a'},{unit:'USD',fiscal_year:2024,source_url:'https://example.com/b'}]);
 expect(()=>resolveRef({t:'engine_metric',key:'synthetic',bucket:'annual'},c)).toThrow();
});
test('R02: conflicting document versions must not select first source',()=>{
 const c=loadContext();c.buckets.annual.set('synthetic',[{unit:'SAR',fiscal_year:2025,source_url:'https://example.com/v1'},{unit:'SAR',fiscal_year:2025,source_url:'https://example.com/v2'}]);
 expect(()=>resolveRef({t:'engine_metric',key:'synthetic',bucket:'annual'},c)).toThrow();
});
test('R03: YTD must not be labelled as a standalone quarter',()=>{
 const c=loadContext();c.buckets.ytd.set('synthetic',[{period_kind:'ytd',fiscal_year:2026,fiscal_quarter:2,period_end:'2026-06-30',unit:'SAR'}]);
 expect(resolveRef({t:'engine_metric',key:'synthetic',bucket:'ytd'},c).periods).not.toContain('2026Q2');
});
test('R04: year-shaped financial amount cannot bypass numeric guard',()=>expect(mutate('صافي الربح 2025 ريال.')).toThrow());
test('R05: symbol-shaped financial amount cannot bypass numeric guard',()=>expect(mutate('التدفق الحر 2222 ريال.')).toThrow());
test('R06: impossible civil date must be rejected',()=>expect(mutate('تاريخ الحدث 2025-02-30.','reported_record')).toThrow());
test('R07: future exact publication date must be rejected',()=>expect(mutate('حدث بالفعل بتاريخ 2026-12-31.','reported_record')).toThrow());
test('R08: a number in evidence is not semantic support for unrelated profit',()=>expect(mutate('صافي الربح 12 مليار ريال.','research_interpretation',{t:'b03_claim',id:'aramco-msc-12mbd'})).toThrow());
test('R09: thousand-grouped copied amount must be rejected',()=>expect(mutate('التدفق النقدي 123,456,789 ريال.')).toThrow());
test('R10: decimal copied amount must be rejected',()=>expect(mutate('التدفق النقدي 123456.789 ريال.')).toThrow());
test('R11: seven analyses remain blocked and all 22 claims withheld',()=>{
 const c=loadContext(),p=compilePack(c);expect(p.analyses).toHaveLength(7);expect(p.analyses.every(a=>a.status==='BLOCKED')).toBe(true);expect(c.register.claims.every(a=>a.qualification.status==='WITHHELD')).toBe(true);
});
test('R12: hostile text remains escaped in reader',()=>{
 const p=compilePack();p.paragraphs[0]!.ar='<img src=x onerror=alert(1)>';const html=renderReader(p,'ar','http://127.0.0.1:5173');expect(html).not.toContain('<img src=x');expect(html).toContain('&lt;img');
});
