# ARAMCO95 — تقرير التصحيح الموجّه للإسقاط المالي

**الحالة المطلوبة:** ENGINEERING_REVIEW_READY، للمراجعة المستقلة الثانية.

**الحالة الفعلية للعمل:**
- **IMPLEMENTED وTESTED:** نعم.
- **ACCEPTED:** لا. لم يُمنح `SOURCE_ACCEPT` ولا `FINANCIAL_ACCEPT` ولا `PUBLICATION_AUTHORIZED`.

**التنفيذ:** `a7153db30c54344d41a1f59cedc5726605f6201b`. التسليم هو الالتزام الذي يليه مباشرة، وفيه الوثائق والسجلات وأدوات E2E.

**المرجع المراجَع:** `825ce317dfd9d5d7d103c73e5df01b198db77abd`، على الفرع `claude/aramco95-financial-projection`.

**النطاق:**
- القيم كلها اصطناعية، وعلاماتها `7770xx` و`777101…`.
- لا قيم T1 حقيقية.
- لا دمج ولا نشر.
- لا تعديل على المحرك الأصلي (`b70254e`، وبصمته متطابقة قبل الاختبار الطرفي وبعده) ولا على Supabase.
- الحجب 7/22/142/0 لم يتغير.

## الموانع السبعة: ما تغيّر وأين يُختبر
الاختبارات في `tests/financial-projection.test.ts` (31 اختبارًا، كلها ناجحة)، وكل مانع في كتلة `describe` مستقلة.
- **«خادم»:** الاختبار يمر عبر Server Function فعلية (`fetchCompanyPreview` أو `frozenDesignPreview` أو `fetchPeerTable`) بطلب `fetch` مزيّف، ويفحص الاستجابة المسلسلة كاملة.
- **«E2E»:** اختبار HTTP حقيقي (`e2e_http.py`). يشغّل محركًا مرقّعًا على نسخة مؤقتة، وموقع `vite dev`، على `127.0.0.1`.

### M1 — الهوية: لا ملء افتراضي (A1)
**التغيير:** `strictIdentity` في `src/lib/engine/publication-gate.server.ts`.
- الحقول العشرة يجب أن تكون موجودة صراحةً وبنوعها.
- الصيغ المشروعة هي فقط ما يسمّيه العقد صراحةً:
  - للرصيد `instant`: بداية غائبة صراحةً.
  - للتدفق: بداية حقيقية ≤ النهاية.
  - عملة تساوي رمز الوحدة النقدية، أو `""` لوحدة غير نقدية.
- **أُزيل كل تعويض:** `scope` إلى `consolidated`، و`dimensions` إلى `{}`، والعملة من الوحدة، والبداية من نوع الفترة.

**الاختبارات:**

| الاختبار | ما يثبته |
|---|---|
| `each missing identity field → identity_incomplete (no default)` | يُحذف كل حقل من العشرة وحده، فيُرفض الصف |
| `wrong types → identity_incomplete` | أنواع خاطئة لكل حقل، منها `version` بقيمة 0 أو 1.5 أو `"1"`، وأبعاد غير نصية، وتاريخ غير موجود |
| `contradictions → identity_contradictory` | رصيد ببداية، وتدفق ببداية بعد النهاية، وعملة مخالفة للوحدة، وعملة لوحدة غير نقدية |
| `the legitimate forms are exactly the explicit ones…` | الصيغ المشروعة وحدها تمر |
| `a valid approval cannot rescue an incomplete row…` | اعتماد موقّع صحيح لا ينقذ صفًا ناقصًا |

### M2 — خط الأساس للمسار المجمّد وحده (A2)
**التغيير:**
- `applyPublicationGate(page, approvals, { mode })` بوضعين صريحين.
- **`frozen_design_fixture`:** يقبل الهويات الـ521 بمفتاح `frozenRowKey`، وهو المفتاح الذي بُني به `publication-baseline.json`. أُعيد بناء الملف فجاء متطابقًا بايتًا.
- **`live_engine`:** لا يقرأ خط الأساس إطلاقًا.

**الاختبارات:**

| الاختبار | ما يثبته |
|---|---|
| `frozen mode keeps every fixture row; live mode keeps none of the same rows` | الصفوف نفسها: تبقى كلها في الوضع المجمّد، ولا يبقى منها شيء في الوضع الحي |
| `server function, live path: the fixture's own rows (baseline identities) produce no value cell` | خادم: حمولة الـfixture نفسها عبر المسار الحي تعطي صفر خلايا قيمة |
| `frozen path: previews unchanged…` | خادم: `frozenDesignPreview` بلا تغيير |
| `a new row is not in the frozen baseline: withheld even in frozen mode` | صف جديد يُحجب حتى في الوضع المجمّد |

### M3 — السلطة: الكلمات ليست قرارات (A3)
**التغيير:**
- سجلات `marefa-publication-approvals/1` موقّعة بـ Ed25519. كل سجل مربوط بـ:
  - بصمة الهوية الصارمة الكاملة (`fact/2`).
  - مرجع القرار والجهة المصدِرة وتاريخي الإصدار والانتهاء.
- **مخزن الثقة `publication-trust.json`:** مثبّت في المستودع، وفارغ.
  - لا بنية اعتماد موثوقة بعد، فكل قيمة حية جديدة **محجوبة افتراضيًا**.
  - لا متغير بيئة ولا معامل في مسار الخادم يغيّر المخزن.
  - الخيار `trust` في الدالة النقية لا يصل إليه إلا كود. لا يمر إليه أي مدخل وقت التشغيل: لا ملف ولا طلب ولا بيئة.
- **لا مسار اختبار يصطنع اعتمادًا صالحًا للعرض العام:**
  - مفتاح الاختبار يُولَّد في الذاكرة لكل تشغيل.
  - يُمرَّر للدالة النقية فقط.
  - ثبت أنه مرفوض عبر الخادم.

**الاختبارات:**

| الاختبار | ما يثبته |
|---|---|
| `the committed trust store is empty and the server paths take no trust input` | المخزن فارغ، ولا قناة لتغييره |
| `unsigned old-style ledger entries with all three states → withheld (server function and pure)` | خادم: قيود السجل القديم بالحالات الثلاث محجوبة |
| `bypass: correctly signed decisions from a key that is not committed never reach the server response` | خادم: الثلاثية موقّعة توقيعًا صحيحًا بمفتاح غير مثبّت، ولا قيمة في الاستجابة |
| `verification logic (pure function with an explicit test trust store): only the full signed triple passes` | يُرفض كل من: غياب أي قرار من الثلاثة، وجهة غير مخوّلة لهذا القرار، وجهة غير معروفة، وتوقيع على موضوع آخر، ومرجع قرار معدّل، وسجل منتهٍ، وسجل مستقبلي، وتوقيع تالف، وجهات ملغاة، ومفتاح ليس Ed25519 |
| `a decision is bound to the full identity: new version, source or value is a new key` | تغيير الإصدار أو المصدر أو القيمة يعطي مفتاحًا جديدًا، فلا يغطيه القرار القديم |
| `WITHHELD wins, in live mode over a full triple and in frozen mode over the baseline` | `WITHHELD` يغلب في الوضعين |

**E2E:** أربعة ملفات اعتماد، كلها بلا أي قيمة اصطناعية في أي صفحة:
1. لا ملف.
2. كلمات JSON بلا توقيع.
3. سجلات موقّعة صحيحًا بمفتاح عابر غير مثبّت، عبر `sign_untrusted.ts` على هويات المحرك الفعلية.
4. ملف تالف.

### M4 — النظراء (A4)
**التغيير:**
- `/peers` لا يحمل مفتاح مصدر ولا إصدارًا ولا بداية فترة.
- لذلك `applyPeerGate` يفرّغ **كل** قيمة نظير، والاستجابة المشوّهة تصبح `null`.
- يبقى ذلك حتى يتغير العقد.

**الاختبارات:**
- `pure: all values emptied, whatever fields a row claims`: حتى صف يدّعي مفتاح مصدر وإصدارًا.
- `server function fetchPeerTable: no peer value reaches the table; malformed responses do not throw`: خادم.

### M5 — المدخلات المشوّهة (A5)
**التغيير:**
- `structuredClone` ثم تنظيف الحاويات. كل حاوية أو فترة أو صف بنوع غير متوقع يُحذف.
- البوابة لا ترمي.
- `fetchCompanyPreview` يلفّ البوابة والبناء في `try/catch`، ويعيد `engine_unavailable/preview_build_failed`.

**الاختبارات:**
- `pure gate: never throws, never keeps a synthetic value`: ثمانية تشوّهات للحمولة، ومدخلات أولية.
- `server function: malformed engine payloads return a controlled state, never a value or a thrown error`: خادم.
- `malformed approval records: invalid state, nothing verifies, no throw`.
- `unreadable approvals file through the server function`: خادم.

### M6 — Q4 عبر `annual_position` (B6)
**التغيير:** `quarterBalanceSources` في `src/lib/engine/statements.ts`.
- Q1–Q3 من `quarter_position`، لتواريخ نهاية ربع فقط.
- Q4 من `annual_position`، لتاريخ نهاية السنة المالية فقط، داخل نافذة الأرباع المعروضة.
- النوع المتوقع `instant`.
- تاريخ نهاية السنة داخل `quarter_position` يُتجاهل، فلا ازدواج ولا تعارض.
- التدفقات السنوية لا تدخل جدول الأرباع.
- دون `quarter_position` لا يتغير شيء.

**الاختبارات:**

| الاختبار | ما يثبته |
|---|---|
| `Q1–Q4 cash balances, each once, Q4 from the year-end balance` | الأرباع الأربعة، كل منها مرة واحدة، في قسم الميزانية |
| `a year-end date inside quarter_position is ignored…` | لا ازدواج لـ Q4 |
| `annual flows never become Q4 flows…` | إيراد Q4 هو الصف الربعي، لا صف السنة |
| `without the new quarter_position key nothing changes…` | الـfixtures المجمّدة كما هي |
| `new quarter balances still go through the gate first…` | الأرصدة الربعية الجديدة تمر بالبوابة أولًا |

### M7 — التواريخ (B7)
**التغيير:**
- `fiscalYearEndMonth` يقبل `MM-DD` نهايةَ شهر حقيقية فقط، و`02-29`.
- `fiscalDateKind` يعطي `quarter_end` أو `fy_end`، فقط لآخر يوم حقيقي في الشهر في تلك السنة.

**الاختبارات:**
- `fiscal year end validation`.
- `December year end`.
- `March and June year ends`.
- `February year end and leap years`: فبراير 2024 نهايته 29، ففبراير 28 في 2024 مرفوض، و29 في 2025 غير موجود. نهاية السنة في نوفمبر تجعل فبراير نهاية ربع.
- `integration: a March year-end company gets December as a quarter end, March from annual_position`.

## C — عدم الارتداد

| المطلوب | الدليل |
|---|---|
| حالات سلبية مستقلة للموانع السبعة | الكتل M1–M7 أعلاه |
| لا قيمة غير معتمدة في أي Server Function أو حمولة مسلسلة | اختبارات «خادم» في M1–M5، و E2E بأربعة سيناريوهات × أربع صفحات |
| لا تجاوز عبر خط الأساس | M2 |
| لا تجاوز عبر سجل اعتماد مصطنع | M3، و E2E `signed_by_untrusted_key` |
| المعاينات المجمّدة لم تتغير | بصمة اللقطة `1fd028d1…ec03a` مطابقة لـ `27a7785` و`825ce31` (`test-logs/frozen-preview-identity.txt`) |
| Q1–Q4 دون ازدواج | M6 |
| W0 والاختبارات الموروثة | انظر «النتائج» |

## النتائج القابلة لإعادة الإنتاج

| الفحص | الأمر | النتيجة |
|---|---|---|
| اختبارات التصحيح | `bun test tests/financial-projection.test.ts` | 31 ناجحًا، 0 فاشلًا |
| W0 | `bun test tests/w0-evidence-overlay.test.ts` | 17 ناجحًا، 0 فاشلًا |
| المجموعة كاملة | `bun test` | 2087 ناجحًا، 6 فاشلة |
| مقترح المحرك | `python3 review-delivery/ARAMCO95/PROJECTION/engine/test_engine_proposal.py` | 7/7 |
| HTTP طرفي | `python3 review-delivery/ARAMCO95/PROJECTION/e2e_http.py` | 8/8، والمحرك الأصلي لم يتغير (`E2E-HTTP-RESULTS.json`) |
| لقطة المسار المجمّد | `bun review-delivery/ARAMCO95/PROJECTION/snapshot_previews.ts <out>` ثم `sha256sum` | `1fd028d1ef0f1b5d6f6f88cb81502df0118e31221843c22a8033b30817fec03a` |
| الأنواع والتنسيق | `tsc --noEmit` و`eslint` و`prettier --check` | نظيفة |
| البناء | `vite build` | نجح؛ صفر ظهور لنصوص البوابة أو الثقة في الحزمة الثابتة (`test-logs/build.txt`) |

**عن المجموعة كاملة:** الإخفاقات الستة هي نفسها في `27a7785` و`825ce31`، وكلها موروثة وخارج هذا التغيير. عدد الناجح ارتفع بعدد الاختبارات الجديدة. التفاصيل في `test-logs/suite-comparison.txt`:
- 3 اختبارات فاشلة.
- 3 ملفات لا تُحمَّل.

## ملاحظات للمراجع
- **الأثر على المسار الحي:** مع مخزن ثقة فارغ، المسار الحي (المعطّل افتراضيًا) لا يعرض أي قيمة مالية. هذا هو الفشل المغلق المطلوب. تفعيله يحتاج:
  - بنية اعتماد يقرّها المالك: من يمسك المفاتيح، وكيف تُلغى، وأين يُحفظ سجل القرارات المحمي.
  - ثم إضافة جهة إلى المخزن بتعديل مراجَع.
- **عيب النقد الموروث:** `cash` مقابل `cash_and_cash_equivalents` في `annual_position` موثق منفصلًا في `CASH-METRIC-PROPOSAL_AR.md`. لم يُطبَّق.
- **الوثائق:**
  - `CONTRACT-PROPOSAL_AR.md` صُحّح ليطابق التصميم الجديد.
  - `PROJECTION-REPORT_AR.md` يصف تسليم `825ce31`، وما خالف هذا التقرير فيه صار ملغى.
