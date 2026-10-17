import {writeFileSync,readFileSync} from 'node:fs';
import {loadContext,resolveRef} from '../../research-evidence/aramco-research-pack/evidence';
import {compilePack} from '../../research-evidence/aramco-research-pack/pack';
const out=new URL('./',import.meta.url), ctx=loadContext(), pack=compilePack(ctx);
writeFileSync(new URL('COMPILED-IDENTITIES.json',out),JSON.stringify({counts:pack.counts,paragraphs:pack.paragraphs.map(p=>({id:p.id,kind:p.kind,refs:p.refs.map(({text,...identity})=>identity)})),analyses:pack.analyses},null,2)+'\n');
const links=JSON.parse(readFileSync(new URL('../WEB08B04/MAREFA-DATA-LINKS.json',import.meta.url),'utf8')).metrics;
const results=[];
for(const link of links){
 const u=new URL(link.intelligence,'http://127.0.0.1:5173');const r=await fetch(u);const html=await r.text();
 const topic=u.searchParams.get('topic');
 const stack:string[]=[];let targetInTopic=false;
 for(const tag of html.matchAll(/<\/?[a-zA-Z][^>]*>/g)){
  const s=tag[0];if(/^<\/section\b/.test(s)){stack.pop();continue;}
  if(/^<section\b/.test(s))stack.push(s.match(/data-topic="([^"]+)"/)?.[1]??stack.at(-1)??'');
  if(stack.at(-1)===topic && new RegExp('data-(?:metric|row|fact)="'+link.key+'"').test(s))targetInTopic=true;
 }
 const data=await fetch(new URL(link.data,'http://127.0.0.1:5173'));
 results.push({key:link.key,topic,intelligence:link.intelligence,data:link.data,http:r.status,dataHttp:data.status,targetInTopic,metricMarkerSomewhere:new RegExp('data-(?:metric|row|fact)="'+link.key+'"').test(html),qualification:'NOT_QUALIFIED_BY_HTTP_SUCCESS'});
}
writeFileSync(new URL('LINK-AUDIT.json',out),JSON.stringify({sha:'c0c506f68bb72e528136e6b09ec58845b319db8a',count:results.length,scope:'All intelligence URLs fetched; SSR presence is not visible focus acceptance. Browser samples separately.',results},null,2)+'\n');
const metadata=[];
for(const [bucket,map] of Object.entries(ctx.buckets))for(const [key,rows] of map){if(rows.length<2)continue;const sources=[...new Set(rows.map(r=>r.source_url))];const units=[...new Set(rows.map(r=>r.unit))];if(sources.length>1||units.length>1)metadata.push({bucket,key,rows:rows.length,sources: sources.length,units,resolved:resolveRef({t:'engine_metric',key,bucket:bucket as any},ctx)});}
writeFileSync(new URL('MULTIROW-AUDIT.json',out),JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify({links:results.length,http200:results.filter(r=>r.http===200).length,data200:results.filter(r=>r.dataHttp===200).length,targetInTopic:results.filter(r=>r.targetInTopic).length,markerAnywhere:results.filter(r=>r.metricMarkerSomewhere).length,multirow:metadata.length}));
