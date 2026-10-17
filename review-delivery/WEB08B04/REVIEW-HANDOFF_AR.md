# WEB-08B04 — حزمة إعادة المراجعة (Codex): المانعان المتبقيان فقط

## المطلوب

- **القرار:** ACCEPT أو REWORK على SHA ثابت، لنطاق RR-ENG03-01 وRR-ENG02-01 وانحداراتهما. **لا ACCEPT من المؤلف.**
- **ما لم يُفتح من جديد:**
  - FIN-01–07 وLINK-01 (مغلقة في `a4150fe`)؛
  - الفقرات الـ99؛
  - B03.

## المعرّفات

| البند | القيمة |
|---|---|
| الفرع | `claude/web-08b04-aramco-research-pack` في `mohammadksa856-bot/pixel-perfect-showcase-276` |
| القرار المُعالَج | `a4150feeddff9e036f14827476139902dc03d567` (`review-delivery/WEB08B04-REREVIEW/`) |
| **Implementation SHA** | `acd116ced883133fa826f1c3bed979e22ac7f1d2` |
| التنفيذ المراجَع سابقًا | `49eeed8`، وتسليمه `f46a292` |
| **Delivery SHA** | commit هذا الملف |

**فحص نطاق التسليم:** شغّل `git diff --stat acd116c <Delivery SHA>`. يجب أن يقتصر الفرق على:
- `review-delivery/WEB08B04/*.md`
- `test-logs/`
- `screenshots/`
- `product-tracking/CHANGELOG.jsonl`

**فرق الإصلاح نفسه:** `git diff 49eeed8 acd116c`:
- الكود في `research-evidence/aramco-research-pack/`: `pack.ts`، و`evidence.ts`، و`build.ts` (ملاحظة)، و`content-financial.ts` (سؤال واحد)، و`residual.test.ts`، و`README_AR.md`.
- المخرجات المعاد توليدها: `RESEARCH-DRAFT_AR.md`، و`EVIDENCE-MAP.json`، و`FINANCIAL-STRUCTURE.json`.

التفاصيل في `RESIDUAL-CLOSURE_AR.md`.

## 1. إعادة الإنتاج

```text
git fetch origin claude/web-08b04-aramco-research-pack
git checkout acd116ced883133fa826f1c3bed979e22ac7f1d2        # LF checkout
bun install --frozen-lockfile

# حالات Codex دون تعديل (للتشغيل فقط، لا تُضاف إلى الفرع):
mkdir -p review-delivery/WEB08B04-REREVIEW review-delivery/WEB08B04-INDEPENDENT review-delivery/WEB08B03-REREVIEW
git show a4150fe:review-delivery/WEB08B04-REREVIEW/additional.test.ts   > review-delivery/WEB08B04-REREVIEW/additional.test.ts     # blob 87aff979…
git show fa3a772:review-delivery/WEB08B04-INDEPENDENT/adversarial.test.ts > review-delivery/WEB08B04-INDEPENDENT/adversarial.test.ts # blob 4078c3c4…
git show fa3a772:review-delivery/WEB08B04-INDEPENDENT/boundaries.test.ts  > review-delivery/WEB08B04-INDEPENDENT/boundaries.test.ts  # blob bc8ecb2b…
git show 4f7145e:review-delivery/WEB08B03-REREVIEW/boundaries.test.ts     > review-delivery/WEB08B03-REREVIEW/boundaries.test.ts     # blob bc8ecb2b…
bun test ./review-delivery/WEB08B04-REREVIEW/additional.test.ts     # 14 pass (was 8/6)
bun test ./review-delivery/WEB08B04-INDEPENDENT/adversarial.test.ts # 12 pass
bun test ./review-delivery/WEB08B04-INDEPENDENT/boundaries.test.ts  # 15 pass
bun test ./review-delivery/WEB08B03-REREVIEW/boundaries.test.ts     # 15 pass

bun test research-evidence/aramco-research-pack               # 64 pass (residual.test.ts: 14)
bun research-evidence/aramco-research-pack/build.ts --check   # same ×8
bun x tsc -p research-evidence/aramco-research-pack/tsconfig.json --noEmit
bun x eslint research-evidence/aramco-research-pack
bun test research-evidence/aramco-disclosures && bun research-evidence/aramco-disclosures/build.ts --check
bun test research-evidence/v1 && bun test research-evidence/aramco-qualification && bun test tests
cd review-delivery/WEB08B04 && sha256sum -c <(sed -n '/^# deliverable sha256/,$p' test-logs/scope-and-hashes.txt | tail -n +2)
```

السبب الذي يُغلق به كل من الحالات الست مسجل في `test-logs/residual-guard-reasons.txt`.

## 2. قائمة المراجعة المقترحة

- [ ] **RR-ENG03-01:**
  - هل تُصنَّف العملة والنسبة كمية قبل الرقم وبعده، بمسافة ودونها، وبالعربية والإنجليزية؟
  - هل تُرفض الصيغ الملتبسة (`ambiguous_number_format`) بدل اعتبارها سنة؟
  - جرّب صيغًا عدائية جديدة.
  - هل الاستثناءات ضيقة بما يكفي؟ وهي: السوابق العربية، و«م»/«هـ»، ودرجات التصنيف Aa1–Caa3 كرقم مجرد يلزمه دليل.
- [ ] **RR-ENG02-01:**
  - الربع 1–4؛
  - السنة عدد صحيح؛
  - التواريخ تقويمية، والكبيس صحيح؛
  - البداية ≤ النهاية؛
  - لا استكمال لفترة ناقصة.
  - ملاحظة: صف Instant يحمل بداية يبقى مقبولًا، اتساقًا مع حالتك A10.
- [ ] **RR-DOC-01 وRR-DOC-02:** صياغة ملاحظة الخريطة وسؤال إعادة الشراء.
- [ ] **عدم التراجع:**
  - المخرجات الخمسة الأخرى بنفس البصمات.
  - الروابط 72/72.
  - الحجب ثابت: 7 BLOCKED، و22 و142 WITHHELD.

## 3. حدود

- الحارس نحوي، لا يعتمد دلالة الأرقام ماليًا (RR-LIVE-01).
- التأهيل المالي مسار مستقل.
- بقية الحدود في `REPORT_AR.md` القسم 5.
