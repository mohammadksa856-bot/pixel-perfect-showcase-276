"""Read-only original PDF inspection; full extracted text stays outside Git."""
from pathlib import Path
from pypdf import PdfReader
import hashlib, json
private=Path(__file__).resolve().parents[3]/'web08b03-private-20261017'
annual=private/'annual-2025.pdf'
reader=PdfReader(annual)
pages=[p.extract_text() or '' for p in reader.pages]
(private/'annual-pages.json').write_text(json.dumps(pages,ensure_ascii=False),encoding='utf8')
print('annual',len(pages),hashlib.sha256(annual.read_bytes()).hexdigest())
terms=['commenced production','Tanajib','Marjan','80%','50 billion','55 billion','12 million','minimum volume','18 offshore','22,275','6,789','contingent assets','Petro Rabigh','quarter 2025','buyback']
for term in terms:
 hits=[i+1 for i,p in enumerate(pages) if term.lower() in p.lower()]
 print(term, hits)
for printed in [69,71,139,192,230,232]:
 for actual in [printed,printed+2]:
  if actual<=len(pages):
   t=pages[actual-1]
   print('PDF',actual,'first lines:',repr(t[:260]))
financial=private.parent/'web08b02-private-20261017'/'FY2025.pdf'
fs=[p.extract_text() or '' for p in PdfReader(financial).pages]
(private/'financial-pages.json').write_text(json.dumps(fs,ensure_ascii=False),encoding='utf8')
for term in ['18 offshore','22,275','6,789','minimum volume','20 years','Sadara']:
 print('financial',term,[i+1 for i,p in enumerate(fs) if term.lower() in p.lower()])
