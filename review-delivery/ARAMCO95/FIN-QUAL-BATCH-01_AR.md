# FIN-QUAL-BATCH-01: ملف تأهيل خمس قيم أساسية لأرامكو (للمراجعة، الكل WITHHELD)

مولَّد من `FIN-QUAL-BATCH-01.json` بالأداة `tools/fin_qual_md.py`. 23 صفًا. المؤهل 0، والمعتمد 0.

**القواعد:**
- القيم من قاعدة المحرك (`b70254e`) ومراجع الصفحات من سجل B02. لا قيمة مُنشأة أو مقدَّرة.
- 'تطابق' في عمود B02 فحص بصري من المؤلف، **ليس اعتمادًا**.
- لم يتحقق هذا الملف من ملفات PDF بنفسه: aramco.com محظور في هذه البيئة، وملفات B02 خاصة.
- العملة SAR. القيم معروضة بملايين الريالات، ومخزنة بالريال.

## الإيرادات (`revenue`)

**التعريف وأساس التوحيد:** سطر Revenue في قائمة الدخل الموحدة (IFRS المعتمدة في المملكة). لا يشمل 'Other income related to sales'؛ المجموع 'Revenue and other income related to sales' مقياس منفصل في B02. النطاق: موحد. المعيار: IFRS المعتمدة في المملكة.

**العرض المستهدف:** Overview: رقم رئيسي: الإيرادات (سنوي). Investor: الموضوع 5: آخر سنة، والربع، ومنذ بداية العام. Data: المستكشف: صف revenue سنوي وربعي وتراكمي.

| المعرّف | الفترة | المستند (النشر) | صفحة PDF / المطبوعة | السطر | قيمة المحرك (مليون) | مصدر قيمة المحرك | مقارنة B02 | تسوية لازمة |
|---|---|---|---|---|---|---|---|---|
| FQ01-OBS-001 | سنة مالية 2024-12-31 | FY2024 (2025-03-04, AUDITED_ANNUAL) | 12 / 9 | Revenue | 1,637,299 | saudi-aramco-fy-2025-full-financials-english.pdf، Annual financial report comparative | اختلاف إسناد: قيمة المحرك مسندة إلى مستند آخر (مقارنات FY2025) لا إلى مستند الفترة الأصلي | قيمة المحرك من مقارنات FY2025 (إعادة عرض محتملة). يلزم ربط نسختي FY2024 (الأصل المنشور 2025-03-04 والمقارن في FY2025) وتسجيل أي إعادة عرض، واعتماد الأحدث إن طُبقت قاعدة restated_latest، دون استبدال تلقائي. |
| FQ01-OBS-011 | سنة مالية 2025-12-31 | FY2025 (2026-03-10, AUDITED_ANNUAL) | 14 / 12 | Revenue | 1,559,342 | saudi-aramco-fy-2025-full-financials-english.pdf، Annual financial report comparative | تطابق رقمي بين قيمة اللقطة وسطر المصدر بفحص بصري من B02 (المؤلف)؛ ليس اعتمادًا ماليًا | — |
| FQ01-OBS-021 | ربع منفرد 2026-03-31 | Q1-2026 (2026-05-11, UNAUDITED_INTERIM_WITH_AUDITOR_REVIEW) | 23 / 23 | Revenue | 433,101 | saudi-aramco-q1-2026-interim-report-english.pdf، Q1 interim report | تطابق رقمي بين قيمة اللقطة وسطر المصدر بفحص بصري من B02 (المؤلف)؛ ليس اعتمادًا ماليًا | — |
| FQ01-OBS-031 | ربع منفرد 2026-06-30 | H1-Q2-2026 (2026-08-04, UNAUDITED_INTERIM_WITH_AUDITOR_REVIEW) | 27 / 27 | Revenue | 450,772 | saudi-aramco-h1-2026-interim-report-english.pdf، Q2 interim report | تطابق رقمي بين قيمة اللقطة وسطر المصدر بفحص بصري من B02 (المؤلف)؛ ليس اعتمادًا ماليًا | — |
| FQ01-OBS-041 | منذ بداية العام 2026-06-30 | H1-Q2-2026 (2026-08-04, UNAUDITED_INTERIM_WITH_AUDITOR_REVIEW) | 27 / 27 | Revenue | 883,873 | saudi-aramco-h1-2026-interim-report-english.pdf، Q2 interim report | تطابق رقمي بين قيمة اللقطة وسطر المصدر بفحص بصري من B02 (المؤلف)؛ ليس اعتمادًا ماليًا | — |

## صافي الدخل (`net_income`)

**التعريف وأساس التوحيد:** صافي دخل المجموعة الموحد شاملًا حقوق غير المسيطرين. المنسوب للمساهمين (net_income_parent) مقياس مستقل ولا يُستبدل به. النطاق: موحد. المعيار: IFRS المعتمدة في المملكة.

**العرض المستهدف:** Overview: رقم رئيسي: صافي الدخل (سنوي). Investor: الموضوع 5. Data: المستكشف: صف net_income سنوي وربعي وتراكمي.

| المعرّف | الفترة | المستند (النشر) | صفحة PDF / المطبوعة | السطر | قيمة المحرك (مليون) | مصدر قيمة المحرك | مقارنة B02 | تسوية لازمة |
|---|---|---|---|---|---|---|---|---|
| FQ01-OBS-004 | سنة مالية 2024-12-31 | FY2024 (2025-03-04, AUDITED_ANNUAL) | 12 / 9 | Net income | 398,422 | saudi-aramco-fy-2025-full-financials-english.pdf، Annual financial report comparative | اختلاف إسناد: قيمة المحرك مسندة إلى مستند آخر (مقارنات FY2025) لا إلى مستند الفترة الأصلي | قيمة المحرك من مقارنات FY2025 (إعادة عرض محتملة). يلزم ربط نسختي FY2024 (الأصل المنشور 2025-03-04 والمقارن في FY2025) وتسجيل أي إعادة عرض، واعتماد الأحدث إن طُبقت قاعدة restated_latest، دون استبدال تلقائي. |
| FQ01-OBS-014 | سنة مالية 2025-12-31 | FY2025 (2026-03-10, AUDITED_ANNUAL) | 14 / 12 | Net income | 350,210 | saudi-aramco-fy-2025-full-financials-english.pdf، Annual financial report comparative | تطابق رقمي بين قيمة اللقطة وسطر المصدر بفحص بصري من B02 (المؤلف)؛ ليس اعتمادًا ماليًا | — |
| FQ01-OBS-024 | ربع منفرد 2026-03-31 | Q1-2026 (2026-05-11, UNAUDITED_INTERIM_WITH_AUDITOR_REVIEW) | 23 / 23 | Net income | 122,008 | saudi-aramco-q1-2026-interim-report-english.pdf، Q1 interim report | تطابق رقمي بين قيمة اللقطة وسطر المصدر بفحص بصري من B02 (المؤلف)؛ ليس اعتمادًا ماليًا | — |
| FQ01-OBS-034 | ربع منفرد 2026-06-30 | H1-Q2-2026 (2026-08-04, UNAUDITED_INTERIM_WITH_AUDITOR_REVIEW) | 27 / 27 | Net income | 122,599 | saudi-aramco-h1-2026-interim-report-english.pdf، Q2 interim report | تطابق رقمي بين قيمة اللقطة وسطر المصدر بفحص بصري من B02 (المؤلف)؛ ليس اعتمادًا ماليًا | — |
| FQ01-OBS-044 | منذ بداية العام 2026-06-30 | H1-Q2-2026 (2026-08-04, UNAUDITED_INTERIM_WITH_AUDITOR_REVIEW) | 27 / 27 | Net income | 244,607 | saudi-aramco-h1-2026-interim-report-english.pdf، Q2 interim report | تطابق رقمي بين قيمة اللقطة وسطر المصدر بفحص بصري من B02 (المؤلف)؛ ليس اعتمادًا ماليًا | — |

## التدفق النقدي التشغيلي (`operating_cash_flow`)

**التعريف وأساس التوحيد:** صافي النقد من الأنشطة التشغيلية في قائمة التدفقات الموحدة. التصنيف التشغيلي للفوائد والتوزيعات المستلمة كما يعرضه المُصدر، دون إعادة تصنيف. النطاق: موحد. المعيار: IFRS المعتمدة في المملكة.

**العرض المستهدف:** Overview: غير معروض اليوم (ليس ضمن الأرقام الرئيسية). Investor: الموضوع 5: مجموعة التدفقات. Data: المستكشف: صف operating_cash_flow.

| المعرّف | الفترة | المستند (النشر) | صفحة PDF / المطبوعة | السطر | قيمة المحرك (مليون) | مصدر قيمة المحرك | مقارنة B02 | تسوية لازمة |
|---|---|---|---|---|---|---|---|---|
| FQ01-OBS-006 | سنة مالية 2024-12-31 | FY2024 (2025-03-04, AUDITED_ANNUAL) | 16 / 13 | Net cash provided by operating activities | 508,888 | saudi-aramco-fy-2025-full-financials-english.pdf، Annual financial report comparative | اختلاف إسناد: قيمة المحرك مسندة إلى مستند آخر (مقارنات FY2025) لا إلى مستند الفترة الأصلي | قيمة المحرك من مقارنات FY2025 (إعادة عرض محتملة). يلزم ربط نسختي FY2024 (الأصل المنشور 2025-03-04 والمقارن في FY2025) وتسجيل أي إعادة عرض، واعتماد الأحدث إن طُبقت قاعدة restated_latest، دون استبدال تلقائي. |
| FQ01-OBS-016 | سنة مالية 2025-12-31 | FY2025 (2026-03-10, AUDITED_ANNUAL) | 18 / 16 | Net cash provided by operating activities | 510,798 | saudi-aramco-fy-2025-full-financials-english.pdf، Annual financial report comparative | تطابق رقمي بين قيمة اللقطة وسطر المصدر بفحص بصري من B02 (المؤلف)؛ ليس اعتمادًا ماليًا | — |
| FQ01-OBS-026 | ربع منفرد 2026-03-31 | Q1-2026 (2026-05-11, UNAUDITED_INTERIM_WITH_AUDITOR_REVIEW) | 27 / 27 | Net cash provided by operating activities | 115,242 | saudi-aramco-q1-2026-interim-report-english.pdf، Q1 interim report | تطابق رقمي بين قيمة اللقطة وسطر المصدر بفحص بصري من B02 (المؤلف)؛ ليس اعتمادًا ماليًا | — |
| FQ01-OBS-036 | ربع منفرد 2026-06-30 | H1-Q2-2026 (2026-08-04, UNAUDITED_INTERIM_WITH_AUDITOR_REVIEW) | 31 / 31 | Net cash provided by operating activities | 95,365 | saudi-aramco-h1-2026-interim-report-english.pdf، Q2 interim report | تطابق رقمي بين قيمة اللقطة وسطر المصدر بفحص بصري من B02 (المؤلف)؛ ليس اعتمادًا ماليًا | — |
| FQ01-OBS-046 | منذ بداية العام 2026-06-30 | H1-Q2-2026 (2026-08-04, UNAUDITED_INTERIM_WITH_AUDITOR_REVIEW) | 31 / 31 | Net cash provided by operating activities | 210,607 | saudi-aramco-h1-2026-interim-report-english.pdf، Q2 interim report | تطابق رقمي بين قيمة اللقطة وسطر المصدر بفحص بصري من B02 (المؤلف)؛ ليس اعتمادًا ماليًا | — |

## النقد وما في حكمه (`cash`)

**التعريف وأساس التوحيد:** رصيد النقد وما في حكمه في الميزانية الموحدة في تاريخ الرصيد. لا يشمل الاستثمارات قصيرة الأجل، ولا نقد PRefChem المحتفظ به للبيع. نقد نهاية التدفقات (cash_end) مقياس مختلف. النطاق: موحد. المعيار: IFRS المعتمدة في المملكة.

**العرض المستهدف:** Overview: غير معروض اليوم. Investor: الموضوع 5: الميزانية (آخر رصيد فقط). Data: غير معروض: صف cash ليس ضمن صفوف المستكشف، ويُعرض cash_end لـFY2025 فقط.

| المعرّف | الفترة | المستند (النشر) | صفحة PDF / المطبوعة | السطر | قيمة المحرك (مليون) | مصدر قيمة المحرك | مقارنة B02 | تسوية لازمة |
|---|---|---|---|---|---|---|---|---|
| FQ01-OBS-051 | رصيد 2024-12-31 | FY2024 (2025-03-04, AUDITED_ANNUAL) | 14 / 11 | Cash and cash equivalents | 216,642 | saudi-aramco-ara-2025-english.pdf، Annual report supplementary metrics and comparative restatement | الفترة غير موجودة في لقطة صفحة الموقع؛ لم تُقارن رقميًا | قيمة المحرك من مقارنات التقرير السنوي 2025 ('comparative restatement'). نفس تسوية FY2024. |
| FQ01-OBS-058 | رصيد 2025-12-31 | FY2025 (2026-03-10, AUDITED_ANNUAL) | 16 / 14 | Cash and cash equivalents | 243,099 | saudi-aramco-ara-2025-english.pdf، Annual report supplementary metrics and comparative restatement | الفترة غير موجودة في لقطة صفحة الموقع؛ لم تُقارن رقميًا | — |
| FQ01-OBS-065 | رصيد 2026-03-31 | Q1-2026 (2026-05-11, UNAUDITED_INTERIM_WITH_AUDITOR_REVIEW) | 25 / 25 | Cash and cash equivalents | 230,813 | saudi-aramco-q1-2026-interim-report-english.pdf، Q1 interim report | الفترة غير موجودة في لقطة صفحة الموقع؛ لم تُقارن رقميًا | — |
| FQ01-OBS-072 | رصيد 2026-06-30 | H1-Q2-2026 (2026-08-04, UNAUDITED_INTERIM_WITH_AUDITOR_REVIEW) | 29 / 29 | Cash and cash equivalents | 167,387 | saudi-aramco-h1-2026-interim-report-english.pdf، Q2 interim report | هوية الفترة مختلفة (رصيد instant بـperiod_start فارغ)؛ لم تُقارن رقميًا | عند الرصيد H1-2026 يُعرض نقد PRefChem ضمن مجموعة الأصول المحتفظ بها للبيع (B02: H1 PDF29 و31 وNote 16(a) PDF42). يلزم جسر بين نقد الميزانية ونقد نهاية التدفقات، لا تعديل تلقائي. |

## إجمالي حقوق الملكية (`total_equity`)

**التعريف وأساس التوحيد:** مجموع حقوق الملكية شاملًا حقوق غير المسيطرين، وهو مجموع فرعي غير معنون في الميزانية الموحدة. حقوق المساهمين (parent_equity) مقياس مستقل. النطاق: موحد. المعيار: IFRS المعتمدة في المملكة.

**العرض المستهدف:** Overview: رقم رئيسي: إجمالي حقوق الملكية. Investor: الموضوع 5: الميزانية. Data: المستكشف: صف total_equity لخمس سنوات.

| المعرّف | الفترة | المستند (النشر) | صفحة PDF / المطبوعة | السطر | قيمة المحرك (مليون) | مصدر قيمة المحرك | مقارنة B02 | تسوية لازمة |
|---|---|---|---|---|---|---|---|---|
| FQ01-OBS-053 | رصيد 2024-12-31 | FY2024 (2025-03-04, AUDITED_ANNUAL) | 14 / 11 | Equity subtotal including non-controlling interests (unlabelled subtotal) | 1,651,355 | saudi-aramco-fy-2025-full-financials-english.pdf، Annual financial report comparative | هوية الفترة مختلفة (رصيد instant بـperiod_start فارغ)؛ لم تُقارن رقميًا | قيمة المحرك من مقارنات FY2025 (aramco-2024-fy-comparative). يلزم ربطها بميزانية FY2024 الأصلية (المنشورة 2025-03-04) وتسجيل أي إعادة عرض لحقوق الملكية أو حقوق غير المسيطرين. |
| FQ01-OBS-060 | رصيد 2025-12-31 | FY2025 (2026-03-10, AUDITED_ANNUAL) | 16 / 14 | Equity subtotal including non-controlling interests (unlabelled subtotal) | 1,721,744 | saudi-aramco-fy-2025-full-financials-english.pdf، Annual financial report comparative | هوية الفترة مختلفة (رصيد instant بـperiod_start فارغ)؛ لم تُقارن رقميًا | — |
| FQ01-OBS-067 | رصيد 2026-03-31 | Q1-2026 (2026-05-11, UNAUDITED_INTERIM_WITH_AUDITOR_REVIEW) | 25 / 25 | Equity subtotal including non-controlling interests (unlabelled subtotal) | 1,758,311 | saudi-aramco-q1-2026-interim-report-english.pdf، Q1 interim report | الفترة غير موجودة في لقطة صفحة الموقع؛ لم تُقارن رقميًا | — |
| FQ01-OBS-074 | رصيد 2026-06-30 | H1-Q2-2026 (2026-08-04, UNAUDITED_INTERIM_WITH_AUDITOR_REVIEW) | 29 / 29 | Equity subtotal including non-controlling interests (unlabelled subtotal) | 1,795,831 | saudi-aramco-h1-2026-interim-report-english.pdf، Q2 interim report | هوية الفترة مختلفة (رصيد instant بـperiod_start فارغ)؛ لم تُقارن رقميًا | — |

## الأدلة والمراجعات الناقصة (تنطبق على كل الصفوف)

- ربط الحقيقة في المحرك ببصمة ملف PDF الأصلي: البصمة الحالية لملف استيراد JSON (data/imports)، لا لمستند أرامكو
- محدد الصفحة والجدول في المحرك: غائب لأغلب هذه الصفوف
- معرف حقيقة ثابت وبصمة مراجعة وتصدير مرجعي غير قابل للتغيير (B02C/B02D)
- إيصال مراجعة مالية من مراجع مالي مخوَّل (غير موجود؛ فحص B02 بصري من المؤلف)
- منح حقوق موثق للعرض (D4)؛ الحالي 'USER_ASSERTED_NOT_DOCUMENTED'
- قراءة حية من المحرك (اللقطة مجمدة 2026-10-13)

## حالة التأهيل والخطوة التالية

- **الحالة:** كل الصفوف `WITHHELD`، و`publication_authorized: false`.
- **الخطوة التالية:** مراجع مالي مخوَّل يطابق القيمة بالصفحة المذكورة في PDF المبصوم، ويثبت التعريف والتسوية، ويوقع إيصالًا. ثم ربط المحرك بالبصمة والصفحة، ثم قرار الحقوق D4. لا يُرفع الحجب بمجرد تطابق الرقم.

## فترات موجودة في المحرك وخارج هذه الدفعة

| المقياس | الفترة | قيمة المحرك (مليون) | مصدر المحرك | السبب |
|---|---|---|---|---|
| cash | 2021-12-31 | 299,579 | saudi-aramco-ara-2022-english.pdf، Annual report supplementary metrics | لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023. |
| cash | 2022-12-31 | 226,047 | saudi-aramco-ara-2022-english.pdf، Annual report supplementary metrics | لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023. |
| cash | 2023-12-31 | 198,973 | saudi-aramco-ara-2023-english.pdf، Annual report supplementary metrics | لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023. |
| net_income | 2019-12-31 | 330,693 | saudi-aramco-ara-2022-english.pdf، Annual report historical highlights | لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023. |
| net_income | 2020-12-31 | 183,763 | saudi-aramco-ara-2022-english.pdf، Annual report historical highlights | لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023. |
| net_income | 2021-12-31 | 412,396 | saudi-aramco-ara-2022-english.pdf، Annual report historical highlights | لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023. |
| net_income | 2022-12-31 | 604,005 | saudi-aramco-ara-2022-english.pdf، Annual report historical highlights | لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023. |
| net_income | 2023-12-31 | 454,764 | saudi-aramco-ara-2023-english.pdf، Annual report | لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023. |
| operating_cash_flow | 2019-12-31 | 416,529 | saudi-aramco-ara-2022-english.pdf، Annual report historical highlights | لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023. |
| operating_cash_flow | 2020-12-31 | 285,297 | saudi-aramco-ara-2022-english.pdf، Annual report historical highlights | لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023. |
| operating_cash_flow | 2021-12-31 | 522,601 | saudi-aramco-ara-2022-english.pdf، Annual report historical highlights | لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023. |
| operating_cash_flow | 2022-12-31 | 698,152 | saudi-aramco-ara-2022-english.pdf، Annual report historical highlights | لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023. |
| operating_cash_flow | 2023-12-31 | 537,814 | saudi-aramco-ara-2023-english.pdf، Annual report | لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023. |
| revenue | 2019-12-31 | 1,105,696 | saudi-aramco-ara-2022-english.pdf، Annual report historical highlights | لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023. |
| revenue | 2020-12-31 | 768,109 | saudi-aramco-ara-2022-english.pdf، Annual report historical highlights | لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023. |
| revenue | 2021-12-31 | 1,346,930 | saudi-aramco-ara-2022-english.pdf، Annual report historical highlights | لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023. |
| revenue | 2022-12-31 | 2,006,955 | saudi-aramco-ara-2022-english.pdf، Annual report historical highlights | لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023. |
| revenue | 2023-12-31 | 1,653,281 | saudi-aramco-ara-2023-english.pdf، Annual report | لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023. |
| total_equity | 2019-12-31 | 1,046,235 | saudi-aramco-ara-2022-english.pdf، Annual report historical highlights | لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023. |
| total_equity | 2020-12-31 | 1,101,094 | saudi-aramco-ara-2022-english.pdf، Annual report historical highlights | لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023. |
| total_equity | 2021-12-31 | 1,280,668 | saudi-aramco-ara-2022-english.pdf، Annual report historical highlights | لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023. |
| total_equity | 2022-12-31 | 1,666,147 | saudi-aramco-ara-2022-english.pdf، Annual report historical highlights | لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023. |
| total_equity | 2023-12-31 | 1,737,092 | saudi-aramco-ara-2023-english.pdf، Annual report supplementary metrics | لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023. |
