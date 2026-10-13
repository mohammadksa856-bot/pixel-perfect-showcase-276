import {expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {buildCompanyPreview,contractProblems,type EnginePage} from '../src/lib/engine/company-preview';
const root=process.env.DATA04_LOCAL_API_ARTIFACTS;
if(!root) throw new Error('Explicit BR011 current local API artifact directory required');
for(const symbol of ['1120','2082','2280','4190','7010']) test(`BR011 current guarded product ${symbol}`,()=>{
 const page:EnginePage=JSON.parse(readFileSync(join(root,`${symbol}-api.json`),'utf8'));
 expect(contractProblems(page)).toEqual([]);
 const preview=buildCompanyPreview(page);
 expect(preview.readiness.score).toBeNull();expect(preview.topics).toHaveLength(18);
 expect(preview.topics.every(t=>t.score===null)).toBe(true);
});
