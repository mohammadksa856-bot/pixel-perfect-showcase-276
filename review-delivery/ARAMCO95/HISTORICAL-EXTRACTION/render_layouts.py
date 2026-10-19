"""Render original statement pages privately; no images/PDFs enter Git."""
from pathlib import Path
from PIL import Image, ImageDraw
import subprocess
import os
from extract_history import PRIVATE, PLANS, source_definitions

poppler=Path(os.environ.get('PDFTOPPM_BIN','pdftoppm'))
docs=source_definitions();rendered=[]
for key,(_,_,pages) in PLANS.items():
    if key in ['Q1-2026','H1-Q2-2026']:continue  # These original pages were already visually reviewed in the preceding source checks.
    for page in pages:
        target=PRIVATE/f'layout-{key}-{page}'
        subprocess.run([str(poppler),'-f',str(page),'-l',str(page),'-r','85','-singlefile','-png',str(docs[key]['path']),str(target)],check=True,capture_output=True)
        rendered.append((key,page,target.with_suffix('.png')))
for start in range(0,len(rendered),6):
    sheet=Image.new('RGB',(2100,1900),'#ddd');draw=ImageDraw.Draw(sheet)
    for j,(key,pg,path) in enumerate(rendered[start:start+6]):
        im=Image.open(path).convert('RGB');im.thumbnail((695,920))
        x=(j%3)*700;y=(j//3)*950
        sheet.paste(im,(x+(700-im.width)//2,y+25));draw.text((x+8,y+5),f'{key} / original PDF page {pg}',fill='black')
    path=PRIVATE/f'contact-{start//6+1}.png';sheet.save(path);print(path.name,flush=True)
