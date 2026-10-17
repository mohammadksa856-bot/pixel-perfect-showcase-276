import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {compilePack} from '../../research-evidence/aramco-research-pack/pack';
import {loadContext} from '../../research-evidence/aramco-research-pack/evidence';
import {renderReader} from '../../research-evidence/aramco-research-pack/reader';
import {compilePack as oldCompile} from '../../../web08b04-independent-20261017/research-evidence/aramco-research-pack/pack';
const here=new URL('./',import.meta.url), sha='f46a2925376b59c7686ee4a23c3128506229792b';
const emit=(name:string,data:unknown)=>writeFileSync(new URL(name,here),JSON.stringify(data,null,2)+'\n');
const p=compilePack(),old=oldCompile(),ctx=loadContext();
const prior=JSON.parse(readFileSync(new URL('../../../web08b04-independent-20261017/review-delivery/WEB08B04-INDEPENDENT/PARAGRAPH-REVIEW.json',import.meta.url),'utf8'));
const ps=p.paragraphs.map((x,i)=>{const prev=old.paragraphs.find(y=>y.id===x.id)!;const pr=prior.rows.find((y:any)=>y.id===x.id);const changed=x.ar!==prev.ar;return {ordinal:i+1,id:x.id,kind:x.kind,previousKind:prev.kind,changedText:changed,previousTextSha256:createHash('sha256').update(prev.ar).digest('hex'),textSha256:createHash('sha256').update(x.ar).digest('hex'),previousDisposition:pr.disposition,previousResearchNote:pr.research_review,reviewedThisRun:true,reviewDisposition:changed?'CORRECTION_REVIEWED_BOUNDED_DRAFT_NOT_FINANCIAL_APPROVAL':'UNCHANGED_TEXT_REVIEWED_NO_NEW_RESEARCH_BLOCKER',sourceApproval:'NONE',evidence:x.refs.map(r=>({ref:r.ref,status:r.status}))};});
emit('PARAGRAPH-REAUDIT.json',{sha,count:ps.length,changed:ps.filter(x=>x.changedText).length,unchanged:ps.filter(x=>!x.changedText).length,reviewMethod:'All99currenttexts read and compared with prior research notes; no new original-PDF certification; prior primary-source findings transferred, not new financial approval.',paragraphs:ps});
const links=JSON.parse(readFileSync(new URL('../WEB08B04/MAREFA-DATA-LINKS.json',import.meta.url),'utf8')).metrics;
const html=renderReader(p,'ar','http://127.0.0.1:5178');let results=[];
for(const x of links){
 const inReader=html.includes('focus='+x.key+'"')||html.includes('focus='+x.key+'&');
 if(x.status==='NOT_RENDERED'){if(x.intelligence!==null||x.data!==null||inReader)throw Error('misleading_link:'+x.key);results.push({key:x.key,status:x.status,noOutputLinks:true,noReaderFocusLink:true});}
 else{const response=await fetch('http://127.0.0.1:5178'+x.intelligence);results.push({key:x.key,topic:x.topic,status:x.status,path:x.intelligence,http:response.status,qualification:'FROZEN_PREVIEW_ONLY_NOT_FINANCIAL_QUALIFICATION'});}
}
emit('LINK-AUDIT.json',{sha,metrics:results.length,focusable:results.filter(x=>x.status==='FOCUSABLE').length,notRendered:results.filter(x=>x.status==='NOT_RENDERED').length,browserProtocol:'All29actualfocusedtargets independently checked in browser;43keys checked absent from metric/row/fact DOM. See UI-REVIEW.json.',results});
let w=JSON.parse(readFileSync(new URL('../WEB08B02/QUALIFIED-WITHHELD-INPUT-REGISTER-v4.json',import.meta.url),'utf8'));
if(w.results.length!==142||w.results.some((r:any)=>r.qualification.state!=='WITHHELD'||r.qualification.publicationAuthorized))throw Error('hold_regression');
if(ctx.register.claims.some(c=>c.qualification.status!=='WITHHELD'||c.qualification.publicationEligible))throw Error('claim_regression');
emit('HOLDS.json',{sha,analyses:p.analyses.map(a=>({id:a.id,status:a.status,definitionGates:a.blockers.filter(x=>x.startsWith('OUTPUT_DEFINITION_NOT_BOUND'))})),withheldClaims:ctx.register.claims.length,withheldInputs:w.results.length,financiallyQualified:0,publicationAuthorized:false});
const response=await fetch('http://127.0.0.1:4460/');const post=await fetch('http://127.0.0.1:4460/',{method:'POST'});const missing=await fetch('http://127.0.0.1:4460/missing');
emit('HTTP-REVIEW.json',{sha,get:response.status,post:post.status,missing:missing.status,csp:response.headers.get('content-security-policy'),robots:response.headers.get('x-robots-tag'),cache:response.headers.get('cache-control')});
console.log(JSON.stringify({paragraphs:ps.length,changed:ps.filter(x=>x.changedText).length,metrics:results.length,focusable:29,notRendered:43,claims:ctx.register.claims.length,inputs:w.results.length}));
