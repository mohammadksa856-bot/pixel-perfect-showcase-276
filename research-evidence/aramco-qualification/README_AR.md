# WEB-08B02 — تأهيل أدلة مالية للقراءة فقط

المرجع النهائي للسجل: `review-delivery/WEB08B02/QUALIFIED-WITHHELD-INPUT-REGISTER-v4.json`.

هذا كود تدقيق خارج src، وليس قارئ إنتاج أو مخزن حقائق أو API. يقارن ورقة عمل محلية باللقطة المجمدة المعتمدة، ويصدر مراجع وقرارات دون القيم. دالة مقارنة الوحدات تستعمل حسابًا صحيحًا دقيقًا لأغراض المطابقة فقط، لا مشتقات مالية أو صيغ React.

## إعادة التشغيل

اعتماديات المشروع نفسها وBun موجودان؛ لا تثبيت جديد. نفّذ:

```text
bun test research-evidence/aramco-qualification
bun test research-evidence/v1
bun node_modules/typescript/bin/tsc -p research-evidence/aramco-qualification/tsconfig.json --noEmit
bun node_modules/eslint/bin/eslint.js research-evidence/aramco-qualification
bun research-evidence/aramco-qualification/audit.ts --private-root <authorized-private-evidence-directory> --output <new-report-file.json>
```

مسار output يجب أن يكون جديدًا؛ لا يستبدل سجلًا سابقًا. الأدلة الخاصة المطلوبة: أربعة PDFs بأسماء FY2024 وFY2025 وQ1-2026 وH1-Q2-2026، وaudit-observations.json وaudit-adjusted-observations.json. لن تُرفع إلى المستودع العام. البصمات في PRIVATE-EVIDENCE-MANIFEST.json تتيح تدقيقها محليًا؛ لا تستخدمها كمعرفات حقائق من المحرك.

`source-reader.py --root <private> --doc <name> --pages <one-based comma-separated pages>` للفحص المحلي باستخدام pypdf. استخراج النص وحده ليس دليل صحة؛ الصور الأصلية الخاصة للصفحات التي روجعت محفوظة محليًا، لا تُنشر.

## الضوابط

- سياق الشركة مثبت من لقطة2222؛ لا قبول لرقم من شركة أخرى.
- لا مساواة بين FY وquarter وYTD أو flow وinstant، ولو تطابقت النهاية.
- لا تحويل start فارغ إلىnull أو invent لوقت نشر من تاريخ يوم فقط؛ تسجل فجوة التمثيل.
- لا اختيار أول مصدر متناقض، أو تصحيح إشارة بواسطةabs، أو تحويل null إلىصفر.
- source_key/content_hash ليسا بالضرورة بصمةPDF. Fact version ليس document version.
- وصف القطاع/Corporate/الإلغاءات وتعريف المقياس جزء من الهوية.
- لا financial approval مصطنعة، ولا حقوق من مجرد إتاحة عامة أو تأكيد«نعم» دون مرجع ونطاق.
- كل المدخلات الفعلية142 تبقىWITHHELD؛ الدالة لا تمنح إذن نشر حتى في الاختبار الاصطناعي المستوفي.
- قرارات المشتقات فيDERIVATIVE-READINESS.json معلقة؛ لاFCF/EPS/EBITDA/هامش إنتاجي أوDCF.

## التاريخ والحدود

السجلv1 كان فرزًا أوليًا جمع غياب الفترة مع اختلافها؛ v2 فصل61فترة لا تظهر في اللقطة عن10فروق تمثيل. v3 فصل غياب القيمة عن اختلاف رقم مثبت؛ v4 ربط سياق الشركة. هذه الملفات الأولية لم تُقبل؛ بقيت محلية لحفظ تاريخ العمل. التسليم المنشور يستعملv4 وحده، وليس مجموع النتائج.

فشل فحص الأنواع وlint الأوليان قبل استكمال تعريفات الحقول والتنسيق؛ لم تُخفف التأكيدات. نتيجة JSON الأولى تجاوزت حد إخراج الأداة، فأضيف إخراج ملف جديد مع ملخص؛ هذا عائق إخراج وليس خللًا ماليًا. أول محاولة HTTP توقفت دون نتيجة ثم نجحت قراءة HTTP عادية محددة المدة، دون تجاوز حماية. عولج ترميز إخراج Python إلىUTF8؛ لم تعدل المستندات.

راجِع RECONCILIATION-AND-EXCEPTIONS_AR.md وENGINE-TO-RESEARCH-GAP-MATRIX.json. المقارنة لا تثبت الوضع الحي الآن؛ لقطة المحرك مؤرخة2026-10-13، وحقوق الوثائق والاعتماد المالي والمراجع الدائمة لم تُستكمل. تقرير B02 يعطيREWORK لتأهيل الاستخدام البحثي إلى حين إغلاق هذه البوابات، ولا يعيد فتحWEB-07 المقبول.
