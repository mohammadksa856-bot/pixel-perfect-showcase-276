/** Local server-port prototype. No I/O, financial values, IDs minted, or release authorization. */
import { z } from "zod";
import {
  ContextSchema,
  FactSchema,
  IdentitySchema,
  RefSchema,
  canonical,
  type Context,
} from "../v1/contract";

const time = ContextSchema.innerType().shape.asOf;
const SourceControlSchema = z
  .object({
    document: RefSchema,
    withdrawnAt: time,
    observedAt: time,
  })
  .strict();

/** Proposed trusted evidence-port input, NOT an existing engine API or browser contract. */
export const BridgeInputSchema = z
  .object({
    schema: z.literal("engine-research-bridge/1"),
    context: ContextSchema,
    knowledgeCompleteThrough: time,
    exportedAt: time,
    rows: z.array(z.record(z.unknown())),
    sourceWithdrawals: z.array(SourceControlSchema),
  })
  .strict();
export type BridgeInput = z.infer<typeof BridgeInputSchema>;
type Fact = z.infer<typeof FactSchema>;
type Issue = { code: string; row: number | null };
export type BridgeResult = {
  state: "MAPPED_FOR_CONTRACT_EVALUATION" | "BLOCKED";
  context: Context | null;
  issues: Issue[];
  mappedRows: number;
  futureRowsExcluded: number;
  publicationAuthorized: false;
  liveIntegrationApproved: false;
};
const same = (a: unknown, b: unknown) => canonical(a) === canonical(b);
const object = (x: unknown): Record<string, unknown> =>
  x !== null && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : {};

/** Exact projection only: empty starts, date-only timestamps, missing currency are not repaired. */
function projectIdentity(row: Record<string, unknown>) {
  return IdentitySchema.safeParse({
    companyId: row["company_id"],
    metric: row["metric"],
    scope: row["scope"],
    dimensions: row["dimensions"],
    unit: row["unit"],
    currency: row["currency"],
    period: {
      kind: row["period_kind"],
      start: row["period_start"],
      end: row["period_end"],
      fiscalYear: row["fiscal_year"],
      fiscalQuarter: row["fiscal_quarter"],
    },
  });
}

export function bridgeEngineEvidence(input: unknown): BridgeResult {
  const issues: Issue[] = [];
  const issue = (code: string, row: number | null = null) => issues.push({ code, row });
  const parsed = BridgeInputSchema.safeParse(input);
  const blocked = (mappedRows = 0, futureRowsExcluded = 0): BridgeResult => ({
    state: "BLOCKED",
    context: null,
    issues,
    mappedRows,
    futureRowsExcluded,
    publicationAuthorized: false,
    liveIntegrationApproved: false,
  });
  if (!parsed.success) {
    // Never echo a caller's values or raw Zod paths/data in diagnostics.
    issue("bridge_contract_invalid");
    return blocked();
  }
  const x = parsed.data,
    ctx = x.context;
  if (ctx.asOf > ctx.evaluatedAt || x.exportedAt > ctx.evaluatedAt || x.exportedAt < ctx.asOf)
    issue("snapshot_time_invalid");
  if (x.knowledgeCompleteThrough < ctx.asOf || x.knowledgeCompleteThrough > x.exportedAt)
    issue("asof_history_completeness_unproven");
  // Facts/documents remain immutable versions. Supersession is not inferred from order or version size.
  const known = ctx.facts.filter((f) => f.evidence.publishedAt <= ctx.asOf);
  const documents = ctx.documents.filter((d) => d.evidence.publishedAt <= ctx.asOf);
  const mapped: Fact[] = [];
  let futureRowsExcluded = 0;
  const seen = new Set<string>();
  for (const [i, row] of x.rows.entries()) {
    const ref = RefSchema.safeParse({
      id: row["fact_id"],
      version: row["version"],
      sha256: row["fact_sha256"],
    });
    if (!ref.success) {
      issue("stable_fact_reference_missing_or_invalid", i);
      continue;
    }
    const key = canonical({ id: ref.data.id, version: ref.data.version });
    if (seen.has(key)) {
      issue("duplicate_fact_revision_row", i);
      continue;
    }
    seen.add(key);
    const fact = ctx.facts.find((f) => same(f.ref, ref.data));
    if (!fact) {
      issue("fact_revision_not_resolved", i);
      continue;
    }
    const identity = projectIdentity(row);
    if (!identity.success || !same(identity.data, fact.identity))
      issue("full_identity_mismatch", i);
    if (row["value_digest"] !== fact.valueDigest) issue("value_revision_digest_mismatch", i);
    const source = object(object(row["provenance"])["source"]);
    const sourceRef = RefSchema.safeParse({
      id: source["document_id"],
      version: source["document_version"],
      sha256: source["artifact_sha256"],
    });
    if (!sourceRef.success || !same(sourceRef.data, fact.evidence.document))
      issue("document_revision_not_resolved", i);
    if (source["source_url"] !== fact.evidence.url || row["source_url"] !== fact.evidence.url)
      issue("source_url_mismatch", i);
    if (source["published_at"] !== fact.evidence.publishedAt)
      issue("publication_timestamp_mismatch", i);
    if (
      !same(
        {
          page: source["page"] ?? null,
          table: source["table"] ?? null,
          anchor: source["anchor"] ?? null,
        },
        fact.evidence.locator,
      )
    )
      issue("source_locator_mismatch", i);
    if (row["quality_status"] !== "eligible" || source["accepted_for_display"] !== true)
      issue("engine_quality_not_eligible", i);
    if (fact.availability !== "present" || fact.technical !== "eligible")
      issue("fact_withheld_or_ineligible", i);
    if (fact.financial === "rejected") issue("financial_input_rejected", i);
    const calculated = row["is_calculated"];
    if (calculated !== false && calculated !== true) issue("calculation_status_missing", i);
    if (calculated !== Boolean(fact.lineage)) issue("derivation_status_mismatch", i);
    if (
      calculated === true &&
      (fact.lineage?.status !== "reproduced" || !fact.lineage.inputs.length)
    )
      issue("derivation_lineage_unproven", i);
    const doc = documents.find((d) => same(d.evidence.document, fact.evidence.document));
    if (fact.evidence.publishedAt > ctx.asOf) {
      futureRowsExcluded++;
      continue;
    }
    if (
      !doc ||
      !doc.originalArtifactVerified ||
      doc.evidence.url !== fact.evidence.url ||
      doc.evidence.publishedAt !== fact.evidence.publishedAt
    )
      issue("original_document_evidence_unproven", i);
    if (
      doc &&
      ![doc.evidence.locator, ...doc.verifiedLocators].some((l) => same(l, fact.evidence.locator))
    )
      issue("locator_not_verified_in_document", i);
    if (
      x.sourceWithdrawals.some(
        (w) => same(w.document, fact.evidence.document) && w.withdrawnAt <= ctx.evaluatedAt,
      )
    )
      issue("source_withdrawn", i);
    mapped.push(fact);
  }
  for (const w of x.sourceWithdrawals) {
    if (w.observedAt > ctx.evaluatedAt || w.observedAt < w.withdrawnAt)
      issue("withdrawal_time_invalid");
  }
  // Keep the entire known conflict/supersession horizon, not only the requested first record.
  const active = known.filter((f) => !known.some((n) => n.supersedes && same(n.supersedes, f.ref)));
  for (const f of mapped) {
    const peers = active.filter(
      (p) =>
        same(p.identity, f.identity) && p.availability === "present" && p.technical === "eligible",
    );
    if (new Set(peers.map((p) => p.valueDigest)).size > 1) issue("source_conflict");
    if (known.some((n) => n.supersedes && same(n.supersedes, f.ref))) issue("fact_superseded_asof");
    if (documents.some((d) => d.supersedes && same(d.supersedes, f.evidence.document)))
      issue("document_superseded_asof");
    for (const ref of f.lineage?.inputs ?? []) {
      if (
        !mapped.some(
          (k) => same(k.ref, ref) && k.availability === "present" && k.technical === "eligible",
        )
      )
        issue("derived_input_reference_unresolved_or_withheld");
    }
  }
  if (!mapped.length) issue("no_known_rows_mapped");
  // Preserve known metadata so the existing B01 evaluator can still enforce independent reviews,
  // rights, grants, review ledger, assumptions and withdrawal. This bridge never supplies approvals.
  if (issues.length) return blocked(mapped.length, futureRowsExcluded);
  const context = ContextSchema.parse({ ...ctx, facts: mapped, documents });
  return {
    state: "MAPPED_FOR_CONTRACT_EVALUATION",
    context,
    issues: [],
    mappedRows: mapped.length,
    futureRowsExcluded,
    publicationAuthorized: false,
    liveIntegrationApproved: false,
  };
}
