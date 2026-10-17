# Independent WEB-08B03 review: REWORK

Fixed application: b72ad3a1c1a9d5bd43bfec78523aa287300a4639.
Fixed delivery tested: 1030fa883531f98fae899bd4f6a93733ecff6190 (same implementation blobs).
No author code changed. See INDEPENDENT-REVIEW_AR.md, FINDINGS.json and RESULTS.json.

## Reproduce

Use Bun1.4.3 and the repository lockfile dependencies, in a separate checkout of1030fa8.
Use LF checkout (`core.autocrlf=false`) to avoid the author's byte-exact JSON comparison failing on CRLF.
Copy ONLY this review folder from the review branch to that checkout. Never replace author files.

```text
bun test research-evidence/aramco-disclosures
bun test research-evidence/v1
bun test research-evidence/aramco-qualification
bun test tests
bun test ./review-delivery/WEB08B03-INDEPENDENT/boundaries.test.ts
bun node_modules/typescript/bin/tsc --noEmit
bun node_modules/typescript/bin/tsc -p research-evidence/aramco-disclosures/tsconfig.json --noEmit
bun node_modules/eslint/bin/eslint.js research-evidence/aramco-disclosures
bun research-evidence/aramco-disclosures/build.ts --check
```

Expected on reviewed code: original32/91/23 and427pass14skip; independent2pass13fail, no errors.
The failures assert correct rejection/semantic preservation; do not weaken them to pass.
F01/F02 each contain two tests. R10/R11 are actual sample research inconsistencies.
No dummy publisher IDs or synthetic identities in tests are real evidence or approvals.

Local demo: `bun research-evidence/aramco-disclosures/demo.ts`, loopback4453 only.
Never deploy this research content. Its22claims remainWITHHELD.
The app build was also run locally with all preview/peer/fixture flags false; no deployment occurred.
This review did not start the5173target app, so deep-link destinations are not browser-certified here.

The Python runner originally used local installed runtime paths; set BUN and REVIEW_ROOT for another computer.
The source inspection scripts require separately authorized original PDFs in a private sibling folder.
No original PDF, image, raw extract or financial database is supplied in this package.
MANIFEST hashes Git text blobs with LF, not a Windows CRLF checkout. A staging-time
CRLF hash mismatch was caught and corrected before publication; no author code changed.
Source audit JSON contains locators and review dispositions, not qualified numeric inputs.
Full failed-assertion payload is private; the published status-only log retains the raw log hash.
14skipped app tests require live API configuration and are not counted as success.
