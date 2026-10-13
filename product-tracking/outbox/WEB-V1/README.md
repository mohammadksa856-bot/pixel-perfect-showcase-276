# MAREFA-WEB-V1: صور الشاشات للمراجعة (WEB-01 وWEB-02)

صور حقيقية من الموقع نفسه، التُقطت بمتصفح Chromium:
- سطح المكتب بعرض 1440، والجوال بعرض 390 وكثافة ‎2x.
- بالعربية والإنجليزية.
- الصفحات مسار معاينة معطّل افتراضيًا (`/preview/web-v1`)، ولا تغيّر أي صفحة منشورة.

## مصدر البيانات في الصور
- **صفحات الشركات:** ردود المحرك المجمّدة @ `b70254e` (`tests/fixtures/p02`)، تخدمها أداة `product-tracking/tools/web_v1_fixture_engine.ts` عبر مسار P02 الحقيقي (`FINENGINE_API_URL` + مفتاح).
- **تغطية المصنع:** ناتج مُقيِّم عقد المصنع في المحرك نفسه @ `b70254e`، شُغّل على نسخة معزولة من قاعدة المحرك (`tests/fixtures/web-v1/factory-b70254e.json.gz`).
  - التعاونية 8010 غير موجودة في تلك القاعدة، فتظهر «لم يُقيَّم».
- **ما ليس في الصور:** لا Supabase، ولا أرقام مُختلقة. الأبحاث والمعرفة غائبة لأن Supabase غير متاح من هذه البيئة.

## الصور

| # | الشاشة | الملفات |
|---|---|---|
| 01 | الواجهة الرئيسية | `01-home.{desktop,mobile}.{ar,en}.png` |
| 02 | البحث الموحّد (Ctrl+K): شركات، ثم «داخل هذه الشركة»، ثم أقسام الموقع | `02-search.*` |
| 03 | قالب الشركة: «الشركة ونشاطها» (أرامكو) | `03-company-2222-business.*` |
| 04 | «الأداء المالي» (أرامكو) | `04-company-2222-financials.*` |
| 05 | «المساهمون والحوكمة» (الراجحي) | `05-company-1120-shareholders.desktop.ar.png` |
| 06 | «السوق والتقييم» (التعاونية) | `06-company-8010-market.desktop.ar.png` |
| 07 | «المخاطر والإفصاحات» (أرامكو، جوال، إنجليزي) | `07-company-2222-risks.mobile.en.png` |
| 08 | لوحة تغطية المصنع: 18 فئة، الحدود، البوابات، الحقول | `08-coverage-2222.*` |
| 09 | تغطية الراجحي: فئة مستثناة بقاعدة قطاعية، والمجموع محجوب | `09-coverage-1120-excluded.*` |
| 10 | تغطية التعاونية: لم يُقيَّم (18 صفًا بلا درجات) | `10-coverage-8010-not-assessed.desktop.ar.png` |
| 11 | مرجع نظام التصميم | `11-design-system.*` |
| 12 | قائمة الجوال السفلية | `12-mobile-menu.mobile.ar.png` |

## إعادة التشغيل محليًا
```bash
FIXTURE_ENGINE_KEY=local bun product-tracking/tools/web_v1_fixture_engine.ts 8787 &
WEB_V1_PREVIEW_ENABLED=true ENGINE_PREVIEW_ENABLED=true ENGINE_PEERS_ENABLED=true \
  FINENGINE_API_URL=http://127.0.0.1:8787 FINENGINE_API_KEY=local npx vite dev
# ثم افتح /preview/web-v1
```
