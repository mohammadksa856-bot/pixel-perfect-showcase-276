// WEB-08B05 screenshots of the private reader, desktop 1440 and mobile 390, Arabic and English.
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
const [OUT, SHA, MEASURE] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", env: { ...process.env, HTTP_PROXY: "", HTTPS_PROXY: "" } });
const SHOTS = [
  ["hero", null], ["overview-map", "overview-map"], ["drivers", "overview-drivers"], ["projects-summary", "overview-projects"],
  ["business-downstream", "business-downstream"], ["projects-targets", "projects-targets"], ["relations", "projects-relations"],
  ["analysis-dividends", "analysis-fa-dividends"], ["risks-interpretations", "risks-interpretations"], ["risks-gaps", "risks-gaps"],
  ["topics", "topics"], ["evidence-open", "p-up-volumes"],
];
const images = [], measures = [];
for (const [view, w, h] of [["desktop", 1440, 900], ["mobile", 390, 844], ["narrow", 340, 800], ["narrow320", 320, 800]]) for (const lang of ["ar", "en"]) {
  const m = view !== "desktop";
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (c) => c.type() === "error" && errs.push(c.text()));
  const r = await p.goto(`http://127.0.0.1:4466/?lang=${lang}`, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  measures.push({ view, lang, cw: await p.evaluate(() => document.documentElement.clientWidth), sw: await p.evaluate(() => document.documentElement.scrollWidth), errors: errs.length });
  if (view === "desktop" || view === "mobile") {
    const list = view === "mobile" ? [...SHOTS, ["toc-open", "toc-mobile"]] : SHOTS;
    for (const [id, anchor] of list) {
      if (id === "evidence-open") await p.evaluate(() => { document.querySelector('[data-evidence="up-volumes"]').open = true; });
      if (id === "toc-open") await p.evaluate(() => { document.querySelector("[data-toc-mobile]").open = true; });
      await p.evaluate((a) => {
        document.documentElement.style.scrollBehavior = "auto";
        const el = a === "toc-mobile" ? document.querySelector("[data-toc-mobile]") : a ? document.getElementById(a) : null;
        window.scrollTo(0, el ? el.getBoundingClientRect().top + window.scrollY - 70 : 0);
      }, anchor);
      await p.waitForTimeout(120);
      const file = `${OUT}/${view}-${lang}-${id}.jpg`;
      await p.screenshot({ path: file, type: "jpeg", quality: 80 });
      images.push({ path: file.slice(OUT.length + 1), sha256: createHash("sha256").update(readFileSync(file)).digest("hex"), application_sha: SHA, route: `private loopback reader http://127.0.0.1:4466/?lang=${lang}`, part: id, anchor, locale: lang, viewport: `${view} ${w}x${h}`, http: r.status(), page_scroll_width: await p.evaluate(() => document.documentElement.scrollWidth), page_errors: errs.length, data_mode: "B04_ACCEPTED_PACK_UNAPPROVED_WITHHELD_DRAFT" });
    }
  }
  await ctx.close();
}
await b.close();
writeFileSync(`${OUT}/IMAGE_MANIFEST.json`, JSON.stringify({ batch: "WEB-08B05 private research experience (local only, not published)", images }, null, 1) + "\n");
writeFileSync(MEASURE, `# private reader layout @ ${SHA} (Chromium; clientWidth vs scrollWidth; page errors)\n` + measures.map((x) => JSON.stringify(x)).join("\n") + "\n");
console.log(images.length, "images;", JSON.stringify(measures));
