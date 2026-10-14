// WEB-05B final fixes: Preview boundary + mobile width audit (Playwright). Writes a JSON report and screenshots.
// For every Preview page (desktop ar/en and 390px ar/en):
//  - every internal <a href> must stay under /preview/web-v1 (external source documents are listed separately);
//  - no request to Supabase at all, and no write method (POST/PATCH/PUT/DELETE) to any data endpoint;
//  - document.scrollWidth <= the configured viewport width (no page-level horizontal scroll). Not innerWidth:
//    mobile emulation widens innerWidth to the content, which hides the overflow.
// Usage: BASE=http://127.0.0.1:5173 OUT=dir node product-tracking/tools/web_05b_boundary_audit.mjs
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://127.0.0.1:5173";
const OUT = process.env.OUT ?? "audit";
const SHOTS = process.env.SHOTS !== "0";
mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const hp = process.env.HTTPS_PROXY ? new URL(process.env.HTTPS_PROXY) : null;
const browser = await chromium.launch({
  executablePath: exe,
  env: { ...process.env, HTTP_PROXY: "", HTTPS_PROXY: "", http_proxy: "", https_proxy: "" },
  args: hp ? [`--proxy-server=https=${hp.host}`] : [],
});

const PAGES = [
  "/preview/web-v1",
  "/preview/web-v1/companies",
  "/preview/web-v1/search?q=1120",
  "/preview/web-v1/markets",
  "/preview/web-v1/markets/saudi",
  "/preview/web-v1/markets/saudi/main",
  "/preview/web-v1/markets/saudi/nomu",
  "/preview/web-v1/sectors",
  "/preview/web-v1/sectors/financials",
  "/preview/web-v1/sectors/unclassified",
  "/preview/web-v1/companies/1120?tab=business",
  "/preview/web-v1/companies/2222?tab=financials",
  "/preview/web-v1/companies/8010?tab=coverage",
  "/preview/web-v1/research",
  "/preview/web-v1/knowledge",
];
const VIEWS = [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
];
const WRITE = new Set(["POST", "PATCH", "PUT", "DELETE"]);

const report = { base: BASE, at: new Date().toISOString(), pages: [] };
for (const [view, viewport] of VIEWS)
  for (const locale of ["ar", "en"])
    for (const path of PAGES) {
      const ctx = await browser.newContext({
        viewport,
        isMobile: view === "mobile",
        hasTouch: view === "mobile",
      });
      await ctx.addInitScript((l) => localStorage.setItem("mi.locale", l), locale);
      const page = await ctx.newPage();
      const supabase = [];
      const writes = [];
      page.on("request", (r) => {
        const u = new URL(r.url());
        if (
          /supabase/.test(u.host) ||
          u.pathname.startsWith("/rest/v1") ||
          u.pathname.startsWith("/auth/v1")
        )
          supabase.push(`${r.method()} ${u.host}${u.pathname}`);
        // Server functions are GET in this app; any other write method to a non-asset URL is reported.
        if (
          WRITE.has(r.method()) &&
          !u.pathname.startsWith("/@") &&
          !u.pathname.includes("/node_modules/")
        )
          writes.push(`${r.method()} ${u.pathname}`);
      });
      await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 90000 });
      await page.waitForTimeout(400);
      const data = await page.evaluate(() => {
        const links = [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
        const internal = links.filter((h) => h.startsWith("/"));
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          deviceWidth: 0,
          leaving: [...new Set(internal.filter((h) => !h.startsWith("/preview/web-v1")))],
          external: [
            ...new Set(links.filter((h) => /^https?:/.test(h)).map((h) => new URL(h).host)),
          ],
          forms: [...document.querySelectorAll("form")].map((f) => ({
            action: f.getAttribute("action"),
            disabled: [...f.querySelectorAll("input,button")].every((x) => x.disabled),
            id: f.getAttribute("data-preview-form") ?? null,
          })),
          banner: Boolean(document.querySelector("[data-preview-banner]")),
        };
      });
      data.deviceWidth = viewport.width;
      const entry = { path, view, locale, ...data, supabase: [...new Set(supabase)], writes };
      report.pages.push(entry);
      const flag =
        (data.leaving.length ? ` LEAVES:${data.leaving.join(",")}` : "") +
        (data.scrollWidth > data.deviceWidth + 1 ? ` OVERFLOW:${data.scrollWidth}` : "") +
        (supabase.length ? ` SUPABASE:${supabase.length}` : "") +
        (writes.length ? ` WRITES:${writes.join(",")}` : "");
      console.log(`${view} ${locale} ${path}${flag || " ok"}`);
      if (SHOTS && view === "mobile" && path === "/preview/web-v1/markets/saudi")
        await page.screenshot({ path: `${OUT}/saudi-market.mobile.${locale}.png`, fullPage: true });
      await ctx.close();
    }
await browser.close();
const bad = report.pages.filter(
  (p) =>
    p.leaving.length || p.scrollWidth > p.deviceWidth + 1 || p.supabase.length || p.writes.length,
);
report.summary = {
  checked: report.pages.length,
  failing: bad.length,
  leaving: [...new Set(report.pages.flatMap((p) => p.leaving))].sort(),
  overflow: bad
    .filter((p) => p.scrollWidth > p.deviceWidth + 1)
    .map((p) => `${p.view} ${p.locale} ${p.path} ${p.scrollWidth}`),
  supabaseRequests: report.pages.reduce((n, p) => n + p.supabase.length, 0),
  writeRequests: report.pages.reduce((n, p) => n + p.writes.length, 0),
};
writeFileSync(`${OUT}/boundary-audit.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
process.exit(bad.length ? 1 : 0);
