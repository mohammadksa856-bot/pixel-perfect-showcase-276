import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const {bridgeEngineEvidence,BridgeInputSchema}=await import(resolve(process.argv[2],'research-evidence/engine-bridge/bridge.ts'));
const payload=JSON.parse(readFileSync(resolve(process.argv[3],'bridge-attempt-inputs.json'),'utf8'));
const now=new Date().toISOString();
const rows=payload.rows.map((r:any)=>{
 const input={schema:'engine-research-bridge/1',context:{...payload.context,asOf:now,evaluatedAt:now},exportedAt:now,rows:r.rows,sourceWithdrawals:[]};
 const v=bridgeEngineEvidence(input);const s=BridgeInputSchema.safeParse(input);
 if(v.state!=='BLOCKED'||v.context!==null||v.publicationAuthorized||s.success)throw Error('Unexpected qualification');
 return {audit_row:r.audit_row,state:v.state,issues:v.issues,missing_watermark:s.error.issues.some((i:any)=>i.path.join('.')==='knowledgeCompleteThrough')};
});
if(rows.length!==142||new Set(rows.map((r:any)=>r.audit_row)).size!==142||rows.some((r:any)=>!r.missing_watermark))throw Error('Coverage failure');
console.log(JSON.stringify({attempts:142,blocked:142,mapped:0,rows},null,2));
