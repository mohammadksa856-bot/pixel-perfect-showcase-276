// WEB-06 (D11): contrast + keyboard checks for the parts changed in the visual-polish batch.
// Usage: BASE=http://127.0.0.1:5173 node web_06_a11y.mjs > out.json
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
const TARGETS = [
  [
    `${P}/companies/2222?tab=business`,
    [
      "[data-page-notice]",
      "[data-fact-link]",
      "[data-language-mark]",
      "[data-crumb-sector]",
      "[data-crumb-industry]",
    ],
  ],
  [`${P}/companies/2222?tab=shareholders`, ["[data-actions]"]],
  [`${P}/companies/2222?tab=financials`, ["[data-section-tabs]"]],
  [
    `${P}/companies/2222?tab=coverage`,
    [
      "[data-not-assessed-summary]",
      "[data-map-shared-state]",
      "[data-category-map]",
      "[data-category-table] > summary",
    ],
  ],
  [`${P}/markets/saudi/main`, ["[data-table-legend]", "[data-sector-cell]", "[data-data-cell]"]],
  [`${P}/sectors`, ["[data-sector-row]"]],
  [`${P}`, ["[data-topic-strip-summary]", "[data-principles]", "[data-page-anatomy]"]],
  [`${P}/search?q=1120`, ["[data-search-group=library]"]],
  [`${P}/markets`, ["[data-preview-footer]"]],
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
  [`${P}/companies/2222?tab=financials`, ["[data-condensed-note]", "[data-section-tabs]"]],
  [`${P}`, ["[data-principles]", "[data-page-anatomy]", "[data-mobile-short]"]],
  [`${P}/markets/saudi/main`, ["[data-table-mobile]"]],
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

// Keyboard: reach and operate each new control without a mouse; visible focus indicator.
const kctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const kp = await kctx.newPage();
const focusVisible = () =>
  kp.evaluate(() => {
    const s = getComputedStyle(document.activeElement);
    return (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none";
  });
async function tabTo(sel, max = 200) {
  for (let i = 0; i < max; i++) {
    await kp.keyboard.press("Tab");
    if (await kp.evaluate((s) => document.activeElement?.matches(s), sel)) return true;
  }
  return false;
}
async function check(name, fn) {
  try {
    report.keyboard.push({ name, ...(await fn()) });
  } catch (e) {
    report.keyboard.push({ name, ok: false, error: String(e) });
  }
}
await check("financials: statement tabs reachable by Tab and switch with Enter", async () => {
  await kp.goto(`${BASE}${P}/companies/2222?tab=financials`, { waitUntil: "networkidle" });
  const reached = await tabTo("[data-section-tab]:not([aria-selected=true])");
  const fv = await focusVisible();
  await kp.keyboard.press("Enter");
  const sel = await kp.evaluate(() => document.activeElement.getAttribute("aria-selected"));
  return {
    ok: reached && sel === "true" && fv,
    reached,
    focusVisible: fv,
    selectedAfterEnter: sel,
  };
});
await check(
  "coverage: map tile Enter opens the collapsed detailed table and that category",
  async () => {
    await kp.goto(`${BASE}${P}/companies/2222?tab=coverage`, { waitUntil: "networkidle" });
    const closed = await kp.evaluate(() => !document.querySelector("[data-category-table]").open);
    const reached = await tabTo("[data-category-map] a");
    const fv = await focusVisible();
    const key = await kp.evaluate(() => document.activeElement.getAttribute("href").slice(5));
    await kp.keyboard.press("Enter");
    await kp.waitForTimeout(200);
    const st = await kp.evaluate(
      (k) => ({
        table: document.querySelector("[data-category-table]").open,
        row: document.querySelector(`#cat-${k} details`).open,
      }),
      key,
    );
    return {
      ok: closed && reached && fv && st.table && st.row,
      closedByDefault: closed,
      reached,
      focusVisible: fv,
      ...st,
    };
  },
);
await check("coverage: detailed-table summary toggles with Enter and Space", async () => {
  await kp.goto(`${BASE}${P}/companies/2222?tab=coverage`, { waitUntil: "networkidle" });
  const reached = await tabTo("[data-category-table] > summary");
  const fv = await focusVisible();
  await kp.keyboard.press("Enter");
  const a = await kp.evaluate(() => document.querySelector("[data-category-table]").open);
  await kp.keyboard.press("Space");
  const b = await kp.evaluate(() => document.querySelector("[data-category-table]").open);
  return {
    ok: reached && fv && a && !b,
    reached,
    focusVisible: fv,
    openAfterEnter: a,
    openAfterSpace: b,
  };
});
await check("tables: legend details toggles from the keyboard", async () => {
  await kp.goto(`${BASE}${P}/markets/saudi/main`, { waitUntil: "networkidle" });
  const reached = await tabTo("[data-table-legend] > summary");
  const fv = await focusVisible();
  await kp.keyboard.press("Enter");
  const open = await kp.evaluate(() => document.querySelector("[data-table-legend]").open);
  return { ok: reached && open && fv, reached, focusVisible: fv, open };
});
await kctx.close();
// Mobile-only toggles (exact 390 CSS px)
const mctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const mp = await mctx.newPage();
await check(
  "mobile financials: condensed note + show-all toggle reveals every row (none removed)",
  async () => {
    await mp.goto(`${BASE}${P}/companies/2222?tab=financials`, { waitUntil: "networkidle" });
    const sec = mp.locator("tbody[data-section]:not([hidden])").first();
    const total = await sec.locator("tr").count();
    const visibleBefore = await sec.locator("tr:visible").count();
    const btn = mp.locator("[data-show-all-rows]").first();
    await btn.focus();
    await mp.keyboard.press("Enter");
    const visibleAfter = await sec.locator("tr:visible").count();
    const expanded =
      (await btn.getAttribute("aria-pressed")) ?? (await btn.getAttribute("aria-expanded"));
    return {
      ok: visibleAfter === total && visibleBefore <= total,
      total,
      visibleBefore,
      visibleAfter,
      expanded,
    };
  },
);
await check("mobile home: principles and anatomy toggles expose all text", async () => {
  await mp.goto(`${BASE}${P}`, { waitUntil: "networkidle" });
  const hiddenBefore = await mp.locator("[data-principle-body]:visible").count();
  await mp.locator("[data-principles-toggle]").focus();
  await mp.keyboard.press("Enter");
  const shownAfter = await mp.locator("[data-principle-body]:visible").count();
  await mp.locator("[data-anatomy-toggle]").focus();
  await mp.keyboard.press("Enter");
  const groups = await mp.locator("[data-group-topics]:visible").count();
  const sw = await mp.evaluate(() => document.documentElement.scrollWidth);
  return {
    ok: hiddenBefore === 0 && shownAfter === 3 && groups === 5 && sw <= 390,
    hiddenBefore,
    shownAfter,
    groupsShown: groups,
    scrollWidth: sw,
  };
});
await mctx.close();
await browser.close();
console.log(JSON.stringify(report, null, 2));
