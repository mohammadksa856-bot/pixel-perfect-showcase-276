"""Private source recovery only; never imports facts or writes into the engine archive."""
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import URLError, HTTPError
from urllib.parse import urlparse
from pypdf import PdfReader

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
PRIVATE = ROOT.parent/'aramco95-qb2-private-20261019'
LOCAL = ROOT.parent/'outputs/market-agnostic-financial-data-engine/data/raw/SA/2222/documents'
ENGINE = ROOT.parents[1]/'aramco95-engine-b70254e'
HOST = 'https://www.aramco.com'
INDEX_URL = HOST+'/en/investors/reports-and-presentations'
SOURCES = [
 ('ARA2022','0451f1531bb03cf6504ac711df2ca6474e1623edd178af903a83605cab66f353',HOST+'/-/media/publications/corporate-reports/annual-reports/saudi-aramco-ara-2022-english.pdf','2023-03-13','FY2022 audited statements and FY2021 comparative; not FY2021 original edition'),
 ('ARA2023','4ae156d697ffb78a78c781dda39dd5259dd1c30317233b7565c8622f14875c21',HOST+'/-/media/publications/corporate-reports/annual-reports/saudi-aramco-ara-2023-english.pdf','2024-03-11','FY2023 audited statements, Q4 needs standalone disclosure/approved derivation'),
 ('ARA2024','2626b292eb4fd236ba9bbf0930794350d99146d161a30f993d731f36113dd1f6',HOST+'/-/media/publications/corporate-reports/annual-reports/saudi-aramco-ara-2024-english.pdf','2025-03-04','FY2024 original annual edition; audit provenance still reviewed separately'),
 ('FY2024-FS','b8a29772c1570738a9b4e481efc5af795a523fe79090107a9556589db28685c0',HOST+'/-/media/publications/corporate-reports/reports-and-presentations/2024/fy/saudi-aramco-fy-2024-full-financials-english.pdf','2025-03-04','Original FY2024 statements versus FY2025 comparative'),
 ('ARA2025','78bb678e8e45f5c58fa1b2402ab5a29c5ad10adfda8ba5e7ee5f4d1ad76cd227',HOST+'/-/media/publications/corporate-reports/reports-and-presentations/2025/fy/saudi-aramco-ara-2025-english.pdf','2026-03-10','Reference historical summary; not a substitute for each original audited annual'),
 ('ARA2021',None,HOST+'/-/media/publications/corporate-reports/annual-reports/saudi-aramco-ara-2021-english.pdf','2022-03-21','Missing original FY2021 annual edition'),
 ('FY2021-FS',None,HOST+'/-/media/publications/corporate-reports/reports-and-presentations/2021/q4---fy/saudi-aramco-fy-2021-full-financials-report-english.pdf','2022-03-21','Alternative full original FY2021 statements'),
 ('Q3-2023',None,HOST+'/-/media/publications/corporate-reports/reports-and-presentations/2023/q3/saudi-aramco-q3-2023-interim-report-english.pdf','2023-11-07','Q3 direct, YTD9 needed for possible Q4 subtraction'),
 ('Q1-2024',None,HOST+'/-/media/publications/corporate-reports/reports-and-presentations/2024/q1/saudi-aramco-q1-2024-interim-report-english.pdf','2024-05-07','Q1 standalone flows and March balances'),
 ('H1-2024',None,HOST+'/-/media/publications/corporate-reports/reports-and-presentations/2024/h1/saudi-aramco-h1-2024-interim-report-english.pdf','2024-08-06','Q2 standalone, H1 cumulative and June balances'),
 ('Q3-2024',None,HOST+'/-/media/publications/corporate-reports/reports-and-presentations/2024/q3/saudi-aramco-q3-2024-interim-report-english.pdf','2024-11-05','Q3 standalone, YTD9 and September balances'),
 ('Q1-2025',None,HOST+'/-/media/publications/corporate-reports/reports-and-presentations/2025/q1/saudi-aramco-q1-2025-interim-report-english.pdf','2025-05-12','Q1 standalone flows and March balances'),
 ('H1-2025',None,HOST+'/-/media/publications/corporate-reports/reports-and-presentations/2025/h1/saudi-aramco-h1-2025-interim-report-english.pdf','2025-08-05','Q2 standalone, H1 cumulative and June balances'),
 ('Q3-2025',None,HOST+'/-/media/publications/corporate-reports/reports-and-presentations/2025/q3/saudi-aramco-q3-2025-interim-report-english.pdf','2025-11-04','Q3 standalone, YTD9 and September balances'),
 ('Q4-2025-RESULTS',None,HOST+'/-/media/publications/corporate-reports/reports-and-presentations/2025/fy/saudi-aramco-fy-2025-results-press-release-english.pdf','2026-03-10','Fourth-quarter supplement; announcement not an audited annual replacement'),
]


class SameIssuer(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urlparse(newurl).hostname not in ['www.aramco.com','aramco.com']:
            raise URLError('Cross-domain redirect not authorized')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def recover(source):
    key, expected, url, date, impact = source
    out = dict(source_id=key, original_url=url, publisher_index_url=INDEX_URL,
               index_publication_date_observed=date, publication_time_certified=False,
               expected_archival_sha256=expected, gate_impact=impact,
               observed_at_utc=datetime.now(timezone.utc).isoformat(), rights_grant='UNKNOWN_NO_GRANT',
               financially_qualified=False, original_in_git=False)
    candidate = None
    if key == 'FY2024-FS':
        candidate = ROOT.parent/'web08b02-private-20261017/FY2024.pdf'
    elif key == 'ARA2025':
        candidate = ENGINE/f'data/raw/SA/2222/documents/{expected}.pdf'
    elif expected:
        candidate = LOCAL/f'{expected}.pdf'
    try:
        if candidate and candidate.exists():
            data = candidate.read_bytes()
            out['method'] = 'LOCAL_ORIGINAL_RECOVERY_NOT_NEW_DOWNLOAD'
        else:
            out['method'] = 'OFFICIAL_ISSUER_DOWNLOAD_ATTEMPT'
            request = Request(url,headers={'User-Agent':'Marefa-Research-Evidence/1.0','Accept':'application/pdf'})
            with build_opener(SameIssuer()).open(request,timeout=14) as response:
                data = response.read(30_000_001)
                out['http_status'] = response.status
                out['final_url'] = response.url
                if len(data) > 30_000_000:
                    raise ValueError('Document exceeds bounded recovery limit')
        if not data.startswith(b'%PDF-'):
            raise ValueError('Response is not an original PDF')
        digest = hashlib.sha256(data).hexdigest()
        if expected and digest != expected:
            raise ValueError('Original does not match expected archive digest; do not silently replace edition')
        destination = PRIVATE/f'{key}-{digest}.pdf'
        if destination.exists():
            assert destination.read_bytes() == data
        else:
            destination.write_bytes(data)
        pages = len(PdfReader(destination).pages)
        out.update(status='PRIVATE_ORIGINAL_RECOVERED_PENDING_CROSS_REVIEW',sha256=digest,bytes=len(data),pages=pages,
                   private_filename=destination.name,original_period_qualified=False,auto_gate_credit=0)
    except (TimeoutError,URLError,HTTPError,OSError,ValueError) as exc:
        out.update(status='ORIGINAL_NOT_RECOVERED',sha256=None,bytes=0,error_type=type(exc).__name__,
                   error=str(exc),auto_gate_credit=0,bypass_attempted=False)
    print(key, out['status'], flush=True)
    return out


if __name__ == '__main__':
    PRIVATE.mkdir(exist_ok=True)
    with ThreadPoolExecutor(max_workers=2) as pool:
        rows = list(pool.map(recover,SOURCES))
    out = dict(schema='qb2-independent-private-source-recovery/1',documents=rows,
               recovered=sum(x['sha256'] is not None for x in rows),missing=sum(x['sha256'] is None for x in rows),
               no_financial_acceptance=True,new_evidence_self_accepted=False,
               web_reader_pdf_access_not_local_original_bytes=True,holds=[7,22,142,0])
    (HERE/'SOURCE-RECOVERY-MANIFEST.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
