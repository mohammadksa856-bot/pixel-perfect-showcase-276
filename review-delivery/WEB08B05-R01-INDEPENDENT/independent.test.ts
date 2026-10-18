import { expect, test } from 'bun:test';
import { buildExperience } from '../../research-evidence/aramco-research-experience/model';
import { renderPage } from '../../research-evidence/aramco-research-experience/server';
import { loadContext } from '../../research-evidence/aramco-research-pack/evidence';
import { compilePack } from '../../research-evidence/aramco-research-pack/pack';
import { readFileSync } from 'node:fs';

const x=buildExperience(), ctx=loadContext();
test('all 99 texts and resolved evidence unchanged from accepted B04',()=>{
 const original=compilePack(ctx); expect(x.pack.paragraphs).toEqual(original.paragraphs);
 expect(x.paragraphs.size).toBe(99);
});
test('each relationship is a project-specific reference, not a generic/composite claim',()=>{
 for(const edge of x.relations){
  const p=x.paragraphs.get(edge.paragraph)!;
  const project=x.projects.find(v=>v.id===edge.project)!;
  expect(edge.via.length).toBeGreaterThan(0);
  for(const via of edge.via){
   expect(project.identities).toContain(via);
   expect(p.refs.some(r=> `${r.ref.t}:${'id' in r.ref?r.ref.id:''}`===via)).toBe(true);
   if(via.startsWith('b03_claim:'))expect(x.projects.filter(v=>v.identities.includes(via))).toHaveLength(1);
  }
 }
});
test('all inputs individually remain WITHHELD, rather than trusting displayed count',()=>{
 const b02=JSON.parse(readFileSync(new URL('../WEB08B02/QUALIFIED-WITHHELD-INPUT-REGISTER-v4.json',import.meta.url),'utf8'));
 expect(b02.results).toHaveLength(142);
 for(const row of b02.results)expect(row.qualification.state).toBe('WITHHELD');
 expect(b02.qualified_for_research).toBe(0);
 expect(x.analyses.every(v=>v.status==='BLOCKED')).toBe(true);
 expect(ctx.register.claims.every(v=>v.qualification.status==='WITHHELD')).toBe(true);
});
for(const lang of ['ar','en'] as const){
 test(`${lang}: all fragments resolve and no remotely loaded executable/resource`,()=>{
  const h=renderPage(lang,'http://127.0.0.1:5179');
  const ids=new Set([...h.matchAll(/\bid="([^"]+)"/g)].map(v=>v[1]));
  for(const a of h.matchAll(/href="#([^"]+)"/g))expect(ids.has(a[1])).toBe(true);
  expect(h).not.toMatch(/<(script|iframe|form)\b|\son[a-z]+=|<[^>]+(?:src|action)="https?:/i);
  expect((h.match(/data-paragraph="/g)||[]).length).toBe(99);
  expect(x.groups.flatMap(v=>v.topics)).toHaveLength(18);
 });
 test(`${lang}: raw B03 quotes absent, including HTML-escaped variants`,()=>{
  const h=renderPage(lang,'http://127.0.0.1:5179');
  for(const p of x.pack.paragraphs)for(const r of p.refs){
   const q=r.text?.trim(); if(!q || q.length<70)continue;
   const needle=q.slice(0,70), escaped=needle.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
   expect(h.includes(needle)).toBe(false);expect(h.includes(escaped)).toBe(false);
  }
 });
}
