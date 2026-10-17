# WEB-08B03 — تقرير إغلاق REWORK R01–R05

- **الحالة:** REWORK IMPLEMENTED, TESTED — بانتظار إعادة مراجعة Codex الكاملة. **لا ACCEPT.**
- **الفرع:** `claude/web-08b03-aramco-disclosures`.
- **Implementation SHA الثابت:** `1735609abafa85ee6e101ab7e3640496f0e43088`.
  - `5ffc0fd` يحمل إصلاحات R01–R05.
  - `1735609` يضيف إصلاح عرض bidi للمراجع اللاتينية في خلايا المشاريع العربية.
  - كل المخرجات والصور والسجلات مولدة على `1735609`.
- **Delivery SHA:** commit هذا التقرير. لا يغيّر كودًا بعد `1735609`. تحقق بـ`git diff --stat 1735609 <Delivery SHA>`.
- **قرار المراجعة:** REWORK على `b72ad3a` (تسليم `1030fa8`).
  - حزمة المراجعة: `review-delivery/WEB08B03-INDEPENDENT/` على الفرع `review/web08b03-independent-20261017` عند `dcdecad97c3c8babd67931a817e69d0cd7a7d6d6`.
  - الحزمة لم تُنسخ إلى هذا الفرع. ملف `boundaries.test.ts` يُنسخ مؤقتًا للتشغيل فقط، ويُثبت أنه غير معدّل ببصمة git blob.
- **إصلاحا التسليم السابق `6b1b2d5` محفوظان:**
  - تحذير الأرقام داخل الاقتباسات؛
  - سعة المشاريع.

  أُعيد بناء الثاني ضمن R03، ولا يُعدّان إغلاقًا لقرار REWORK.
- **لم يُمسّ:**
  - `main`، والإنتاج، وSupabase، والمحرك، وWEB-07؛
  - عقود B01 وB02C وB02D، والمدخلات الـ142 (تبقى محجوبة)، ومعيار 95%.
  - لا تأهيل ولا نشر لأي ادعاء. لم يبدأ B04.

## 1. حالة الحالات المستقلة الـ15 (ملف Codex الأصلي دون تعديل)

السجل: `test-logs/codex-independent-original.txt`. بصمة الملف المستخدم = git blob الأصلي `bc8ecb2b50a5f99b9506c711cc6ee06489e4ac84`.

| الحالة | على `1030fa8` | على `1735609` | سبب الرفض أو النجاح الآن |
|---|---|---|---|
| CONTROL: 22 WITHHELD | pass | pass | — |
| F01 بصمة متعارضة | fail | pass | `document_sha256_conflicts_with_pinned` |
| F01 تأريخ رجعي للنشر | fail | pass | `document_published_at_earlier_than_recorded_filing` |
| F02 assumption | fail | pass | `unsupported_category:assumption` |
| F02 research_opinion | fail | pass | `unsupported_category:research_opinion` |
| F03 سنة توجيه FY2026 | fail | pass | `identity.period.fiscalYear=2026` بنوع `non_financial`، بلا بداية أو نهاية مخترعة، و`limitations` تذكر 2026 |
| F04 دمج حدثين متعارضين | fail | pass | `event_group_incompatible:evt-capex-guidance-2026:capital_guidance/acquisition` |
| F05 بصمتان لرابط واحد | fail | pass | `b02_conflicting_artifact_identity:FY2025:…` |
| F06 تاريخ مستحيل | fail | pass | `invalid_effect_period:…:date:2025-02-30` |
| F07 حقن HTML في التاريخ | fail | pass | كل حقول الأثر والنصوص مهربة |
| F08 `APP_BASE=javascript:` | fail | pass | `safeAppBase` يرفضه: لا روابط، وتنبيه ظاهر؛ والخادم يرفض الإعداد عند التشغيل |
| F09 مُصدر آخر | fail | pass | `curation_company_mismatch:US:OTHER` |
| CONTROL: 9 / 17 / 18 | pass | pass | الأعداد محفوظة؛ 17 = مجموعات سجلات (R04) |
| R10 هدف الغاز | fail | pass | يُقتبس الجزء غير المتعارض فقط (R03) |
| R11 سعة مقتبسة | fail | pass | `stated_in_engine_quote_not_extracted` |

**النتيجة: 15 ناجحة، و0 فاشلة.** لا اختلاف يحتاج تبريرًا.

تأكدنا أن كل رفض يأتي من الحارس المقصود، لا من خطأ عرضي. الرسائل في الجدول أعلاه من تشغيل منفصل.

## 2. جدول الملاحظات ← الملف ← الإصلاح ← الدليل

| # | الملف | الإصلاح | الدليل (اختبارات المؤلف) |
|---|---|---|---|
| **R01** إسناد الأدلة (P1) | `contract-bridge.ts` (`bindingConflicts`)، `register.ts` (فحص B02) | يُرفض البناء عند أي مما يلي: بصمة المحلّل تخالف بصمة B02 المثبتة؛ وقت نشر أقدم من تاريخ الإيداع المسجل أو غير ISO بالميلي ثانية؛ رابط أو شركة المحلّل يخالفان الادعاء؛ شركة السجل تخالف شركة الادعاء (`companyId` جديد في الادعاء)؛ معرف مستند مشتق من الرابط؛ إصدار أو بصمة غير صالحين. السجل يرفض بصمتين أو رابطين مختلفين لنفس رابط أو مفتاح B02، بدل اختيار الأول. لا هويات اصطناعية: `bridgeAll` يمرر null دائمًا | `describe("R01 evidence binding")`: 6 اختبارات، منها حالة القبول السابقة |
| **R02** الدلالة والفترات (P1) | `contract-bridge.ts` (`semantics`، `periodOf`) | `official_fact` ← `published_fact/actual`. `management_plan` ← `published_fact/issuer_guidance`. `assumption` و`research_opinion` يُرفضان صراحة (`unsupported_category`). سنة FY المثبتة ← `fiscalYear` دون فترة تقرير. سنة الهدف لا تصبح `fiscalYear`. سنة مستقبلية لا تكون `actual` (`future_period_as_actual`). القيد الأول يقول إن النص مقطع من المحرك، لا بيان مُصدر موثق | `describe("R02 claim semantics and periods")`: 4 اختبارات |
| **R03** مطابقة الأصل (P1) | `source-review.ts` (جديد)، `curation.ts`، `register.ts`، `demo.ts` | انظر التفاصيل تحت الجدول | `describe("R03 …")`: 4 اختبارات؛ واختبار المشاريع؛ واختبار العرض «gas target» |
| **R04** الهوية والأحداث والتواريخ (P2) | `curation.ts` (`CURATION_COMPANY`، `EVENT_GROUPS`)، `register.ts` | انظر التفاصيل تحت الجدول | `describe("R04 …")`: 5 اختبارات |
| **R05** أمان القارئ المحلي (P2) | `demo.ts` | تهريب كل حقل متغير، بما فيه السمات وأكواد الفجوات المجهولة. `safeAppBase`: يقبل http(s) على loopback فقط (127.0.0.1 أو localhost أو ::1)، بلا مسار أو استعلام أو بيانات اعتماد. غير ذلك: لا روابط، وتنبيه `data-app-base-rejected`، و`createDemoServer` يرمي `unsafe_app_base`. بقيت قيود CSP وnoindex وno-store وGET-only وloopback | `describe("R05 local reader safety")`: 3 اختبارات، منها 10 قيم APP_BASE مضللة؛ و`demo-http.txt` |
| N01 جدول المشاريع على الجوال | `demo.ts` (CSS `table.stack`) | تحت 760px تتحول جداول المشاريع والمجموعات والوثائق إلى بطاقات بعناوين حقول. منع كسر الكلمات حرفًا حرفًا. `<bdi>` لمراجع الصفحات في RTL | `layout-measure.txt`: أصغر خلية 287px عند 340px و333px عند 386px، بلا تجاوز للعرض؛ وصور `mobile-*` |
| N02 / N03 | — | لا تغيير. لا ندّعي رحلة متصفح إلى 5173، ولا اختيار as-of تاريخيًا | — |
| N04 الحقوق | `REPORT_AR.md` (G5) | إذن المستخدم التجاري محفوظ ولا يُعاد طلبه. منح حقوق المصادر الخارجية فجوة منفصلة ما زالت مفتوحة | — |

**تفاصيل R03 — طبقة مراجعة منفصلة عن نص المحرك:**
- **الطبقة:** `source-review.ts` ينقل نتائج المراجع لكل ادعاء من الـ22: الحالة، وصفحات PDF، وحكم الموضع، والتعارض، والاشتقاق، وعدم ثبوت اليوم. كل ادعاء يحمل `sourceReview` مع `reviewSha`.
- **هدف الغاز:** يُقتبس الجزء غير المتعارض فقط («Aramco targets growth in sales gas production capacity»).
  - نص المحرك الكامل محفوظ في `engineExcerpt` للتتبع، مع `conflictingFragment="more than 80%"`.
  - البناء يفشل إن احتوى الاقتباس الجزء المتعارض، أو إن تجاهل التنسيق تعارضًا سجله المراجع.
- **المواضع:** صفحات المحرك محفوظة كما هي (`pageOrigin="engine_record"`)، بجانب صفحات المراجع: بترورابغ 232 ← 233، والمنح والرسملة 139 ← 140.
- **فجوات جديدة:**
  - `engine_text_not_verified_against_original` لكل ادعاء؛
  - `engine_text_conflicts_with_original`؛
  - `locator_conflicts_with_independent_review`؛
  - `original_locator_not_found`؛
  - `derived_figure_in_engine_text` (الحفارات: 36 مشتقة)؛
  - `exact_date_unverified`.
- **الجسر:** يرفض البناء عند تعارض المعنى أو الموضع أو الاشتقاق.
- **المشاريع:** ثلاث حالات بدل «غير معلن»:
  - `stated_in_engine_quote_not_extracted`؛
  - `in_original_per_independent_review_not_extracted` (مع الصفحات)؛
  - `not_in_engine_record_original_unchecked`.

  لا توجد قيمة `not_disclosed` في أي مخرَج (اختبار). `effect.kind` صار `not_stated_in_record`.

**تفاصيل R04 — الهوية والأحداث والتواريخ:**
- **الشركة:** التنسيق مقيد بـ`SA:2222`. `snapshotFrom` يقرأ السوق من اللقطة بدل تثبيته.
- **التواريخ:** فحص تقويمي لكل حقول الأثر وتواريخ السجلات المرجعية. يُرفض: 2025-02-30، و2025-13-01، والصيغ الناقصة، والفترات المعكوسة، والسنوات خارج 1900–2100، والمدد الفارغة.
- **مجموعات الأحداث:** كل `eventId` يحتاج قرار مجموعة (`basis`) في `EVENT_GROUPS`. يُرفض ما يلي:
  - اختلاف النوع أو الموضوع؛
  - تعارض تاريخ الحدث؛
  - عدد سجلات يخالف الأساس المعلن؛
  - مجموعة غير منسقة؛
  - علاقة غير متبادلة.
- **فترات الأثر:** المجموعة تحمل كل فترات أثر ادعاءاتها (`effects`) بدل الأولى.
- **العدّ:** `economicEventVerified=false` لكل مجموعة. `counting.events` يعرّف الـ17 بأنها مجموعات سجلات منسقة. مراحل المشاريع `composite_of_distinct_milestones`.
- **المنح والرسملة:** راجعنا العلاقة. المراجع يشير إلى أن الأصل يربط الرسملة بالمنحة. أُعلن الربط متبادلًا (`possibly_same_corporate_action`)، ولم يُدمج: المؤلف لم يطّلع على الأصل، والدمج قرار للمراجع (القرار 6).

## 3. مراجعة الادعاءات الـ22 مقابل النتائج المستقلة

لا فك حجب تلقائيًا. الرموز:
- `ENG` = نص المحرك لم يُطابَق مع الأصل
- `MEANING≠` = تعارض المعنى
- `PAGE≠` = تعارض الموضع
- `NOLOC` = لا موضع في الأصل
- `DERIVED` = رقم مشتق
- `DAY?` = اليوم غير مثبت

بقية الرموز كما في `REVIEW-HANDOFF_AR.md`.

| claim | category | reviewer status | engine page → reviewer PDF pages | gaps | disposition |
|---|---|---|---|---|---|
| `aramco-capex-guidance-2026` | management_plan/issuer_guidance | REVIEW | — → — | ID VER SHA LOC- RIGHTS FIN EDIT ENG NOLOC | Original locator required; WITHHELD |
| `aramco-sales-gas-growth-2030` | management_plan/management_target | REWORK | — → 13, 50, 54 | ID VER SHA LOC- RIGHTS FIN EDIT ENG MEANING≠ | Conflicting part withheld from quote; engine text kept for tracing; WITHHELD |
| `aramco-msc-12mbd` | management_plan/management_target | SUPPORTED_MEANING_NOT_APPROVED | — → 13, 26 | ID VER SHA LOC- RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-project-milestones-2025` | official_fact | SUPPORTED_COMPOSITE_NOT_APPROVED | — → 13, 15, 54 | ID VER SHA LOC- RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-jafurah-midstream-contract` | official_fact | SUPPORTED_MEANING_NOT_APPROVED | 71 → 71 | ID VER LOC? RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-rig-purchase-commitments` | official_fact | SUPPORTED_WITH_DERIVATION_CAVEAT | 69 → 69 | ID VER LOC? RIGHTS FIN EDIT ENG DERIVED | Derived figure flagged; bridge refuses; WITHHELD |
| `aramco-contingencies-ordinary-course` | official_fact | SUPPORTED_MEANING_NOT_APPROVED | 230 → 230 | ID VER SHA LOC? RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-contingencies-management-view` | management_plan/management_expectation | SUPPORTED_MANAGEMENT_ESTIMATE_NOT_APPROVED | 230 → 230 | ID VER SHA LOC? RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-sadara-petro-rabigh-support` | official_fact | SUPPORTED_MEANING_NOT_APPROVED | 230 → 230, 231 | ID VER SHA LOC? RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-customer-credit-concentration` | official_fact | SUPPORTED_MEANING_NOT_APPROVED | 192 → 192 | ID VER SHA LOC? RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-hydrocarbon-risk-factors` | official_fact | REVIEW | — → — | ID VER SHA LOC- RIGHTS FIN EDIT ENG NOLOC | Original locator required; WITHHELD |
| `aramco-q4-2025-base-dividend` | official_fact | SUPPORTED_MEANING_NOT_APPROVED | — → 235 | ID VER SHA LOC- RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-q4-2025-base-dividend-action` | official_fact | SUPPORTED_MEANING_NOT_APPROVED | — → 235 | VER SHA LOC- RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-buyback-2026` | official_fact | SUPPORTED_MEANING_NOT_APPROVED | — → 140, 246 | ID VER SHA LOC- RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-buyback-2026-action` | official_fact | SUPPORTED_MEANING_NOT_APPROVED | — → 140, 246 | VER SHA LOC- RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-fy2025-results-publication` | official_fact | REVIEW | — → 34, 36 | ID VER SHA LOC- RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-fy2025-dividends-paid` | official_fact | SUPPORTED_TITLE_NOT_NUMERIC_APPROVAL | — → 40, 235 | VER SHA LOC- RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-petro-rabigh-stake-2025` | official_fact | REWORK | 232 → 233 | VER SHA LOC? RIGHTS FIN EDIT ENG PAGE≠ DAY? | Engine page kept; conflict recorded; bridge refuses; WITHHELD |
| `aramco-bonus-2023` | official_fact | REWORK | 139 → 140 | VER SHA LOC? RIGHTS FIN EDIT ENG PAGE≠ DAY? | Engine page kept; conflict recorded; bridge refuses; WITHHELD |
| `aramco-capital-increase-2023` | official_fact | REWORK | 139 → 140 | VER SHA LOC? RIGHTS FIN EDIT ENG PAGE≠ DAY? | Engine page kept; conflict recorded; bridge refuses; WITHHELD |
| `aramco-bonus-2022` | official_fact | REWORK | 139 → 140 | VER SHA LOC? RIGHTS FIN EDIT ENG PAGE≠ DAY? | Engine page kept; conflict recorded; bridge refuses; WITHHELD |
| `aramco-capital-increase-2022` | official_fact | REWORK | 139 → 140 | VER SHA LOC? RIGHTS FIN EDIT ENG PAGE≠ DAY? | Engine page kept; conflict recorded; bridge refuses; WITHHELD |

## 4. التشغيلات على `1735609` (سجلات منفصلة، لا تُجمع)

| التشغيل | النتيجة | السجل |
|---|---|---|
| B03 المؤلف | 57 ناجحًا، و0 فاشل (كانت 34) | `b03-tests.txt` |
| حالات Codex الأصلية | 15 ناجحة، و0 فاشلة | `codex-independent-original.txt` |
| B01 دون تعديل | 91 / 0 | `b01-regression.txt` |
| B02 دون تعديل | 23 / 0 | `b02-regression.txt` |
| التطبيق `bun test tests` | 427 ناجحًا، و14 متجاوزًا (API حي غير مجهز، ليست نجاحًا)، و0 فاشل | `app-unit.txt` |
| tsc للتطبيق ولـB03 | exit 0 / exit 0 | `tsc-app.txt`، `tsc-b03.txt` |
| ESLint لمجلد B03 | exit 0 | `eslint-b03.txt` |
| `build.ts --check` | المخرجات الست مطابقة | `build-check.txt` |
| بناء التطبيق `bun run build` | exit 0، محليًا دون نشر | `app-build.txt` |
| العرض المحلي | 200 / 404 / 405؛ CSP وnoindex وno-store؛ 22 بطاقة WITHHELD؛ 18 موضوعًا؛ 5 مجموعات؛ 17 مجموعة أحداث؛ 0 `not_disclosed`؛ رفض APP_BASE غير الآمن | `demo-http.txt` |
| القياس | 340 و386 و400 و1295 بالعربية والإنجليزية، بلا تجاوز للعرض | `layout-measure.txt` |
| النطاق والبصمات | لا ملف خارج مجلدي B03 سوى `CHANGELOG.jsonl` | `scope-and-hashes.txt` |

- **الصور:** 12 صورة في `screenshots/` (حاسوب 1440، وجوال 390، بالعربية والإنجليزية)، و`application_sha=1735609…` في `IMAGE_MANIFEST.json`.
- **حدود الصور:** صور المؤلف ليست بديلًا عن فحص المتصفح المستقل، ولا رحلة إلى خادم 5173.

## 5. ما بقي مفتوحًا عمدًا (ليس مما يغلقه هذا REWORK)

- **التحقق من الأصل:** لم يتحقق المؤلف من نص التقرير السنوي الأصلي. الشبكة في بيئته تحجب `aramco.com` (403 من الوكيل). نتائج الأصل منقولة من المراجع كطبقة مراجعة، لا كحقائق، ولم يُعدَّل بها المحرك.
- **بصمة التقرير السنوي:** بصمة المراجع `78bb678e…` بيانات مراجعة، لا بصمة مثبتة أو إصدار. تبقى `original_artifact_sha256_missing`.
- **فجوات التأهيل:** لا هوية مستند موثوقة، ولا ربط حي (B02C BLOCKED)، ولا منح حقوق للمصادر الخارجية، ولا مراجعات مالية أو تحريرية. الادعاءات الـ22 كلها WITHHELD، و0 قابل للبناء.
- **قرارات للمراجع:**
  - دمج المنحة والرسملة؛
  - موضع التوجيه الرأسمالي في مصدر أصلي أو إفصاح مستقل؛
  - صياغة هدف الغاز من الأصل عند توفر هوية موثوقة.

## 6. إعادة الإنتاج

```text
git fetch origin claude/web-08b03-aramco-disclosures
git checkout 1735609abafa85ee6e101ab7e3640496f0e43088      # LF checkout (core.autocrlf=false)
bun install --frozen-lockfile
bun test research-evidence/aramco-disclosures             # 57 pass
mkdir -p review-delivery/WEB08B03-INDEPENDENT
git show dcdecad97c3c8babd67931a817e69d0cd7a7d6d6:review-delivery/WEB08B03-INDEPENDENT/boundaries.test.ts > review-delivery/WEB08B03-INDEPENDENT/boundaries.test.ts
git hash-object review-delivery/WEB08B03-INDEPENDENT/boundaries.test.ts   # bc8ecb2b50a5f99b9506c711cc6ee06489e4ac84
bun test ./review-delivery/WEB08B03-INDEPENDENT/boundaries.test.ts       # 15 pass, 0 fail
bun test research-evidence/v1 && bun test research-evidence/aramco-qualification && bun test tests
bun x tsc --noEmit -p . && bun x tsc -p research-evidence/aramco-disclosures/tsconfig.json --noEmit
bun x eslint research-evidence/aramco-disclosures
bun research-evidence/aramco-disclosures/build.ts --check
bun research-evidence/aramco-disclosures/demo.ts          # http://127.0.0.1:4453/?lang=ar | ?lang=en
APP_BASE='javascript:alert(1)//' bun research-evidence/aramco-disclosures/demo.ts   # يرفض: unsafe_app_base
```
