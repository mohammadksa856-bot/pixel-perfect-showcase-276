# B05-R01 native Windows independent acceptance

Application: a722af40dd9ee6f79588a5f21029ceb2755e9acb.
Tested delivery: b9056a3faf8402ce5ffbdd22b2c5f4586cb6fa81.
Read INDEPENDENT-REVIEW_AR.md and RESULTS.json. Scope: local withheld reader engineering only; no financial/editorial/rights/publication/merge/user-final approval.

Windows reproduction with a trusted installed Bun runtime:

```text
bun install --frozen-lockfile
bun research-evidence/aramco-research-experience/server.ts
# In another terminal: request http://127.0.0.1:4466/?lang=ar and ?lang=en; stop only your own server.
bun test research-evidence/aramco-research-experience
bun run build
bun research-evidence/aramco-research-experience/public-leak-scan.ts
bun test ./review-delivery/WEB08B05-R01-INDEPENDENT/independent.test.ts
bun review-delivery/WEB08B05-R01-INDEPENDENT/native_proof.ts
```

No shim or temporary author-source change is used by these commands. native_server_probe.py starts the actual author CLI, makes18loopback observations and terminates only that process. scope_audit.py audits native route reads and Git scope. run_review.py records each separate fixed-SHA run; its Bun path must refer to your trusted installed runtime. finalize.py verifies actual logs, original independent test bytes, and generates LF manifests. No private HTML, PDFs, screenshots, financial-value copies or secrets are included.

Previously recorded browser visual observations are preserved by byte-identical UI code and independently verified AR/EN/CSS hashes; no new full visual cycle was claimed. App14liveSKIP remains SKIP, notPASS.
