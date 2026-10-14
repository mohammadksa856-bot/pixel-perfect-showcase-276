import {test,expect} from 'bun:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {I18nProvider} from '../src/lib/i18n';
import {ArticleSections,ReferencesList} from '../src/components/web-v1/library-parts';
import {normalizeResearch,parseBody,safeUrl,pick,queryResearch,RESEARCH_DEFAULTS} from '../src/lib/web-v1/library';
import {readFileSync,readdirSync} from 'node:fs';
const ssr=(el:any)=>renderToStaticMarkup(createElement(I18nProvider,null,el));
test('untrusted tags and attribute payloads remain escaped text in headings, cells and references',()=>{
 const r=normalizeResearch({slug:'synthetic',title:{ar:'test'},sections:[{heading:{ar:'<img src=x onerror=alert(1)>'},body:{ar:'| Item | Value |\n| <svg onload=alert(1)> | <script>alert(1)</script> |'}}],refs:['javascript:alert(1)','https://user:pw@example.com/']})!;
 const html=ssr(createElement(ArticleSections,{sections:r.sections}))+ssr(createElement(ReferencesList,{refs:r.references}));
 expect(html).not.toContain('<script>');expect(html).not.toContain('<img src=x');expect(html).not.toContain('<svg onload');expect(html).not.toContain('href="javascript:');expect(html).not.toContain('href="https://user:');expect(html).toContain('&lt;script&gt;');
});
test('external URL policy rejects unsafe protocols, encoded separators and credentials',()=>{
 for(const value of ['javascript:alert(1)','data:text/html,hello','file:///C:/secret','https://user@example.com','https://u:p@example.com','/companies/2222'])expect(safeUrl(value)).toBeNull();
 expect(safeUrl('https://example.com/research?a=1')).toBe('https://example.com/research?a=1');
});
test('one-language fields retain original text and explicit fallback, no invented metadata',()=>{
 const r=normalizeResearch({slug:'test',title:{en:'Synthetic EN only'},sections:[]})!;
 expect(pick(r.title,'ar')).toEqual({value:'Synthetic EN only',lang:'en',fallback:true});expect(r.author.ar).toBeNull();expect(r.readingTime).toBeNull();expect(r.publishedAt).toBeNull();expect(r.sectorSlug).toBeNull();
});
test('search/date-sort deterministic with undated records last and unsupported filters empty',()=>{
 const rows=[normalizeResearch({slug:'a',title:{ar:'اختبار'},published_at:'2026-01-01'}),normalizeResearch({slug:'b',title:{ar:'اختبار'}})] as any[];
 expect(queryResearch(rows,{...RESEARCH_DEFAULTS,sort:'oldest'}).map(r=>r.slug)).toEqual(['a','b']);expect(queryResearch(rows,{...RESEARCH_DEFAULTS,sector:'fake'})).toEqual([]);
});
test('production source graph has no imports of legacy seed or test-only mock',()=>{
 const walk=(p:string):string[]=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):/\.[jt]sx?$/.test(e.name)?[p+'/'+e.name]:[]);
 for(const file of walk('src'))expect(readFileSync(file,'utf8')).not.toMatch(/(?:from\s*|import\s*\()\s*["'][^"']*(?:data\/content|web_05c_mock_supabase)/);
});
test('positive wide table preserves every source numeric cell without reformatting',()=>{
 const b=parseBody('| Item | 2024 | 2025 | Unit | Currency |\n| Revenue | 1,234.56 | (789.10) | million | SAR |')[0];
 expect(b).toEqual({type:'table',header:['Item','2024','2025','Unit','Currency'],rows:[['Revenue','1,234.56','(789.10)','million','SAR']]});
});
