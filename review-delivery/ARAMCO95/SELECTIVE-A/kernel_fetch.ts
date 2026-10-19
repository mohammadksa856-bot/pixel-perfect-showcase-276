// Calls the integrated kernel's server function fetchCompanyPreview against a real engine HTTP API with the given
// environment (flag on, approvals file per scenario) and real fetch, then writes the serialized result.
// Usage: bun review-delivery/ARAMCO95/SELECTIVE-A/kernel_fetch.ts <env.json> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { fetchCompanyPreview } from "../../../src/lib/engine/company-preview.server";

const [envPath, outPath] = process.argv.slice(2) as [string, string];
const env = JSON.parse(readFileSync(envPath, "utf8"));
const r = await fetchCompanyPreview({ market: "SA", symbol: "2222" }, env);
writeFileSync(outPath, JSON.stringify(r));
const cells = r.state === "ok" ? r.preview.statements.flatMap((v) => v.rows.flatMap((x) => x.cells)) : [];
console.log(JSON.stringify({ state: r.state, value_cells: cells.filter((c) => c.state === "value").length, cells: cells.length }));
