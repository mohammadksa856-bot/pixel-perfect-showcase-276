"""Build a metadata-only independent review index; originals stay private."""
from pathlib import Path
import json,hashlib,subprocess,re,datetime
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
PRIVATE=ROOT.parent/'web08b03-private-20261017'
sha=lambda b:hashlib.sha256(b).hexdigest()
claimfile=json.loads((ROOT/'review-delivery/WEB08B03/CLAIMS-REGISTER.json').read_text(encoding='utf8'))
reg=json.loads((ROOT/'review-delivery/WEB08B03/DISCLOSURE-EVENT-REGISTER.json').read_text(encoding='utf8'))
source_checks={
'aramco-capex-guidance-2026':('REVIEW',[], 'Guidance sentence/range not independently located in this annual PDF; no claim of falsity, needs exact original or release locator.'),
'aramco-sales-gas-growth-2030':('REWORK',[13,50,54], 'Engine quote strengthens approximately to greater-than and omits demand/pre-FID qualifications. Original PDF visually checked at13.'),
'aramco-msc-12mbd':('SUPPORTED_MEANING_NOT_APPROVED',[13,26], 'MSC capacity is distinct from actual production; original supports capacity, not a dated actual-output forecast.'),
'aramco-project-milestones-2025':('SUPPORTED_COMPOSITE_NOT_APPROVED',[13,15,54], 'Three separate project milestones summarized in one claim/event; not proof of one unique economic event. Actual capacities/timing exist in original.'),
'aramco-jafurah-midstream-contract':('SUPPORTED_MEANING_NOT_APPROVED',[231], 'Same note in FY2025 stand-alone PDF71, annual PDF231. Binding/locator still unqualified.'),
'aramco-rig-purchase-commitments':('SUPPORTED_WITH_DERIVATION_CAVEAT',[229], 'Stand-alone PDF69 visually inspected:18 remaining offshore explicit;36 onshore inferred from50 ordered less14 delivered, not an explicit count. Both currency magnitudes agree with source units.'),
'aramco-contingencies-ordinary-course':('SUPPORTED_MEANING_NOT_APPROVED',[230], 'PDF230 = printed228; note33, ordinary-course contingencies; not a quantified financial approval.'),
'aramco-contingencies-management-view':('SUPPORTED_MANAGEMENT_ESTIMATE_NOT_APPROVED',[230], 'Management expectation, not independently verified outcome.'),
'aramco-sadara-petro-rabigh-support':('SUPPORTED_MEANING_NOT_APPROVED',[230,231], 'Note33 spans two pages; no one aggregate amount should be inferred.'),
'aramco-customer-credit-concentration':('SUPPORTED_MEANING_NOT_APPROVED',[192], 'PDF192 = printed190, note3(a), credit-risk paragraph. Printed192 is another section; numbering basis must be explicit.'),
'aramco-hydrocarbon-risk-factors':('REVIEW',[], 'Composite risk summary has no exact original paragraph/locator; no accuracy certification from text match in engine.'),
'aramco-q4-2025-base-dividend':('SUPPORTED_MEANING_NOT_APPROVED',[235], 'Note37 supports board declaration; not actual payment. Original source publication time still not independently established.'),
'aramco-q4-2025-base-dividend-action':('SUPPORTED_MEANING_NOT_APPROVED',[235], 'Same declaration as disclosure; combining the two representations is reasonable, not two dividends.'),
'aramco-buyback-2026':('SUPPORTED_MEANING_NOT_APPROVED',[140,246], 'Approved program, not completed purchases; original explicitly dates approval and18-month term.'),
'aramco-buyback-2026-action':('SUPPORTED_MEANING_NOT_APPROVED',[140,246], 'Same program representation; no completed-execution assertion.'),
'aramco-fy2025-results-publication':('REVIEW',[34,36], 'Publication event metadata rather than numeric claim; full exact publication date requires official release/archive proof.'),
'aramco-fy2025-dividends-paid':('SUPPORTED_TITLE_NOT_NUMERIC_APPROVAL',[40,235], 'Annual paid distribution concept supported; no amount was independently approved here.'),
'aramco-petro-rabigh-stake-2025':('REWORK',[233], 'Acquisition discussed at PDF233/printed231, not supplied232 under either numbering basis. Completion announcement date not automatically legal effective date.'),
'aramco-bonus-2023':('REWORK',[140], 'PDF140/printed138 supports month and bonus; supplied139 points elsewhere, exact day unverified.'),
'aramco-capital-increase-2023':('REWORK',[140], 'Capitalization linked to bonus shares in original; distinguish record facets vs unique event; supplied139 wrong, exact day unverified.'),
'aramco-bonus-2022':('REWORK',[140], 'Same locator mismatch; original supports month, not exact effective day in this passage.'),
'aramco-capital-increase-2022':('REWORK',[140], 'Same locator mismatch; do not count as separately proven economic event.'),
}
rows=[]
for c in claimfile['claims']:
 decision,pages,reason=source_checks[c['id']]
 rows.append({'claim_id':c['id'],'source_url':c['evidence']['url'],'provided_page':c['evidence']['page'],'independent_pdf_pages':pages,'research_review':decision,'reason':reason,'financial_qualification':'WITHHELD','editorial_approval':False,'source_publication_time':'NOT_INDEPENDENTLY_ESTABLISHED'})
assert len(rows)==22 and len(source_checks)==22
docs=[]
old=json.loads((ROOT/'review-delivery/WEB08B02/FINANCIAL-EVIDENCE-REGISTER.json').read_text(encoding='utf8'))['documents']
for d in reg['documents']:
 item={'url':d['artifactUrl'],'editions':d['editions'],'in_snapshot':d['inEngineSnapshot'],'pdf_sha256':None,'verification':'METADATA_ONLY_NOT_ARCHIVED_IN_THIS_REVIEW'}
 if d['artifactUrl'].endswith('saudi-aramco-ara-2025-english.pdf'):
  item.update(pdf_sha256=sha((PRIVATE/'annual-2025.pdf').read_bytes()),verification='ORIGINAL_DOWNLOADED_PRIVATE_246_PAGES')
 for original in old:
  if original['url']==d['artifactUrl']:
   path=ROOT.parent/'web08b02-private-20261017'/(original['key']+'.pdf')
   digest=sha(path.read_bytes());assert digest==original['sha256']
   item.update(pdf_sha256=digest,verification='PRIVATE_ORIGINAL_REHASH_MATCH_B02')
 docs.append(item)
images=json.loads((ROOT/'review-delivery/WEB08B03/screenshots/IMAGE_MANIFEST.json').read_text(encoding='utf8'))['images']
assert all(sha((ROOT/'review-delivery/WEB08B03/screenshots'/im['path']).read_bytes())==im['sha256'] for im in images)
audit={'application_sha':'b72ad3a1c1a9d5bd43bfec78523aa287300a4639','delivery_sha':'1030fa883531f98fae899bd4f6a93733ecff6190','documents':docs,'claims':rows,'counts':{'documents':len(docs),'original_artifacts_rehashed':5,'claims_reviewed':len(rows),'claims_financially_qualified':0,'withheld':22,'events':len(reg['events']),'projects':5,'investor_topics':18,'author_images_rehashed':len(images)},'notes':['9 document rows include8 reports/editions and one exchange historical-report catalogue; not9 verified PDFs.','No real document identifiers or versions minted. New annual hash is reviewer evidence metadata, not a source version or rights certificate.','No publication dates certified from PDF creation metadata.','Source statements checked separately from exact engine-verbatim quote matching.','User commercial authorization remains recorded; third-party rights evidence remains distinct; no renewed user authorization requested.']}
(HERE/'RESEARCH-SOURCE-REVIEW.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
# Preserve raw failed assertions privately; publish only case status, stack and counts, not register payloads.
log=HERE/'runs/independent.txt'
raw=log.read_bytes();(PRIVATE/'independent-raw.txt').write_bytes(raw)
text=raw.decode('utf8')
safe=[line for line in text.splitlines() if line.startswith('{"id"') or line.startswith('(pass)') or line.startswith('(fail)') or re.match(r'^ (?:\d+ (?:pass|fail|skip|expect))',line) or line.startswith('Ran ')]
log.write_text('\n'.join(safe)+'\nRaw assertion payload kept private; SHA256 '+sha(raw)+'\n',encoding='utf8')
lf=Path(str(ROOT).replace('web08b03-independent','web08b03-lf'))
checked=[]
for path in subprocess.check_output(['git','ls-files','research-evidence/aramco-disclosures','review-delivery/WEB08B03/*.json'],cwd=ROOT,text=True).splitlines():
 blob=subprocess.check_output(['git','show','1030fa8:'+path],cwd=ROOT)
 data=(lf/path).read_bytes();assert data==blob,path
 checked.append({'path':path,'sha256':sha(data)})
(HERE/'SOURCE-BLOB-INTEGRITY.json').write_text(json.dumps(checked,indent=2)+'\n',encoding='utf8')
print(json.dumps(audit['counts']))
