"""Independent source/manifest/history safety checks; no DB or document reads."""
import hashlib
import argparse
import json
import re
import subprocess
from pathlib import Path

repo = Path(__file__).resolve().parents[2]
engine = Path('C:/Users/Mohammed856/Documents/Codex/2026-08-31/marefa-unified-20261012')
app = '74c967da01edf518cf77b11c0d9b6ca05316a5ae'
evidence = '6737b47d86892bd7eb73d337a483a7e2a91766e1'
public_base = 'ef3da332d9f33f1bf21844d906c464418ffca0e9'
parser = argparse.ArgumentParser()
parser.add_argument('--output', help='Optional NEW output path; existing artifacts are never overwritten')
parser.add_argument('--delivery-ref', default=evidence, help='Immutable revision to scan before push')
args = parser.parse_args()
def git(*args, root=repo):
    return subprocess.check_output(['git', '-C', str(root), *args])
def load(path):
    return json.loads((repo / path).read_text(encoding='utf-8'))
matrix = load('review-delivery/WEB08B02C/ENGINE-EVIDENCE-MATRIX.json')
source_checks = []
sources = {}
for path, expected in matrix['files'].items():
    raw = git('show', f"{matrix['engine_commit']}:{path}", root=engine)
    assert hashlib.sha256(raw).hexdigest() == expected['sha256']
    lines = raw.decode('utf-8').splitlines()
    assert len(lines) == expected['line_count']
    sources[path] = lines
for item in matrix['matrix']:
    assert item['marker'] in sources[item['path']][item['line'] - 1]
    source_checks.append({'requirement':item['requirement'],'path':item['path'],'line':item['line'],'verified':True})
assert len(source_checks) == 14
manifest = load('review-delivery/WEB08B02C/MANIFEST.json')
tracked = set(git('ls-files').decode().splitlines())
for entry in manifest['files']:
    path = entry['path']
    raw = (repo / path).read_bytes().replace(b'\r\n', b'\n')
    assert hashlib.sha256(raw).hexdigest() == entry['sha256_lf']
    assert path in tracked
    if path.startswith('research-evidence/engine-bridge/'):
        assert raw == git('show', f'{app}:{path}').replace(b'\r\n', b'\n')
protected = ['src', 'config', 'research-evidence/v1', 'research-evidence/aramco-qualification', 'package.json']
assert git('diff', '--name-only', '78bc99a', evidence, '--', *protected) == b''
registry = 'review-delivery/WEB08B02/QUALIFIED-WITHHELD-INPUT-REGISTER-v4.json'
assert git('show', f'{public_base}:{registry}') == git('show', f'{evidence}:{registry}')
reg = json.loads(git('show', f'{evidence}:{registry}'))
assert len(reg['results']) == 142 and reg['qualified_for_research'] == 0 and reg['approved_for_display'] == 0
assert all(r['qualification']['state'] == 'WITHHELD' and not r['qualification']['publicationAuthorized'] for r in reg['results'])
scan_ref = git('rev-parse', args.delivery_ref).decode().strip()
new_commits = git('rev-list', scan_ref, '^'+public_base).decode().splitlines()
outbound_paths = set()
for commit in new_commits:
    outbound_paths.update(git('diff-tree', '--no-commit-id', '--name-only', '-r', commit).decode().splitlines())
patterns = [rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----', rb'AKIA[0-9A-Z]{16}',
            rb'gh[pousr]_[A-Za-z0-9]{30,}', rb'xox[baprs]-[A-Za-z0-9-]{25,}']
private_suffixes = {'.pdf','.png','.jpg','.jpeg','.zip','.sqlite','.sqlite3','.db','.pem','.key'}
for path in outbound_paths:
    p = Path(path)
    assert p.suffix.lower() not in private_suffixes and not p.name.startswith('.env')
    raw = git('show', f'{scan_ref}:{path}')
    raw.decode('utf-8')
    assert all(not re.search(pattern, raw) for pattern in patterns)
    if p.suffix == '.json':
        def check(v):
            if isinstance(v, dict):
                assert not set(v) & {'observed_amount','raw_value','value_decimal','value_text','value_json'}
                for child in v.values(): check(child)
            elif isinstance(v, list):
                for child in v: check(child)
        check(json.loads(raw))
result = {'application_sha':app,'evidence_sha':evidence,'published_ancestor_sha':public_base,
    'engine_source_sha':matrix['engine_commit'],'source_files_verified':len(sources),'matrix_markers_verified':source_checks,
    'manifest_entries_verified':len(manifest['files']),'application_blobs_unchanged_after_EOL_normalization':True,
    'protected_paths_unchanged':protected,'B02_rows_still_withheld':142,'qualified':0,'approved_for_display':0,
    'scanned_delivery_ref':scan_ref,'outbound_commits':new_commits,'outbound_file_count':len(outbound_paths),'outbound_private_artifacts_found':0,
    'known_secret_patterns_found':0,'secret_scan_limits':'Known token/private-key patterns plus manual changed-file inspection; not a mathematical guarantee',
    'database_opened':False,'financial_values_requalified':0}
if args.output:
    with Path(args.output).open('x',encoding='utf-8',newline='\n') as f:
        json.dump(result,f,indent=2); f.write('\n')
print(json.dumps({k:result[k] for k in ['source_files_verified','manifest_entries_verified','B02_rows_still_withheld','outbound_file_count','outbound_private_artifacts_found','known_secret_patterns_found']}))
