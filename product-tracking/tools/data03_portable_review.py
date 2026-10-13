"""Rights-conscious review references; no full PDFs, pages or source quotations."""
import argparse,hashlib,json,subprocess,sys
from pathlib import Path
def digest(b):return hashlib.sha256(b).hexdigest()
def sanitize(v):
 if isinstance(v,dict):
  out={}
  for k,x in v.items():
   if k in ('quote','minimal_excerpt','minimal_quotes','excerpt','local_path','local_receipt','native_root','site_outbox_root','image_path_template','image_path','page_image_path'):
    out[k+'_reference_sha256']=digest(json.dumps(x,ensure_ascii=False,sort_keys=True).encode());out[k+'_redistributed']=False
   else:out[k]=sanitize(x)
  return out
 if isinstance(v,list):return [sanitize(x)for x in v]
 return v
def main():
 p=argparse.ArgumentParser();p.add_argument('--engine',required=True);a=p.parse_args();root=Path(a.engine);site=Path.cwd()
 out=site/'product-tracking/inbox/DATA03-current-engine-review-20261013-v1';out.mkdir(exist_ok=False)
 paths=[root/'output/DATA03-review-20261013/current-engine/review-and-merge.json',
  root/'output/DATA03-review-20261013/current-engine/previous215-groups.json',root/'output/DATA03-review-20261013/document-pins.json',
  root/'output/DATA03-financial-20261013-v2/receipt.json']
 paths+=list((root/'docs/audits').glob('DATA03*.json'))+list((root/'docs/audits').glob('D01*DATA03*.json'))
 originals=[]
 for path in paths:
  name=path.name if path.name!='receipt.json'else'FINANCIAL_LOCAL_RECEIPT.json'
  raw=path.read_bytes();data=sanitize(json.loads(raw))
  (out/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
  originals.append({'original_project_path':path.relative_to(root).as_posix(),'original_sha256':digest(raw),'portable_path':name,
    'redacted_source_quotations_and_local_paths':True,'not_a_byte_identical_original':True})
 (out/'ORIGINAL_REFERENCE_INDEX.json').write_text(json.dumps(originals,indent=2)+'\n',encoding='utf-8')
 request={'scope':'Codex current-engine local DATA03 review, not production approval',
  'source_delivery':'claude/data-02-batch-03@2d836f533582e4440c5b6ec3d5a9c5a90a042b11',
  'engine_local_head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),
  'decisions':{'batch01':{'ACCEPT_local':6,'REVIEW':33,'REJECT':1},'batch02':{'ACCEPT_local':37,'REVIEW':182,'REJECT':0},
               'batch03':{'ACCEPT_local':28,'REVIEW':165,'REJECT':0}},
  'API':'28new descriptive records; cumulative71. Six localfinancial records stored, value/extraction fallback withheld.',
  'requests':['Close previous215by evidence groups, do not resubmit duplicates','Use Shaker officialURLs/hash/pages; PDFs recovered locally, not absent data;49bindings not accuracy certificates',
   'Yamama totalCWIP not projectamount; preserve company standalone legal_entity scope, do not forceconsolidated',
   'Maaden Q3 and FY offering amounts are different documented vintages, do not infer250m event or FX conversions',
   'Resolve corporateevent dates, governance tenures, official classification andproduct mappings',
   'Review16numericcandidateobjects;1Yamama project remainsheld,22Maadenobjects not yet independentlyvisualreviewed'],
  'rights':'No fullPDFs or full-page images or source quotation redistribution in this package. OriginalpublicURLs and SHA/page pointers provided. ClassificationPrivate Alinma document not redistributed.',
  'blocked_access':'If cloudcannot accessofficialURLs, arrange rights-authorized controlledaccess; this bundle is NOT full-native-document access.',
  'prohibitions':['No main/AWS/Supabase/production/feature activation','No source quote orimport success asfinancialaccuracy proof','No weaker95gates']}
 (out/'CLAUDE_REVIEW_REQUEST.json').write_text(json.dumps(request,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 files=[{'path':f.name,'bytes':f.stat().st_size,'sha256':digest(f.read_bytes())}for f in sorted(out.iterdir())if f.is_file()]
 (out/'MANIFEST.json').write_text(json.dumps({'schema':'DATA03-rights-conscious-review/1','files':files,'financial_acceptance':False,'production_authorized':False},indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'files':len(files),'package':str(out),'PDF_or_image_redistributed':0}))
if __name__=='__main__':main()
