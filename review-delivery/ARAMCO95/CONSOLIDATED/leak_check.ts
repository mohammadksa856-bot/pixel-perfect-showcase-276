// Leak check for a future ingestion: an engine /page from a disposable copy (after a candidate sync) goes through the
// site's live publication gate and preview builder from the Financial Projection candidate, and the serialized
// result is searched for each candidate value. Local only; the committed trust store is used as is (empty).
// Usage: bun <worktree>/review-delivery/ARAMCO95/CONSOLIDATED/leak_check.ts <worktree> <page.json> <markers.json> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [tree, pagePath, markersPath, outPath] = process.argv.slice(2) as [string, string, string, string];
const { applyPublicationGate } = await import(join(tree, "src/lib/engine/publication-gate.server.ts"));
const { buildCompanyPreview, contractProblems } = await import(join(tree, "src/lib/engine/company-preview.ts"));
const page = JSON.parse(readFileSync(pagePath, "utf8"));
const markers: { id: string; needle: string }[] = JSON.parse(readFileSync(markersPath, "utf8"));
const raw = JSON.stringify(page);
const problems = contractProblems(page);
const gated = applyPublicationGate(page, null, { mode: "live_engine" });
const preview = problems.length ? null : buildCompanyPreview(gated.page);
const served = JSON.stringify(preview);
const out = {
  contract_problems: problems,
  gate_summary: gated.summary,
  markers: markers.map((m) => ({ ...m, in_engine_page: raw.includes(m.needle), in_served_preview: served.includes(m.needle) })),
};
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify({ leaks: out.markers.filter((m) => m.in_served_preview).map((m) => m.id) }));
