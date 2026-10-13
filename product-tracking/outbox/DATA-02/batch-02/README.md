# DATA-02 · الدفعة 02: الشركات 6–10 من قائمة Codex

**المرجع:** `BATCH20_GAP_MATRIX.json` على `codex/data01-market-batch-20261013` @ `ab98885`. بصمته `0823b6eb…` مطابقة لـ `MANIFEST.json` (v7).

**الشركات بالترتيب:** أكوا باور 2082، المراعي 2280، جرير 4190، دله الصحية 4004، دار الأركان 4300.

ملفات للمراجعة والدمج، ويتولى Codex الدمج. لم يُعدَّل مستودع المحرك ولا قاعدته، ولم يُمسّ الإنتاج ولا Supabase ولا `main`. ملفات الدفعة 01 لم تتغير.

| المجلد / الملف | المحتوى | يُستورد في المحرك؟ |
|---|---|---|
| `manifests/` | manifest لكل شركة بصيغة `sync-manifests`، **مفاتيح جديدة فقط** | نعم، بعد مراجعة Codex |
| `classification/` | مقترح القطاع/الصناعة لكل شركة، مسنود بنص النشاط من مستند الشركة. تصنيف تداول الرسمي **غير متحقق منه** | لا، فـ Codex يملك `config/companies.json` |
| `numeric-candidates/` | أرقام تشغيلية وتفصيلية مرشّحة لـ DATA-01، بأدلتها | لا |
| `gaps/gap-inventory.json` | 18 موضوعًا × 5 شركات، مستخرجة مما سُلِّم فعلًا ومن الفجوات المسجّلة | لا |
| `sources.json` | المستند الوحيد لكل شركة: الفرع وcommit المحرك والمسار والبصمة، والمستندات الناقصة | لا |
| `verification-report.json` / `collision-report.json` / `merge-test-report.json` | نتائج الأدوات | — |

## مصدر المستندات
لكل شركة مستند واحد فقط، مؤرشف في المحرك على **فروع قطاعية غير مدموجة** (`claude/data-utilities-1` و`data-food-1` و`data-retail-1` و`data-healthcare-2` و`data-realestate-1`)، وليس على `main`. لذلك:
- `source_archive` في كل manifest يحدد الفرع والـ commit والمسار.
- `tools/data02_fetch_branch_docs.py` يستخرج الملف من git ويعيد حساب بصمته.

مستند دار الأركان **ممسوح ضوئيًا بالكامل** وبلا طبقة نص. لذلك أدلته من OCR (tesseract 5.3.4، بدقة 300 dpi)، وكل دليل منها موسوم `"text_layer": "ocr"` وحالته `ocr_quote_on_page`. الأداة تعيد تشغيل OCR بنفسها عند التحقق.

## إعادة التحقق
```bash
E=<engine_repo>; B=product-tracking/outbox/DATA-02/batch-02
python3 product-tracking/tools/data02_fetch_branch_docs.py $E $B /tmp/docroot
python3 product-tracking/tools/data02_verify.py $E $B --docs-root /tmp/docroot          # يتطلب pdftotext وtesseract
# مجلد فيه ملفات استيراد الفروع الخمسة فقط (data/imports/*-2025-fy.json من كل فرع):
python3 product-tracking/tools/data02_collisions.py $E $B --extra-imports <dir-of-5-branch-imports> \
  --prior-batch product-tracking/outbox/DATA-02/batch-01
DATA02_REGISTRY=<registry-with-the-5-companies> product-tracking/tools/data02_merge_test.sh $E $B \
  <copy-of-financial.sqlite3> <scratch_dir> <the-5-branch-import-manifests>
bun test tests/data02-batch-02.test.ts
```
