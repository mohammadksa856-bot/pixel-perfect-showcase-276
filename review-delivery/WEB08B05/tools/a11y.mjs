// WEB-08B05 accessibility, RTL and keyboard audit of the private reader (axe-core 4.10.2, Chromium).
// The page CSP forbids every script; this audit context sets bypassCSP so axe can be injected. Test-only.
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
const [OUT, SHA] = process.argv.slice(2);
const axe = readFileSync(process.env.AXE ?? new URL("./node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", env: { ...process.env, HTTP_PROXY: "", HTTPS_PROXY: "" } });
const results = [];
for (const [lang, w, h] of [["ar", 1440, 900], ["en", 1440, 900], ["ar", 390, 844], ["en", 390, 844]]) {
  const m = w < 800;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m, bypassCSP: true });
  const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:4466/?lang=${lang}`, { waitUntil: "networkidle" });
  await p.addScriptTag({ content: axe });
  const ax = await p.evaluate(async () => {
    // open every disclosure so its content is audited too
    for (const d of document.querySelectorAll("details")) d.open = true;
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
    return { violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) })), passes: r.passes.length, incomplete: r.incomplete.map((v) => ({ id: v.id, nodes: v.nodes.length })) };
  });
  const rtl = await p.evaluate((lang) => {
    const html = document.documentElement;
    const arabicBlocks = [...document.querySelectorAll('[lang="ar"][dir="rtl"]')];
    const codes = [...document.querySelectorAll("code[dir=ltr], bdi[dir=ltr]")];
    return {
      htmlLang: html.lang, htmlDir: html.dir, computedDir: getComputedStyle(html).direction,
      arabicBlocksRtl: arabicBlocks.every((e) => getComputedStyle(e).direction === "rtl"), arabicBlocks: arabicBlocks.length,
      ltrCodes: codes.length, ltrCodesLtr: codes.every((e) => getComputedStyle(e).direction === "ltr"),
      tocStart: (() => { const n = document.querySelector("[data-toc-aside]"); const c = document.querySelector("main"); if (!n || !c || getComputedStyle(document.querySelector("nav[aria-label]") || n).display === "none") return "n/a"; const a = n.getBoundingClientRect(), z = c.getBoundingClientRect(); return lang === "ar" ? (a.left > z.left ? "toc-right(start)" : "toc-left") : (a.left < z.left ? "toc-left(start)" : "toc-right"); })(),
      sw: html.scrollWidth, cw: html.clientWidth,
    };
  }, lang);
  // keyboard: first Tab lands on the skip link, which targets #content; summaries are reachable
  await p.reload({ waitUntil: "networkidle" });
  await p.keyboard.press("Tab");
  const first = await p.evaluate(() => ({ href: document.activeElement?.getAttribute("href"), visible: document.activeElement?.getBoundingClientRect().width > 1 }));
  const focusables = await p.evaluate(() => [...document.querySelectorAll("a[href], summary, [tabindex]:not([tabindex='-1'])")].length);
  const summaryFocus = await p.evaluate(() => { const s = document.querySelector("[data-evidence] summary"); s.focus(); return document.activeElement === s; });
  results.push({ lang, viewport: w, axe: ax, rtl, keyboard: { firstTab: first, focusables, summaryFocusable: summaryFocus } });
  await ctx.close();
}
await b.close();
writeFileSync(OUT, JSON.stringify({ sha: SHA, tool: "axe-core 4.10.2 via Playwright Chromium; bypassCSP in the audit context only", note: "Automated aid, not a WCAG conformance claim. All <details> opened before the audit.", results }, null, 1) + "\n");
for (const r of results) console.log(r.lang, r.viewport, "violations", JSON.stringify(r.axe.violations.map((v) => `${v.id}:${v.impact}:${v.nodes}`)), "rtl", JSON.stringify(r.rtl), "kbd", JSON.stringify(r.keyboard));
