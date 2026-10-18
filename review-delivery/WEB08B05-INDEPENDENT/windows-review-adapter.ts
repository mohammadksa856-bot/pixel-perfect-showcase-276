/**
 * REVIEW INSTRUMENTATION ONLY. Does not edit author files or claim a Windows fix.
 * Allows UI/security observation beyond the known assets.ts URL.pathname blocker.
 * One in-memory replacement: CSS compiler base converts file URL to native Windows path.
 */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
export function installReviewPathAdapter(){
 if(process.platform!=="win32")throw Error("Review adapter is Windows-only; use original server on POSIX");
 return Bun.plugin({name:"independent-review-css-base-path-only",setup(builder){
  builder.onLoad({filter:/[\\/]aramco-research-experience[\\/]assets\.ts$/},args=>{
   const original=readFileSync(args.path,"utf8");
   const needle='base: new URL("src/", ROOT).pathname,';
   if(original.split(needle).length!==2)throw Error("review_adapter_source_mismatch");
   const transformed='import {fileURLToPath} from "node:url";\n'+original.replace(needle,'base: fileURLToPath(new URL("src/", ROOT)),');
   console.log(JSON.stringify({mode:"INSTRUMENTED_WINDOWS_COMPATIBILITY_ONLY_NOT_ORIGINAL_SERVER_ACCEPTANCE",source:"research-evidence/aramco-research-experience/assets.ts",sourceSha256:createHash("sha256").update(original).digest("hex"),replacementCount:1,onlyChange:"CSS compiler base URL.pathname -> native fileURLToPath; author files unchanged"}));
   return {contents:transformed,loader:"ts"};
  });
 }});
}
