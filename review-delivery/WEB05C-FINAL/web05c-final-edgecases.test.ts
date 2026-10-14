import {test,expect} from 'bun:test';
import {parseBody,dateOf,normalizeResearch,queryResearch,RESEARCH_DEFAULTS} from '../src/lib/web-v1/library';
test('long and short rows preserve exact raw source rather than cut or pad',()=>{
 for(const raw of ['| Item | FY |\n| Long | 100 | 999 |','| Item | FY |\n| Short |','| Item | FY |\n|---|---|---|\n| x | 1 |']){
  const b=parseBody(raw)[0];expect(b.type).toBe('table_mismatch');expect((b as any).text).toBe(raw);
 }
});
test('original empty cells remain genuine cells; signs and arabic digits unchanged',()=>{
 expect(parseBody('| Item | A | B |\n| x | | (١٢٫٥) |')[0]).toEqual({type:'table',header:['Item','A','B'],rows:[['x','','(١٢٫٥)']]});
 expect(parseBody('| Item | A | B |\n| x | -3.4% | +7 |')[0]).toEqual({type:'table',header:['Item','A','B'],rows:[['x','-3.4%','+7']]});
});
test('Gregorian leap and century rules; absence distinct from invalid',()=>{
 for(const x of ['2026-02-31','2025-02-29','1900-02-29','2026-04-31','2026-13-01','2026-01-00'])expect(dateOf(x)).toEqual({value:null,status:'invalid'});
 for(const x of [null,undefined,''])expect(dateOf(x)).toEqual({value:null,status:'missing'});
 for(const x of ['2024-02-29','2000-02-29','2026-01-31T12:30:00Z','2026-01-31 12:30:00+03:00'])expect(dateOf(x).status).toBe('valid');
});
test('invalid and missing publication dates remain last in either sort',()=>{
 const rows=[['invalid','2026-02-31'],['missing',null],['old','2024-02-29'],['new','2026-01-31']].map(([slug,published_at])=>normalizeResearch({slug,title:{en:slug},published_at})!);
 expect(queryResearch(rows,{...RESEARCH_DEFAULTS,sort:'newest'}).slice(0,2).map(r=>r.slug)).toEqual(['new','old']);
 expect(queryResearch(rows,{...RESEARCH_DEFAULTS,sort:'oldest'}).slice(0,2).map(r=>r.slug)).toEqual(['old','new']);
 expect(rows[0].publishedAt).toBeNull();expect(rows[0].dateStatus).toBe('invalid');expect(rows[1].dateStatus).toBe('missing');
});
