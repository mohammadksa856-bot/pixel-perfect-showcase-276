// W0-SEC: private browser test (fresh context, no session, no storage). Loads Overview, follows the in-app links to
// Investor and Data (client navigation, so the page data arrives over server-function RPC), and checks every response
// body and the final DOM for evidence markers.
// Usage: NODE_PATH=/opt/node-tools/node_modules node browser_probe.mjs http://127.0.0.1:5199
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const base = (process.argv[2] ?? "http://127.0.0.1:5199").replace(/\/+$/, "");
const MARKERS = ["FQ01-OBS-0", "78bb678e8e45", "QA_PRIVATE", "reviewer_only", "data-qa-evidence"];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const leaks = [];
let responses = 0;
page.on("response", async (r) => {
  try {
    const body = await r.text();
    responses++;
    for (const m of MARKERS) if (body.includes(m)) leaks.push(`${r.url()} contains ${m}`);
  } catch {}
});
let fail = 0;
const check = async (label) => {
  const html = await page.content();
  const dom = await page.locator("[data-qa-evidence]").count();
  const h = MARKERS.filter((m) => html.includes(m));
  const pass = dom === 0 && h.length === 0;
  if (!pass) fail++;
  console.log(`${pass ? "PASS" : "FAIL"} ${label} ${page.url().replace(base, "")} dom[data-qa-evidence]=${dom} markers=${JSON.stringify(h)}`);
};
await page.goto(base + "/preview/web-v1/companies/2222/overview", { waitUntil: "networkidle" });
await check("overview (SSR + hydrate)");
await page.locator('[data-company-levels] a[href*="/intelligence"]').first().click();
await page.waitForURL(/intelligence/);
await page.waitForLoadState("networkidle");
await check("investor (client nav)");
await page.locator('[data-company-levels] a[href$="/companies/2222"], [data-company-levels] a[href*="/companies/2222?"]').first().click();
await page.waitForURL((u) => /\/companies\/2222(\?|$)/.test(u.pathname + u.search));
await page.waitForLoadState("networkidle");
await check("data (client nav)");
const api = await page.evaluate(async () => (await fetch("/preview/qa/evidence/2222")).status);
console.log(`${api === 401 ? "PASS" : "FAIL"} evidence route from the page without a session -> ${api}`);
if (api !== 401) fail++;
console.log(`${leaks.length ? "FAIL" : "PASS"} ${responses} network responses, leaks ${JSON.stringify(leaks.slice(0, 5))}`);
if (leaks.length) fail++;
await browser.close();
console.log(fail ? `FAILED ${fail}` : "ALL PASS");
process.exit(fail ? 1 : 0);
