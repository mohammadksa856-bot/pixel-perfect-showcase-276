import { expect,test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCompanyPreview,contractProblems,type EnginePage } from '../src/lib/engine/company-preview';
const root=process.env.DATA03_LOCAL_API_ARTIFACTS;
if (!root) throw new Error('Explicit current local engine response directory required');
for (const symbol of ['4030','3020','1211','7203','1214']) test(`BR010 current engine ${symbol}: guarded local product mapping`,()=>{
 const page:EnginePage=JSON.parse(readFileSync(join(root,`${symbol}-api.json`),'utf8'));
 expect(contractProblems(page)).toEqual([]);
 const preview=buildCompanyPreview(page);expect(preview.readiness.score).toBeNull();expect(preview.topics).toHaveLength(18);
 if(symbol!=='1214') expect(preview.topics.flatMap(t=>t.blocks.flatMap(b=>b.type==='facts'?b.facts:[])).some(f=>f.key==='legal_name')).toBe(true);
 expect(preview.topics.every(t=>t.score===null)).toBe(true);
});
