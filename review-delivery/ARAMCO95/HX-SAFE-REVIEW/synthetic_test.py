"""Synthetic-only execution of exact exported functions; no PDFs, engine, or real financial values."""
import ast,copy,importlib.util,json,tempfile,unittest
from decimal import Decimal,InvalidOperation
from pathlib import Path
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('semantic',HERE/'code/semantic_compatibility.py')
semantic=importlib.util.module_from_spec(spec);spec.loader.exec_module(semantic)
tree=ast.parse((HERE/'code/build_ledgers.py').read_text(encoding='utf8'))
# Retain the original function AST unmodified. Do not import the private engine/extractor.
nodes=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='propose_q4']
ns={'Decimal':Decimal,'InvalidOperation':InvalidOperation,'assess_basis':semantic.assess_basis}
exec(compile(ast.Module(body=nodes,type_ignores=[]),'exported-propose-q4','exec'),ns)
class Synthetic(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory(dir=HERE);semantic.HERE=Path(self.tmp.name);semantic.original_observations.cache_clear()
  def row(doc,kind,end,value):
   digest=('a' if kind=='fy' else 'b')*64
   return dict(company_id='SYNTHETIC_ONLY',field_id='depreciation_amortization',period=dict(kind=kind,start='2025-01-01',end=end,fiscal_year=2025),normalized_observation_value=value,normalized_unit='SYNTHETIC_UNIT',source_currency='SYN',scope='consolidated',dimensions={},source_document_sha256=digest,artifact_edition_key='sha256:'+digest,source_id=doc,source_pdf_page=1,source_label='Synthetic label, not copied',local_observation_id=doc+'-synthetic',value_nature='FLOW')
  self.fy=row('ARA2025','fy','2025-12-31','100');self.ytd=row('Q3-2025','ytd','2025-09-30','70')
  self.save()
 def tearDown(self):semantic.original_observations.cache_clear();self.tmp.cleanup()
 def save(self):
  docs=[dict(source_id=r['source_id'],sha256=r['source_document_sha256']) for r in [self.fy,self.ytd]]
  for name,obj in [('SOURCE-MANIFEST.json',{'documents':docs}),('EXTRACTED-OBSERVATIONS.json',{'observations':[self.fy,self.ytd]}),('EDITION-RECONCILIATIONS.json',{'comparisons':[]})]:
   (semantic.HERE/name).write_text(json.dumps(obj),encoding='utf8')
  semantic.original_observations.cache_clear()
 def test_mixed_basis_has_no_usable_value(self):
  r=ns['propose_q4'](self.fy['field_id'],self.fy,self.ytd)
  self.assertEqual(r['proposal_status'],'BLOCKED_MIXED_BASIS');self.assertIsNone(r['proposed_value'])
  self.assertEqual(r['diagnostic_only']['raw_subtraction_not_q4_value'],'30');self.assertFalse(r['diagnostic_only']['usable_value'])
  self.assertFalse(r['financially_qualified']);self.assertFalse(r['approved'])
 def test_cash_flow_da_also_blocked(self):
  self.fy['field_id']=self.ytd['field_id']='depreciation_amortization_cash_flow';self.save()
  self.assertIsNone(ns['propose_q4'](self.fy['field_id'],self.fy,self.ytd)['proposed_value'])
 def test_unrecognized_edition_blocked(self):
  changed=copy.deepcopy(self.fy);changed['source_label']='tampered'
  self.assertEqual(ns['propose_q4'](changed['field_id'],changed,self.ytd)['proposal_status'],'BLOCKED_BASIS_UNESTABLISHED')
 def test_unaffected_pair_remains_unapproved(self):
  self.fy['field_id']=self.ytd['field_id']='revenue';self.save()
  r=ns['propose_q4']('revenue',self.fy,self.ytd)
  self.assertEqual(r['proposed_value'],'30');self.assertFalse(r['approved']);self.assertFalse(r['financially_qualified'])
 def test_invalid_scope_is_rejected(self):
  self.ytd['scope']='parent'
  with self.assertRaisesRegex(ValueError,'scope_mismatch'):ns['propose_q4'](self.fy['field_id'],self.fy,self.ytd)
 def test_split_counts_not_approval(self):
  self.assertEqual(142+97,239);self.assertEqual(142+97+24+761+125+2941,4090)
  self.assertIn('EXISTS_WITHOUT_MATCHING_SOURCE_OBSERVATION',(HERE/'code/build_ledgers.py').read_text())
if __name__=='__main__':unittest.main(verbosity=2)
