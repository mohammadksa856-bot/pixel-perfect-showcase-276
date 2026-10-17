# WEB-08B04 — حزمة المراجعة المستقلة (Codex): RR-ENG03-01 بعد إعادة بناء الحارس

## المطلوب

- **القرار:** ACCEPT أو REWORK على SHA ثابت، لحارس الأرقام RR-ENG03-01. **لا ACCEPT من المؤلف.**
- **ما بقي مغلقًا ولم يُمسّ:**
  - FIN-01–07؛
  - LINK-01؛
  - RR-ENG02-01؛
  - الفقرات الـ99.

## المعرّفات

| البند | القيمة |
|---|---|
| الفرع | `claude/web-08b04-aramco-research-pack` في `mohammadksa856-bot/pixel-perfect-showcase-276` |
| القرار المُعالَج | `0fe3312c20dd48102515f65b3c5a6fff505b1d01` (`review-delivery/WEB08B04-FINAL-ACCEPTANCE/`) |
| الحدث المركزي | 108 (`6d858de8…`) |
| **Implementation SHA** | `8e896378a763f7cb5632ec5bb2963e5313664301` |
| التنفيذ المراجَع سابقًا | `91fc3ee`، وتسليمه `31aa6c6` |
| **Delivery SHA** | commit هذا الملف |

**فحص نطاق التسليم:** شغّل `git diff --stat 8e89637 <Delivery SHA>`. يجب أن يقتصر الفرق على:
- `review-delivery/WEB08B04/*.md`
- `test-logs/`
- `screenshots/`
- `product-tracking/CHANGELOG.jsonl`

**فرق الإصلاح:** `git diff 91fc3ee 8e89637 -- research-evidence`:
- **جديد:** `numeric-guard.ts`، و`iso4217.ts`، و`numeric-guard.test.ts`.
- **معدّل:** `pack.ts` (أُزيل المحلل القديم وصار `checkText` يتبع المسار المرتب)، و`punctuation.test.ts`، و`README_AR.md`، و`tsconfig.json`.
- **المخرجات الثمانية:** بلا تغيير.

التفاصيل في `RR-ENG03-01-FINAL-CLOSURE_AR.md`.

## 1. إعادة الإنتاج

```text
git fetch origin claude/web-08b04-aramco-research-pack
git checkout 8e896378a763f7cb5632ec5bb2963e5313664301        # LF checkout
bun install --frozen-lockfile

R=0fe3312c20dd48102515f65b3c5a6fff505b1d01; D=review-delivery/WEB08B04-FINAL-ACCEPTANCE; mkdir -p $D
for f in final-independent.test.ts residual-independent.test.ts additional.test.ts adversarial.test.ts boundaries.test.ts b03-original.test.ts edge-probe.ts guard-probe.ts; do
  git show $R:$D/$f > $D/$f; echo "$f $(git rev-parse $R:$D/$f) $(git hash-object $D/$f)"
done
bun test ./$D/final-independent.test.ts      # 53 pass (was 34/19)
bun test ./$D/residual-independent.test.ts   # 72
bun test ./$D/additional.test.ts             # 14
bun test ./$D/adversarial.test.ts            # 12
bun test ./$D/boundaries.test.ts             # 15
bun test ./$D/b03-original.test.ts           # 15
bun ./$D/edge-probe.ts && bun ./$D/guard-probe.ts   # every case accepted=false with the intended guard

bun test research-evidence/aramco-research-pack               # 205 pass (numeric-guard.test.ts: 81)
bun research-evidence/aramco-research-pack/build.ts --check   # same ×8
bun x tsc -p research-evidence/aramco-research-pack/tsconfig.json --noEmit && bun x eslint research-evidence/aramco-research-pack
bun test research-evidence/aramco-disclosures && bun research-evidence/aramco-disclosures/build.ts --check
bun test research-evidence/v1 && bun test research-evidence/aramco-qualification && bun test tests
cd review-delivery/WEB08B04 && sha256sum -c <(sed -n '/^# deliverable sha256/,$p' test-logs/scope-and-hashes.txt | tail -n +2)
```

## 2. قائمة المراجعة المقترحة

- [ ] **البنية:** هل بقي طريق يصبح فيه رقم غير مفهوم «سنة»؟ المسار في `numeric-guard.ts`، والاستثناءات في `checkText` بعده.
- [ ] **الفواصل:** مجموعة واحدة للجانبين.
  - الحد الصلب بجوار عملة يفشل مغلقًا.
  - `detached_unit` بعد 6 محارف.
- [ ] **ISO:**
  - طابق `iso4217.ts` (178) مع ملف SIX الذي فحصته. التطابق عندي في العدد والرموز الثلاثة فقط، لأن موقع SIX محجوب في بيئتي.
  - هل تكفي مطابقة الحروف الكبيرة مع القائمة الشائعة بأي حالة أحرف؟
- [ ] **Unicode:**
  - `\p{N}` غير اللاتيني و`\p{Cf}` يُفحصان على النص الخام قبل الحجب.
  - جرّب محارف أخرى.
- [ ] **عدم الإفساد:** السنوات، و2222، والأكواد، وAa3، والتواريخ، والمسودة.
- [ ] **الحدود المعلنة:** القسم 7 في تقرير الإغلاق.
- [ ] **الحجب:** `holds.txt`.

## 3. ملاحظة السجل المركزي

اللوحة المعتمدة ليست في المستودع. أُلحقت الأحداث بـ`product-tracking/CHANGELOG.jsonl` مع الإشارة إلى الحدث 108 وبصمته، ولم تُحدَّث اللوحة نفسها.
