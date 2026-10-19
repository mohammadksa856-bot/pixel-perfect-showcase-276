"""Preparer tests: source cells, complete periods, accounting identities and proposal rejection."""
from copy import deepcopy
from collections import defaultdict
from decimal import Decimal
import hashlib
import json
import unittest
import sqlite3
from pypdf import PdfReader
import pdfplumber
from extract_history import HERE, ENGINE, PLANS, source_definitions, period, table_rows, decimal
from build_ledgers import propose_q4, identity, CLASSES

EX=json.loads((HERE/'EXTRACTED-OBSERVATIONS.json').read_text(encoding='utf8'))
FACTS=EX['observations'];BYID={r['local_observation_id']:r for r in FACTS}
ANNUAL=json.loads((HERE/'ANNUAL-PERIOD-LEDGER.json').read_text(encoding='utf8'))
QUARTER=json.loads((HERE/'QUARTERLY-PERIOD-LEDGER.json').read_text(encoding='utf8'))
MATRIX=json.loads((HERE/'INTAKE-MATRIX.json').read_text(encoding='utf8'))
REV=json.loads((HERE/'EDITION-RECONCILIATIONS.json').read_text(encoding='utf8'))
G=defaultdict(dict)
for r in FACTS:
    key=(r['source_id'],r['period']['kind'],r['period']['start'],r['period']['end'])
    G[key][r['field_id']]=r


class SourceTests(unittest.TestCase):
    def test_original_hashes(self):
        for key,d in source_definitions().items():
            with self.subTest(document=key):self.assertEqual(hashlib.sha256(d['path'].read_bytes()).hexdigest(),d['sha256'])

    def test_source_cells_second_extractor_presence(self):
        docs=source_definitions();cache={}
        for r in FACTS:
            key=(r['source_id'],r['source_pdf_page'])
            if key not in cache:
                text=PdfReader(docs[key[0]]['path']).pages[key[1]-1].extract_text()
                # pypdf occasionally splits digits in fonts; compare comma/space-free numeric lexemes.
                cache[key]=''.join(text.split()).replace(',','')
            value=r['original_value']
            token=value.lstrip('-')
            self.assertIn(token,cache[key],key)

    def test_row_column_reextract_exact_bbox(self):
        docs=source_definitions()
        cache={}
        for key,(_,q,pages) in PLANS.items():
            with pdfplumber.open(docs[key]['path']) as doc:
                for statement,pg in zip(['income_statement','balance_sheet','cash_flow'],pages):
                    count=4 if statement=='balance_sheet' or q in [None,1] else 8
                    rows,_=table_rows(doc.pages[pg-1],statement,count,key,pg)
                    cache[key,pg]=rows
        for r in FACTS:
            cells=[row['cells'].get(r['source_column_index_zero_based']) for row in cache[r['source_id'],r['source_pdf_page']]]
            matches=[c for c in cells if c and c['bbox']==r['cell_bbox_points']]
            self.assertEqual(len(matches),1)
            self.assertEqual(matches[0]['value'],r['original_value'])

    def test_periods_five_and_twelve_contiguous(self):
        self.assertEqual([r['fiscal_year'] for r in ANNUAL['periods']],list(range(2021,2026)))
        ordinals=[r['fiscal_year']*4+r['fiscal_quarter'] for r in QUARTER['periods']]
        self.assertEqual(len(ordinals),12)
        self.assertTrue(all(b-a==1 for a,b in zip(ordinals,ordinals[1:])))

    def test_required_fields_complete_inventory_not_gate_pass(self):
        self.assertEqual(len(ANNUAL['periods']),5)
        for r in ANNUAL['periods']:
            self.assertEqual(r['required_fields_total'],18)
            self.assertEqual(r['required_fields_with_direct_observations'],17)
            self.assertEqual(r['financially_qualified'],0)
        for r in QUARTER['periods']:
            self.assertEqual(r['required_fields_with_direct_observations'],7 if r['fiscal_quarter']==4 else 17)
            self.assertFalse(r['qualified'])

    def test_cash_vs_cash_end_and_prefchem(self):
        r=G['H1-Q2-2026','instant',None,'2026-06-30']['cash'];self.assertEqual(r['original_value'],'167387')
        cf=G['H1-Q2-2026','ytd','2026-01-01','2026-06-30']['cash_end'];self.assertEqual(cf['original_value'],'170853')
        self.assertEqual(Decimal(cf['original_value'])-Decimal(r['original_value']),3466)
        self.assertNotEqual(r['field_id'],cf['field_id'])

    def test_group_parent_income_and_equity_separate(self):
        for rows in G.values():
            if all(k in rows for k in ['net_income','net_income_parent','net_income_noncontrolling']):
                self.assertEqual(Decimal(rows['net_income']['original_value']),Decimal(rows['net_income_parent']['original_value'])+Decimal(rows['net_income_noncontrolling']['original_value']))
            if all(k in rows for k in ['total_equity','equity_parent','noncontrolling_interests']):
                self.assertEqual(Decimal(rows['total_equity']['original_value']),Decimal(rows['equity_parent']['original_value'])+Decimal(rows['noncontrolling_interests']['original_value']))

    def test_assets_liabilities_subtotals(self):
        for rows in G.values():
            for total,parts in [('total_assets',['current_assets','noncurrent_assets']),('total_liabilities',['current_liabilities','noncurrent_liabilities']),('total_assets',['total_liabilities','total_equity'])]:
                if all(k in rows for k in [total]+parts):
                    self.assertEqual(Decimal(rows[total]['original_value']),sum(Decimal(rows[k]['original_value']) for k in parts))

    def test_income_identities(self):
        for rows in G.values():
            for total,parts in [('revenue_and_other_income_related_to_sales',['revenue','other_income_related_to_sales']),('operating_income',['revenue_and_other_income_related_to_sales','operating_costs']),('net_income',['income_before_income_taxes_and_zakat','income_taxes_and_zakat'])]:
                if all(k in rows for k in [total]+parts):
                    self.assertEqual(Decimal(rows[total]['original_value']),sum(Decimal(rows[k]['original_value']) for k in parts))

    def test_cash_flow_bridge_without_balance_substitution(self):
        for key,rows in G.items():
            names=['operating_cash_flow','investing_cash_flow','financing_cash_flow','cash_beginning','cash_end']
            if all(k in rows for k in names):
                self.assertEqual(Decimal(rows['cash_end']['original_value'])-Decimal(rows['cash_beginning']['original_value']),sum(Decimal(rows[k]['original_value']) for k in names[:3]),key)

    def test_original_vs_later_editions_are_not_silently_merged(self):
        differences=[r for r in REV['comparisons'] if r['status'].startswith('VALUES_DIFFER')]
        self.assertGreaterEqual(len(differences),11)
        self.assertTrue(any(r['field_id']=='basic_eps' and r['end']=='2021-12-31' for r in differences))
        self.assertTrue(any(r['field_id']=='depreciation_amortization' and r['end']=='2024-12-31' for r in differences))
        self.assertTrue(all(r['preferred_edition_policy']=='UNDECIDED_NO_AUTOMATIC_REPLACEMENT' for r in differences))

    def test_no_qualified_derivatives_or_gates(self):
        for e in MATRIX['entries']:
            if 'proposal' in e:
                self.assertFalse(e['proposal']['approved'])
                self.assertFalse(e['proposal']['financially_qualified'])
            self.assertFalse(e['publication_authorized'])
        self.assertEqual(MATRIX['holds'],[7,22,142,0])
        self.assertIsNone(MATRIX['score_after'])
        self.assertEqual(MATRIX['actual_new_engine_rows'],0)

    def test_engine_class_counts_and_dedup(self):
        self.assertEqual(sum(MATRIX['unique_classification_counts'].values()),MATRIX['unique_field_period_identities'])
        self.assertEqual(MATRIX['presentation_slots']-MATRIX['duplicate_instant_slots_removed'],MATRIX['unique_field_period_identities'])
        keys=[identity(e['field_id'],e['period']) for e in MATRIX['entries']]
        self.assertEqual(len(keys),len(set(keys)))
        self.assertEqual(MATRIX['engine_present_unique_field_period_cells']+MATRIX['engine_absent_unique_field_period_cells'],len(keys))

    def test_no_synthetic_fact_ids_or_approvals(self):
        self.assertTrue(all(r['local_id_not_engine_fact_or_review_receipt'] and r['approval'] is None and r['financial_status']=='WITHHELD' for r in FACTS))
        self.assertTrue(all(r['source_document_version_id'] is None and r['artifact_edition_key']=='sha256:'+r['source_document_sha256'] for r in FACTS))

    def test_eps_not_millions_and_sign_preserved(self):
        for r in FACTS:
            expected=Decimal(r['original_value'])*(1 if r['field_id']=='basic_eps' else 1000000)
            self.assertEqual(Decimal(r['normalized_observation_value']),expected)
        self.assertTrue(all(Decimal(r['original_value'])<0 for r in FACTS if r['field_id']=='capex'))

    def test_actual_engine_reference_rows_read_only(self):
        register=json.loads((HERE/'ENGINE-REFERENCE-REGISTER.json').read_text(encoding='utf8'))
        path=ENGINE/'data/financial.sqlite3';before=hashlib.sha256(path.read_bytes()).hexdigest()
        db=sqlite3.connect(path.as_uri()+'?mode=ro&immutable=1',uri=True);db.row_factory=sqlite3.Row
        for r in register['rows']:
            actual=dict(db.execute('SELECT * FROM data_points WHERE id=?',(r['id'],)).fetchone())
            self.assertTrue(all(actual[k]==v for k,v in r.items()))
        db.close();self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),before)
        self.assertEqual(register['database_sha256'],before)

    def test_catalog_contract_byte_unchanged(self):
        scope=json.loads((HERE/'CONTRACT-FIELD-SCOPE.json').read_text(encoding='utf8'))
        self.assertEqual(scope['contract_sha256'],hashlib.sha256((ENGINE/'config/factory/18-category-contract.json').read_bytes()).hexdigest())
        self.assertEqual(scope['catalog_sha256'],hashlib.sha256((ENGINE/'src/finengine/catalog.py').read_bytes()).hexdigest())
        self.assertEqual(len(MATRIX['categories']),18)

    def test_duplicate_labels_do_not_merge_asset_liability_or_cash_reversal(self):
        f=G['FY2024-FS','instant',None,'2024-12-31']
        self.assertEqual(f['employee_benefits_asset']['original_value'],'27365')
        self.assertEqual(f['employee_benefits_noncurrent']['original_value'],'26866')
        received=G['FY2021-FS','fy','2021-01-01','2021-12-31']['dividends_from_investments']
        self.assertEqual(received['original_value'],'369')
        self.assertGreater(received['cell_bbox_points'][1],400)

    def test_q4_opening_uses_q3_closing_not_annual_opening(self):
        for q in QUARTER['periods']:
            if q['fiscal_quarter']!=4:continue
            entry=next(e for e in q['entries'] if e['field_id']=='cash_beginning')
            ids=entry['proposal']['input_observation_ids'];self.assertEqual(len(ids),1)
            source=BYID[ids[0]]
            self.assertEqual(source['field_id'],'cash_end')
            self.assertEqual(source['period']['end'],f"{q['fiscal_year']}-09-30")
            self.assertIsNone(entry['proposal']['proposed_value'])

    def test_ambiguous_combined_rows_not_canonicalized_by_guessing(self):
        r=json.loads((HERE/'UNMAPPED-SOURCE-ROWS.json').read_text(encoding='utf8'))
        self.assertGreater(len(r['rows']),0)
        self.assertTrue(all(x['field_id'] is None for x in r['rows']))
        self.assertNotIn('joint_venture_investments',{x['field_id'] for x in FACTS})

    def test_unicode_layout_artifact_not_globally_removed(self):
        self.assertIsNone(decimal('2,471,450\u2011'))
        self.assertIsNone(decimal('123\u200b'))
        allow=[r for r in FACTS if r['cell_numeric_normalization']!='NONE']
        self.assertTrue(all((r['source_id'],r['source_pdf_page']) in [('H1-2025',30),('Q3-2025',29)] for r in allow))


class ProposalTests(unittest.TestCase):
    def inputs(self):
        fy=next(r for r in FACTS if r['source_id']=='FY2024-FS' and r['field_id']=='revenue' and r['period']['fiscal_year']==2024)
        ytd=next(r for r in FACTS if r['source_id']=='Q3-2024' and r['field_id']=='revenue' and r['period']['kind']=='ytd' and r['period']['fiscal_year']==2024)
        return deepcopy(fy),deepcopy(ytd)

    def test_exact_proposal_not_approval(self):
        a,b=self.inputs();r=propose_q4('revenue',a,b)
        self.assertEqual(r['proposed_value'],'392923000000')
        self.assertFalse(r['approved'])

    def test_mixed_metric_rejected(self):
        a,b=self.inputs();b['field_id']='revenue_and_other_income_related_to_sales'
        with self.assertRaisesRegex(ValueError,'metric_mismatch'):propose_q4('revenue',a,b)

    def test_quarter_not_ytd_rejected(self):
        a,b=self.inputs();b['period']['kind']='quarter'
        with self.assertRaisesRegex(ValueError,'duration_identity_mismatch'):propose_q4('revenue',a,b)

    def test_different_scope_rejected(self):
        a,b=self.inputs();b['scope']='parent'
        with self.assertRaisesRegex(ValueError,'scope_mismatch'):propose_q4('revenue',a,b)

    def test_different_currency_rejected(self):
        a,b=self.inputs();b['source_currency']='USD'
        with self.assertRaisesRegex(ValueError,'unit_or_currency_mismatch'):propose_q4('revenue',a,b)

    def test_different_unit_rejected(self):
        a,b=self.inputs();b['normalized_unit']='SAR_millions'
        with self.assertRaisesRegex(ValueError,'unit_or_currency_mismatch'):propose_q4('revenue',a,b)

    def test_different_year_rejected(self):
        a,b=self.inputs();b['period']['fiscal_year']=2023
        with self.assertRaisesRegex(ValueError,'duration_identity_mismatch'):propose_q4('revenue',a,b)

    def test_invalid_calendar_rejected(self):
        a,b=self.inputs();b['period']['end']='2024-19-30'
        with self.assertRaises(ValueError):propose_q4('revenue',a,b)

    def test_missing_artifact_edition_rejected(self):
        a,b=self.inputs();b['artifact_edition_key']='guessed-v2'
        with self.assertRaisesRegex(ValueError,'missing_exact_artifact_edition'):propose_q4('revenue',a,b)

    def test_nonfinite_rejected(self):
        for value in ['NaN','Infinity','not-a-number']:
            a,b=self.inputs();b['normalized_observation_value']=value
            with self.assertRaises(ValueError):propose_q4('revenue',a,b)

    def test_nonadditive_and_unapproved_metrics_rejected(self):
        a,b=self.inputs()
        for field in ['basic_eps','cash_end','cash_beginning','free_cash_flow','ebitda','weighted_average_shares_basic']:
            with self.assertRaisesRegex(ValueError,'non_additive_metric'):propose_q4(field,a,b)

    def test_missing_inputs_rejected(self):
        with self.assertRaisesRegex(ValueError,'missing_inputs'):propose_q4('revenue',None,None)


if __name__=='__main__':unittest.main(verbosity=2)
