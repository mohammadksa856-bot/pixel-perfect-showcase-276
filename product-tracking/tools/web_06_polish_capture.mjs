// WEB-06 Visual Polish: before/after captures of the AFFECTED PARTS only (not the full 112-image pack),
// plus a short visual path through the new version.
//   BEFORE=http://127.0.0.1:5177  frozen design preview served from a worktree at c3bfd2f
//   AFTER=http://127.0.0.1:5173   frozen design preview served from the polish code commit
// Both: MAREFA_DESIGN_FIXTURES=true, VERCEL_ENV=preview, allowlisted branch ref, no Supabase, no engine.
// Usage: node web_06_polish_capture.mjs <outDir>  → <outDir>/{before,after,path}/<view>/<id>.<locale>.jpg + captures.json
// For element captures the sticky header/mobile tab bar are made static so they do not cover the part.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = process.argv[2];
const BEFORE = process.env.BEFORE ?? "http://127.0.0.1:5177";
const AFTER = process.env.AFTER ?? "http://127.0.0.1:5173";
const P = "/preview/web-v1";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  env: { ...process.env, HTTP_PROXY: "", HTTPS_PROXY: "", http_proxy: "", https_proxy: "" },
});
const VIEWS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
// [id, decisions, path, selector | null (full page), clicks?]
const PARTS = [
  ["d1-identity-card", "D1 D5", `${P}/companies/2222?tab=business`, "#topic-1"],
  ["d2-corporate-actions", "D2", `${P}/companies/2222?tab=shareholders`, "#topic-9"],
  ["d3-page-notice-topics", "D3", `${P}/companies/1120?tab=business`, "[data-group]"],
  ["d4-company-table", "D4 D5", `${P}/markets/saudi/main`, "[data-company-table]", ["[data-table-legend] > summary"]],
  ["d5-sectors-index", "D5", `${P}/sectors`, "main"],
  ["d6-statements", "D6", `${P}/companies/2222?tab=financials`, "#topic-5"],
  ["d7-factory-panel", "D7", `${P}/companies/2222?tab=coverage`, "[data-factory-panel]"],
  ["d8-home", "D8 D11", `${P}`, null],
  ["d9-company-hero-crumbs", "D9 D5", `${P}/companies/2222?tab=business`, "[data-company-hero]"],
  ["d10-header", "D10", `${P}/markets`, "header"],
  ["d10-footer", "D10", `${P}/markets`, "footer"],
  ["d12-search", "D12", `${P}/search?q=1120`, "main"],
];
// short path through the new version (viewport captures, after only)
const PATH = [
  ["p1-home", `${P}`],
  ["p2-search", `${P}/search?q=%D8%A7%D9%84%D8%A8%D9%86%D9%88%D9%83`],
  ["p3-sector", `${P}/sectors/financials`],
  ["p4-company", `${P}/companies/1120?tab=business`],
  ["p5-financials", `${P}/companies/1120?tab=financials`],
  ["p6-coverage", `${P}/companies/1120?tab=coverage`],
];
const RUNS = [
  ["before", BEFORE, ["ar"]],
  ["after", AFTER, ["ar", "en"]],
];
const log = [];
async function shoot(kind, base, view, locale, id, path, sel, clicks = []) {
  const m = view === "mobile";
  const ctx = await browser.newContext({ viewport: VIEWS[view], isMobile: m, hasTouch: m, deviceScaleFactor: 1 });
  await ctx.addInitScript((l) => localStorage.setItem("mi.locale", l), locale);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const r = await page.goto(base + path, { waitUntil: "networkidle", timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  for (const c of clicks) {
    const l = page.locator(c).first();
    if (await l.count()) await l.click();
  }
  await page.waitForTimeout(500);
  const dir = `${OUT}/${kind}/${view}`;
  mkdirSync(dir, { recursive: true });
  const file = `${dir}/${id}.${locale}.jpg`;
  let found = true;
  if (kind === "path") {
    await page.screenshot({ path: file, type: "jpeg", quality: 82 });
  } else {
    await page.addStyleTag({
      content: "header{position:static!important}[data-mobile-tabbar]{display:none!important}",
    });
    if (sel === null) await page.screenshot({ path: file, fullPage: true, type: "jpeg", quality: 80 });
    else if (await page.locator(sel).count())
      await page.locator(sel).first().screenshot({ path: file, type: "jpeg", quality: 82 });
    else found = false;
  }
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  const rec = {
    kind, id, view, locale, route: path, base, http: r.status(), selector: sel ?? null,
    captured_at: new Date().toISOString(), scrollWidth: sw, deviceWidth: VIEWS[view].width,
    file: found ? file.slice(OUT.length + 1) : null, pageErrors: errors.length,
  };
  log.push(rec);
  console.log([kind, view, locale, id, `http=${r.status()}`, `sw=${sw}/${VIEWS[view].width}`, found ? "ok" : "PART-NOT-FOUND", errors.length ? "ERR" : ""].join(" "));
  await ctx.close();
}
for (const [kind, base, locales] of RUNS)
  for (const [id, , path, sel, clicks] of PARTS)
    for (const view of ["desktop", "mobile"])
      for (const locale of locales) await shoot(kind, base, view, locale, id, path, sel, clicks);
for (const [id, path] of PATH)
  for (const view of ["desktop", "mobile"])
    for (const locale of ["ar", "en"]) await shoot("path", AFTER, view, locale, id, path, null);
writeFileSync(`${OUT}/captures.json`, JSON.stringify({ parts: PARTS.map(([id, d, path, sel]) => ({ id, decisions: d, path, sel })), shots: log }, null, 2));
await browser.close();
