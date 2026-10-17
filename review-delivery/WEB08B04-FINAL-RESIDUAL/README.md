# Reproduce final residual review
Tested implementation acd116ced883133fa826f1c3bed979e22ac7f1d2; delivery 894fad138ab47e57b63d054aa9c469c8efa6fe47.
Use LF checkout, existing pinned Bun dependencies, no environment/production credentials.
Set BUN to the local Bun executable and run:
```text
python review-delivery/WEB08B04-FINAL-RESIDUAL/run_review.py additional independent original15 b03-original15 residual-independent guard-probe b04 b03 b01 b02 app types b04-types lint check b03-check build
python review-delivery/WEB08B04-FINAL-RESIDUAL/finalize.py
```
Run tests at delivery SHA with this package copied under the same relative folder. Never overwrite application files. Original four test files are byte-exact Git blobs checked in INTEGRITY.json. New tests are synthetic; no source PDFs/database copies/private credentials included. Keep failures: P0–P7 are expected to expose the defect, not tests to mark skipped or weaken.
Results are separate runs at a fixed SHA, not combined across branches. The two original 15-case files share the same source blob.
MANIFEST hashes canonical LF bytes, excluding itself; verify against Git blobs when Windows autocrlf is enabled.

