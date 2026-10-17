# Structural final independent review
Decision REWORK, RR-ENG03-01 only. Application8e896378a763f7cb5632ec5bb2963e5313664301; tested deliveryc737e9bf76ebe55c0c8bbff15ce87732b987e449.
Use isolated LF checkout at the delivery; copy this package under this relative folder, pinned Bun dependencies, no production environment or credentials.
```text
python review-delivery/WEB08B04-STRUCTURAL-FINAL/run_review.py final-independent residual-independent additional independent original15 b03-original15 edge-probe guard-probe structural-independent mask-probe b04 b03 b01 b02 app types b04-types lint check b03-check build
bun ./review-delivery/WEB08B04-STRUCTURAL-FINAL/holds.ts
pwsh -NoProfile -File ./review-delivery/WEB08B04-STRUCTURAL-FINAL/compare_iso.ps1
python review-delivery/WEB08B04-STRUCTURAL-FINAL/finalize.py
```
Set BUN to the local executable before running the Python runner.
Do not weaken or skip the19failing structural cases. The original eight test/probe files are byte-exact against0fe3312 Git blobs, verified in INTEGRITY.json. Two15case files share the same source blob.
mask-probe constructs actual Unicode controls, prints escaped input descriptions, raw-digit/raw-Cf flags, analyseNumbers output and compile acceptance. No restricted source payload is printed.
compare_iso fetches official SIX XML into memory and emits full-set differences only; no original XML is saved. Network unavailability throws rather than claiming equality. ISO-SET-COMPARISON.json records the observed comparison date and source hash.
Manifest hashes canonical LF Git blobs, excluding itself. No restricted PDFs, source XML, private databases or credentials uploaded. Publication and financial/editorial/live/user-final gates remain blocked.
