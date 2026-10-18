# WEB-08B05 independent acceptance review

Decision: REWORK, B05-R01 native Windows file URL handling only.
Author application SHA: 8fb84fb7c804d0591f1bc7f7b9949ed929c6706d.
Tested delivery SHA: 3681aa0d084f31fc6bc6e05faa4c75db13b7b855.

Read INDEPENDENT-REVIEW_AR.md, FINDINGS.json, RESULTS.json, AUDIT.json and BROWSER-OBSERVATIONS.json. MANIFEST.json fingerprints this code-only package. No PDFs, private HTML, browser history, screenshots, credentials, or financial-data copies are included.

Original reproduction, on Windows with installed locked dependencies:

```text
bun research-evidence/aramco-research-experience/server.ts
bun test research-evidence/aramco-research-experience
bun research-evidence/aramco-research-experience/public-leak-scan.ts
bun research-evidence/aramco-research-experience/public-leak-scan.ts .vercel/output
bun test ./review-delivery/WEB08B05-INDEPENDENT/independent.test.ts
```

The first three fail natively; explicit output scan and 7 independent tests pass. Never count the 11 unexecuted author access cases as passed. Logs preserve actual hooks failures and import error.

Optional observation instrumentation (NOT an author fix or native acceptance):

```text
bun review-delivery/WEB08B05-INDEPENDENT/observe-server.ts
python review-delivery/WEB08B05-INDEPENDENT/audit.py
```

Only assets.ts CSS compilation base is transformed in memory, with an exact source check and logged hash. Author files and assertions are untouched. Security/UI observations are labeled separately. Only use this on loopback; do not publish its content. Linked application sampling needs the author's local frozen fixture configuration from REVIEW-HANDOFF_AR.md, never production credentials.

run_review.py requires BUN environment variable pointing to an installed trusted Bun runtime. finalize.py derives summaries/manifests from separate logs. These scripts never import data into production or modify engine/application code.
