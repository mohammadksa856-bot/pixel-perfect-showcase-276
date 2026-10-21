const base = "http://127.0.0.1:4480";
const paths = [
  "/sectors",
  "/sectors/energy",
  "/sectors/space",
  "/sectors/defense",
  "/sectors/technology",
  "/sectors/ai",
  "/sectors/healthcare",
  "/sectors/financials",
  "/sectors/industrials",
  "/sectors/consumer",
  "/sectors/real-estate",
  "/sectors/banks",
  "/sectors/insurance",
  "/sectors/no-such-sector-synthetic",
];
for (const path of paths) {
  const start = Date.now();
  const response = await fetch(base + path, { signal: AbortSignal.timeout(30000) });
  const html = await response.text();
  const expected = path.includes("no-such") ? 404 : 200;
  const valid =
    response.status === expected &&
    (expected === 404 || (html.includes("<h1") && !html.includes("This page didn")));
  console.log(
    JSON.stringify({ path, http: response.status, milliseconds: Date.now() - start, pass: valid }),
  );
  if (!valid) process.exitCode = 1;
}
const offline = await fetch("http://127.0.0.1:4482/sectors", {
  signal: AbortSignal.timeout(30000),
});
const html = await offline.text();
const unavailable =
  offline.status === 200 &&
  html.includes("قائمة القطاعات غير متاحة حاليًا") &&
  !html.includes("SYNTHETIC_SOURCE_UNAVAILABLE") &&
  !html.includes("Coming soon");
console.log(
  JSON.stringify({ mode: "synthetic-source-down", http: offline.status, pass: unavailable }),
);
if (!unavailable) process.exitCode = 1;
