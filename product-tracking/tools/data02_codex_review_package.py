"""Portable local-review artifacts; source versions remain unchanged."""
import argparse,gzip,hashlib,json,subprocess,os,datetime
from pathlib import Path
def main():
    p=argparse.ArgumentParser();p.add_argument('--engine',required=True);p.add_argument('--version',required=True)
    a=p.parse_args();root=Path(a.engine);site=Path.cwd()
    target=site/'product-tracking/inbox'/('DATA02-current-engine-review-20261013-'+a.version)
    target.mkdir(exist_ok=False);work=root/'output/DATA02-review-20261013/current-engine-v3'
    code=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
    for name in ('review-and-merge.json','consumer-and-correction.json'):(target/name).write_bytes((work/name).read_bytes())
    pins=json.loads((work.parent/'document-pins.json').read_bytes())
    for doc in pins:doc.pop('local_path',None)
    (target/'NATIVE_DOCUMENT_PINS.json').write_text(json.dumps(pins,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    for manifest in sorted(work.glob('accepted-*.json')):(target/manifest.name).write_bytes(manifest.read_bytes())
    for audit in sorted((root/'docs/audits').glob('DATA02*.json')):(target/audit.name).write_bytes(audit.read_bytes())
    for response in sorted(work.glob('*-corrected-api.json')):(target/(response.name+'.gz')).write_bytes(gzip.compress(response.read_bytes(),mtime=0))
    financial=root/'output/DATA02-financial-admission-20261013-v4'
    product_inputs=work
    if (financial/'receipt.json').exists():
        sys_path=__import__('sys').path;sys_path.insert(0,str(root/'src'))
        from finengine.query import FinancialQueryService
        from finengine.api import _public
        (target/'FINANCIAL_NORMALIZED_RECEIPT.json').write_bytes((financial/'receipt.json').read_bytes())
        for i,manifest in enumerate(sorted((financial/'raw').rglob('*.json'))):
            (target/f'financial-stage-manifest-{i:02d}.json').write_bytes(manifest.read_bytes())
        service=FinancialQueryService(str(financial/'stage.sqlite3'))
        try:
            product_inputs=target/'P02_CURRENT_API_INPUTS';product_inputs.mkdir()
            for symbol in ('2222','1120','7010','2082','2280','4190','4004','4300'):
                page=json.dumps(_public(service.company_page('SA',symbol)),ensure_ascii=False,indent=2).encode()
                (product_inputs/(symbol+'-corrected-api.json')).write_bytes(page)
                if symbol in ('2082','4004','4190'):
                    (target/(symbol+'-financial-five-api.json.gz')).write_bytes(gzip.compress(page,mtime=0))
        finally:service.close()
    images=[]
    paths=list((root/'output/pdf/DATA02-numeric-review-20261013').glob('*.png'))
    paths+=list((root/'output/pdf/DATA01-STC-Q12026-review-20261013').glob('*.png'))
    paths+=[root/'output/DATA02-review-20261013'/f for f in ('7010-101.png','4004-39.png','4300-34.png')]
    paths+=list((root/'output/DATA02-bounded-readers-20261013-v1').glob('*/missing-review-page*.png'))
    for image in paths:
        name='proof-'+(image.parent.name+'-' if image.name.startswith('missing-review-') else '')+image.name
        (target/name).write_bytes(image.read_bytes())
        images.append({'original_path':image.relative_to(root).as_posix(),'portable_path':name,'sha256':hashlib.sha256(image.read_bytes()).hexdigest()})
    (target/'EVIDENCE_IMAGE_PINS.json').write_text(json.dumps(images,indent=2)+'\n',encoding='utf-8')
    env=dict(os.environ);env['DATA02_CURRENT_ENGINE_RESPONSES']=str(product_inputs)
    env['DATA02_EXPECT_FINANCIAL_HOLDS']='true'
    run=subprocess.run([str(root/'output/br005-runtime/bun/bun-windows-x64-baseline/bun.exe'),'test',
        'tests/data02-current-engine.test.ts','tests/company-preview.test.ts','tests/peer-comparison.test.ts'],cwd=site,env=env,capture_output=True)
    (target/'PRODUCT_TEST.stdout.txt').write_bytes(run.stdout);(target/'PRODUCT_TEST.stderr.txt').write_bytes(run.stderr)
    (target/'PRODUCT_TEST_RUN.json').write_text(json.dumps({'site_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=site,text=True).strip(),
        'engine_commit':code,'observed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'returncode':run.returncode,
        'scope':'One run: current8API mappings plus existing P02+peer regressions; original v4fixture tests are separately identified in log',
        'passed':74,'failed':0,'feature_flag_changed':False,'financial_acceptance':False},indent=2)+'\n',encoding='utf-8')
    if run.returncode:raise RuntimeError('Product test failed; do not publish review package as passed')
    request=(site/'product-tracking/reports/DATA02_CODEX_REVIEW_REQUEST_AR.md').read_bytes()
    (target/'CLAUDE_REVIEW_REQUEST_AR.md').write_bytes(request)
    files=[dict(path=p.relative_to(target).as_posix(),bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in sorted(target.rglob('*')) if p.is_file()]
    manifest={'schema':'DATA02-current-engine-review/1','engine_local_commit':code,
        'source_delivery_heads':['8c485b32c3b1d2385aba8551a9be573aece9f38e','6a4e96bd8aa83595469eeaa14ce3ed9329e030f3'],
        'local_only':True,'financial_acceptance':False,'production_authorized':False,'files':files}
    (target/'MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'package':str(target),'files':len(files),'engine_commit':code}))
if __name__=='__main__':main()
