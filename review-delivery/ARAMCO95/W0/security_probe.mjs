// W0-SEC: direct unauthenticated HTTP requests against a local QA server; no session, no cookies.
// Usage: node security_probe.mjs http://127.0.0.1:5199
// Start the server with the full QA environment (README in W0-SECURITY-REMEDIATION_AR.md), overlay path included,
// so the probe checks the worst case: every QA flag on and the overlay file readable by the server.
const base = (process.argv[2] ?? "http://127.0.0.1:5199").replace(/\/+$/, "");
const MARKERS = [
  "FQ01-OBS-011",
  "FQ01-OBS-014",
  "FQ01-OBS-016",
  "FQ01-OBS-060",
  "78bb678e8e45",
  "QA_PRIVATE",
  "reviewer_only",
  "data-qa-evidence",
  "evidence-overlay",
];
const pages = [
  ["overview", "/preview/web-v1/companies/2222/overview"],
  ["investor", "/preview/web-v1/companies/2222/intelligence"],
  ["data", "/preview/web-v1/companies/2222"],
  ["data_financials", "/preview/web-v1/companies/2222?tab=financials"],
];
const api = [
  ["evidence_no_auth", {}, 401],
  ["evidence_basic", { authorization: "Basic cmV2aWV3ZXI6eA==" }, 401],
  ["evidence_not_jwt", { authorization: "Bearer not-a-token" }, 401],
  ["evidence_forged_jwt", { authorization: "Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJyZXZpZXdlci0xIn0.x" }, 401],
];
let fail = 0;
const hits = (body) => MARKERS.filter((m) => body.includes(m));
for (const [name, path] of pages) {
  const res = await fetch(base + path, { redirect: "follow" });
  const body = await res.text();
  const h = hits(body);
  const pass = res.status === 200 && h.length === 0 && body.includes("2222");
  if (!pass) fail++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} ${path} -> ${res.status}, bytes ${body.length}, evidence markers ${JSON.stringify(h)}`);
}
for (const [name, headers, want] of api) {
  const res = await fetch(base + "/preview/qa/evidence/2222", { headers });
  const body = await res.text();
  const h = hits(body);
  const pass = res.status === want && h.length === 0 && res.headers.get("cache-control") === "no-store";
  if (!pass) fail++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} -> ${res.status} (want ${want}), body ${body.slice(0, 80)}, markers ${JSON.stringify(h)}`);
}
console.log(fail ? `FAILED ${fail}` : "ALL PASS");
process.exit(fail ? 1 : 0);
