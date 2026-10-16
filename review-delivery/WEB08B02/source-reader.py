"""Local read-only evidence inspection. Does not import facts or create engine identities."""
from pathlib import Path
from pypdf import PdfReader
import argparse,json,sys,hashlib
sys.stdout.reconfigure(encoding='utf-8')
p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--doc',required=True);p.add_argument('--pages',required=True)
a=p.parse_args();f=Path(a.root)/(a.doc+'.pdf');r=PdfReader(f)
for n in map(int,a.pages.split(',')):
 print(json.dumps({'document':a.doc,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'pdf_page':n,'text':r.pages[n-1].extract_text()},ensure_ascii=False))
