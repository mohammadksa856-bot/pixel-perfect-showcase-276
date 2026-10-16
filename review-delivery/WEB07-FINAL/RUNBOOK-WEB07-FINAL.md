# WEB-07 final independent engineering re-review

Decision: **REWORK**. This is not final user, financial, live-integration or production approval.

Application tested: `6eab69721aafdfab21051999ec7445cdc95535b9`.
Claude report: `53fb331e2f520eab6056ef06e0de78944ea4f433`.
Independent test/report commit: `68341602b620b3e87695be9f1af34f33d6644989`.
Central tracking commit: `b10e125ba178c538b53bc588af7858af9ca07c85`.
Central immutable event sequence: 93; chain verified through 93.

Verified actual Chrome Preview (not just READY):
https://pixel-perfect-showcase-276-1xa23kb34.vercel.app/preview/web-v1/companies/2222/overview

## Reproduce

Use an isolated checkout of the application SHA above with its existing dependencies.
The original `tests/web07-independent-provenance.test.ts` already exists at that SHA;
its Git blob is `f2cbf2017494b85e5bb3eef236164ca6a78c914d`, identical to the prior review.

Run separately:

```text
bun test tests/web07-independent-provenance.test.ts
bun test tests/web-07.test.ts tests/web-03-04.test.ts tests/web-06-d11-tabs.test.ts tests/web-05b-boundary.test.ts tests/web-readiness.test.ts
```

Copy only the included `web07-final-independent-period.test.ts` to application `tests/`.
It uses the existing application fixture in place; no document or fixture payload is included here.

```text
bun test tests/web07-final-independent-period.test.ts
bun x tsc --noEmit
bun run lint
```

Observed, separate runs: original 3 PASS; targeted regression 69 PASS; extended cases
2 PASS / 1 FAIL (FY versus quarter with identical end date); types exit 0; full lint exit 1.
The first assertion of the failing extended case stops that case; later assertions are
not reported as executed. The end-date-only chart comparison guard was additionally
reviewed in source. This does not assert actual frozen Aramco numerical values are wrong.

## Canonical lint diagnosis

Windows working-tree line endings inflate raw Prettier results. To compare original Git
blobs without altering any ESLint rule or ignoring any tracked lintable file, copy
`review-lint-tracked.mjs` to application root and run:

```text
bun review-lint-tracked.mjs 6eab69721aafdfab21051999ec7445cdc95535b9
bun review-lint-tracked.mjs 6ac8e4e90d236370834aa6c03f1edb8dfdb35739
```

Current: 883 errors / 23 warnings. Previous: 846 errors / 23 warnings.
The copied original reviewer test contributes 37 new formatting-only violations.
Preserve assertions when formatting; do not hide pre-existing debt or weaken lint.

## Scope and safety

R01, original R02, R03, actual Preview routes, N01 pass. Complete period identity remains
an R02 blocker: shared provenance and comparable bars omit `period.kind`.
N02 authored investment analysis remains a separate incomplete content backlog, not 95% coverage.
WEB-06 scoped acceptance remains preserved. No application fixes, production changes,
environment changes, restricted source documents, credentials or private Git ancestry
are included in this parentless evidence package.
