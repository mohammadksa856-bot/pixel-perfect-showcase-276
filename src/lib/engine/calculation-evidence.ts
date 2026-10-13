/** Same fail-closed eligibility boundary for page, history, segments and peers.
 * Reproduction by the engine is not independent verification of source numbers.
 */
export type InputLineage = {
  status?: string | null;
  current_inputs_reproduced?: boolean | null;
  evidence_sha256?: string | null;
  consumed_inputs?: unknown[] | null;
};
export function hasReproducedInputs(lineage: InputLineage | null | undefined): boolean {
  return lineage?.status === "reproduced_current_inputs" &&
    lineage.current_inputs_reproduced === true &&
    /^[a-f0-9]{64}$/.test(lineage.evidence_sha256 ?? "") &&
    Array.isArray(lineage.consumed_inputs) && lineage.consumed_inputs.length > 0 &&
    lineage.consumed_inputs.every(input => {
      if (!input || typeof input !== "object") return false;
      const row = input as Record<string, unknown>;
      return Number.isInteger(row["id"]) && Number(row["id"]) > 0 &&
        Number.isInteger(row["version"]) && Number(row["version"]) > 0 &&
        typeof row["metric_key"] === "string" && typeof row["source_key"] === "string" &&
        typeof row["period_end"] === "string" && typeof row["unit"] === "string" &&
        typeof row["value_decimal"] === "string" && row["value_decimal"].trim() !== "" &&
        Number.isFinite(Number(row["value_decimal"]));
    });
}
