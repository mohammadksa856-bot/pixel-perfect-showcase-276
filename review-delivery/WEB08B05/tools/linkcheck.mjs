// WEB-08B05: every app link actually emitted by the private reader, opened in Chromium against the local
// vite dev server on the frozen fixture. Metric links must focus the same key inside the same topic;
// topic links must open that topic; data links must open the company data page.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const [OUT, SHA] = process.argv.slice(2);
const html = await (await fetch("http://127.0.0.1:4466/?lang=ar", { headers: { host: "127.0.0.1:4466" } })).text();
const dec = (s) => s.replace(/&amp;/g, "&");
const metric = [...new Map([...html.matchAll(/<a href="http:\/\/127\.0\.0\.1:5173([^"]+)"[^>]*data-metric-link="([^"]+)"/g)].map((m) => [m[2], dec(m[1])])).entries()];
const topics = [...new Map([...html.matchAll(/<a href="http:\/\/127\.0\.0\.1:5173([^"]+)"[^>]*data-topic-app-link="([^"]+)"/g)].map((m) => [m[2], dec(m[1])])).entries()];
const data = [...new Set([...html.matchAll(/<a href="http:\/\/127\.0\.0\.1:5173([^"]+)"[^>]*data-(?:topic-data-link|metric-data-link)="[^"]+"/g)].map((m) => dec(m[1])))];
const notRendered = [...new Set([...html.matchAll(/data-metric-link-state="NOT_RENDERED" data-metric="([^"]+)"/g)].map((m) => m[1]))];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", env: { ...process.env, HTTP_PROXY: "", HTTPS_PROXY: "" } });
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const results = [];
for (const [key, url] of metric) {
  const r = await page.goto(`http://127.0.0.1:5173${url}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const topic = new URL(url, "http://x").searchParams.get("topic");
  const res = await page.evaluate(() => {
    const f = document.querySelector('[data-focused="true"]');
    return { focusedKey: f ? f.getAttribute("data-metric") ?? f.getAttribute("data-row") ?? f.getAttribute("data-fact") : null, focusedTopic: f?.closest("[data-intel-topic]")?.getAttribute("data-intel-topic") ?? null };
  });
  results.push({ kind: "metric", key, url, http: r.status(), ...res, ok: r.status() === 200 && res.focusedKey === key && res.focusedTopic === topic });
}
for (const [key, url] of topics) {
  const r = await page.goto(`http://127.0.0.1:5173${url}`, { waitUntil: "networkidle" });
  const has = await page.evaluate((k) => !!document.querySelector(`[data-intel-topic="${k}"]`), key);
  results.push({ kind: "topic", key, url, http: r.status(), topicSection: has, ok: r.status() === 200 && has });
}
for (const url of data) {
  const r = await page.goto(`http://127.0.0.1:5173${url}`, { waitUntil: "networkidle" });
  const ok = await page.evaluate(() => document.body.innerText.length > 200);
  results.push({ kind: "data", url, http: r.status(), ok: r.status() === 200 && ok });
}
await b.close();
const summary = { metricLinks: metric.length, topicLinks: topics.length, dataLinks: data.length, notRenderedShownAsText: notRendered.length, ok: results.filter((x) => x.ok).length, total: results.length };
writeFileSync(OUT, JSON.stringify({ sha: SHA, method: "Chromium against local vite dev server (frozen fixture); links taken from the rendered private reader page", summary, notRendered, results }, null, 1) + "\n");
console.log(JSON.stringify(summary));
for (const x of results.filter((x) => !x.ok)) console.log("BAD", JSON.stringify(x));
