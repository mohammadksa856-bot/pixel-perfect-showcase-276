// WEB-05B browser tests (Playwright): markets, boards, sectors; navigation market → sector → company;
// search, filters, tables, pagination, missing-data states; ar/en; mobile.
// Usage: BASE=http://127.0.0.1:5173 node product-tracking/tools/web_05b_e2e.mjs
//   BASE — dev server in frozen design mode (same policy as the Vercel Preview)
import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE = process.env.BASE ?? "http://127.0.0.1:5173";
const exe = process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const hp = process.env.HTTPS_PROXY ? new URL(process.env.HTTPS_PROXY) : null;
const browser = await chromium.launch({
  executablePath: exe,
  env: { ...process.env, HTTP_PROXY: "", HTTPS_PROXY: "", http_proxy: "", https_proxy: "" },
  args: hp ? [`--proxy-server=https=${hp.host}`] : [],
});

const results = [];
async function run(name, fn, { mobile = false, locale = "ar" } = {}) {
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: mobile,
    hasTouch: mobile,
  });
  await ctx.addInitScript((l) => localStorage.setItem("mi.locale", l), locale);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const go = async (path) => {
    const r = await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(300);
    return r;
  };
  try {
    await fn(page, go);
    assert.deepEqual(errors, [], "page errors");
    results.push(["PASS", name]);
  } catch (e) {
    results.push(["FAIL", name, String(e).split("\n")[0]]);
  } finally {
    await ctx.close();
  }
}
const tableCount = (page) =>
  page.locator("[data-table-count]").getAttribute("data-table-count").then(Number);
const waitCount = (page, n) =>
  page.waitForFunction(
    (n) =>
      document.querySelector("[data-table-count]")?.getAttribute("data-table-count") === String(n),
    n,
  );
const tile = (page, k) =>
  page.locator(`[data-count-tile="${k}"]`).getAttribute("data-value").then(Number);
const noHorizontalScroll = async (page) =>
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    "horizontal overflow",
  );
/** لا أسعار ولا نسب تغيّر ولا قيم سوقية في صفحات الأسواق والقطاعات. */
const noPrices = async (page) => {
  const text = await page.locator("main").innerText();
  assert.doesNotMatch(text, /\d[\d,.]*\s?(ر\.س|ريال|SAR)\b/, "price-like amount");
  assert.doesNotMatch(text, /[+-]\d+(\.\d+)?\s?%/, "percent change");
};

await run(
  "markets index: Saudi counts from the list; US kept in structure as not covered; no prices",
  async (page, go) => {
    await go("/preview/web-v1/markets");
    const n = (k) => page.locator(`[data-market-count="${k}"] dd`).innerText();
    assert.match(await n("total"), /396/);
    assert.match(await n("main"), /270/);
    assert.match(await n("nomu"), /126/);
    assert.equal(
      await page.locator('[data-market-card="us"]').getAttribute("data-market-state"),
      "not_covered",
    );
    await page.locator('[data-missing="prices"]').waitFor();
    await noPrices(page);
    await page.locator('[data-market-card="saudi"]').click();
    await page.waitForURL(/\/preview\/web-v1\/markets\/saudi$/);
  },
);

await run(
  "Saudi market: tiles, both boards, index cards without values, documented sectors + unclassified",
  async (page, go) => {
    await go("/preview/web-v1/markets/saudi");
    assert.equal(await tile(page, "total"), 396);
    assert.equal((await tile(page, "main")) + (await tile(page, "nomu")), 396);
    assert.equal(await tile(page, "with-pages"), 3);
    await page.locator('[data-missing="index-main"]').waitFor();
    await page.locator('[data-missing="index-nomu"]').waitFor();
    assert.equal(await page.locator('[data-sector-card="financials"]').count(), 1);
    assert.equal(await page.locator('[data-sector-card="energy"]').count(), 1);
    assert.equal(await page.locator('[data-sector-card="unclassified"]').count(), 1);
    await noPrices(page);
    await page.locator('[data-board-card="nomu"]').click();
    await page.waitForURL(/\/markets\/saudi\/nomu/);
    await waitCount(page, 126);
  },
);

await run(
  "Main Market table: search by ticker and Arabic name, sector and data filters, reset",
  async (page, go) => {
    await go("/preview/web-v1/markets/saudi/main");
    assert.equal(await tableCount(page), 270);
    assert.equal(await page.locator("[data-table-desktop] tbody tr").count(), 50);
    const input = page.locator("[data-table-input]");
    await input.fill("1120");
    await waitCount(page, 1);
    // الموجّه يحفظ الاستعلام الرقمي نصًا JSON في العنوان: q=%221120%22
    await page.waitForURL(/q=(%22)?1120/);
    await input.fill("الراجحي");
    await page.waitForFunction(
      () => document.querySelector("[data-row]")?.getAttribute("data-row") === "1120",
    );
    await page.locator("[data-table-reset]").click();
    await waitCount(page, 270);
    await page.locator('[data-filter="sector"]').selectOption("financials");
    await waitCount(page, 2);
    await page.locator('[data-filter="sector"]').selectOption("unclassified");
    await waitCount(page, 267);
    await page.locator('[data-filter="sector"]').selectOption("all");
    await page.locator('[data-filter="data"]').selectOption("engine_page");
    await waitCount(page, 3);
    await noPrices(page);
  },
);

await run("pagination: next/previous pages, 50 rows each, page in the URL", async (page, go) => {
  await go("/preview/web-v1/markets/saudi/main");
  await page.locator('[data-page-button="next"]').click();
  await page.waitForURL(/page=2/);
  assert.equal(await page.locator("[data-page]").getAttribute("data-page"), "2");
  assert.equal(
    (await page.locator("[data-table-desktop] tbody tr").first().getAttribute("data-row")) !==
      "1010",
    true,
  );
  await go("/preview/web-v1/markets/saudi/main?page=6");
  assert.equal(await page.locator("[data-page]").getAttribute("data-page"), "6");
  assert.equal(await page.locator("[data-table-desktop] tbody tr").count(), 20);
  assert.equal(await page.locator('[data-page-button="next"]').isDisabled(), true);
});

await run(
  "shareable URL restores filters and sort; Latin query explains the English-name limit",
  async (page, go) => {
    await go("/preview/web-v1/markets/saudi/main?sector=financials&sort=name");
    assert.equal(await tableCount(page), 2);
    assert.equal(await page.locator('[data-filter="sort"]').inputValue(), "name");
    await go("/preview/web-v1/markets/saudi/main?q=SABIC");
    await page.locator("[data-table-empty]").waitFor();
    assert.ok((await page.locator("[data-table-empty]").innerText()).includes("اسم إنجليزي"));
  },
);

await run(
  "board tabs: Main ↔ Nomu; Nomu has no documented sector (only All + Not classified)",
  async (page, go) => {
    await go("/preview/web-v1/markets/saudi/main");
    await page.locator('[data-board-tab="nomu"]').click();
    await page.waitForURL(/\/saudi\/nomu/);
    await waitCount(page, 126);
    const opts = await page
      .locator('[data-filter="sector"] option')
      .evaluateAll((o) => o.map((x) => x.value));
    assert.deepEqual(opts, ["all", "unclassified"]);
  },
);

await run(
  "navigation market → sector → company: row sector link, then open the company page",
  async (page, go) => {
    await go("/preview/web-v1/markets/saudi/main?q=2222");
    await page.locator('[data-row="2222"] [data-sector-link="energy"]').click();
    await page.waitForURL(/\/preview\/web-v1\/sectors\/energy/);
    await waitCount(page, 1);
    await page.locator('[data-open-company="2222"]').first().click();
    await page.waitForURL(/\/preview\/web-v1\/companies\/2222/);
    await page.locator("[data-company-hero]").waitFor();
  },
);

await run(
  "navigation sector → industry → company, and sector → board filtered to the sector",
  async (page, go) => {
    await go("/preview/web-v1/sectors");
    await page.locator('[data-sector-row="financials"] a').first().click();
    await page.waitForURL(/\/sectors\/financials/);
    assert.equal(await tile(page, "count"), 2);
    await page.locator('[data-industry="Banks"]').click();
    await waitCount(page, 1);
    assert.equal(await page.locator("[data-row]").first().getAttribute("data-row"), "1120");
    await page.locator('[data-sector-board="main"] [data-board-link="main"]').click();
    await page.waitForURL(/\/markets\/saudi\/main\?.*sector=financials/);
    await waitCount(page, 2);
  },
);

await run(
  "unclassified page and missing-data states; unknown sector and board",
  async (page, go) => {
    await go("/preview/web-v1/sectors/unclassified");
    assert.equal(await tile(page, "count"), 393);
    await waitCount(page, 393);
    await page.locator('[data-missing="sector-stats"]').waitFor();
    await go("/preview/web-v1/sectors/not-a-sector");
    await page.locator('[data-sector-page="not_documented"]').waitFor({ state: "attached" });
    const r = await go("/preview/web-v1/markets/saudi/xyz");
    assert.equal(r.status(), 404);
  },
);

await run(
  "sectors directory: search by sector or industry (source labels); empty state",
  async (page, go) => {
    await go("/preview/web-v1/sectors");
    assert.equal(await tile(page, "sectors"), 2);
    assert.equal(await tile(page, "unclassified"), 393);
    await page.locator("[data-sector-input]").fill("insur");
    await page.waitForFunction(() => document.querySelectorAll("[data-sector-row]").length === 1);
    assert.equal(
      await page.locator("[data-sector-row]").getAttribute("data-sector-row"),
      "financials",
    );
    await page.locator("[data-sector-input]").fill("zzz");
    await page.locator("[data-sectors-empty]").waitFor();
    await page.locator('[data-missing="sector-stats"]').waitFor();
    await noPrices(page);
  },
);

await run(
  "shell: header Markets/Sectors open the new pages; search finds a sector page",
  async (page, go) => {
    await go("/preview/web-v1");
    await page.locator('header a[href="/preview/web-v1/markets"]').click();
    await page.waitForURL(/\/preview\/web-v1\/markets$/);
    await page.locator('header a[href="/preview/web-v1/sectors"]').click();
    await page.waitForURL(/\/preview\/web-v1\/sectors/);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    await page.keyboard.press("Control+k");
    await page.locator("[data-search-input]").fill("Financials");
    await page.locator('[data-search-dialog] a[href="/preview/web-v1/sectors/financials"]').click();
    await page.waitForURL(/\/preview\/web-v1\/sectors\/financials/);
  },
);

await run("breadcrumbs: board page links back to Saudi market and markets", async (page, go) => {
  await go("/preview/web-v1/markets/saudi/nomu");
  await page.locator('[data-breadcrumbs] [data-crumb="2"]').click();
  await page.waitForURL(/\/markets\/saudi$/);
  await page.locator('[data-breadcrumbs] [data-crumb="1"]').click();
  await page.waitForURL(/\/markets$/);
});

await run(
  "English: LTR, English labels, sector labels as in source",
  async (page, go) => {
    await go("/preview/web-v1/markets/saudi");
    assert.equal(await page.evaluate(() => document.documentElement.dir), "ltr");
    assert.equal(await page.locator("h1").innerText(), "Saudi Exchange");
    await go("/preview/web-v1/sectors/financials");
    assert.equal(await page.locator("h1").innerText(), "Financials");
    assert.ok((await page.locator("[data-table-count]").innerText()).includes("of 2 companies"));
  },
  { locale: "en" },
);

for (const path of [
  "/preview/web-v1/markets",
  "/preview/web-v1/markets/saudi",
  "/preview/web-v1/markets/saudi/main",
  "/preview/web-v1/sectors",
  "/preview/web-v1/sectors/financials",
  "/preview/web-v1/sectors/unclassified",
])
  await run(
    `mobile 390px: no horizontal scroll, bottom bar visible — ${path}`,
    async (page, go) => {
      await go(path);
      await noHorizontalScroll(page);
      assert.ok(await page.locator("[data-mobile-tabbar]").isVisible());
    },
    { mobile: true },
  );

await run(
  "mobile: table becomes a list; filters and pagination usable; bottom-bar Markets opens markets",
  async (page, go) => {
    await go("/preview/web-v1/markets/saudi/main");
    assert.equal(await page.locator("[data-table-desktop]").isVisible(), false);
    assert.equal(await page.locator("[data-row-mobile]").count(), 50);
    await page.locator('[data-filter="sector"]').selectOption("energy");
    await waitCount(page, 1);
    await page.locator('[data-mobile-tabbar] a[href="/preview/web-v1/markets"]').click();
    await page.waitForURL(/\/preview\/web-v1\/markets$/);
  },
  { mobile: true },
);

await browser.close();
for (const r of results) console.log(r.join("  "));
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
