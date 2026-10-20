# MAREFA — First Real Product Slice (للمراجعة)

| الملف | المحتوى |
|---|---|
| `engine-contract-derivations.patch` | التزاما المحرك `a320072` + `b133876` فوق `b70254e`: 23 صيغة، وحارس سنة الخسارة، و6 اختبارات اصطناعية. للتطبيق: `git am` |
| `site-gate-withheld-reasons.patch` | فوق `6c88655` (`claude/aramco95-financial-projection`): هياكل الحجب في البوابة، وأسباب الحجب في الصفحة، وتاريخ المصدر، وحالة التحديث، و3 اختبارات، وأداة التوقيع المحلية `sign_local.ts` (للتجربة فقط). للتطبيق: `git apply` |
| `FORMULA-REGISTER_AR.md` | سجل الصيغ، والفصل بين التحديث الموجود والصيغ وإعادة البناء، وROIC مقابل ROACE، وخطأ إشارة `short_term_investments_net` |
| `SLICE-PROOF_AR.md` و`slice-9901.png` | إثبات المسار الكامل على الشركة الاصطناعية، ونتيجة أرامكو المحجوبة كليًا |
| `SITE-AUDIT_AR.md` | المحتوى المضلل في main ومقترح التصحيح، دون تنفيذ |
| `COVERAGE-RESULTS.json` و`ARAMCO-GAP-CLASSES.json` | الدرجات المعتمدة مقابل المقاسة على نسخ معزولة، وتصنيف فجوات A–E (مفاتيح ونقاط فقط) |
| `measure_derivations.py` و`classify_gaps.py` | أدوات القياس. ترفض الكتابة خارج مجلد مؤقت |

**ما لا يحتويه هذا المجلد عمدًا:**
- قيم أرامكو وسابك المحسوبة.
- أي مفتاح أو قرار توقيع.
- قاعدة بيانات.

**ما تغيّر خارجه:** لم يتغير المحرك الأصلي، ولا main، ولا Production، ولا Supabase.
