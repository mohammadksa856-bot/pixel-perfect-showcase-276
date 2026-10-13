// Synthetic eligibility metadata ONLY for isolated unit branches (not financial evidence).
// Frozen values/files remain unchanged; live tests must use real engine lineage instead.
import type { EnginePeerResponse } from "../src/lib/engine/peer-comparison";
export function withUnitTestLineage(raw: unknown): EnginePeerResponse {
  const result=structuredClone(raw) as EnginePeerResponse;
  for (const company of result.companies) for (const metric of Object.values(company.metrics)) {
    if(metric.provenance?.derivation) metric.provenance.derivation.lineage={
      status:"reproduced_current_inputs",current_inputs_reproduced:true,evidence_sha256:"a".repeat(64),
      consumed_inputs:[{id:1,version:1,metric_key:"unit_fixture_operand",source_key:"synthetic-unit-fixture",period_end:metric.period_end,unit:"ratio",value_decimal:"1"}],
    };
  }
  return result;
}
