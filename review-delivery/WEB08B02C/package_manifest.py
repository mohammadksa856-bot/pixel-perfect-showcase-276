"""Hash only this stage's code and safe delivery; no source documents/private history."""
import hashlib
import json
from pathlib import Path

here = Path(__file__).resolve().parent
repo = here.parents[1]
paths = sorted([*(repo / 'research-evidence/engine-bridge').glob('*'), *here.rglob('*')])
files = []
for path in paths:
    if not path.is_file() or path.name == 'MANIFEST.json' or '__pycache__' in path.parts:
        continue
    if path.suffix not in {'.ts', '.json', '.md', '.log', '.py'}:
        raise ValueError('Unexpected delivery type')
    data = path.read_bytes().replace(b'\r\n', b'\n')
    files.append({'path':path.relative_to(repo).as_posix(), 'sha256_lf':hashlib.sha256(data).hexdigest()})
with (here / 'MANIFEST.json').open('x', encoding='utf-8', newline='\n') as stream:
    json.dump({'schema':'marefa-code-only-manifest/1','normalization':'CRLF to LF; UTF8 bytes otherwise unchanged','code_sha':'74c967da01edf518cf77b11c0d9b6ca05316a5ae','files':files},stream,indent=2)
    stream.write('\n')
print(json.dumps({'manifest_files':len(files)}))
