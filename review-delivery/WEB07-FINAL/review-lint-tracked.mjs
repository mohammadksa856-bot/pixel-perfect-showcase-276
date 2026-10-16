import {ESLint} from 'eslint';
import {execFileSync} from 'node:child_process';
const sha=process.argv[2]||'6eab69721aafdfab21051999ec7445cdc95535b9';
const lint=new ESLint({cwd:process.cwd()});
const files=execFileSync('git',['ls-tree','-r','--name-only',sha],{encoding:'utf8'}).trim().split('\n').filter(f=>/\.(?:[cm]?js|tsx?)$/.test(f)&&!f.startsWith('dist/')&&!f.startsWith('.output/')&&!f.startsWith('.vinxi/'));
let out=[];
for(const file of files){
 if(await lint.isPathIgnored(file))continue;
 const text=execFileSync('git',['cat-file','blob',sha+':'+file],{encoding:'utf8',maxBuffer:20*1024*1024});
 const results=await lint.lintText(text,{filePath:file});
 for(const r of results)if(r.errorCount||r.warningCount)out.push({file,errorCount:r.errorCount,warningCount:r.warningCount,messages:r.messages.map(m=>({line:m.line,ruleId:m.ruleId,severity:m.severity,message:m.message}))});
}
const summary={application_sha:sha,mode:'All tracked lintable Git blobs from exact SHA; unchanged ESLint rules; LF source avoids worktree CRLF; excludes reviewer overlay',filesConsidered:files.length,errors:out.reduce((n,r)=>n+r.errorCount,0),warnings:out.reduce((n,r)=>n+r.warningCount,0),files:out};
console.log(JSON.stringify({...summary,files:out.map(({messages,...r})=>({...r,rules:[...new Set(messages.map(m=>m.ruleId))]}))}));
process.exitCode=summary.errors?1:0;
