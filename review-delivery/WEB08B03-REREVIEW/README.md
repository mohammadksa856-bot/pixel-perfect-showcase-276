# WEB08B03 independent re-review — scoped engineering ACCEPT

Application1735609abafa85ee6e101ab7e3640496f0e43088.
Delivery21847fdbd427af23a2b644aeeea92fa4fe9064b9.
Prior reviewdcdecad97c3c8babd67931a817e69d0cd7a7d6d6 remains preserved.

Use a separate LF checkout of the delivery and preinstalled lockfile-compatible dependencies (review runtimeBun1.4.3).
Fetch the previous review branch as well; source-transfer.test.ts reads its fixed JSON via git show.
Copy only this review directory, never application/source files, into that checkout.

```text
git hash-object review-delivery/WEB08B03-REREVIEW/boundaries.test.ts
# bc8ecb2b50a5f99b9506c711cc6ee06489e4ac84 — original15assertions unchanged
bun test ./review-delivery/WEB08B03-REREVIEW/boundaries.test.ts
bun test ./review-delivery/WEB08B03-REREVIEW/source-transfer.test.ts
bun test research-evidence/aramco-disclosures
bun test research-evidence/v1
bun test research-evidence/aramco-qualification
bun test tests
bun node_modules/typescript/bin/tsc --noEmit
bun node_modules/typescript/bin/tsc -p research-evidence/aramco-disclosures/tsconfig.json --noEmit
bun node_modules/eslint/bin/eslint.js research-evidence/aramco-disclosures
bun research-evidence/aramco-disclosures/build.ts --check
bun run build
```

Expected separate runs:15pass;8pass;57pass;91pass;23pass;427pass14skip.
The14liveAPI skips are not successes. Application build was local with preview/fixture/peer flags false, never deployed.
The Python runner records each run separately; set BUN for the installed runtime.

Local browser harness: bun review-delivery/WEB08B03-REREVIEW/demo-server.ts.
It imports author code unchanged, adds an application-SHA response header, and binds only127.0.0.1:4454.
Do not deploy it. No synthetic or unqualified research content was published to Vercel.
Browser checks do not certify a destination app on5173, historical as-of service, or full WCAG compliance.

collect.py needs private authorized original PDFs locally; none are provided/published in this package.
It exports only hashes, locators, disposition metadata and an HTTP-header receipt.
Transferred prior source review is not new financial or editorial verification.
The newly found release reference is not a replacement engine source or an approved input.

MANIFEST hashes canonical UTF-8 Git/LF blobs, not Windows CRLF checkout bytes. It excludes itself.
No PDF, original-source screenshot, raw financial export, database, key or environment file was added.
See INDEPENDENT-REVIEW_AR.md for acceptance boundaries and the remaining research decisions.
