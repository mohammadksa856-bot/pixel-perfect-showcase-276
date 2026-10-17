# WEB-08B04 — إغلاق RR-ENG03-01: رفض محارف التنسيق الخام قبل الحجب

## الإصدارات

| البند | القيمة |
|---|---|
| قرار Codex | REWORK محصور في RR-ENG03-01 (`RAW_FORMAT_CONTROL_LOST_WHEN_ALL_DIGITS_MASKED`)، على `b58ecc24af7055eb86a569ca99d7d3813a0868f7` (`review-delivery/WEB08B04-STRUCTURAL-FINAL/`) |
| الحدث المركزي | 109، `event_sha256` `4b8d90b0f66a8ae7f10fceee1ef5abbf7750536c9cc3fdf729f646984aadceee`، ويحفظ الحدث 108 `6d858de8…` |
| التنفيذ المراجَع | `8e89637` |
| تسليمه | `c737e9b` |
| **Implementation SHA الجديد** | `946d7b48a06048e146b31825d88690aad93773e8` |
| **Delivery SHA** | commit هذا الملف (توثيق وسجلات وصور فقط) |

## النطاق

- **ما يشمله:** سياسة محارف التنسيق الخام وحدها.
- **ما لم يُفتح:**
  - FIN-01–07 وLINK-01 وRR-ENG02-01؛
  - الفقرات الـ99؛
  - قائمة ISO 4217 (طابقها Codex كاملة: missing=[]، extra=[]).
- **ما لم يتغير في الكود:**
  - تصميم `numeric-guard.ts`، و`iso4217.ts` (0 تغيير)؛
  - `NON_ASCII_NUMBER`، والفترات، وتصنيف العملات.
- **B05:** لم يبدأ.
- **الحجب ثابت:** 7/7 BLOCKED، و22/22 WITHHELD، و142 WITHHELD، وصفر تأهيل (`test-logs/holds.txt`).
- **لا ACCEPT من المؤلف.**

## 1. السبب والإصلاح

### السبب

كان `checkText` يرفض محرف `\p{Cf}` الخام مباشرة فقط حين لا يحوي النص رقم ASCII. وإلا ترك الرفض لحلقة الأرقام. لكن `mask()` يحجب التواريخ وأكواد المراحل وترقيم القوائم، فإذا وقعت كل الأرقام فيها:
- `analyseNumbers()` يُرجع قائمة فارغة؛
- سبب `format_control` لا يصل إلى أي رقم؛
- الفقرة تُقبل.

### الإصلاح

تعديل واحد في مرحلة النص الخام في `pack.ts` (`checkText`)، قبل أي حجب ودون الاعتماد على `NumberToken`:

```ts
const control = FORMAT_CONTROL.exec(text);
if (control) {
  const rawDigits = /[0-9]+/.exec(text)?.[0];
  throw Error(
    rawDigits
      ? `ambiguous_number_format:${where}:${rawDigits}:format_control`
      : `format_control:${where}:${codePoint(control[0])}`,
  );
}
```

### عقد الأخطاء (محفوظ)

- **محرف تنسيق مع رقم خام:** `ambiguous_number_format:<where>:<أول تسلسل أرقام خام>:format_control`، حتى لو كان الرقم سيُحجب لاحقًا.
- **بلا أرقام:** `format_control:<where>:U+XXXX`.
- **موضع الحقل:** `<where>` يحمل `:en` للحقل الإنجليزي.
- **الأولوية:** `non_latin_digits` يبقى قبل هذا الفحص كما كان.
- **رسائل الحالات السابقة:** لم تتغير، لأن أول رقم خام في نصوصها هو الرقم نفسه الذي كانت الحلقة تذكره. اختبارات المؤلف السابقة (205) واختبارات Codex الأصلية تنجح دون تعديل.

## 2. الحالات الـ39 (`test-logs/structural-39-reasons.txt`، `codex-b04-structural-independent.txt`)

| الحالات | النص | النتيجة |
|---|---|---|
| 1، 5، 9، 13، 17، 21 | `التاريخ 2025-06-30` + U+200B / 200E / 061C / 2060 / 202E / FEFF | `ambiguous_number_format:…:2025:format_control` |
| 2، 6، 10، 14، 18، 22 | `WEB-08B03` + المحارف الستة | `ambiguous_number_format:…:08:format_control` |
| 3، 7، 11، 15، 19، 23 | `وصف` + المحارف الستة | `format_control:…:U+XXXX` |
| 4، 8، 12، 16، 20، 24 | `السنة 2025` + المحارف الستة | `ambiguous_number_format:…:2025:format_control` |
| 25–26 | `Date 2025-06-30` و`WEB-08B03` + U+200B في الحقل الإنجليزي | `ambiguous_number_format:…:en:…:format_control` |
| 27 | `B02` + U+200B | `ambiguous_number_format:…:02:format_control` |
| 28 | `1. وصف` + U+200B | `ambiguous_number_format:…:1:format_control` |
| 29 | `2025-06-30 WEB-08B03` + U+200B | `ambiguous_number_format:…:2025:format_control` |
| 30–33 | النصوص نفسها بلا محرف تنسيق | مقبولة |
| 34–36 | `التاريخ ２０２５-06-30`، و`WEB-08B０３`، و`USD ²` | `non_latin_digits:…:U+FF12 / U+FF10 / U+00B2` |
| 37 | `2025-06-30` + U+200B + ` السنة 2025` | `ambiguous_number_format:…:2025:format_control` |
| 38–39 | `USD (2025-06-30)` و`SAR: WEB-08B03` + U+200B | `ambiguous_number_format:…:format_control` |

**`mask-probe.ts`** (`test-logs/mask-probe-reasons.txt`): 36 تشغيلًا، تسعة نصوص × حقلان × نوعان. كلها `accepted=false` بالسبب المقصود.

## 3. اختبارات المؤلف (`raw-format-control.test.ts`، 65)

- **ضوابط:** النصوص الثمانية بلا محرف تنسيق تُبنى في نوعي `research_interpretation` و`reported_record`.
- **الرفض بنص الخطأ الكامل:** في `ar` و`en`، وفي النوعين، لثمانية نصوص:
  - تاريخ؛
  - كودا مراحل (`WEB-08B03` و`B02`)؛
  - ترقيم قائمة؛
  - كل الأرقام محجوبة؛
  - عملة بجوار تاريخ محجوب؛
  - سنة غير محجوبة؛
  - نص بلا أرقام.
- **حالة كل الأرقام محجوبة** (اختبار مستقل): لخمسة نصوص يُثبت الاختبار ثلاثة أمور:
  - `FORMAT_CONTROL` موجود ورقم ASCII موجود؛
  - `analyseNumbers()` فارغة، فلا تستطيع حلقة الأرقام الرفض وحدها؛
  - البناء يفشل بخطأ سياسة النص الخام بالضبط.
- **11 محرف تنسيق:**
  - المحارف: ZWSP وZWNJ وZWJ وLRM وRLM وALM وWJ وRLO وLRI وBOM والشرطة اللينة.
  - المواضع: قبل الكود، وبعده، وداخل الكلمة قبل التاريخ، وفي ترقيم القائمة.
- **أولوية `non_latin_digits`:** يبقى قبل فحص محرف التنسيق.

## 4. النتائج على `946d7b4` (`test-logs/`)

| التشغيل (ملفات Codex من `b58ecc2` دون تعديل، البصمات في السجلات) | النتيجة |
|---|---|
| `structural-independent.test.ts` (blob `57c53e20`) | **39 / 0** (كانت 20 / 19) |
| `final-independent.test.ts` | 53 / 0 |
| `residual-independent.test.ts` | 72 / 0 |
| `additional.test.ts` | 14 / 0 |
| `adversarial.test.ts` | 12 / 0 |
| `boundaries.test.ts` | 15 / 0 |
| `b03-original.test.ts` | 15 / 0 (blob نفسه `bc8ecb2b`) |
| `mask-probe.ts` و`edge-probe.ts` و`guard-probe.ts` | 0 حالة `accepted=true` |
| B04 كاملة (pack 23، rework 22، residual 14، punctuation 60، numeric-guard 81، raw-format-control 65، reader 5) | 270 / 0 |
| B03 | 57 / 0 |
| B01 | 91 / 0 |
| B02 | 23 / 0 |
| التطبيق | 427 ناجحًا، 14 متجاوزًا (API حي غير مجهز)، 0 فاشل |
| tsc للتطبيق ولـB04 | 0 / 0 |
| ESLint المحدد لـB04 | 0 |
| بناء التطبيق | exit 0 |
| `build.ts --check` لـB04 | 8/8 |
| `build.ts --check` لـB03 | 6/6 |
| القارئ | 200 / 200 / 404 / 405، و99 فقرة، و7 BLOCKED |
| القياس | 320–1440، بلا تجاوز |
| روابط المتصفح | 72 / 72 |

## 5. المخرجات الثمانية

- كل المخرجات الثمانية SAME مقابل `8e89637`، والبصمات في `scope-and-hashes.txt`.
- عدد المتغير منذ `acd116c`: 0.
- لا محرف تنسيق في نص البحث، فالسياسة لا تمس المسودة.

## 6. حدود

- السياسة ترفض أي `\p{Cf}` في نص الفقرة كله، حتى لو كان بعيدًا عن الأرقام. هذا مقصود، ونص الحزمة لا يحتاجه.
- الرقم في رسالة `ambiguous_number_format` هو أول تسلسل أرقام خام، وقد يكون جزءًا من تاريخ أو كود محجوب («08» من `WEB-08B03`). الغرض تحديد السبب، لا تفسير الرقم.
- باقي حدود الحارس كما في `RR-ENG03-01-FINAL-CLOSURE_AR.md` القسم 7.

## 7. السجل المركزي

- **ما أُضيف:** أحداث إلى `product-tracking/CHANGELOG.jsonl`، بالإلحاق فقط ودون حذف شيء.
- **الإشارة إلى الحدث 109:** ببصمته `4b8d90b0…`.
- **ما لم يُحدَّث:** اللوحة المركزية ليست في هذا المستودع، فلم أحدّثها.
