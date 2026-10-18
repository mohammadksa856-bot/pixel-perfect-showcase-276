/* Site layer: build the Aramco page model exactly as the frozen preview does, then list shown / withheld keys. */
import { gunzipSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { buildCompanyPreview } from "../../../src/lib/engine/company-preview";
const raw = JSON.parse(gunzipSync(readFileSync(new URL("../../../tests/fixtures/codex-20261013/2222-page.json.gz", import.meta.url))).toString());
// same rule as design-fixtures.server.ts withholdDerived (frozen preview)
const withhold = (v: any): void => {
  if (!v || typeof v !== "object") return;
  if (Array.isArray(v)) return v.forEach(withhold);
  if (v.is_calculated === true || v.is_calculated === 1) { v.quality_status = "withheld"; v.quality_reasons = ["design_fixture_derivative_not_approved"]; }
  Object.values(v).forEach(withhold);
};
withhold(raw);
const p: any = buildCompanyPreview(raw);
const shapes = new Map<string, number>();
const shown = new Map<string, Set<string>>(), withheld = new Map<string, Set<string>>();
const add = (m: Map<string, Set<string>>, k: string, where: string) => (m.get(k) ?? m.set(k, new Set()).get(k)!).add(where);
const walk = (v: any, path: string) => {
  if (!v || typeof v !== "object") return;
  if (Array.isArray(v)) return v.forEach((x, i) => walk(x, path));
  if (typeof v.key === "string") {
    const sig = Object.keys(v).sort().join(",");
    shapes.set(sig, (shapes.get(sig) ?? 0) + 1);
    if ("proof" in v && "value" in v) add(shown, v.key, path);
    else if ("reason" in v || "withheld" in v) add(withheld, v.key, path);
  }
  for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
};
walk(p, "p");
console.log([...shapes].map(([s, n]) => `${n}x ${s}`).join("\n"));
writeFileSync(process.argv[2], JSON.stringify({ shown: Object.fromEntries([...shown].map(([k, s]) => [k, [...s]])), withheld: Object.fromEntries([...withheld].map(([k, s]) => [k, [...s]])), topLevel: Object.keys(p) }, null, 1));
console.log("shown keys", shown.size, "withheld keys", withheld.size, Object.keys(p));
// statement rows, facts, ownership/actions/documents
const st: Record<string, { shown: number; withheld: number; empty: number }> = {};
const facts: string[] = [];
const walk2 = (v: any) => {
  if (!v || typeof v !== "object") return;
  if (Array.isArray(v)) return v.forEach(walk2);
  if (typeof v.key === "string" && Array.isArray(v.cells) && "section" in v) {
    const s = (st[v.key] ??= { shown: 0, withheld: 0, empty: 0 });
    for (const c of v.cells) { if (!c) s.empty++; else if (c.state === "value" || c.value !== undefined && c.proof) s.shown++; else if (c.state === "withheld" || c.reason) s.withheld++; else s.empty++; }
  }
  if (typeof v.key === "string" && "text" in v && "sourceUrl" in v) facts.push(v.key);
  Object.values(v).forEach(walk2);
};
walk2(p);
const cellStates = new Set<string>();
const w3 = (v: any) => { if (!v || typeof v !== "object") return; if (Array.isArray(v)) return v.forEach(w3); if (Array.isArray(v.cells)) v.cells.forEach((c: any) => cellStates.add(c ? Object.keys(c).sort().join(",") + "|" + (c.state ?? "") : "null")); Object.values(v).forEach(w3); };
w3(p);
console.log("cell shapes", [...cellStates]);
const out = JSON.parse(readFileSync(process.argv[2], "utf8"));
out.statements = st; out.facts = facts;
out.ownership = (raw.sections.ownership ?? []).length; out.actions = (raw.sections.corporate_actions ?? []).length; out.disclosures = (raw.sections.disclosures ?? []).length;
writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log("statement rows", Object.keys(st).length, "facts", facts.length);
