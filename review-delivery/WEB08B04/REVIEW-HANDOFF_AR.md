# WEB-08B04 — حزمة المراجعة المستقلة (Codex)

- **المطلوب:** مراجعة مستقلة وقرار ACCEPT أو REWORK على SHA ثابت. **لا ACCEPT من المؤلف.**
- **الفرع:** `claude/web-08b04-aramco-research-pack` في `mohammadksa856-bot/pixel-perfect-showcase-276`.
- **Implementation SHA:** `2685d944f25b8dc3ef8d63147fded0d81551bef9`.
- **Delivery SHA:** commit هذا الملف.
  - تحقق بـ`git diff --stat 2685d94 <Delivery SHA>`.
  - يجب أن يقتصر على `review-delivery/WEB08B04/*.md` و`test-logs/` و`screenshots/` و`product-tracking/CHANGELOG.jsonl`.
- **الأساس:** `5ef2c56` (B03 مع DOC-01). التفاصيل في `REPORT_AR.md`.

## 1. إعادة الإنتاج

```text
git fetch origin claude/web-08b04-aramco-research-pack
git checkout 2685d944f25b8dc3ef8d63147fded0d81551bef9        # LF checkout
bun install --frozen-lockfile
bun test research-evidence/aramco-research-pack               # 28 pass
bun research-evidence/aramco-research-pack/build.ts --check   # same ×8
bun x tsc -p research-evidence/aramco-research-pack/tsconfig.json --noEmit
bun x eslint research-evidence/aramco-research-pack
bun test research-evidence/aramco-disclosures                 # B03: 57 pass
bun test research-evidence/v1 && bun test research-evidence/aramco-qualification && bun test tests
bun research-evidence/aramco-research-pack/reader.ts          # http://127.0.0.1:4455/?lang=ar | ?lang=en
cd review-delivery/WEB08B04 && sha256sum -c <(sed -n '/^# deliverable sha256/,$p' test-logs/scope-and-hashes.txt | tail -n +2)
```

## 2. قائمة المراجعة المقترحة

- [ ] **الحجب:**
  - الادعاءات الـ22 والمدخلات الـ142 بلا تغيير.
  - لا فقرة بحالة معتمدة.
  - التحليلات السبعة BLOCKED، بمدخلات بحالات غير مؤهلة.
- [ ] **لا قاعدة مالية موازية:**
  - لا قيمة من اللقطة في أي مخرَج.
  - لا أرقام من اقتباسات B03.
  - الأرقام الواردة في الفقرات من أدلتها المستشهد بها فقط (`checkText` في `pack.ts`).
- [ ] **الدلالات:**
  - فصل السجل والخطة والتفسير والافتراض والسيناريو.
  - الخطة لا تستند إلى واقعة، والسجل لا يستند إلى خطة.
  - لا أرقام في الافتراضات والسيناريوهات.
- [ ] **الفترات:**
  - فترات المدخلات من اللقطة.
  - التوجيه لا يُطابَق مع الإنفاق الفعلي.
  - لا سنة مستقبلية في السجل.
- [ ] **المصادر:**
  - كل مرجع يُحل.
  - روابط https فقط.
  - مراجعات Codex مثبتة بالـSHA ولا تُنسخ.
  - طبقة المراجعة منفصلة عن نص المحرك.
- [ ] **جودة البحث:** مراجعة الفقرات التفسيرية الـ33 مقابل أدلتها. هل يتجاوز أي تفسير ما تسمح به الأدلة؟ صُححت خمسة تجاوزات في المراجعة الذاتية قبل التثبيت، منها تصنيف تناجيب كمشروع غاز دون دليل.
- [ ] **المشاريع:** حالات B03 منقولة كما هي، ولا تكلفة أو أثر ربح أو تاريخ مختلق.
- [ ] **الموضوعات الـ18 وروابط Marefa Data:** روابط نسبية إلى مسارات التطبيق القائمة، دون أرقام.
- [ ] **القارئ:**
  - loopback وGET-only وCSP؛
  - التهريب ورفض APP_BASE غير الآمن؛
  - الجوال 320–390 بلا تجاوز.

## 3. حدود لا يغلقها هذا التسليم

انظر القسم 5 في `REPORT_AR.md`. باختصار:
- الأصل لم يُطالَع من المؤلف.
- لا رقم مؤهل، والتعريفات غير IFRS غير مربوطة.
- الترجمة الإنجليزية جزئية.
- حقوق المصادر الخارجية مفتوحة.
- لا رحلة 5173 ولا as-of.
