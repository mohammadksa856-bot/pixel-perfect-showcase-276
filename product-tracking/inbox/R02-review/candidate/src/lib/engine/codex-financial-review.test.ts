import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unitConflict, verificationOf, consolidatedRow } from './view-model.ts';
test('wrong per-share currency is not a valid unit',()=>{
  assert.equal(unitConflict('basic_eps',{unit:'USD/share',currency:'SAR',statement:'per_share'} as any),true);
});
test('calculated output without lineage is not reported',()=>{
  assert.equal(verificationOf({is_calculated:1,provenance:{source:{source_url:'https://example.test/report'}}} as any),'calculated_not_recorded');
});
test('quarantined missing row cannot mask an eligible zero',()=>{
  const rows=[{value:null,quality_status:'quarantined',scope:'consolidated',dimensions:{}},{value:'0',scope:'consolidated',dimensions:{}}];
  assert.equal(consolidatedRow(rows as any)?.value,'0');
});
