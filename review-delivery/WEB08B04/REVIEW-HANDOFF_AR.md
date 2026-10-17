# WEB-08B04 — حزمة المراجعة المستقلة (Codex)، بعد REWORK

- **المطلوب:** مراجعة مستقلة وقرار ACCEPT أو REWORK على SHA ثابت. **لا ACCEPT من المؤلف.**
- **الفرع:** `claude/web-08b04-aramco-research-pack` في `mohammadksa856-bot/pixel-perfect-showcase-276`.
- **قرار REWORK المُعالَج:** `fa3a772daabaaecb44ee2eff842bb88456025f62`، بنود FIN-01–07 وENG-01–04 وLINK-01. الإغلاق بندًا بندًا في `REWORK-CLOSURE_AR.md`.
- **Implementation SHA:** `49eeed82b84d9e071a49b91b1c959e4f13a7b82b`. التنفيذ السابق `2685d94`، وتسليمه `c0c506f`.
- **Delivery SHA:** commit هذا الملف.
  - تحقق بـ`git diff --stat 49eeed8 <Delivery SHA>`.
  - يجب أن يقتصر على `review-delivery/WEB08B04/*.md` و`test-logs/` و`screenshots/` و`product-tracking/CHANGELOG.jsonl`.
- **الأساس:** `5ef2c56` (B03 مع DOC-01). التفاصيل في `REPORT_AR.md`.

## 1. إعادة الإنتاج

```text
git fetch origin claude/web-08b04-aramco-research-pack
git checkout 49eeed82b84d9e071a49b91b1c959e4f13a7b82b        # LF checkout
bun install --frozen-lockfile
bun test research-evidence/aramco-research-pack               # 50 pass (rework.test.ts: 22)
bun research-evidence/aramco-research-pack/build.ts --check   # same ×8
bun x tsc -p research-evidence/aramco-research-pack/tsconfig.json --noEmit
bun x eslint research-evidence/aramco-research-pack
bun test research-evidence/aramco-disclosures                 # B03: 57 pass
bun research-evidence/aramco-disclosures/build.ts --check     # B03: same ×6
bun test research-evidence/v1 && bun test research-evidence/aramco-qualification && bun test tests

# حالات Codex المستقلة دون تعديل (من fa3a772، للتشغيل فقط):
mkdir -p review-delivery/WEB08B04-INDEPENDENT
for f in adversarial boundaries; do
  git show fa3a772:review-delivery/WEB08B04-INDEPENDENT/$f.test.ts > review-delivery/WEB08B04-INDEPENDENT/$f.test.ts
  git hash-object review-delivery/WEB08B04-INDEPENDENT/$f.test.ts   # 4078c3c4… / bc8ecb2b…
done
bun test ./review-delivery/WEB08B04-INDEPENDENT/adversarial.test.ts   # 12 pass
bun test ./review-delivery/WEB08B04-INDEPENDENT/boundaries.test.ts    # 15 pass

bun research-evidence/aramco-research-pack/reader.ts          # http://127.0.0.1:4455/?lang=ar | ?lang=en
cd review-delivery/WEB08B04 && sha256sum -c <(sed -n '/^# deliverable sha256/,$p' test-logs/scope-and-hashes.txt | tail -n +2)
```

**فحص الروابط في المتصفح (اختياري):**
- شغّل خادم vite محليًا على اللقطة المجمدة بـ:
  - `MAREFA_DESIGN_FIXTURES=true`
  - `VERCEL_ENV=preview`
  - `WEB_V1_PREVIEW_ENABLED=true`
  - `ENGINE_PREVIEW_ENABLED=true`
  - `VERCEL_GIT_COMMIT_REF=claude/web-07-company-experience` (الفرع المسموح به في قائمة fixtures؛ محليًا فقط).
- افتح كل رابط في `MAREFA-DATA-LINKS.json`. النتيجة المسجلة في `test-logs/link-browser-check.json`: 72/72.

## 2. قائمة المراجعة المقترحة

- [ ] **FIN-01–07:**
  - راجع الفقرات الـ41 المعدلة، والـ58 الباقية، مقابل `PARAGRAPH-REVIEW.json` و`FINANCIAL-ANALYSIS-REVIEW.json`.
  - هل بقي أي تفسير يتجاوز أدلته؟ تحديدًا:
    - الطاقة الفائضة؛
    - ربح البرميل؛
    - هوامش التكرير؛
    - محاسبة الجافورة؛
    - توسعة الغاز؛
    - التوزيعات والتدفقات.
- [ ] **ENG-01/02:**
  - هويات الصفوف الكاملة؛
  - رفض الوحدات المختلطة والتعارض؛
  - FY والربع وYTD منفصلة؛
  - لا مصدر واحد لصفوف متعددة المصادر.
- [ ] **ENG-03/04:**
  - الكمية مرتبطة بالنوع والوحدة؛
  - الرقم المطابق في دليل غير ذي صلة لا يكفي؛
  - التواريخ التقويمية وحد اللقطة.
  - جرّب حالات عدائية جديدة غير حالاتك الـ12.
- [ ] **LINK-01:**
  - 29 `FOCUSABLE` و43 `NOT_RENDERED`، من `placement.ts` المحسوب من نموذج التطبيق.
  - هل يصيب كل رابط المقياس في موضوعه، أو يعلن عدم توفره؟
- [ ] **الحجب:**
  - الادعاءات الـ22 والمدخلات الـ142 بلا تغيير.
  - التحليلات السبعة BLOCKED، ببوابات التعريف (`OUTPUT_DEFINITION_NOT_BOUND:*`).
  - لا قيمة من اللقطة في أي مخرَج.
- [ ] **القارئ:**
  - loopback وGET-only وCSP؛
  - رفض APP_BASE غير الآمن؛
  - 320–1440 بلا تجاوز أفقي.

## 3. حدود لا يغلقها هذا التسليم

انظر القسم 6 في `REWORK-CLOSURE_AR.md` والقسم 5 في `REPORT_AR.md`. باختصار:
- الأصل لم يطالعه المؤلف.
- الحارس الرقمي محدود ولا يثبت المطابقة الدلالية للكميات في السجل.
- لا رقم مؤهل.
- الترجمة الإنجليزية جزئية.
- حقوق المصادر مفتوحة.
