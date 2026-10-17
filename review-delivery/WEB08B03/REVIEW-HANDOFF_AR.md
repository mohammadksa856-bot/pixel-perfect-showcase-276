# WEB-08B03 — حزمة التسليم للمراجعة المستقلة (Codex)

- **الحالة:** IMPLEMENTED, TESTED, READY FOR INDEPENDENT REVIEW. **لا ACCEPT.** القرار (ACCEPT أو REWORK) للمراجع على SHA ثابت.
- **المستودع والفرع:** `mohammadksa856-bot/pixel-perfect-showcase-276`، `claude/web-08b03-aramco-disclosures`.
- **SHA الكود والمخرجات المختبر:** `6b1b2d5d5acbbbb1ea799299f514a5b27be37f13`.
- **SHA الحزمة:** commit هذا الملف (يحوي التقرير والصور والسجلات). لا يغيّر كودًا ولا مخرجات بعد `6b1b2d5`. تحقق بـ`git diff --stat 6b1b2d5 <SHA الحزمة>`: يجب أن يقتصر على `review-delivery/WEB08B03/*.md` و`screenshots/` و`test-logs/` و`README_AR.md` و`CHANGELOG.jsonl`.
- **الأساس:** WEB-08B02 `b1f90a9`. لم يُدمج B02C أو B02D (انظر «الاعتماديات» في `REPORT_AR.md`).

## 1. إعادة الإنتاج في جلسة مستقلة

```text
git fetch origin claude/web-08b03-aramco-disclosures
git checkout 6b1b2d5d5acbbbb1ea799299f514a5b27be37f13
bun install --frozen-lockfile
bun test research-evidence/aramco-disclosures                    # 34 pass, 0 fail
bun research-evidence/aramco-disclosures/build.ts --check        # same ×6, exit 0
bun x tsc -p research-evidence/aramco-disclosures/tsconfig.json --noEmit   # exit 0
bun x eslint research-evidence/aramco-disclosures                # exit 0
bun test research-evidence/v1                                    # B01: 91 pass
bun test research-evidence/aramco-qualification                  # B02: 23 pass
bun test tests                                                   # app: 427 pass, 14 skip, 0 fail
bun x tsc --noEmit -p .                                          # exit 0
bun research-evidence/aramco-disclosures/demo.ts                 # http://127.0.0.1:4453/?lang=ar | ?lang=en
cd review-delivery/WEB08B03 && sha256sum -c <(sed -n '/^# deliverable sha256/,$p' test-logs/scope-and-hashes.txt | tail -n +2)
```

- السجلات المرجعية في `test-logs/`، وفي رأس كل منها الأمر وSHA.
- `demo-http.txt` فيه فحوص الخادم: 200 / 404 / 405، ورؤوس CSP وnoindex وno-store، وعدّ البطاقات.
- `scope-and-hashes.txt` فيه الملفات المتغيرة منذ `b1f90a9` وبصمات المخرجات الست.
- الصور الاثنتا عشرة في `screenshots/` مع `IMAGE_MANIFEST.json`؛ `application_sha` فيه هو `6b1b2d5`.
- لا يحتاج أي فحص شبكة أو قاعدة أو محركًا حيًا. المدخلات هي اللقطة المجمدة `tests/fixtures/codex-20261013/2222-page.json.gz` وسجلات B02 الملتزمة.

## 2. الأعداد المتوقعة

| البند | العدد |
|---|---|
| وثائق/إصدارات | 9 (منها FY2024 FS من B02 خارج اللقطة: `inEngineSnapshot=false`) |
| أحداث | 17، لكل منها ادعاء واحد على الأقل، و0 معرف حدث معلق |
| ادعاءات | 22، كلها `WITHHELD` و`publicationEligible=false` |
| سجلات غير مصنفة | 0 من 15 إفصاحًا و8 إجراءات |
| موضوعات | 18. فيها إفصاح: business, financials, operations, dividends_actions (10), forecasts (3), risks (6), news (وثائق). مرتبط فقط: ownership, industry. والباقي `no_disclosure_in_sample` |
| الفئات | official_fact 18، management_plan 4، assumption 0، research_opinion 0 |
| المشاريع | 5 (3 مشاريع + هدفا برامج). التكلفة غير معلنة للكل، والمحركات الاقتصادية غير مؤلَّفة للكل |
| جسر العقد | 0 من 22 قابل للبناء (`trusted_document_identity` للكل) |

## 3. قائمة المراجعة (مطابقة لنطاق Codex)

### أ. الإفصاحات والأحداث والمصادر والإصدارات
- [ ] إصدارات التقارير وثائق لا أحداث: `DOCUMENT_CURATION` واختبار «report editions are documents».
- [ ] الحدث الواحد في سجلين يُجمع: إعادة الشراء وتوزيع Q4، مع التحذير `same_event_multiple_records`.
- [ ] السجلات المتزامنة غير المؤكدة لا تُدمج: منحة/زيادة رأس المال في 2022 و2023.
- [ ] تغيّر `version` لسجل في المحرك، أو حذفه، أو تكراره، يُفشل البناء (`record_not_unique_or_missing`).
- [ ] بصمة PDF بمطابقة الرابط الحرفية مع B02 فقط، ولا تساوي أي `content_hash`. لا معرفات من الروابط ولا إصدارات مخترعة.

### ب. تصنيف الادعاءات والتوجيهات والافتراضات
- [ ] `official_fact` مقابل `management_plan` (`issuer_guidance` / `management_target` / `management_expectation`) في `curation.ts`، مع المبرر لكل قرار.
- [ ] الالتزامات المحتملة ثلاثة ادعاءات: واقعة، وتوقع الإدارة (خطة)، وترتيبات صدارة/بترورابغ (واقعة).
- [ ] تجاوز تصنيف المحرك لتوزيع Q4 (`guidance` ← `official_fact`) ظاهر بالتحذير `classification_override`.
- [ ] لا افتراضات ولا رأي بحثي مؤلَّف (قوائم فارغة في `RISK-GUIDANCE-REGISTER.json`).

### ج. الحجب والمعلومات المستقبلية وتعارض الأدلة
- [ ] كل خطة إدارة تُعرض «هدف إدارة، لا إنجاز»، والجسر يحوّلها إلى `temporalBasis=issuer_guidance`.
- [ ] لا تاريخ مستنتج: سعة 12 مليون برميل/يوم بلا سنة (`not_disclosed`)، وبداية عقد جافورة وإعادة الشراء `null`.
- [ ] الأدلة الاسترجاعية (حدث قبل نشر مصدره) تحمل `evidence_published_after_event`. لا دليل معاصر، والفجوة G7.
- [ ] لا تعارض أدلة مخفي: كل ادعاء مربوط بسجل واحد محدد؛ السجلان للحدث الواحد ظاهران معًا.

### د. لا تسرب لأرقام محجوبة ولا قاعدة مالية موازية
- [ ] لا حقل `value` في أي مخرَج (اختبار).
- [ ] ادعاء نتائج 2025 بلا اقتباس، والتوزيعات المدفوعة بلا رقم؛ كلاهما يُربط بـMarefa Data (`?tab=financials|shareholders`).
- [ ] الأرقام داخل الاقتباسات الحرفية (7 ادعاءات) نص لا قيم، وتحمل `quote_contains_disclosed_figure`. لا تخص هويات المدخلات الـ142 (B02D).
- [ ] المؤشرات المرتبطة بالمشاريع روابط إلى مقاييس منشورة في اللقطة، دون قيم أو أثر محسوب.

### هـ. العرض والروابط
- [ ] loopback فقط، GET فقط، CSP `default-src 'none'` و`form-action 'none'`، noindex، no-store.
- [ ] `safeHref` يقبل https فقط، و`esc` يهرّب النص العدائي (اختبار).
- [ ] روابط Company Intelligence وMarefa Data نسبية إلى `APP_BASE` المحلي. لا Preview ولا إضافة إلى قائمة السماح، عمدًا.
- [ ] الشريط يعلن أن العينة غير معتمدة، ولكل بطاقة `data-status="WITHHELD"`.

### و. إعادة الاختبارات
- [ ] الأوامر في القسم 1 تعطي الأعداد نفسها، و`build.ts --check` يطابق البصمات.

## 4. مصفوفة الفجوات لكل ادعاء

الرموز:
- ID = `engine_record_id_missing`
- VER = `document_version_missing`
- SHA = `original_artifact_sha256_missing`
- LOC- = `locator_missing`
- LOC? = `locator_unverified`
- RIGHTS = `documented_rights_grant_missing`
- FIN = `independent_review_receipt_missing`
- EDIT = `editorial_review_missing`

التحذيرات:
- retro = `evidence_published_after_event`
- override = `classification_override`
- no-quote = `quote_not_copied_links_marefa_data`
- figure = `quote_contains_disclosed_figure`
- multi-rec = `same_event_multiple_records`

| claim | category | document (filed) | gaps | warnings |
|---|---|---|---|---|
| `aramco-capex-guidance-2026` | management_plan/issuer_guidance | saudi-aramco-ara-2025-english.pdf (2026-03-09) | ID VER SHA LOC- RIGHTS FIN EDIT | figure |
| `aramco-sales-gas-growth-2030` | management_plan/management_target | saudi-aramco-ara-2025-english.pdf (2026-03-09) | ID VER SHA LOC- RIGHTS FIN EDIT | figure |
| `aramco-msc-12mbd` | management_plan/management_target | saudi-aramco-ara-2025-english.pdf (2026-03-09) | ID VER SHA LOC- RIGHTS FIN EDIT | figure |
| `aramco-project-milestones-2025` | official_fact | saudi-aramco-ara-2025-english.pdf (2026-03-09) | ID VER SHA LOC- RIGHTS FIN EDIT | — |
| `aramco-jafurah-midstream-contract` | official_fact | saudi-aramco-fy-2025-full-financials-eng (2026-03-10) | ID VER LOC? RIGHTS FIN EDIT | — |
| `aramco-rig-purchase-commitments` | official_fact | saudi-aramco-fy-2025-full-financials-eng (2026-03-10) | ID VER LOC? RIGHTS FIN EDIT | figure |
| `aramco-contingencies-ordinary-course` | official_fact | saudi-aramco-ara-2025-english.pdf (2026-03-09) | ID VER SHA LOC? RIGHTS FIN EDIT | — |
| `aramco-contingencies-management-view` | management_plan/management_expectation | saudi-aramco-ara-2025-english.pdf (2026-03-09) | ID VER SHA LOC? RIGHTS FIN EDIT | — |
| `aramco-sadara-petro-rabigh-support` | official_fact | saudi-aramco-ara-2025-english.pdf (2026-03-09) | ID VER SHA LOC? RIGHTS FIN EDIT | — |
| `aramco-customer-credit-concentration` | official_fact | saudi-aramco-ara-2025-english.pdf (2026-03-09) | ID VER SHA LOC? RIGHTS FIN EDIT | — |
| `aramco-hydrocarbon-risk-factors` | official_fact | saudi-aramco-ara-2025-english.pdf (2026-03-09) | ID VER SHA LOC- RIGHTS FIN EDIT | — |
| `aramco-q4-2025-base-dividend` | official_fact | saudi-aramco-ara-2025-english.pdf (2026-03-09) | ID VER SHA LOC- RIGHTS FIN EDIT | override multi-rec |
| `aramco-q4-2025-base-dividend-action` | official_fact | saudi-aramco-ara-2025-english.pdf (2026-03-09) | VER SHA LOC- RIGHTS FIN EDIT | multi-rec |
| `aramco-buyback-2026` | official_fact | saudi-aramco-ara-2025-english.pdf (2026-03-09) | ID VER SHA LOC- RIGHTS FIN EDIT | figure multi-rec |
| `aramco-buyback-2026-action` | official_fact | saudi-aramco-ara-2025-english.pdf (2026-03-09) | VER SHA LOC- RIGHTS FIN EDIT | figure multi-rec |
| `aramco-fy2025-results-publication` | official_fact | saudi-aramco-ara-2025-english.pdf (2026-03-09) | ID VER SHA LOC- RIGHTS FIN EDIT | no-quote |
| `aramco-fy2025-dividends-paid` | official_fact | saudi-aramco-ara-2025-english.pdf (2026-03-09) | VER SHA LOC- RIGHTS FIN EDIT | — |
| `aramco-petro-rabigh-stake-2025` | official_fact | saudi-aramco-ara-2025-english.pdf (2026-03-09) | VER SHA LOC? RIGHTS FIN EDIT | retro figure |
| `aramco-bonus-2023` | official_fact | saudi-aramco-ara-2025-english.pdf (2026-03-09) | VER SHA LOC? RIGHTS FIN EDIT | retro |
| `aramco-capital-increase-2023` | official_fact | saudi-aramco-ara-2025-english.pdf (2026-03-09) | VER SHA LOC? RIGHTS FIN EDIT | retro |
| `aramco-bonus-2022` | official_fact | saudi-aramco-ara-2025-english.pdf (2026-03-09) | VER SHA LOC? RIGHTS FIN EDIT | retro |
| `aramco-capital-increase-2022` | official_fact | saudi-aramco-ara-2025-english.pdf (2026-03-09) | VER SHA LOC? RIGHTS FIN EDIT | retro |

- كل ادعاء ينقصه، على الأقل: إصدار المستند، ومنحة الحقوق الموثقة، والشهادة المالية المستقلة، والإجازة التحريرية، والموضع (مفقود أو غير مراجَع).
- الادعاءان من القوائم المالية FY2025 (جافورة والحفارات) لهما بصمة PDF مثبتة من B02، وتنقصهما صفحات مراجعة.
- الإجراءات (`corporate_actions`) لها مفتاح `action_key` ثابت، فلا تحمل ID.

## 5. حدود معروفة (ليست مطلوبة في B03، ولا تُعامل كمنجزة)

1. لا هوية مستند موثوقة (معرف وإصدار من الناشر، وبصمة الأصل للتقرير السنوي 2025)، فلا ادعاء قابل للبناء في `research-claim/1`.
2. الربط الحقيقي بالمحرك BLOCKED وفق B02C. B03 يقرأ لقطة مجمدة فقط.
3. B02D إغلاق إداري: 0 مدخل مؤهل ماليًا، ولا قراءة إنتاج حية، ولا اعتماد مالي أو حقوق نشر.
4. لا منحة حقوق موثقة، ولا مراجع مالي أو تحريري مخوّل، ولا سجل مراجعات دائم.
5. المواضع (الصفحات 69، 71، 139، 192، 230، 232 وغيرها) غير مراجَعة بصريًا.
6. تصنيف الموضوعات وفئات الادعاءات قرارات تحريرية في `curation.ts` تحتاج إقرارًا (القرارات 1–9 في `REPORT_AR.md`).
7. لا تشغيل متصفح للتطبيق ضمن B03؛ التطبيق لم يتغير (`src` بلا تغيير منذ B02). صور العرض المحلي فقط.

## 6. ما لم يُمسّ

- `main`، والإنتاج، وSupabase، والمحرك، وWEB-07، ومعيار 95%.
- حجب المدخلات الـ142، وعقود B01 وB02 وB02C وB02D.
- لا DCF ولا توقعات ولا نسب، ولا معلومات غير منشورة، ولا أثر مالي كمي للمشاريع، ولا نشر.
- لم تُسجَّل `USER_FINAL_ACCEPTANCE` ولا ACCEPT.

## 7. الانتقال المقترح

- بعد قرار Codex: إن كان REWORK، تُصحح البنود على هذا الفرع وتُعاد هذه الحزمة على SHA جديد.
- إن كان ACCEPT هندسيًا، يبدأ WEB-08B04 (حزمة أبحاث أرامكو الاستثمارية) من فرع مستقل.
- يبقى كل ادعاء WITHHELD حتى تُستوفى فجواته بأدلة حقيقية، لا بمراجع اصطناعية.
