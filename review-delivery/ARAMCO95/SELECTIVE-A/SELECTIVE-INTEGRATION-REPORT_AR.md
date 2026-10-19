# ARAMCO95 — Selective Integration A: التنفيذ والتحقق

**الحالة المطلوبة:** SELECTIVE_INTEGRATION_REVIEW_READY.

**الحالة الفعلية:**
- **IMPLEMENTED وTESTED:** نعم.
- **ACCEPTED:** لا.

**ما لم يحدث:**
- لا PR ولا merge ولا deploy.
- لا تعديل لـ Supabase ولا لإعدادات Vercel.
- لا تطبيق لرقعة المحرك على المحرك الأصلي.
- لا `FINANCIAL_ACCEPT` ولا `PUBLICATION_AUTHORIZED`.
- الحجب 7/22/142/0 ثابت.

| | الفرع | الالتزام |
|---|---|---|
| **Implementation** | `claude/aramco95-selective-integration-a` | `6445adf5814e0afa1cb272fd2fc7c8eabf5e0902` (التزام واحد فوق `main`) |
| **Delivery** | `claude/aramco95-selective-integration-a-review` | الالتزام الذي يحمل هذا التقرير، فوق `6445adf` |

**فصل التسليم عن التنفيذ:** أدوات التحقق والسجلات في فرع المراجعة فقط. فرع التكامل لا يحمل أي أرشيف مراجعة.

- **قاعدة `main`:** أُعيد جلبها قبل التنفيذ وبعده، وما زالت `c4882ea02c60ec950e92932d61cb1f1a7b4e743e`.
- **المصدر:** التسليم المقبول `6c88655`.

## 1. الملفات المنقولة وتبعياتها
**عدد الملفات:** 21 ملفًا، كلها جديدة على `main`. كل ملف **مطابق بايتًا** للتسليم المقبول، أي blob id نفسه. لا تعديل لأي ملف موجود في `main`.

**كيف حُدّدت:** استُخرجت التبعيات آليًا بتتبع `import` من ملفات الإسقاط. لم أصل إلى قائمة Codex ذات الـ12 ملفًا (event 140) في هذه الجلسة. الـ12 ملفًا الأولى أدناه هي النواة التشغيلية الناتجة عن التتبع، وكل إضافة بعدها مفسَّرة بتبعية محددة.

### النواة التشغيلية (12 ملفًا، و1 تعريف نوع)
| # | الملف | لماذا |
|---|---|---|
| 1 | `src/lib/engine/publication-gate.server.ts` | البوابة (مقبولة) |
| 2 | `src/lib/engine/publication-trust.json` | مخزن الثقة الفارغ، تستورده البوابة |
| 3 | `src/lib/engine/publication-baseline.json` | خط أساس الوضع المجمّد: بصمات هويات فقط، بلا قيم. تستورده البوابة |
| 4 | `src/lib/engine/company-preview.server.ts` | دالة الخادم `fetchCompanyPreview` |
| 5 | `src/lib/engine/company-preview.ts` | `buildCompanyPreview`، و`contractProblems` |
| 6 | `src/lib/engine/statements.ts` | القوائم والأرصدة الربعية (QP) |
| 7 | `src/lib/engine/peer-comparison.server.ts` | `fetchPeerTable` مع `applyPeerGate` |
| 8 | `src/lib/engine/peer-comparison.ts` | يستورده 5 (`safeSourceUrl`) و7 |
| 9 | `src/lib/engine/readiness.ts` | يستورده 5 |
| 10 | `src/lib/bidi.ts` | يستورده 5 (`iso`)، 8 أسطر |
| 11 | `src/lib/web-v1/design-review-policy.ts` | يستورده 4 (`designReviewFixturesEnabled`) |
| 12 | `src/lib/web-v1/design-fixtures.server.ts` | يستورده 4 ديناميكيًا لمسار الـfixtures. خامل، انظر أدناه |
| + | `src/design-fixtures.d.ts` | تعريف نوع `virtual:marefa-design-fixtures` الذي يستورده 12. بدونه يفشل `tsc` |

### تبعيات الاختبار فقط (لا يستوردها أي ملف تشغيل)
| الملف | لماذا |
|---|---|
| `tests/financial-projection.test.ts` | اختبارات M1–M7 المقبولة |
| `tests/fixtures/codex-20261013/{2222,1120,8010}-page.json.gz` | حمولات `/page` من المحرك `b70254e`، يقرؤها الاختبار. هي أيضًا مصدر خط الأساس (3) |
| `src/lib/web-v1/company-experience.ts`، `catalog.ts`، `model.ts`، `display-labels.ts` | يستوردها الاختبار (M5) ليثبت عدم تسرب قيمة عبر `buildOverview` و`intelGroups`. أُبقيت بدل تعديل الاختبار المقبول |

## 2. الفرق مقارنة بـ `main`
| البند | القيمة |
|---|---|
| `git diff --stat c4882ea 6445adf` | 21 ملفًا، +5954، و0 حذف |
| ملفات `main` المعدَّلة | لا شيء |
| ما لا يمسّه الفرق | المسارات (`src/routes`)، والمكونات، وCSS، و`package.json`، و`vite.config.ts`، و`bunfig.toml`، وإعدادات البناء |
| المسارات المسموح بها | كل الملفات تحت `src/lib/` و`tests/`، ما عدا ملف تعريف النوع `src/design-fixtures.d.ts` |
| تعديل على الشيفرة المقبولة | **لا شيء**. لم يلزم أي تغيير للتوافق |

## 3. نتائج الاختبارات (السجلات في `test-logs/`)
| الفحص | النتيجة |
|---|---|
| `tsc --noEmit` | 0 أخطاء |
| `eslint` على ملفات النواة | 0 مشكلات |
| `eslint .` على المستودع كله | 783 مشكلة على `main` و783 على فرع التكامل، في الملفات نفسها. كلها موروثة، ولا جديد |
| `prettier --check` | نظيف، ما عدا `publication-baseline.json`. هذا الملف مولَّد وغير منسَّق في التسليم المقبول أيضًا، وأبقيته مطابقًا بايتًا |
| `bun test` (كامل الفرع) | **31/31، و0 إخفاق**. الإخفاقات الأرشيفية الستة غير موجودة، لأن أرشيفاتها لم تُنقل |
| `vite build` (الإعدادات الافتراضية) | نجح على `main` وعلى الفرع |
| نصوص النواة في `.output` | صفر في الحزمتين (العميل والخادم): `applyPublicationGate`، و`marefa-publication-trust`، و`publication-baseline`، و`buildCompanyPreview`، و`FINENGINE_API`، و`MAREFA_`، و`ENGINE_PREVIEW_ENABLED`، وعلامات الـfixtures |
| فحص HTTP للنواة (`kernel_http_check.py`) | 9/9 |
| سلوك `main` قبل وبعد عبر HTTP (`http_compare.py`) | 15 مسارًا، الحالة والحجم والبصمة المطبَّعة متطابقة |
| الأسرار والبيانات الخاصة (`integration_checks.py`) | صفر في ملفات الفرع وفي تاريخ التزامه |
| تمرين التراجع | يعيد شجرة `main` تمامًا |

**تفاصيل فحص HTTP للنواة:**
- محرك مرقّع معزول على 127.0.0.1، بصفوف اصطناعية من Q3-2025، ويقدّم `quarter_position`.
- تُستدعى دالة الخادم بـ fetch حقيقي.
- **العلم مطفأ:** النتيجة `disabled`.
- **العلم مفعّل** في السيناريوهات الأربعة (بلا اعتمادات، وكلمات بلا توقيع، وتوقيع بمفتاح غير موثوق، وملف تالف): النتيجة `ok`، **وصفر خلية قيمة**، ولا قيمة اصطناعية.
- **`MAREFA_DESIGN_FIXTURES=true` خارج سياسة المراجعة:** النتيجة `disabled`.

**تفاصيل مقارنة HTTP:**
- `vite dev` بالإعدادات الافتراضية، على 15 مسارًا عامًا ومسار معاينة. الحالة والحجم والبصمة المطبَّعة متطابقة بين `main` والفرع.
- رموز 500 على `/` و`/companies` و`/research` و`/knowledge` و`/sectors` تظهر في الاثنين، لأن Supabase غير قابل للوصول من هذه البيئة.
- مسارات `/preview/*` تعيد 404 في الاثنين.

**تفاصيل الأسرار:** فُحصت كل blobs الالتزام، مع فك ضغط ملفات `.gz`، ورسالته. الأنماط المفحوصة: مفاتيح خاصة، وJWT، و`sk-` و`AKIA` و`gh*_`، وقيم service_role، ومفاتيح مُسندة، وأسماء ملفات T1 الخاصة، وتوقيع PDF.

**تفاصيل تمرين التراجع:** على worktree وفرع مؤقتين حُذفا بعده:
- `git merge --no-ff` يعطي شجرة الفرع.
- ثم `git revert -m 1` يعيد شجرة `main` تمامًا.
- لم يُلمس `main`.

## 4. أثر التغيير على الموقع الحالي
**لا أثر وظيفي.** لا مسار ولا مكوّن يستورد النواة:
- لا تدخل الحزمة.
- لا دالة خادم جديدة مكشوفة.
- كل الأعلام معطلة افتراضيًا.

**أثر واحد في CSS، غير مستخدم:** Tailwind يفحص `src/` بحثًا عن أسماء الأصناف، فأضاف كلمة `ordinal` في شيفرة النواة قاعدة `.ordinal` (+175 بايت).
- لا يستعملها أي عنصر.
- بقية ملفات الحزمة متطابقة بعد إزالة أسماء الملفات المجزّأة والطوابع الزمنية، وأحجام JS نفسها.
- `build-compare.txt` يوثّق ذلك.

## 5. ما لم يُنقل عمدًا، ولماذا
| ما لم يُنقل | السبب |
|---|---|
| مسارات `/preview/*` ومكونات `web-v1` وW0 (طبقة الأدلة) وصفحات WEB-01…08 | خارج النواة، والتكليف يمنع نقل السلسلة. بدونها لا يستهلك الموقع النواة |
| `build/design-fixtures.ts` وتعديل `vite.config.ts` | تعديل إعدادات بناء غير لازم: المسار المجمّد غير مستدعى من أي مدخل، والاختبار يحاكي الوحدة الافتراضية. **خطر R1 أدناه** |
| بقية الـfixtures (`*-preview-evidence`، و`p02/*`، و`peer-comparison/*`، و`web-v1/factory`) | لا يقرؤها اختبار النواة |
| `review-delivery/`، و`product-tracking/`، و`research-evidence/` | أرشيفات مراجعة. يمنعها التكليف، وهي مصدر الإخفاقات الستة |
| رقعة المحرك `quarter-position.patch` | تكامل منفصل في مستودع المحرك |
| `e2e_http.py` والأدوات | في فرع المراجعة فقط (`SELECTIVE-A/`) |
| تعديل `DESIGN_REVIEW_BRANCHES` أو أي علم | ممنوع، ولا حاجة |

## 6. المخاطر المتبقية قبل أي PR
1. **R1: الوحدة الافتراضية للـfixtures.** `company-preview.server.ts` يستورد `design-fixtures.server.ts` ديناميكيًا. إن ربط مسار مستقبلي بـ `fetchCompanyPreview` دون نقل `build/design-fixtures.ts` وتسجيله في `vite.config.ts`، يفشل البناء عند `virtual:marefa-design-fixtures`.
   - هذا فشل ظاهر، لا تسرب.
   - يلزم قرار عند إضافة أول مستهلك: إما نقل الإضافة (plugin)، التي لا يضمّن شيئًا خارج سياسة المراجعة، أو إزالة فرع الـfixtures من نسخة الإنتاج. الإزالة تعديل لشيفرة مقبولة.
2. **R2: متغيرات Vercel الإنتاجية غير متحققة.** لم أقرأ إعدادات Vercel، ولا يجوز افتراض أنها معطلة:
   - `ENGINE_PREVIEW_ENABLED`، و`ENGINE_PEERS_ENABLED`، و`WEB_V1_PREVIEW_ENABLED`، و`MAREFA_DESIGN_FIXTURES`.
   - `FINENGINE_API_URL` و`FINENGINE_API_KEY`.
   - `MAREFA_PUBLICATION_APPROVALS_PATH`، و`MAREFA_QA_*`.

   أثرها اليوم صفر لأن لا مستهلك للنواة، لكنها تصبح حرجة مع أول مستهلك. **الحالة: UNVERIFIED** حتى يفحصها من يملك الصلاحية.
3. **R3: لا CI في `main`.** لا يوجد `.github/workflows`، فلا يشغّل `main` الاختبارات تلقائيًا. الأمر اليدوي `bun test` يعطي 31/31 على هذا الفرع. إضافة CI قرار منفصل.
4. **R4: `eslint .` فيه 783 مشكلة موروثة في `main`.** ليست من هذا الفرع، لكنها تمنع استعمال `npm run lint` بوابةً للدمج دون تصفية.
5. **R5: ملف `.env` موجود في تاريخ `main`.** يحمل مفاتيح Supabase المنشورة (publishable/anon) وعنوانها. هو موروث، وليس مفتاح service_role، ولم يُدخله هذا الفرع. يُذكر للعلم.
6. **R6: القيم في الـfixtures.** حمولات `/page` من `b70254e` تحمل قيمًا مالية حقيقية من تقارير منشورة، كما في الفرع المقبول. هي بيانات اختبار وليست في الحزمة، لكن دخولها `main` قرار بيانات يحتاج موافقتك.
7. **R7: Lovable.** دمج لاحق في `main` يزامن Lovable. التراجع بـ `revert -m 1` فقط، لا reset ولا force-push (AGENTS.md).
8. **المحرك:** `quarter-position.patch` لم يُطبَّق. تكامله منفصل وبموافقة منفصلة. بدونه تعمل النواة كما هي، لأن المفتاح `quarter_position` اختياري.

## 7. إعادة الإنتاج
**على `claude/aramco95-selective-integration-a` (التنفيذ):**
- `npx tsc --noEmit -p .`
- `bun test`
- `npx eslint <ملفات النواة>`
- `npx vite build`

**على `claude/aramco95-selective-integration-a-review` (أدوات التحقق):**
- `python3 review-delivery/ARAMCO95/SELECTIVE-A/kernel_http_check.py`
- `python3 review-delivery/ARAMCO95/SELECTIVE-A/integration_checks.py c4882ea02c60ec950e92932d61cb1f1a7b4e743e 6445adf5814e0afa1cb272fd2fc7c8eabf5e0902`
- `python3 review-delivery/ARAMCO95/SELECTIVE-A/http_compare.py . <out.json>`، مرة على `main` ومرة على الفرع.
