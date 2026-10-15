// WEB-06 (D11): reflow at 320 CSS px (WCAG 1.4.10) on the affected pages; frozen server on :5173.
import { chromium } from "playwright";
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  env: { ...process.env, HTTP_PROXY: "", HTTPS_PROXY: "" },
});
const P = "/preview/web-v1";
const pages = [
  P,
  `${P}/companies/2222?tab=business`,
  `${P}/companies/2222?tab=shareholders`,
  `${P}/companies/2222?tab=financials`,
  `${P}/companies/1120?tab=coverage`,
  `${P}/markets/saudi/main`,
  `${P}/sectors`,
  `${P}/sectors/financials`,
  `${P}/search?q=1120`,
];
const out = [];
for (const locale of ["ar", "en"])
  for (const path of pages) {
    const ctx = await b.newContext({ viewport: { width: 320, height: 640 } });
    await ctx.addInitScript((l) => localStorage.setItem("mi.locale", l), locale);
    const p = await ctx.newPage();
    await p.goto("http://127.0.0.1:5173" + path, { waitUntil: "networkidle" });
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    out.push({ locale, path, viewport: 320, scrollWidth: sw, ok: sw <= 320 });
    await ctx.close();
  }
console.log(JSON.stringify(out, null, 1));
await b.close();
