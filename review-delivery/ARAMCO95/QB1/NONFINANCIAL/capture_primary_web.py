"""Capture authorized official responses privately. Never bypasses HTTP denial or grants rights."""
from pathlib import Path
from datetime import datetime,timezone
from html.parser import HTMLParser
from urllib.request import Request,urlopen,build_opener,HTTPRedirectHandler
from urllib.error import HTTPError,URLError
from urllib.parse import urlparse
import hashlib,json
HERE=Path(__file__).resolve().parent;OUT=HERE/'SOURCE-CLOSURE';OUT.mkdir(exist_ok=True)
PRIVATE=HERE/'runtime/source-closure';PRIVATE.mkdir(parents=True,exist_ok=True)
class SameIssuerRedirect(HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  if urlparse(newurl).hostname not in ['aramco.com','www.aramco.com']:raise URLError('Cross-domain redirect not authorized for this capture')
  return super().redirect_request(req,fp,code,msg,headers,newurl)
class Text(HTMLParser):
 def __init__(self):super().__init__();self.parts=[];self.ignore=0
 def handle_starttag(self,tag,attrs):
  if tag in ['script','style']:self.ignore+=1
 def handle_endtag(self,tag):
  if tag in ['script','style'] and self.ignore:self.ignore-=1
 def handle_data(self,data):
  if not self.ignore:self.parts.append(data)
sources=[('FAQ','https://www.aramco.com/ar/investors/investor-faq'),('INVESTORS','https://www.aramco.com/en/investors'),('BONDS','https://www.aramco.com/en/investors/bond-information')]
opener=build_opener(SameIssuerRedirect());records=[]
for key,url in sources:
 stamp=datetime.now(timezone.utc).isoformat();r=dict(source_id=key,requested_url=url,retrieval_started_at_utc=stamp,source_publication_date=None,rights_grant='UNKNOWN_NO_GRANT_ISSUED',public_redistribution_authorized=False,raw_original_committed=False)
 try:
  with opener.open(Request(url,headers={'User-Agent':'Marefa-Research-Evidence/1.0','Accept':'text/html'}),timeout=18) as response:
   raw=response.read(4_000_001)
   if len(raw)>4_000_000:raise ValueError('Response exceeds bounded evidence capture limit; not archived')
   content=response.headers.get('Content-Type','')
   if 'text/html' not in content.lower():raise ValueError('Expected official HTML response')
   digest=hashlib.sha256(raw).hexdigest();path=PRIVATE/f'{key}-{digest}.html'
   if path.exists():assert path.read_bytes()==raw
   else:path.write_bytes(raw)
   parser=Text();parser.feed(raw.decode(response.headers.get_content_charset() or 'utf8',errors='replace'));text=' '.join(' '.join(parser.parts).split())
   r.update(status='ORIGINAL_RESPONSE_ARCHIVED_PRIVATE',http_status=response.status,final_url=response.url,sha256=digest,bytes=len(raw),retrieval_completed_at_utc=datetime.now(timezone.utc).isoformat(),content_type=content,server_last_modified=response.headers.get('Last-Modified'),server_last_modified_is_publication_date=False,private_artifact_relative_to_nonfinancial=path.relative_to(HERE).as_posix(),assertions=dict(issuer_name_in_text='شركة الزيت العربية السعودية' in text,isin_in_text='SA14TG012N13' in text,investor_heading_in_text='Investor overview' in text or 'Investors' in text),proof=[])
   if key=='FAQ':
    for label,needle in [('full_name','الاسم الكامل'),('isin','SA14TG012N13')]:
     pos=text.find(needle)
     r['proof'].append(dict(field=label,found=pos>=0,visible_text_character_offset=pos,minimal_context=text[max(0,pos-35):pos+100] if pos>=0 else None))
 except (HTTPError,URLError,TimeoutError,OSError,ValueError) as exc:
  r.update(status='ACCESS_BLOCKED_OR_CAPTURE_FAILED',http_status=getattr(exc,'code',None),error_type=type(exc).__name__,error=str(exc),sha256=None,bytes=0,retrieval_completed_at_utc=datetime.now(timezone.utc).isoformat(),retry_bypass_attempted=False)
 records.append(r);print(key,r['status'],r.get('http_status'),r.get('bytes'))
(OUT/'WEB-CAPTURE-MANIFEST.json').write_text(json.dumps(dict(schema='qb1-private-primary-web-capture/1',captures=records,no_rights_or_publication_grant=True),ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
