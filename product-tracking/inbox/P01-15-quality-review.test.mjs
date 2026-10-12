// Review challenges against unchanged P01-15; not an independent financial audit.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildPeerTable} from '../../src/lib/engine/peer-comparison.ts';
const fixture=JSON.parse(readFileSync(new URL('../../tests/fixtures/engine-b70254e_peers_SA-1120_banks.json',import.meta.url),'utf8'));
const target=response=>response.companies.find(row=>row.is_target);
test('quarantined target ratio must not create an eligible comparison column',()=>{
  const response=structuredClone(fixture);
  target(response).metrics.return_on_equity.quality_status='quarantined';
  assert.equal(buildPeerTable(response,'bank').columns.some(column=>column.metric==='return_on_equity'),false);
});
test('non-HTTP source URL must not become a comparison source link',()=>{
  const response=structuredClone(fixture);
  target(response).metrics.return_on_equity.provenance.source.source_url='javascript:alert(1)';
  assert.equal(buildPeerTable(response,'bank').columns.some(column=>column.metric==='return_on_equity'),false);
});
