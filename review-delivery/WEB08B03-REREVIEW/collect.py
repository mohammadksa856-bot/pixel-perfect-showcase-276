"""Produce review metadata only. No financial values, original PDFs or grants are exported."""
from pathlib import Path
import json,hashlib,subprocess,urllib.request
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
OLD='dcdecad97c3c8babd67931a817e69d0cd7a7d6d6'
APP='1735609abafa85ee6e101ab7e3640496f0e43088'
DELIVERY='21847fdbd427af23a2b644aeeea92fa4fe9064b9'
def blob(ref,path):return subprocess.check_output(['git','show',ref+':'+path],cwd=ROOT)
def sha(data):return hashlib.sha256(data).hexdigest()
def write(name,data):
 (HERE/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
original=blob(OLD,'review-delivery/WEB08B03-INDEPENDENT/boundaries.test.ts')
assert original==(HERE/'boundaries.test.ts').read_bytes()
prior=json.loads(blob(OLD,'review-delivery/WEB08B03-INDEPENDENT/RESEARCH-SOURCE-REVIEW.json'))
claims=json.loads((ROOT/'review-delivery/WEB08B03/CLAIMS-REGISTER.json').read_text(encoding='utf8'))['claims']
rows=[]
for c in claims:
 old=next(x for x in prior['claims'] if x['claim_id']==c['id'])
 actual=c['sourceReview'];pages=old['independent_pdf_pages']
 adaptation=None
 if c['id']=='aramco-jafurah-midstream-contract':pages=[71];adaptation='Annual PDF231 mapped to the same note in stand-alone FY2025 PDF71; original source URL is the stand-alone document.'
 if c['id']=='aramco-rig-purchase-commitments':pages=[69];adaptation='Annual PDF229 mapped to the same note in stand-alone FY2025 PDF69; original source URL is the stand-alone document.'
 assert actual['status']==old['research_review'] and actual['reviewerPdfPages']==pages
 assert actual['reviewSha']==OLD and c['evidence']['page']==old['provided_page']
 assert not c['qualification']['publicationEligible'] and c['qualification']['status']=='WITHHELD'
 rows.append({'claim_id':c['id'],'prior_status':old['research_review'],'transferred_status':actual['status'],'prior_pdf_pages':old['independent_pdf_pages'],'transferred_pdf_pages':pages,'locator_basis_adaptation':adaptation,'engine_page_preserved':c['evidence']['page'],'review_sha':actual['reviewSha'],'gaps':c['qualification']['gaps'],'transfer_verdict':'PASS_NOT_NEW_ORIGINAL_VERIFICATION','financially_qualified':False})
assert len(rows)==22
write('CLAIM-TRANSFER-AUDIT.json',{'schema':'marefa-b03-source-transfer-audit/1','prior_review_sha':OLD,'application_sha':APP,'all22_dispositions_preserved':True,'document_specific_locator_adaptations':2,'new_source_verification_claimed_from_transfer':False,'rows':rows})
files=subprocess.check_output(['git','ls-files','research-evidence/aramco-disclosures'],cwd=ROOT,text=True).splitlines()
checked=[]
for path in files:
 if path.endswith('.md'):continue
 source=blob(APP,path);assert (ROOT/path).read_bytes()==source,path
 checked.append({'path':path,'implementation_sha256':sha(source)})
for name in ['CLAIMS-REGISTER','CONTRACT-BRIDGE','DISCLOSURE-EVENT-REGISTER','PROJECTS','RISK-GUIDANCE-REGISTER','TOPIC-MAP']:
 path='review-delivery/WEB08B03/'+name+'.json';source=blob(APP,path)
 assert (ROOT/path).read_bytes()==source,path
 checked.append({'path':path,'implementation_sha256':sha(source)})
images=json.loads((ROOT/'review-delivery/WEB08B03/screenshots/IMAGE_MANIFEST.json').read_text(encoding='utf8'))['images']
assert all(i['application_sha']==APP and sha((ROOT/'review-delivery/WEB08B03/screenshots'/i['path']).read_bytes())==i['sha256'] for i in images)
inputs=json.loads((ROOT/'review-delivery/WEB08B02/QUALIFIED-WITHHELD-INPUT-REGISTER-v4.json').read_text(encoding='utf8'))
assert len(inputs['results'])==142 and all(x['qualification']['state']=='WITHHELD' and not x['qualification']['publicationAuthorized'] for x in inputs['results'])
write('INTEGRITY.json',{'application_sha':APP,'delivery_sha':DELIVERY,'original_test_git_blob':'bc8ecb2b50a5f99b9506c711cc6ee06489e4ac84','original_test_sha256':sha(original),'original_test_bytes_unchanged':True,'source_and_six_outputs':checked,'author_images_rehashed':len(images),'B02_inputs_still_withheld':142,'B02_qualified':inputs['qualified_for_research'],'B02_display_approved':inputs['approved_for_display'],'author_files_changed_by_reviewer':False})
with urllib.request.urlopen('http://127.0.0.1:4454/?lang=en') as response:
 assert response.headers['X-Independent-Application-SHA']==APP
 write('HTTP-PROOF.json',{'url':response.url,'status':response.status,'application_header':response.headers['X-Independent-Application-SHA'],'csp':response.headers['Content-Security-Policy'],'robots':response.headers['X-Robots-Tag'],'cache':response.headers['Cache-Control'],'body_not_exported':True})
private=ROOT.parent/'web08b03-rereview-private-20261017'
release=private/'results-release-2025.pdf'
annual=ROOT.parent/'web08b03-private-20261017/annual-2025.pdf'
assert sha(annual.read_bytes())=='78bb678e8e45f5c58fa1b2402ab5a29c5ad10adfda8ba5e7ee5f4d1ad76cd227'
write('RESEARCH-DECISIONS.json',{'schema':'marefa-b03-research-followup/1','not_a_financial_or_editorial_approval':True,'no_B03_source_or_engine_record_changed':True,'originals_private':True,'decisions':[
 {'id':'BONUS_CAPITALISATION','status':'RELATION_SUPPORTED_MERGE_DEFERRED','basis':'Existing annual original PDF140 (printed138) visually rechecked; capitalization is linked to bonus grants. Exact contemporary dates/references still not established.','action':'Keep reciprocal relation and curated-group counting; do not certify two unique economic events or merge engine records.','annual_pdf_sha256':sha(annual.read_bytes())},
 {'id':'CAPITAL_INVESTMENT_GUIDANCE','status':'OFFICIAL_ALTERNATIVE_SOURCE_LOCATED_NOT_BOUND','official_web_url':'https://www.aramco.com/en/news-media/news/2026/fourth-quarter-and-full-year-press-release','official_pdf_url':'https://www.aramco.com/-/media/publications/corporate-reports/reports-and-presentations/2025/fy/saudi-aramco-fy-2025-results-press-release-english.pdf/','pdf_sha256':sha(release.read_bytes()),'pdf_page':1,'web_publication_date':'2026-03-10','existing_engine_record_date':'2026-03-09','action':'Issuer investment guidance found in different original. Do not inherit annual-document identity, backdate knowledge, treat investment guidance as actual capex, or unblock the claim. Trusted immutable binding and authorized review still required.'},
 {'id':'GAS_TARGET','status':'CONFLICT_CONFIRMED_WITHHOLD_PRESERVED','basis':'Existing annual original PDF13 visually rechecked; original uses approximation, not greater-than; qualifications identified in the prior review remain part of the full interpretation.','action':'Retain non-conflicting excerpt plus explicit unresolved conflict. Do not replace the engine text or claim financial qualification.','annual_pdf_sha256':sha(annual.read_bytes())}]})
print(json.dumps({'claims':len(rows),'original_tests_unchanged':True,'inputs_withheld':142,'images':len(images),'implementation_blobs':len(checked)}))
