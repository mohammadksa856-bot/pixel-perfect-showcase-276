"""Local read-only evidence checks. Never emits source numeric amounts or copies private files."""
import argparse, hashlib, json, re, gzip
from pathlib import Path
from pypdf import PdfReader

p = argparse.ArgumentParser()
p.add_argument('--repo', required=True)
p.add_argument('--private-root', required=True)
p.add_argument('--output', required=True)
a = p.parse_args()
repo, private = Path(a.repo), Path(a.private_root)
delivery = repo / 'review-delivery/WEB08B02'
load = lambda path: json.loads(Path(path).read_text(encoding='utf-8-sig'))
sha = lambda b: hashlib.sha256(b).hexdigest()
canon = lambda x: json.dumps(x, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
manifest = load(delivery / 'PRIVATE-EVIDENCE-MANIFEST.json')
catalogue = load(delivery / 'FINANCIAL-EVIDENCE-REGISTER.json')
locators = load(delivery / 'REVIEWED-LOCATORS.json')
register = load(delivery / 'QUALIFIED-WITHHELD-INPUT-REGISTER-v4.json')
regenerated = load(Path(a.output).parent / 'reviewer-regenerated-v4.json')
files = []
for entry in manifest['files']:
    raw = (private / entry['name']).read_bytes()
    files.append({'name': entry['name'], 'sha256_match': sha(raw) == entry['sha256'],
                  'bytes_match': len(raw) == entry['bytes']})
assert all(x['sha256_match'] and x['bytes_match'] for x in files)
assert len(files) == 27
assert sum(x['name'].endswith('.png') for x in files) == 21
pdfs, texts = [], {}
for d in catalogue['documents']:
    raw = (private / (d['key'] + '.pdf')).read_bytes()
    pdf = PdfReader(private / (d['key'] + '.pdf'))
    result = {'document': d['key'], 'sha256_match': sha(raw) == d['sha256'],
              'bytes_match': len(raw) == d['bytes'], 'pages_match': len(pdf.pages) == d['pages']}
    assert all(result[k] for k in ('sha256_match', 'bytes_match', 'pages_match'))
    pdfs.append(result)
    for page in locators['reviewed_pages'][d['key']]:
        texts[(d['key'], page)] = pdf.pages[page - 1].extract_text()
rows = load(private / 'audit-observations.json')['rows'] + load(private / 'audit-adjusted-observations.json')['rows']
assert len(rows) == 142 and len({r['audit_row'] for r in rows}) == 142
assert {r['audit_row'] for r in rows} == {f'OBS-{n:03}' for n in range(1, 143)}
by_id = {r['audit_row']: r for r in register['results']}
checks = []
for row in rows:
    result = by_id[row['audit_row']]
    doc = row['source']['document_key']
    page = row['source']['pdf_page']
    # Presence alone does not establish row/column correctness; critical samples are visually checked separately.
    digits = row['observed_amount'].lstrip('-')
    whole, dot, fraction = digits.partition('.')
    token = f'{int(whole):,}' + (dot + fraction if dot else '')
    if row['observed_amount'].startswith('-'):
        token = '(' + token + ')'
    source_text = re.sub(r'\s+', '', texts[(doc, page)])
    present = token in source_text
    check = {'audit_row': row['audit_row'], 'observation_digest_matches': sha(canon(row).encode()) == result['source_observation_digest'],
             'identity_matches': row['identity'] == result['identity'],
             'document_page_reviewed': page in locators['reviewed_pages'][doc],
             'amount_token_present_on_pdf_page_not_full_validation': present,
             'withheld': result['qualification']['state'] == 'WITHHELD',
             'publication_blocked': result['qualification']['publicationAuthorized'] is False,
             'engine_fact_ref_null': result['engine_fact_ref'] is None}
    assert all(check[k] for k in ('observation_digest_matches', 'identity_matches', 'document_page_reviewed', 'withheld', 'publication_blocked', 'engine_fact_ref_null'))
    checks.append(check)
assert register == regenerated
compressed = (repo / register['engine_snapshot']['path']).read_bytes()
snapshot_raw = gzip.decompress(compressed)
snapshot = json.loads(snapshot_raw)
assert sha(compressed) == register['engine_snapshot']['compressed_sha256']
assert sha(snapshot_raw) == register['engine_snapshot']['uncompressed_sha256']
assert snapshot['generated_at'] == register['engine_snapshot']['generated_at']
representations = []
def walk(value):
    if isinstance(value, list):
        for item in value: walk(item)
    elif isinstance(value, dict):
        if isinstance(value.get('metrics'), dict):
            for metric, items in value['metrics'].items():
                for item in items:
                    representations.append({**item, 'company_id': snapshot['company']['company_id'], 'metric': metric})
        for key, item in value.items():
            if key != 'metrics': walk(item)
walk(snapshot['sections']['financials'])
assert len(representations) == 388
assert len({canon(x) for x in representations}) == 368
assert all('observed_amount' not in r and 'source_scale' not in r for r in register['results'])
out = {'tested_sha': 'b1f90a9f4e21ef9f1277c07376c3c7f4d2ad2bcf',
       'private_files': files, 'pdfs': pdfs, 'observations': len(rows), 'checks': checks,
       'reproduced_register_equal': register == regenerated,
       'snapshot_sha256_verified': True, 'snapshot_generated_at': snapshot['generated_at'],
       'display_instances_independently_counted': len(representations),
       'unique_representations_independently_counted': len({canon(x) for x in representations}),
       'source_values_not_emitted': True,
       'amount_token_checks_passed': sum(r['amount_token_present_on_pdf_page_not_full_validation'] for r in checks),
       'token_check_is_not_row_column_or_professional_financial_certification': True}
with Path(a.output).open('x', encoding='utf-8') as f: json.dump(out, f, ensure_ascii=False, indent=2)
print(json.dumps({k: v for k, v in out.items() if k not in ('private_files', 'pdfs', 'checks')}, ensure_ascii=False))
