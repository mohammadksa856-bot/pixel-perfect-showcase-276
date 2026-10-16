# Preserved review history

This delivery keeps separate review decisions and SHAs; later passes do not rewrite earlier failures.

| SHA | Independent decision at that SHA | Newly exposed failing cases | Follow-up |
| --- | --- | --- | --- |
| 4f38e55 | REWORK | 7 of 19: supersession (4), review chronology (2), multiple source locators (1) | 4570432 |
| 4570432 | REWORK | 3 of 12 additional: unbound source-locator proof receipt omitted from approval basis/time checks | f045964 |
| f045964 | REWORK | 1 of 19 further cases: locale collation ties distinct Unicode reference identities | cef8ce9 |

The original external tests remain in their archived folders with original import paths. Executable repository copies adapt imports and formatting only; the independent session reruns its own unchanged originals. Counts overlap and must not be added as unique tests. Archived text is imported with normalized line endings, not claimed byte-identical to the originating Windows files. Any original preservation manifest applies to the original review workspace, not these normalized copies.

`author-final-contract-tests.log` (72) and `author-final-web07-regression.log` (95) are runs on f045964, despite their historical names. `author-cef8ce9-*` are the later runs on cef8ce9. Earlier ENGINEERING-REPORT.json remains an immutable initial author report with pending-review status at that time; the final review report supersedes its current-status interpretation, not its history.

Only code, synthetic fixtures, text reports and test logs are included. No original financial documents, private Git history, environmental secrets, live data or production approvals are included.
