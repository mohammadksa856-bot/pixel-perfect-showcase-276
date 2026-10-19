# ARAMCO95 — A-PR-R01: توافق نهايات الأسطر مع Windows

**الحالة المطلوبة:** PR_READINESS_REVIEW_READY، لمراجعة Codex النهائية.

**الحالة الفعلية:**
- **IMPLEMENTED وTESTED:** نعم.
- **ACCEPTED:** لا.

**ما لم يحدث:**
- لا PR ولا merge ولا deploy.
- لا تعديل لشيفرة النواة.
- لا بيانات حقيقية.
- لا إعادة كتابة للتاريخ.
- الحجب 7/22/142/0 ثابت.

| | الفرع | الالتزام |
|---|---|---|
| **Implementation** | `claude/aramco95-selective-integration-a-pr` | `c43f6ba0fa5523b67bf2c18ba6808a3fb95eb855` (التزام واحد فوق `43d1f5d`) |
| **Delivery** | `claude/aramco95-selective-integration-a-pr-r01-review` | الالتزام الذي يحمل هذا التقرير، فوق `c43f6ba` |

## 1. السبب
- Git for Windows يسحب الملفات افتراضيًا بـ `core.autocrlf=true`، فتتحول نهايات الأسطر إلى CRLF.
- اختبار S0 يقارن sha256 الحمولات ببصمات خط الأساس، والبصمات محسوبة على LF، فيفشل.
- **إعادة الإنتاج على `43d1f5d`** بنسخة `autocrlf=true` نظيفة:
  - الحمولات وخط الأساس بـ CRLF، مثلًا 4,728 CR في `9901-page.json`.
  - النتيجة **33/34**، والفاشل هو «the committed baseline is exactly the identities of these sha-pinned fixtures».

## 2. التصحيح: الفرق عن `43d1f5d` (ملفان، +5/−2)
**`.gitattributes` (جديد، ثلاثة أسطر):**
```
tests/fixtures/synthetic-projection/*.json text eol=lf
src/lib/engine/publication-baseline.json text eol=lf
```
- يطابق أربعة ملفات فقط في المرشح.
- **لا يطابق أي مسار في `main`:** فحص `check-attr` على كل ملفات `main` أعاد صفرًا.
- `git add --renormalize .` لم يغيّر شيئًا، فالملفات مخزنة بـ LF أصلًا.

**`tests/fixtures/synthetic-projection/generate.ts`:**
- `endOfLine: "lf"` صريح في استدعاءي `prettier.format`.
- الناتج نفسه بايتًا، لأن prettier يستعمل LF افتراضيًا. الإضافة تمنع أي تغيير مستقبلي في الإعداد من تغيير البصمات.

**ما لم يتغير:**
- كل ملفات النواة والحمولات وخط الأساس والاختبارات متطابقة بايتًا مع `43d1f5d`.
- اختبار SHA في S0 كما هو.

## 3. نتيجة نسخة Windows نظيفة قبل التوليد (`eol_checks.py`: 18/18)
**طريقة المحاكاة:** لا يوجد Windows أصلي في هذه البيئة. نسخة نظيفة بـ `core.autocrlf=true` تعيد إنتاج تحويل Git for Windows عند السحب.
- **الدليل على أن المحاكاة فعّالة:** الملفات النصية الأخرى سُحبت بـ CRLF، فـ `statements.ts` فيه 544 CR، و`financial-projection.test.ts` فيه 894 CR.
- **التحقق النهائي على Windows أصلي** يبقى على مراجعة Codex، أو على وظيفة Windows في مقترح CI.

**الاختبار:** ثلاث نسخ نظيفة: `autocrlf=true` (Windows)، و`false` (LF)، و`input`. في كل نسخة، الخطوات التالية بالترتيب:

| الخطوة | true (Windows) | false (LF) | input |
|---|---|---|---|
| الملفات الأربعة بعد السحب | LF، و0 CR | LF | LF |
| بصمات خط الأساس = بصمات الملفات المسحوبة | نعم | نعم | نعم |
| `bun test` **قبل أي تشغيل للمولد** | **34/34** | **34/34** | **34/34** |
| المولد، المرة الأولى | `git status` نظيف، والبصمات نفسها | نفسه | نفسه |
| المولد، المرة الثانية | `git status` نظيف، والبصمات نفسها | نفسه | نفسه |
| `bun test` بعد التوليد | 34/34 | 34/34 | 34/34 |

### البصمات الثنائية (sha256)، متطابقة في الأوضاع الثلاثة وبعد كل توليد
| الملف | sha256 |
|---|---|
| `tests/fixtures/synthetic-projection/9901-page.json` | `7a3a5f9606d2b9d3052f57f2c682e811eecf391674e87ad7551242bff52ce093` |
| `tests/fixtures/synthetic-projection/9902-page.json` | `323e4d242d88d71497757e70a12714f69f1110eaaa6341edd076291fe6c66c81` |
| `tests/fixtures/synthetic-projection/9903-page.json` | `0a48c331b72503b3bee65fdaa48e997a868d05f966ff3cad5f65040ac28f9302` |
| `src/lib/engine/publication-baseline.json` | `a2ed6c7ed36cf554755ab4770060a555ee593cdbc00b149e6583e14c56caea65` |

بصمات الحمولات الثلاث هي نفسها المثبتة في `publication-baseline.json`.

## 4. الفحوص المعادة على `c43f6ba`
| الفحص | النتيجة |
|---|---|
| `bun test` | 34/34 |
| `tsc --noEmit` | 0 أخطاء |
| `eslint` على ملفات المرشح (17 ملف `.ts`) | 0 |
| `pr_scope_checks.py` | 12/12 |
| `kernel_http_check.py` | 9/9 |
| البناء (الإعدادات الافتراضية) | ينجح |
| HTTP على 15 مسارًا | مطابق لـ `main` |

**تفاصيل `pr_scope_checks.py`:**
- النواة مطابقة بايتًا.
- الإضافة الوحيدة خارج `src/lib` و`tests` هي `.gitattributes`.
- لا ملف من `main` معدَّل.
- لا حمولات حقيقية في التاريخ.
- تدقيق الحمولات صفر تطابق.
- لا أسرار.
- المولد يعيد الإنتاج بايتًا.
- تمرين التراجع يعيد شجرة `main`.

**تفاصيل `kernel_http_check.py`:** محرك مرقّع معزول.
- العلم مطفأ: `disabled`.
- السيناريوهات الأربعة: صفر خلية قيمة.

**تفاصيل البناء:** لا شيء من النواة أو الحمولات في الحزمتين. الفرق الوحيد قاعدة `.ordinal` غير المستعملة.

**تفاصيل HTTP:** الحالة والحجم والبصمة متطابقة بين `main` والمرشح، و500 من Supabase غير المتاح في الاثنين.

### الطفرات الأربع (عدد الاختبارات التي فشلت، على `c43f6ba`)
| الطفرة | المقبول `6445adf` | المرشح `c43f6ba` |
|---|---|---|
| M-a: المسار الحي يستعمل خط الأساس المجمّد | 5 | 5 |
| M-b: لا تحقق من التوقيعات | 1 | 1 |
| M-c: نهاية السنة من `quarter_position` | 2 | 2 |
| M-d: أي تاريخ في `annual_position` كـ Q4 | 0 | **1** |

## 5. مقترح CI المحدَّث (`CI-PROPOSAL.yml`، غير مُثبَّت)
**مرشحات المسارات:**
- `.gitattributes`.
- `src/lib/engine/**`، وفيها صراحةً `publication-baseline.json` و`publication-trust.json`.
- `design-fixtures.server.ts` و`design-review-policy.ts`.
- `tests/financial-projection.test.ts`.
- `tests/fixtures/synthetic-projection/**`، وفيها المولد والحمولات.

**المصفوفة:** `ubuntu-latest` و`windows-latest`. على Windows يسحب checkout بـ `autocrlf=true`.

**الخطوات:**
1. الاختبار **قبل** أي توليد.
2. التحقق من أن الملفات المثبتة LF.
3. `tsc`.
4. `eslint` على النواة.
5. المولد مرتين، كل مرة مع `git diff --exit-code`.
6. التأكد أن مخزن الثقة فارغ.

**قبل التثبيت:** تثبيت كل action ببصمة commit.

## 6. المخاطر المتبقية
1. **لم يُشغَّل Windows أصلي هنا.** المحاكاة بـ `autocrlf=true` تغطي آلية الفشل المثبتة، لكن التأكيد النهائي على Windows يبقى للمراجعة أو لوظيفة CI المقترحة.
2. بقية المخاطر من التقرير السابق ما زالت قائمة:
   - R1: الوحدة الافتراضية للـfixtures عند أول مستهلك.
   - R2: متغيرات Vercel غير متحققة.
   - R3: خط الأساس صار اصطناعيًا.
   - R4: لا CI في `main`.
   - R5: الحمولات الحقيقية في تواريخ فروع أخرى.
   - R6: ملف `.env` موروث في `main`.

## 7. إعادة الإنتاج (من جذر المستودع، على فرع المراجعة)
- `python3 review-delivery/ARAMCO95/SELECTIVE-A-PR-R01/eol_checks.py c4882ea02c60ec950e92932d61cb1f1a7b4e743e 43d1f5d649142f63ad18aec00af218b9795d640c c43f6ba0fa5523b67bf2c18ba6808a3fb95eb855`
- `python3 review-delivery/ARAMCO95/SELECTIVE-A-PR/pr_scope_checks.py c4882ea02c60ec950e92932d61cb1f1a7b4e743e c43f6ba0fa5523b67bf2c18ba6808a3fb95eb855`
- `python3 review-delivery/ARAMCO95/SELECTIVE-A-PR/kernel_http_check.py`
