"""Evidence observations only: reads private originals and immutable engine DB; no import."""
from pathlib import Path
from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import json
import re
import sqlite3
import subprocess

from pypdf import PdfReader
import pdfplumber

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
PRIVATE = ROOT.parent / 'web08b02-private-20261017'
ENGINE = ROOT.parents[1] / 'aramco95-engine-b70254e'
DELIVERY = 'bb02da38ffa56e8a8d97de7b7288abbfe0eb9f2b'
LEDGER = 'review-delivery/ARAMCO95/QB1/FINANCIAL/FIN-EVIDENCE-LEDGER.json'
EXPECTED = {
    'Q1-2026': ('Q1-2026.pdf', 'e3f8215a49ca2568df65c178ef0b681fdd6c43aa20558032424bc9e033c46191', 38),
    'H1-Q2-2026': ('H1-Q2-2026.pdf', '4773cfe444de7e9734a65a59d8e1dd301229d9aa05164729e2b8f983d81cfb41', 44),
}
HOLDS = dict(analyses_blocked=7, claims_withheld=22, inputs_withheld=142, financially_qualified=0)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def git_bytes(revision, path, cwd=ROOT):
    return subprocess.check_output(['git', 'show', revision + ':' + path], cwd=cwd)


def validate_observation(record):
    """Reject evidence identity mutation; this is not a financial-qualification gate."""
    p = record['period']
    expected = record['source_period']
    if p != expected:
        raise ValueError('period_identity_mismatch')
    if record['currency'] != 'SAR' or record['source_scale'] != 'millions':
        raise ValueError('currency_or_scale_mismatch')
    if record['source_document_sha256'] not in {x[1] for x in EXPECTED.values()}:
        raise ValueError('unrecognized_original_document')
    if Decimal(record['engine_value_sar']) != Decimal(record['source_value_sar_millions']) * 1000000:
        raise ValueError('value_mismatch')
    if record['engine_metric_key'] == 'cash' and record['source_line'] != 'Cash and cash equivalents':
        raise ValueError('cash_identity_mismatch')
    if record['financial_acceptance'] or record['publication_authorized']:
        raise ValueError('unauthorized_qualification')
    return True


def collect():
    original_ledger_bytes = git_bytes(DELIVERY, LEDGER)
    records = [r for r in json.loads(original_ledger_bytes)['records'] if r['period']['end'].startswith('2026')]
    assert len(records) == 13
    dbpath = ENGINE / 'data/financial.sqlite3'
    before = sha(dbpath.read_bytes())
    db = sqlite3.connect(dbpath.as_uri() + '?mode=ro&immutable=1', uri=True)
    db.row_factory = sqlite3.Row
    readers, layouts, documents, checks = {}, {}, [], []
    for key, (filename, digest, pages) in EXPECTED.items():
        path = PRIVATE / filename
        data = path.read_bytes()
        assert sha(data) == digest
        reader = PdfReader(path)
        assert len(reader.pages) == pages
        readers[key] = reader
        layouts[key] = pdfplumber.open(path)
        selected = next(r['designated_disclosure'] for r in records if r['designated_disclosure']['key'] == key)
        documents.append(dict(source_id=key, official_url=selected['pdf_url'], original_pdf_sha256=digest,
                              bytes=len(data), pages=pages, local_filename=filename,
                              publication_date_inherited_not_time_certified=selected['published'],
                              assurance='INTERIM_UNAUDITED_WITH_REVIEW_NOT_AUDITED_ANNUAL',
                              rights_grant='UNKNOWN_NO_GRANT_ISSUED', original_committed=False))
    observations = []
    for r in records:
        source = r['designated_disclosure']
        doc = source['key']
        page = source['pdf_page']
        text = readers[doc].pages[page - 1].extract_text()
        layout_text = layouts[doc].pages[page - 1].extract_text()
        metric = r['engine_metric_key']
        line_name = {'revenue': 'Revenue', 'net_income': 'Net income',
                     'operating_cash_flow': 'Net cash provided by operating activities',
                     'cash': 'Cash and cash equivalents', 'total_equity': 'Unlabelled total equity subtotal, including NCI'}[metric]
        if metric == 'total_equity':
            value = {'Q1-2026': '1,758,311', 'H1-Q2-2026': '1,795,831'}[doc]
            line = next(x for x in text.splitlines() if x.strip().startswith(value))
            # The subtotal has no printed label; confirm parent equity and NCI separately.
            parts = {'Q1-2026': ('1,531,722', '226,589'), 'H1-Q2-2026': ('1,569,458', '226,373')}[doc]
            assert all(v in text and v in layout_text for v in parts)
            assert sum(Decimal(v.replace(',', '')) for v in parts) == Decimal(value.replace(',', ''))
        else:
            # Exact start + numeric continuation avoids similarly named revenue/cash totals.
            line = next(x for x in text.splitlines() if re.match(re.escape(line_name) + r'\s+[\d(]', x))
        amounts = re.findall(r'(?<![A-Za-z\d])[\d]{1,3}(?:,[\d]{3})+(?![\d])', line)
        column = 2 if doc == 'H1-Q2-2026' and r['period']['kind'] == 'ytd' else 0
        amount = Decimal(amounts[column].replace(',', ''))
        assert amounts[column] in layout_text
        observed = dict(db.execute('SELECT * FROM data_points WHERE id=?', (r['engine_data_point_id'],)).fetchone())
        assert observed['metric_key'] == metric
        assert observed['company_id'] == 'sa:2222'
        assert observed['period_kind'] == r['period']['kind']
        assert (observed['period_start'] or None) == r['period']['start']
        assert observed['scope'] == 'consolidated' and observed['unit'] == 'SAR' and observed['currency'] == 'SAR'
        assert observed['period_end'] == r['period']['end']
        assert observed['value_decimal'] == r['engine']['value_sar']
        assert observed['version'] == r['engine']['version']
        assert observed['source_key'] == r['engine']['source_key']
        assert observed['is_calculated'] == 0
        period = r['period']
        # Do not infer duration from end date. Source headers were visually checked on seven original pages.
        source_period = dict(period)
        if period['kind'] == 'instant':
            assert period['start'] is None
            assert period['end'] == ('2026-03-31' if doc == 'Q1-2026' else '2026-06-30')
        else:
            assert period['start'] == ('2026-04-01' if period['kind'] == 'quarter' and period['fiscal_quarter'] == 2 else '2026-01-01')
            assert period['end'] == ('2026-03-31' if doc == 'Q1-2026' else '2026-06-30')
        item = dict(record_id=r['record_id'], engine_metric_key=metric,
                    engine_reference={k: observed[k] for k in ['id', 'version', 'source_key', 'scope', 'is_calculated', 'period_start']},
                    period_adapter='Engine empty-string start for instant maps to null; no invented start date',
                    engine_value_sar=observed['value_decimal'], period=period, source_period=source_period,
                    definition=r['definition'], currency='SAR', source_scale='millions',
                    source_value_sar_millions=str(amount), source_document=doc,
                    source_document_sha256=EXPECTED[doc][1], pdf_page=page, printed_page=page,
                    source_line=line_name, source_column=('H1 SAR 2026, third numeric financial column' if column == 2 else
                    ('Q2 SAR 2026, first numeric financial column' if doc == 'H1-Q2-2026' and period['kind'] == 'quarter' else
                     'Current period SAR, first numeric financial column')),
                    scope='CONSOLIDATED_GROUP_INCLUDING_NCI_NOT_PARENT',
                    verification='ORIGINAL_PDF_VISUAL_AND_TWO_TEXT_EXTRACTORS_MATCH_ENGINE',
                    source_value_directly_printed=True, quarterly_derivation_used=False,
                    comparison_to_claude=dict(value_agrees=True, period_agrees=True,
                        designated_page_agrees=True, original_access_gap_closed_here=True,
                        import_claimed_page=r['engine']['import_claimed_page'],
                        engine_import_locator_not_corrected=True),
                    evidence_gap_status='ORIGINAL_SOURCE_VALUE_AND_LOCATOR_CHECKED_PENDING_CROSS_REVIEW',
                    qualification='WITHHELD', financial_acceptance=False, publication_authorized=False,
                    remaining_conditions=['financially_authorized_review', 'rights_evidence', 'versioned_B02C_evidence_receipt',
                                          'precise_publication_time_and_as_of_controls', 'R1-R8_resolution_as_applicable'])
        validate_observation(item)
        observations.append(item)
        checks.append(dict(name=r['record_id'], status='PASS', scope='source value, SAR column, full period and engine row identity'))
    values = {(x['engine_metric_key'], x['period']['kind'], x['period']['end']): Decimal(x['source_value_sar_millions']) for x in observations}
    quarter_checks = []
    for metric in ['revenue', 'net_income', 'operating_cash_flow']:
        q1, q2, h1 = values[metric, 'quarter', '2026-03-31'], values[metric, 'quarter', '2026-06-30'], values[metric, 'ytd', '2026-06-30']
        assert h1 - q1 == q2
        quarter_checks.append(dict(metric=metric, q1=str(q1), h1=str(h1), direct_q2=str(q2),
                                   exact_h1_minus_q1=str(h1-q1), status='PASS', publish_derived_fact=False,
                                   limitation='Consistency check at source display precision, not financial qualification'))
    bridge_text = {p: readers['H1-Q2-2026'].pages[p-1].extract_text() for p in [29, 31, 42]}
    assert '167,387' in bridge_text[29]
    assert '170,853' in bridge_text[31]
    assert '3,466' in bridge_text[42] and 'held for sale' in bridge_text[42] and 'PRefChem' in bridge_text[42]
    assert Decimal(167387) + Decimal(3466) == Decimal(170853)
    bridge = dict(record_id='FQ01-OBS-072', unit='SAR_millions', period_end='2026-06-30',
                  balance_cash=167387, balance_pdf_page=29, cash_end=170853, cashflow_pdf_page=31,
                  held_for_sale_cash=3466, note_pdf_page=42, note='16(a)',
                  original_pdf_sha256=EXPECTED['H1-Q2-2026'][1],
                  equation='167387 + 3466 = 170853', cash_and_cash_end_interchangeable=False,
                  scope='Share in PRefChem joint operations cash classified held for sale; not an equity adjustment',
                  transaction_not_assumed_completed=True, financial_acceptance=False)
    for layout in layouts.values():
        layout.close()
    db.close()
    assert sha(dbpath.read_bytes()) == before
    out = dict(schema='qb1-fy2026-independent-original-observations/1', observed_at_utc=datetime.now(timezone.utc).isoformat(),
               source_claude_delivery=DELIVERY, source_claude_ledger_sha256=sha(original_ledger_bytes),
               engine_sha=subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ENGINE, text=True).strip(),
               database_read_mode='ro&immutable=1', database_sha256_before_after=before,
               records=observations, quarter_consistency_checks=quarter_checks, prefchem_bridge=bridge,
               record_counts=dict(total=13, q1=5, q2=3, h1_or_june_instant=5, value_mismatches=0,
                                  original_source_access_subgaps_checked=13, financially_qualified=0),
               holds=HOLDS, R1_R8='OPEN_NO_GLOBAL_CLOSURE', self_acceptance=False,
               authority='Source cross-check only; no financial, editorial, rights or publication approval')
    manifest = dict(schema='qb1-original-documents/1', documents=documents,
                    original_files_private=True, original_documents_uploaded=False,
                    pdf_hash_is_not_import_json_hash=True)
    for name, data in [('FY2026-ORIGINAL-SOURCE-REGISTER.json', out), ('FY2026-SOURCE-MANIFEST.json', manifest)]:
        (HERE / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(dict(original_observations=len(observations), checks=checks, quarter_checks=quarter_checks,
                          prefchem='PASS', database_unchanged=True, holds=HOLDS)))


if __name__ == '__main__':
    collect()
