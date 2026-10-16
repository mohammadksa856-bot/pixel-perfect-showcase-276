import { ClaimSchema, evaluate, linkIntent, type Claim, type Context } from "./contract";

/** This is a port, not a new financial datastore. Implement it against authorized server evidence APIs later. */
export interface ResearchResolver {
  resolveContext(claim: Claim, asOf: string, evaluatedAt: string): Promise<Context>;
}
export async function resolveTrail(
  input: unknown,
  resolver: ResearchResolver,
  asOf: string,
  evaluatedAt: string,
) {
  const claim = ClaimSchema.parse(input);
  const context = await resolver.resolveContext(claim, asOf, evaluatedAt);
  if (context.asOf !== asOf || context.evaluatedAt !== evaluatedAt)
    throw Error("resolver_context_time_mismatch");
  const verdict = evaluate(claim, context);
  // Do not leak hidden original numbers or a direct-data link when the referenced data are not qualified.
  const accessible =
    verdict.technical === "eligible" &&
    verdict.rights === "permitted" &&
    verdict.availability === "present" &&
    verdict.workflow !== "Withdrawn";
  return {
    claimId: claim.claimId,
    revision: claim.revision,
    verdict,
    trail: accessible
      ? claim.bindings.map((b) => ({ bindingId: b.id, ...linkIntent(claim, b) }))
      : [],
  };
}

/** WEB07 ValueCell is deliberately insufficient: do not mint persistent IDs or certificates from a display row. */
export function legacyWEB07Compatibility() {
  return {
    readyForLiveResearchClaims: false,
    usableReadOnly: [
      "topic key",
      "metric key",
      "safe source URL",
      "period.kind/end",
      "unit",
      "display deep-link intent",
    ],
    missingRequiredEvidence: [
      "stable fact ID and version",
      "period start and full scope/dimensions in ValueCell",
      "original document ID/version/file SHA256",
      "source publication timestamp and rights grant",
      "independent verification certificate and reviewer",
      "immutable input/derivation version graph",
      "exact version/period selection in Marefa Data route",
    ],
    policy:
      "Fail closed; no IDs from array position, URL, amount or fixture hash; no fallback to legacy display values.",
  } as const;
}
