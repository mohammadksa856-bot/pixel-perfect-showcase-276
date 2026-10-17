import { expect, test } from "bun:test";
import { createLocalEvidenceResolver } from "./resolver";
import { resolveTrail } from "../v1/adapter";
import { syntheticBridge } from "./synthetic";
import { fixture, reviewedFixture } from "../v1/synthetic";

test("synthetic claim travels through bridge to original evidence/link contract", async () => {
  const input = syntheticBridge(),
    { claim, context } = reviewedFixture();
  input.context = context;
  const trail = await resolveTrail(
    claim,
    createLocalEvidenceResolver(input),
    context.asOf,
    context.evaluatedAt,
  );
  expect(trail.verdict.publication).toBe("eligible"); // synthetic approvals only
  expect(trail.trail[0]!.exactRef).toEqual(context.facts[0]!.ref);
  expect(trail.trail[0]!.document).toEqual(context.facts[0]!.evidence.document);
  expect(trail.trail[0]!.exactMarefaRowSelectionSupportedByWEB07).toBe(false);
});
test("unproven rights hides trail, not just publication badge", async () => {
  const input = syntheticBridge(),
    { claim } = fixture();
  input.context.grants = [];
  const trail = await resolveTrail(
    claim,
    createLocalEvidenceResolver(input),
    input.context.asOf,
    input.context.evaluatedAt,
  );
  expect(trail.trail).toEqual([]);
  expect(trail.verdict.publication).toBe("blocked");
});
test("withheld record cannot be resolved into legacy fallback", async () => {
  const input = syntheticBridge(),
    { claim } = fixture();
  input.context.facts[0]!.availability = "withheld";
  await expect(
    resolveTrail(
      claim,
      createLocalEvidenceResolver(input),
      input.context.asOf,
      input.context.evaluatedAt,
    ),
  ).rejects.toThrow("evidence_bridge_blocked");
});
test("resolver does not accept a different as-of request", async () => {
  const input = syntheticBridge(),
    { claim } = fixture();
  await expect(
    resolveTrail(
      claim,
      createLocalEvidenceResolver(input),
      "2026-03-01T00:00:00.000Z",
      input.context.evaluatedAt,
    ),
  ).rejects.toThrow("evidence_bridge_time_mismatch");
});
test("caller mutation never changes captured immutable context", async () => {
  const input = syntheticBridge(),
    { claim } = fixture();
  const resolver = createLocalEvidenceResolver(input);
  input.context.facts[0]!.availability = "withheld";
  const a = await resolver.resolveContext(claim, input.context.asOf, input.context.evaluatedAt);
  a.facts[0]!.availability = "unavailable";
  const b = await resolver.resolveContext(claim, input.context.asOf, input.context.evaluatedAt);
  expect(b.facts[0]!.availability).toBe("present");
});
