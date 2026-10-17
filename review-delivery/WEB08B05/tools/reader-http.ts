// HTTP checks of the running private reader (127.0.0.1:4466) and of non-loopback reachability.
import { request } from "node:http";
import { networkInterfaces } from "node:os";
const port = 4466;
const go = (path: string, o: { method?: string; host?: string; address?: string } = {}) =>
  new Promise<{ status: number; h: Record<string, unknown>; len: number }>((res, rej) => {
    const r = request({ host: o.address ?? "127.0.0.1", port, path, method: o.method ?? "GET", headers: { host: o.host ?? `127.0.0.1:${port}` }, timeout: 3000 }, (x) => {
      let n = 0; x.on("data", (c) => (n += c.length)); x.on("end", () => res({ status: x.statusCode!, h: x.headers, len: n }));
    });
    r.on("error", rej); r.on("timeout", () => r.destroy(new Error("timeout"))); r.end();
  });
for (const p of ["/?lang=ar", "/?lang=en", "/assets/experience.css", "/assets/fonts/cairo-arabic-700-normal.woff2", "/api", "/api/research", "/assets/fonts/../model.ts", "/assets/fonts/LICENSE-Cairo-OFL.txt", "/preview/web-v1/companies/2222/research"]) {
  const r = await go(p); console.log(`GET ${p} -> ${r.status} (${r.len} bytes)`);
}
for (const m of ["POST", "PUT", "DELETE", "OPTIONS"]) console.log(`${m} / -> ${(await go("/", { method: m })).status}`);
console.log(`HEAD /?lang=en -> ${(await go("/?lang=en", { method: "HEAD" })).status} body ${(await go("/?lang=en", { method: "HEAD" })).len}`);
for (const h of [`evil.example:${port}`, "127.0.0.1", `localhost:${port}`]) console.log(`Host ${h} -> ${(await go("/", { host: h })).status}`);
const r = await go("/");
for (const k of ["content-security-policy", "x-robots-tag", "cache-control", "x-content-type-options", "referrer-policy", "x-frame-options", "cross-origin-resource-policy"]) console.log(`${k}: ${r.h[k]}`);
for (const a of Object.values(networkInterfaces()).flat().filter((x) => x && !x.internal && x.family === "IPv4").map((x) => x!.address)) {
  try { await go("/", { address: a }); console.log(`non-loopback ${a}:${port} -> REACHABLE (BAD)`); } catch (e) { console.log(`non-loopback ${a}:${port} -> refused (${(e as Error).message.split(" ")[0]})`); }
}
const html = await (await fetch(`http://127.0.0.1:${port}/?lang=ar`)).text();
console.log(`paragraph cards: ${(html.match(/data-paragraph="/g) || []).length}; analyses BLOCKED: ${(html.match(/data-analysis="[^"]+" data-status="BLOCKED"/g) || []).length}; projects: ${(html.match(/data-project="/g) || []).length}; topics: ${(html.match(/data-topic="/g) || []).length}; <script|<form|style=: ${(html.match(/<script|<form|\sstyle="/g) || []).length}`);
