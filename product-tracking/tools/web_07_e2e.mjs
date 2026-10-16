// WEB-07 browser acceptance: company experience (Overview / Company Intelligence / Marefa Data) for 2222.
// Usage: BASE=http://127.0.0.1:5173 node product-tracking/tools/web_07_e2e.mjs
//   BASE — dev server in frozen design mode (same policy as the Vercel Preview).
// Every test also fails on: page errors, any Supabase request, any write request, and page-level
// horizontal scroll wider than the configured device width.
import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE = process.env.BASE ?? "http://127.0.0.1:5173";
const P = "/preview/web-v1/companies";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  env: { ...process.env, HTTP_PROXY: "", HTTPS_PROXY: "", http_proxy: "", https_proxy: "" },
});
const VIEWS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
let pass = 0;
let fail = 0;

async function run(name, fn, { view = "desktop", locale = "ar" } = {}) {
  const m = view === "mobile";
  const ctx = await browser.newContext({ viewport: VIEWS[view], isMobile: m, hasTouch: m });
  await ctx.addInitScript((l) => localStorage.setItem("mi.locale", l), locale);
  const page = await ctx.newPage();
  const errors = [];
  const bad = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  // Same rules as web_05b_boundary_audit.mjs: Supabase = its host or its REST/auth paths (dev-server
  // module files named "supabase" are not requests to Supabase); writes = any non-GET to a non-asset URL.
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (
      /supabase/.test(u.host) ||
      u.pathname.startsWith("/rest/v1") ||
      u.pathname.startsWith("/auth/v1")
    )
      bad.push(`supabase ${r.method()} ${u.host}${u.pathname}`);
    if (
      !["GET", "HEAD", "OPTIONS"].includes(r.method()) &&
      !u.pathname.startsWith("/@") &&
      !u.pathname.includes("/node_modules/")
    )
      bad.push(`write ${r.method()} ${u.pathname}`);
  });
  const go = async (path) => {
    await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 90000 });
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(sw <= VIEWS[view].width, `page scrollWidth ${sw} > ${VIEWS[view].width} on ${path}`);
  };
  try {
    await fn(page, go);
    assert.deepEqual(errors, [], "page errors");
    assert.deepEqual(bad, [], "forbidden requests: " + bad.slice(0, 3).join(" ; "));
    pass++;
    console.log(`PASS  [${view} ${locale}] ${name}`);
  } catch (e) {
    fail++;
    console.log(`FAIL  [${view} ${locale}] ${name}  ${String(e).split("\n")[0]}`);
  }
  await ctx.close();
}

// The site scrolls smoothly; wait until the scroll position stops changing before measuring.
const settle = async (page) => {
  let last = -1;
  for (let i = 0; i < 40; i++) {
    const y = await page.evaluate(() => scrollY);
    if (y === last) return;
    last = y;
    await page.waitForTimeout(150);
  }
};

const focusedState = (page) =>
  page.evaluate(() => {
    const el = document.querySelector("[data-focused=true]");
    const r = el.getBoundingClientRect();
    return {
      key: el.getAttribute("data-row") ?? el.getAttribute("data-metric"),
      inView: r.top >= 0 && r.bottom <= innerHeight,
      rect: [Math.round(r.top), Math.round(r.bottom), innerHeight, Math.round(scrollY)],
      focused: document.activeElement === el,
      text: el.textContent.replace(/[\u2066-\u2069]/g, ""),
    };
  });

const internalLinksStayInPreview = async (page) => {
  const hrefs = await page
    .locator("main a[href], [data-company-levels] a[href]")
    .evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  for (const h of hrefs)
    if (!/^https:\/\//.test(h)) assert.match(h, /^(\/preview\/web-v1|#)/, `internal link ${h}`);
};

for (const view of ["desktop", "mobile"])
  for (const locale of ["ar", "en"]) {
    await run(
      "overview: three levels, current marked, summary sections, CTA, links stay in Preview",
      async (page, go) => {
        await go(`${P}/2222/overview`);
        assert.equal(await page.locator("[data-level-link]").count(), 3);
        assert.equal(
          await page.locator('[data-level-link="overview"]').getAttribute("aria-current"),
          "page",
        );
        for (const c of [
          "business-model",
          "key-figures",
          "operations",
          "revenue-mix",
          "shareholders",
          "developments",
          "governance",
          "valuation",
          "risks",
        ])
          assert.equal(await page.locator(`[data-overview-card="${c}"]`).count(), 1, c);
        assert.equal(await page.locator("[data-intel-cta-link]").count(), 1);
        assert.equal(await page.locator("[data-overview-figure]").count(), 6);
        await internalLinksStayInPreview(page);
        const text = await page.locator("main").innerText();
        assert.doesNotMatch(text, /95\s*%/, "95% must not appear as an achieved figure");
      },
      { view, locale },
    );

    await run(
      "deep link: key figure → Intelligence row with the same value → source",
      async (page, go) => {
        await go(`${P}/2222/overview`);
        const fig = page.locator('[data-overview-figure="total_assets"]');
        const shownValue = (await fig.locator(".num").first().innerText()).replace(/[⁦-⁩]/g, "");
        await fig.locator("[data-intel-link]").click();
        await page.waitForURL(/intelligence\?topic=financials&focus=total_assets/);
        await page.waitForSelector("[data-focused=true]");
        await settle(page);
        const f = await focusedState(page);
        assert.equal(f.key, "total_assets");
        assert.ok(f.inView, `focused row in view (${JSON.stringify(f.rect)})`);
        assert.ok(f.focused, "focused row has keyboard focus");
        const num = shownValue.match(/[\d,]+\.\d+/)[0];
        assert.ok(f.text.includes(num), `same value ${num} in focused row`);
        // the statements table lists its sources by period; at least one https source link nearby
        const src = page.locator('#topic-5 a[target="_blank"][href^="https://"]');
        assert.ok((await src.count()) > 0, "source links in topic 5");
      },
      { view, locale },
    );
  }

await run(
  "deep link: operating KPI (mobile) → Intelligence item with its source",
  async (page, go) => {
    await go(`${P}/2222/overview`);
    await page.locator('[data-overview-metric="lifting_cost_per_boe"] [data-intel-link]').click();
    await page.waitForURL(/topic=operations&focus=lifting_cost_per_boe/);
    await page.waitForSelector("[data-focused=true]");
    const el = page.locator("[data-focused=true]");
    assert.equal(await el.getAttribute("data-metric"), "lifting_cost_per_boe");
    const href = await el.locator('a[target="_blank"]').first().getAttribute("href");
    assert.match(href, /^https:\/\//);
  },
  { view: "mobile", locale: "ar" },
);

await run(
  "deep link opened directly (shared URL): statement row focused and in view",
  async (page, go) => {
    await go(`${P}/2222/intelligence?topic=financials&focus=revenue`);
    await page.waitForSelector("[data-focused=true]", { timeout: 20000 });
    await settle(page);
    const f = await focusedState(page);
    assert.equal(f.key, "revenue");
    assert.ok(f.inView, `focused row in view (${JSON.stringify(f.rect)})`);
    assert.ok(f.text.includes("1,559.34"), "FY2025 revenue as on Overview");
  },
  { locale: "en" },
);

await run(
  "intelligence: search filters topics, updates the URL, clears back to 18",
  async (page, go) => {
    await go(`${P}/2222/intelligence`);
    assert.equal(await page.locator("[data-intel-topic]").count(), 18);
    assert.equal(await page.locator("[data-intel-count]").getAttribute("data-intel-count"), "18");
    await page.locator("[data-intel-search]").fill("التوزيعات");
    await page.waitForURL(/q=/);
    const n = Number(await page.locator("[data-intel-count]").getAttribute("data-intel-count"));
    assert.ok(n >= 1 && n < 18, `filtered count ${n}`);
    assert.ok(await page.locator('[data-intel-topic="dividends_actions"]').isVisible());
    assert.equal(await page.locator('[data-intel-topic="identity"]').isVisible(), false);
    await page.locator("[data-intel-search]").fill("zzzzqqq");
    await page.locator("[data-intel-empty]").waitFor();
    await page.locator("[data-intel-empty] button").click();
    assert.equal(await page.locator("[data-intel-count]").getAttribute("data-intel-count"), "18");
  },
);

await run(
  "intelligence (EN): English search matches; statements explorer, charts and periods present",
  async (page, go) => {
    await go(`${P}/2222/intelligence?q=lifting%20cost`);
    assert.equal(await page.locator("[data-intel-count]").getAttribute("data-intel-count"), "1");
    await page.locator("[data-intel-search]").fill("");
    await page.waitForTimeout(500);
    assert.ok((await page.locator("[data-section-tabs]").count()) >= 1, "statement section tabs");
    assert.ok((await page.locator("[data-period-tabs]").count()) >= 1, "period tabs");
    assert.equal(await page.locator("[data-intel-group]").count(), 5);
  },
  { locale: "en" },
);

await run(
  "keyboard: levels nav and Intelligence index are reachable and operable",
  async (page, go) => {
    await go(`${P}/2222/overview`);
    let reached = false;
    for (let i = 0; i < 60 && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(() =>
        document.activeElement?.matches('[data-level-link="intelligence"]'),
      );
    }
    assert.ok(reached, "Tab reaches the Intelligence level link");
    const outline = await page.evaluate(
      () => getComputedStyle(document.activeElement).outlineStyle,
    );
    assert.notEqual(outline, "none", "visible focus indicator");
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/intelligence/);
    await page.locator("[data-intel-search]").focus();
    await page.keyboard.type("dividend");
    await page.waitForURL(/q=dividend/);
    await page.keyboard.press("Tab"); // clear button
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("[data-intel-search]").inputValue(), "");
  },
);

await run(
  "mobile intelligence: collapsible topic index opens and jumps to a topic",
  async (page, go) => {
    await go(`${P}/2222/intelligence`);
    await page.locator("[data-intel-nav-mobile] > summary").click();
    await page.locator('[data-intel-nav-mobile] [data-intel-index="esg"]').click();
    await settle(page);
    const top = await page.evaluate(
      () => document.getElementById("topic-17").getBoundingClientRect().top,
    );
    assert.ok(top > -50 && top < 500, `topic 17 near the top (${top})`);
  },
  { view: "mobile", locale: "ar" },
);

await run("Marefa Data level: WEB-06 page intact with the level nav on top", async (page, go) => {
  await go(`${P}/2222?tab=business`);
  assert.equal(await page.locator('[data-level-link="data"]').getAttribute("aria-current"), "page");
  assert.equal(await page.locator("[data-company-tabs] a").count(), 6);
  assert.equal(await page.locator("[data-page-notice]").count(), 1);
  await page.locator('[data-company-tabs] a[data-tab="financials"]').click();
  await page.waitForURL(/tab=financials/);
  await page.locator("[data-section-tabs]").waitFor();
  await go(`${P}/2222?tab=coverage`);
  await page.locator("[data-factory-panel]").waitFor();
  assert.equal(await page.locator("[data-category-map] li").count(), 18);
});

await run(
  "other companies: no level nav on Data; Overview shows an explicit not-built state",
  async (page, go) => {
    await go(`${P}/1120?tab=business`);
    assert.equal(await page.locator("[data-company-levels]").count(), 0);
    await go(`${P}/1120/overview`);
    await page.locator("[data-experience-not-built]").waitFor();
    assert.equal(await page.locator("[data-overview-card]").count(), 0);
    const href = await page.locator("[data-experience-not-built] a").getAttribute("href");
    assert.match(href, /\/preview\/web-v1\/companies\/1120\?tab=business/);
  },
);

await run(
  "hero readiness links still open Marefa Data tabs from the Overview level",
  async (page, go) => {
    await go(`${P}/2222/overview`);
    const a = await page
      .locator('[data-hero-readiness="operational_categories"]')
      .getAttribute("href");
    assert.equal(a, `${P}/2222?tab=coverage`);
  },
);

console.log(`\n${pass}/${pass + fail} passed`);
await browser.close();
process.exit(fail ? 1 : 0);
