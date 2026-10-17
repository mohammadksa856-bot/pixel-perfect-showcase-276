/**
 * WEB-08B05 — قارئ تجربة البحث الخاص. ليس مسارًا في التطبيق ولا API، ولا يُبنى مع الموقع.
 *
 * بوابة الحماية:
 * - يستمع على 127.0.0.1 فقط؛ أي عنوان آخر يُرفض قبل الاستماع.
 * - يقبل ترويسة Host لـ127.0.0.1 أو localhost بالمنفذ نفسه فقط (يمنع DNS rebinding) → 421.
 * - GET وHEAD فقط → 405. ثلاثة مسارات: الصفحة، والأنماط، والخطوط المسماة. غير ذلك 404.
 * - CSP بلا سكربت ولا نماذج ولا موارد خارجية؛ noindex وno-store وnosniff وno-referrer.
 * - APP_BASE (روابط تحليل الشركة) يُقبل على loopback فقط (قاعدة B03).
 *   bun research-evidence/aramco-research-experience/server.ts  → http://127.0.0.1:4466/?lang=ar
 */
import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { pathToFileURL } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { safeAppBase } from "../aramco-disclosures/demo";
import { buildCss, FONT_FILES, fontPath } from "./assets";
import { UI, type Lang } from "./copy";
import { buildExperience } from "./model";
import { ResearchExperience } from "./ui";

export const HOST = "127.0.0.1";
export const PORT = 4466;

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy":
    "default-src 'none'; script-src 'none'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Cross-Origin-Opener-Policy": "same-origin",
};

export function renderPage(l: Lang, appBase: string): string {
  const x = buildExperience();
  const base = safeAppBase(appBase);
  const body = renderToStaticMarkup(createElement(ResearchExperience, { x, l, base }));
  const dir = l === "ar" ? "rtl" : "ltr";
  return `<!doctype html><html lang="${l}" dir="${dir}" class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer"><title>${
    l === "ar"
      ? "أرامكو — تجربة بحث خاصة (مسودة محجوبة)"
      : "Aramco — private research experience (withheld draft)"
  }</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/assets/experience.css"></head><body class="min-h-screen bg-background text-foreground antialiased" data-lang="${l}" data-draft="${UI.draftBanner.en}">${body}</body></html>`;
}

const hostAllowed = (req: IncomingMessage, port: number) =>
  [`${HOST}:${port}`, `localhost:${port}`].includes(String(req.headers.host ?? "").toLowerCase());

export async function createExperienceServer(
  appBase = process.env["APP_BASE"] ?? "http://127.0.0.1:5173",
): Promise<Server & { listenLocal: (port?: number) => Promise<number> }> {
  if (!safeAppBase(appBase))
    throw Error("unsafe_app_base: only http(s) loopback origins are allowed");
  const css = await buildCss();
  const pages: Record<Lang, string> = {
    ar: renderPage("ar", appBase),
    en: renderPage("en", appBase),
  };
  const server = createServer((req, res) => {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
    const port = (server.address() as AddressInfo).port;
    if (!hostAllowed(req, port)) {
      res.writeHead(421, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Misdirected request: loopback host only");
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
      res.end("Read-only private reader");
      return;
    }
    const u = new URL(req.url ?? "/", `http://${HOST}`);
    const send = (type: string, body: string | Buffer) => {
      res.writeHead(200, { "Content-Type": type });
      res.end(req.method === "HEAD" ? undefined : body);
    };
    if (u.pathname === "/")
      return send(
        "text/html; charset=utf-8",
        pages[u.searchParams.get("lang") === "en" ? "en" : "ar"],
      );
    if (u.pathname === "/assets/experience.css") return send("text/css; charset=utf-8", css);
    const font = /^\/assets\/fonts\/([a-z0-9-]+\.woff2)$/.exec(u.pathname)?.[1];
    if (font && FONT_FILES.includes(font)) return send("font/woff2", readFileSync(fontPath(font)));
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found (private reader: one page)");
  });
  return Object.assign(server, {
    /** الاستماع على loopback فقط. */
    listenLocal: (port = PORT) =>
      new Promise<number>((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, HOST, () => resolve((server.address() as AddressInfo).port));
      }),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const s = await createExperienceServer();
  const port = await s.listenLocal(Number(process.env["PORT"] ?? PORT));
  console.log(`Private research experience (local only): http://${HOST}:${port}/?lang=ar`);
}
