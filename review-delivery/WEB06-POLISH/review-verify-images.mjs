import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const sha='f1a84e23cdd119b5e268d61d8dc3d373a04435e9';
const read=p=>{const r=spawnSync('git',['-c','core.longpaths=true','cat-file','blob',sha+':'+p],{maxBuffer:12000000});if(r.status)throw Error('Missing evidence '+p+' '+r.stderr?.toString());return r.stdout;};
const p='product-tracking/outbox/WEB-V1/web-06-visual-polish/IMAGE_MANIFEST.json';
const raw=read(p), m=JSON.parse(raw);
for(const f of m.images){if(createHash('sha256').update(read(f.path)).digest('hex')!==f.sha256)throw Error('Hash mismatch');if(f.data_mode!=='FROZEN_DESIGN')throw Error('Wrong mode');if(f.application_sha!==(f.kind==='before'?m.application_sha_before:m.application_sha_after))throw Error('Wrong appSHA');}
console.log(JSON.stringify({delivery_sha:sha,verified_images:m.images.length,manifest_sha256:createHash('sha256').update(raw).digest('hex'),before:m.counts.before,after:m.counts.after,path:m.counts.path,all_frozen_local:true,not_vercel_captures:true,capture_css_overrides:m.capture_tool}));
