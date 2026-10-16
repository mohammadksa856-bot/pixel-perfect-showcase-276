import { test, expect } from "bun:test";
import { appendReview, evaluate } from "./contract";
import { fixture, reviewedFixture } from "./synthetic";
test("F3: caller-claimed locator with no registry or fact receipt remains blocked", () => {
  const x = fixture();
  x.claim.sources[0]!.locator.page = 999;
  x.claim.bindings[0]!.evidence.locator.page = 999;
  expect(evaluate(x.claim, x.context).reasons).toContain("document_reference_mismatch");
  expect(evaluate(x.claim, x.context).publication).toBe("blocked");
});
test("F2: same-time replacement of verification certificate invalidates old review basis", () => {
  const x = reviewedFixture();
  x.context.facts[0]!.verification!.reportSha256 = "3".repeat(64);
  expect(evaluate(x.claim, x.context)).toMatchObject({
    workflow: "Invalidated",
    publication: "blocked",
  });
  expect(evaluate(x.claim, x.context).reasons).toContain("financial_review_basis_changed");
});
test("F2: explicit fresh financial and editorial approvals may follow certificate change", () => {
  const x = reviewedFixture();
  x.context.facts[0]!.verification!.reportSha256 = "3".repeat(64);
  x.context.facts[0]!.verification!.reviewedAt = "2026-03-05T00:00:00.000Z";
  x.context.evaluatedAt = "2026-03-07T00:00:00.000Z";
  x.context.events = appendReview(
    x.claim,
    x.context,
    "financial_review",
    "synthetic-finance",
    "2026-03-06T00:00:00.000Z",
    "f".repeat(64),
  );
  expect(evaluate(x.claim, x.context).workflow).toBe("FinanciallyReviewed");
  x.context.events = appendReview(
    x.claim,
    x.context,
    "editorial_approve",
    "synthetic-editor",
    "2026-03-07T00:00:00.000Z",
    "f".repeat(64),
  );
  expect(evaluate(x.claim, x.context).publication).toBe("eligible");
  expect(x.context.events).toHaveLength(4);
});
test("source change does not prevent an explicit withdrawal of the stale claim", () => {
  const x = reviewedFixture();
  x.context.documents[0]!.originalArtifactVerified = false;
  x.context.events = appendReview(
    x.claim,
    x.context,
    "withdraw",
    "synthetic-author",
    "2026-03-05T00:00:00.000Z",
    "f".repeat(64),
  );
  expect(evaluate(x.claim, x.context)).toMatchObject({
    workflow: "Withdrawn",
    publication: "blocked",
  });
});
