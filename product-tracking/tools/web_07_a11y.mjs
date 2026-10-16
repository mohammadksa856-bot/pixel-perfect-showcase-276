// WEB-07: WCAG contrast of the new company-experience parts (levels nav, Overview, Intelligence nav).
// Keyboard checks for WEB-07 are in web_07_e2e.mjs. Based on web_06_a11y.mjs (same method).
// Usage: BASE=http://127.0.0.1:5173 node web_07_a11y.mjs > out.json
// Contrast: WCAG 2.1 relative-luminance ratio of each visible text node's colour against the composited
// solid background colours of its ancestors (alpha and opacity applied; colours resolved through a canvas,
// so oklch/color-mix are handled). Background images/gradients are NOT modelled: such elements are reported
// with bgImage=true and must be checked by eye. This is an automated aid, not a WCAG conformance claim.
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://127.0.0.1:5173";
const P = "/preview/web-v1";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  env: { ...process.env, HTTP_PROXY: "", HTTPS_PROXY: "", http_proxy: "", https_proxy: "" },
});
const C = `${P}/companies/2222`;
const TARGETS = [
  [
    `${C}/overview`,
    ["[data-company-levels]", "[data-overview-card]", "[data-intel-cta]", "[data-overview-status]"],
  ],
  [`${C}/intelligence`, ["[data-intel-nav]", "[data-intel-group] > header"]],
  [`${C}?tab=business`, ["[data-company-levels]"]],
];

async function contrast(page, sel) {
  return page.evaluate((sel) => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 1;
    const cx = cv.getContext("2d", { willReadFrequently: true });
    const rgba = (c) => {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = "#000";
      cx.fillStyle = c;
      const s = cx.fillStyle; // normalised
      cx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255, s];
    };
    const over = (top, bot) => top.map((v, i) => (i < 3 ? v * top[3] + bot[i] * (1 - top[3]) : 1));
    const lum = ([r, g, b]) => {
      const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const out = [];
    for (const root of document.querySelectorAll(sel)) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const seen = new Set();
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (!el || seen.has(el) || !n.textContent.trim()) continue;
        seen.add(el);
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width === 0 || cs.visibility === "hidden") continue;
        let chain = [],
          bgImage = false,
          opacity = 1;
        for (let a = el; a; a = a.parentElement) {
          const s = getComputedStyle(a);
          opacity *= Number(s.opacity);
          if (s.backgroundImage !== "none") bgImage = true;
          chain.push(rgba(s.backgroundColor));
        }
        let bg = [255, 255, 255, 1];
        for (const c of chain.reverse()) if (c[3] > 0) bg = over(c, bg);
        const fg0 = rgba(cs.color);
        const fg = over([fg0[0], fg0[1], fg0[2], fg0[3] * opacity], bg);
        const L1 = lum(fg),
          L2 = lum(bg);
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const px = parseFloat(cs.fontSize),
          w = Number(cs.fontWeight);
        const large = px >= 24 || (px >= 18.66 && w >= 700);
        out.push({
          text: n.textContent.trim().slice(0, 40),
          ratio: Math.round(ratio * 100) / 100,
          need: large ? 3 : 4.5,
          fontPx: px,
          bgImage,
        });
      }
    }
    return out;
  }, sel);
}

const report = { base: BASE, contrast: [], keyboard: [] };
for (const locale of ["ar", "en"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript((l) => localStorage.setItem("mi.locale", l), locale);
  const page = await ctx.newPage();
  for (const [path, sels] of TARGETS) {
    await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 90000 });
    for (const sel of sels) {
      const rows = await contrast(page, sel);
      const fails = rows.filter((r) => r.ratio < r.need);
      const min = rows.reduce((m, r) => Math.min(m, r.ratio), Infinity);
      report.contrast.push({
        locale,
        viewport: "desktop-1440",
        path,
        sel,
        nodes: rows.length,
        min: rows.length ? min : null,
        fails: fails.slice(0, 10),
        bgImageNodes: rows.filter((r) => r.bgImage).length,
      });
    }
  }
  await ctx.close();
}

// Mobile-only parts (exact 390 CSS px)
const MOBILE_TARGETS = [
  [`${C}/overview`, ["[data-company-levels]", "[data-overview-card]", "[data-intel-cta]"]],
  [`${C}/intelligence`, ["[data-intel-nav]"]],
];
for (const locale of ["ar", "en"]) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await ctx.addInitScript((l) => localStorage.setItem("mi.locale", l), locale);
  const page = await ctx.newPage();
  for (const [path, sels] of MOBILE_TARGETS) {
    await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 90000 });
    for (const sel of sels) {
      const rows = await contrast(page, sel);
      const fails = rows.filter((r) => r.ratio < r.need);
      const min = rows.reduce((m, r) => Math.min(m, r.ratio), Infinity);
      report.contrast.push({
        locale,
        viewport: "mobile-390",
        path,
        sel,
        nodes: rows.length,
        min: rows.length ? min : null,
        fails: fails.slice(0, 10),
        bgImageNodes: rows.filter((r) => r.bgImage).length,
      });
    }
  }
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
