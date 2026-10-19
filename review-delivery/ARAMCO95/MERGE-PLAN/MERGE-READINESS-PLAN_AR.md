# ARAMCO95 — MERGE-READINESS-PLAN: الإسقاط المالي (Publication Gate + Quarter Position)

**الحالة:** خطة فقط، لموافقة المالك. لم يُنفَّذ أي شيء مما يلي:
- لا دمج ولا PR.
- لا نشر staging.
- لا تغيير لإعدادات Vercel أو Supabase.
- لا تطبيق للرقعة على المحرك الأصلي.

**ما لم يتغير:**
- حالة القبول الهندسي لـ Publication Gate وQP-02 كما أصدرها Codex.
- قرار Codex: `INTEGRATION: MERGE_CANDIDATE`.
- لا `FINANCIAL_ACCEPT` ولا `PUBLICATION_AUTHORIZED`.
- الحجب 7/22/142/0 ثابت.

**المرشح للدمج:** `claude/aramco95-financial-projection` عند `6c88655638c14550f8fad36e09228bcb483d06d3`. هذه الخطة على فرع منفصل (`claude/aramco95-projection-merge-plan`)، فلا يتغير رأس المرشح.

## 1. الفروقات مع قاعدة الموقع المعتمدة

| | القيمة |
|---|---|
| قاعدة الموقع (`origin/main`) | `c4882ea` (مرتبط بـ Lovable) |
| المرشح فوق `main` | **158 التزامًا**، 0 خلفه، أي أن الدمج سيكون fast-forward بلا تعارضات |
| حجم الفرق | 1,272 ملفًا (+205,703 / −33) |

### الطبقات
الفرق ليس الإسقاط وحده، بل طبقتان متراكبتان:

| الطبقة | النطاق | الشيفرة | مراجعتها |
|---|---|---|---|
| **A: سلسلة المعاينة حتى W0** (`main..27a7785`، 150 التزامًا) | WEB-01…07، W0 وW0-SEC، وP01/P02، وحزم WEB-08 والمراجعات | 68 ملفًا في `src/`، و`build/design-fixtures.ts`، و`vite.config.ts`، وعشرات الاختبارات والـfixtures | **خارج نطاق مراجعة الإسقاط** |
| **B: الإسقاط** (`27a7785..6c88655`، 8 التزامات) | البوابة، وأرصدة الأرباع، والرقعة | 9 ملفات (القائمة أدناه) | ENGINEERING_ACCEPT (Codex) |

### ملفات الطبقة B
- `src/lib/engine/publication-gate.server.ts`
- `src/lib/engine/publication-trust.json`
- `src/lib/engine/publication-baseline.json`
- `src/lib/engine/company-preview.server.ts`
- `src/lib/engine/company-preview.ts`
- `src/lib/engine/statements.ts`
- `src/lib/engine/peer-comparison.server.ts`
- `src/lib/web-v1/design-fixtures.server.ts`
- `tests/financial-projection.test.ts`

### الاعتماد على W0 والطبقة A
**كل ملفات التشغيل التي تمسّها الطبقة B غير موجودة في `main`:**
- `company-preview(.server).ts`، و`statements.ts`، و`peer-comparison.server.ts`.
- `design-fixtures.server.ts`، و`design-review-policy.ts`، و`company-experience.ts`.

**النتيجة:** لا يمكن دمج الإسقاط منفصلًا. الطبقة A شرط مسبق.

**اعتمادات الاختبارات على ملفات خارج `src`:**
- `tests/w0-evidence-overlay.test.ts` يعتمد على `review-delivery/ARAMCO95/W0/evidence-overlay.json`.
- اختبارات أخرى تعتمد على ملفات في `product-tracking/tools` و`review-delivery/WEB03-SYNTHETIC`.

**طبيعة بقية الفرق:** معظمه (`product-tracking/outbox` 510 ملفات، و`review-delivery/*`، و`research-evidence/*`) أرشيف مراجعات. لا يستورده `src` وقت التشغيل.

## 2. ما يُدمج في مستودع الموقع، وما يُطبَّق منفصلًا في مستودع المحرك

**الموقع (`pixel-perfect-showcase-276`):**
- الطبقة A، ثم الطبقة B.
- `review-delivery/ARAMCO95/PROJECTION/` وفيه `engine/quarter-position.patch`. وجود الرقعة هنا **لا يعني تطبيقها في المحرك**: هي ملف مراجعة فقط، ولا يقرؤها الموقع.

**المحرك (`-market-agnostic-financial-data-engine-1`):** تغيير منفصل، بقرار وPR منفصلين.

| البند | القيمة |
|---|---|
| الملف | `src/finengine/query.py` فقط |
| الرقعة | `review-delivery/ARAMCO95/PROJECTION/engine/quarter-position.patch`، وبصمتها sha256 `6914ccc084769d45b8f9c2eb4d5fce5969ffe4b9278c243a834938a70b37d45c` |
| ما تغيّره | تضيف `sections.financials.history.quarter_position`، وهي إضافة لا تكسر شيئًا |
| ما لا تغيّره | `contract_version`، وأي مفتاح قائم، والقاعدة، والترحيلات |
| الأساس المختبَر | `b70254e`، وهو أيضًا `origin/main` المحلي للمحرك عند آخر جلب. **يجب إعادة الجلب والتحقق بـ `git apply --check` قبل التطبيق**، فإن تحرك `main` يُعاد تشغيل الاختبارات |
| التطبيق | `git apply` في فرع جديد للمحرك، ثم مراجعة ودمج. بصمة القاعدة `2a749d7c…5867` يجب ألا تتغير |

## 3. توافق عقد `/page`

| السيناريو | النتيجة | الدليل |
|---|---|---|
| موقع جديد + محرك قديم (بلا `quarter_position`) | بلا تغيير في العرض | `tests/financial-projection.test.ts` («without the new quarter_position key nothing changes»)، والمعاينات المجمّدة متطابقة |
| موقع قديم (`main`) + محرك جديد | لا أثر | `main` لا يحوي أي مستهلك لـ `/page` |
| موقع جديد + محرك جديد | المفتاح يمر بالبوابة أولًا، ثم Q1–Q3 من `quarter_position` وQ4 من `annual_position`، بلا ازدواج | M6 وM7، و`test_qp02.py` 12/12، و`e2e_http.py` 8/8 |
| `contract_version` | لم يتغير | `test_engine_proposal.py` |

**الترتيب الموصى به:** الموقع أولًا (خامل لأن الأعلام معطلة)، ثم المحرك. الترتيبان آمنان، لكن هذا الترتيب يضع المستهلك المختبَر قبل المنتِج.

## 4. الحجب في المسار الحي
- `publication-trust.json` فيه `authorities: []`. لا سجل يتحقق، فالمسار الحي لا يعرض أي قيمة مالية جديدة.
- لا متغير بيئة ولا معامل يغيّر مخزن الثقة.
- **إضافة جهة إلى المخزن ليست جزءًا من هذا الدمج.** تحتاج قرار المالك، وبنية مفاتيح وإلغاء وسجل قرارات محمي (القسم 8).
- النظراء محجوبون كليًا حتى يتغير عقد `/peers`.
- **تحقق على `6c88655` في هذه الجلسة:**
  - المخزن فارغ.
  - `bun test tests/financial-projection.test.ts tests/w0-evidence-overlay.test.ts`: 48/48.
  - في البناء الافتراضي، نصوص البوابة والثقة على الخادم فقط (0 في الحزمة الثابتة).

## 5. المعاينات المجمّدة والحجب والاعتمادات
- بصمة لقطة المعاينات الثلاث (2222 و1120 و8010) على `6c88655`: `1fd028d1ef0f1b5d6f6f88cb81502df0118e31221843c22a8033b30817fec03a`، مطابقة لـ `27a7785`.
- **البناء الافتراضي** (`vite build` بلا أعلام):
  - علامات بيانات الـfixtures (`file:57c929d725ae…` و`433101000000`) غائبة عن الحزمتين الثابتة والخادم.
  - `designFixturePlugin` لا يضمّن الـfixtures إلا عند `designReviewFixturesEnabled`، أي خمسة شروط معًا.
- لا يمنح الدمج أي اعتماد. الحجب 7/22/142/0 ليس في شيفرة الطبقة B.

## 6. لا تبعية مخفية على T1
- شجرة المرشح لا تحوي `review-delivery/ARAMCO95/T1-ISOLATED` أصلًا.
- لا يحوي `src` ولا `tests` ولا `vite.config.ts` ولا `package.json` أي إشارة إلى T1 أو `t1_common` أو QB3/QB4 أو `financial.sqlite3`.
- الملفات الخاصة الثلاثة غائبة عن **كل** تاريخ git في المستودع:
  - `T1-SOURCE-REVIEW-RECEIPT.json`
  - `T1-INDEPENDENT-SOURCE-REVIEW_AR.md`
  - `T1-AUTHORIZATION.json`

  وهي مدرجة في `.git/info/exclude`.
- أدوات المراجعة (`e2e_http.py` واختبارات المحرك) تقرأ المحرك المحلي بـ `git archive`. هذه أدوات مراجعة، لا تبعية تشغيل.

## 7. الاختبارات الستة الموروثة
**المجموعة كاملة على `6c88655`:** 2087 ناجحًا و6 إخفاقات، وهي نفسها في `27a7785` و`825ce31`. كلها خارج شيفرة التشغيل.

| النوع | الموضع | السبب |
|---|---|---|
| 3 اختبارات فاشلة | `product-tracking/inbox/R02-review/{baseline,candidate}/src/lib/engine/codex-financial-review.test.ts`، والأسماء: «calculated output without lineage…»، و«quarantined missing row…»، و«wrong per-share currency…» | نسخ أرشيفية من مدخلات مراجعة R02 يلتقطها `bun test` لأنه لا جذر محدد للاختبارات |
| 3 ملفات لا تُحمَّل | `review-delivery/WEB08B01/independent-{first,second,third}-review/*.test.ts` | تستورد `../work/review/research-evidence/v1/synthetic`، وهو غير موجود في المستودع |

**قرار مطلوب:** هل تدخل هذه الأرشيفات `main`؟ إن دخلت، يلزم استبعادها من تشغيل الاختبارات الافتراضي، وإلا سيبدأ `main` بستة إخفاقات. لم أغيّر شيئًا هنا.

## 8. ترتيب العمليات المقترح

**0. قرارات المالك قبل أي شيء (القسم 10):** نطاق الطبقة A، والأرشيفات، وإعدادات الإنتاج.

**1. فرع تكامل للموقع،** من `main` الحالي:
- يُدمج المرشح بـ merge commit، لا squash ولا rebase، التزامًا بـ AGENTS.md وLovable.
- أو تُطبَّق النسخة المنتقاة إن اختارها المالك.

**2. اختبارات القبول على فرع التكامل** (القسم 9، المجموعة أ).

**3. Staging غير عام** للموقع:
- معاينة محمية أو تشغيل محلي على 127.0.0.1، بلا رابط عام.
- الأعلام في وضع المعاينة فقط، والمحرك نسخة معزولة مرقّعة (القسم 9، المجموعة ب).

**4. دمج الموقع في `main`:**
- PR واحد بموافقة المالك.
- قبله وسم `pre-projection-merge` على `c4882ea`.
- بعده: نشر الإنتاج بالإعدادات المعطلة، والتحقق أن صفحات المعاينة تعيد 404 أو `disabled`.

**5. فرع للمحرك:**
- `git apply --check` ثم `git apply` لـ `quarter-position.patch` على `main` المحرك بعد إعادة الجلب.
- `test_engine_proposal.py`، و`test_qp02.py`، ووحدات الانحدار الخمس على تصدير معزول.
- PR منفصل للمحرك بموافقة المالك.

**6. دمج المحرك ونشره،** والقاعدة كما هي.

**7. تحقق ما بعد الدمج:**
- `/page` يحمل `quarter_position` لـ 2222.
- الموقع (إن فُعّل لاحقًا في staging) يحجب كل قيمة لأن المخزن فارغ.

### نقاط التراجع

| النقطة | التراجع |
|---|---|
| قبل 4 | حذف فرع التكامل فقط |
| بعد 4 (الموقع) | `git revert -m 1 <merge>` على `main`، لا reset ولا force-push، تجنبًا لإعادة كتابة التاريخ في Lovable. **مفتاح الإيقاف الفوري:** إلغاء `ENGINE_PREVIEW_ENABLED` يعيد `disabled` دون نشر شيفرة |
| بعد 6 (المحرك) | revert لالتزام الرقعة. المفتاح إضافي، فإزالته لا تكسر الموقع (السيناريو الأول في القسم 3). لا ترحيل قاعدة يُتراجع عنه |

## 9. اختبارات القبول

**أ. على فرع التكامل (قبل الدمج):**
1. `bun test`: يجب أن يكون الناتج 2087 ناجحًا، والإخفاقات الستة نفسها بالأسماء، أو صفرًا إن استُبعدت الأرشيفات بقرار.
2. `bun test tests/financial-projection.test.ts`: 31/31.
3. `bun test tests/w0-evidence-overlay.test.ts`: 17/17.
4. `tsc --noEmit` و`eslint` و`prettier --check` على الملفات المتغيرة.
5. `bun review-delivery/ARAMCO95/PROJECTION/snapshot_previews.ts <out>` ثم sha256 يساوي `1fd028d1…ec03a`.
6. `vite build` بلا أعلام، مع grep على الحزمة الثابتة:
   - صفر لعلامات الـfixtures ونصوص البوابة والثقة وأسماء المتغيرات.
   - صفر لعلامات الـfixtures في حزمة الخادم.
7. `python3 review-delivery/ARAMCO95/PROJECTION/engine/test_engine_proposal.py` و`test_qp02.py`.

**ب. في staging غير عام:**
1. **كل الأعلام مطفأة:** كل مسارات `/preview/*` تعيد 404 أو `disabled`، والصفحات العامة كما في `main`.
2. **`ENGINE_PREVIEW_ENABLED` و`WEB_V1_PREVIEW_ENABLED` مفعّلان، مع محرك معزول مرقّع على 127.0.0.1 أو شبكة خاصة:**
   - لا قيمة مالية في أي صفحة: Overview وIntelligence وData والقوائم المالية.
   - السيناريوهات الأربعة لـ `e2e_http.py`: بلا ملف اعتمادات، وكلمات بلا توقيع، وتوقيع بمفتاح غير موثوق، وملف تالف.
3. **محرك قديم (بلا الرقعة)** مع الموقع الجديد: لا خطأ، والعرض كما قبل.
4. **`ENGINE_PEERS_ENABLED`:** كل قيمة نظير محجوبة.
5. **الـfixtures المجمّدة:** لا تظهر إلا إذا كان فرع staging في `DESIGN_REVIEW_BRANCHES`. الفرع الحالي غير مدرج، وإدراجه تعديل شيفرة يحتاج قرارًا.
6. **أخطاء الخادم:** لا أخطاء غير مضبوطة لمدخلات مشوّهة. المرجع M5، ويُكرَّر عبر HTTP.

## 10. المتغيرات والإعدادات التي يجب أن تبقى معطلة في الإنتاج

| المتغير | الحالة المطلوبة في الإنتاج | الأثر إن فُعّل |
|---|---|---|
| `ENGINE_PREVIEW_ENABLED` | غير معرّف أو ليس `"true"` | يفتح مسار المحرك الحي (يبقى محجوبًا بالبوابة، لكنه يتصل بالمحرك) |
| `WEB_V1_PREVIEW_ENABLED` | غير معرّف | يفتح صفحات `/preview/web-v1/*` |
| `ENGINE_PEERS_ENABLED` | غير معرّف | يفتح جدول النظراء (محجوب القيم) |
| `MAREFA_DESIGN_FIXTURES` | غير معرّف | الـfixtures، وتحتاج أيضًا `VERCEL_ENV=preview` وفرعًا مدرجًا |
| `FINENGINE_API_URL` و`FINENGINE_API_KEY` | غير معرّفين في الإنتاج | الاتصال بالمحرك |
| `MAREFA_PUBLICATION_APPROVALS_PATH` | غير معرّف | ملف اعتمادات؛ بلا أثر مع مخزن فارغ، لكن يبقى معطلًا |
| `MAREFA_QA_EVIDENCE_OVERLAY_PATH` و`MAREFA_QA_REVIEWER_ACCESS` و`MAREFA_QA_REVIEWER_USER_IDS` | غير معرّفة | طبقة أدلة المراجِع (W0) |
| `publication-trust.json` | `authorities: []` | أي إضافة تحتاج قرار المالك |

**قيد على هذه الخطة:** لم أقرأ إعدادات Vercel الفعلية. المطلوب من المالك تأكيد قيم بيئة Production وPreview قبل الخطوة 4.

## 11. ما يمكن دمجه هندسيًا، وما لا يجوز تفعيله بعد

**يمكن دمجه هندسيًا (بموافقة المالك):**
- الطبقة B كاملة (9 ملفات)، فوق الطبقة A، والأعلام معطلة.
- `review-delivery/ARAMCO95/PROJECTION/` كأرشيف مراجعة، حسب قرار الأرشيفات.
- رقعة المحرك في مستودع المحرك، كـ PR منفصل.

**لا يجوز تفعيله بعد:**
- أي علم في الجدول أعلاه في الإنتاج.
- إضافة أي جهة إلى `publication-trust.json`، أو أي سجل اعتماد.
- `FINANCIAL_ACCEPT` و`PUBLICATION_AUTHORIZED` و`SOURCE_ACCEPT`.
- عرض النظراء: يلزم تغيير عقد `/peers` أولًا.
- إدخال قيم QB3 أو QB4 أو T1 في المحرك.
- إصلاح النقد في `annual_position`: مقترح منفصل في `CASH-METRIC-PROPOSAL_AR.md`، غير مطبّق.
- تغيير الحجب 7/22/142/0.

## 12. قرارات تحتاج تصريح المالك
1. **نطاق الطبقة A:** هل كل سلسلة `main..27a7785` (WEB-01…07، وW0، وحزم WEB-08) مقبولة للدمج في `main`؟ هذه الخطة لا تثبت قبولها، لأن مراجعة الإسقاط لم تشملها.
2. **الأرشيفات:** دمج كامل (1,272 ملفًا)، أو نسخة منتقاة من الشيفرة والاختبارات وتبعياتها، مع الحفاظ على تاريخ المراجعات في فروعها.
3. **الاختبارات الستة الموروثة:** استبعاد الأرشيفات من تشغيل الاختبارات الافتراضي، أو قبولها موثقة.
4. **إعدادات Vercel وSupabase:** تأكيد أن بيئة الإنتاج لا تحمل أيًا من أعلام القسم 10، وأي staging يكون محميًا وغير عام.
5. **فرع staging للـfixtures:** إدراجه في `DESIGN_REVIEW_BRANCHES` (تعديل شيفرة) أو الاكتفاء بالتشغيل المحلي.
6. **المحرك:** موافقة منفصلة على PR الرقعة، وعلى توقيت نشر المحرك بعد الموقع.
7. **لاحقًا، خارج هذا الدمج:** بنية الاعتماد الموثوقة (المفاتيح، والإلغاء، وسجل القرارات المحمي) قبل أي إضافة إلى مخزن الثقة.

## ملحق: أدلة هذه الجلسة على `6c88655` (قراءة وتشغيل محلي فقط)
- `git rev-list`:
  - `main..candidate` = 158.
  - `candidate..main` = 0.
  - `merge-base` = `c4882ea`.
- `bun test`: 2087 ناجحًا، و6 إخفاقات (3 + 3 كما في القسم 7).
- اختبارات المسار الحي وW0: 48/48.
- اللقطة المجمّدة: `1fd028d1…ec03a`.
- `vite build` الافتراضي: نجح. علامات الـfixtures 0/0، ونصوص البوابة 0 في الحزمة الثابتة.
- **المحرك الأصلي:**
  - `b70254e`، والشجرة نظيفة.
  - بصمة القاعدة `2a749d7c8a051f27…`.
  - `origin/main` المحلي = `b70254e`، دون جلب جديد في هذه الجلسة.
- لم تُعَد الاختبارات المستقلة المغلقة لـ Publication Gate وQP-02. الأرقام أعلاه من اختبارات المستودع القائمة فقط.
