# BR-027: WEB-06 D11، إصلاح تباين تبويب مجموعة الشركة النشط فقط

- **التاريخ:** 2026-10-15
- **الفرع:** `claude/web-06-d11-contrast-fix`، من `e57f00e` (head فرع `claude/web-06-visual-polish`).
- **المراجعة:** Codex، حزمة `eb60414`: FIX REQUIRED — D11 ONLY. D1–D10 وD12 مقبولة، وD13 غير منطبق؛ لم تُمسّ.
- **commit الكود:** `bd99cb7` (`bd99cb7ce99f5b0a27a6e1d21b4f93edbd83a29c`).
- **commit التقرير والأدلة:** يُذكر في رسالة التسليم.
- **الحالة:** IMPLEMENTED, TESTED. نطلب مراجعة Codex لهذا الإصلاح.
- `USER_FINAL_ACCEPTANCE` و`WEB06_CLOSED` لم يُسجَّلا.
- **لم يُمسّ:** النصوص، والمجموعات، والتنقل، والبيانات، وعدد الموضوعات، ورموز الألوان العامة، و`main`، والإنتاج، وAWS، وSupabase، والمحرك، و95%.

## التعديل: `src/components/web-v1/company-template.tsx` (`CompanyTabs`) فقط

| | قبل | بعد |
|---|---|---|
| التبويب النشط | `bg-brand text-brand-foreground` | `bg-brand/15 text-foreground ring-1 ring-inset ring-brand/70` |
| حجم النص ووزنه | `text-[13px] font-medium` (13px / 500) | بلا تغيير (13px / 500) |
| علامة غير لونية | لا شيء غير لون الخلفية | إطار داخلي حول التبويب النشط، و`aria-current="page"` |
| التركيز | مؤشر المتصفح | `focus-visible:outline-2 outline-offset-2 outline-brand` |
| نقاط الموضوعات على النشط | `bg-brand-foreground/70`، وكانت تفترض خلفية زرقاء مصمتة | ألوان حالتها كما في غير النشط |
| غير النشط والتحويم | `text-muted-foreground hover:bg-muted hover:text-foreground` | بلا تغيير |

- **الرموز:** كلها رموز وفئات قائمة (`brand`، `foreground`). لا لون مكتوب يدويًا، ولا تعديل عام على `brand`.

## القياس المحسوب (`tabs-before.json` و`tabs-after.json`)

| | SHA التطبيق | اللغة | العرض | النص / الخلفية (محسوبة) | الحجم / الوزن | تباين النشط | أدنى غير نشط | التحويم | عرض الصفحة | الصورة |
|---|---|---|---|---|---|---|---|---|---|---|
| before | `e57f00e` | ar | desktop 1440px | `#f6f9fb` / `#2389e2` | 13px / 500 | **3.455** | 5.959 | 12.295 | 1440/1440 | `before/desktop/company-tabs.ar.png` `621e5c82056a…` |
| before | `e57f00e` | en | desktop 1440px | `#f6f9fb` / `#2389e2` | 13px / 500 | **3.455** | 5.959 | 12.295 | 1440/1440 | `before/desktop/company-tabs.en.png` `b28ea546ae33…` |
| before | `e57f00e` | ar | mobile 390px | `#f6f9fb` / `#2389e2` | 13px / 500 | **3.455** | 5.959 | — | 390/390 | `before/mobile/company-tabs.ar.png` `9b4d494cdbc0…` |
| before | `e57f00e` | en | mobile 390px | `#f6f9fb` / `#2389e2` | 13px / 500 | **3.455** | 5.959 | — | 390/390 | `before/mobile/company-tabs.en.png` `0437a0d3a2aa…` |
| after | `bd99cb7` | ar | desktop 1440px | `#e4e8ed` / `#13253a` | 13px / 500 | **12.619** | 5.959 | 12.295 | 1440/1440 | `after/desktop/company-tabs.ar.png` `0b22f911d2a5…` |
| after | `bd99cb7` | en | desktop 1440px | `#e4e8ed` / `#13253a` | 13px / 500 | **12.619** | 5.959 | 12.295 | 1440/1440 | `after/desktop/company-tabs.en.png` `8c45261dee16…` |
| after | `bd99cb7` | ar | mobile 390px | `#e4e8ed` / `#13253a` | 13px / 500 | **12.619** | 5.959 | — | 390/390 | `after/mobile/company-tabs.ar.png` `31c078ba497e…` |
| after | `bd99cb7` | en | mobile 390px | `#e4e8ed` / `#13253a` | 13px / 500 | **12.619** | 5.959 | — | 390/390 | `after/mobile/company-tabs.en.png` `5962806dae8c…` |

- **النسبة:** قبل **3.455:1** (Codex: 3.436:1؛ الفرق من طريقة تركيب الخلفية، وكلاهما دون 4.5). بعد **12.619:1**، والمطلوب ≥ 4.5:1 لنص عادي.
- **الطريقة:** الألوان تُحل عبر canvas (oklch والشفافية)، وتُركَّب فوق خلفيات كل الأسلاف. `backdrop-blur` لا يُنمذج؛ هو يمزج خلفية الصفحة الداكنة نفسها.
- **لا تجاوز جديد للعرض:** عرض الصفحة = عرض الجهاز في الحالات الثماني. شريط التبويبات يمرر داخله على الجوال كما كان.

## لوحة المفاتيح والتركيز (كمبيوتر، عربي وإنجليزي، قبل وبعد)

- **Tab:** يصل إلى تبويب غير نشط.
- **مؤشر التركيز:** ظاهر (outline 2px بلون العلامة).
- **Enter:** ينقل إلى المجموعة، وتصبح هي النشطة، و`aria-current="page"` عليها.

## الاختبارات المستهدفة

| الفحص | النتيجة |
|---|---|
| `tests/web-06-d11-tabs.test.ts` (جديد، 6 حالات: تبويب نشط واحد لكل مجموعة، ونفس التبويبات، ونفس حجم النص، وإطار، و`aria-current`، ولا `bg-brand text-brand-foreground`) | 6/6 |
| الاختبارات المتصلة بقالب الشركة (`web-06-polish`، `web-v1-design`، `web-03-04`، `web-05b-boundary`، `design-preview-activation`) | مع الجديد: 55/55 |
| `tsc --noEmit` | 0 |
| eslint على الملفات المعدّلة | 0 أخطاء، وتحذير `react-refresh` واحد قائم |
| e2e 05A (صفحات الشركة والبحث، وضع مجمّد) | 17/17. اختبار الوضع الحي يحتاج المحرك المحلي، فلم يُشغَّل في هذا الإصلاح |
| القياس المحسوب ولوحة المفاتيح والتجاوز | أعلاه |

لم تُعَد دورة WEB-06 كاملة، ولم تُعَد الصور الـ96.

## الأدلة في `product-tracking/outbox/WEB-V1/web-06-d11-contrast-fix/`

- `before/` و`after/` بالشكل `{desktop,mobile}/company-tabs.{ar,en}.png`: شريط التبويبات فقط، بدقة ×2.
- `tabs-before.json` و`tabs-after.json`: الألوان المحسوبة، والحجم والوزن، والنسب، ولوحة المفاتيح، وsha256 لكل صورة.
- `d11-before-run.txt`، `d11-after-run.txt`، `unit-targeted.txt`، `tsc.txt`، `eslint-changed.txt`، `e2e-05a.txt`.
- الأداة: `product-tracking/tools/web_06_d11_tabs.mjs`.
  - انتظار انتهاء انتقال التحويم قبل الالتقاط أُضيف بعد commit الكود، فهو في commit التسليم. لا أثر له على التطبيق.

## قائمة السماح

- لم يُضف اسم هذا الفرع إلى `DESIGN_REVIEW_BRANCHES`، لأن المطلوب تعديل مظهر التبويب فقط.
- لذلك قد لا تعرض معاينة Vercel لهذا الفرع العينات المجمّدة. القياس أعلاه من خادم محلي بسياسة المعاينة نفسها (`VERCEL_GIT_COMMIT_REF=claude/web-06-visual-polish`).
- إن أردتم معاينة Vercel لهذا الفرع فهي إضافة سطر حرفي واحد، أنفذه عند الطلب.
