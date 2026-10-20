# ARAMCO95 — CI-R01-FIX: إزالة مرشحات المسارات من بوابة النواة

**الحالة:**
- **IMPLEMENTED:** نعم.
- **TESTED:** محليًا فقط، بالنموذج والمحاكاة.
- **ACCEPTED:** لا.
- **لم يُدفع شيء ولم يُحدَّث PR #5.** الدفع ينتظر موافقة المالك.

**ما لم يحدث:**
- لا merge ولا deploy.
- لا تعديل في Vercel أو Supabase أو المحرك.
- لا FINANCIAL_ACCEPT ولا PUBLICATION_AUTHORIZED.
- الحجب 7/22/142/0 ثابت.

| | الفرع | الالتزام |
|---|---|---|
| **Implementation** (جديد، محلي) | `claude/aramco95-pr4-ci` | `170ad16d628c431c39b27faacf07c4d88cdd6021` (التزام واحد فوق `bc378a4`) |
| **Delivery** (محلي) | `claude/aramco95-selective-integration-a-pr-r01-review` | الالتزام الذي يحمل هذا التقرير، فوق `e75a198` |

## 1. الفرق (ملف واحد، +2 / −38)
`.github/workflows/aramco95-kernel.yml`، وفي قسم `on:` فقط:
```yaml
# No path filters: a change anywhere (vite.config.ts, entry points, a new consumer of the kernel, a dependency)
# can alter what the kernel ships or how it builds, so every pull request and every push to main runs the gate.
on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:
```
- **أُزيل:** قائمتا `paths`، وفي كل منهما 18 نمطًا، من `pull_request` ومن `push`.
- **بقي:** `push` محصورًا في `main`، و`workflow_dispatch`.
- **التحقق الآلي:** `jobs` و`permissions` و`concurrency` و`name` متطابقة تمامًا مع `bc378a4`، بمقارنة YAML المحلَّل.
- **لم يتغير أي سطر في:** سكربت الفحوص، والنواة، والاختبارات، والحمولات.
- **النتيجة لشروط التكليف:**
  - Ubuntu وWindows كما هما.
  - فحوص SHA والمولد مرتين ومخزن الثقة الفارغ كما هي.
  - فحص CRLF كما هو.
  - لا أسرار.
  - `contents: read` كما هو.
  - اختبارات التوقيع ضمن الاختبارات الـ34 التي لم تتغير.

## 2. التحقق من YAML والأحداث
**`actionlint` v1.7.7:**
- بصمة الحزمة طابقت ملف checksums الرسمي.
- القديم (`bc378a4`): 0 ملاحظات.
- الجديد (`170ad16`): 0 ملاحظات.
- shellcheck غير متاح في البيئة، فلم يُفحص به.

**`trigger_check.py`:** نموذج لقواعد المرشحات الموثقة في GitHub، يُطبَّق على `on:` القديم والجديد. **هو نموذج، لا GitHub نفسه.**

| الحدث | القديم | الجديد |
|---|---|---|
| PR يعدّل `vite.config.ts` فقط | لا يعمل | **يعمل** |
| PR يعدّل `src/server.ts` (نقطة الدخول) فقط | لا يعمل | **يعمل** |
| PR يضيف مسارًا يستهلك النواة | لا يعمل | **يعمل** |
| PR يعدّل `README.md` فقط | لا يعمل | **يعمل** |
| PR إلى فرع PR #4 يعدّل `vite.config.ts` | لا يعمل | **يعمل** |
| PR #5 نفسه (فرقه الحقيقي) | يعمل | يعمل |
| PR #4 مع CI إلى `main` (الفرق الحقيقي) | يعمل | يعمل |
| push إلى `main` يعدّل `vite.config.ts` | لا يعمل | **يعمل** |
| push إلى `main` يعدّل `README.md` | لا يعمل | **يعمل** |
| push إلى فرع ميزة يعدّل النواة | لا يعمل | لا يعمل، كما هو مطلوب (يغطيه `pull_request`) |
| تشغيل يدوي | يعمل | يعمل |

الفحوص الستة في النموذج كلها PASS. التفاصيل في `TRIGGER-CHECK.json`.

**الشرط 8: PR يستهدف `main` بعد الدمج.**
- `pull_request` بلا مرشح فروع، فيعمل على PR إلى أي قاعدة، ومنها `main`.
- GitHub يقرأ الـworkflow من مرجع الدمج (`refs/pull/N/merge`)، فيعمل على أي PR يحمل الملف أو تحمله قاعدته.
- بعد دمج الملف في `main`، يحمله كل PR لاحق، ويعمل `push` على `main`.
- `workflow_dispatch` لا يظهر في GitHub إلا بعد وصول الملف إلى الفرع الافتراضي.

**الشرط 7 على GitHub الحقيقي: لم يُختبر بعد.**
- دفع `170ad16` يطلق تشغيل PR #5. لكن فرق PR #5 كان مشمولًا بالمرشحات القديمة أيضًا، فلا يثبت الإصلاح.
- الإثبات الحقيقي يحتاج PR اختبار منفصلًا، بموافقة المالك:
  - يتفرع من `170ad16`، ويضيف سطر تعليق في `vite.config.ts` فقط، ويستهدف `claude/aramco95-pr4-ci`.
  - يجب أن يُطلق `aramco95-kernel`.
  - ثم يُغلق دون دمج.
  - الكلفة: محاولة Preview محمية إضافية.

## 3. الاختبارات المحلية على `170ad16`
`run_ci_local.py` يقرأ الخطوات من الـworkflow نفسه وينفذها في نسخ نظيفة.

| | Ubuntu (`autocrlf=false`) | Windows (`autocrlf=true`) |
|---|---|---|
| CR في `statements.ts` / الملفات المثبتة | 0 / 0 | 544 / 0 |
| الخطوات كلها | **PASS** | **PASS** |
| الاختبارات قبل التوليد | 34 pass / 0 fail | 34 pass / 0 fail |

السجلات في `CI-LOCAL-UBUNTU.json` و`CI-LOCAL-WINDOWS-AUTOCRLF.json`.

**آخر تشغيل حقيقي على GitHub** كان على `bc378a4`: run `39419512052`، ناجح على Ubuntu وWindows. خطواته وأوامره هي نفسها في `170ad16`.

## 4. نجاح الـworkflow لا يجعله إلزاميًا
- البوابة **استشارية** إلى أن يفعّل المالك branch protection أو ruleset على `main`، ويضيف `kernel (ubuntu-latest)` و`kernel (windows-latest)` كـ required status checks.
- حتى ذلك، يمكن الدمج والـworkflow أحمر أو لم يعمل.
- `push` إلى `main` يعمل بعد الدمج لا قبله، فهو كاشف لا مانع.
- لا يوجد اليوم أي حماية أو required checks على `main`.

## 5. ما تبقى قبل دمج PR #5
1. **موافقة المالك على دفع `170ad16`** إلى `claude/aramco95-pr4-ci`، ثم نجاح التشغيل على المنصتين.
   - تتطلب أيضًا التحقق المسبق من استمرار Require Log In.
   - الكلفة: محاولة Preview محمية.
2. **اختياري، وموصى به:** PR اختبار للشرط 7، كما في القسم 2.
3. **مراجعة Codex لإغلاق CI-R01.**
4. **قرار الضم:** fast-forward لفرع PR #4، مع تحديث قائمة السماح في `pr_scope_checks.py` لتقبل `.github/`.
5. **قرار المالك بتفعيل required checks على `main`**، وإلا بقيت البوابة استشارية.
6. **خارج PR #5:** حظر Vercel يبقى مانعًا قبل دمج PR #4، وسببه الفعلي يحتاج سجل النشر.

## 6. إعادة الإنتاج
**من جذر المستودع:**
- `python3 review-delivery/ARAMCO95/CI-R01-FIX/trigger_check.py bc378a4 170ad16 out.json`
- `actionlint .github/workflows/aramco95-kernel.yml`، على فرع CI.
- `python3 review-delivery/ARAMCO95/PR4-FINAL/run_ci_local.py <repo> 170ad16 false|true out.json`

**الفرق:** في `CI-R01.patch`.
