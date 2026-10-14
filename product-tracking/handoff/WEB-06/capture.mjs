// WEB-06 visual handoff: capture the implemented Preview pages from the application itself.
// App under capture: c3bfd2f (unchanged). Two servers, two data modes, kept in separate folders:
//   FROZEN=http://127.0.0.1:5173  frozen design preview (same policy as the Vercel Preview: frozen engine samples,
//                                 no Supabase; research/knowledge show "unavailable")
//   LOCAL=http://127.0.0.1:5175   local only: research/knowledge reader on SYNTHETIC test content served by
//                                 product-tracking/tools/web_05c_mock_supabase.mjs (never published anywhere)
// Usage: node capture.mjs <outDir>   (writes <outDir>/frozen/... and <outDir>/local-synthetic/...)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = process.argv[2];
const FROZEN = process.env.FROZEN ?? "http://127.0.0.1:5173";
const LOCAL = process.env.LOCAL ?? "http://127.0.0.1:5175";
const exe = process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const hp = process.env.HTTPS_PROXY ? new URL(process.env.HTTPS_PROXY) : null;
const browser = await chromium.launch({
  executablePath: exe,
  env: { ...process.env, HTTP_PROXY: "", HTTPS_PROXY: "", http_proxy: "", https_proxy: "" },
  args: hp ? [`--proxy-server=https=${hp.host}`] : [],
});

const P = "/preview/web-v1";
// [id, mode, path, options]
const SHOTS = [
  ["01-home", "frozen", `${P}`],
  ["02-search-dialog", "frozen", `${P}`, { type: { ar: "الراجحي", en: "Rajhi" }, full: false }],
  ["03-search-results", "frozen", `${P}/search?q=1120`],
  ["04-company-directory", "frozen", `${P}/companies`],
  ["05-company-2222-business", "frozen", `${P}/companies/2222?tab=business`],
  ["06-company-2222-financials", "frozen", `${P}/companies/2222?tab=financials`],
  ["07-company-1120-financials", "frozen", `${P}/companies/1120?tab=financials`],
  ["08-company-8010-financials", "frozen", `${P}/companies/8010?tab=financials`],
  ["09-company-2222-shareholders", "frozen", `${P}/companies/2222?tab=shareholders`],
  ["10-company-2222-market", "frozen", `${P}/companies/2222?tab=market`],
  ["11-company-2222-risks", "frozen", `${P}/companies/2222?tab=risks`],
  ["12-company-2222-coverage-factory", "frozen", `${P}/companies/2222?tab=coverage`],
  ["13-company-1120-coverage-factory", "frozen", `${P}/companies/1120?tab=coverage`],
  ["14-markets", "frozen", `${P}/markets`],
  ["15-market-saudi", "frozen", `${P}/markets/saudi`],
  ["16-market-saudi-main", "frozen", `${P}/markets/saudi/main`],
  ["17-market-saudi-nomu", "frozen", `${P}/markets/saudi/nomu`],
  ["18-sectors", "frozen", `${P}/sectors`],
  ["19-sector-financials", "frozen", `${P}/sectors/financials`],
  ["20-sector-unclassified", "frozen", `${P}/sectors/unclassified`, { full: false }],
  ["21-research-unavailable", "frozen", `${P}/research`],
  ["22-knowledge-unavailable", "frozen", `${P}/knowledge`],
  ["23-design-system", "frozen", `${P}/design-system`],
  ["31-research-index", "local-synthetic", `${P}/research`],
  ["32-research-reader", "local-synthetic", `${P}/research/synthetic-research-1`],
  ["33-research-reader-table-date-states", "local-synthetic", `${P}/research/synthetic-research-4`],
  ["34-knowledge-index", "local-synthetic", `${P}/knowledge`],
  ["35-knowledge-topic", "local-synthetic", `${P}/knowledge/synthetic-topic-1`],
];
const VIEWS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

for (const [id, mode, path, o = {}] of SHOTS)
  for (const view of ["desktop", "mobile"])
    for (const locale of ["ar", "en"]) {
      const m = view === "mobile";
      const ctx = await browser.newContext({ viewport: VIEWS[view], isMobile: m, hasTouch: m, deviceScaleFactor: 1 });
      await ctx.addInitScript((l) => localStorage.setItem("mi.locale", l), locale);
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      const base = mode === "frozen" ? FROZEN : LOCAL;
      const r = await page.goto(base + path, { waitUntil: "networkidle", timeout: 90000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(600);
      if (o.type) {
        if (m) await page.locator("[data-mobile-tabbar] button").first().click();
        else await page.keyboard.press("Control+k");
        await page.waitForTimeout(300);
        await page.keyboard.type(o.type[locale]);
        await page.waitForTimeout(1500);
      }
      const full = o.full !== false;
      if (m && full)
        await page.addStyleTag({ content: "[data-mobile-tabbar]{position:absolute!important;bottom:0!important}" });
      const dir = `${OUT}/${mode}/${view}`;
      mkdirSync(dir, { recursive: true });
      const file = `${dir}/${id}.${locale}.jpg`;
      await page.screenshot({ path: file, fullPage: full, type: "jpeg", quality: 82 });
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      console.log(
        [mode, view, locale, id, `http=${r.status()}`, `scrollWidth=${sw}/${VIEWS[view].width}`, errors.length ? `ERRORS=${errors.length}` : "ok"].join(" "),
      );
      await ctx.close();
    }
await browser.close();
