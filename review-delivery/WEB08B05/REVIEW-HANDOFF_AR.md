# WEB-08B05 — حزمة المراجعة المستقلة (Codex)

## المطلوب

ACCEPT أو REWORK لتجربة بحث أرامكو الخاصة على SHA ثابت. **لا ACCEPT من المؤلف.**

## المعرّفات

| البند | القيمة |
|---|---|
| الفرع | `claude/web-08b05-aramco-research-experience` في `mohammadksa856-bot/pixel-perfect-showcase-276` |
| الأساس | `8c27925` (قبول B04، الحدث 110) |
| **Implementation SHA** | `8fb84fb7c804d0591f1bc7f7b9949ed929c6706d` |
| **Delivery SHA** | commit هذا الملف |

**فحص نطاق التسليم:** شغّل `git diff --stat 8fb84fb <Delivery SHA>`. يجب أن يقتصر الفرق على `review-delivery/WEB08B05/` و`product-tracking/CHANGELOG.jsonl`.

**فحص نطاق التنفيذ:** شغّل `git diff --name-only 8c27925 8fb84fb`. يجب أن يقتصر الفرق على `research-evidence/aramco-research-experience/`.

التفاصيل في `REPORT_AR.md`.

## 1. إعادة الإنتاج

```text
git fetch origin claude/web-08b05-aramco-research-experience
git checkout 8fb84fb7c804d0591f1bc7f7b9949ed929c6706d
bun install --frozen-lockfile

bun research-evidence/aramco-research-experience/server.ts    # http://127.0.0.1:4466/?lang=ar | ?lang=en
bun test research-evidence/aramco-research-experience        # 35 pass
bun x tsc -p research-evidence/aramco-research-experience/tsconfig.json --noEmit
bun x eslint research-evidence/aramco-research-experience
bun run build && bun research-evidence/aramco-research-experience/public-leak-scan.ts   # hits 0

# انحدار
bun test research-evidence/aramco-research-pack && bun research-evidence/aramco-research-pack/build.ts --check
bun test research-evidence/aramco-disclosures && bun research-evidence/aramco-disclosures/build.ts --check
bun test research-evidence/v1 && bun test research-evidence/aramco-qualification && bun test tests

# أدوات المراجعة (القارئ يعمل؛ وخادم التطبيق على اللقطة المجمدة لفحص الروابط)
bun review-delivery/WEB08B05/tools/holds.ts
bun review-delivery/WEB08B05/tools/reader-http.ts
```

**فحص الروابط في المتصفح:** يحتاج خادم vite محليًا بوضع fixtures:
- `MAREFA_DESIGN_FIXTURES=true`
- `VERCEL_ENV=preview`
- `WEB_V1_PREVIEW_ENABLED=true`
- `ENGINE_PREVIEW_ENABLED=true`
- `VERCEL_GIT_COMMIT_REF=claude/web-07-company-experience` (الفرع المسموح به في قائمة fixtures؛ محليًا فقط)

ثم شغّل `node review-delivery/WEB08B05/tools/linkcheck.mjs`.

## 2. قائمة المراجعة المقترحة

- [ ] **بوابة الحماية:**
  - هل يمكن الوصول إلى نص المسودة أو أدلتها من غير loopback؟
  - هل تتجاوز ترويسة Host أو مسار ما الحماية؟
  - هل يظهر النص في أي مسار أو API أو مخرَج بناء للتطبيق؟
- [ ] **جودة التجربة:** هل تفهم نشاط أرامكو، والمشاريع، والمحركات، والمخاطر، والأدلة والفجوات من الصفحة؟ هل التسلسل والتنقل والجوال مناسبة لمنصة أبحاث؟
- [ ] **فصل الأنواع:**
  - لا يُقرأ تفسير أو توجيه أو سيناريو كحقيقة معتمدة.
  - الهدف لا يظهر إنجازًا.
- [ ] **التحليلات السبعة:** إطار قراءة، كلها BLOCKED، وسبب الحجب ظاهر.
- [ ] **الروابط:** 29 رابطًا صحيحًا، و43 نصًا لا يُنقر. لا رابط مكسور.
- [ ] **عدم التكرار وفقدان الأدلة:** موضع واحد لكل فقرة، وكل الأدلة ظاهرة كهويات، ولا اقتباس ولا قيمة.
- [ ] **اللغتان:** العربية أساسية، ولا نص عربي يُقدَّم كترجمة.
- [ ] **الوصول وRTL:** `a11y.json` و`layout-measure.txt` والصور.
- [ ] **الحجب:** 7 BLOCKED، و22 و142 WITHHELD، و0 مؤهل.

## 3. حدود معلنة

انظر القسم 5 في `REPORT_AR.md`:
- تباين الشارات الصغيرة في التطبيق نفسه قد يحتاج مراجعة، وهو خارج النطاق.
- axe لا يحسم النص فوق التدرّج.
- حجم الصفحة نحو 900KB.
- روابط التطبيق تتطلب خادمًا محليًا.
