import { test, expect } from "bun:test";
import { fixture, reviewedFixture } from "./synthetic";
import { appendReview, evaluate, ContextSchema, ClaimSchema } from "./contract";

// A numeric claim with an additional cited page, proved by a genuine server-side
// fact receipt. That supporting fact is not a numeric input/output of this claim.
function sourceReceiptFixture() {
  const x = fixture();
  const source = structuredClone(x.claim.sources[0]!);
  source.locator.page = 2;
  x.claim.sources.push(source);
  const proof = structuredClone(x.context.facts[0]!);
  proof.ref = { id: "server-page-two-proof", version: 1, sha256: "2".repeat(64) };
  proof.identity.metric = "operating_profit";
  proof.evidence = source;
  x.context.facts.push(proof);
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

test("R1: baseline source-only receipt is actually required and can authorize page two", () => {
  const x = sourceReceiptFixture();
  expect(ClaimSchema.safeParse(x.claim).success).toBe(true);
  expect(ContextSchema.safeParse(x.context).success).toBe(true);
  expect(evaluate(x.claim, x.context).technical).toBe("eligible");
  x.context.facts.pop();
  expect(evaluate(x.claim, x.context).reasons).toContain("document_reference_mismatch");
});

test("R1: replacing a source locator verification receipt invalidates prior approval", () => {
  const x = approve(sourceReceiptFixture());
  expect(evaluate(x.claim, x.context).publication).toBe("eligible");
  const pinnedBasis = x.context.events[0]!.basisDigest;
  x.context.facts[1]!.verification!.reportSha256 = "9".repeat(64);
  const result = evaluate(x.claim, x.context);
  console.log(`R1/unbound-receipt-replaced: ${JSON.stringify({ pinnedBasis, result })}`);
  expect(result.publication).toBe("blocked");
});

test("R1: finance approval cannot precede required source locator receipt", () => {
  const x = sourceReceiptFixture();
  x.context.facts[1]!.verification!.reviewedAt = "2026-03-05T00:00:00.000Z";
  expect(evaluate(x.claim, x.context).technical).toBe("eligible");
  expect(() =>
    appendReview(
      x.claim,
      x.context,
      "financial_review",
      "synthetic-finance",
      "2026-03-03T00:00:00.000Z",
      "f".repeat(64),
    ),
  ).toThrow();
});

test("R1: replay cannot use a source locator receipt created after both approvals", () => {
  const x = approve(sourceReceiptFixture());
  x.context.facts[1]!.verification!.reviewedAt = "2026-03-05T00:00:00.000Z";
  const result = evaluate(x.claim, x.context);
  console.log(`R1/unbound-receipt-late: ${JSON.stringify(result)}`);
  expect(result.publication).toBe("blocked");
});

test("control: rejected locator receipt is not accepted as proof", () => {
  const x = sourceReceiptFixture();
  x.context.facts[1]!.financial = "rejected";
  expect(evaluate(x.claim, x.context).technical).toBe("ineligible");
});

test("control: source proof from future evaluation time is blocked", () => {
  const x = sourceReceiptFixture();
  x.context.facts[1]!.verification!.reviewedAt = "2026-03-06T00:00:00.000Z";
  expect(evaluate(x.claim, x.context).technical).toBe("ineligible");
});

test("control: explicit trusted locator registry supports the second page without fact fallback", () => {
  const x = sourceReceiptFixture();
  x.context.documents[0]!.verifiedLocators.push(structuredClone(x.claim.sources[1]!.locator));
  x.context.facts.pop();
  expect(evaluate(x.claim, x.context).technical).toBe("eligible");
  expect(evaluate(approve(x).claim, x.context).publication).toBe("eligible");
});

test("control: future withheld successor leaves old as-of unchanged, then invalidates", () => {
  const x = reviewedFixture();
  const old = evaluate(x.claim, x.context);
  const next = structuredClone(x.context.facts[0]!);
  next.ref.version = 2;
  next.ref.sha256 = "3".repeat(64);
  next.supersedes = structuredClone(x.context.facts[0]!.ref);
  next.availability = "withheld";
  next.evidence.publishedAt = "2026-03-06T00:00:00.000Z";
  x.context.facts.push(next);
  expect(evaluate(x.claim, x.context)).toEqual(old);
  x.context.asOf = x.context.evaluatedAt = "2026-03-07T00:00:00.000Z";
  expect(evaluate(x.claim, x.context).reasons).toContain("fact_superseded_asof");
});

test("control: unrelated receipt changes do not invalidate an unrelated claim", () => {
  const x = reviewedFixture();
  const other = structuredClone(x.context.facts[0]!);
  other.ref.id = "unrelated";
  other.identity.metric = "unrelated_metric";
  x.context.facts.push(other);
  other.verification!.reportSha256 = "4".repeat(64);
  expect(evaluate(x.claim, x.context).publication).toBe("eligible");
});

test("control: bound source certificate replacement invalidates and fresh approvals recover", () => {
  const x = reviewedFixture();
  x.context.facts[0]!.verification!.reportSha256 = "5".repeat(64);
  expect(evaluate(x.claim, x.context).publication).toBe("blocked");
  x.context.evaluatedAt = "2026-03-07T00:00:00.000Z";
  x.context.events = appendReview(
    x.claim,
    x.context,
    "financial_review",
    "synthetic-finance",
    "2026-03-06T00:00:00.000Z",
    "f".repeat(64),
  );
  x.context.events = appendReview(
    x.claim,
    x.context,
    "editorial_approve",
    "synthetic-editor",
    "2026-03-07T00:00:00.000Z",
    "f".repeat(64),
  );
  expect(evaluate(x.claim, x.context).publication).toBe("eligible");
});

test("control: stale basis can be withdrawn but cannot revive after withdrawal", () => {
  const x = reviewedFixture();
  x.context.facts[0]!.verification!.reportSha256 = "6".repeat(64);
  x.context.events = appendReview(
    x.claim,
    x.context,
    "withdraw",
    "synthetic-author",
    "2026-03-05T00:00:00.000Z",
    "f".repeat(64),
  );
  expect(evaluate(x.claim, x.context).workflow).toBe("Withdrawn");
  expect(() =>
    appendReview(
      x.claim,
      x.context,
      "financial_review",
      "synthetic-finance",
      "2026-03-05T00:00:00.000Z",
      "f".repeat(64),
    ),
  ).toThrow();
});

test("control: caller-only locator is blocked even after trusted doc locator list exists", () => {
  const x = fixture();
  x.context.documents[0]!.verifiedLocators.push({ page: 2, table: null, anchor: null });
  x.claim.sources[0]!.locator.page = 999;
  x.claim.bindings[0]!.evidence.locator.page = 999;
  expect(evaluate(x.claim, x.context).publication).toBe("blocked");
  expect(evaluate(x.claim, x.context).reasons).toContain("document_reference_mismatch");
});
