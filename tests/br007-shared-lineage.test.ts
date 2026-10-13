import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import banks from "./fixtures/engine-b70254e_peers_SA-1120_banks.json";
import { hasReproducedInputs } from "../src/lib/engine/calculation-evidence";
import { buildPeerTable } from "../src/lib/engine/peer-comparison";
import { withUnitTestLineage } from "./peer-lineage-fixture";
import { buildCompanyPreview, type EnginePage } from "../src/lib/engine/company-preview";

test("legacy calculated peer ratios cannot produce cells, medians or ranking",()=>{
  const table=buildPeerTable(structuredClone(banks),"bank");
  expect(table.status).toBe("unavailable");
  expect(table.columns).toEqual([]);
  expect(table.withheld.some(row=>row.reason==="calculated_inputs_not_reproduced")).toBe(true);
});
test("a boolean alone or empty/malformed consumed inputs never proves reproduction",()=>{
  const raw=withUnitTestLineage(banks);
  const proof=Object.values(raw.companies[0]!.metrics)[0]!.provenance!.derivation!.lineage!;
  expect(hasReproducedInputs(proof)).toBe(true); // synthetic eligibility branch, not numeric proof
  expect(hasReproducedInputs({...proof,consumed_inputs:[]})).toBe(false);
  expect(hasReproducedInputs({...proof,consumed_inputs:[{}]})).toBe(false);
  expect(hasReproducedInputs({...proof,status:"unverified_record"})).toBe(false);
  expect(hasReproducedInputs({...proof,evidence_sha256:null})).toBe(false);
});
test("unapproved non-null legacy readiness scores are suppressed",()=>{
  const raw=JSON.parse(gunzipSync(readFileSync(new URL("./fixtures/p02/engine-b70254e_page_SA-2222.json.gz",import.meta.url))).toString()) as EnginePage;
  expect(raw.data_quality.understanding.total_score).not.toBeNull();
  const result=buildCompanyPreview(raw);
  expect(result.readiness.score).toBeNull();
  expect(result.readiness.target).toBeNull();
  expect(result.topics.every(topic=>topic.score===null)).toBe(true);
});
test("empty input evidence blocks metrics, history and segment paths without promoting insurance",()=>{
  const raw=JSON.parse(gunzipSync(readFileSync(new URL("./fixtures/codex-20261013/8010-page.json.gz",import.meta.url))).toString());
  function tamper(value: unknown): void {
    if(!value||typeof value!=="object")return;
    const row=value as Record<string,unknown>;
    const p=row.provenance as {derivation?: {lineage?: {consumed_inputs?: unknown[]}}}|undefined;
    if(p?.derivation?.lineage) p.derivation.lineage.consumed_inputs=[];
    for(const item of Object.values(row))tamper(item);
  }
  tamper(raw);
  const result=buildCompanyPreview(raw);
  const cells=result.topics.flatMap(t=>t.blocks).flatMap(b=>b.type==='metrics'?b.group.cells:[]);
  expect(cells.some(cell=>cell.proof.kind==='calculated_inputs_reproduced')).toBe(false);
  expect(cells.every(cell=>cell.proof.independentlyVerified===false)).toBe(true);
  expect(result.dataNotices.length).toBeGreaterThan(0);
});
