# WEB-08A — Investment Intelligence Coverage Audit

ابدأ بـ[التقرير العربي](REPORT_AR.md)، ثم [مصفوفة الموضوعات](COVERAGE-MATRIX.json).

هذا تسليم تدقيق ومقترح تنفيذي للمراجعة **قبل البرمجة**. لم تُعدّل الواجهة أو المحرك أو بيانات الإنتاج.

## المراجع

- Application baseline: `d7d88c19fee626346b12d961f3a539fc31423f1f`.
- Audit core commit: `20505b9c6d51efb13d1a041a129e315d269db855`.
- Previous engineering acceptance: `117d13d81d322b884e0957d8506e5d8fc8533e73`, `review-delivery/WEB07-ACCEPTANCE/`.
- Central board/event update: `fbff44d5db94f610a59f2cf9f0efaad5bc99eae1`; immutable event95, prior history preserved.
- `MANIFEST.json` hashes the ten core files at audit commit20505b9 using Git blob bytes; README/manifest are delivery wrappers, not a claim of new financial verification.

## إعادة الإنتاج

في checkout معزول للفرع، وبالاعتماديات المحلية المطابقة للمرجع:

```text
bun review-delivery/WEB08A/audit-snapshot.ts
bun test review-delivery/WEB08A/audit.test.ts
```

الأمر الأول يقرأ عينة أرامكو المحلية ويطبع جردًا بلا تصدير القيم الرقمية أو تنزيل مصادر. يستخدم مسار العرض المجمد نفسه؛ هذا ليس استخراجًا أو استيرادًا أو حسابًا ماليًا جديدًا.

الاختبارات: **12 ناجحًا، صفر فاشل/متخطى، 199 تأكيدًا**. نطاقها بصمة عينة JSON واتساق الموضوعات والمصادر وعدّ الخلايا وحواجز مقترح الحسابات، لا صحة الأرقام أو استقلالية التحقق المالي. لم نعد كامل اختبارات التطبيق أو lint في هذه الدفعة الوثائقية. ديون lint السابقة لا توصف بأنها محلولة.

## ما يُراجع قبل التكليف التالي

1. الهيكل البحثي والأسئلة ومعايير كل موضوع، مع تعريف مقام القياس قبل أي نسبة.
2. حزمة WEB08-B01–B04: الأدلة والمدخلات الحرجة، توصيل الإفصاحات الموجودة، والتحرير المالي.
3. حقوق الأسعار/المؤشر/الإجماع/الأخبار وقائمة الأقران ومنهجيات الحساب، كل منها قرار مستقل.

موضوعات المستثمر18 ليست الفئات التشغيلية18. وجود بيانات في13موضوعًا ليس اكتمال13موضوعًا أو95%. N02 لم تُغلق، وDCF لم يبدأ؛ لا اعتماد بيانات حية أو قبول مستخدم نهائي أو ترخيص إنتاجي.
