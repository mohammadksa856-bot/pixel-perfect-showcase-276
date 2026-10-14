import {test,expect,mock} from 'bun:test';
let frozen=true,mode='ok',requests=0;const eqs:any[]=[];
mock.module('@tanstack/react-start',()=>({createServerFn:()=>({validator(){return this},handler(fn:any){return(input:any={})=>fn({data:input.data??{}})}})}));
mock.module('../src/lib/web-v1/flag.functions',()=>({webV1PreviewEnabled:()=>true}));
mock.module('../src/lib/web-v1/design-review-policy',()=>({designReviewFixturesEnabled:()=>frozen}));
mock.module('../src/integrations/supabase/client',()=>({supabase:{from(table:string){requests++;return {select(){return this},eq(k:string,v:any){eqs.push([table,k,v]);return this},order(){return this},then(resolve:any,reject:any){if(mode==='network')return Promise.reject(Error('test-only connection refused')).then(resolve,reject);return Promise.resolve(mode==='http'?{data:null,error:{status:500,message:'synthetic HTTP500'}}:{data:[{slug:'synthetic',title:{ar:'اختبار'},sections:[]}],error:null}).then(resolve,reject)}}}}}));
const api=await import('../src/lib/web-v1/library.functions');
test('all four frozen endpoints return unavailable without even invoking Supabase',async()=>{
 frozen=true;requests=0;
 for(const fn of [api.getResearchIndex,api.getKnowledgeIndex,api.getResearchArticle,api.getKnowledgeArticle])expect((await fn({data:{slug:'synthetic'}} as any))?.state).toBe('unavailable');
 expect(requests).toBe(0);
});
test('nonfrozen library queries explicitly constrain published=true for both tables',async()=>{
 frozen=false;mode='ok';eqs.length=0;
 expect((await api.getResearchIndex())?.state).toBe('ok');expect((await api.getKnowledgeIndex())?.state).toBe('ok');
 expect(eqs).toEqual([['research','published',true],['knowledge_articles','published',true]]);
});
test('HTTP500 is error, not empty success or substitute content',async()=>{
 mode='http';expect((await api.getResearchIndex())?.state).toBe('error');expect((await api.getKnowledgeArticle({data:{slug:'synthetic'}}))?.state).toBe('error');
});
test('connection rejection is explicitly error, no fallback',async()=>{
 mode='network';expect((await api.getResearchArticle({data:{slug:'synthetic'}}))?.state).toBe('error');expect((await api.getKnowledgeIndex())?.state).toBe('error');
});
