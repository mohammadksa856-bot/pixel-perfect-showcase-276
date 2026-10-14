import {test,expect} from 'bun:test';
import {readFileSync} from 'node:fs';
test('frozen company breadcrumb must remain inside Preview market boundary',()=>{
 const source=readFileSync('src/components/web-v1/company-template.tsx','utf8');
 expect(source).not.toContain('to="/markets/saudi"');
 expect(source).toContain('to="/preview/web-v1/markets/saudi"');
});
