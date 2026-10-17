/** Exercise accepted B02C against actual native export; no synthetic references or clock rounding. */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  bridgeEngineEvidence,
  BridgeInputSchema,
} from "../../research-evidence/engine-bridge/bridge";

const privateRoot = process.argv[2];
if (!privateRoot) throw Error("private_root_required");
const payload = JSON.parse(
  readFileSync(resolve(privateRoot, "bridge-attempt-inputs.json"), "utf8"),
);
// Analysis clock is measured now; it is NOT an invented document publication time.
const evaluatedAt = new Date().toISOString();
const context = { ...payload.context, asOf: evaluatedAt, evaluatedAt };
const rows = payload.rows.map((r: { audit_row: string; rows: Record<string, unknown>[] }) => {
  const input = {
    schema: "engine-research-bridge/1",
    context,
    exportedAt: evaluatedAt,
    rows: r.rows,
    sourceWithdrawals: [],
  };
  // knowledgeCompleteThrough is deliberately absent: current/history completeness is unproven.
  const schema = BridgeInputSchema.safeParse(input);
  const verdict = bridgeEngineEvidence(input);
  if (verdict.state !== "BLOCKED" || verdict.context !== null || verdict.publicationAuthorized)
    throw Error("unexpected_unblocking");
  return {
    audit_row: r.audit_row,
    state: verdict.state,
    issues: verdict.issues,
    missing_metadata_paths: schema.success ? [] : schema.error.issues.map((i) => i.path.join(".")),
    native_rows_inspected: r.rows.length,
    global_fact_refs_created: 0,
    publicationAuthorized: false,
  };
});
if (
  rows.length !== 142 ||
  new Set(rows.map((r: { audit_row: string }) => r.audit_row)).size !== 142
)
  throw Error("coverage_incomplete");
const report = {
  schema: "marefa-b02d-real-export-bridge-gate/1",
  evaluatedAt,
  accepted_bridge_code: "74c967da01edf518cf77b11c0d9b6ca05316a5ae",
  attempts: 142,
  mapped: 0,
  blocked: 142,
  reason:
    "Cannot construct complete trusted bridge input from native export; no history watermark or B01 evidence refs supplied. No synthetic certificates, IDs or publication timestamps added.",
  financial_approval: false,
  rows,
};
writeFileSync(
  "review-delivery/WEB08B02D/BRIDGE-GATE.json",
  JSON.stringify(report, null, 2) + "\n",
  { flag: "wx" },
);
console.log(JSON.stringify({ attempts: 142, blocked: 142, mapped: 0, numbers_unblocked: 0 }));
