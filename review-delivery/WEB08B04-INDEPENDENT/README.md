# WEB08B04 independent review — code-only

Decision: REWORK. Application2685d944f25b8dc3ef8d63147fded0d81551bef9; tested deliveryc0c506f68bb72e528136e6b09ec58845b319db8a (application code identical).

Use existing dependencies and Bun. No environment files, source PDFs, raw financial values or credentials are needed for these tests.

```text
bun test ./review-delivery/WEB08B04-INDEPENDENT/boundaries.test.ts
bun test ./review-delivery/WEB08B04-INDEPENDENT/adversarial.test.ts
bun test research-evidence/aramco-research-pack
bun test research-evidence/aramco-disclosures
bun test research-evidence/v1
bun test research-evidence/aramco-qualification
bun test tests
```

Original15tests retained verbatim (Git blobbc8ecb2b50a5f99b9506c711cc6ee06489e4ac84). New12tests express correct expectations:8currently fail,4pass. Do not weaken assertions. R08 demonstrates that numerical token membership cannot prove semantic support, not that all natural-language truth must be mechanically inferred.

The mutation wrapper discards the returned pack after invoking the same compiler, solely to prevent Bun's failed-toThrow diagnostics from dumping the entire research pack. Assertions, inputs and8FAIL/4PASS remain unchanged. First verbose run is retained privately and not uploaded; published run is the independently repeated minimal diagnostic output.

`run_review.py` requires BUN=path-to-existing-bun; writes one log per named command. `probe.ts` requires the local frozen app on5173; it performs GET only to known local URLs, extracts identities/markers, not financial values. Its HTTP200/SSR markers are not financial acceptance. `finalize.py` emits derived review registries/manifests; no application mutation.

`MANIFEST.json` uses canonical LF SHA256, excluding itself. Verify against committed Git blobs rather than a CRLF-converted Windows worktree. Initial localhost sandbox restrictions and authorized rerun are recorded separately.

No main merge, source qualification, real engine binding, production release or new user approval is represented by this package.
