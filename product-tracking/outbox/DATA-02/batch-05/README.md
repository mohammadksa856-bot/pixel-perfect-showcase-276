# DATA-02 · الدفعة 05: إغلاق المراجعة ومواصفات العرض

ردٌّ على مراجعتي Codex:
- DATA02: `codex/data02-current-engine-review-20261013` @ `239d107`
- DATA03: `codex/data03-current-engine-review-20261013` @ `5179346`

**لا استخراج جديد ولا تغيير حالة**: كل السجلات المفتوحة تبقى REVIEW، ولا شيء هنا يقترح ACCEPT. لم تُعدَّل ملفات الدفعات 01–04 ولا المحرك ولا القاعدة المركزية.

| الملف | المحتوى |
|---|---|
| `review-closure/mupdf-check-batches-01-04.json` | إعادة فحص كل أدلة الدفعات 01–04 بطريقة Codex (نص MuPDF الأصلي): 1,097 مطابقة، و25 فشلًا، و122 دليل OCR بلا نص أصلي |
| `review-closure/quote-repairs.json` + `reviews/*-quote-repairs.json` | بديل لكل اقتباس فاشل (25). البدائل الـ62 تطابق MuPDF وpdftotext معًا، وعليها تنبيهات الاقتران أو الوحدة حيث يلزم |
| `review-closure/document-scope-unit-period.json` | لكل مستند: النطاق (موحّد/مستقل) والعملة والوحدة والفترة باقتباسات مزدوجة التحقق، مع درجة قوة دليل العملة |
| `review-closure/review-record-index.jsonl` | الـ380 سجلًا المفتوحة: مجموعة Codex، وأدلة المستند، وتواريخ البند، والإصلاحات، والمستندات اللازمة للإغلاق |
| `review-closure/numeric-candidate-semantics.json` | مقترحات الدلالة القياسية للمرشحات الـ39 (الأبعاد، والوحدة، والفترة، والنطاق)، دون قبول |
| `review-closure/document-requests.json` | المستندات المطلوبة لكل شركة، ومنها شاكر والشركات 16–20 |
| `display/display-map-v2.json` | خريطة العرض بعد فحص الفروق: 169 مفتاحًا تتوحّد في 74 مفتاحًا قياسيًا، مع مؤهّلات المفهوم والفترة والنطاق |
| `display/accepted-attribute-mapping.json` | ربط السجلات الـ71 المقبولة محليًا بخريطة العرض، دون أي بديل رقمي |
| `specs/entity-display-specs.json` | مواصفات العرض للصندوق العقاري المتداول، وشركات نمو، والشركات حسب القطاع. مقترح للمراجعة |

إعادة التحقق:
```bash
python3 product-tracking/tools/data02_verify.py <engine> product-tracking/outbox/DATA-02/batch-05 --docs-root <docroot>
python3 product-tracking/tools/data02_mupdf_check.py <engine> <out> product-tracking/outbox/DATA-02/batch-05 --docs-root <docroot>   # pip install pymupdf
bun test tests/data02-batch-05.test.ts
```
