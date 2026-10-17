"""Build review metadata from source identities and actual run logs; never source financial values."""
from pathlib import Path
import json,hashlib,re,subprocess,datetime
HERE=Path(__file__).parent;ROOT=HERE.parents[1]
def read(p):return json.loads(p.read_text(encoding='utf8'))
def emit(name,obj):(HERE/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
notes=read(HERE/'RESEARCH-NOTES.json'); em=read(ROOT/'review-delivery/WEB08B04/EVIDENCE-MAP.json')
rows=[]
for i,p in enumerate(em['paragraphs'],1):
 note=notes['paragraphs'].get(p['id'],notes['other_paragraphs'].get(p['id']))
 if not note:note={'gap':'Gap transparently disclosed; not filled or considered complete. No new blocker identified in this paragraph.','methodology':'Methodology pending approval; not a review certificate or financial output.','reported_record':'Engine-only wording/source identity inspected; original locators not all independently verified. Retain WITHHELD, not a fresh source certification.','management_plan':'Issuer plan not actual result. Preserve withholding, original-source/version/date verification still required.','assumption':'Explicit unapproved assumption, not factual outcome.','scenario':'Explicit qualitative unapproved scenario; not a forecast or verified effect.'}.get(p['kind'],'REVIEW_REQUIRED')
 rows.append({'ordinal':i,'id':p['id'],'kind':p['kind'],'status_preserved':p['status'],'evidence_refs':[e['ref'] for e in p['evidence']],'evidence_classes':sorted(set('TRANSFERRED_REVIEW_NOT_NEW_ORIGINAL_CHECK' if e['ref']['t']=='external_review' else 'B03_WITHHELD_SOURCE_REVIEW_TRANSFER' if e['ref']['t'].startswith('b03') else 'ENGINE_OR_REGISTER_ONLY_NOT_ORIGINAL_VALIDATION' for e in p['evidence'])),'research_review':note,'disposition':'REWORK' if note.startswith('REWORK') else 'REVIEW' if note.startswith('REVIEW') else 'NO_NEW_BLOCKER_IDENTIFIED_LIMITED_SCOPE','financial_qualification':False})
assert len(rows)==99 and sum(r['kind']=='research_interpretation' for r in rows)==33
assert all(r['id'] in notes['paragraphs'] for r in rows if r['kind']=='research_interpretation')
emit('PARAGRAPH-REVIEW.json',{'count':99,'interpretations':33,'not_a_blanket_accuracy_certificate':True,'rows':rows})
refs={json.dumps(e['ref'],sort_keys=True):e for p in em['paragraphs'] for e in p['evidence']}
emit('EVIDENCE-REVIEW.json',{'paragraphs':99,'unique_refs':len(refs),'resolved_is_not_supported':True,'entries':[{'ref':e['ref'],'source':e['source'],'status':e['status'],'assessment':'Metadata resolution only; no independent source/reviewer approval inferred. Preserve individual B03 source-review gaps.'} for e in refs.values()]})
runs=[]
for p in sorted((HERE/'runs').glob('*.txt')):
 text=p.read_text(encoding='utf8');meta=json.loads(text.splitlines()[0]);counts={k:int(m.group(1)) if (m:=re.search(r'\b(\d+) '+k+r'\b',text)) else 0 for k in ['pass','fail','skip']}
 runs.append({**meta,**counts,'artifact':'runs/'+p.name})
emit('RESULTS.json',{'decision':'REWORK','application_sha':'2685d944f25b8dc3ef8d63147fded0d81551bef9','tested_delivery_sha':'c0c506f68bb72e528136e6b09ec58845b319db8a','code_identity':'git diff implementation..delivery contains documentation/evidence only; no application code difference','runs':runs,'analyses_blocked':7,'claims_withheld':22,'financial_inputs_withheld':142,'financially_qualified':0,'USER_FINAL_ACCEPTANCE':False,'PRODUCTION_RELEASE_APPROVAL':False,'scope':'Independent engineering and research review; not official financial signoff'})
emit('ENVIRONMENT-ATTEMPTS.json',{'initial_sandbox_runs':[{'suite':'B04','pass':26,'fail':2,'reason':'localhost fetch EACCES, environment restriction, not application assertion failure'},{'suite':'B03','pass':55,'fail':2,'reason':'same localhost EACCES'}],'rerun':'Same unmodified tests with localhost permission: B04 28PASS, B03 57PASS. Initial console output retained in conversation; final raw logs contain authorized rerun.'})
withheld=read(ROOT/'review-delivery/WEB08B02/QUALIFIED-WITHHELD-INPUT-REGISTER-v4.json')
assert len(withheld['results'])==142 and all(r['qualification']['state']=='WITHHELD' and not r['qualification']['publicationAuthorized'] for r in withheld['results'])
scope_log=(ROOT/'review-delivery/WEB08B04/test-logs/scope-and-hashes.txt').read_text(encoding='utf8')
checked=[]
for digest,name in re.findall(r'^([a-f0-9]{64})  (.+)$',scope_log,re.M):
 actual=hashlib.sha256((ROOT/'review-delivery/WEB08B04'/name).read_bytes()).hexdigest();assert actual==digest,name
 checked.append({'path':name,'sha256':actual,'verified':True})
emit('DELIVERY-HASHES.json',{'documents':checked,'withheld_rows_individually_checked':142,'unblocked':0})
emit('INTEGRITY.json',{'original15_blob':subprocess.check_output(['git','hash-object',str(HERE/'boundaries.test.ts')],cwd=ROOT,text=True).strip(),'expected_blob':'bc8ecb2b50a5f99b9506c711cc6ee06489e4ac84','application_changes_by_reviewer':False,'protected_diff':subprocess.check_output(['git','diff','--name-only','2685d944f25b8dc3ef8d63147fded0d81551bef9','HEAD','--','src','config','research-evidence','tests'],cwd=ROOT,text=True).strip(),'no_original_documents_in_package':True})
emit('MANIFEST.json',{'schema':'independent-review-code-only/1','excludes':['MANIFEST.json','private originals','PDFs','raw engine values','screenshots'],'files':[{'path':p.relative_to(HERE).as_posix(),'sha256':hashlib.sha256(p.read_bytes().replace(b'\r\n',b'\n')).hexdigest()} for p in sorted(HERE.rglob('*')) if p.is_file() and p.name!='MANIFEST.json']})
print(json.dumps({'paragraphs':len(rows),'interpretations':33,'refs':len(refs),'runs':len(runs)}))
