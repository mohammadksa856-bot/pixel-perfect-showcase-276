"""Create bounded metadata matrix and LF-normalized manifest; reject private artifacts/secrets."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import subprocess

p=argparse.ArgumentParser();p.add_argument('--version',required=True);a=p.parse_args()
repo=Path(__file__).resolve().parents[2];here=Path(__file__).parent
register=json.loads((here/'CLOSEOUT-REGISTER.json').read_text(encoding='utf-8'))
matrix={'schema':'marefa-b02d-qualification-matrix/1','observations':142,'research_qualified':0,'withheld':142,'financially_resolved':0,
    'audit_dispositions_closed_with_withhold':142,'rows':[{'audit_row':r['audit_row'],'identity':r['identity'],'source':r['source'],
      'audit_disposition':r['audit_disposition'],'financial_review':'NOT_CERTIFIED','eligibility':r['eligibility'],
      'remaining_blockers':r['remaining_blockers'],'engine_fact_ref':None,'publicationAuthorized':False} for r in register['results']]}
if not (here/'QUALIFIED-WITHHELD-MATRIX.json').exists():
    with (here/'QUALIFIED-WITHHELD-MATRIX.json').open('x',encoding='utf-8') as f:json.dump(matrix,f,ensure_ascii=False,indent=2)
paths=sorted(here.rglob('*'));files=[]
for path in paths:
    if not path.is_file() or '__pycache__' in path.parts or path.name.startswith('PACKAGING-'):continue
    assert path.suffix in {'.json','.md','.ts','.py','.txt'},'Unexpected private artifact type'
    raw=path.read_bytes().replace(b'\r\n',b'\n');raw.decode('utf-8')
    for pattern in [rb'AKIA[0-9A-Z]{16}',rb'gh[pousr]_[A-Za-z0-9]{30,}',rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----']:
        assert not re.search(pattern,raw),'Secret pattern detected'
    if path.suffix=='.json':
        def walk(v):
            if isinstance(v,dict):
                assert not set(v)&{'observed_amount','raw_value','value_decimal','value_text','value_json'},'Private source value field'
                for child in v.values():walk(child)
            elif isinstance(v,list):
                for child in v:walk(child)
        walk(json.loads(raw))
    files.append({'path':path.relative_to(repo).as_posix(),'sha256_lf':hashlib.sha256(raw).hexdigest()})
protected=subprocess.check_output(['git','-C',str(repo),'diff','18823e5c691029d487ea2bcb480481919b8738b2','HEAD','--name-only','--','src','config','research-evidence','package.json'])
assert not protected,'Protected code changed'
manifest={'schema':'marefa-b02d-safe-package/1','normalization':'CRLF to LF','protected_code_unchanged':True,'private_docs_or_values_included':False,
    'source_root':'Outside Git; original PDFs and native DB capture remain private','files':files,
    'audit_dispositions':dict(Counter(r['audit_disposition'] for r in register['results']))}
with (here/('PACKAGING-'+a.version+'.json')).open('x',encoding='utf-8') as f:json.dump(manifest,f,indent=2)
print(json.dumps({'files':len(files),'protected_code_unchanged':True,'qualified':0,'withheld':142}))
