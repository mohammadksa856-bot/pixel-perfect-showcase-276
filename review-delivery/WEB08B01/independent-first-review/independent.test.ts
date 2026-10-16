import { test, expect } from "bun:test";
import { fixture, reviewedFixture } from "../work/review/research-evidence/v1/synthetic";
import { appendReview, evaluate, ClaimSchema, ContextSchema } from "../work/review/research-evidence/v1/contract";
import { resolveTrail } from "../work/review/research-evidence/v1/adapter";
import { renderPoc } from "../work/review/research-evidence/v1/poc";

// Negative specifications: the failures are independent reproductions, not accepted behavior.
for (const mode of ["withheld", "unavailable", "ineligible", "changed-identity"] as const) {
  test(`F1: superseded old fact stays blocked when replacement is ${mode}`, () => {
    const x = reviewedFixture();
    const next = structuredClone(x.context.facts[0]!);
    next.ref = { id: next.ref.id, version: 2, sha256: "1".repeat(64) };
    next.supersedes = structuredClone(x.context.facts[0]!.ref);
    if (mode === "withheld" || mode === "unavailable") next.availability = mode;
    if (mode === "ineligible") next.technical = "ineligible";
    if (mode === "changed-identity") next.identity.scope = "standalone";
    x.context.facts.push(next);
    expect(ContextSchema.safeParse(x.context).success).toBe(true);
    const result = evaluate(x.claim, x.context);
    console.log(`F1/${mode}: ${JSON.stringify(result)}`);
    expect(result.publication).toBe("blocked");
  });
}

test("F2: finance approval cannot predate independent fact verification", () => {
  const x = reviewedFixture();
  x.context.facts[0]!.verification!.reviewedAt = "2026-03-05T00:00:00.000Z";
  const result = evaluate(x.claim, x.context);
  console.log(`F2/replay: ${JSON.stringify(result)}`);
  expect(result.publication).toBe("blocked");
});

test("F2: appendReview must reject a backdated approval before certification", () => {
  const x = fixture();
  x.context.facts[0]!.verification!.reviewedAt = "2026-03-05T00:00:00.000Z";
  expect(() => appendReview(x.claim, x.context, "financial_review", "synthetic-finance",
    "2026-03-03T00:00:00.000Z", "f".repeat(64))).toThrow();
});

test("F3: two locators in the same original document can both be evidenced", () => {
  const x = fixture();
  const source = structuredClone(x.claim.sources[0]!);
  source.locator.page = 2;
  x.claim.sources.push(source);
  const b = structuredClone(x.claim.bindings[0]!);
  b.id = "context-on-second-page"; b.role = "context";
  b.fact = { id: "other-fact", version: 1, sha256: "2".repeat(64) };
  b.expected.metric = "operating_profit"; b.evidence = source;
  x.claim.bindings.push(b);
  const f = structuredClone(x.context.facts[0]!);
  f.ref = b.fact; f.identity = b.expected; f.evidence = source;
  x.context.facts.push(f);
  expect(ClaimSchema.safeParse(x.claim).success).toBe(true);
  expect(ContextSchema.safeParse(x.context).success).toBe(true);
  const result = evaluate(x.claim, x.context);
  console.log(`F3/one-document: ${JSON.stringify(result)}`);
  // One document registry entry should serve all locators in that immutable document.
  expect(result.technical).toBe("eligible");
});

test("F3: duplicating the document registry per locator is rejected", () => {
  const x = fixture();
  const doc = structuredClone(x.context.documents[0]!);
  doc.evidence.locator.page = 2;
  x.context.documents.push(doc);
  expect(ContextSchema.safeParse(x.context).success).toBe(false);
});

for (const field of ["start", "kind", "unit", "currency", "scope", "dimensions"] as const) {
  test(`independent control: resolver ${field} mismatch blocks`, () => {
    const x = reviewedFixture(); const i = x.context.facts[0]!.identity;
    if (field === "start") i.period.start = "2025-02-01";
    if (field === "kind") i.period.kind = "ytd";
    if (field === "unit") i.unit = "SAR/share";
    if (field === "currency") i.currency = "USD";
    if (field === "scope") i.scope = "standalone";
    if (field === "dimensions") i.dimensions = { segment: "x" };
    expect(evaluate(x.claim, x.context).publication).toBe("blocked");
  });
}

test("independent control: conflict result is invariant to source ordering", () => {
  const x = reviewedFixture(); const other = structuredClone(x.context.facts[0]!);
  other.ref.id = "conflicting"; other.valueDigest = "7".repeat(64);
  x.context.facts.push(other);
  const first = evaluate(x.claim, x.context);
  x.context.facts.reverse();
  expect(first.publication).toBe("blocked");
  expect(first.reasons).toContain("source_conflict");
  expect(evaluate(x.claim, x.context)).toEqual(first);
});

test("independent control: future reissue does not leak into old as-of", () => {
  const x = reviewedFixture(); const original = evaluate(x.claim, x.context);
  const doc = structuredClone(x.context.documents[0]!);
  doc.evidence.document.version = 2; doc.evidence.document.sha256 = "8".repeat(64);
  doc.evidence.publishedAt = "2026-03-06T00:00:00.000Z";
  doc.supersedes = structuredClone(x.claim.sources[0]!.document);
  x.context.documents.push(doc);
  expect(evaluate(x.claim, x.context)).toEqual(original);
  x.context.asOf = x.context.evaluatedAt = "2026-03-07T00:00:00.000Z";
  expect(evaluate(x.claim, x.context).publication).toBe("blocked");
});

test("independent control: unauthorized certificate, rights and edited text block", () => {
  for (const mode of ["certificate", "rights", "edit"]) {
    const x = reviewedFixture();
    if (mode === "certificate") x.context.facts[0]!.verification!.reviewerId = "synthetic-editor";
    if (mode === "rights") x.context.grants[0]!.reviewerId = "synthetic-finance";
    if (mode === "edit") x.claim.body.text += " changed";
    expect(evaluate(x.claim, x.context).publication).toBe("blocked");
  }
});

test("independent control: withheld binding produces no trail", async () => {
  const x = reviewedFixture(); x.context.facts[0]!.availability = "withheld";
  const r = await resolveTrail(x.claim, { resolveContext: async () => x.context }, x.context.asOf, x.context.evaluatedAt);
  expect(r.trail).toEqual([]);
});

test("independent direct-render journey plus wrong hash/version and withholding", async () => {
  const x = reviewedFixture(); const ref = x.claim.bindings[0]!.fact;
  const valid = `/marefa-data?id=${ref.id}&version=${ref.version}&sha256=${ref.sha256}`;
  for (const route of ["/intelligence", "/evidence", valid]) {
    const r = await renderPoc(route); expect(r.status).toBe(200);
    expect(r.body).toContain("SYNTHETIC LOCAL TEST ONLY");
  }
  for (const route of [valid.replace("version=1", "version=2"), valid.replace(ref.sha256, "0".repeat(64)), `${valid}&state=withheld`]) {
    const r = await renderPoc(route); expect(r.status).toBe(404);
    expect(r.body).not.toContain('data-original'); expect(r.body).not.toContain('123');
  }
  expect((await renderPoc("/evidence?state=withheld")).body).not.toContain('href="/marefa-data');
});
