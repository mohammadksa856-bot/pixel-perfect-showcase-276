/** Entirely synthetic enriched export. These fields are NOT claimed available in today's engine API. */
import { fixture } from "../v1/synthetic";
import type { BridgeInput } from "./bridge";

export function syntheticBridge(): BridgeInput {
  const { context } = fixture();
  const fact = context.facts[0]!;
  return {
    schema: "engine-research-bridge/1",
    context,
    exportedAt: context.evaluatedAt,
    knowledgeCompleteThrough: context.asOf,
    sourceWithdrawals: [],
    rows: [
      {
        company_id: fact.identity.companyId,
        metric: fact.identity.metric,
        scope: fact.identity.scope,
        dimensions: fact.identity.dimensions,
        unit: fact.identity.unit,
        currency: fact.identity.currency,
        period_start: fact.identity.period.start,
        period_end: fact.identity.period.end,
        period_kind: fact.identity.period.kind,
        fiscal_year: fact.identity.period.fiscalYear,
        fiscal_quarter: fact.identity.period.fiscalQuarter,
        fact_id: fact.ref.id,
        version: fact.ref.version,
        fact_sha256: fact.ref.sha256,
        value_digest: fact.valueDigest,
        source_url: fact.evidence.url,
        is_calculated: false,
        quality_status: "eligible",
        provenance: {
          source: {
            document_id: fact.evidence.document.id,
            document_version: fact.evidence.document.version,
            artifact_sha256: fact.evidence.document.sha256,
            source_url: fact.evidence.url,
            published_at: fact.evidence.publishedAt,
            ...fact.evidence.locator,
            accepted_for_display: true,
          },
        },
      },
    ],
  };
}
