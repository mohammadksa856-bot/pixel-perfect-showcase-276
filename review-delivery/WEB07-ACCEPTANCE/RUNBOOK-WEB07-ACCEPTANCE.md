# WEB07 engineering acceptance, independently rerun

**ACCEPT — scoped frozen design engineering only.**

- Application tested: `d7d88c19fee626346b12d961f3a539fc31423f1f`.
- Delivery: `f56f269ac3577d97498ffc49032f0cb89f87aef0`.
- Prior independent REWORK: `fc59e76134e9f57c1454377bc20e47066f57401b` (preserved).
- Independent acceptance artifacts: `f3aa0bb0e9f840d6773b0542518020ccfb8fd7f2`.
- Central board/event commit: `de7b916d9556016a05bdfaa5cf0bda7c7b1327bc`.
- Immutable central event sequence: 94; chain verified through 94.
- Actual Chrome Preview: https://pixel-perfect-showcase-276-9mdp62xty.vercel.app/preview/web-v1/companies/2222/overview
- Vercel read-only metadata independently maps that deployment to exact application SHA above.

## Reproduce separately on an isolated exact application checkout

Use existing locked dependencies; no production environment or imports needed.

```text
bun test tests/web07-independent-provenance.test.ts
bun test tests/web07-final-independent-period.test.ts
bun test tests/web-07.test.ts tests/web-03-04.test.ts tests/web-06-d11-tabs.test.ts tests/web-05b-boundary.test.ts tests/web-readiness.test.ts tests/web-06-polish.test.ts
bun x tsc --noEmit
```

Observed separate results: 3/3, 3/3, 89/89, types exit 0. No skipped or failed cases in these runs.
The copied formatted tests equal the originals after identical in-memory Prettier formatting.
No assertions, data or test logic were weakened. The included identity verifier uses Git refs
`6eab697` and `68341602` for the original test versions; fetch them if absent from your checkout.

For canonical lint reruns, use `review-lint-tracked.mjs` from the prior independent package
`fc59e76134e9f57c1454377bc20e47066f57401b:review-delivery/WEB07-FINAL/` in application root:

```text
bun review-lint-tracked.mjs d7d88c19fee626346b12d961f3a539fc31423f1f
bun review-lint-tracked.mjs 6ac8e4e90d236370834aa6c03f1edb8dfdb35739
```

Both return exit 1: existing **846 errors / 23 warnings** remain. File-by-file counts/rules
are identical, with **zero added or worsened files**. This is not a full lint pass.
Canonical Git LF prevents Windows checkout CRLF from falsely inflating the comparison;
no ESLint rules changed and no tracked lintable files were excluded beyond existing config.

## What closed

R01 own-row source/asOf; R02 full available period identity (`kind` + `end`) and unit,
per-row attribution for differences, no annual/quarter same-end comparison bars; R03 missing
and withholding states. N01 separate newest-first lists retained. Browser checks cover actual
new deployment Overview, Intelligence, Marefa Data, English/Arabic, 390px and 320px scoped
mobile journeys, keyboard links, metric focus and source links. WEB06 regression preserved.

## Not accepted by this decision

N02 authored investment analysis; 95% coverage; live financial/content integration; independent
accuracy of every underlying financial source; final user visual approval; production release.
No application merge or code edit performed, no main/production/AWS/Supabase/engine/environment
changes. This package has no private parent history, secrets or restricted documents.
