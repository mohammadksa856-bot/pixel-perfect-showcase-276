# WEB-08B01 delivery index

- Tested implementation: `cef8ce9f3b463fc75324960ed47c06ace261cff4`.
- Contract/specification: `research-evidence/v1/README_AR.md`, `contract.ts`, `adapter.ts`.
- Engineering result: `FINAL-REPORT_AR.md`, `FINAL-ENGINEERING-REPORT.json`.
- Separate-session decision: `independent-acceptance/ACCEPTANCE_cef8ce9.md` and per-run logs.
- Historical failures/fixes: `REVIEW-HISTORY.md` and three archived independent review folders.
- Central tracking commit: `a3152569c3a5cd40dadfac3f64ec4b6b8b465a07`; safe single-task receipt in `CENTRAL-TRACKING-RECEIPT.json`. Canonical board is unchanged in location; event chain verified to 97 records. Task remains REVIEW for human acceptance, with engineering-scoped ACCEPT recorded independently.
- `MANIFEST.json` pins 44 implementation and review evidence files with portable LF-normalized SHA256. This index and the central receipt were added after that manifest and are covered by `TRACKING-MANIFEST.json` instead.

No main merge, application activation, live data, financial approval, user final acceptance, production release, engine change or95% readiness claim.

Reproduce: checkout the tested code SHA, use an existing compatible Bun runtime and declared repository dependencies, then run `bun test research-evidence/v1`, `bun node_modules/typescript/bin/tsc -p research-evidence/v1/tsconfig.json --noEmit`, and `bun node_modules/eslint/bin/eslint.js research-evidence/v1`. External archived tests retain original import paths; repository copies adapt paths only plus formatting. For the synthetic server run `bun research-evidence/v1/poc.ts` on loopback4451 only; never deploy the fixtures. Archived logs contain original diagnostic whitespace intentionally.
