// Builds src/lib/engine/publication-baseline.json: the identity hashes (no values) of every financial row in the
// accepted frozen fixtures, using the gate's own factIdentity/factKey. The fixtures are the sha-pinned files of
// build/design-fixtures.ts; their hashes are checked first. Usage: bun review-delivery/ARAMCO95/PROJECTION/build_baseline.ts
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { factIdentity, factKey } from "../../../src/lib/engine/publication-gate.server";

const SHA: Record<string, string> = {
  "2222": "e98863c41faf85069a4562b0d330a77f49863979bc3fb78502912ced5d95c936",
  "1120": "39c5373abf96399e2e4c23c3728b78c9c2179520544d1053fd6dddface1f0606",
  "8010": "c0652cc6da3142745513d1acd959753724a9ce0f7a4674e3f37b81df3378108a",
};
const keys = new Set<string>();
let rows = 0;
const incomplete: string[] = [];
for (const [symbol, sha] of Object.entries(SHA)) {
  const raw = gunzipSync(readFileSync(new URL(`../../../tests/fixtures/codex-20261013/${symbol}-page.json.gz`, import.meta.url)));
  if (createHash("sha256").update(raw).digest("hex") !== sha) throw new Error(`fixture hash mismatch ${symbol}`);
  const page = JSON.parse(raw.toString("utf8"));
  const cid = page.company.company_id as string;
  const fin = page.sections.financials as Record<string, any>;
  const containers = [
    ...Object.entries(fin).filter(([k]) => k !== "history").map(([, v]) => v),
    ...Object.values(fin.history ?? {}).flatMap((h: any) => h?.periods ?? []),
  ];
  for (const c of containers)
    for (const [metric, list] of Object.entries((c?.metrics ?? {}) as Record<string, any[]>))
      for (const r of list) {
        rows++;
        const id = factIdentity(cid, metric, r);
        if (!id) incomplete.push(`${cid}:${metric}:${r.period_end}`);
        else keys.add(factKey(id));
      }
}
const out = {
  schema: "marefa-publication-baseline/1",
  basis: "Identities of every financial row in the accepted frozen fixtures tests/fixtures/codex-20261013 (sha-pinned); hashes only, no values",
  fixtures: SHA,
  identity_fields: ["company_id", "metric", "period_kind", "period_start", "period_end", "scope", "dimensions", "currency", "unit", "version", "source_key", "value"],
  rows,
  incomplete_identity_rows: incomplete.length,
  keys: [...keys].sort(),
};
writeFileSync(new URL("../../../src/lib/engine/publication-baseline.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify({ rows, unique: keys.size, incomplete: incomplete.length, sample: incomplete.slice(0, 5) }));
