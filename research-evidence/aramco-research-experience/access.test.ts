// WEB-08B05 — protection gate: the withheld draft is reachable only from loopback, read-only, and is not
// part of the public app (no route, no import, nothing in src/).
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { request } from "node:http";
import { networkInterfaces } from "node:os";
import { join } from "node:path";
import { buildCss } from "./assets";
import { REPO_ROOT, pathSegments } from "./paths";
import { createExperienceServer, HOST, SECURITY_HEADERS } from "./server";

let server: Awaited<ReturnType<typeof createExperienceServer>>;
let port = 0;
beforeAll(async () => {
  server = await createExperienceServer("http://127.0.0.1:5173");
  port = await server.listenLocal(0);
});
afterAll(() => server.close());

const get = (path: string, opts: { method?: string; host?: string; address?: string } = {}) =>
  new Promise<{
    status: number;
    headers: Record<string, string | string[] | undefined>;
    body: string;
  }>((resolve, reject) => {
    const req = request(
      {
        host: opts.address ?? HOST,
        port,
        path,
        method: opts.method ?? "GET",
        headers: { host: opts.host ?? `${HOST}:${port}` },
        timeout: 3000,
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode!, headers: res.headers, body }));
      },
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.end();
  });

describe("loopback only", () => {
  test("the server is bound to 127.0.0.1", () => {
    expect((server.address() as { address: string }).address).toBe("127.0.0.1");
  });
  test("it is not reachable on any non-loopback interface address", async () => {
    const addrs = Object.values(networkInterfaces())
      .flat()
      .filter((a) => a && !a.internal && a.family === "IPv4")
      .map((a) => a!.address);
    for (const a of addrs) await expect(get("/", { address: a })).rejects.toThrow();
  });
  test("a non-loopback Host header is refused (DNS rebinding)", async () => {
    for (const h of [
      `evil.example:${port}`,
      `192.168.0.10:${port}`,
      "127.0.0.1",
      `127.0.0.1:${port + 1}`,
    ])
      expect((await get("/", { host: h })).status).toBe(421);
    expect((await get("/", { host: `localhost:${port}` })).status).toBe(200);
  });
  test("an unsafe APP_BASE is refused at startup", async () => {
    await expect(createExperienceServer("https://example.com")).rejects.toThrow(/unsafe_app_base/);
  });
});

describe("read-only, one page, no API", () => {
  test("only GET and HEAD", async () => {
    for (const m of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
      expect((await get("/", { method: m })).status).toBe(405);
    const head = await get("/?lang=en", { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(head.body).toBe("");
  });
  test("anything but the page, its stylesheet and its named fonts is 404", async () => {
    for (const p of [
      "/api",
      "/api/research",
      "/index.html",
      "/model.ts",
      "/assets/",
      "/assets/fonts/",
      "/assets/fonts/../model.ts",
      "/assets/fonts/%2e%2e%2fmodel.ts",
      "/assets/fonts/LICENSE-Cairo-OFL.txt",
      "/assets/fonts/missing.woff2",
      "/preview/web-v1/companies/2222",
    ])
      expect({ p, s: (await get(p)).status }).toEqual({ p, s: 404 });
    expect((await get("/assets/experience.css")).status).toBe(200);
    expect((await get("/assets/fonts/cairo-arabic-400-normal.woff2")).status).toBe(200);
  });
  test("security headers on every response, including errors", async () => {
    for (const p of ["/", "/assets/experience.css", "/nope"]) {
      const r = await get(p);
      for (const [k, v] of Object.entries(SECURITY_HEADERS))
        expect(r.headers[k.toLowerCase()]).toBe(v);
    }
    const csp = SECURITY_HEADERS["Content-Security-Policy"]!;
    expect(csp).toContain("script-src 'none'");
    expect(csp).toContain("connect-src 'none'");
    expect(csp).not.toContain("unsafe-inline");
    expect(csp).not.toMatch(/https?:/);
  });
  test("the page is marked as a withheld draft and noindex", async () => {
    const r = await get("/?lang=ar");
    expect(r.body).toContain('<meta name="robots" content="noindex,nofollow,noarchive">');
    expect(r.body).toContain("data-banner");
  });
});

describe("design parity: the site's own tokens and fonts, self-hosted", () => {
  test("stylesheet is compiled from src/styles.css", async () => {
    const css = await buildCss();
    for (const token of [
      "--background",
      "--card",
      "--brand",
      "--status-withheld",
      "--status-target",
      "night-panel",
      "section-title",
    ])
      expect(css).toContain(token);
    expect(css).toContain('font-family:"Cairo"');
    expect(css).toContain('font-family:"IBM Plex Sans Arabic"');
    expect(css).not.toMatch(/url\(https?:/);
  });
});

describe("the withheld draft is not part of the public app", () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  const src = walk(join(REPO_ROOT, "src")).filter((f) => /\.(ts|tsx|js|json|css)$/.test(f));
  const routeFiles = src.filter((f) => pathSegments(f).includes("routes"));
  test("no app source imports the research pack or this experience", () => {
    expect(src.length).toBeGreaterThan(50);
    // the walk must find real files, not pass on an empty or wrong root
    expect(src.some((f) => pathSegments(f).slice(-3).join("/") === "src/routes/__root.tsx")).toBe(
      true,
    );
    for (const f of src) {
      const t = readFileSync(f, "utf8");
      expect({ f, hit: /aramco-research-(pack|experience)|research-evidence\//.test(t) }).toEqual({
        f,
        hit: false,
      });
    }
  });
  test("no app route serves research pack paragraph text", () => {
    expect(routeFiles.length).toBeGreaterThan(30);
    const routes = routeFiles.map((f) => readFileSync(f, "utf8")).join("\n");
    expect(routes).not.toContain("research-experience");
    expect(routes).not.toContain("السعة القصوى المستدامة هدف للنفط الخام وحده");
  });
});
