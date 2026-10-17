# Independent WEB08B04 re-review

Application49eeed82b84d9e071a49b91b1c959e4f13a7b82b; tested deliveryf46a2925376b59c7686ee4a23c3128506229792b; previous reviewfa3a772daabaaecb44ee2eff842bb88456025f62. Protected application code identical between implementation and delivery.

Decision REWORK for2residual guard findings only. Financial corrections FIN01-07 and LINK01 closed within an unapproved frozen research draft, not financial/editorial certification.

Run existing Bun with existing frozen dependencies:

```text
bun test ./review-delivery/WEB08B04-REREVIEW/adversarial.test.ts
bun test ./review-delivery/WEB08B04-REREVIEW/boundaries.test.ts
bun test ./review-delivery/WEB08B04-REREVIEW/b03-original.test.ts
bun test ./review-delivery/WEB08B04-REREVIEW/additional.test.ts
```

Original three files retained verbatim. New14cases:8PASS6FAIL; do not change assertions to obtain green. No PDFs, credentials or live engine needed. Original12tests nowPASS, unlike8FAIL at old review; remaining6failures come from NEWcases only.

`run_review.py` uses BUN env variable to capture separate SHA-labelled runs. `audit.ts` compares the existing prior reviewed worktree (siblingweb08b04-independent-20261017 atfa3a772), current pack and actual local frozen app5178/reader4460; no values extracted into a parallel financial store. `PARAGRAPH-REAUDIT.json` records text hashes rather than full research text.

Browser protocol for29metric links: navigate to emittedURL on local app5178; await visible `[data-intel-topic="expectedTopic"] [data-focused="true"]`; check exact `data-metric`/`data-row`/`data-fact` key and positive bounds. Check43NOT_RENDERED keys absent from all focus targets, null emitted links and no misleading reader focus links. UI-REVIEW records actual independent run, not author tests. Test fixture gate label is local process-only; real review branch remains distinct.

MANIFEST checks SHA256 of LF-normalized committed files, excludes itself. `finalize.py` assembles actual run metadata, original Git blob checks and delivery hashes. No deployment, production write, financial qualification or user-final acceptance.
