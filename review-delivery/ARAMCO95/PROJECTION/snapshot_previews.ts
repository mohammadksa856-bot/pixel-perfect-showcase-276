// Writes the frozen-path CompanyPreview, Overview and Intelligence models for the three fixtures to one JSON file,
// so the output before and after a change can be compared byte for byte.
// Usage: bun review-delivery/ARAMCO95/PROJECTION/snapshot_previews.ts <out.json>
import { mock } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
const fx = (s: string) =>
  JSON.parse(gunzipSync(readFileSync(new URL(`../../../tests/fixtures/codex-20261013/${s}-page.json.gz`, import.meta.url))).toString());
const pages = Object.fromEntries(["2222", "1120", "8010"].map((s) => [s, fx(s)]));
mock.module("virtual:marefa-design-fixtures", () => ({ default: pages }));
const { frozenDesignPreview } = await import("../../../src/lib/web-v1/design-fixtures.server");
const { buildOverview, intelGroups } = await import("../../../src/lib/web-v1/company-experience");
const out: Record<string, unknown> = {};
for (const s of Object.keys(pages)) {
  const r = frozenDesignPreview({ market: "SA", symbol: s });
  if (r.state !== "ok") throw new Error(`${s}: ${r.state}`);
  out[s] = { preview: r.preview, overview: buildOverview(r.preview), intelligence: intelGroups(r.preview) };
}
writeFileSync(process.argv[2]!, JSON.stringify(out, (_k, v) => (v instanceof Map ? [...v] : v)));
console.log("ok", Object.keys(out));
