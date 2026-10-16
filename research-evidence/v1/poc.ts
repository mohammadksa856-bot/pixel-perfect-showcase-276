/** Loopback-only synthetic evidence journey. Not imported by the application or public routes. */
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { resolveTrail } from "./adapter";
import { fixture, reviewedFixture, SYNTHETIC_ORIGINAL_DATA } from "./synthetic";

export const escapeHTML = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
  );
const html = (title: string, body: string) =>
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex,nofollow"><title>${escapeHTML(title)}</title><style>body{max-width:65rem;margin:2rem auto;padding:1rem;font:18px system-ui;overflow-wrap:anywhere}a{display:block;margin:1rem 0}pre{white-space:pre-wrap}aside{padding:1rem;border:3px solid #8b3d00}</style><aside>SYNTHETIC LOCAL TEST ONLY — not Aramco, not live, not a financial approval or production release.</aside><h1>${escapeHTML(title)}</h1>${body}</html>`;
export async function renderPoc(path: string): Promise<{ status: number; body: string }> {
  const u = new URL(path, "http://127.0.0.1");
  const state = u.searchParams.get("state") === "withheld" ? "withheld" : "reviewed";
  const x = state === "withheld" ? fixture() : reviewedFixture();
  if (state === "withheld") x.context.facts[0]!.availability = "withheld";
  const trail = await resolveTrail(
    x.claim,
    { resolveContext: async () => x.context },
    x.context.asOf,
    x.context.evaluatedAt,
  );
  const binding = trail.trail[0];
  if (u.pathname === "/intelligence")
    return {
      status: 200,
      body: html(
        "Synthetic Company Intelligence",
        `<p>${escapeHTML(x.claim.body.text)}</p><p data-state>${escapeHTML(trail.verdict.workflow)} / ${escapeHTML(trail.verdict.publication)}</p>${binding ? '<a href="/evidence">Inspect claim evidence</a>' : "<p data-blocked>Evidence trail blocked; no original-data fallback.</p>"}<a href="/intelligence?state=withheld">Test withheld case</a>`,
      ),
    };
  if (u.pathname === "/evidence")
    return {
      status: 200,
      body: html(
        "Synthetic evidence",
        `<pre data-evidence>${escapeHTML(JSON.stringify(trail, null, 2))}</pre>${binding ? `<a href="/marefa-data?id=${encodeURIComponent(binding.exactRef.id)}&amp;version=${binding.exactRef.version}&amp;sha256=${binding.exactRef.sha256}">Open original synthetic datum in Marefa Data</a>` : "<p data-blocked>No qualified original-data link.</p>"}`,
      ),
    };
  if (u.pathname === "/marefa-data") {
    const ref = x.claim.bindings[0]!.fact;
    const exact =
      u.searchParams.get("id") === ref.id &&
      u.searchParams.get("version") === String(ref.version) &&
      u.searchParams.get("sha256") === ref.sha256;
    if (!exact || !binding)
      return {
        status: 404,
        body: html("Exact synthetic version not available", "No fallback to current/first value."),
      };
    return {
      status: 200,
      body: html(
        "Synthetic Marefa Data original datum",
        `<pre data-original>${escapeHTML(JSON.stringify(SYNTHETIC_ORIGINAL_DATA, null, 2))}</pre><p>Document: ${escapeHTML(binding.document.id)} / version ${binding.document.version}, page ${binding.locator.page}</p><p>Digest ${escapeHTML(binding.document.sha256)}</p><a href="/intelligence">Return to Intelligence</a>`,
      ),
    };
  }
  return { status: 404, body: html("Local synthetic route not found", "No production routes.") };
}
export function createPocServer() {
  return createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
    if (req.method !== "GET") {
      res.writeHead(405);
      res.end("Read-only synthetic test");
      return;
    }
    try {
      const result = await renderPoc(req.url ?? "/");
      res.writeHead(result.status, { "Content-Type": "text/html; charset=utf-8" });
      res.end(result.body);
    } catch {
      res.writeHead(500);
      res.end("Synthetic test error; no fallback");
    }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  createPocServer().listen(4451, "127.0.0.1", () =>
    console.log("Synthetic read-only PoC: http://127.0.0.1:4451/intelligence"),
  );
