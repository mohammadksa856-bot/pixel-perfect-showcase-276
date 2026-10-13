# DATA-02 · الدفعة 03: الشركات 11–15 من قائمة Codex

**المرجع:** `BATCH20_GAP_MATRIX.json` على `codex/data01-market-batch-20261013` @ `ab98885`، وهي القائمة نفسها في الدفعة 02.

**الشركات بالترتيب:** البحري 4030، أسمنت اليمامة 3020، معادن 1211، علم 7203، شاكر 1214. شاكر **بلا أي مستند مؤرشف** في أي فرع منشور، فهي فجوات فقط.

ملفات للمراجعة والدمج، ويتولى Codex الدمج. لم يُعدَّل المحرك ولا قاعدته، ولم يُمسّ الإنتاج ولا Supabase ولا `main`. ملفات الدفعتين 01 و02 لم تتغير، ولا الأدوات.

| المجلد / الملف | المحتوى | يُستورد في المحرك؟ |
|---|---|---|
| `manifests/` | manifest لكل شركة لها مستند (4 شركات)، **مفاتيح جديدة فقط** | نعم، بعد مراجعة Codex |
| `classification/` | مقترح القطاع/الصناعة، مسنود بنص النشاط. تصنيف تداول الرسمي **غير متحقق منه** | لا |
| `numeric-candidates/` | أرقام مرشّحة لـ DATA-01 بأدلتها. القيم المتعارضة في المصدر عليها ملاحظة «لا تُقبل» | لا |
| `gaps/gap-inventory.json` | 18 موضوعًا × 5 شركات، منها شاكر | لا |
| `sources.json` | المستندات وبصماتها، و**حدود المقارنة** مع نسخة Codex غير المنشورة، والمستندات الناقصة | لا |
| `verification-report.json` / `collision-report.json` / `merge-test-report.json` | نتائج الأدوات | — |

## مصدر المستندات
- **على `main` في المحرك:** اليمامة وعلم.
- **على فروع قطاعية غير مدموجة فقط:** البحري (`claude/data-transport-1`) ومعادن (`claude/data-materials-1`).

**لم يُستخدم OCR إطلاقًا في هذه الدفعة.** كل الأدلة من طبقة نص أصلية، والصفحات الممسوحة (القوائم الأولية للبحري وتقرير مراجع علم) لم يُقتبس منها.

## إعادة التحقق
```bash
E=<engine_repo>; B=product-tracking/outbox/DATA-02/batch-03
python3 product-tracking/tools/data02_fetch_branch_docs.py $E $B /tmp/docroot
python3 product-tracking/tools/data02_verify.py $E $B --docs-root /tmp/docroot
python3 product-tracking/tools/data02_collisions.py $E $B --extra-imports <dir: bahri/maaden + batch-02 branch imports> \
  --prior-batch product-tracking/outbox/DATA-02/batch-01 --prior-batch product-tracking/outbox/DATA-02/batch-02
DATA02_REGISTRY=<registry-with-all-batch-companies> product-tracking/tools/data02_merge_test.sh $E $B <copy-of-db> <scratch> \
  <4 Codex imports> product-tracking/outbox/DATA-02/batch-0{1,2}/manifests/*.json
bun test tests/data02-batch-03.test.ts
```
