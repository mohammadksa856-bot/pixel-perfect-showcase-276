# BR-030: WEB-07 Final Engineering Rework (مراجعة Codex `fc59e76`)

- **التاريخ:** 2026-10-16
- **الفرع:** `claude/web-07-company-experience`.
- **النسخة المُراجَعة:** `6eab697`.
- **commit الكود:** `d7d88c1` (`d7d88c19fee626346b12d961f3a539fc31423f1f`).
- **commit الأدلة والتقرير:** يُذكر في رسالة التسليم وفي `CHANGELOG.jsonl`.
- **الحالة:** IMPLEMENTED, TESTED. **نطلب إعادة مراجعة Codex.** لا ACCEPT.
- **لم يُمسّ:** `main`، والإنتاج، وSupabase، والمحرك، والقيم، وسياسة 95%.
  - نطاق WEB-07 لم يتوسع؛ المانع المتبقي فقط.

## 1. WEB07-R02-PERIOD-KIND

- **`sharedProvenance`:** يقارن الآن نوع الفترة (`periodKind`) مع نهاية الفترة والمصدر والوحدة.
- **`segmentProvenance`:** يمرّر `period.kind`.
- **النتيجة:** سنة مالية وربع ينتهيان في التاريخ نفسه لا يُعدّان فترة واحدة، فيُعرض لكل صف فترته ومصدره.
- **`comparableCells`:** أعمدة المقارنة فقط لوحدة واحدة وهوية فترة واحدة (`kind|end`). يستبدل شرط «الوحدة + النهاية» في `company-overview.tsx`.
- **بيانات الفترة الأصلية:** تبقى كما هي في كل صف (اختبار يتحقق).

## 2. الانحدار المستقل

| الاختبار | النتيجة |
|---|---|
| `tests/web07-final-independent-period.test.ts` (Codex، الحالات الثلاث دون تخفيف) | **3/3** (كان 2/3) |
| `tests/web07-independent-provenance.test.ts` (R01–R03 الأصلية) | 3/3 |
| انحدار WEB-07 وWEB-06 (`web-07`، `web-03-04`، `web-06-d11-tabs`، `web-05b-boundary`، `web-readiness`، `web-06-polish`) | 91/91 |
| `bun test tests` | 427 ناجحًا، و14 متجاوزًا (تكامل المحرك الحي)، و0 إخفاق |
| `tsc --noEmit` | 0 |
| e2e WEB-07 / 05A / 05B (محلي، وضع مجمّد) | 17/17 / 17/17 / 26/26 |

## 3. Lint

- **التنسيق:** Prettier فقط على `tests/web07-independent-provenance.test.ts`، وعلى ملف Codex الجديد للفترة؛ لولا ذلك لأضاف مخالفات تنسيق جديدة.
- **إثبات أن الاختبارات لم تتغير:** `product-tracking/tools/token_compare.mjs` يقارن مسار الرموز (TypeScript scanner) مع ملفي Codex الأصليين.
  - النتيجة: **TOKENS IDENTICAL** للملفين (671/671 و664/664).
  - ما يُطبَّع فقط: المسافات، ونوع علامات الاقتباس، والفواصل المنقوطة، والفواصل الختامية، وأقواس معامل الدالة السهمية الواحد.
- **سكربت Codex `review-lint-tracked.mjs`:** ملفات Git المتتبَّعة، والقواعد دون تغيير.

| SHA | الملفات | الأخطاء | التحذيرات |
|---|---|---|---|
| `6ac8e4e` (الأساس السابق) | 237 | 846 | 23 |
| `6eab697` (المُراجَع) | 239 | 883 | 23 |
| `d7d88c1` (هذا الإصلاح) | 241 | **846** | 23 |

- **الـ37 مخالفة الجديدة:** أُزيلت. لا ملف جديد أو أسوأ مقارنة بـ`6ac8e4e` (مقارنة لكل ملف).
- **الـ846 السابقة:** دين قائم منفصل، موثّق في `lint-tracked-6ac8e4e.json`. لم يُنظَّف خارج النطاق، ولم تُعطَّل أي قاعدة.

## 4. المعاينة

- **النشر لـ`d7d88c1`:** READY/success.
  - https://pixel-perfect-showcase-276-9mdp62xty.vercel.app
  - صفحة البناء: https://vercel.com/mohammadksa856-bots-projects/pixel-perfect-showcase-276/G5fvZExJ9KmNCu2KE6YN6He7TXgS
- **المسارات:**
  - `/preview/web-v1/companies/2222/overview`
  - `/preview/web-v1/companies/2222/intelligence`
  - `/preview/web-v1/companies/2222?tab=business`
- **التحقق:** Codex فتح المسارات فعليًا على `6eab697`، بمتغيرات المعاينة نفسها لهذا الفرع. من بيئة التنفيذ هنا لا يمكن فتح `vercel.app` (سياسة الشبكة)، فلم أتحقق بنفسي من فتح نشر `d7d88c1`.

## الأدلة

`product-tracking/outbox/WEB-V1/web-07-final-rework/`
