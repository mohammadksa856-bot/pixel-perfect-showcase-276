// WEB-05A browser tests (Playwright): navigation, unified search, directory filters, responsiveness, ar/en.
// Usage: BASE=http://127.0.0.1:5173 [BASE_LIVE=http://127.0.0.1:5174] node product-tracking/tools/web_05a_e2e.mjs
//   BASE      — dev server in frozen design mode (same policy as the Vercel Preview)
//   BASE_LIVE — optional dev server WITHOUT frozen mode, where Supabase is unreachable (checks the error state)
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
async function run(name, fn, { mobile = false, locale = "ar", base = BASE } = {}) {
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
    await page.goto(base + path, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(300);
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
const count = (page) =>
  page.locator("[data-result-count]").getAttribute("data-result-count").then(Number);
const noHorizontalScroll = async (page) =>
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    "horizontal overflow",
  );

await run(
  "home: hero search opens the dialog; ticker finds the company; Enter opens full results",
  async (page, go) => {
    await go("/preview/web-v1");
    await page.locator("[data-hero-search]").click();
    await page.locator("[data-search-input]").fill("1120");
    await page.locator('[data-search-dialog] [data-result="1120"]').waitFor();
    await page.keyboard.press("Enter");
    // TanStack keeps a numeric-looking query as a JSON string: q=%221120%22
    await page.waitForURL(/\/preview\/web-v1\/search\?q=(%22)?1120/);
    await page.locator('[data-search-state="results"] [data-result="1120"]').waitFor();
  },
);

await run("Ctrl+K from the directory; unknown query shows the empty state", async (page, go) => {
  await go("/preview/web-v1/companies");
  await page.keyboard.press("Control+k");
  await page.locator("[data-search-input]").fill("zzqqxx");
  await page.locator('[data-search-dialog] [data-search-state="empty"]').waitFor();
});

await run("search result navigates to the company page", async (page, go) => {
  await go("/preview/web-v1");
  await page.keyboard.press("Control+k");
  await page.locator("[data-search-input]").fill("ارامكو");
  await page.locator('[data-search-dialog] a[data-result="2222"]').click();
  await page.waitForURL(/\/preview\/web-v1\/companies\/2222/);
  await page.locator("[data-company-hero]").waitFor();
});

await run(
  "research and knowledge are declared unavailable in the frozen sample",
  async (page, go) => {
    await go("/preview/web-v1/search?q=%D8%A7%D9%84%D8%B1%D8%A7%D8%AC%D8%AD%D9%8A");
    await page.locator('[data-search-group="research"][data-group-state="unavailable"]').waitFor();
    await page.locator('[data-search-group="knowledge"][data-group-state="unavailable"]').waitFor();
  },
);

await run(
  "directory filters: market, data availability, sector; counts and URL",
  async (page, go) => {
    await go("/preview/web-v1/companies");
    assert.equal(await count(page), 396);
    await page.locator('[data-chip="board-nomu"]').click();
    await page.waitForURL(/board=nomu/);
    assert.equal(await count(page), 126);
    await page.locator('[data-chip="board-all"]').click();
    await page.locator('[data-chip="data-engine_page"]').click();
    await page.waitForURL(/data=engine_page/);
    assert.equal(await count(page), 3);
    await page.locator('[data-chip="sector-Financials"]').click();
    assert.equal(await count(page), 2);
  },
);

await run(
  "directory search: Arabic without hamza, Arabic-Indic digits, English name",
  async (page, go) => {
    await go("/preview/web-v1/companies");
    const input = page.locator("[data-directory-input]");
    await input.fill("ارامكو");
    await page.waitForFunction(
      () =>
        document.querySelector("[data-company-card]")?.getAttribute("data-company-card") === "2222",
    );
    await input.fill("١١٢٠");
    await page.waitForFunction(
      () =>
        document.querySelector("[data-company-card]")?.getAttribute("data-company-card") === "1120",
    );
    await input.fill("al rajhi");
    await page.waitForFunction(
      () =>
        document.querySelector("[data-company-card]")?.getAttribute("data-company-card") === "1120",
    );
  },
);

await run("directory: empty state with reset, and 'show more' pagination", async (page, go) => {
  await go("/preview/web-v1/companies?q=zzqqxx");
  await page.locator("[data-directory-empty]").waitFor();
  await page.locator("[data-directory-empty] button").click();
  await page.waitForURL((u) => !u.search.includes("zzqqxx"));
  await page.waitForFunction(() => document.querySelectorAll("[data-company-card]").length === 24);
  await page.locator("[data-load-more]").click();
  await page.waitForFunction(() => document.querySelectorAll("[data-company-card]").length === 48);
});

await run("external link with a numeric query (?q=1120) keeps the ticker", async (page, go) => {
  await go("/preview/web-v1/search?q=1120");
  await page.locator('[data-search-state="results"] [data-result="1120"]').waitFor();
  await go("/preview/web-v1/companies?q=1120");
  assert.equal(await count(page), 1);
});

await run("search copy: SABIC (English, no source name) explains the limit; سابك (Arabic) finds 2010", async (page, go) => {
  await go("/preview/web-v1/companies?q=SABIC");
  await page.locator("[data-directory-empty]").waitFor();
  assert.ok((await page.locator("[data-directory-empty]").innerText()).includes("اسم إنجليزي"));
  await go(`/preview/web-v1/companies?q=${encodeURIComponent("سابك")}`);
  assert.equal(await page.locator("[data-company-card]").first().getAttribute("data-company-card"), "2010");
  assert.ok((await page.locator("[data-english-coverage]").innerText()).includes("3 من 396"));
});

await run("search copy (English UI): accurate placeholder and coverage note", async (page, go) => {
  await go("/preview/web-v1/companies");
  assert.equal(
    await page.locator("[data-directory-input]").getAttribute("placeholder"),
    "Search by ticker or Arabic company name. English names are supported where available.",
  );
  assert.ok((await page.locator("[data-english-coverage]").innerText()).includes("3 of 396"));
  await page.keyboard.press("Control+k");
  assert.equal(await page.locator("[data-search-input]").getAttribute("placeholder"), "Ticker, Arabic company name or topic…");
  await page.locator("[data-search-input]").fill("SABIC");
  await page.locator('[data-search-dialog] [data-search-state="empty"]').waitFor();
  assert.ok((await page.locator('[data-search-dialog] [data-search-state="empty"]').innerText()).includes("no English name"));
}, { locale: "en" });

await run("shareable URL: filters restore from the address", async (page, go) => {
  await go("/preview/web-v1/companies?board=nomu&sort=name");
  assert.equal(await count(page), 126);
  assert.equal(await page.locator("[data-sort]").inputValue(), "name");
});

for (const path of [
  "/preview/web-v1",
  "/preview/web-v1/companies",
  "/preview/web-v1/search?q=2222",
  "/preview/web-v1/companies/2222?tab=business",
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
  "mobile: filters hidden until toggled; search from the bottom bar",
  async (page, go) => {
    await go("/preview/web-v1/companies");
    assert.equal(await page.locator('[data-chip="board-nomu"]').isVisible(), false);
    await page.locator("[data-filters-toggle]").click();
    await page.locator('[data-chip="board-nomu"]:visible').click();
    assert.equal(await count(page), 126);
    await page.locator("[data-mobile-tabbar] button").first().click();
    await page.locator("[data-search-input]").waitFor();
  },
  { mobile: true },
);

await run(
  "English: LTR layout and English labels on the directory",
  async (page, go) => {
    await go("/preview/web-v1/companies");
    assert.equal(await page.evaluate(() => document.documentElement.dir), "ltr");
    assert.ok((await page.locator("h1").innerText()).includes("Company directory"));
  },
  { locale: "en" },
);

if (process.env.BASE_LIVE)
  await run(
    "live-content mode with Supabase unreachable: research/knowledge show the error state, companies still work",
    async (page, go) => {
      await go("/preview/web-v1/search?q=1120");
      await page
        .locator('[data-search-group="research"][data-group-state="error"]')
        .waitFor({ timeout: 20000 });
      await page.locator('[data-result="1120"]').waitFor();
    },
    { base: process.env.BASE_LIVE },
  );

await browser.close();
for (const r of results) console.log(r.join("  "));
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
