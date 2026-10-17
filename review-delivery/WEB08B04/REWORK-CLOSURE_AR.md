# WEB-08B04 — إغلاق REWORK ‏(FIN-01–07، ENG-01–04، LINK-01)

- **قرار Codex:** REWORK على `fa3a772daabaaecb44ee2eff842bb88456025f62` (حزمة `review-delivery/WEB08B04-INDEPENDENT/`). نُسخت الحزمة للقراءة والتشغيل فقط، ولم تُضَف إلى هذا الفرع.
- **التنفيذ السابق:** `2685d944f25b8dc3ef8d63147fded0d81551bef9`.
- **Implementation SHA الجديد:** `49eeed82b84d9e071a49b91b1c959e4f13a7b82b`. يضم commit الإصلاح `b244ade` ثم إصلاح عرض الجوال `49eeed8`.
- **Delivery SHA:** commit هذا الملف. توثيق وسجلات وصور فقط.
- **هذا ليس اعتمادًا:** القرار لجلسة Codex مستقلة. لم تُسجَّل ACCEPT.
- **الحجب ثابت:**
  - التحليلات السبعة BLOCKED.
  - الادعاءات الـ22 والمدخلات الـ142 WITHHELD.
  - لم يُحذف بحث، ولم يُرفع حجب أي بيان.

## 1. جدول الإغلاق

| البند | الملف | الإصلاح | الدليل (اختبار) |
|---|---|---|---|
| **ENG-01** مصدر الصف الأول ووحدته يُنسبان إلى كل الفترات | `evidence.ts` | لكل صف هويته الكاملة (`RowIdentity`). الوحدات أو العملات المختلطة ترفض بـ`heterogeneous_units`. صفان لنفس الهوية بمصدر أو إصدار مختلف يرفضان بـ`conflicting_rows`، وبهوية مكررة بـ`duplicate_rows`. عند تعدد المصادر يكون `source.url = null`، ويُرجَع `sourceCount` و`rows`. | `rework.test.ts` ENG-01 ×3؛ Codex adversarial: heterogeneous_units وconflicting_rows |
| **ENG-02** أي `fiscal_quarter` يُوسم ربعًا، حتى YTD | `evidence.ts` | `periodLabel` يوسم حسب النوع: `FY2025`، و`2026Q2`، و`YTD<start>..<end>`، و`TTM..`، و`@end`. النوع المجهول أو الناقص يرفض بـ`unlabelled_period`. الصف بلا نوع يأخذ نوع فئته (`KIND_OF`)، ولا يُخمَّن. | ENG-02 ×3؛ Codex adversarial: وسم YTD |
| **ENG-03** المبالغ بشكل السنة أو رمز السهم تتجاوز الحارس، والرقم المطابق في دليل غير ذي صلة يُقبل | `pack.ts` | `numberTokens` يقرأ الرقم مع صنف وحدته الملاصقة: نسبة، وعملة، ومقياس، وحجم، ومدة. **الكمية** مسموحة في `reported_record` و`management_plan` فقط، وبشرط ورود الرقم بأصناف الوحدة نفسها في الدليل المستشهد به (`unsupported_quantity`). الكمية في نوع آخر ترفض بـ`quantity_in_<kind>`. «2025 ريال» كمية. الأرقام المجمعة والعشرية تُقرأ رقمًا واحدًا. | ENG-03 ×4؛ Codex adversarial: quantity_in_research_interpretation وunsupported_quantity |
| **ENG-04** `Date.parse` يطبّع التواريخ المستحيلة، والتاريخ بعد اللقطة في السجل | `pack.ts` | كل تاريخ يمر بـ`isCivilDate` من B03 (`invalid_date`). سجل المحرك لا يحمل تاريخًا بعد `asOfDate`، حتى داخل سنة اللقطة (`future_date_in_record`). | ENG-04 ×2؛ Codex adversarial: invalid_date وfuture_date_in_record |
| **LINK-01** الموضوع مأخوذ من ارتباط الفقرة لا من موضع المقياس | `placement.ts` (جديد)، `pack.ts`، `build.ts`، `reader.ts` | الموضع يُحسب من نموذج التطبيق المقبول نفسه (`buildCompanyPreview` فوق اللقطة)، قراءة فقط. لكل رابط حالة: `FOCUSABLE` (موضوع + focus على عنصر معروض)، أو `CHART_ONLY_NOT_FOCUSABLE`، أو `NOT_RENDERED` (لا رابط، والحالة معلنة في المخرج والقارئ). | LINK-01 ×3؛ فحص متصفح 72/72 (`test-logs/link-browser-check.json`) |
| **FIN-01** السعة القصوى للخام مقابل مجموع السوائل | `content-business.ts`: up-spare وdr-volume وup-volumes | لا حساب للطاقة الفائضة. اختلاف النطاق معلن (خام مقابل خام + مكثفات + سوائل غاز)، مع ما يلزم لقياسها. الغاز لا يحده سقف الخام. | FIN-01 |
| **FIN-02** هوية ناقصة للربح لكل برميل | up-margin-logic، up-unit-costs | لا هوية ولا معادلة. البنود غير متجانسة الوحدة والنطاق (دولار/برميل خام، ودولار/برميل مكافئ، وبنود مالية للمجموعة)، ويُذكر ما يمنع تجميعها. | FIN-02/03 |
| **FIN-03** الفارق × الاستخدام لا يعرّف الربح | dn-earnings-logic، dr-margin | محركات لا معادلة. تُذكر الطاقة والإنتاجية والمردود والطاقة والمخزون والتحوط وحصص المشاريع المشتركة. | FIN-02/03 |
| **FIN-04** تعرفة الجافورة تُقرأ تحويلًا للإنفاق إلى تشغيلي | in-channels، pj-jafurah-purpose، pj-jafurah-risk-volume، rk-int-operational | ملاحظة المراجع على الإيضاح 34 مثبتة كمرجع مراجعة (`B04_JAFURAH_NOTE34`): الملكية والسيطرة التشغيلية تبقيان. المعالجة المحاسبية غير محسومة. الحد الأدنى للأحجام شرطي («قد»)، وليس «أي تأخير يصبح تكلفة ثابتة». | FIN-04 |
| **FIN-05** بدء السعة أو هدفها لا يثبت زيادة وزن الغاز | dr-capacity (نوعه صار `scenario`)، pj-gas-purpose، rk-sc-gas | سيناريو شرطي بلا اتجاه مؤكد. يُذكر الطلب وقرار الاستثمار وسعر الغاز غير المتاح. | FIN-05 |
| **FIN-06** التغطية ليست إثباتًا لمصدر التمويل، والسياسة ليست التزامًا، والترتيب غير حتمي | fa-cash-flow-d1، fa-dividends-d1، fa-dividends-d2، pg-rigs-reading، rk-sc-price | التغطية مقارنة لا تتبُّع، فالتمويل والأصول والنقد يدخلان. غياب تقرير إعادة شراء في المقتطف ليس دليل عدم حدوثها. التوزيع الأساسي سياسة قبل الإعلان. التزامات الحفارات المضمونة قد تخص الموردين أو الشركات التابعة. لا تسلسل «أولًا… ثم». التحليل يحمل `b02Inputs: ["dividends_paid"]` وبوابة `fcf_dividend_coverage`. | FIN-06/07؛ بوابات التحليلات |
| **FIN-07** ترتيب الخطر الجيوسياسي فوق غيره | rk-int-geopolitical | لا ترتيب. تصنيف نوعي لقنوات الأثر فقط. | FIN-06/07 |
| تعريفات التحليلات السبعة (FINANCIAL-ANALYSIS-REVIEW) | `content-financial.ts` | أُعيدت كتابتها. بوابات `OUTPUT_DEFINITION_NOT_BOUND:<gate>`: `capex_definition_scope`، و`net_debt`، و`net_debt_to_ebitda`، و`fcf_dividend_coverage` وغيرها. `total_liabilities` استبدل بـ`short_term_borrowings_net`. | «analyses carry the definition gates…» |

اختبار `the superseded overstatements are gone from every paragraph` يمنع عودة الصيغ المرفوضة في أي فقرة من الـ99، وليس في أمثلة Codex وحدها.

## 2. اختبارات Codex المستقلة (دون تعديل)

| الملف | blob المتوقع | المستخدم | النتيجة |
|---|---|---|---|
| `WEB08B04-INDEPENDENT/adversarial.test.ts` (12) | `4078c3c4f42e9b8883aeee23f9cd559a8be1cdd4` | مطابق | **12 / 0** |
| `WEB08B04-INDEPENDENT/boundaries.test.ts` (15) | `bc8ecb2b50a5f99b9506c711cc6ee06489e4ac84` | مطابق | **15 / 0** |
| `WEB08B03-REREVIEW/boundaries.test.ts` (قبول B03) | `bc8ecb2b…` | مطابق | **15 / 0** |

كل حالة من الـ12 تنجح للسبب المقصود: رمز الخطأ المتوقع نفسه، أو الوسم الصحيح. لم تنجح أي حالة لأن النص المرفوض حُذف. نُسخت الملفات للتشغيل فقط ولم تُضَف إلى الفرع.

## 3. مراجعة الفقرات الـ99

قرارات Codex في `PARAGRAPH-REVIEW.json`:
- 17 REWORK؛
- 4 REVIEW؛
- 78 «لا مانع جديد ضمن نطاق محدود».

بعد الإصلاح راجعتُ الفقرات الـ99 كلها مقابل أدلتها وملاحظات المراجع، لا أمثلة Codex وحدها. **41 فقرة تغيّر نصها:**

| الفئة | الفقرات |
|---|---|
| REWORK (17)، كلها أُعيدت كتابتها | up-spare، up-margin-logic، dn-earnings-logic، rv-mechanics، in-channels، dr-volume، dr-margin، dr-capacity (→ سيناريو)، pg-rigs-reading، pj-jafurah-purpose، pj-jafurah-risk-volume، pj-gas-purpose، fa-cash-flow-d1، fa-dividends-d1، fa-dividends-d2، rk-int-operational، rk-int-geopolitical |
| REVIEW (4)، كلها عُدّلت | pj-msc-risk (عبء محتمل على العائد لا تدمير قيمة حتمي، مع قيمة الأمان والخيارات)، rk-int-financial (مقايضات سيولة محتملة لا ضغط قائم)، rk-sc-price (حذف التسلسل الحتمي)، rk-sc-gas (لا افتراض لبقاء الحد الأدنى في كل حالة) |
| ملاحظات Codex على فقرات بلا مانع | bm-ownership-interp (فصل التوزيعات للمالك المباشر عن الإيرادات المالية الأوسع)، up-unit-costs (الإنفاق/برميل ليس تكلفة اقتصادية كاملة)، dn-petro-rabigh (النسبة وحدها لا تثبت السيطرة؛ `B04_PETRO_RABIGH_CONTROL`)، rv-segments (أُضيفت مراجع الإنفاق والإهلاك)، in-transfer-gap (أساس السعر العادل المذكور في الإيضاح 4؛ `B04_TRANSFER_PRICING`)، dr-price (اختلاف الإتاوات والضريبة)، pg-frame، pj-marjan-purpose، pj-marjan-risk، pj-gas-risk، pj-msc-purpose، fa-revenue-d1 (المبيعات ليست الإنتاج)، fa-profitability-d1 (مطابقة EBIT للقطاعات مع الموحد)، rk-int-sector (نطاق كثافة الكربون ومقامها) |
| مراجعتي الذاتية الإضافية | up-volumes (نطاق السوائل)، fa-capex-d1 (الإنفاق النقدي مقابل الإضافات المعترف بها)، fa-wc-d1 (إيضاحات الذمم الحكومية والإتاوات)، rk-sc-production، rk-sc-downstream، fin-coverage (YTD النصف الأول 2026 فترة مستقلة، لا ربع) |

- **الفقرات الـ58 الباقية:** النص كما هو، وتغيّر ترقيم مراجع الأدلة فقط (E-ids)، لأن مراجعات `fa3a772` الجديدة أُضيفت إلى خريطة الأدلة.
- **فقرات «لا مانع جديد ضمن نطاق محدود»:** أبقيت كما هي، فوصف Codex لها ليس شهادة دقة. حدودها في القسم 6.

**التوزيع الجديد:**

| النوع | العدد |
|---|---|
| سجل المحرك | 31 |
| خطة إدارة | 6 |
| تفسير بحثي | 32 |
| افتراض | 3 |
| سيناريو | 5 |
| طريقة تحليل | 4 |
| فجوة | 18 |

قبل الإصلاح: 33 تفسيرًا و4 سيناريوهات. انتقلت فقرة dr-capacity من تفسير إلى سيناريو.

## 4. الروابط (LINK-01)

- **72 مقياسًا** (كان 71):
  - أُضيف `short_term_borrowings_net` و`downstream_depreciation_amortization` لأن التحليلات صارت تستشهد بهما.
  - أُزيل `total_liabilities`.
- **التوزيع:**
  - `FOCUSABLE`: 29.
  - `NOT_RENDERED`: 43 (بلا رابط، والحالة معلنة).
  - `CHART_ONLY_NOT_FOCUSABLE`: 0.
- **التحقق:** Chromium مقابل خادم vite محلي على اللقطة المجمدة. 72/72 صحيحة:
  - كل `FOCUSABLE` يصل إلى `[data-focused=true]` بالمفتاح نفسه داخل `[data-intel-topic]` المطلوب؛
  - كل `NOT_RENDERED` لا يظهر مؤشره في أي موضوع.
- **مقارنة مع تدقيق Codex:** تطابق 69 من 71. الاختلافان مقاييس تاريخية تُعرض منحنى (`data-chart`) خارج موضوع القوائم، ولا يستهدفها `focus`. لذلك تُعلَن غير متاحة للتركيز بدل الادعاء بأنها قابلة له.
- **ملاحظة تشغيلية:** وضع fixtures في خادم التطوير يقبل فرعًا من قائمة سماح. شُغّل محليًا بـ`VERCEL_GIT_COMMIT_REF=claude/web-07-company-experience` مع `MAREFA_DESIGN_FIXTURES=true` و`VERCEL_ENV=preview` و`WEB_V1_PREVIEW_ENABLED=true` و`ENGINE_PREVIEW_ENABLED=true`. لم يُعدَّل التطبيق ولا قائمة السماح.

## 5. الاختبارات على `49eeed8` (`test-logs/`)

| التشغيل | النتيجة |
|---|---|
| B04 (pack 23 + rework 22 + reader 5) | **50 / 0** |
| Codex B04 adversarial | 12 / 0 |
| Codex B04 boundaries | 15 / 0 |
| B03 | 57 / 0 |
| قبول B03 من Codex | 15 / 0 |
| B01 | 91 / 0 |
| B02 | 23 / 0 |
| التطبيق `bun test tests` | 427 ناجحًا / 14 متجاوزًا (API حي غير مجهز) / 0 فاشل |
| tsc للتطبيق ولـB04 | 0 / 0 |
| ESLint لـB04 | 0 |
| `build.ts --check` لـB04 | 8/8 مطابقة |
| `build.ts --check` لـB03 | 6/6 بلا تغيير |
| بناء التطبيق | exit 0، محليًا |
| القارئ | 200 / 404 / 405، ورفض APP_BASE غير الآمن |
| القياس | 1440 و390 و340 و320، بالعربية والإنجليزية، بلا تجاوز أفقي |
| النطاق | خارج مجلدي B04 تغيّر `product-tracking/CHANGELOG.jsonl` فقط. 0 تغيير في `src` وSupabase وB01/B02/B03 و`tests/` |
| الصور | 20 (manifest على `49eeed8`) |

**ملاحظة صادقة:**
- **ما وُجد:** بعد `b244ade` كشف القياس على الجوال عرض تمرير 401px، سببه رموز موانع طويلة بلا التفاف.
- **الإصلاح:** في `49eeed8`، بقاعدة CSS للالتفاف.
- **التحقق:** أُعيدت كل السجلات والصور عليه.

## 6. حدود باقية (لا يغلقها هذا الإصلاح)

1. **الأصل:** لم يطالع المؤلف الأصل. ملاحظات المراجع على الإيضاحات 4 و34 وحاشية الإنتاج مثبتة بالـSHA كطبقة مراجعة، لا كتحقق من المؤلف.
2. **الحارس الرقمي:** حارس نحوي-دلالي محدود.
   - يمنع الكمية خارج السجل والخطة، ويشترط تطابق الرقم والوحدة.
   - لا يثبت أن الكمية في السجل هي المقياس المالي نفسه في الدليل. لذلك لا كميات مالية في التفسيرات أصلًا.
3. **فقرات بلا مانع جديد:** الـ78 التي قال عنها Codex «لا مانع جديد ضمن نطاق محدود» ليست معتمدة.
4. **مقاييس المصدر:** التعريفات غير IFRS غير مربوطة، ولا رقم مؤهل.
5. **الترجمة:** النسخة الإنجليزية ما زالت بنية ومقدمة.
6. **الحقوق:** حقوق المصادر الخارجية غير موثقة.
