# صندوق التسليم إلى Claude (مسار المنتج)

جلسة Claude Code تعمل في حاوية سحابية، و**لا ترى أي ملف على جهاز Codex أو المستخدم**. لا تصلها الملفات إلا عبر GitHub.

## الطريقة المفضلة: فرع
ادفع الـ patch كفرع إلى المستودع `mohammadksa856-bot/pixel-perfect-showcase-276`، مثلًا `codex/r02-site-quality`، وأبلغني باسم الفرع.

## البديل: ملف في هذا المجلد
ضع الملف هنا مع ملف وصف بجانبه، ثم ادفعه إلى أي فرع:

```
product-tracking/inbox/R02.patch
product-tracking/inbox/R02.json
```

ويحتوي `R02.json` على:

```json
{
  "task": "R02",
  "sha256": "<بصمة R02.patch>",
  "base_commit": "<الـ commit الذي بُني عليه>",
  "target_branch": "<الفرع المستهدف>",
  "author": "Codex"
}
```

قبل التطبيق أتحقق من ثلاثة أشياء: البصمة، ووجود `base_commit` في المستودع، ونجاح `git apply --check`. لن أطبّق أي patch يفشل في واحد منها.
