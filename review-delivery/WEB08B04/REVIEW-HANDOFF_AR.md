# WEB-08B04 — حزمة المراجعة المستقلة النهائية (Codex): RR-ENG03-01 فقط

## المطلوب

- **القرار:** ACCEPT أو REWORK على SHA ثابت، لحارس الأرقام RR-ENG03-01 وانحداراته. **لا ACCEPT من المؤلف.**
- **ما بقي مغلقًا لدى Codex ولم يُمسّ:**
  - FIN-01–07؛
  - LINK-01؛
  - RR-ENG02-01؛
  - مراجعة الفقرات الـ99.

## المعرّفات

| البند | القيمة |
|---|---|
| الفرع | `claude/web-08b04-aramco-research-pack` في `mohammadksa856-bot/pixel-perfect-showcase-276` |
| القرار المُعالَج | `08f8b753deaaadf62690957db0d9d93b22eb8437` (`review-delivery/WEB08B04-FINAL-RESIDUAL/`) |
| **Implementation SHA** | `91fc3eea7528837ca37edbfe6dbe57fdb3a260e7` |
| التنفيذ المراجَع سابقًا | `acd116c`، وتسليمه `894fad1` |
| **Delivery SHA** | commit هذا الملف |

**فحص نطاق التسليم:** شغّل `git diff --stat 91fc3ee <Delivery SHA>`. يجب أن يقتصر الفرق على:
- `review-delivery/WEB08B04/*.md`
- `test-logs/`
- `screenshots/`
- `product-tracking/CHANGELOG.jsonl`

**فرق الإصلاح:** `git diff acd116c 91fc3ee -- research-evidence` (من commit `15bf174` و`91fc3ee`) يمس ثلاثة ملفات فقط:
- `pack.ts`
- `punctuation.test.ts`
- `README_AR.md`

المخرجات الثمانية بلا تغيير. التفاصيل في `RR-ENG03-01-CLOSURE_AR.md`.

## 1. إعادة الإنتاج

```text
git fetch origin claude/web-08b04-aramco-research-pack
git checkout 91fc3eea7528837ca37edbfe6dbe57fdb3a260e7        # LF checkout
bun install --frozen-lockfile

# ملفات Codex دون تعديل (للتشغيل فقط، لا تُضاف إلى الفرع):
D=review-delivery/WEB08B04-FINAL-RESIDUAL; mkdir -p $D
for f in residual-independent.test.ts additional.test.ts adversarial.test.ts boundaries.test.ts b03-original.test.ts guard-probe.ts; do
  git show 08f8b753:$D/$f > $D/$f; git hash-object $D/$f
done
# البصمات المتوقعة: f1f1107e / 87aff979 / 4078c3c4 / bc8ecb2b / bc8ecb2b / a470fc16
bun test ./$D/residual-independent.test.ts   # 72 pass (was 64/8)
bun test ./$D/additional.test.ts             # 14 pass
bun test ./$D/adversarial.test.ts            # 12 pass
bun test ./$D/boundaries.test.ts             # 15 pass
bun test ./$D/b03-original.test.ts           # 15 pass
bun ./$D/guard-probe.ts                      # P0–P7: accepted=false مع الخطأ المقصود

bun test research-evidence/aramco-research-pack               # 123 pass (punctuation.test.ts: 59)
bun research-evidence/aramco-research-pack/build.ts --check   # same ×8
bun x tsc -p research-evidence/aramco-research-pack/tsconfig.json --noEmit
bun x eslint research-evidence/aramco-research-pack
bun test research-evidence/aramco-disclosures && bun research-evidence/aramco-disclosures/build.ts --check
bun test research-evidence/v1 && bun test research-evidence/aramco-qualification && bun test tests
cd review-delivery/WEB08B04 && sha256sum -c <(sed -n '/^# deliverable sha256/,$p' test-logs/scope-and-hashes.txt | tail -n +2)
```

## 2. قائمة المراجعة المقترحة

- [ ] **P0–P7:** كل حالة تُرفض بالحارس المقصود، كما في `test-logs/punctuation-guard-reasons.txt`.
- [ ] **محلية الربط:**
  - الفاصل ترقيم ومسافات فقط: `GAP_BEFORE` و`GAP_AFTER`، ستة محارف على الأكثر، بلا كلمات.
  - النقطة والشرطة والقوس الافتتاحي بعد الرقم لا تربط.
  - جرّب صيغًا عدائية جديدة.
- [ ] **غير المدعوم يفشل مغلقًا:**
  - رموز العملات ورموزها ‰ و‱.
  - رموز ISO 4217 بحروف كبيرة (حساسة لحالة الأحرف) تفشل مغلقة. هل تبقى صيغة عملة شائعة تمر كسنة؟
- [ ] **عدم الإفساد:**
  - السنوات والتواريخ؛
  - رمز الشركة؛
  - أكواد المراجع؛
  - Aa3.
  - المخرجات الثمانية بالبصمات نفسها.
- [ ] **الحجب:** 7 BLOCKED، و22 و142 WITHHELD، وصفر تأهيل.

## 3. حدود

- الحارس نحوي، لا يعتمد دلالة الأرقام ماليًا.
- أسماء العملات المكتوبة كلمات غير مدرجة (لا رمزًا) لا تُكتشف إلا ملاصقة للرقم.
- **السجل المركزي:** اللوحة المعتمدة ليست في المستودع. أُلحقت الأحداث بـ`product-tracking/CHANGELOG.jsonl`، وأُشير إلى الحدث 107 بـSHA إيصاله دون تعديله.
