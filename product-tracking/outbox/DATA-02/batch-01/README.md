# DATA-02 · الدفعة 01: إثراء الملفات النوعية

ملفات للمراجعة والدمج، وتبقى المسؤولية عن الدمج لدى Codex. لم يُعدَّل مستودع المحرك ولا قاعدته، ولم يُمسّ الإنتاج ولا Supabase ولا `main`.

| المجلد / الملف | المحتوى | يُستورد في المحرك؟ |
|---|---|---|
| `manifests/` | خمسة manifests بصيغة المحرك (`sync-manifests`)، **مفاتيح جديدة فقط** | نعم، بعد مراجعة Codex |
| `reviews/` | أدلة بالصفحة لمفاتيح **يملكها Codex مسبقًا**، مع حكم: `agrees` / `agrees_with_detail` / `differs` / `partially_supported` | لا، للقراءة فقط |
| `numeric-candidates/` | أرقام وأحداث مرشّحة لـ DATA-01، بأدلتها | لا، يقررها Codex |
| `gaps/gap-inventory.json` | 18 موضوعًا × 5 شركات: الحالة، وما لدى المحرك، وما أضافته الدفعة، والفجوة، والسبب، والمصدر الرسمي المرشح | لا |
| `sources.json` | المستندات المستخدمة (URL وSHA-256 والمسار في أرشيف المحرك) والمستندات الناقصة | لا |
| `verification-report.json` | نتيجة `tools/data02_verify.py` | — |
| `collision-report.json` | نتيجة `tools/data02_collisions.py` | — |
| `merge-test-report.json` | نتيجة `tools/data02_merge_test.sh` | — |

## قواعد الإثبات
- لكل عنصر `metadata.evidence[]`، وفي الإجراءات المؤسسية `details.metadata.evidence[]` لأن المحرك لا يقبل `metadata` هناك. كل دليل يتكون من `pdf_page` (رقم صفحة الملف، ويمكن التحقق منه آليًا) و`quote` (نص حرفي)، و`printed_page` حين يظهر رقم الصفحة المطبوع.
- `verification.status = extracted_quote_on_page` و`independent_review = false`. المعنى أن النص موجود فعلًا في تلك الصفحة من المستند المؤرشف، **وليس** أن طرفًا ثالثًا راجعه.
- `filed_at` قيمة مؤقتة بثقة `unknown`، لأن المستندات لا تذكر تاريخ نشر.
- عملة الريال تظهر في طبقة النص رمزًا (`x` أو `$` أو `&` أو `%`)، فلا تُستنتج منه. العملة مأخوذة من نص صريح في القوائم المالية.
- غياب الإفصاح لا يعني عدم الانطباق. لا يحمل أي عنصر أو خلية القيمة `not_applicable`، وهناك اختبار يتحقق من ذلك.

## إعادة التحقق
```bash
python3 product-tracking/tools/data02_verify.py   <engine_repo> product-tracking/outbox/DATA-02/batch-01
python3 product-tracking/tools/data02_collisions.py <engine_repo> product-tracking/outbox/DATA-02/batch-01
product-tracking/tools/data02_merge_test.sh <engine_repo> product-tracking/outbox/DATA-02/batch-01 \
  <copy-of-financial.sqlite3> <scratch_dir> \
  <engine_repo>/data/imports/stc-2025-company-profile.json <engine_repo>/data/imports/aramco-2025-governance-risk.json
bun test tests/data02-batch-01.test.ts
```
