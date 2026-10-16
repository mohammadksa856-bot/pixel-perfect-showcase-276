import { test, expect } from "bun:test";
import { fixture } from "./synthetic";
import { appendReview, evaluate, ClaimSchema, ContextSchema } from "./contract";

function withProofs(ids = ["proof-a"]) {
  const x = fixture();
  const source = structuredClone(x.claim.sources[0]!);
  source.locator.page = 2;
  x.claim.sources.push(source);
  for (const id of ids) {
    const proof = structuredClone(x.context.facts[0]!);
    proof.ref = { id, version: 1, sha256: "2".repeat(64) };
    proof.identity.metric = "operating_profit";
    proof.evidence = structuredClone(source);
    x.context.facts.push(proof);
  }
  return x;
}
function approve(x: ReturnType<typeof fixture>) {
  x.context.events = appendReview(
    x.claim,
    x.context,
    "financial_review",
    "synthetic-finance",
    "2026-03-03T00:00:00.000Z",
    "f".repeat(64),
  );
  x.context.events = appendReview(
    x.claim,
    x.context,
    "editorial_approve",
    "synthetic-editor",
    "2026-03-04T00:00:00.000Z",
    "f".repeat(64),
  );
  return x;
}

test("ASCII proof selection is stable when context facts are reordered", () => {
  const x = approve(withProofs(["proof-z", "proof-a"]));
  const before = evaluate(x.claim, x.context);
  expect(before.publication).toBe("eligible");
  x.context.facts.reverse();
  expect(evaluate(x.claim, x.context)).toEqual(before);
});

test("D1: distinct schema-valid Unicode proof refs have an order independent selection", () => {
  // Unicode collation equates these IDs, but canonical JSON and RefSchema do not.
  const ids = ["proof-\u00e9", "proof-e\u0301"];
  expect(ids[0]).not.toBe(ids[1]);
  expect(ids[0]!.localeCompare(ids[1]!)).toBe(0);
  const x = withProofs(ids);
  expect(ClaimSchema.safeParse(x.claim).success).toBe(true);
  expect(ContextSchema.safeParse(x.context).success).toBe(true);
  approve(x);
  const before = evaluate(x.claim, x.context);
  expect(before.publication).toBe("eligible");
  x.context.facts.reverse();
  const after = evaluate(x.claim, x.context);
  console.log(`D1/Unicode-order: ${JSON.stringify({ ids, before, after })}`);
  expect(after).toEqual(before);
});

test("selection pins proof-a rather than nonselected proof-z", () => {
  const x = approve(withProofs(["proof-z", "proof-a"]));
  const other = x.context.facts.find((f) => f.ref.id === "proof-z")!;
  other.verification!.reportSha256 = "3".repeat(64);
  expect(evaluate(x.claim, x.context).publication).toBe("eligible");
  x.context.facts.find((f) => f.ref.id === "proof-a")!.verification!.reportSha256 = "4".repeat(64);
  expect(evaluate(x.claim, x.context).publication).toBe("blocked");
});

for (const mode of [
  "delete",
  "withhold",
  "unavailable",
  "ineligible",
  "rejected",
  "unreviewed",
  "no-certificate",
  "unknown-reviewer",
  "author-reviewer",
  "role-revoked",
  "future",
  "prepublication",
] as const) {
  test(`selected locator receipt ${mode} blocks previous approval`, () => {
    const x = approve(withProofs());
    const proof = x.context.facts[1]!;
    if (mode === "delete") x.context.facts.pop();
    if (mode === "withhold") proof.availability = "withheld";
    if (mode === "unavailable") proof.availability = "unavailable";
    if (mode === "ineligible") proof.technical = "ineligible";
    if (mode === "rejected") proof.financial = "rejected";
    if (mode === "unreviewed") proof.financial = "unreviewed";
    if (mode === "no-certificate") proof.verification = null;
    if (mode === "unknown-reviewer") proof.verification!.reviewerId = "missing-actor";
    if (mode === "author-reviewer") {
      x.context.actors.find((a) => a.id === x.claim.authorId)!.roles.push("financial_reviewer");
      proof.verification!.reviewerId = x.claim.authorId;
    }
    if (mode === "role-revoked")
      x.context.actors.find((a) => a.id === "synthetic-finance")!.roles = [];
    if (mode === "future") proof.verification!.reviewedAt = "2026-03-06T00:00:00.000Z";
    if (mode === "prepublication") proof.verification!.reviewedAt = "2026-02-28T00:00:00.000Z";
    expect(evaluate(x.claim, x.context).publication).toBe("blocked");
  });
}

test("a different valid proof does not silently inherit the old receipt's approval", () => {
  const x = approve(withProofs(["proof-a", "proof-z"]));
  x.context.facts = x.context.facts.filter((f) => f.ref.id !== "proof-a");
  const result = evaluate(x.claim, x.context);
  expect(result.technical).toBe("eligible");
  expect(result.publication).toBe("blocked");
  expect(result.reasons).toContain("financial_review_basis_changed");
});

test("adding a lexically prior receipt requires fresh approval", () => {
  const x = approve(withProofs(["proof-z"]));
  const prior = structuredClone(x.context.facts[1]!);
  prior.ref.id = "proof-a";
  x.context.facts.push(prior);
  expect(evaluate(x.claim, x.context).publication).toBe("blocked");
});

test("an unrelated fact certificate mutation does not change the verdict", () => {
  const x = approve(withProofs());
  const before = evaluate(x.claim, x.context);
  const unrelated = structuredClone(x.context.facts[1]!);
  unrelated.ref.id = "unrelated";
  unrelated.evidence.locator.page = 3;
  unrelated.verification!.reportSha256 = "5".repeat(64);
  x.context.facts.push(unrelated);
  expect(evaluate(x.claim, x.context)).toEqual(before);
});

test("registered locator does not depend on an unused alternate fact receipt", () => {
  const x = withProofs();
  x.context.documents[0]!.verifiedLocators.push(structuredClone(x.claim.sources[1]!.locator));
  approve(x);
  x.context.facts[1]!.verification!.reportSha256 = "6".repeat(64);
  expect(evaluate(x.claim, x.context).publication).toBe("eligible");
});
