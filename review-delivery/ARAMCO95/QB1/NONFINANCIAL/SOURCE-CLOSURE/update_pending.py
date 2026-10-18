"""Supplement accepted records without altering the accepted 19-record ledger."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
from pypdf import PdfReader

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
ENGINE = ROOT.parents[1] / 'aramco95-engine-b70254e'
ANNUAL_HASH = '78bb678e8e45f5c58fa1b2402ab5a29c5ad10adfda8ba5e7ee5f4d1ad76cd227'
ANNUAL = ENGINE / f'data/raw/SA/2222/documents/{ANNUAL_HASH}.pdf'


def main():
    assert hashlib.sha256(ANNUAL.read_bytes()).hexdigest() == ANNUAL_HASH
    reader = PdfReader(ANNUAL)
    note = reader.pages[178].extract_text()
    overview = reader.pages[15].extract_text()
    ratings = reader.pages[36].extract_text()
    for token in ['1988', '1933', 'November', 'May']:
        assert token in note
    assert '400' in overview and 'subsidiaries' in overview
    assert 'Aa3' in ratings and 'P-1' in ratings and 'A+' in ratings and 'F1+' in ratings
    old = json.loads((HERE.parent / 'PENDING-DECISIONS.json').read_text(encoding='utf8'))
    capture = json.loads((HERE / 'WEB-CAPTURE-MANIFEST.json').read_text(encoding='utf8'))
    updates = []
    for r in old['records']:
        r = dict(r)
        field = r['field_id']
        r['state_before'] = r['state']
        r['pending'] = True
        r['source_gap_closed'] = False
        r['new_rights_grant'] = False
        r['approved_by_preparer'] = False
        if field in ['legal_name_ar', 'isin', 'investor_relations_url']:
            r['new_source_action'] = 'Official page opened through web reader; original byte capture timed out. No file digest invented.'
            r['source_publication_date'] = None
            r['source_sha256'] = None
            r['blocker_type'] = 'PRIMARY_ARTIFACT_CAPTURE' + ('_AND_OWNER_FIELD_DEFINITION' if field == 'legal_name_ar' else '')
        else:
            r['source_sha256'] = ANNUAL_HASH
            r['source_type'] = 'ORIGINAL_ANNUAL_REPORT_RECHECKED'
            r['source_pdf_page'] = {'founding_date': 179, 'subsidiaries_count': 16, 'credit_rating': 37}[field]
            r['source_publication_date_claim'] = '2026-03-09; inherited date, not independently timestamp-certified'
            r['source_year'] = 2025
            if field == 'founding_date':
                r['supported_distinct_events'] = [dict(event='PREDECESSOR_CONCESSION', date='1933-05-29'), dict(event='CURRENT_LEGAL_ENTITY_FORMATION', date='1988-11-13')]
                r['blocker_type'] = 'OWNER_FIELD_DEFINITION_NO_SOURCE_DATE_GUESSING'
                r['source_gap_closed'] = 'Annual note supports distinct events; owner definition remains open'
            elif field == 'subsidiaries_count':
                r['blocker_type'] = 'SUBSIDIARY_ONLY_SOURCE_OR_OWNER_SEPARATE_AGGREGATE_DEFINITION'
                r['supported_scope'] = 'More than400 domestic and foreign subsidiaries, joint arrangements and associates together; not a subsidiary-only count'
                r['engine_value_not_endorsed'] = '+400'
            else:
                r['blocker_type'] = 'ORIGINAL_AGENCY_ACTION_DATE_INSTRUMENT_AND_AS_OF_CHECK'
                r['historical_issuer_reported_not_current_certification'] = [dict(agency='Moodys', long_term='Aa3', short_term='P-1', outlook='Stable'), dict(agency='Fitch', long_term='A+', short_term='F1+', outlook='Stable')]
                r['agency_original_retrieved'] = False
        updates.append(r)
    out = dict(schema='qb1-pending-nonfinancial-source-closure/1', observed_at_utc=datetime.now(timezone.utc).isoformat(),
               accepted_19_record_ledger_unchanged=True, cross_acceptance_sha='1ec8ccd6ae946a5c361223edfbe936b2ed78c821',
               records=updates, new_pending_records_closed=0, pending_count=6,
               web_capture_attempts=len(capture['captures']), successful_original_web_captures=0,
               decision='SOURCE_WORK_CONTINUES_NO_SELF_ACCEPTANCE', rights_granted=False,
               financial_acceptance=False, publication_authorized=False,
               holds=dict(analyses_blocked=7, claims_withheld=22, inputs_withheld=142, financially_qualified=0))
    (HERE / 'UPDATED-PENDING-REGISTER.json').write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print('Six pending records updated; original annual SHA verified; zero records self-accepted.')


if __name__ == '__main__':
    main()
