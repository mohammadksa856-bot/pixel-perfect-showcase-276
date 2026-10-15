// WEB-06 D11 fix: computed contrast of the company group tabs (active, inactive, hover), focus-visible,
// keyboard activation, page overflow, and a tab-bar-only capture. Frozen design preview.
// Usage: BASE=http://127.0.0.1:5173 LABEL=after APP_SHA=<sha> node web_06_d11_tabs.mjs <outDir>
// Colours: resolved through a canvas (oklch/alpha safe) and composited over every ancestor background
// colour. backdrop-blur is not modelled (it can only blend the same dark page background behind the bar).
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const OUT = process.argv[2];
const BASE = process.env.BASE ?? "http://127.0.0.1:5173";
const LABEL = process.env.LABEL ?? "after";
const APP_SHA = process.env.APP_SHA ?? "unknown";
const PATH = "/preview/web-v1/companies/2222?tab=business";
const VIEWS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  env: { ...process.env, HTTP_PROXY: "", HTTPS_PROXY: "", http_proxy: "", https_proxy: "" },
});

const measure = (page, sel) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const cv = document.createElement("canvas");
    cv.width = cv.height = 1;
    const cx = cv.getContext("2d", { willReadFrequently: true });
    const rgba = (c) => {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = "#000";
      cx.fillStyle = c;
      cx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };
    const over = (t, b) => t.map((v, i) => (i < 3 ? v * t[3] + b[i] * (1 - t[3]) : 1));
    const lum = ([r, g, b]) => {
      const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const chain = [];
    let opacity = 1;
    for (let a = el; a; a = a.parentElement) {
      const s = getComputedStyle(a);
      opacity *= Number(s.opacity);
      chain.push(rgba(s.backgroundColor));
    }
    let bg = [255, 255, 255, 1];
    for (const c of chain.reverse()) if (c[3] > 0) bg = over(c, bg);
    const cs = getComputedStyle(el);
    const f0 = rgba(cs.color);
    const fg = over([f0[0], f0[1], f0[2], f0[3] * opacity], bg);
    const L1 = lum(fg),
      L2 = lum(bg);
    const hex = (c) =>
      "#" +
      c
        .slice(0, 3)
        .map((v) => Math.round(v).toString(16).padStart(2, "0"))
        .join("");
    return {
      text: el.textContent.trim().slice(0, 30),
      color_css: cs.color,
      background_css: cs.backgroundColor,
      boxShadow: cs.boxShadow,
      foreground: hex(fg),
      background: hex(bg),
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      ratio: Math.round(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)) * 1000) / 1000,
    };
  }, sel);

const results = [];
for (const view of ["desktop", "mobile"])
  for (const locale of ["ar", "en"]) {
    const m = view === "mobile";
    const ctx = await browser.newContext({
      viewport: VIEWS[view],
      isMobile: m,
      hasTouch: m,
      deviceScaleFactor: 2,
    });
    await ctx.addInitScript((l) => localStorage.setItem("mi.locale", l), locale);
    const page = await ctx.newPage();
    await page.goto(BASE + PATH, { waitUntil: "networkidle", timeout: 90000 });
    await page.evaluate(() => document.fonts.ready);
    const active = await measure(page, "[data-company-tabs] a[data-active]");
    const inactiveSels = await page.$$eval("[data-company-tabs] a:not([data-active])", (as) =>
      as.map((a) => a.dataset.tab),
    );
    const inactive = [];
    for (const k of inactiveSels)
      inactive.push(await measure(page, `[data-company-tabs] a[data-tab="${k}"]`));
    let hover = null;
    if (!m) {
      await page.hover('[data-company-tabs] a[data-tab="financials"]');
      await page.waitForTimeout(250);
      hover = await measure(page, '[data-company-tabs] a[data-tab="financials"]');
      await page.mouse.move(0, 0);
      await page.waitForTimeout(400); // let the hover transition finish before the capture
    }
    const dir = `${OUT}/${LABEL}/${view}`;
    mkdirSync(dir, { recursive: true });
    const file = `${dir}/company-tabs.${locale}.png`;
    await page.locator("[data-company-tabs]").screenshot({ path: file });
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const tabsOverflowInside = await page.$eval(
      "[data-company-tabs]",
      (n) => n.scrollWidth > n.clientWidth,
    );
    // keyboard: Tab to a non-active group tab, check visible focus, Enter navigates to it
    let keyboard = null;
    if (!m) {
      let reached = false;
      for (let i = 0; i < 80 && !reached; i++) {
        await page.keyboard.press("Tab");
        reached = await page.evaluate(() =>
          document.activeElement?.matches('[data-company-tabs] a[data-tab="financials"]'),
        );
      }
      const focus = await page.evaluate(() => {
        const s = getComputedStyle(document.activeElement);
        return {
          outlineStyle: s.outlineStyle,
          outlineWidth: s.outlineWidth,
          outlineColor: s.outlineColor,
        };
      });
      await page.keyboard.press("Enter");
      await page.waitForURL(/tab=financials/, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(400);
      const nowActive = await page.$eval("[data-company-tabs] a[data-active]", (a) => [
        a.dataset.tab,
        a.getAttribute("aria-current"),
      ]);
      keyboard = {
        reached,
        focus,
        focusVisible: focus.outlineStyle !== "none" && parseFloat(focus.outlineWidth) > 0,
        activeAfterEnter: nowActive[0],
        ariaCurrent: nowActive[1],
      };
    }
    const sha256 = createHash("sha256").update(readFileSync(file)).digest("hex");
    results.push({
      label: LABEL,
      application_sha: APP_SHA,
      route: PATH,
      locale,
      viewport: `${view} ${VIEWS[view].width}px`,
      data_mode: "FROZEN_DESIGN",
      captured_at: new Date().toISOString(),
      image: { path: file.slice(OUT.length + 1), sha256 },
      active,
      inactiveMinRatio: Math.min(...inactive.map((x) => x.ratio)),
      inactive,
      hover,
      keyboard,
      pageScrollWidth: sw,
      deviceWidth: VIEWS[view].width,
      tabsScrollInsideBar: tabsOverflowInside,
    });
    await ctx.close();
  }
await browser.close();
writeFileSync(`${OUT}/tabs-${LABEL}.json`, JSON.stringify(results, null, 2));
for (const r of results)
  console.log(
    r.label,
    r.viewport,
    r.locale,
    "active",
    r.active.ratio,
    r.active.foreground,
    "on",
    r.active.background,
    r.active.fontSize,
    r.active.fontWeight,
    "| inactive min",
    r.inactiveMinRatio,
    "| hover",
    r.hover?.ratio ?? "-",
    "| kb",
    r.keyboard
      ? `${r.keyboard.reached}/${r.keyboard.focusVisible}/${r.keyboard.activeAfterEnter}/${r.keyboard.ariaCurrent}`
      : "-",
    "| sw",
    `${r.pageScrollWidth}/${r.deviceWidth}`,
  );
