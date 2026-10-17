import { expect, test } from "bun:test";
import { bridgeEngineEvidence } from "./bridge";
import { syntheticBridge } from "./synthetic";
import { evaluate } from "../v1/contract";
import { fixture } from "../v1/synthetic";

test("unrequested fact cannot be resolved just because it exists in trusted context", () => {
  const x = syntheticBridge();
  const other = structuredClone(x.context.facts[0]!);
  other.ref = { ...other.ref, id: "synthetic-unrequested" };
  other.identity = { ...other.identity, metric: "synthetic-other-metric" };
  x.context.facts.push(other);
  const result = bridgeEngineEvidence(x);
  expect(result.state).toBe("MAPPED_FOR_CONTRACT_EVALUATION");
  expect(result.context!.facts).toHaveLength(1);
  const { claim } = fixture();
  claim.identity = other.identity;
  claim.bindings[0]!.expected = other.identity;
  claim.bindings[0]!.fact = other.ref;
  expect(evaluate(claim, result.context).reasons).toContain("input_unavailable");
});
test("period end outside knowledge date is blocked by original B01 evaluator", () => {
  const x = syntheticBridge();
  const end = "2027-12-31";
  x.rows[0]!["period_end"] = end;
  x.context.facts[0]!.identity.period.end = end;
  const result = bridgeEngineEvidence(x);
  const { claim } = fixture();
  claim.identity.period.end = end;
  claim.bindings[0]!.expected.period.end = end;
  expect(evaluate(claim, result.context).reasons).toContain("future_actual_period");
  expect(evaluate(claim, result.context).publication).toBe("blocked");
});
test("future-only rows cannot produce context", () => {
  const x = syntheticBridge(),
    at = "2026-03-03T00:00:00.000Z";
  x.context.facts[0]!.evidence.publishedAt = at;
  const provenance = x.rows[0]!["provenance"] as { source: Record<string, unknown> };
  provenance.source["published_at"] = at;
  const result = bridgeEngineEvidence(x);
  expect(result.state).toBe("BLOCKED");
  expect(result.futureRowsExcluded).toBe(1);
  expect(result.issues.map((i) => i.code)).toContain("no_known_rows_mapped");
});
test("same ID/revision with conflicting digest fails schema rather than choose first", () => {
  const x = syntheticBridge(),
    f = structuredClone(x.context.facts[0]!);
  f.ref.sha256 = "c".repeat(64);
  x.context.facts.push(f);
  expect(bridgeEngineEvidence(x).issues[0]!.code).toBe("bridge_contract_invalid");
});
test("unverified alternate page cannot acquire locator proof", () => {
  const x = syntheticBridge();
  x.context.documents[0]!.evidence.locator.page = 8;
  const result = bridgeEngineEvidence(x);
  expect(result.issues.map((i) => i.code)).toContain("locator_not_verified_in_document");
  expect(result.context).toBeNull();
});
test("verified alternate locator works without rewriting document's primary page", () => {
  const x = syntheticBridge();
  x.context.documents[0]!.verifiedLocators = [
    structuredClone(x.context.facts[0]!.evidence.locator),
  ];
  x.context.documents[0]!.evidence.locator.page = 8;
  expect(bridgeEngineEvidence(x).state).toBe("MAPPED_FOR_CONTRACT_EVALUATION");
});
test("impossible evaluation date rejected without rollover", () => {
  const x = syntheticBridge();
  x.context.evaluatedAt = "2026-02-30T00:00:00.000Z";
  expect(bridgeEngineEvidence(x).issues[0]!.code).toBe("bridge_contract_invalid");
});
test("empty engine result is not complete or a fallback to context facts", () => {
  const x = syntheticBridge();
  x.rows = [];
  const result = bridgeEngineEvidence(x);
  expect(result.state).toBe("BLOCKED");
  expect(result.context).toBeNull();
});
test("source withdrawal after evaluation does not rewrite historical result", () => {
  const x = syntheticBridge();
  x.sourceWithdrawals.push({
    document: x.context.documents[0]!.evidence.document,
    withdrawnAt: "2026-03-06T00:00:00.000Z",
    observedAt: "2026-03-06T00:00:00.000Z",
  });
  // A future observation was supplied to this evaluation; reject the input, never silently apply it.
  expect(bridgeEngineEvidence(x).issues.map((i) => i.code)).toContain("withdrawal_time_invalid");
});
