# WEB-08B05 review tools

Helpers used to produce `../test-logs/` and `../screenshots/`. They need the private reader running
(`bun research-evidence/aramco-research-experience/server.ts`, 127.0.0.1:4466). The link check also needs
the app dev server on the frozen fixture (127.0.0.1:5173). The browser scripts use Playwright with the
pre-installed Chromium (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`); `a11y.mjs` needs
axe-core 4.10.2 (`AXE=/path/to/axe.min.js`).

| Tool | Output |
|---|---|
| `holds.ts` | `test-logs/holds.txt` |
| `reader-http.ts` | `test-logs/reader-http.txt` |
| `a11y.mjs <out.json> <sha>` | `test-logs/a11y.json` (axe in an audit-only context with bypassCSP) |
| `linkcheck.mjs <out.json> <sha>` | `test-logs/link-browser-check.json` |
| `capture.mjs <dir> <sha> <measure.txt>` | `screenshots/` and `test-logs/layout-measure.txt` |
