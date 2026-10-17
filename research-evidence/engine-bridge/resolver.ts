/** Local-only implementation of B01 port; never accesses engine APIs or the network. */
import type { ResearchResolver } from "../v1/adapter";
import { bridgeEngineEvidence } from "./bridge";

export function createLocalEvidenceResolver(input: unknown): ResearchResolver {
  const result = bridgeEngineEvidence(input);
  return {
    async resolveContext(_claim, asOf, evaluatedAt) {
      if (!result.context || result.state !== "MAPPED_FOR_CONTRACT_EVALUATION")
        throw Error("evidence_bridge_blocked");
      if (asOf !== result.context.asOf || evaluatedAt !== result.context.evaluatedAt)
        throw Error("evidence_bridge_time_mismatch");
      return structuredClone(result.context);
    },
  };
}
