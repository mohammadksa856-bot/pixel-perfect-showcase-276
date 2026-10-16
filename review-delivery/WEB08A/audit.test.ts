import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
const load = (name: string) => JSON.parse(readFileSync(new URL(name, import.meta.url), "utf8"));
const inventory = load("DISPLAY-INVENTORY.json");
const matrix = load("COVERAGE-MATRIX.json");
const sources = load("SOURCES-AND-DERIVATIONS.json");
test("audit baseline is the accepted exact application SHA", () => {
  expect(inventory.application_sha).toBe("d7d88c19fee626346b12d961f3a539fc31423f1f");
  expect(matrix.application_sha).toBe(inventory.application_sha);
});
test("fixture fingerprint matches exact consumed uncompressed JSON, not a claimed PDF hash", () => {
  const bytes = gunzipSync(
    readFileSync(new URL("../../tests/fixtures/codex-20261013/2222-page.json.gz", import.meta.url)),
  );
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    inventory.fixture_uncompressed_sha256,
  );
  expect(inventory.fixture_uncompressed_sha256).toBe(
    "e98863c41faf85069a4562b0d330a77f49863979bc3fb78502912ced5d95c936",
  );
});
test("all original investor18 mapped exactly once to five groups", () => {
  expect(matrix.topics.map((t: any) => t.ordinal)).toEqual(
    Array.from({ length: 18 }, (_, i) => i + 1),
  );
  expect(inventory.groups).toHaveLength(5);
  const ordinals = inventory.groups
    .flatMap((g: any) => g.ordinals)
    .sort((a: number, b: number) => a - b);
  expect(ordinals).toEqual(matrix.topics.map((t: any) => t.ordinal));
  expect(new Set(matrix.topics.map((t: any) => t.key)).size).toBe(18);
});
test("no invented readiness score or false financial certificate", () => {
  expect(
    matrix.topics.every(
      (t: any) => t.numeric_readiness_score === null && t.observed_readiness === "not_measured",
    ),
  ).toBe(true);
  const c = inventory.topics
    .flatMap((t: any) => t.blocks)
    .flatMap((b: any) => b.cells ?? (b.type === "segments" ? b.rows : []));
  expect(c).toHaveLength(50);
  expect(c.every((r: any) => r.proof.independentlyVerified === false)).toBe(true);
});
test("observed data presence is separate from completeness", () => {
  expect(
    inventory.topics.filter((t: any) => t.shownCount === 0).map((t: any) => t.ordinal),
  ).toEqual([10, 11, 13, 14, 15]);
  expect(inventory.overview.topicsWithData).toBe(13);
  expect(
    matrix.topics.every((t: any) => t.implementation_status === "NOT_STARTED_AUDIT_PROPOSAL_ONLY"),
  ).toBe(true);
});
test("each topic has field requirements, history, source, comparison and acceptance checklist", () => {
  for (const t of matrix.topics) {
    expect(t.required_fields.length).toBeGreaterThan(0);
    expect(t.historical_requirements_and_observed.length).toBeGreaterThan(10);
    expect(t.proposed_completion_criterion.length).toBeGreaterThan(20);
    expect(t.research_structure.length).toBeGreaterThan(20);
    expect(t.comparisons.length).toBeGreaterThan(20);
    expect(t.source_refs.length).toBeGreaterThan(0);
  }
});
test("every proposed/existing source ref resolves without fabricated source URL", () => {
  const ids = new Set([
    ...Object.keys(inventory.source_registry),
    ...Object.keys(sources.candidate_sources),
  ]);
  for (const t of matrix.topics) for (const ref of t.source_refs) expect(ids.has(ref)).toBe(true);
  expect(sources.candidate_sources["CAND-CONSENSUS"].url).toBeNull();
  expect(sources.candidate_sources["CAND-PEERS"].url).toBeNull();
});
test("statement cells and states reconcile to their own presentation denominators", () => {
  const expected: any = { annual: [160, 67, 30, 63], quarter: [8, 6, 2, 0], ytd: [12, 4, 8, 0] };
  for (const v of inventory.statements) {
    expect([
      v.cells.length,
      ...["value", "withheld", "missing"].map(
        (st) => v.cells.filter((c: any) => c.state === st).length,
      ),
    ]).toEqual(expected[v.mode]);
    expect(new Set(v.cells.map((c: any) => `${c.key}|${c.periodEnd}`)).size).toBe(v.cells.length);
  }
});
test("year and quarter labels are not a complete history claim", () => {
  expect(
    inventory.statements.find((v: any) => v.mode === "annual").periods.map((p: any) => p.end),
  ).toEqual(["2025-12-31", "2024-12-31", "2023-12-31", "2022-12-31", "2021-12-31"]);
  expect(inventory.statements.find((v: any) => v.mode === "quarter").periods).toHaveLength(2);
  expect(inventory.statements.find((v: any) => v.mode === "ytd").periods).toHaveLength(1);
});
test("source rows are not miscounted as unique documents", () => {
  const rows = inventory.topics.find((t: any) => t.ordinal === 18).blocks[0].rows;
  expect(rows).toHaveLength(40);
  expect(new Set(rows.map((r: any) => r.sourceUrl)).size).toBe(8);
  const component = readFileSync(
    new URL("../../src/components/engine-preview.tsx", import.meta.url),
    "utf8",
  );
  expect(component).toContain("block.rows.slice(0, 15)");
});
test("routing gaps distinguish stored guidance from missing forecast contract", () => {
  const raw = load("RAW-ROUTING-INVENTORY.json");
  expect(raw.disclosureKeys.filter((r: any) => r.type === "guidance")).toHaveLength(2);
  expect(inventory.topics.find((t: any) => t.ordinal === 13).shownCount).toBe(0);
  expect(raw.snapshots.ttm.status).toBe("unavailable");
});
test("calculation proposal has input gates and does not authorize DCF", () => {
  expect(sources.recipes).toHaveLength(9);
  expect(sources.common_derivation_gate.length).toBeGreaterThan(4);
  expect(sources.recipes.find((r: any) => r.id === "DER-09").status).toBe(
    "DCF_BUILD_BLOCKED_PENDING_INPUT_REVIEW_AND_METHOD_APPROVAL",
  );
});
