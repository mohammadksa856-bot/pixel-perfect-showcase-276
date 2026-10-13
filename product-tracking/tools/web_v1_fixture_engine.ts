// WEB-V1 design review: a local engine stand-in that serves FROZEN engine responses, so the real P02
// server path (FINENGINE_API_URL + X-API-Key) can render screens without the live engine or Supabase.
//
// What it serves (nothing is invented):
//   /v1/companies/SA/{sym}/page  → tests/fixtures/p02/engine-b70254e_page_SA-{sym}.json.gz (engine b70254e)
//                                  + data_quality.factory_readiness from tests/fixtures/web-v1/factory-b70254e.json.gz
//                                    (the engine's own factory evaluator, same commit) when the engine produced one.
//                                    8010 has none (absent from the bundled engine DB), so it stays absent.
//   /v1/companies/SA/{sym}       → { industry } from the same page
//   /v1/companies/SA/{sym}/peers → tests/fixtures/engine-b70254e_peers_SA-*.json (engine b70254e)
//
// Usage: FIXTURE_ENGINE_KEY=local bun product-tracking/tools/web_v1_fixture_engine.ts [port]
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const root = new URL("../../tests/fixtures/", import.meta.url);
const gz = (p: string) => JSON.parse(gunzipSync(readFileSync(new URL(p, root))).toString());
const factory = gz("web-v1/factory-b70254e.json.gz").companies as Record<string, { readiness_state?: string }>;
const PEERS: Record<string, string> = {
  "1120": "engine-b70254e_peers_SA-1120_banks.json",
  "2222": "engine-b70254e_peers_SA-2222_default.json",
  "8010": "engine-b70254e_peers_SA-8010_ordinary.json",
};
const key = process.env["FIXTURE_ENGINE_KEY"] ?? "local";
const port = Number(process.argv[2] ?? 8787);

function page(sym: string) {
  const p = gz(`p02/engine-b70254e_page_SA-${sym}.json.gz`);
  const f = factory[`sa:${sym}`];
  if (f?.readiness_state) p.data_quality.factory_readiness = f;
  return p;
}

Bun.serve({
  port,
  hostname: "127.0.0.1",
  fetch(req) {
    if (req.headers.get("X-API-Key") !== key) return new Response("unauthorized", { status: 401 });
    const m = new URL(req.url).pathname.match(/^\/v1\/companies\/SA\/([0-9]{4})(\/page|\/peers)?$/);
    if (!m || !PEERS[m[1]!]) return Response.json({ error: "not_found" }, { status: 404 });
    const sym = m[1]!;
    if (m[2] === "/page") return Response.json(page(sym));
    if (m[2] === "/peers") return Response.json(JSON.parse(readFileSync(new URL(PEERS[sym]!, root), "utf8")));
    return Response.json({ industry: page(sym).company.industry });
  },
});
console.log(`fixture engine on http://127.0.0.1:${port}`);
