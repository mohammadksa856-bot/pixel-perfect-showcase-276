import {test,expect} from 'bun:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {LISTED_COMPANIES,LISTED_SOURCE} from '../src/lib/web-v1/listed-companies.data';
import {queryTable,TABLE_DEFAULTS,sectorIndex,parseTableQuery} from '../src/lib/web-v1/markets';
import type {DirectoryEntry} from '../src/lib/web-v1/catalog';
const raw=readFileSync('tadawul-data-lake/data-lake/raw/all_company_names.json');
const official=JSON.parse(raw.toString());
const entries:DirectoryEntry[]=LISTED_COMPANIES.map(([symbol,ar,board])=>({symbol,board,name:{ar,en:null},sector:null,industry:null,dataStatus:'listed_only',readiness:null,latestFiling:null}));
test('every generated identity and board equals archived source; hash and dated snapshot',()=>{
 expect(createHash('sha256').update(raw).digest('hex')).toBe('1df4505542a04fdc2ab8233f91311d4d7fed529ff361eb5a68c84cee45de0cd4');
 expect(LISTED_SOURCE.updatedInRepo).toBe('2026-08-30');
 expect(LISTED_COMPANIES.length).toBe(Object.keys(official).length);
 for(const [symbol,ar,board] of LISTED_COMPANIES){expect(ar).toBe(official[symbol].name_ar);expect(board).toBe(official[symbol].exchange==='نمو'?'nomu':'main');}
 expect(entries.filter(e=>e.board==='main')).toHaveLength(270);expect(entries.filter(e=>e.board==='nomu')).toHaveLength(126);
});
test('pagination is a disjoint partition, with no lost or duplicated identities',()=>{
 const ids=Array.from({length:8},(_,i)=>queryTable(entries,{...TABLE_DEFAULTS,page:i+1}).rows).flat().map(e=>e.symbol);
 expect(ids).toHaveLength(396);expect(new Set(ids).size).toBe(396);
});
test('unknown sectors and missing names never inferred; numeric and Arabic search',()=>{
 expect(sectorIndex(entries).classified).toBe(0);expect(queryTable(entries,{...TABLE_DEFAULTS,sector:'invented'}).total).toBe(0);
 expect(queryTable(entries,{...TABLE_DEFAULTS,q:'SABIC'}).total).toBe(0);
 expect(queryTable(entries,{...TABLE_DEFAULTS,q:'سابك'}).rows.map(e=>e.symbol)).toEqual(['2010','2020']);
 expect(queryTable(entries,parseTableQuery({q:1120})).rows.map(e=>e.symbol)).toEqual(['1120']);
});
test('share query roundtrip preserves combined filtering and sorting',()=>{
 const patch={...TABLE_DEFAULTS,board:'nomu' as const,sort:'name' as const,page:2};
 const restored=parseTableQuery(Object.fromEntries(new URLSearchParams(Object.entries(patch).map(([k,v])=>[k,String(v)]))));
 expect(queryTable(entries,restored)).toEqual(queryTable(entries,patch));
});
test('company breadcrumb currently exits frozen route boundary (regression evidence, not desired policy)',()=>{
 expect(readFileSync('src/components/web-v1/company-template.tsx','utf8')).toContain('to="/markets/saudi"');
 expect(readFileSync('src/routes/markets.saudi.tsx','utf8')).toContain('getCompanies()');
});
