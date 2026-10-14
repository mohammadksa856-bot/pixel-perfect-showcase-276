import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const files=['.gitattributes','cases.test.ts','policy.test.ts','POLICY.json','INSTRUCTIONS.json','LATEST_REVIEW.json','V2_RESULT_073c711.json','manifest.mjs'];
const hashes=Object.fromEntries(files.map(n=>[n,createHash('sha256').update(readFileSync(new URL(n,import.meta.url))).digest('hex')]));
writeFileSync(new URL('MANIFEST.json',import.meta.url),JSON.stringify({package:'WEB03-SYNTHETIC/2',historical_package_unchanged:true,content_scope:'Synthetic code-only; no issuer documents or financial data',files:hashes},null,2)+'\n');
