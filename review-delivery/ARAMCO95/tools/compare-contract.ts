import { readFileSync } from "node:fs";
import { FACTORY_CONTRACT_SPEC as M } from "../../../src/lib/web-v1/factory-contract.spec.ts";
const C = JSON.parse(readFileSync(`${process.env.ENGINE}/config/factory/18-category-contract.json`, "utf8"));
const diffs: string[] = [];
const eq = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);
const chk = (where: string, a: any, b: any) => { if (!eq(a, b)) diffs.push(`${where}: mirror=${JSON.stringify(a)} contract=${JSON.stringify(b)}`); };
chk("contract_version", M.source.contract_version, C.contract_version);
chk("overall_threshold", M.overall_completeness_threshold, C.overall_completeness_threshold);
chk("category order", M.categories.map((c: any) => c.key), C.categories.map((c: any) => c.category_key));
for (const m of M.categories as any[]) {
  const c = C.categories.find((x: any) => x.category_key === m.key);
  if (!c) { diffs.push(`${m.key}: missing in contract`); continue; }
  chk(`${m.key}.weight`, m.weight, c.weight);
  chk(`${m.key}.threshold`, m.threshold, c.completeness_threshold);
  chk(`${m.key}.field_groups`, m.field_groups, c.field_groups);
  chk(`${m.key}.official_sources`, m.official_sources, c.official_sources);
  chk(`${m.key}.job_strategy`, m.job_strategy, c.job_strategy);
  chk(`${m.key}.source_cost`, m.source_cost, c.source_cost ?? c.source_cost_profile ?? null);
  chk(`${m.key}.hard_gates`, m.hard_gates, (c.hard_gates ?? []).map((g: any) => g.condition));
  const f = c.freshness_policy ?? {};
  chk(`${m.key}.freshness`, m.freshness, { cadence_kind: f.cadence_kind, recheck_interval_days: f.recheck_interval_days, max_age_before_stale_days: f.max_age_before_stale_days });
  chk(`${m.key}.provenance_fields`, m.provenance_fields, c.provenance_requirements?.mandatory_fields ?? null);
}
console.log(`categories mirror=${M.categories.length} contract=${C.categories.length}; weight sum mirror=${(M.categories as any[]).reduce((s, c) => s + c.weight, 0)} contract=${C.categories.reduce((s: number, c: any) => s + c.weight, 0)}`);
console.log(diffs.length ? diffs.join("\n") : "NO DIFFERENCES in the mirrored fields");
