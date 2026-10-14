// WEB-05C browser tests (Playwright): research & knowledge library — browse, search, filter, read, references,
// related content, language fallback, loading/empty/error/unavailable states, ar/en, mobile.
// Usage:
//   LIVE=http://127.0.0.1:5175   dev server WITHOUT frozen mode, Supabase → web_05c_mock_supabase.mjs (MOCK_MODE=ok)
//   ERROR=http://127.0.0.1:5176  same, Supabase → mock in MOCK_MODE=error
//   FROZEN=http://127.0.0.1:5173 dev server in frozen design mode (same policy as the Vercel Preview)
// The live content is SYNTHETIC test content served by the mock; it is never shipped.
import { chromium } from "playwright";
import assert from "node:assert/strict";

const LIVE = process.env.LIVE ?? "http://127.0.0.1:5175";
const ERROR = process.env.ERROR ?? "http://127.0.0.1:5176";
const FROZEN = process.env.FROZEN ?? "http://127.0.0.1:5173";
const exe = process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const hp = process.env.HTTPS_PROXY ? new URL(process.env.HTTPS_PROXY) : null;
const browser = await chromium.launch({
  executablePath: exe,
  env: { ...process.env, HTTP_PROXY: "", HTTPS_PROXY: "", http_proxy: "", https_proxy: "" },
  args: hp ? [`--proxy-server=https=${hp.host}`] : [],
});

const results = [];
async function run(name, fn, { mobile = false, locale = "ar", base = LIVE } = {}) {
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
    const r = await page.goto(base + path, { waitUntil: "networkidle", timeout: 90000 });
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
const attr = (page, sel, a) => page.locator(sel).first().getAttribute(a);
const noHorizontalScroll = async (page) =>
  assert.ok(
    // مقارنة بعرض الجهاز المضبوط لا بـ innerWidth: محاكي الجوال يوسّع innerWidth مع المحتوى فيخفي التجاوز.
    (await page.evaluate(() => document.documentElement.scrollWidth)) <= page.viewportSize().width + 1,
    "horizontal overflow",
  );

await run("research index: published items newest first, undated last", async (page, go) => {
  await go("/preview/web-v1/research");
  assert.equal(await attr(page, "[data-research-count]", "data-research-count"), "3");
  const order = await page
    .locator("[data-research-card]")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-research-card")));
  assert.deepEqual(order, ["synthetic-research-1", "synthetic-research-2", "synthetic-research-3"]);
  await page.locator('[data-filter="sort"]').selectOption("oldest");
  await page.waitForURL(/sort=oldest/);
  assert.equal(
    await attr(page, "[data-research-card]", "data-research-card"),
    "synthetic-research-2",
  );
});

await run("research search, sector and tag filters, reset, shareable URL", async (page, go) => {
  await go("/preview/web-v1/research");
  await page.locator("[data-research-input]").fill("٢");
  await page.waitForFunction(
    () => document.querySelector("[data-research-count]")?.getAttribute("data-research-count") === "1",
  );
  await page.locator("[data-research-reset]").click();
  await page.locator('[data-filter="sector"]').selectOption("test-sector-a");
  await page.waitForFunction(
    () => document.querySelector("[data-research-count]")?.getAttribute("data-research-count") === "2",
  );
  await go("/preview/web-v1/research?tag=tag-a");
  assert.equal(await attr(page, "[data-research-count]", "data-research-count"), "2");
  await go("/preview/web-v1/research?q=zzzz");
  await page.locator('[data-library-state="empty"]').waitFor();
});

await run("reader: TOC jumps to sections, table, lists, references (unsafe ref is text)", async (page, go) => {
  await go("/preview/web-v1/research");
  await page.locator('[data-research-card="synthetic-research-1"]').click();
  await page.waitForURL(/\/research\/synthetic-research-1/);
  // التنقل داخل التطبيق: انتظر انتهاء التحميل (هيكل التحميل يسبق المقال).
  await page.locator("[data-article-section]").first().waitFor();
  assert.equal(await page.locator("[data-article-section]").count(), 4);
  await page.locator('[data-toc] [data-toc-link="s-table"]').click();
  await page.waitForURL(/#s-table/);
  assert.ok(await page.locator("[data-article-table] table").isVisible());
  assert.equal(await page.locator("[data-reference]").count(), 4);
  assert.equal(await page.locator('[data-reference] a[href^="https://example.com/"]').count(), 2);
  assert.equal(await page.locator('[data-reference] a[href^="javascript"]').count(), 0);
  await page.locator('[data-company-link-state="none"]').waitFor();
});

await run("reader: related research by sector/tag; tag and sector links filter the index", async (page, go) => {
  await go("/preview/web-v1/research/synthetic-research-1");
  const related = await page
    .locator("[data-related] [data-research-card]")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-research-card")));
  assert.deepEqual(related.sort(), ["synthetic-research-2", "synthetic-research-3"]);
  await page.locator('[data-tag-link="tag-b"]').click();
  await page.waitForURL(/tag=tag-b/);
  assert.equal(await attr(page, "[data-research-count]", "data-research-count"), "1");
  await go("/preview/web-v1/research/synthetic-research-1");
  await page.locator("[data-sector-research]").click();
  await page.waitForURL(/sector=test-sector-a/);
});

await run("reader: missing metadata is not invented; no sections/references shown as states", async (page, go) => {
  await go("/preview/web-v1/research/synthetic-research-3");
  await page.locator('[data-library-state="empty"]').waitFor();
  await page.locator("[data-references-empty]").waitFor();
  // لا تاريخ في رأس البحث (البطاقات ذات الصلة لها تواريخها).
  assert.equal(await page.locator(".night-panel time").count(), 0);
  await go("/preview/web-v1/research/synthetic-research-2");
  const header = await page.locator(".night-panel").first().innerText();
  assert.doesNotMatch(header, /دقائق قراءة|min read/);
});

await run(
  "English UI: LTR; Arabic-only section flagged and kept RTL; coverage notice",
  async (page, go) => {
    await go("/preview/web-v1/research/synthetic-research-1");
    assert.equal(await page.evaluate(() => document.documentElement.dir), "ltr");
    assert.equal(await attr(page, "[data-language-coverage]", "data-language-coverage"), "7/9");
    const s = page.locator('[data-article-section="s-arabic-only"]');
    assert.equal(await s.getAttribute("dir"), "rtl");
    assert.equal(await s.locator("[data-lang-fallback]").count(), 1);
  },
  { locale: "en" },
);

await run("not found: unknown slug shows a state with a way back", async (page, go) => {
  await go("/preview/web-v1/research/does-not-exist");
  await page.locator('[data-library-state="not_found"]').waitFor();
  await go("/preview/web-v1/knowledge/does-not-exist");
  await page.locator('[data-library-state="not_found"]').waitFor();
});

await run("knowledge directory: grouped by source category; uncategorised kept apart", async (page, go) => {
  await go("/preview/web-v1/knowledge");
  assert.equal(await attr(page, "[data-knowledge-count]", "data-knowledge-count"), "4");
  const groups = await page
    .locator("[data-knowledge-group]")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-knowledge-group")));
  assert.deepEqual(groups, ["test-category-a", "test-category-b", "uncategorized"]);
});

await run("knowledge: category and level filters, search, reset", async (page, go) => {
  await go("/preview/web-v1/knowledge");
  await page.locator('[data-chip="category-test-category-a"]').click();
  await page.waitForURL(/category=test-category-a/);
  assert.equal(await attr(page, "[data-knowledge-count]", "data-knowledge-count"), "2");
  await page.locator('[data-chip="level-beginner"]').click();
  assert.equal(await attr(page, "[data-knowledge-count]", "data-knowledge-count"), "1");
  await page.locator("[data-knowledge-reset]").click();
  await page.locator("[data-knowledge-input]").fill("٣");
  await page.waitForFunction(
    () => document.querySelector("[data-knowledge-count]")?.getAttribute("data-knowledge-count") === "1",
  );
  await page.locator("[data-knowledge-input]").fill("zzzz");
  await page.locator('[data-library-state="empty"]').waitFor();
});

await run("knowledge topic: sections, videos (link only when given), related topics, back to category", async (page, go) => {
  await go("/preview/web-v1/knowledge");
  await page.locator('[data-knowledge-card="synthetic-topic-1"]').click();
  await page.waitForURL(/\/knowledge\/synthetic-topic-1/);
  await page.locator("[data-article-section]").first().waitFor();
  assert.equal(await page.locator("[data-article-section]").count(), 2);
  assert.equal(await page.locator("[data-video]").count(), 2);
  assert.equal(await page.locator("[data-video-no-link]").count(), 1);
  const related = await page
    .locator("[data-related] [data-knowledge-card]")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-knowledge-card")));
  assert.deepEqual(related, ["synthetic-topic-2"]);
  await page.locator("[data-category-link]").click();
  await page.waitForURL(/category=test-category-a/);
  await go("/preview/web-v1/knowledge/synthetic-topic-4");
  await page.locator("[data-related-empty]").waitFor();
});

await run("shell: header Research/Knowledge open the new pages", async (page, go) => {
  await go("/preview/web-v1");
  await page.locator('header a[href="/preview/web-v1/research"]').click();
  await page.waitForURL(/\/preview\/web-v1\/research/);
  await page.locator('header a[href="/preview/web-v1/knowledge"]').click();
  await page.waitForURL(/\/preview\/web-v1\/knowledge/);
});

await run(
  "frozen preview: research and knowledge declare 'unavailable' (no invented content)",
  async (page, go) => {
    for (const p of [
      "/preview/web-v1/research",
      "/preview/web-v1/research/synthetic-research-1",
      "/preview/web-v1/knowledge",
      "/preview/web-v1/knowledge/synthetic-topic-1",
    ]) {
      await go(p);
      await page.locator('[data-library-state="unavailable"]').waitFor();
      assert.equal(await page.locator("[data-research-card], [data-knowledge-card]").count(), 0);
    }
  },
  { base: FROZEN },
);

await run(
  "source error: explicit error state with retry, no substitute content",
  async (page, go) => {
    await go("/preview/web-v1/research");
    await page.locator('[data-library-state="error"][role="alert"]').waitFor();
    assert.equal(await page.locator("[data-retry]").count(), 1);
    await go("/preview/web-v1/knowledge/synthetic-topic-1");
    await page.locator('[data-library-state="error"]').waitFor();
  },
  { base: ERROR },
);

for (const path of [
  "/preview/web-v1/research",
  "/preview/web-v1/research/synthetic-research-1",
  "/preview/web-v1/knowledge",
  "/preview/web-v1/knowledge/synthetic-topic-1",
])
  await run(
    `mobile 390px: no page-level horizontal scroll — ${path}`,
    async (page, go) => {
      await go(path);
      await noHorizontalScroll(page);
      assert.ok(await page.locator("[data-mobile-tabbar]").isVisible());
    },
    { mobile: true },
  );

await run(
  "mobile reader: collapsible contents; wide table scrolls inside itself",
  async (page, go) => {
    await go("/preview/web-v1/research/synthetic-research-1");
    assert.equal(await page.locator("[data-toc]").isVisible(), false);
    await page.locator("[data-toc-toggle]").click();
    await page.locator('[data-toc-mobile] [data-toc-link="s-lists"]').click();
    await page.waitForURL(/#s-lists/);
    const box = await page
      .locator("[data-article-table] > div")
      .evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth, ox: getComputedStyle(el).overflowX }));
    assert.equal(box.ox, "auto");
  },
  { mobile: true, locale: "en" },
);

await browser.close();
for (const r of results) console.log(r.join("  "));
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
