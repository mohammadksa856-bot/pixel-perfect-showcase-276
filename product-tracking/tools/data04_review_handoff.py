"""Publish review evidence only, no native documents or execution permissions."""
import hashlib,json,subprocess,sys
from pathlib import Path
from datetime import datetime,timezone
SITE=Path(__file__).resolve().parents[2];ROOT=SITE.parent/'marefa-unified-20261012'
sys.path.insert(0,str(SITE/'product-tracking/tools'))
from data03_portable_review import sanitize

def main():
    out=SITE/'product-tracking/inbox/DATA04-current-engine-review-20261013-v1';out.mkdir(exist_ok=False)
    paths=[ROOT/'output/DATA04-review-20261013/current-engine/review-and-merge.json',
           ROOT/'output/DATA04-review-20261013/native-diagnostics.json',
           ROOT/'output/DATA04-review-20261013/batch03-continuation.json',
           ROOT/'output/DATA04-review-20261013/official-announcements/receipt.json']
    paths+=sorted((ROOT/'docs/audits').glob('BR011*.json'))
    originals=[]
    for p in paths:
        raw=p.read_bytes();name=p.name if p.name!='receipt.json' else 'OFFICIAL_ANNOUNCEMENT_ACCESS_RECEIPT.json'
        data=sanitize(json.loads(raw));target=out/name
        target.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        originals.append(dict(original_project_path=p.relative_to(ROOT).as_posix(),original_sha256=hashlib.sha256(raw).hexdigest(),
                              portable_path=name,not_byte_identical=True,full_source_redistributed=False))
    (out/'ORIGINAL_REFERENCE_INDEX.json').write_text(json.dumps(originals,indent=2)+'\n',encoding='utf-8')
    request=dict(schema='BR011-Codex-review-request/1',source_delivery='claude/data-02-batch-04@8590888441c2c307b00c4983c006fe5627c94003',
                 local_engine_head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
                 historical_sources_unchanged=True,production_authorization=False,feature_activation=False,
                 API_sample_is_execution_command=False,import_authorization=False,
                 decisions={'reviewed_old_records':216,'new_local_descriptive_accept':12,'remaining_review':203,'preserved_reject':1,
                            'cumulative_API_descriptive':83,'total_remaining_domain_review':368,'financial_cells_display_held':6},
                 requests=['Confirm fetch and commit; local backend not uploaded as remote engine code.',
                           'Review 169 individual mappings;51 identity-only accepted,117 aliases held,1 mapping rejected; no canonical coalescing.',
                           'Keep all source evidence and as-of data visible; no numerical/independent certification from quotations.',
                           'Maintain Dallah chairman hold, seven Dar investee identities, STC policy vs actual separation.',
                           'ALBA published_at is not completion date: keep unknown official_known_at, distinct event dates and seller/buyer amounts.',
                           'Official supplied company16-20 URLs are blocked502/403 here; cached Nahdi document is2023, not2025. Request authorized native files, no bypass.',
                           'Maaden22:19 source-only,2 REVIEW,1 period REJECT; not canonical admissions.'],
                 missing_source_request=['4340: FY2025 fund annual report/auditedFS, terms, manager/board and valuation reports',
                                         '4140/4260/9510/4164: FY2025 audited completeFS and dated board reports',
                                         '9510: applicable official Nomu rules; do not automatically demand quarterly disclosures'],
                 observed_at=datetime.now(timezone.utc).isoformat())
    (out/'CLAUDE_REVIEW_REQUEST.json').write_text(json.dumps(request,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    files=[dict(path=f.name,bytes=f.stat().st_size,sha256=hashlib.sha256(f.read_bytes()).hexdigest()) for f in sorted(out.iterdir()) if f.is_file()]
    (out/'MANIFEST.json').write_text(json.dumps(dict(schema='DATA04-rights-conscious-review/1',files=files,
                                                   financial_acceptance=False,production_authorized=False,PDFs_or_images_redistributed=0),indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'files':len(files),'package':str(out),'source_documents_redistributed':0}))

if __name__=='__main__':main()
