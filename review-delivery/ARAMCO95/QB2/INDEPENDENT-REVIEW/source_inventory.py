"""Hash private recovered originals and describe gate dependencies without awarding gate credit."""
from pathlib import Path
import hashlib
import json
from pypdf import PdfReader
from recover_sources import HERE, PRIVATE

primary=json.loads((HERE/'SOURCE-RECOVERY-MANIFEST.json').read_text(encoding='utf8'))
extra=json.loads((HERE/'EXTRA-SOURCE-RECOVERY.json').read_text(encoding='utf8'))
rows=primary['documents']+extra['documents']
checks=[]
for row in rows:
    if not row.get('sha256'):
        continue
    file=PRIVATE/row['private_filename']
    digest=hashlib.sha256(file.read_bytes()).hexdigest()
    assert digest==row['sha256']
    reader=PdfReader(file)
    assert len(reader.pages)==row['pages']
    first=' '.join((p.extract_text() or '') for p in reader.pages[:12])
    assert any(s in ' '.join(first.lower().split()) for s in ['aramco','saudi arabian oil'])
    checks.append(dict(source_id=row['source_id'],sha256=digest,pdf_parse='PASS',
                       page_count=row['pages'],issuer_identity_in_first12_pages='PASS',
                       first_page_size_points=[float(x) for x in reader.pages[0].mediabox[2:]],
                       financially_qualified=False,new_source_review='PENDING_CROSS_REVIEW'))
years=[]
for year in range(2021,2026):
    docs=[r['source_id'] for r in rows if r['source_id'] in [f'ARA{year}',f'FY{year}-FS'] and r.get('sha256')]
    years.append(dict(fiscal_year=year,original_pdf_available=True,available_documents=docs,
        content_linkage_financial_review_and_rights='PENDING',audited_period_credit_awarded=0,
        limitation='Original file availability is not qualification or confirmation of every historical input. Later comparative edition is distinct.'))
quarters=[]
for year,q in [(2023,3),(2023,4),(2024,1),(2024,2),(2024,3),(2024,4),(2025,1),(2025,2),(2025,3),(2025,4)]:
    doc=f'Q{q}-{year}' if q!=2 else f'H1-{year}'
    if q==4:
        available=[f'ARA{year}',f'FY{year}-FS' if year<2025 else 'ARA2025',f'Q3-{year}']
        if year in [2024,2025]:
            available.append('Q4-2025-RESULTS')
        status='YEAR_END_BALANCES_AND_FY_YTD9_INPUTS_RECOVERED_Q4_REQUIRES_DEFINITION_AND_DERIVATION_REVIEW'
        missing='Complete standalone Q4 evidence for revenue, net income and CFO under exact definitions; or explicitly authorized FY-minus-YTD9 derivation. Results supplement is partial, not a full interim statement.'
    else:
        available=[doc]
        status='ORIGINAL_INTERIM_RECOVERED_PENDING_ROW_REVIEW'
        missing='Individual five-field extraction, units/full period/as-reported edition cross-check; engine linkage and independent qualification/rights.'
    quarters.append(dict(quarter=f'Q{q}-{year}',available_source_ids=list(dict.fromkeys(available)),
                         status=status,remaining=missing,gate_credit_awarded=0))
out=dict(schema='qb2-source-availability-vs-qualification/1',original_pdf_count=len(checks),
         local_recovery_count=sum(r['method']=='LOCAL_ORIGINAL_RECOVERY_NOT_NEW_DOWNLOAD' for r in rows if r.get('sha256')),
         official_download_count=sum(r['method']=='OFFICIAL_ISSUER_DOWNLOAD_ATTEMPT' for r in rows if r.get('sha256')),
         checks=checks,annual=years,quarters=quarters,
         missing_original_requested_annual_files=[],missing_original_requested_interim_files=[],
         unresolved_standalone_quarterly_evidence=['Q4-2023','Q4-2024','Q4-2025'],
         q4_2025_supplement=dict(source_id='Q4-2025-RESULTS',pdf_pages=[1,3,4],
             distinction='Direct Q4 net income and CFO summaries exist; revenue line is revenue AND other income related to sales, not revenue alone. Prior-Q4 comparatives are later-edition evidence, not the original release.'),
         exchange_source_search=dict(provider='Saudi Exchange',official_FY2024_url='https://www.saudiexchange.sa/wps/portal/saudiexchange/newsandreports/issuer-news/issuer-announcements/issuer-announcements-details/?anCat=17&anId=85572&cs=2222&locale=en',
             original_exchange_artifact_captured=False,substitution_for_full_statements=False,
             note='Official2023 result located with nonstable portal URL; no invented announcement ID or hash. Primary issuer PDFs recovered instead.'),
         retrieval_limitations=['Issuer index original HTML capture timed out; web-reader link observations do not supply an original HTML hash.',
             'One broad local file search reported access denied for unrelated runtime dependency subdirectories; these were not bypassed. Identified Aramco source folders were readable.'],
         new_recovery_self_accepted=False,financially_qualified=0,holds=[7,22,142,0],
         conclusion='File access gaps recovered, not gate completion. Zero new audited-period/quarter qualification credit awarded.')
(HERE/'GATE-SOURCE-INVENTORY.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(dict(original_pdfs=len(checks),annual_originals_available=5,interim_originals_available=7,
                     q4_standalone_requirements_pending=3,qualified=0)))
