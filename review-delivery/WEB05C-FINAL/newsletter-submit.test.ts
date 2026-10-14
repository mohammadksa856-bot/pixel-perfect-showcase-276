import {test,expect,mock} from 'bun:test';
mock.module('../src/lib/i18n',()=>({ui:{markets:{ar:'m',en:'m'},sectors:{ar:'s',en:'s'},companies:{ar:'c',en:'c'},research:{ar:'r',en:'r'},knowledge:{ar:'k',en:'k'},community:{ar:'co',en:'co'},subscribe:{ar:'subscribe',en:'subscribe'}},useI18n:()=>({t:(x:any)=>x.en})}));
const {PreviewFooter}=await import('../src/components/web-v1/preview-footer');
function walk(x:any):any[]{if(!x||typeof x!=='object')return [];return[x,...(Array.isArray(x.props?.children)?x.props.children:[x.props?.children]).flatMap(walk)]}
test('forced submit handler prevents default and emits zero requests; controls stay disabled',()=>{
 const els=walk(PreviewFooter());const form=els.find(e=>e.type==='form');let prevented=0,requests=0;
 const old=globalThis.fetch;globalThis.fetch=(async()=>{requests++;throw Error('unexpected request')}) as any;
 try{form.props.onSubmit({preventDefault(){prevented++}});expect(prevented).toBe(1);expect(requests).toBe(0);expect(walk(form).find(e=>e.type==='input').props.disabled).toBe(true);expect(walk(form).find(e=>e.type==='button').props.disabled).toBe(true)}finally{globalThis.fetch=old;}
});
