"""Recover two verified statement URLs; discover Q4 PDF URLs from actual issuer-index bytes."""
import hashlib
import html
import json
import re
from urllib.request import Request, build_opener
from urllib.parse import urljoin
from recover_sources import HERE, PRIVATE, HOST, INDEX_URL, SameIssuer, recover

extra = [
 ('FY2022-FS',None,HOST+'/-/media/publications/corporate-reports/reports-and-presentations/2022/q4---fy/saudi-aramco-fy-2022-full-financials-english.pdf','2023-03-13','Full original FY2022 audited statements; no automatic qualification'),
 ('FY2023-FS',None,HOST+'/-/media/publications/corporate-reports/reports-and-presentations/2023/fy/saudi-aramco-fy-2023-full-financials-english.pdf','2024-03-10','Full original FY2023 audited statements; no automatic qualification'),
]
observations = []
try:
    with build_opener(SameIssuer()).open(Request(INDEX_URL,headers={'User-Agent':'Marefa-Research-Evidence/1.0'}),timeout=18) as response:
        raw = response.read(4_000_001)
        assert len(raw) <= 4_000_000
    digest = hashlib.sha256(raw).hexdigest()
    (PRIVATE/f'issuer-report-index-{digest}.html').write_bytes(raw)
    text = html.unescape(raw.decode('utf8'))
    urls = set(urljoin(HOST,u) for u in re.findall(r'[^\s\"\'<>]+\.pdf(?:\?[^\s\"\'<>]*)?',text))
    for year, date in [(2023,'2024-03-10'),(2024,'2025-03-04')]:
        found = sorted(u for u in urls if f'fy-{year}-results-press-release' in u and 'english' in u)
        observations.append(dict(year=year,source_index_sha256=digest,matching_original_pdf_urls=found,
                                 status='LINK_DISCOVERED_IN_ORIGINAL_INDEX' if found else 'STANDALONE_Q4_PDF_NOT_IDENTIFIED_IN_INDEX'))
        for i,u in enumerate(found):
            extra.append((f'Q4-{year}-RESULTS-{i+1}',None,u,date,'Results release may contain quarterly measures; coverage requires direct line/period checks'))
except (OSError,ValueError) as e:
    observations.append(dict(status='INDEX_CAPTURE_FAILED',error_type=type(e).__name__,error=str(e)))
rows=[recover(x) for x in extra]
(HERE/'EXTRA-SOURCE-RECOVERY.json').write_text(json.dumps(dict(documents=rows,index_observations=observations,
    new_evidence_self_accepted=False,financially_qualified=0),ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(observations))
