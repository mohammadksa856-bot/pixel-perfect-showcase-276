# WEB-08B04 — حزمة المراجعة المستقلة (Codex): رفض محارف التنسيق الخام قبل الحجب

## المطلوب

- **القرار:** ACCEPT أو REWORK على SHA ثابت، لإصلاح `RAW_FORMAT_CONTROL_LOST_WHEN_ALL_DIGITS_MASKED` ضمن RR-ENG03-01 فقط. **لا ACCEPT من المؤلف.**
- **ما بقي مغلقًا ولم يُمسّ:**
  - FIN-01–07؛
  - LINK-01؛
  - RR-ENG02-01؛
  - الفقرات الـ99؛
  - قائمة ISO 4217؛
  - بقية تصميم `numeric-guard.ts`.

## المعرّفات

| البند | القيمة |
|---|---|
| الفرع | `claude/web-08b04-aramco-research-pack` في `mohammadksa856-bot/pixel-perfect-showcase-276` |
| القرار المُعالَج | `b58ecc24af7055eb86a569ca99d7d3813a0868f7` (`review-delivery/WEB08B04-STRUCTURAL-FINAL/`) |
| الحدث المركزي | 109 (`4b8d90b0…`) |
| **Implementation SHA** | `946d7b48a06048e146b31825d88690aad93773e8` |
| التنفيذ المراجَع سابقًا | `8e89637`، وتسليمه `c737e9b` |
| **Delivery SHA** | commit هذا الملف |

**فحص نطاق التسليم:** شغّل `git diff --stat 946d7b4 <Delivery SHA>`. يجب أن يقتصر الفرق على:
- `review-delivery/WEB08B04/*.md`
- `test-logs/`
- `screenshots/`
- `product-tracking/CHANGELOG.jsonl`

**فرق الإصلاح:** `git diff 8e89637 946d7b4 -- research-evidence` يمس ثلاثة ملفات فقط:
- `pack.ts`: مرحلة النص الخام في `checkText`.
- `raw-format-control.test.ts`: جديد.
- `README_AR.md`: سطر واحد.

لم يتغير `numeric-guard.ts` ولا `iso4217.ts`. التفاصيل في `RR-ENG03-01-RAW-CF-CLOSURE_AR.md`.

## 1. إعادة الإنتاج

```text
git fetch origin claude/web-08b04-aramco-research-pack
git checkout 946d7b48a06048e146b31825d88690aad93773e8        # LF checkout
bun install --frozen-lockfile

R=b58ecc24af7055eb86a569ca99d7d3813a0868f7; D=review-delivery/WEB08B04-STRUCTURAL-FINAL; mkdir -p $D
for f in structural-independent.test.ts mask-probe.ts final-independent.test.ts residual-independent.test.ts additional.test.ts adversarial.test.ts boundaries.test.ts b03-original.test.ts edge-probe.ts guard-probe.ts; do
  git show $R:$D/$f > $D/$f; echo "$f $(git rev-parse $R:$D/$f) $(git hash-object $D/$f)"
done
bun test ./$D/structural-independent.test.ts # 39 pass (was 20/19)
bun test ./$D/final-independent.test.ts      # 53
bun test ./$D/residual-independent.test.ts   # 72
bun test ./$D/additional.test.ts             # 14
bun test ./$D/adversarial.test.ts            # 12
bun test ./$D/boundaries.test.ts             # 15
bun test ./$D/b03-original.test.ts           # 15
bun ./$D/mask-probe.ts && bun ./$D/edge-probe.ts && bun ./$D/guard-probe.ts   # no accepted=true

bun test research-evidence/aramco-research-pack               # 270 pass (raw-format-control.test.ts: 65)
bun research-evidence/aramco-research-pack/build.ts --check   # same ×8
bun x tsc -p research-evidence/aramco-research-pack/tsconfig.json --noEmit && bun x eslint research-evidence/aramco-research-pack
bun test research-evidence/aramco-disclosures && bun research-evidence/aramco-disclosures/build.ts --check
bun test research-evidence/v1 && bun test research-evidence/aramco-qualification && bun test tests
cd review-delivery/WEB08B04 && sha256sum -c <(sed -n '/^# deliverable sha256/,$p' test-logs/scope-and-hashes.txt | tail -n +2)
```

## 2. قائمة المراجعة المقترحة

- [ ] **حتمية الرفض:** هل يقع قرار رفض `\p{Cf}` قبل `mask()`، ولا يعتمد على `analyseNumbers()`؟
- [ ] **عقد الأخطاء:**
  - مع رقم خام: `ambiguous_number_format:<where>:<digits>:format_control`.
  - بلا أرقام: `format_control:<where>:U+XXXX`.
  - موضع `:en` محفوظ.
  - `non_latin_digits` أولًا.
- [ ] **عدم التراجع:**
  - رسائل الحالات السابقة كما هي.
  - المخرجات الثمانية بالبصمات نفسها.
  - الحجب ثابت.
- [ ] **الحالات الـ39 بأسبابها:** في `test-logs/structural-39-reasons.txt`.

## 3. ملاحظة السجل المركزي

اللوحة المعتمدة ليست في المستودع. أُلحقت الأحداث بـ`product-tracking/CHANGELOG.jsonl` مع الإشارة إلى الحدث 109 وبصمته.
