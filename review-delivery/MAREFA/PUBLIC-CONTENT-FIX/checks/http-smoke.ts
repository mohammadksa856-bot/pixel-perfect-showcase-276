// Read-only loopback checks. No Supabase writes, refresh jobs or stored payloads.
const base = process.argv[2] || "http://127.0.0.1:4460";
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) throw new Error("Loopback only");
const sourceDown = process.argv.includes("--source-down");
const paths = sourceDown
  ? ["/companies/saudi-aramco"]
  : [
      "/",
      "/companies/saudi-aramco",
      "/companies",
      "/sectors/energy",
      "/markets/sp500",
      "/markets/saudi",
      "/markets/us",
      "/contact",
      "/research",
    ];
const results = [];
for (const path of paths) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(30000) });
  const html = await response.text();
  const checks: Record<string, boolean> = { status: response.status === (sourceDown ? 500 : 200) };
  if (sourceDown) {
    checks.unavailable = html.includes("بيانات الشركة غير متاحة");
    checks.noCompanyQuote = !html.includes("السعر المحفوظ");
    checks.noTargetPanel = !html.includes("متوسط السعر المستهدف");
  } else {
    checks.noFakeRefresh = !html.includes("آخر تحديث قبل دقيقتين");
    checks.noMarketFixture = !html.includes("6,420.15");
    if (path.includes("/companies/")) {
      checks.quoteLabelled = html.includes("السعر المحفوظ");
      checks.localStatus = html.includes('data-content-status="unverified"');
      checks.noConsensus = !html.includes("متوسط السعر المستهدف");
      checks.noDemoSeries = !html.includes("recharts-surface");
      checks.noChange = !html.includes("+0.9%");
    }
    if (path === "/contact") checks.noFakeEmail = !html.includes("marifa-istithmar.example");
    if (path.includes("/sectors/")) checks.noCadence = !html.includes("بشكل أسبوعي");
    if (path === "/markets/sp500") checks.unavailable = html.includes("بيانات السوق غير متاحة");
  }
  results.push({
    path,
    httpStatus: response.status,
    checks,
    pass: Object.values(checks).every(Boolean),
  });
}
console.log(
  JSON.stringify(
    {
      mode: sourceDown ? "source-down" : "normal",
      results,
      passed: results.filter((r) => r.pass).length,
      total: results.length,
    },
    null,
    2,
  ),
);
if (results.some((r) => !r.pass)) process.exitCode = 1;
