# QB1-A-NONFIN: المراجعة النهائية للتغييرات (delta)

**ما رُوجع:**
- الفرق من `7d65277` (التسليم السابق) إلى `0c0de9e` (التسليم الجديد)، والتنفيذ `656b70d`، على الفرع `codex/aramco95-qb1-nonfinancial`.
- السجلات الثلاثة المصححة وملحق FX-1 فقط، دون إعادة جرد الـ19.

**القرار: `EVIDENCE_ACCEPT` لحزمة NONFIN remediation وحدها.**
- ليس تأهيلًا، ولا منحًا للحقوق، ولا إذنًا بالعرض.
- لا يحسم تعريف `founding_date` ولا `subsidiaries_count`، فهما للمالك.
- لا يمس حزمتي المالية، ولا اعتماد ذاتي لها.
- لم أعدّل ملفات Codex.
- لا تغيير في الحجوب (7/22/142/0) أو المحرك أو الموقع أو السجل المركزي.

**الأدوات:** `nonfin_delta_review.py`، وسجله `nonfin-delta-review-checks.txt`، والنتيجة المهيكلة `NONFIN-DELTA-REVIEW.json`. النتيجة: 24 فحصًا، كلها PASS.

## نتيجة السجلات الثلاثة المصححة

| السجل | ما تحققت منه في PDF، بأداتي pypdf وpdftotext | النتيجة |
|---|---|---|
| QB1-NF-18 employees | PDF 16: «Company employees4»، والحاشية 4 تحيل إلى القسم 3، والحاشية 6 هناك عن SABIC Agri-Nutrients وZPC. PDF 76: الحاشية 6 «Applies to the Saudi Arabian Oil Company (the Company)». الحاشية 2 (employees and contractors) تخص صفوف السلامة لا العدد. العمود عمود 2025، ولا نص يثبت نهاية السنة أو المتوسط. السجل يقول `information_as_of = null` و`measurement_basis = NOT_STATED` و`period = FY2025` | **سليم التصحيح** |
| QB1-NF-12 products_services | PDF 56 هو الموضع الرئيسي، ونصه «refining, chemicals, supply and trading, distribution, retail, base oils, lubricants, and power generation». كل بند في `item_mapping` موجود على صفحته. فروق الصياغة موسومة: retail fuels وtrading وpower ليست `DIRECT_TERM`، وNGL موسومة توسيعًا لاختصار. `distribution` موثقة غائبة عن قائمة المحرك، ولم تُعدَّل القائمة. الحالة باقية `COMPOSITE_REVIEW_REQUIRED` | **سليم التصحيح** |
| QB1-NF-11 business_description | الموضعان PDF 8 («integrated energy and chemicals companies») وPDF 9 («…Upstream and Downstream, which are supported by Corporate activities.»). الحالة `SOURCE_SUPPORTED_PARAPHRASE` مع `PARAPHRASE_NOT_DIRECT_QUOTATION`. جملة المحرك غير موجودة حرفيًا في الصفحتين | **سليم التصحيح** |

**تصحيح لملاحظتي السابقة:** Codex محق في أن PDF 56 كان مدرجًا في `7d65277`. الجديد أنه صار الموضع الرئيسي. كلمة «refined products» موجودة على PDF 56 أيضًا، وكان بحثي الأول سطرًا بسطر فلم يلتقطها لأنها تمتد بين سطرين.

## الثابت والمعلّق

- **السجلات العشرة سليمة الأدلة:** مطابقة بايتًا (JSON قانوني) لما كانت عليه في `7d65277`.
- **السجلات الستة المعلقة:** مطابقة بايتًا أيضًا، ولم تُرفع حالة أي منها.
  - `PENDING-DECISIONS.json` يذكر الستة كلها بحالات `PENDING_*`، ولا يغلق المُعدّ أيًا منها، ولا يصرح بتعديل المحرك.
- **في السجلات الثلاثة:** قيمة المحرك ومرجعه والموافقات والفئة والعرض لم تتغير.
- **نطاق التغيير:** الفرق يقتصر على `NONFINANCIAL/` و`INDEPENDENT-SOURCE-CHECKS/`. الملفات الـ26 في `ARTIFACT-MANIFEST` تطابق بصماتها، ولم يُلمس أي ملف في `FINANCIAL/` الذي أملكه.
- **التوصية بتاريخ `stale_after`:** لم يعتمدها Codex. هذا خلاف غير مانع، وتبقى الحداثة ضمن المعلّقات.

## ملحق FX-1 (وFX-2)

- **FX-1:** وُسم الادعاء السابق خطأً (`previous_claim_incorrect`).
  - حقيقة `label` تطابق الاستيراد المسجل `42bd5c4`: القيمة 243,099، والصفحة 179، والميزانية الموحدة.
  - بصمة `mapping.py` تطابق `b70254e` (`b3250084…`)، والسطر 11 يحوّل التسمية إلى cash.
  - لا رجوع إلى `cash_end`. حُذفت جملة التتبع الخاطئة، وبقي خطأ موضع الصفحة 179 مستقلًا.
- **FX-2:** هويات الصفوف الأربع في ملحق Codex تطابق سجلي المالي المصحّح `bb02da3`: معرّف الصف في الملف الملتزم به، ومعرّفه في حالة التشغيل. Codex لم يدّعِ إعادة إنتاج حالة التشغيل.

## فحوص Codex: أعدت تشغيلها في worktree معزول

| المجموعة | النتيجة هنا |
|---|---|
| `test_evidence.py` الأصلية | 18/18 PASS |
| `test_remediation.py` البنيوية | 14/14 PASS |
| `test_remediation.py` لقراءة المصدر (pdfplumber) | 11/12 PASS. **واحد NOT_RUN:** `test_FX3_original_H1_hash_and_note` يحتاج PDF النصف الأول الخاص (`web08b02-private-20261017/H1-Q2-2026.pdf`)، وهو غير متاح هنا |

**المجموع:** 43 PASS، و1 لم يُشغَّل، و0 FAIL. Codex أعلن 44 PASS، ولا أحتسب الفحص غير المشغّل ناجحًا. هذا الفحص يخص جسر PRefChem في الملحق المالي، لا أيًا من السجلات الثلاثة.

## التصنيف بعد القبول

| الفئة | السجلات |
|---|---|
| سليمة الأدلة هندسيًا (10) | legal_name، listing_date، legal_form، headquarters_address، reporting_standard، website، ceo_name، chairman_name، auditor، geographic_presence |
| سليمة التصحيح مع استمرار اعتماد التعريف (3) | employees: هل عدد الشركة الأم يناسب حقل الكتالوج؟ products_services: قائمة مركبة وفروق صياغة. business_description: إعادة صياغة تحتاج اعتمادًا تحريريًا |
| معلقة لمصدر ناقص أو حداثة أو قرار مالك (6) | legal_name_ar، isin، investor_relations_url (لقطة أصلية محفوظة بالبصمة)، founding_date وsubsidiaries_count (قرار المالك في التعريف)، credit_rating (قرار وكالة أصلي مؤرخ) |
