"""Prepare an evidence ledger only. Never writes the engine or a financial qualification."""
from pathlib import Path
from datetime import datetime, timezone
import gzip, hashlib, json, sqlite3

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
ENGINE = ROOT.parents[1] / 'aramco95-engine-b70254e'
ANNUAL_HASH = '78bb678e8e45f5c58fa1b2402ab5a29c5ad10adfda8ba5e7ee5f4d1ad76cd227'
ANNUAL = ENGINE / f'data/raw/SA/2222/documents/{ANNUAL_HASH}.pdf'
URL = 'https://www.aramco.com/-/media/publications/corporate-reports/reports-and-presentations/2025/fy/saudi-aramco-ara-2025-english.pdf'
FIXTURE = ROOT / 'tests/fixtures/codex-20261013/2222-page.json.gz'
assert hashlib.sha256(ANNUAL.read_bytes()).hexdigest() == ANNUAL_HASH
stamp = datetime.now(timezone.utc).isoformat()
raw = json.loads(gzip.decompress(FIXTURE.read_bytes()))
profile = raw['sections']['profile']
dbfile = ENGINE / 'data/financial.sqlite3'
db_before = hashlib.sha256(dbfile.read_bytes()).hexdigest()
db = sqlite3.connect(dbfile.as_uri() + '?mode=ro', uri=True)
db.row_factory = sqlite3.Row
catalog = {r['field_key']:dict(r) for r in db.execute("SELECT * FROM data_catalog_fields WHERE category='company_model' AND enabled=1")}
attrs = {r['attribute_key']:dict(r) for r in db.execute("SELECT * FROM company_attributes WHERE company_id='sa:2222' AND is_current=1")}
# Exact planning scope: the 21 rendered TextFact keys intersected with original company_model catalog.
shown = ['legal_name','legal_name_ar','isin','listing_date','legal_form','founding_date','headquarters_address','reporting_standard','website','investor_relations_url','business_description_ar','business_description','products_services','business_segments','geographic_presence','subsidiaries_count','ceo_name','chairman_name','auditor','employees','credit_rating']
keys = [k for k in shown if k in catalog]
assert len(keys) == 19

# Source observations are preparer findings, never authority grants or cross-review approvals.
specs = {
 'legal_name':(1,[140,179],'Saudi Arabian Oil Company','الاسم القانوني الإنجليزي، لا اسم العلامة التجارية.','MATCHED_DIRECT','الاسم الرسمي ظاهر في المعلومات القانونية والإيضاح1؛ لا تاريخ بدء للاسم مثبت هنا.',None),
 'legal_name_ar':(1,[],'شركة الزيت العربية السعودية','الاسم الكامل العربي كما يسميه المُصدر، لا الاسم المختصر.','MATCHED_WEB_CURRENT_ONLY','FAQ يؤيد الاسم؛ تاريخ نشر الصفحة ونسختها التاريخية غير مثبتين.',None),
 'isin':(1,[],'SA14TG012N13','معرف السهم الدولي؛ لا رمز تداول2222.','MATCHED_WEB_CURRENT_ONLY','FAQ الرسمي يؤيد ISIN؛ لا يُنسب تلقائيًا إلى لقطةFY2025.',None),
 'listing_date':(1,[140,179],'2019-12-11','تاريخ إدراج الأسهم العادية في السوق السعودية.','MATCHED_DIRECT','يُفصل الإدراج عن تأسيس الكيان وعن بداية النشاط.','2019-12-11'),
 'legal_form':(1,[140,179],'Saudi joint stock company','الشكل النظامي بعد التحول إلى شركة مساهمة سعودية.','MATCHED_DIRECT','التحول نافذ2018-01-01؛ لا يُخلط بتاريخ السجل التجاري2018-03-28.','2018-01-01'),
 'founding_date':(1,[140,179],{'history_origin':'1933-05-29','legal_entity_formed':'1988-11-13'},'سنة بداية التاريخ التشغيلي؛ ليست تاريخ تأسيس الكيان القانوني الحالي.','DEFINITION_REVIEW_REQUIRED','قيمة1933 مؤيدة للتاريخ السابق للشركة؛ يلزم تثبيت معنى founding_date وعدم تحويلها إلى incorporation_date.',None),
 'headquarters_address':(1,[140],'P.O. Box 5000, Dhahran 31311, Kingdom of Saudi Arabia','عنوان المقر المسجل/البريدي؛ لا عنوان مكتب المراجع.','MATCHED_DIRECT','العنوان مقروء بصريًا فيPDF140 رغم سقوط جزء منه في استخراج النص؛ موقع جهات الاتصال يؤيده حاليًا.',None),
 'reporting_standard':(1,[164,180],'IFRS endorsed in the Kingdom and other SOCPA standards and pronouncements','أساس إعداد القوائم الموحدة للسنة2025؛ لا شهادة امتثال لكل بيانات الموقع.','MATCHED_DIRECT','الإيضاح2(a) ورأي المراجع يحددان الأساس؛ التقرير يذكر أيضًا الامتثال لـIFRS الصادرة عنIASB.',None),
 'website':(1,[3],'www.aramco.com/en','نطاق الموقع الرسمي؛ الاختلاف بينwww والجذر ومسار اللغة تطبيع عنوان.','MATCHED_NORMALIZED_URL','النطاق مثبت بالتقرير وفتح الصفحة الرسمية؛ ليس رابطًا مؤرخًا صالحًا لكل الأزمنة.',None),
 'investor_relations_url':(1,[],'https://www.aramco.com/en/investors','صفحة المستثمرين الرسمية، لا تقرير مالي بعينه.','MATCHED_WEB_CURRENT_ONLY','صفحة المستثمرين فُتحت فعليًا؛ نشرها وتاريخ صلاحيتها في2025 غير مثبتين.',None),
 'business_description':(2,[8,9],'Upstream and Downstream supported by Corporate functions','ملخص عرض للنشاط والتكامل، وليس اقتباسًا حرفيًا أو عدد قطاعات بديلًا للإيضاحات.','SOURCE_SUPPORTED_PARAPHRASE','أقرب نص عن تكامل الشركة فيPDF8 وعن القطاعين ودعمCorporate فيPDF9. globally integrated ليست اقتباسًا عن الشركة منPDF57؛ نص المحرك إعادة صياغة يحتاج مراجعة تحريرية.',None),
 'products_services':(2,[18,50,56,66],['upstream hydrocarbons','refined products','chemicals','base oils','lubricants','retail','supply and trading','power generation'],'قائمة أنشطة/منتجات مركبة؛ تشمل أنشطة وأعمالًا تابعة واستثمارات، لا قائمة مبيعات مستقلة لكل منتج.','COMPOSITE_REVIEW_REQUIRED','السرد والرسوم يؤيدان الأنشطة؛ لا تفترض تساوي نطاق كل بند أو اكتمال القائمة. لا أرقام مبيعات مشتقة.',None),
 'geographic_presence':(2,[16,20],{'bound':'more_than','value':50,'unit':'countries_of_operations'},'عدد بلدان العمليات بحد أدنى معلن؛ لا عدد الشركات أو الأسواق المصدّر إليها.','MATCHED_BOUND_AND_SCOPE','+50 لا تعني50 بالضبط؛ خريطة العمليات مؤرخة كما في2025-12-31.',None),
 'subsidiaries_count':(2,[16],{'bound':'more_than','value':400,'includes':['subsidiaries','joint arrangements','associates']},'المفتاح يوحي بعدد الشركات التابعة وحدها، بينما المصدر يجمع ثلاثة أنواع علاقات.','DEFINITION_CONFLICT','لا يصلح+400 كعدد مستقل للتابعات. قيمة المحركminimum400 لا تحفظ صراحة حد>400 ولا يجوز احتسابها قيمة دقيقة.',None),
 'ceo_name':(3,[12,176],'Amin H. Nasser','اسم الرئيس وكبير الإداريين التنفيذيين ضمن سياق التقرير؛ لا تاريخ تعيين جديد.','MATCHED_DIRECT','الاسم والصفة مثبتان؛ لا دليل هنا على استمرار المنصب بعد تاريخ التقرير.',None),
 'chairman_name':(3,[10,176],'Yasir O. Al-Rumayyan','اسم رئيس مجلس الإدارة ضمن سياق التقرير؛ لا جميع مناصبه الأخرى.','MATCHED_DIRECT','الاسم والصفة مثبتان؛ صلاحية حالية بعد التقرير تحتاج رصدًا منفصلًا.',None),
 'auditor':(3,[164,173],{'firm':'PricewaterhouseCoopers','signatory':'Omar M. Al Sagga','licence':'369','report_date':'2026-03-09'},'مراجع القوائم الموحدة2025 وموقع تقرير المراجعة، لا مراجع كل معلومات التقرير غير المالية.','MATCHED_WITH_ABBREVIATION','المحرك يختصر اسم الموقع دون الحرفM؛ لا تُمدد مهمة مراجعة2025 تلقائيًا إلى سنوات لاحقة.',None),
 'employees':(3,[16,76],{'value':76664,'scope':'Saudi Arabian Oil Company (the Company)','year':2025,'period':'FY2025','measurement_basis':'NOT_STATED'},'عدد موظفي الشركة الأم في عمود2025؛ PDF16 حاشية4 تحيل إلىالاستدامة وPDF76 حاشية6 تحدد نطاق الشركة الأم، لا المجموعة أو المقاولين.','MATCHED_VALUE_SCOPE_REQUIRED','PDF16 حاشية4 إحالة وليست تعريف النطاق؛ حاشيتها6 عن طاقة الكيماويات. فيPDF76 حاشية6 للموظفين، وحاشية1 لمؤشرات السلامة أوسع نطاقًا. لم يُحدد هل العدد نهاية السنة أو متوسطًا، ولا يُختلق تاريخ رصيد.',None),
 'credit_rating':(16,[37],{'moodys':{'long_term':'Aa3','outlook':'Stable','short_term':'P-1'},'fitch':{'long_term':'A+','outlook':'Stable','short_term':'F1+'}},'تصنيفات المُصدر كما نقلها التقرير عن الوكالتين، لا تقييم استثماري من معرفة.','MATCHED_ISSUER_REPORTED_ONLY','لم تُفتح إعلانات الوكالتين الأصلية أو تراخيص بياناتهما؛ لا ادعاء أحدث تصنيف في2026.',None),
}
web = {
 'FAQ':('https://www.aramco.com/ar/investors/investor-faq','الأسئلة المتعلقة بالإدراج في تداول: ISIN والاسم الكامل', 'Official issuer FAQ; live response observed2026-10-18'),
 'CONTACTS':('https://www.aramco.com/en/global-contacts','Aramco Global > Dhahran','Official issuer contacts; no personal contact data copied'),
 'INVESTORS':('https://www.aramco.com/en/investors','Investor overview page heading and canonical URL','Official investors landing page opened'),
 'HOME':('https://www.aramco.com/en','Official website page and canonical URL','Official home page opened'),
}
sources=[dict(source_id='ANN2025',id_namespace='LOCAL_LEDGER_NOT_ISSUER_DOCUMENT_ID',kind='official_annual_report',url=URL,artifact_sha256=ANNUAL_HASH,byte_size=ANNUAL.stat().st_size,pages=246,language='en',publication_date=None,publication_date_precision='NOT_ESTABLISHED_INDEPENDENTLY',financial_statements_approval_date='2026-03-09',engine_filed_at_claim='2026-03-09',reporting_period_end='2025-12-31',inspection='Original bytes hash verified; selected full pages rendered/read locally',original_redistribution_authorized=False,rights_status='UNRESOLVED_NO_GRANT_ISSUED')]
for key,(url,locator,note) in web.items():
 sources.append(dict(source_id=key,id_namespace='LOCAL_LEDGER_NOT_ISSUER_DOCUMENT_ID',kind='official_live_web',url=url,locator=locator,observed_date='2026-10-18',observation_precision='day',publication_date=None,artifact_sha256=None,byte_size=None,archive_status='NO_ORIGINAL_RESPONSE_BYTES_CAPTURED',inspection=note,rights_status='UNRESOLVED_NO_GRANT_ISSUED'))

records=[]
for i,k in enumerate(keys,1):
 assert json.loads(attrs[k]['value_json']) == profile[k]['value'], 'Fixture versus snapshot value conflict: '+k
 topic,pages,source_value,definition,state,note,known_from=specs[k]
 source_ids=['FAQ'] if k in ('legal_name_ar','isin') else ['INVESTORS'] if k=='investor_relations_url' else ['ANN2025']
 if k=='headquarters_address':source_ids.append('CONTACTS')
 if k=='website':source_ids.append('HOME')
 locators=[dict(source_id='ANN2025',pdf_page=n,printed_page=n-2,section={8:'At a glance: integrated energy and chemicals company',9:'Our integrated operations: Upstream/Downstream supported by Corporate',140:'Additional legal information > Aramco',179:'Note1 General information',180:'Note2(a) Basis of preparation',173:'Independent auditor signature',164:'Independent auditor opinion',76:'Safe operations and people development, employee table and footnote6',37:'High investment-grade rating table',16:'Business model inputs and scope footnotes',20:'Countries of operations map',10:'Chairman message',12:'President & CEO message',176:'Consolidated balance sheet/signatures',18:'Integrated value chain',50:'Upstream',56:'Downstream',66:'Corporate',3:'Contents and online report URL'}.get(n,'Report section')) for n in pages]
 locators += [dict(source_id=x,heading=web[x][1]) for x in source_ids if x in web]
 if topic in (2,3,16):overview_state='RENDERED_IN_FROZEN_MODEL'
 else:overview_state='NOT_RENDERED_AS_DISTINCT_FIELD'
 tab={1:'business',2:'business',3:'shareholders',16:'risks'}[topic]
 topic_key={1:'identity',2:'business',3:'governance',16:'risks'}[topic]
 records.append(dict(record_id=f'QB1-NF-{i:02}',record_id_namespace='LOCAL_WORKPAPER_NOT_ENGINE_FACT_ID',original_field_id=k,company_id='sa:2222',original_engine_value=profile[k]['value'],source_observation_value=source_value,definition_ar=definition,
  factory_category=dict(key='company_profile',ordinal=1,weight=8,field_group='company_model'),investor_topic=dict(ordinal=topic,key=topic_key,not_factory_category=True),
  engine_reference=dict(engine_commit='b70254e463c18e893fd042a82ecdad78209384d6',attribute_id=attrs[k]['id'],attribute_version=attrs[k]['version'],source_key=attrs[k]['source_key'],effective_at=attrs[k]['effective_at'],original_artifact_sha256_in_engine=None),
  evidence=dict(source_ids=source_ids,locators=locators,status=state,preparer_source_check=True,site_presence_is_source_proof=False,original_artifact_sha256=ANNUAL_HASH if 'ANN2025' in source_ids else None),
  dates=dict(engine_effective_at=attrs[k]['effective_at'],source_reporting_period_end='2025-12-31' if 'ANN2025' in source_ids else None,information_as_of='2025-12-31' if k=='geographic_presence' else None,as_of_basis='FY2025 report context; no blanket December31 date imposed on names/ratings/URLs' if 'ANN2025' in source_ids else 'Live web observation only; no backdating to2025',known_event_or_valid_from=known_from,valid_until=None,valid_until_reason='No evidence establishing termination or continuing validity',source_publication_date=None,observed_date='2026-10-18'),
  freshness=dict(contract_max_age_days=365,state='HISTORICAL_CONTEXT_CURRENTNESS_NOT_CERTIFIED' if 'ANN2025' in source_ids else 'OBSERVED_WEB_CURRENT_PUBLICATION_TIME_UNKNOWN',historical_age_alone_invalidates_value=False,independent_source_retrieval_does_not_rewrite_publication_date=True),
  display=dict(overview=dict(state=overview_state,route='/preview/web-v1/companies/2222/overview',component='buildOverview: description/businessFacts/governance/risks; identity not copied as a separate overview block'),investor=dict(state='RENDERED_IN_FROZEN_MODEL',route=f'/preview/web-v1/companies/2222/intelligence?topic={topic_key}&focus={k}',topic=topic),data=dict(state='RENDERED_IN_FROZEN_MODEL',route=f'/preview/web-v1/companies/2222?tab={tab}',tab=tab,exact_field_focus_supported=False),verification_scope='CODE_AND_FROZEN_MODEL_MAPPING_ONLY_NOT_BROWSER_OR_LIVE_QUALIFIED'),
  approval=dict(prepared_by='Codex',independent_cross_review='PENDING_NOT_SELF_ACCEPTED',financial_approval=False,rights_grant='UNKNOWN_NO_GRANT_ISSUED',publication_authorized=False,qualification='WITHHELD_PENDING_CROSS_REVIEW_AND_REQUIRED_AUTHORITY'),issues=[note,'Engine source hash is an import JSON digest, not this annual PDF digest; use independent locators, not an inherited page number.'],next_action='Cross-review definition, scope, source/date and rights; no engine write or publication from this workpaper'))
 if k=='employees':
  records[-1]['dates'].update(period='FY2025',measurement_basis='NOT_STATED',as_of_basis='2025 column only; neither year-end nor average measurement specified')
  for loc in records[-1]['evidence']['locators']:
   loc.update(footnote=4 if loc['pdf_page']==16 else 6,role='cross_reference_to_sustainability' if loc['pdf_page']==16 else 'employee_scope_company_only')
 if k=='business_description':records[-1]['evidence']['representation']='PARAPHRASE_NOT_DIRECT_QUOTATION'
 if k=='products_services':
  # Preserve the original engine list. Map each display wording to source terminology instead of silently editing it.
  mapping={'crude oil':('crude oil',50,'DIRECT_TERM'),'condensate':('condensate',50,'DIRECT_TERM'),'natural gas':('natural gas',50,'DIRECT_TERM'),'natural gas liquids':('NGL',50,'EXPANSION_OF_ABBREVIATION'),'refined products':('refined products',56,'DIRECT_TERM'),'chemicals':('chemicals',56,'DIRECT_TERM'),'base oils':('base oils',56,'DIRECT_TERM'),'lubricants':('lubricants',56,'DIRECT_TERM'),'retail fuels':('retail',56,'ENGINE_PARAPHRASE_NOT_LITERAL'),'trading':('supply and trading',56,'ENGINE_SHORTENING_NOT_LITERAL'),'power':('power generation',56,'ENGINE_SHORTENING_NOT_LITERAL')}
  records[-1]['source_observation_value']={'direct_downstream_terms':['refining','chemicals','supply and trading','distribution','retail','base oils','lubricants','power generation'],'primary_pdf_page':56,'supporting_upstream_pdf_page':50,'item_mapping':[dict(engine_item=item,source_term=mapping[item][0],pdf_page=mapping[item][1],relation=mapping[item][2]) for item in records[-1]['original_engine_value']],'source_term_absent_from_engine':'distribution','engine_list_modified':False}
  records[-1]['evidence']['representation']='COMPOSITE_WITH_ITEM_LEVEL_DIRECT_AND_PARAPHRASE_MAPPING'
  for loc in records[-1]['evidence']['locators']:loc['role']='primary_downstream_list' if loc['pdf_page']==56 else 'upstream_products' if loc['pdf_page']==50 else 'supporting_context'
  records[-1]['issues'][0]='PDF56 موجود في التسليم السابق أيضًا؛ التصحيح يثبته موضعًا رئيسيًا مع مطابقة البنود. distribution واردة في المصدر وغير موجودة في قائمة المحرك؛ لا تُضاف للمحرك أو تُعرض كتغطية مكتملة. retail fuels/trading/power ليست نقلًا حرفيًا للمصطلحات المقابلة.'
out=dict(schema='marefa-qb1-nonfinancial-evidence/1',planning_commit='a76286cea94ff9aac6e70535e8db90bac5908a72',preparation_status='PREPARED_FOR_CROSS_REVIEW_NOT_ACCEPTED',prepared_at=stamp,records_count=len(records),scope_basis=dict(rendered_text_keys=shown,included=keys,excluded_not_catalog_fields=['business_description_ar','business_segments'],selection='Exact intersection of existing rendered TextFact keys with original enabled company_model catalog; no facts added to reach19'),snapshot_fixture_sha256=hashlib.sha256(FIXTURE.read_bytes()).hexdigest(),holds=dict(analyses_blocked=7,claims_withheld=22,inputs_withheld=142,financially_qualified=0),records=records)
manifest=dict(schema='marefa-qb1-nonfinancial-source-manifest/1',prepared_at=stamp,sources=sources,source_values_not_qualification=True,source_pdfs_and_rendered_pages_in_git=False,primary_annual_hash=ANNUAL_HASH,engine_database_sha256_before_after=db_before,proof_assets=[dict(pdf_page=n,render_sha256=hashlib.sha256((HERE/f'runtime/page-{n}.png').read_bytes()).hexdigest(),render_is_original_artifact=False,committed=False) for n in [8,9,10,12,16,18,37,56,76,140,173,176,179,180]],tool_limitations=['Web annual fetch failed due file length; verified pre-existing local original instead','Live HTML opened via web tool; no raw HTML-byte hash claimed','PDF widget annotation warnings did not prevent visual rendering; no form editing performed'])
for name,value in [('NONFIN-EVIDENCE-LEDGER.json',out),('NONFIN-SOURCE-MANIFEST.json',manifest)]:
 (HERE/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
db.close();assert hashlib.sha256(dbfile.read_bytes()).hexdigest()==db_before
print(json.dumps(dict(records=len(records),evidence_states={s:sum(r['evidence']['status']==s for r in records) for s in sorted({r['evidence']['status'] for r in records})},approved=0),indent=2))

if __name__=='__main__':
 pass
