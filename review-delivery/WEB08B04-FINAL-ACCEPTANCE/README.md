# Reproduce independent final review
Decision: REWORK, RR-ENG03-01 only. Directory name reflects the requested acceptance review, not an ACCEPT decision.
Application91fc3eea7528837ca37edbfe6dbe57fdb3a260e7, delivery31aa6c68a9368b44bee629e208eb50e58613d41e.
Use an isolated LF checkout at the delivery, pinned Bun dependencies, no production environment or credentials.
Copy this directory at the same relative path and set BUN to the local Bun executable.
```text
python review-delivery/WEB08B04-FINAL-ACCEPTANCE/run_review.py residual-independent additional independent original15 b03-original15 guard-probe final-independent edge-probe b04 b03 b01 b02 app types b04-types lint check b03-check build
bun ./review-delivery/WEB08B04-FINAL-ACCEPTANCE/holds.ts
python review-delivery/WEB08B04-FINAL-ACCEPTANCE/finalize.py
```
Do not weaken or skip failing cases. final-independent should expose19failures on this SHA.
All six original files match Git blobs in INTEGRITY.json. Two original15case suites share one source blob, not30unique cases.
edge-probe prints only synthetic inputs, lexical tokens, acceptance and error; no financial source payload.
The seven-character observation documents the local limit; it is not counted as proof of safety outside that limit.
Manifest hashes canonical LF Git blobs and excludes itself. No restricted PDFs, private database, environment files, source permissions or financial certification included.
