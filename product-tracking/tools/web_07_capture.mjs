// WEB-07 screenshots: the three company levels for 2222 (+ deep-link landing, not-built state), desktop 1440
// and mobile 390, Arabic and English. Frozen design preview. Writes <out>/<view>/<id>.<locale>.jpg and
// <out>/IMAGE_MANIFEST.json (sha256, app SHA, route, locale, viewport, captured_at, data_mode).
// Usage: BASE=http://127.0.0.1:5173 APP_SHA=<sha> node web_07_capture.mjs <outDir>
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const OUT = process.argv[2];
const BASE = process.env.BASE ?? "http://127.0.0.1:5173";
const APP_SHA = process.env.APP_SHA ?? "unknown";
const C = "/preview/web-v1/companies";
const VIEWS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
// [id, route, full page?, settle-on-focus?]
const SHOTS = [
  ["01-overview", `${C}/2222/overview`, true],
  ["02-intelligence-top", `${C}/2222/intelligence`, false],
  [
    "03-intelligence-search",
    `${C}/2222/intelligence?q=%D8%A7%D9%84%D8%AA%D9%88%D8%B2%D9%8A%D8%B9%D8%A7%D8%AA`,
    false,
  ],
  [
    "04-deeplink-total-assets",
    `${C}/2222/intelligence?topic=financials&focus=total_assets`,
    false,
    true,
  ],
  [
    "05-deeplink-lifting-cost",
    `${C}/2222/intelligence?topic=operations&focus=lifting_cost_per_boe`,
    false,
    true,
  ],
  ["06-marefa-data-business", `${C}/2222?tab=business`, false],
  ["07-marefa-data-coverage", `${C}/2222?tab=coverage`, false],
  ["08-other-company-not-built", `${C}/1120/overview`, false],
];
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  env: { ...process.env, HTTP_PROXY: "", HTTPS_PROXY: "", http_proxy: "", https_proxy: "" },
});
const images = [];
for (const [id, route, full, focus] of SHOTS)
  for (const view of ["desktop", "mobile"])
    for (const locale of ["ar", "en"]) {
      const m = view === "mobile";
      const ctx = await browser.newContext({
        viewport: VIEWS[view],
        isMobile: m,
        hasTouch: m,
        deviceScaleFactor: 1,
      });
      await ctx.addInitScript((l) => localStorage.setItem("mi.locale", l), locale);
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      const r = await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 90000 });
      await page.evaluate(() => document.fonts.ready);
      if (focus) {
        await page.waitForSelector("[data-focused=true]", { timeout: 20000 });
        let last = -1;
        for (let i = 0; i < 40; i++) {
          const y = await page.evaluate(() => scrollY);
          if (y === last) break;
          last = y;
          await page.waitForTimeout(150);
        }
      } else await page.waitForTimeout(600);
      if (m && full)
        await page.addStyleTag({
          content: "[data-mobile-tabbar]{position:absolute!important;bottom:0!important}",
        });
      mkdirSync(`${OUT}/${view}`, { recursive: true });
      const file = `${OUT}/${view}/${id}.${locale}.jpg`;
      await page.screenshot({ path: file, fullPage: !!full, type: "jpeg", quality: 82 });
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      images.push({
        path: file.slice(OUT.length + 1),
        sha256: createHash("sha256").update(readFileSync(file)).digest("hex"),
        application_sha: APP_SHA,
        route,
        locale,
        viewport: `${view} ${VIEWS[view].width}px`,
        full_page: !!full,
        captured_at: new Date().toISOString(),
        http: r.status(),
        page_scroll_width: sw,
        page_errors: errors.length,
        data_mode: "FROZEN_DESIGN",
      });
      console.log(
        view,
        locale,
        id,
        `http=${r.status()}`,
        `sw=${sw}/${VIEWS[view].width}`,
        errors.length ? "ERR" : "ok",
      );
      await ctx.close();
    }
writeFileSync(
  `${OUT}/IMAGE_MANIFEST.json`,
  JSON.stringify(
    {
      batch: "WEB-07 company experience (2222)",
      application_sha: APP_SHA,
      data_mode: "FROZEN_DESIGN",
      images,
    },
    null,
    1,
  ),
);
await browser.close();
