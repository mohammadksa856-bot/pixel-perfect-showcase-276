// P02 browser tests (real Chromium via playwright-core; not a project dependency).
// Run through p02_browser.sh, which starts the engine API and the site dev server.
// Env: SITE_URL, ENGINE_KEY, ENGINE_PORT, SHOT_DIR, EXPECT ("on" | "off")
import { chromium } from "playwright-core";
import assert from "node:assert/strict";

const SITE = process.env.SITE_URL;
const KEY = process.env.ENGINE_KEY;
const ENGINE_PORT = process.env.ENGINE_PORT;
const SHOTS = process.env.SHOT_DIR;
const EXPECT = process.env.EXPECT ?? "on";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (e) {
    results.push({ name, ok: false, error: String(e.message ?? e).slice(0, 400) });
  }
};

async function openPage(path, { locale = "ar", width = 1366 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await context.addInitScript((l) => window.localStorage.setItem("mi.locale", l), locale);
  const page = await context.newPage();
  const requests = [];
  const errors = [];
  page.on("request", (r) => requests.push(r.url()));
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  const response = await page.goto(SITE + path, { waitUntil: "networkidle" });
  return { context, page, response, requests, errors };
}

if (EXPECT === "off") {
  for (const path of ["/preview/companies", "/preview/companies/2222"]) {
    await check(`flag off: ${path} → 404 and no engine call`, async () => {
      const { context, response, requests } = await openPage(path);
      assert.equal(response.status(), 404);
      assert.equal(requests.filter((u) => u.includes(`:${ENGINE_PORT}`)).length, 0);
      await context.close();
    });
  }
} else {
  const companies = {
    2222: { ar: "أرامكو", charts: ["revenue", "net_income"], quarter: true },
    1120: { ar: "Al Rajhi", charts: ["net_income_parent"], quarter: false },
    8010: { ar: "Tawuniya", charts: [], quarter: false },
  };
  for (const [symbol, exp] of Object.entries(companies)) {
    await check(`${symbol} ar: renders 18 topics, statuses, sources; no errors`, async () => {
      const { context, page, response, requests, errors } = await openPage(
        `/preview/companies/${symbol}`,
      );
      assert.equal(response.status(), 200);
      assert.equal(await page.getAttribute("html", "dir"), "rtl");
      assert.equal(await page.locator("[data-topic]").count(), 18);
      assert.equal(await page.locator("[data-preview-badge]").count(), 1);
      const statuses = await page
        .locator("[data-topic-status]")
        .evaluateAll((els) => els.map((e) => e.dataset.topicStatus));
      assert.ok(
        statuses.every((s) =>
          ["available", "partial", "unavailable", "not_measured", "not_applicable"].includes(s),
        ),
      );
      assert.ok((await page.locator("[data-metric]").count()) > 0, "shows metric rows");
      // كل رابط مصدر http(s) فقط
      const hrefs = await page
        .locator("a[target=_blank]")
        .evaluateAll((els) => els.map((a) => a.href));
      assert.ok(
        hrefs.length > 0 && hrefs.every((h) => /^https?:\/\//.test(h)),
        "only http(s) source links",
      );
      // الرسوم
      const charts = await page
        .locator("[data-chart]")
        .evaluateAll((els) => els.map((e) => e.dataset.chart));
      assert.deepEqual(charts, exp.charts);
      if (!exp.charts.length) assert.equal(await page.locator("[data-history-empty]").count(), 1);
      // الربع منفصل وموسوم
      const qRows = await page.locator('[data-period-kind="quarter"]').count();
      assert.equal(qRows > 0, exp.quarter);
      if (exp.quarter)
        assert.match(
          await page.locator('[data-period-kind="quarter"]').first().innerText(),
          /ربع منفرد/,
        );
      // لا اتصال من المتصفح بالمحرك ولا بـ Supabase عند التحميل، ولا مفتاح في الصفحة
      assert.equal(
        requests.filter((u) => u.includes(`:${ENGINE_PORT}`)).length,
        0,
        "browser never calls engine",
      );
      assert.equal(
        requests.filter((u) => /supabase\.co/.test(u)).length,
        0,
        "no Supabase requests on load",
      );
      const html = await page.content();
      assert.ok(!html.includes(KEY), "API key absent from DOM");
      assert.ok(
        !/2[,]?500[,]?000(?!\d)/.test(html) && !/5[,]?853[,]?702/.test(html),
        "DCR-001 values absent",
      );
      assert.deepEqual(
        errors.filter((e) => !/favicon|Failed to load resource.*404/.test(e)),
        [],
      );
      await page.screenshot({ path: `${SHOTS}/p02-${symbol}-ar-desktop.png`, fullPage: false });
      await context.close();
    });

    await check(`${symbol} en: English labels and LTR`, async () => {
      const { context, page } = await openPage(`/preview/companies/${symbol}`, { locale: "en" });
      await page.waitForFunction(() => document.documentElement.dir === "ltr");
      const text = await page.locator("main").innerText();
      assert.match(text, /Engine data preview/);
      assert.match(text, /Historical financials|Income statement/);
      await page.screenshot({ path: `${SHOTS}/p02-${symbol}-en-desktop.png` });
      await context.close();
    });

    await check(`${symbol} mobile 390px: no horizontal page overflow`, async () => {
      const { context, page } = await openPage(`/preview/companies/${symbol}`, { width: 390 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      assert.ok(overflow <= 1, `page overflows by ${overflow}px`);
      await page.screenshot({ path: `${SHOTS}/p02-${symbol}-ar-mobile.png` });
      await context.close();
    });
  }

  await check("1120: withheld/not-applicable/proof UI on bank page", async () => {
    const { context, page } = await openPage("/preview/companies/1120");
    assert.ok((await page.locator("[data-withheld]").count()) >= 1);
    assert.ok((await page.locator("[data-not-applicable]").count()) >= 1);
    assert.ok((await page.locator('[data-proof="calculated_formula_recorded"]').count()) > 0);
    await page.locator("#topic-5").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/p02-1120-topic5.png` });
    await context.close();
  });

  await check("unknown company → 404", async () => {
    const { context, response } = await openPage("/preview/companies/4190");
    assert.equal(response.status(), 404);
    await context.close();
  });
}

await browser.close();
for (const r of results)
  console.log(`${r.ok ? "PASS" : "FAIL"} ${r.name}${r.ok ? "" : `\n     ${r.error}`}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} pass, ${failed} fail`);
process.exit(failed ? 1 : 0);
