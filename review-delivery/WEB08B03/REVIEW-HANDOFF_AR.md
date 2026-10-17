# WEB-08B03 — حزمة إعادة المراجعة المستقلة (Codex) بعد REWORK R01–R05

- **الحالة:** REWORK IMPLEMENTED, TESTED, READY FOR FULL INDEPENDENT RE-REVIEW. **لا ACCEPT.** القرار (ACCEPT أو REWORK) للمراجع على SHA ثابت.
- **المستودع والفرع:** `mohammadksa856-bot/pixel-perfect-showcase-276`، `claude/web-08b03-aramco-disclosures`.
- **Implementation SHA:** `1735609abafa85ee6e101ab7e3640496f0e43088`.
- **Delivery SHA:** commit هذا الملف.
  - لا يغيّر كودًا ولا مخرجات بعد `1735609`.
  - `git diff --stat 1735609 <Delivery SHA>` يقتصر على: `review-delivery/WEB08B03/*.md` و`screenshots/` و`test-logs/` و`research-evidence/aramco-disclosures/README_AR.md` و`product-tracking/CHANGELOG.jsonl`.
- **مرجع المراجعة السابقة:** `dcdecad97c3c8babd67931a817e69d0cd7a7d6d6`، حزمة `review-delivery/WEB08B03-INDEPENDENT/`، على `b72ad3a`.
- **تقرير الإغلاق:** `REWORK-R01-R05-CLOSURE_AR.md`. فيه:
  - جدول الملاحظات ← الملف ← الإصلاح ← الدليل؛
  - حالة الحالات الـ15؛
  - مراجعة الادعاءات الـ22.

## 1. إعادة الإنتاج

انظر القسم 6 في `REWORK-R01-R05-CLOSURE_AR.md`. اختصارًا:
- اختبارات B03: 57 ناجحًا.
- حالات Codex الأصلية دون تعديل: 15 ناجحة. البصمة blob `bc8ecb2b…`.
- B01: 91. B02: 23. التطبيق: 427 ناجحًا و14 متجاوزًا و0 فاشل.
- tsc وESLint: exit 0. `build.ts --check`: مطابقة. البناء المحلي: exit 0.

بصمات المخرجات في `test-logs/scope-and-hashes.txt`:

```text
cd review-delivery/WEB08B03 && sha256sum -c <(sed -n '/^# deliverable sha256/,$p' test-logs/scope-and-hashes.txt | tail -n +2)
```

## 2. الأعداد المتوقعة

| البند | العدد |
|---|---|
| صفوف الوثائق | 9: ثمانية تقارير/إصدارات وصفحة فهرس التداول؛ ليست كلها PDF مثبتة |
| مجموعات الأحداث | 17 مجموعة سجلات منسقة بأساس معلن. `economicEventVerified=false` للكل |
| الادعاءات | 22، كلها `WITHHELD` و`publicationEligible=false`. لكل ادعاء `sourceReview` |
| الموضوعات / المجموعات | 18 / 5 |
| المشاريع | 5. لا قيمة مستخرجة، ولا `not_disclosed` |
| جسر العقد | 0 من 22 قابل للبناء |

## 3. قائمة إعادة المراجعة

- [ ] **R01:** حالات F01 وF05، وحالات المؤلف في `describe("R01 …")`: الرابط، والشركة، والمعرف المشتق من الرابط، والإصدار، وتكرار B02.
- [ ] **R02:** حالات F02 وF03. سنة الهدف لا تصير `fiscalYear`. سنة مستقبلية ليست `actual`. القيد الأول يصف النص بأنه نص المحرك.
- [ ] **R03:** R10 وR11. `source-review.ts` منقول بدقة من `RESEARCH-SOURCE-REVIEW.json` (22 حالة). صفحات المحرك محفوظة بجانب صفحات المراجع. حالات حقول المشاريع.
- [ ] **R04:** F04 وF06 وF09، وأساس المجموعات، والعلاقة المتبادلة بين المنحة والرسملة (غير مدموجة)، وتعريف العدّ.
- [ ] **R05:** F07 وF08، وقيم APP_BASE المضللة العشر، ورفض الخادم عند التشغيل، وCSP وnoindex وno-store.
- [ ] **N01:** جدول المشاريع على 340 و386 و400 بكسل (`layout-measure.txt` وصور `mobile-*`).
- [ ] لا تسرب لأرقام محجوبة، ولا قاعدة مالية موازية، ولا هوية اصطناعية في المخرجات.

## 4. مصفوفة الادعاءات

| claim | category | reviewer status | engine page → reviewer PDF pages | gaps | disposition |
|---|---|---|---|---|---|
| `aramco-capex-guidance-2026` | management_plan/issuer_guidance | REVIEW | — → — | ID VER SHA LOC- RIGHTS FIN EDIT ENG NOLOC | Original locator required; WITHHELD |
| `aramco-sales-gas-growth-2030` | management_plan/management_target | REWORK | — → 13, 50, 54 | ID VER SHA LOC- RIGHTS FIN EDIT ENG MEANING≠ | Conflicting part withheld from quote; engine text kept for tracing; WITHHELD |
| `aramco-msc-12mbd` | management_plan/management_target | SUPPORTED_MEANING_NOT_APPROVED | — → 13, 26 | ID VER SHA LOC- RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-project-milestones-2025` | official_fact | SUPPORTED_COMPOSITE_NOT_APPROVED | — → 13, 15, 54 | ID VER SHA LOC- RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-jafurah-midstream-contract` | official_fact | SUPPORTED_MEANING_NOT_APPROVED | 71 → 71 | ID VER LOC? RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-rig-purchase-commitments` | official_fact | SUPPORTED_WITH_DERIVATION_CAVEAT | 69 → 69 | ID VER LOC? RIGHTS FIN EDIT ENG DERIVED | Derived figure flagged; bridge refuses; WITHHELD |
| `aramco-contingencies-ordinary-course` | official_fact | SUPPORTED_MEANING_NOT_APPROVED | 230 → 230 | ID VER SHA LOC? RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-contingencies-management-view` | management_plan/management_expectation | SUPPORTED_MANAGEMENT_ESTIMATE_NOT_APPROVED | 230 → 230 | ID VER SHA LOC? RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-sadara-petro-rabigh-support` | official_fact | SUPPORTED_MEANING_NOT_APPROVED | 230 → 230, 231 | ID VER SHA LOC? RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-customer-credit-concentration` | official_fact | SUPPORTED_MEANING_NOT_APPROVED | 192 → 192 | ID VER SHA LOC? RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-hydrocarbon-risk-factors` | official_fact | REVIEW | — → — | ID VER SHA LOC- RIGHTS FIN EDIT ENG NOLOC | Original locator required; WITHHELD |
| `aramco-q4-2025-base-dividend` | official_fact | SUPPORTED_MEANING_NOT_APPROVED | — → 235 | ID VER SHA LOC- RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-q4-2025-base-dividend-action` | official_fact | SUPPORTED_MEANING_NOT_APPROVED | — → 235 | VER SHA LOC- RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-buyback-2026` | official_fact | SUPPORTED_MEANING_NOT_APPROVED | — → 140, 246 | ID VER SHA LOC- RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-buyback-2026-action` | official_fact | SUPPORTED_MEANING_NOT_APPROVED | — → 140, 246 | VER SHA LOC- RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-fy2025-results-publication` | official_fact | REVIEW | — → 34, 36 | ID VER SHA LOC- RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-fy2025-dividends-paid` | official_fact | SUPPORTED_TITLE_NOT_NUMERIC_APPROVAL | — → 40, 235 | VER SHA LOC- RIGHTS FIN EDIT ENG | Meaning noted; not approved; WITHHELD |
| `aramco-petro-rabigh-stake-2025` | official_fact | REWORK | 232 → 233 | VER SHA LOC? RIGHTS FIN EDIT ENG PAGE≠ DAY? | Engine page kept; conflict recorded; bridge refuses; WITHHELD |
| `aramco-bonus-2023` | official_fact | REWORK | 139 → 140 | VER SHA LOC? RIGHTS FIN EDIT ENG PAGE≠ DAY? | Engine page kept; conflict recorded; bridge refuses; WITHHELD |
| `aramco-capital-increase-2023` | official_fact | REWORK | 139 → 140 | VER SHA LOC? RIGHTS FIN EDIT ENG PAGE≠ DAY? | Engine page kept; conflict recorded; bridge refuses; WITHHELD |
| `aramco-bonus-2022` | official_fact | REWORK | 139 → 140 | VER SHA LOC? RIGHTS FIN EDIT ENG PAGE≠ DAY? | Engine page kept; conflict recorded; bridge refuses; WITHHELD |
| `aramco-capital-increase-2022` | official_fact | REWORK | 139 → 140 | VER SHA LOC? RIGHTS FIN EDIT ENG PAGE≠ DAY? | Engine page kept; conflict recorded; bridge refuses; WITHHELD |

الرموز:
- ID = معرف السجل
- VER = الإصدار
- SHA = بصمة الأصل
- LOC- = لا موضع
- LOC? = الموضع غير مراجَع
- RIGHTS = منحة حقوق
- FIN = مراجعة مالية
- EDIT = إجازة تحريرية
- ENG = نص المحرك غير مطابق مع الأصل
- MEANING≠ = تعارض المعنى
- PAGE≠ = تعارض الموضع
- NOLOC = لا موضع في الأصل
- DERIVED = رقم مشتق
- DAY? = اليوم غير مثبت

## 5. حدود معروفة

1. **التحقق من الأصل:** المؤلف لم يطّلع على الأصل (الوكيل يحجب `aramco.com`). نتائج الأصل منقولة من المراجع كطبقة مراجعة، لا كحقائق.
2. **هوية المستند والحقوق:** لا هوية مستند موثوقة، ولا ربط حي (B02C BLOCKED). B02D إغلاق إداري: 0 مؤهل، ولا حقوق نشر.
3. **الحقوق والمراجعات:** منح حقوق المصادر الخارجية مفتوحة. إذن المستخدم التجاري محفوظ ولا يُعاد طلبه. المراجعات المالية والتحريرية مفتوحة.
4. **قرارات المراجع:**
   - دمج المنحة والرسملة؛
   - موضع التوجيه الرأسمالي؛
   - صياغة هدف الغاز من الأصل.
5. **ما لا ندّعيه:**
   - رحلة متصفح إلى خادم 5173 (N02)؛
   - اختيار as-of تاريخيًا (N03).

## 6. ما لم يُمسّ

- `main`، والإنتاج، وSupabase، والمحرك، وWEB-07، ومعيار 95%.
- عقود B01 وB02C وB02D، والمدخلات الـ142.
- لا نشر ولا تأهيل. لم يبدأ B04. لم تُسجَّل `USER_FINAL_ACCEPTANCE` ولا ACCEPT.
