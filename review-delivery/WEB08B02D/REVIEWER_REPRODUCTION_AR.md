# إعادة المراجعة المستقلة

افحص SHA التنفيذ في RESULTS.json وتسليم التقرير، دون تعديل ملفات المنفذ. لا تعتبر الإغلاق الإداري حسمًا ماليًا. الإذن التجاري للمستخدم مسجل ولا يُطلب ثانيةً.

مصادر خاصة متاحة للمراجع المحلي فقط:

- أصول B02 وملاحظتا العمل: المجلد المجاور `web08b02-private-20261017` خارج المستودع؛ بصماته الأصلية في `review-delivery/WEB08B02/PRIVATE-EVIDENCE-MANIFEST.json`.
- تصدير baseline المحرك: المجلد المجاور `web08b02d-private-20261017` خارج المستودع، ملف `engine-local.json` وملف `bridge-attempt-inputs.json`. البصمة والحدود موثقة في LOCAL-ENGINE-CAPTURE.json. لا رفع لهما.
- القاعدة المقروءة: نسخة DATA04 قبل الاستيراد في المستودع الهندسي المحلي، وليست DB إنتاج حية. لا تختلق أصلًا أو تاريخ معرفة حديثًا لها.

تشغيل الاختبارات الاصطناعية والسجل:

```text
python -X utf8 review-delivery/WEB08B02D/test_closeout.py
bun test research-evidence/v1
bun test research-evidence/aramco-qualification
bun test research-evidence/engine-bridge
bun node_modules/typescript/bin/tsc -p review-delivery/WEB08B02D/tsconfig.json --noEmit
bun node_modules/eslint/bin/eslint.js review-delivery/WEB08B02D/check_bridge.ts
```

أعد تصنيف الـ142 بصورة مستقلة من native rows والقيم الخاصة والملاحظات الأصلية، لا بإعادة طباعة نتائج المنفذ فقط. قارن ID coverage وكل قرار وسبب ومدخل مرشح. افحص العقود الأصلية والبصمات وعدم تغيير الأرقام أو اختلاق المراجع، وفرّق بين نقص من نسخة baseline وتعذر قراءة الإنتاج. راجع خصوصًا الإشارات والفترات الفورية/التدفقية والربع/YTD والإصدارات والنطاق/الأبعاد والعملة/الوحدة والمقاييس غير المربوطة.

توليد سجل جديد بأداة المنفذ يحتاج مخرجات جديدة: build() ينشئ ملف bridge-attempt-inputs.json حصريًا داخل private-root، لذلك لا تستبدل الملف التاريخي. إن استخدمت أداة المنفذ للتحقق المساعد، استعمل مجلد scratch جديدًا بمرجع قراءة للتصدير فقط. يفضل مقارن مستقل لا يستورد compare().

لا تشغل capture_readonly.py أو أي استيراد أو برنامج المحرك ضمن إعادة الاختبار إلا لسبب واضح ومصرح؛ إيصالات الاتصال الفاشل لا تثبت حالة الخادم. اطلب قرار ACCEPT أو REWORK هندسيًا تحت القيود المثبتة، مع إبقاء المراجعة المالية والربط الحي والحقوق الخارجية بوابات منفصلة. لا تحفظ صور المصادر أو مبالغها في تقرير GitHub.
