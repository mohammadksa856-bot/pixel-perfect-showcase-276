"""Re-render originals in memory and compare pixels; writes metadata only."""
import argparse, json, hashlib
from pathlib import Path
import pypdfium2 as pdfium
from PIL import Image
p = argparse.ArgumentParser()
p.add_argument('--repo', required=True); p.add_argument('--private-root', required=True); p.add_argument('--output', required=True)
a = p.parse_args()
root = Path(a.private_root)
locators = json.loads((Path(a.repo) / 'review-delivery/WEB08B02/REVIEWED-LOCATORS.json').read_text(encoding='utf-8'))
results = []
for doc, pages in locators['reviewed_pages'].items():
    pdf = pdfium.PdfDocument(root / (doc + '.pdf'))
    for n in pages:
        expected = Image.open(root / f'{doc}-{n}.png').convert('RGB')
        page = pdf[n - 1]
        rendered = page.render(scale=2.4).to_pil().convert('RGB')
        same = expected.size == rendered.size and expected.tobytes() == rendered.tobytes()
        results.append({'document': doc, 'pdf_page': n, 'render_scale':2.4,
                        'stored_image_dimensions':list(expected.size), 'rerendered_dimensions':list(rendered.size),
                        'pixels_identical':same})
        page.close()
    pdf.close()
out = {'tested_sha':'b1f90a9f4e21ef9f1277c07376c3c7f4d2ad2bcf', 'pages':len(results), 'all_pixels_identical': all(r['pixels_identical'] for r in results),
       'rendered_in_memory_no_private_copies_written':True, 'results':results}
with Path(a.output).open('x', encoding='utf-8') as f: json.dump(out, f, indent=2)
print(json.dumps({k:v for k,v in out.items() if k!='results'}))
assert out['all_pixels_identical']
