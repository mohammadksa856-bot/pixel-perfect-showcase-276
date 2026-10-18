# WEB-08B05 — إغلاق المانع B05-R01 / P1 (مسارات Windows)

**المرجع:** مراجعة Codex `b910e1c6d53a5d7d701fd8b6930679d3590abe9f` (الحدث المركزي 111) على التنفيذ `8fb84fb` والتسليم `3681aa0`.

## المعرّفات

| البند | القيمة |
|---|---|
| الفرع | `claude/web-08b05-aramco-research-experience` |
| التنفيذ المراجَع | `8fb84fb7c804d0591f1bc7f7b9949ed929c6706d` |
| **Implementation SHA الجديد** | `a722af40dd9ee6f79588a5f21029ceb2755e9acb` (أبوه `3681aa0`) |
| **Delivery SHA** | commit هذا الملف |

**النطاق:** إصلاح Windows وحده.
- لا توسيع لنطاق B05، ولا تغيير في محتوى البحث أو B04 أو المحرك أو Supabase أو `src/`.
- لا تغيير في معيار 95%.

## ⚠️ بيئة Windows غير متاحة

- نُفّذ كل ما يلي على **Linux** (Bun 1.4.2). لم تتوفر لي بيئة Windows.
- **لا أدّعي نجاح الاختبارات أو الخادم أو فحص التسرب على Windows.**
- اختبار التحويل يتحقق من صيغة Windows بفرض `{ windows: true }` في `fileURLToPath`. هذا يثبت منطق التحويل، **ولا يحل محل التشغيل الفعلي على Windows.**

**المطلوب من Codex:** إعادة تشغيل الأوامر الثلاثة الأصلية على Windows بلا shim:

```text
git checkout a722af40dd9ee6f79588a5f21029ceb2755e9acb
bun install --frozen-lockfile
bun research-evidence/aramco-research-experience/server.ts          # ثم افتح http://127.0.0.1:4466/?lang=ar
bun test research-evidence/aramco-research-experience               # المتوقع 42 pass / 0 fail / 0 skip
bun run build
bun research-evidence/aramco-research-experience/public-leak-scan.ts # المتوقع hits 0، وfiles > 0
```

## 1. المقارنة مع B05-R01

| موضع Codex | السبب | الإصلاح في `a722af4` | الاختبار |
|---|---|---|---|
| `assets.ts:59` | `base: new URL("src/", ROOT).pathname`، وعلى Windows يصير `/C:/...` فلا يجد Tailwind المصادر | `base: toNativePath(new URL("src/", ROOT))` عبر `fileURLToPath` | تجميع CSS في `access.test.ts` و`experience.test.ts`. بصمة CSS مطابقة لـ`8fb84fb` |
| `access.test.ts:141` | `new URL("../../", import.meta.url).pathname` جذرًا للتجوال، فيفشل `readdirSync` على Windows | `walk(join(REPO_ROOT, "src"))`، و`REPO_ROOT` من `fileURLToPath` | `REPO_ROOT` يحوي `package.json` و`src/styles.css` (`paths.test.ts`) |
| `public-leak-scan.ts:54` | المجلد الافتراضي من `.pathname`، فلا يوجد على Windows | `DEFAULT_BUILD_DIR = join(REPO_ROOT, ".vercel", "output")` | `paths.test.ts`، وتشغيل الفحص بلا وسيط: `dir` مسار نظام، و292 ملفًا، و0 hits |

**المكان الجديد:** `paths.ts` هو المكان الوحيد للتحويل:
- `toNativePath(url, windows?)` = `fileURLToPath`.
- `REPO_ROOT`.
- `pathSegments(p)`: تقسيم المسار بأي فاصل.

## 2. الاستخدامات الأخرى لـ`.pathname` والفواصل

| الموضع | الحكم |
|---|---|
| `assets.ts`: `export const HERE_PATH = HERE.pathname` | غير مستخدم في أي ملف، **حُذف** |
| `access.test.ts`: `f.includes("/routes/")` | كان سيطابق صفرًا على Windows (`src\routes\...`)، فيمر الاختبار فارغًا. **استُبدل** بـ`pathSegments(f).includes("routes")` |
| `server.ts:82,87,88`: `u.pathname` | مسار طلب HTTP، لا مسار ملفات. صحيح على كل الأنظمة ولم يُغيَّر |
| قراءة الملفات الأخرى (`readFileSync(new URL(...))`، و`fontPath`، وحزمة B04) | تمر `URL` نفسه إلى `fs`، وهذا محمول. لم تُغيَّر |
| `model.ts`، `ui.tsx`، `copy.ts`، `server.ts` (سوى ما سبق) | لا `.pathname` ولا فاصل مكتوب يدويًا |

**الحارس الثابت:** اختبار جديد في `paths.test.ts`: «no B05 source builds a filesystem path from URL.pathname».
- يفشل إن ظهر `<x>.pathname` في أي ملف `.ts` أو `.tsx` في المجلد، باستثناء `u.pathname` (طلب HTTP).
- يشترط فحص 8 ملفات على الأقل، فلا يمر فارغًا.

القائمة الكاملة للمواضع المتبقية في `test-logs/b05-r01-scope-and-fingerprint.txt`.

## 3. منع المرور الفارغ

| الفحص | الضمانة الجديدة |
|---|---|
| عزل التطبيق (لا استيراد للحزمة أو للقارئ) | `src.length > 50`، ووجود `src/routes/__root.tsx` فعليًا بمقارنة الأجزاء |
| لا نص مسودة في المسارات | `routeFiles.length > 30` قبل فحص المحتوى |
| `REPO_ROOT` | يحوي `package.json`، و`src/styles.css` بـ`@source "../src";`، وأكثر من 30 ملف route |
| فحص التسرب العام | مجلد غير موجود يرمي `build_output_missing`، و`files === 0` يخرج بـ1 (موجود سابقًا ولم يُغيَّر) |
| الحارس الثابت | فحص 8 ملفات على الأقل |

**كل تأكيدات العزل والحجب السابقة باقية كما هي.** لا SKIP ولا `todo`، ولم يُضعَف أي فحص.

## 4. الملفات المتغيرة (`3681aa0..a722af4`)

كلها داخل `research-evidence/aramco-research-experience/`، و0 خارجه:

```text
access.test.ts      | 15 +++---   الجذر من REPO_ROOT، وroutes بالأجزاء، وتأكيدان ضد المرور الفارغ
assets.ts           |  4 +-       base عبر toNativePath؛ حذف HERE_PATH
paths.test.ts       | 61 ++++     جديد: 7 اختبارات
paths.ts            | 16 ++++     جديد: toNativePath، REPO_ROOT، pathSegments
public-leak-scan.ts |  7 ++-      DEFAULT_BUILD_DIR من REPO_ROOT
tsconfig.json       | 10 +++-     إضافة public-leak-scan.ts وpaths.ts إلى include (حتى يفحصهما tsc)
```

- لا تغيير في `src/`، و`supabase/`، و`tests/`، و`package.json`، و`bun.lock`، و`vite.config.ts`، وB01 حتى B04.
- لا تعديل في ملفات مراجعة Codex المستقلة.

## 5. النتائج على `a722af4` (Linux)

السجلات في `test-logs/`، وكل ملف يحمل SHA في سطره الأول.

| الفحص | النتيجة |
|---|---|
| B05 `bun test` | **42/42** (كانت 35؛ +7 في `paths.test.ts`)، 0 fail، 0 skip |
| B04 tests / `build.ts --check` | 270/270 / exit 0 (بصمات الحزمة = `946d7b4`) |
| B03 tests / check | 57/57 / exit 0 |
| B01 / B02 | 91/91 / 23/23 |
| app `bun test tests` | 427 pass، 14 skip (موجودة قبل B05)، 0 fail |
| tsc (app / B05 / B04) | 0 / 0 / 0 |
| eslint (B05 / B04) | 0 / 0 |
| `bun run build` | exit 0 |
| `public-leak-scan.ts` **بلا وسيط** | `dir` = `<repo>/.vercel/output`، و292 ملفًا × 105 علامة، و**0 hits** |
| الحجب (`tools/holds.ts`) | 7/7 BLOCKED، و22/22 WITHHELD، و142 WITHHELD، و0 مؤهل، و0 معتمد |
| HTTP القارئ (`tools/reader-http.ts`) | 405 و421 و404 كما كانت؛ وعنوان غير loopback مرفوض |
| تشغيل الخادم بالأمر الأصلي | `server-start.txt`: `http://127.0.0.1:4466/?lang=ar`، و200 |

## 6. الواجهة لم تتغير

بصمات sha256 للـCSS المجمّع وصفحتي AR وEN **متطابقة بايتًا** بين `8fb84fb` و`a722af4`:

| البصمة | sha256 |
|---|---|
| css | `79723a84…` |
| ar | `0f54a796…` |
| en | `266790f3…` |

النصوص الكاملة في `test-logs/b05-r01-scope-and-fingerprint.txt`.

لذلك لم يُعَد التقاط ما يلي، لأن مُدخلها لم يتغير:
- الصور الخمسون؛
- `a11y.json`؛
- `link-browser-check.json`؛
- `layout-measure.txt`.

## 7. القرار

يعود B05 إلى Codex لاتخاذ ACCEPT أو REWORK:
- **لا ACCEPT من المؤلف.**
- لا دمج ولا نشر.
- **لن يبدأ B06 قبل إغلاق B05 رسميًا.**
