# خللان مستقلان في مُقيّم عقد المصنع (المحرك `b70254e`): توصيف لتكليفين منفصلين

**الحالة:** توثيق فقط.
- لم يُعدَّل المحرك.
- لا درجة نهائية جديدة محسوبة بافتراض نجاح الإصلاحين.
- كل خلل يُعالج بتكليف مستقل بعد اعتماده.

**المرجع:**
- الملف: `src/finengine/factory_contract.py`.
- العقد: `config/factory/18-category-contract.json` 1.0.0.
- القياس: `tools/measure_engine.py` على نسخة معزولة من قاعدة المحرك.

## الخلل A: مُقيّم البوابة `sector_specific_fields:1` غير منفَّذ

**السبب:**
- `_deterministic_gates` (الأسطر 306–502) لا تعيد نتيجة لهذه الفئة إلا عند `category_not_applicable` (السطران 491–492)، أي حين تعلن حزمة القطاع أن الفئة غير منطبقة.
- في كل حالة أخرى تصل الدالة إلى `return []` (السطر 502).
- فيضع المستدعي (السطور 622–634) `status: not_evaluated`، ويضيف `hard_gate_evaluator_required:sector_specific_fields`، ويجعل `all_hard_gates_evaluated = false`.

**الأثر:**
- لأي شركة تفعّل حزمتها هذه الفئة، أو بلا حزمة كأرامكو، تبقى البوابة غير مقيّمة دائمًا. فلا يمكن أن تصبح الشركة `ready` مهما بلغت درجتها.
- **إنشاء حزمة نفط وغاز وحده لا يجعل البوابة قابلة للتقييم.** هذا تصحيح لما ورد في `REPORT_AR.md` §3 (المقترح DX1 هناك لم يكن كافيًا).
- الاختبارات الحالية (`tests/test_factory_contract_runtime.py:58-92`) تغطي حالة حزمة الاتصالات التي تعلن الفئة غير منطبقة فقط.

**شرط البوابة كما في العقد:** "sector_pack activates this category for a company and its score is materially near zero while financial_statements and profitability both pass their own thresholds".

**معيار الإصلاح:**
1. تُقيَّم البوابة حين تفعّل الحزمة الفئة (`activates.sector_specific_fields_field_groups` غير فارغة):
   - **راسبة** إذا كانت درجة الفئة "قريبة من الصفر" وفئتا `financial_statements` و`profitability` ناجحتان في حديهما؛
   - **ناجحة** في غير ذلك.
2. "قريبة من الصفر" لا يعرّفها العقد رقميًا. **يلزم قرار مالك بقيمة صريحة تُكتب في العقد أو الحزمة**، لا في الشيفرة وحدها. لا يُفترض رقم في هذا التكليف.
3. بلا حزمة تبقى البوابة `not_evaluated` مع سبب صريح `sector_pack_missing`. لا تُعتبر ناجحة.
4. حالة N/A الحالية تبقى كما هي.
5. لا تغيير في الأوزان أو الحدود أو المقامات.

**الاختبارات المطلوبة:**
- حزمة تفعّل الفئة ودرجة صفر مع نجاح القوائم والربحية: البوابة `failed`.
- الحزمة نفسها ودرجة فوق العتبة: `passed`.
- حزمة تفعّل الفئة مع رسوب القوائم: `passed`، لأن الشرط مركّب.
- بلا حزمة: `not_evaluated`، والسبب `sector_pack_missing`، و`all_hard_gates_evaluated = false`.
- حزمة تعلن الفئة غير منطبقة: `passed` كما اليوم (اختبار عدم تراجع).
- أرامكو (`sa:2222`) على نسخة معزولة قبل الإصلاح وبعده: لا تتغير `total_score`، ويتغير فقط وضع البوابة.

## الخلل B: البيانات القديمة تُحتسب في درجة الوجود

**السبب:**
- `_freshness_audit` (الأسطر 210–248) يحسب الفئات القديمة. تُستعمل نتيجته في البوابة `sources_lineage_freshness:2` فقط.
- بسط كل فئة (السطران 577 و588: `populated` ثم `score = populated / expected`) لا يقرأ نتيجة الحداثة.
- العقد ينص في `action` لتلك البوابة: "the fact is flagged stale and excluded from the 'currently fresh' completeness numerator, even though it remains visible as historical data with its staleness disclosed".

**الأثر على أرامكو:**
- 10 فئات قديمة: `company_profile` و`valuation` و`market_data` و`dividends` و`segments` و`ownership` و`corporate_actions` و`announcements` و`operational_kpis` و`sector_specific_fields`.
- درجة الوجود **56.56374569**. تشخيص إسقاط الفئات القديمة كاملة **30.78050306**، ويطابق ما نقله Codex.
- **التشخيص ليس درجة نهائية:**
  - العقد يستبعد الحقائق القديمة لا الفئات كلها.
  - بعض الفئات "قديمة" لغياب أي دليل محكوم (`latest_evidence_at: null` في `company_profile`)، لا لقدم كل حقيقة.
  - الدرجة الصحيحة تحتاج حساب الحداثة لكل حقيقة. هذا هو موضوع الإصلاح، لا هذا التقرير.

**معيار الإصلاح:**
1. تُحسب حداثة **كل حقيقة** وفق `freshness_policy` لفئتها (`max_age_before_stale_days` وأساس `refresh_trigger`)، لا للفئة كتلة واحدة.
2. يُعرض بسطان منفصلان دون خلطهما: `populated_fields` (الوجود، كما اليوم) و`fresh_populated_fields` (الحالي).
3. يُضاف `fresh_score` إلى التقرير. **ما يُستعمل في `total_score` وفي بوابة 95 قرار مالك صريح.** العقد يشير إلى البسط الحالي، لكن تغيير معنى الرقم المنشور يحتاج موافقة ووسمًا بإصدار مختلف.
4. الفئات المشتقة (`derived`) ترث حداثة مدخلاتها كما في `_freshness_audit` اليوم.
5. لا تغيير في الأوزان أو الحدود أو سياسات الحداثة.

**الاختبارات المطلوبة:**
- حقيقة واحدة أقدم من حد فئتها: تبقى في `populated_fields` وتخرج من `fresh_populated_fields`.
- فئة بلا أي دليل محكوم: `fresh_populated_fields = 0` مع سبب صريح.
- فئة مشتقة من قوائم حديثة: تبقى حديثة.
- البوابة `sources_lineage_freshness:2`: نفس القائمة ونفس الحالة قبل الإصلاح وبعده (عدم تراجع).
- أرامكو على نسخة معزولة: `populated_fields` و`total_score` بالتعريف الحالي لا تتغير، ويظهر `fresh_score` منفصلًا.

## خارج نطاق التكليفين

- عدّ مجموعة `segments` في فئتي `segments` و`sector_specific_fields` معًا. هذا من تصميم العقد بلا حزمة، لا خلل في الشيفرة. يُحسم بحزمة القطاع أو بقرار مالك، ولا يُصلَح ضمنيًا.
- مفردات `unavailable_reasons` التي تصغّر المقام لأسباب ترجع إلينا (`pending_extraction` وغيرها). سياسة الاستعمال في `PLAN-CORRECTION-EVENT122_AR.md` §4، لا تعديل في المحرك.
