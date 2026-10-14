import {test,expect} from 'bun:test';
import {parseBody,normalizeResearch} from '../src/lib/web-v1/library';
test('malformed financial table must not silently discard an extra numeric cell',()=>{
 const raw='| Metric | FY2025 |\n| Revenue | 100 | 999999 |';
 const blocks=parseBody(raw) as unknown as Record<string,unknown>[];
 const rendered=JSON.stringify(blocks);
 // Preserve as original text OR surface an explicit rejected/unparsed block.
 // Do not require assigning999999 to any financial period or invented column.
 const explicitlyRejected=blocks.some(b=>['error','unparsed','rejected'].includes(String(b.type))||typeof b.warning==='string');
 expect(rendered.includes('999999')||explicitlyRejected).toBe(true);
});
test('impossible publication dates must stay absent, never presented as valid date',()=>{
 const r=normalizeResearch({slug:'synthetic-invalid-date',title:{ar:'اختبار'},published_at:'2026-02-31T00:00:00Z'})!;
 expect(r.publishedAt).toBeNull();
});
