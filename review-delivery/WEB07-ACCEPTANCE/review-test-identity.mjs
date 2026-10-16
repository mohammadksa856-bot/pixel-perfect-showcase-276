import ts from 'typescript';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import prettier from 'prettier';
const printer=ts.createPrinter({removeComments:true,newLine:ts.NewLineKind.LineFeed});
function canonical(text){const ast=ts.createSourceFile('case.ts',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);return printer.printFile(ast);}
const pairs=[['original','6eab69721aafdfab21051999ec7445cdc95535b9:tests/web07-independent-provenance.test.ts','tests/web07-independent-provenance.test.ts'],['extended','68341602b620b3e87695be9f1af34f33d6644989:tests/web07-final-independent-period.test.ts','tests/web07-final-independent-period.test.ts']];
for(const [id,ref,file] of pairs){const old=execFileSync('git',['show',ref],{encoding:'utf8'});const current=readFileSync(file,'utf8');const same=(await prettier.format(old,{parser:'typescript'}))===(await prettier.format(current,{parser:'typescript'}));console.log(JSON.stringify({id,reference:ref,current:file,typescriptPrinterTextIdentical:canonical(old)===canonical(current),sameAfterIdenticalPrettierFormatting:same,assertionsFixturesAndLogicPreserved:same}));if(!same)process.exitCode=1;}
