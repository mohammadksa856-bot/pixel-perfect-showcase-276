# WEB-06: حزمة الاعتماد البصري لمعرفة استثمار

> ملف الفهرس الوحيد لهذه الحزمة، للمستخدم وChatGPT.
> - **ما هي:** حزمة مراجعة بصرية للنطاق المقبول هندسيًا من WEB-01 إلى WEB-05C ضمن المعاينة المجمّدة.
> - **ما ليست:** ليست اعتمادًا من المستخدم، ولا إغلاقًا لـ WEB-06، ولا لوحة مهام.

## 1. النسخ والبيانات

| البند | القيمة |
|---|---|
| **التطبيق المعروض** | `c3bfd2f18cd145c25ae26aa826f4100c99342f51` (فرع `claude/web-05c-reader-final-fixes`)، دون أي تعديل على الكود |
| **ملفات التسليم** | فرع توثيق مستقل `claude/web-06-visual-handoff`، متفرع من `c3bfd2f`. يضيف `product-tracking/handoff/WEB-06/` فقط، وSHA التسليم في رسالة التسليم. الفرق بينه وبين `c3bfd2f` ملفات هذا المجلد وحدها، ولا تغيير في `src/` |
| **أداة الالتقاط** | [`capture.mjs`](capture.mjs)، وسجلها [`capture-log.txt`](capture-log.txt): 112 لقطة، كلها HTTP 200، بلا أخطاء صفحة، وعرض الصفحة لا يتجاوز عرض الجهاز (1440 أو 390) |
| **المقاسات** | كمبيوتر 1440×900، وجوال 390×844، بالعربية والإنجليزية، والصفحة كاملة إلا ما يُذكر |

### أوضاع البيانات (مفصولة في مجلدات مختلفة)

| الوضع | المجلد | المصدر | ما يمثّله |
|---|---|---|---|
| **أ. المعاينة المجمّدة** | `screens/frozen/` | خادم محلي على `c3bfd2f` بإعداد المعاينة المجمّدة نفسه (`MAREFA_DESIGN_FIXTURES`). البيانات عينات تطوير مجمّدة من المحرك لثلاث شركات (2222، 1120، 8010)، وقائمة الشركات الـ396 (هوية فقط) | ما يُفترض أن تعرضه معاينة Vercel، لكنه **ليس لقطة من Vercel نفسه** |
| **ب. القارئ المحلي بمحتوى اصطناعي** | `screens/local-synthetic/` | خادم محلي بلا وضع التجميد، يقرأ من خادم Supabase وهمي للاختبار (`web_05c_mock_supabase.mjs`). كل عنوان فيه «اختبار اصطناعي»، والمصادر example.com | تصميم قارئ الأبحاث والمعرفة فقط. **هذا محتوى غير منشور وغير موجود في المعاينة ولا في Supabase**، ولا يُقدَّم على أنه أبحاث حقيقية |
| **ج. عدم توفر المحتوى** | `screens/frozen/*/21-*` و`22-*` | الوضع المجمّد المحلي | الشاشة التي تعرضها المعاينة المجمّدة للأبحاث والمعرفة. **لم تُلتقط من Vercel**: `*.vercel.app` محجوب في بيئة التنفيذ |

### Vercel: البناء غير فتح الصفحة
- **البناء:** آخر بناء ناجح للتطبيق على `7bee848` (الكود نفسه في `c3bfd2f`)، والرابط: https://pixel-perfect-showcase-git-379ac3-mohammadksa856-bots-projects.vercel.app/preview/web-v1
- **فتح الصفحة:** لم أتحقق منه.
- **متغيرات البيئة:** وجد Codex في WEB-05B أن صفحات المعاينة لا تُعرض إلا بعد ضبط متغيرات بيئة المعاينة لكل فرع: `WEB_V1_PREVIEW_ENABLED` و`ENGINE_PREVIEW_ENABLED` و`MAREFA_DESIGN_FIXTURES` و`ENGINE_PEERS_ENABLED=false`. لم أغيّر إعدادات Vercel.

### أدلة سابقة أُعيد استخدامها (تطابق `c3bfd2f`)

| المجموعة | التقطت على | لماذا تطابق |
|---|---|---|
| [`outbox/WEB-V1/web-05b-fixes/after/`](../../outbox/WEB-V1/web-05b-fixes/after/): مسار صفحة الشركة، والتذييل، والرأس، وبطاقات السوق بالجوال | `b891137` | ملفات هذه العناصر لم تتغير بين `b891137` و`c3bfd2f` (`git diff` فارغ) |
| [`outbox/WEB-V1/web-05c-reader-fixes/after/`](../../outbox/WEB-V1/web-05c-reader-fixes/after/): جدول غير متسق، وتاريخ غير صالح | `7bee848` | كود `src/` متطابق بين `7bee848` و`c3bfd2f`. **محتوى اصطناعي، الوضع ب** |

**مجموعات قديمة لا تُعتمد للمراجعة البصرية:** `screens/` و`screens-web03-04/` و`screens-web05a/` و`screens-web05b/` و`screens-web05c/`. التُقطت قبل `b891137` الذي غيّر التذييل والرأس وبطاقات الشركات، فلا تطابق النسخة الحالية.

## 2. خريطة النطاق المنفّذ

| المجال | المسار | اللقطات | الدفعة |
|---|---|---|---|
| الرئيسية | `/preview/web-v1` | 01 | WEB-02، WEB-05A |
| البحث الموحد (Ctrl+K) وصفحة النتائج | `/preview/web-v1/search?q=` | 02، 03 | WEB-05A |
| دليل الشركات (396) | `/preview/web-v1/companies` | 04 | WEB-05A |
| صفحة الشركة: 5 مجموعات و18 موضوعًا | `/preview/web-v1/companies/{2222,1120,8010}?tab=` | 05، 09، 10، 11 | WEB-02، WEB-03 |
| القوائم المالية (سنوي، ربعي، منذ بداية السنة) والأرقام الرئيسية | `?tab=financials` | 06 (طاقة)، 07 (بنك)، 08 (تأمين) | WEB-03 |
| جودة البيانات ولوحة المصنع (18 فئة، 95%) | `?tab=coverage` | 12، 13 | WEB-04 |
| الأسواق والسوق السعودية والرئيسية ونمو | `/preview/web-v1/markets…` | 14–17 | WEB-05B |
| القطاعات وتفاصيل القطاع وغير المصنّف | `/preview/web-v1/sectors…` | 18–20 | WEB-05B |
| الأبحاث والمعرفة (عدم توفر في المعاينة) | `/preview/web-v1/{research,knowledge}` | 21، 22 | WEB-05C |
| الأبحاث والمعرفة (قارئ، محتوى اصطناعي محلي) | `…/research/{slug}` و`…/knowledge/{slug}` | 31–35 | WEB-05C |
| صفحة نظام التصميم | `/preview/web-v1/design-system` | 23 | WEB-02 |

**موضوعات المستثمر الـ18 في المجموعات الخمس:**
- الشركة ونشاطها: 1، 2، 10، 11
- الأداء المالي: 5، 6، 7، 8
- المساهمون والحوكمة: 4، 9، 3
- السوق والتقييم: 12، 15، 13، 14
- المخاطر والإفصاحات: 16، 17، 18

اللقطات 05 و06 و09 و10 و11 تغطي المجموعات الخمس لأرامكو. لوحة المصنع (18 فئة تشغيلية منفصلة عن الموضوعات) في 12 و13.

## 3. مسار المراجعة البصرية المختصر

افتح بالترتيب، بالعربية ثم بالإنجليزية. الكمبيوتر أولًا، ثم الجوال للخطوات نفسها.

1. **الرئيسية** (الوضع أ): كمبيوتر: [ع](screens/frozen/desktop/01-home.ar.jpg) · [En](screens/frozen/desktop/01-home.en.jpg) — جوال: [ع](screens/frozen/mobile/01-home.ar.jpg) · [En](screens/frozen/mobile/01-home.en.jpg)
2. **البحث** (الوضع أ): كمبيوتر: [ع](screens/frozen/desktop/02-search-dialog.ar.jpg) · [En](screens/frozen/desktop/02-search-dialog.en.jpg) — جوال: [ع](screens/frozen/mobile/02-search-dialog.ar.jpg) · [En](screens/frozen/mobile/02-search-dialog.en.jpg)
3. **البحث: النتائج** (الوضع أ): كمبيوتر: [ع](screens/frozen/desktop/03-search-results.ar.jpg) · [En](screens/frozen/desktop/03-search-results.en.jpg) — جوال: [ع](screens/frozen/mobile/03-search-results.ar.jpg) · [En](screens/frozen/mobile/03-search-results.en.jpg)
4. **الشركة** (الوضع أ): كمبيوتر: [ع](screens/frozen/desktop/05-company-2222-business.ar.jpg) · [En](screens/frozen/desktop/05-company-2222-business.en.jpg) — جوال: [ع](screens/frozen/mobile/05-company-2222-business.ar.jpg) · [En](screens/frozen/mobile/05-company-2222-business.en.jpg)
5. **القوائم** (الوضع أ): كمبيوتر: [ع](screens/frozen/desktop/06-company-2222-financials.ar.jpg) · [En](screens/frozen/desktop/06-company-2222-financials.en.jpg) — جوال: [ع](screens/frozen/mobile/06-company-2222-financials.ar.jpg) · [En](screens/frozen/mobile/06-company-2222-financials.en.jpg)
6. **القوائم: بنك وتأمين** (الوضع أ): كمبيوتر: [ع](screens/frozen/desktop/07-company-1120-financials.ar.jpg) · [En](screens/frozen/desktop/07-company-1120-financials.en.jpg) — جوال: [ع](screens/frozen/mobile/07-company-1120-financials.ar.jpg) · [En](screens/frozen/mobile/07-company-1120-financials.en.jpg)
7. **جودة البيانات** (الوضع أ): كمبيوتر: [ع](screens/frozen/desktop/12-company-2222-coverage-factory.ar.jpg) · [En](screens/frozen/desktop/12-company-2222-coverage-factory.en.jpg) — جوال: [ع](screens/frozen/mobile/12-company-2222-coverage-factory.ar.jpg) · [En](screens/frozen/mobile/12-company-2222-coverage-factory.en.jpg)
8. **السوق** (الوضع أ): كمبيوتر: [ع](screens/frozen/desktop/15-market-saudi.ar.jpg) · [En](screens/frozen/desktop/15-market-saudi.en.jpg) — جوال: [ع](screens/frozen/mobile/15-market-saudi.ar.jpg) · [En](screens/frozen/mobile/15-market-saudi.en.jpg)
9. **السوق: جدول** (الوضع أ): كمبيوتر: [ع](screens/frozen/desktop/16-market-saudi-main.ar.jpg) · [En](screens/frozen/desktop/16-market-saudi-main.en.jpg) — جوال: [ع](screens/frozen/mobile/16-market-saudi-main.ar.jpg) · [En](screens/frozen/mobile/16-market-saudi-main.en.jpg)
10. **القطاع** (الوضع أ): كمبيوتر: [ع](screens/frozen/desktop/19-sector-financials.ar.jpg) · [En](screens/frozen/desktop/19-sector-financials.en.jpg) — جوال: [ع](screens/frozen/mobile/19-sector-financials.ar.jpg) · [En](screens/frozen/mobile/19-sector-financials.en.jpg)
11. **الأبحاث والمعرفة في المعاينة** (الوضع أ): كمبيوتر: [ع](screens/frozen/desktop/21-research-unavailable.ar.jpg) · [En](screens/frozen/desktop/21-research-unavailable.en.jpg) — جوال: [ع](screens/frozen/mobile/21-research-unavailable.ar.jpg) · [En](screens/frozen/mobile/21-research-unavailable.en.jpg)
12. **قارئ الأبحاث (اصطناعي، محلي فقط)** (الوضع ب): كمبيوتر: [ع](screens/local-synthetic/desktop/32-research-reader.ar.jpg) · [En](screens/local-synthetic/desktop/32-research-reader.en.jpg) — جوال: [ع](screens/local-synthetic/mobile/32-research-reader.ar.jpg) · [En](screens/local-synthetic/mobile/32-research-reader.en.jpg)
13. **قارئ المعرفة (اصطناعي، محلي فقط)** (الوضع ب): كمبيوتر: [ع](screens/local-synthetic/desktop/35-knowledge-topic.ar.jpg) · [En](screens/local-synthetic/desktop/35-knowledge-topic.en.jpg) — جوال: [ع](screens/local-synthetic/mobile/35-knowledge-topic.ar.jpg) · [En](screens/local-synthetic/mobile/35-knowledge-topic.en.jpg)

## 4. حزمة الصور كاملة

«ع» عربية، و«En» إنجليزية. كل الروابط إلى ملفات داخل هذا المجلد.


### أ. المعاينة المجمّدة (التطبيق `c3bfd2f`، عينات مجمّدة)

| # | الشاشة | الصور |
|---|---|---|
| 01 | الرئيسية | كمبيوتر: [ع](screens/frozen/desktop/01-home.ar.jpg) · [En](screens/frozen/desktop/01-home.en.jpg) — جوال: [ع](screens/frozen/mobile/01-home.ar.jpg) · [En](screens/frozen/mobile/01-home.en.jpg) |
| 02 | نافذة البحث الموحد (Ctrl+K) | كمبيوتر: [ع](screens/frozen/desktop/02-search-dialog.ar.jpg) · [En](screens/frozen/desktop/02-search-dialog.en.jpg) — جوال: [ع](screens/frozen/mobile/02-search-dialog.ar.jpg) · [En](screens/frozen/mobile/02-search-dialog.en.jpg) |
| 03 | صفحة نتائج البحث (1120) | كمبيوتر: [ع](screens/frozen/desktop/03-search-results.ar.jpg) · [En](screens/frozen/desktop/03-search-results.en.jpg) — جوال: [ع](screens/frozen/mobile/03-search-results.ar.jpg) · [En](screens/frozen/mobile/03-search-results.en.jpg) |
| 04 | دليل الشركات | كمبيوتر: [ع](screens/frozen/desktop/04-company-directory.ar.jpg) · [En](screens/frozen/desktop/04-company-directory.en.jpg) — جوال: [ع](screens/frozen/mobile/04-company-directory.ar.jpg) · [En](screens/frozen/mobile/04-company-directory.en.jpg) |
| 05 | أرامكو: الشركة ونشاطها | كمبيوتر: [ع](screens/frozen/desktop/05-company-2222-business.ar.jpg) · [En](screens/frozen/desktop/05-company-2222-business.en.jpg) — جوال: [ع](screens/frozen/mobile/05-company-2222-business.ar.jpg) · [En](screens/frozen/mobile/05-company-2222-business.en.jpg) |
| 06 | أرامكو: الأداء المالي والقوائم | كمبيوتر: [ع](screens/frozen/desktop/06-company-2222-financials.ar.jpg) · [En](screens/frozen/desktop/06-company-2222-financials.en.jpg) — جوال: [ع](screens/frozen/mobile/06-company-2222-financials.ar.jpg) · [En](screens/frozen/mobile/06-company-2222-financials.en.jpg) |
| 07 | الراجحي (بنك): القوائم | كمبيوتر: [ع](screens/frozen/desktop/07-company-1120-financials.ar.jpg) · [En](screens/frozen/desktop/07-company-1120-financials.en.jpg) — جوال: [ع](screens/frozen/mobile/07-company-1120-financials.ar.jpg) · [En](screens/frozen/mobile/07-company-1120-financials.en.jpg) |
| 08 | التعاونية (تأمين): القوائم | كمبيوتر: [ع](screens/frozen/desktop/08-company-8010-financials.ar.jpg) · [En](screens/frozen/desktop/08-company-8010-financials.en.jpg) — جوال: [ع](screens/frozen/mobile/08-company-8010-financials.ar.jpg) · [En](screens/frozen/mobile/08-company-8010-financials.en.jpg) |
| 09 | أرامكو: المساهمون والحوكمة | كمبيوتر: [ع](screens/frozen/desktop/09-company-2222-shareholders.ar.jpg) · [En](screens/frozen/desktop/09-company-2222-shareholders.en.jpg) — جوال: [ع](screens/frozen/mobile/09-company-2222-shareholders.ar.jpg) · [En](screens/frozen/mobile/09-company-2222-shareholders.en.jpg) |
| 10 | أرامكو: السوق والتقييم | كمبيوتر: [ع](screens/frozen/desktop/10-company-2222-market.ar.jpg) · [En](screens/frozen/desktop/10-company-2222-market.en.jpg) — جوال: [ع](screens/frozen/mobile/10-company-2222-market.ar.jpg) · [En](screens/frozen/mobile/10-company-2222-market.en.jpg) |
| 11 | أرامكو: المخاطر والإفصاحات | كمبيوتر: [ع](screens/frozen/desktop/11-company-2222-risks.ar.jpg) · [En](screens/frozen/desktop/11-company-2222-risks.en.jpg) — جوال: [ع](screens/frozen/mobile/11-company-2222-risks.ar.jpg) · [En](screens/frozen/mobile/11-company-2222-risks.en.jpg) |
| 12 | أرامكو: تغطية البيانات ولوحة المصنع | كمبيوتر: [ع](screens/frozen/desktop/12-company-2222-coverage-factory.ar.jpg) · [En](screens/frozen/desktop/12-company-2222-coverage-factory.en.jpg) — جوال: [ع](screens/frozen/mobile/12-company-2222-coverage-factory.ar.jpg) · [En](screens/frozen/mobile/12-company-2222-coverage-factory.en.jpg) |
| 13 | الراجحي: تغطية البيانات ولوحة المصنع | كمبيوتر: [ع](screens/frozen/desktop/13-company-1120-coverage-factory.ar.jpg) · [En](screens/frozen/desktop/13-company-1120-coverage-factory.en.jpg) — جوال: [ع](screens/frozen/mobile/13-company-1120-coverage-factory.ar.jpg) · [En](screens/frozen/mobile/13-company-1120-coverage-factory.en.jpg) |
| 14 | الأسواق | كمبيوتر: [ع](screens/frozen/desktop/14-markets.ar.jpg) · [En](screens/frozen/desktop/14-markets.en.jpg) — جوال: [ع](screens/frozen/mobile/14-markets.ar.jpg) · [En](screens/frozen/mobile/14-markets.en.jpg) |
| 15 | السوق المالية السعودية | كمبيوتر: [ع](screens/frozen/desktop/15-market-saudi.ar.jpg) · [En](screens/frozen/desktop/15-market-saudi.en.jpg) — جوال: [ع](screens/frozen/mobile/15-market-saudi.ar.jpg) · [En](screens/frozen/mobile/15-market-saudi.en.jpg) |
| 16 | السوق الرئيسية (جدول) | كمبيوتر: [ع](screens/frozen/desktop/16-market-saudi-main.ar.jpg) · [En](screens/frozen/desktop/16-market-saudi-main.en.jpg) — جوال: [ع](screens/frozen/mobile/16-market-saudi-main.ar.jpg) · [En](screens/frozen/mobile/16-market-saudi-main.en.jpg) |
| 17 | نمو (جدول) | كمبيوتر: [ع](screens/frozen/desktop/17-market-saudi-nomu.ar.jpg) · [En](screens/frozen/desktop/17-market-saudi-nomu.en.jpg) — جوال: [ع](screens/frozen/mobile/17-market-saudi-nomu.ar.jpg) · [En](screens/frozen/mobile/17-market-saudi-nomu.en.jpg) |
| 18 | دليل القطاعات | كمبيوتر: [ع](screens/frozen/desktop/18-sectors.ar.jpg) · [En](screens/frozen/desktop/18-sectors.en.jpg) — جوال: [ع](screens/frozen/mobile/18-sectors.ar.jpg) · [En](screens/frozen/mobile/18-sectors.en.jpg) |
| 19 | قطاع Financials | كمبيوتر: [ع](screens/frozen/desktop/19-sector-financials.ar.jpg) · [En](screens/frozen/desktop/19-sector-financials.en.jpg) — جوال: [ع](screens/frozen/mobile/19-sector-financials.ar.jpg) · [En](screens/frozen/mobile/19-sector-financials.en.jpg) |
| 20 | غير المصنّف (أعلى الصفحة) | كمبيوتر: [ع](screens/frozen/desktop/20-sector-unclassified.ar.jpg) · [En](screens/frozen/desktop/20-sector-unclassified.en.jpg) — جوال: [ع](screens/frozen/mobile/20-sector-unclassified.ar.jpg) · [En](screens/frozen/mobile/20-sector-unclassified.en.jpg) |
| 21 | الأبحاث: غير متاح في المعاينة | كمبيوتر: [ع](screens/frozen/desktop/21-research-unavailable.ar.jpg) · [En](screens/frozen/desktop/21-research-unavailable.en.jpg) — جوال: [ع](screens/frozen/mobile/21-research-unavailable.ar.jpg) · [En](screens/frozen/mobile/21-research-unavailable.en.jpg) |
| 22 | المعرفة: غير متاح في المعاينة | كمبيوتر: [ع](screens/frozen/desktop/22-knowledge-unavailable.ar.jpg) · [En](screens/frozen/desktop/22-knowledge-unavailable.en.jpg) — جوال: [ع](screens/frozen/mobile/22-knowledge-unavailable.ar.jpg) · [En](screens/frozen/mobile/22-knowledge-unavailable.en.jpg) |
| 23 | نظام التصميم | كمبيوتر: [ع](screens/frozen/desktop/23-design-system.ar.jpg) · [En](screens/frozen/desktop/23-design-system.en.jpg) — جوال: [ع](screens/frozen/mobile/23-design-system.ar.jpg) · [En](screens/frozen/mobile/23-design-system.en.jpg) |

### ب. القارئ المحلي، محتوى اصطناعي معلن (ليس محتوى منشورًا)

| # | الشاشة | الصور |
|---|---|---|
| 31 | استعراض الأبحاث (اصطناعي) | كمبيوتر: [ع](screens/local-synthetic/desktop/31-research-index.ar.jpg) · [En](screens/local-synthetic/desktop/31-research-index.en.jpg) — جوال: [ع](screens/local-synthetic/mobile/31-research-index.ar.jpg) · [En](screens/local-synthetic/mobile/31-research-index.en.jpg) |
| 32 | قارئ البحث (اصطناعي) | كمبيوتر: [ع](screens/local-synthetic/desktop/32-research-reader.ar.jpg) · [En](screens/local-synthetic/desktop/32-research-reader.en.jpg) — جوال: [ع](screens/local-synthetic/mobile/32-research-reader.ar.jpg) · [En](screens/local-synthetic/mobile/32-research-reader.en.jpg) |
| 33 | جدول غير متسق وتاريخ غير صالح (اصطناعي) | كمبيوتر: [ع](screens/local-synthetic/desktop/33-research-reader-table-date-states.ar.jpg) · [En](screens/local-synthetic/desktop/33-research-reader-table-date-states.en.jpg) — جوال: [ع](screens/local-synthetic/mobile/33-research-reader-table-date-states.ar.jpg) · [En](screens/local-synthetic/mobile/33-research-reader-table-date-states.en.jpg) |
| 34 | دليل المعرفة (اصطناعي) | كمبيوتر: [ع](screens/local-synthetic/desktop/34-knowledge-index.ar.jpg) · [En](screens/local-synthetic/desktop/34-knowledge-index.en.jpg) — جوال: [ع](screens/local-synthetic/mobile/34-knowledge-index.ar.jpg) · [En](screens/local-synthetic/mobile/34-knowledge-index.en.jpg) |
| 35 | صفحة موضوع (اصطناعي) | كمبيوتر: [ع](screens/local-synthetic/desktop/35-knowledge-topic.ar.jpg) · [En](screens/local-synthetic/desktop/35-knowledge-topic.en.jpg) — جوال: [ع](screens/local-synthetic/mobile/35-knowledge-topic.ar.jpg) · [En](screens/local-synthetic/mobile/35-knowledge-topic.en.jpg) |

### أدلة سابقة مطابقة (قريبة، عناصر محددة)

| الشاشة | الوضع | الصور |
|---|---|---|
| مسار صفحة الشركة إلى السوق السعودية | أ | [كمبيوتر ع](../../outbox/WEB-V1/web-05b-fixes/after/company-breadcrumb.desktop.ar.png) |
| تذييل المعاينة والنشرة المعطّلة | أ | [كمبيوتر ع](../../outbox/WEB-V1/web-05b-fixes/after/footer.desktop.ar.png) · [جوال En](../../outbox/WEB-V1/web-05b-fixes/after/footer.mobile.en.png) |
| بطاقات الشركات بالجوال (أسماء طويلة) | أ | [ع](../../outbox/WEB-V1/web-05b-fixes/after/saudi-cards.mobile.ar.png) · [En](../../outbox/WEB-V1/web-05b-fixes/after/saudi-cards.mobile.en.png) |
| جدول غير متسق في القارئ | ب | [كمبيوتر ع](../../outbox/WEB-V1/web-05c-reader-fixes/after/research4-table.desktop.ar.png) · [كمبيوتر En](../../outbox/WEB-V1/web-05c-reader-fixes/after/research4-table.desktop.en.png) · [جوال ع](../../outbox/WEB-V1/web-05c-reader-fixes/after/research4-table.mobile.ar.png) · [جوال En](../../outbox/WEB-V1/web-05c-reader-fixes/after/research4-table.mobile.en.png) |
| تاريخ نشر غير صالح في البطاقة | ب | [كمبيوتر ع](../../outbox/WEB-V1/web-05c-reader-fixes/after/research-index-card.desktop.ar.png) · [كمبيوتر En](../../outbox/WEB-V1/web-05c-reader-fixes/after/research-index-card.desktop.en.png) |

## 5. ملاحظات التصميم المتبقية (مسجّلة، لم تُصلح)

| # | المجال | الملاحظة | أين تُرى |
|---|---|---|---|
| D1 | وضوح النصوص | في بطاقة هوية الشركة، الروابط الطويلة لا تلتف فتتداخل مع العمود المجاور، فيظهر «…investbhttps://www.aramco.com». | 05 كمبيوتر ع |
| D2 | الجداول | جدول «إجراءات الشركة» ضيق في عمود واحد: المبلغ ووصف الإجراء يلتصقان («320.45 مليار ريالFY 2025…»)، والتاريخ ينكسر على سطرين. | 09 كمبيوتر ع |
| D3 | التكرار | كل موضوع في صفحة الشركة يكرر سطري «عينة تطوير مجمّدة» و«لم يُقيَّم الموضوع»، فوق شريط المعاينة أعلى الصفحة والتنبيه أسفلها. | 05، 09–11 |
| D4 | التكرار | جدول السوق الرئيسية يكرر «غير مصنّف في المصدر» و«مدرجة، بلا صفحة بيانات بعد» في نحو 267 صفًا. يمكن أن تكون حالة افتراضية بمفتاح واحد. | 16، 17 |
| D5 | اللغة | في الواجهة العربية تظهر قيم إنجليزية من المحرك: وصف النشاط، والمنتجات، والقطاع والصناعة (Energy وFinancials). هذا مقصود (لا ترجمة آلية) لكنه يكسر تجانس القراءة، ويحتاج قرارًا: أصل المصدر، أم ترجمة معتمدة لاحقًا. | 05، 15، 18 |
| D6 | كثافة المعلومات | صفحة القوائم كثيفة جدًا: نحو 50 صفًا، وكثير من «—» و«محجوب». على الجوال تصل الصفحة إلى نحو 6750px. | 06 كمبيوتر وجوال |
| D7 | كثافة المعلومات | لوحة المصنع تعرض 18 صفًا كلها «لم يُقيَّم»، والشبكة فوقها تكرر الشيء نفسه. تبدو فارغة رغم تفصيلها. | 12، 13 |
| D8 | الجوال | الرئيسية بالجوال طويلة (نحو 4900px): ثلاث بطاقات مبادئ، وخمس مجموعات، والتذييل. | 01 جوال |
| D9 | التنقل | في مسار صفحة الشركة، القطاع والصناعة نص لا رابط، فلا رجوع مباشر إلى صفحة القطاع (الرابط الوحيد إلى السوق السعودية). | 05 (أعلى) |
| D10 | التنقل وإمكانية الوصول | زر «متابعتي» المعطّل وشارات «لم يُنفَّذ في المعاينة بعد» في التذييل تشبه الأزرار والروابط شكلًا، فقد يُظن أنها قابلة للنقر. | الرأس والتذييل في كل لقطة |
| D11 | إمكانية الوصول | نصوص ثانوية بحجم 10–11px بلون رمادي على خلفية داكنة؛ التباين يحتاج قياسًا. حالة الموضوعات في الرئيسية تعتمد على اللون (نقاط ملونة) مع مفتاح ألوان فقط. **لم يُشغَّل تدقيق WCAG آلي.** | 01، 06، 12 |
| D12 | البحث | في نافذة البحث، مجموعتا «الأبحاث» و«المعرفة» تشغلان مساحة لتقولا «غير متاحة» في كل بحث. | 02 |
| D13 | الثيم | لُقطت الصفحات في الثيم الداكن فقط، فلم يُراجَع ثيم فاتح إن وُجد. | — |

## 6. غير المنفّذ أو الجزئي

**ملاحظة على القائمة:** تعطيل الرابط ليس تنفيذًا، ولا شيء هنا مؤجَّل بقرار. كلها مفتوحة حتى يقرر المستخدم.

| العنصر | الحالة في المعاينة |
|---|---|
| متابعتي (Watchlist) | غير منفّذ؛ زر معطّل |
| المجتمع | غير منفّذ؛ نص في التذييل فقط |
| الحسابات والاشتراكات وتسجيل الدخول | غير منفّذ |
| من نحن، وتواصل معنا، والخصوصية، والشروط | غير منفّذة في المعاينة؛ صفحات الموقع القديمة باقية ولا يُربط إليها |
| النشرة البريدية | نموذج معطّل، لا يكتب شيئًا |
| السوق الأمريكية | بطاقة «غير مشمولة في المعاينة» فقط |
| الأسعار، وقيم المؤشرات، والقيم السوقية | غير معروضة: لا مصدر أسعار موثق. حالة غياب صريحة |
| إحصاءات القطاعات وأداؤها | غير معروضة: لا بيانات قطاعية مجمّعة في المحرك |
| التصنيف القطاعي | جزئي: 3 من 396 شركة (تسمية المحرك)؛ لا تصنيف رسمي من السوق |
| الأسماء الإنجليزية للشركات | جزئية: 3 من 396 |
| صفحات بيانات الشركات | جزئية: 3 شركات فقط (2222، 1120، 8010)؛ البقية «مدرجة بلا صفحة» |
| الأبحاث والمعرفة في المعاينة | غير متاحة (لا عينة موثقة). القارئ مصمم ومختبر على محتوى اصطناعي محلي فقط |
| الرسوم داخل الأبحاث | غير منفّذة: لا حقل لها في محتوى الموقع |
| ربط الأبحاث بالشركات | غير منفّذ: لا حقل موثق؛ حالة «لا ارتباط موثق» |
| تقييم الجاهزية والدرجات (موضوعات المستثمر، والمصنع 95%) | «لم يُقيَّم» في كل الشركات: لا تقييم معتمد في العينات |
| المشتقات المالية (نسب ومحسوبات) | محجوبة في المعاينة المجمّدة (سياسة Codex) |
| الربط الحي (محرك حي، Supabase حي) | خارج المعاينة المجمّدة؛ تبعيات WEB-LIVE منفصلة |
| البحث الحي في `src/lib/content.ts` | يخفي أخطاء HTTP بصفته «لا نتائج»؛ تبعية للربط الحي، لم تُصلح |

## 7. ما يحتاج قرارًا بصريًا من المستخدم

1. **اللغة المختلطة (D5):** هل تبقى قيم المحرك الإنجليزية في الواجهة العربية كما وردت، أم تُطلب ترجمة معتمدة لاحقًا، أم تُخفى إلى حين؟
2. **التكرار في صفحة الشركة (D3):** هل يكفي تنبيه واحد للصفحة بدل تكراره في كل موضوع؟
3. **كثافة القوائم (D6):** الإبقاء على الجدول الكامل، أم عرض مختصر افتراضي مع «عرض كل البنود»؛ والقرار نفسه للجوال.
4. **الحالة الافتراضية للصفوف (D4):** هل تُختصر «غير مصنّف» و«بلا صفحة بيانات» إلى رمز واحد مع مفتاح؟
5. **لوحة المصنع قبل وجود تقييم (D7):** عرض الجدول الكامل للـ18 فئة، أم ملخص «لم يُقيَّم بعد» مع الجدول مطويًا؟
6. **عيوب العرض (D1 وD2):** تأكيد أنها تُصلح في دفعة لاحقة بالمقاسات الحالية.
7. **شكل العناصر غير المتاحة (D10):** هل تُميَّز بصريًا أكثر، أم تُخفى من الرأس والتذييل؟
8. **إمكانية الوصول (D11 وD13):** هل يُطلب تدقيق تباين WCAG 2.1 AA ومراجعة ثيم فاتح قبل الاعتماد؟
9. **الصفحات غير المنفذة (القسم 6):** أيها يدخل الدفعة التالية، وأيها يُؤجَّل بقرار منك؟

هذه الحزمة لا تسجل قبول المستخدم ولا تغلق WEB-06.
