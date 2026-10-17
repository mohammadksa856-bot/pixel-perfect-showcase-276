/** New review cases; independently constructed metadata, no real financial data or approvals. */
import { expect, test } from "bun:test";
import {
  bridgeEngineEvidence,
  type BridgeInput,
} from "../../research-evidence/engine-bridge/bridge";
import { createLocalEvidenceResolver } from "../../research-evidence/engine-bridge/resolver";
import { ContextSchema } from "../../research-evidence/v1/contract";

function example(): BridgeInput {
  const ref = { id: "independent-synthetic-fact", version: 3, sha256: "1".repeat(64) };
  const evidence = {
    document: { id: "independent-synthetic-doc", version: 2, sha256: "2".repeat(64) },
    url: "https://independent.example.invalid/statement",
    publishedAt: "2026-03-12T12:00:00.000Z",
    locator: { page: 14, table: "Synthetic cash flow", anchor: null },
  };
  const identity = {
    companyId: "TEST:INDEPENDENT",
    metric: "synthetic_cash_flow",
    scope: "consolidated" as const,
    dimensions: {},
    period: {
      kind: "fy" as const,
      start: "2025-01-01",
      end: "2025-12-31",
      fiscalYear: 2025,
      fiscalQuarter: null,
    },
    unit: "SAR",
    currency: "SAR",
  };
  const context = ContextSchema.parse({
    snapshotId: "independent-synthetic-snapshot",
    asOf: "2026-03-15T12:00:00.000Z",
    evaluatedAt: "2026-03-16T12:00:00.000Z",
    use: "internal_research",
    facts: [
      {
        ref,
        identity,
        evidence,
        availability: "present",
        technical: "eligible",
        financial: "unreviewed",
        verification: null,
        valueDigest: "3".repeat(64),
        supersedes: null,
        lineage: null,
      },
    ],
    documents: [
      {
        evidence,
        verifiedLocators: [],
        kind: "issuer",
        originalArtifactVerified: true,
        supersedes: null,
      },
    ],
    grants: [],
    actors: [],
    events: [],
  });
  return {
    schema: "engine-research-bridge/1",
    context,
    exportedAt: context.evaluatedAt,
    knowledgeCompleteThrough: context.asOf,
    sourceWithdrawals: [],
    rows: [
      {
        company_id: identity.companyId,
        metric: identity.metric,
        scope: identity.scope,
        dimensions: {},
        period_kind: identity.period.kind,
        period_start: identity.period.start,
        period_end: identity.period.end,
        fiscal_year: identity.period.fiscalYear,
        fiscal_quarter: null,
        unit: identity.unit,
        currency: identity.currency,
        fact_id: ref.id,
        version: ref.version,
        fact_sha256: ref.sha256,
        value_digest: "3".repeat(64),
        source_url: evidence.url,
        is_calculated: false,
        quality_status: "eligible",
        provenance: {
          source: {
            source_url: evidence.url,
            document_id: evidence.document.id,
            document_version: evidence.document.version,
            artifact_sha256: evidence.document.sha256,
            published_at: evidence.publishedAt,
            ...evidence.locator,
            accepted_for_display: true,
          },
        },
      },
    ],
  };
}
const raw = (x: BridgeInput) => x.rows[0]!;
const source = (x: BridgeInput) =>
  (raw(x)["provenance"] as { source: Record<string, unknown> }).source;
const rejected = (x: unknown, expected: string) => {
  const out = bridgeEngineEvidence(x);
  expect(out.state).toBe("BLOCKED");
  expect(out.context).toBeNull();
  expect(out.issues.map((i) => i.code)).toContain(expected);
  expect(out.publicationAuthorized).toBe(false);
};

test("independent positive control maps but does not certify financial review or grants", () => {
  const x = example(),
    out = bridgeEngineEvidence(x);
  expect(out.state).toBe("MAPPED_FOR_CONTRACT_EVALUATION");
  expect(out.context!.facts[0]!.financial).toBe("unreviewed");
  expect(out.context!.grants).toEqual([]);
  expect(out.publicationAuthorized).toBe(false);
  expect(out.liveIntegrationApproved).toBe(false);
});
for (const field of ["fact_id", "version", "fact_sha256"])
  test(`required ${field} cannot default`, () => {
    const x = example();
    delete raw(x)[field];
    rejected(x, "stable_fact_reference_missing_or_invalid");
  });
for (const field of ["document_id", "document_version", "artifact_sha256"])
  test(`required ${field} cannot default`, () => {
    const x = example();
    delete source(x)[field];
    rejected(x, "document_revision_not_resolved");
  });
test("SQLite row ID and source hash cannot be promoted into stable research refs", () => {
  const x = example();
  raw(x)["data_point_id"] = 77;
  delete raw(x)["fact_id"];
  source(x)["content_hash"] = source(x)["artifact_sha256"];
  delete source(x)["artifact_sha256"];
  rejected(x, "stable_fact_reference_missing_or_invalid");
});
test("conflict blocks both fact orderings with no requested-row preference", () => {
  for (const reverse of [false, true]) {
    const x = example(),
      other = structuredClone(x.context.facts[0]!);
    other.ref.id = "independent-conflicting-source";
    other.valueDigest = "4".repeat(64);
    other.evidence.url = "https://second.example.invalid/statement";
    x.context.facts.push(other);
    if (reverse) x.context.facts.reverse();
    rejected(x, "source_conflict");
  }
});
for (const [field, replacement] of [
  ["period_start", "2025-10-01"],
  ["period_kind", "ytd"],
  ["fiscal_year", 2024],
  ["currency", "USD"],
  ["unit", "USD"],
  ["scope", "standalone"],
] as const)
  test(`full identity includes ${field}`, () => {
    const x = example();
    raw(x)[field] = replacement;
    rejected(x, "full_identity_mismatch");
  });
test("FY and quarter sharing end date remain distinct", () => {
  const x = example();
  raw(x)["period_kind"] = "quarter";
  raw(x)["fiscal_quarter"] = 4;
  rejected(x, "full_identity_mismatch");
});
test("future conflicting revision does not enter earlier context", () => {
  const x = example(),
    future = structuredClone(x.context.facts[0]!);
  future.supersedes = structuredClone(future.ref);
  future.ref.version++;
  future.valueDigest = "4".repeat(64);
  future.evidence.publishedAt = "2026-03-16T00:00:00.000Z";
  x.context.facts.push(future);
  const out = bridgeEngineEvidence(x);
  expect(out.state).toBe("MAPPED_FOR_CONTRACT_EVALUATION");
  expect(out.context!.facts).toHaveLength(1);
  expect(out.context!.facts[0]!.ref.version).toBe(3);
});
test("withheld explicit replacement still retires an older revision", () => {
  const x = example(),
    next = structuredClone(x.context.facts[0]!);
  next.supersedes = structuredClone(next.ref);
  next.ref.version++;
  next.availability = "withheld";
  x.context.facts.push(next);
  rejected(x, "fact_superseded_asof");
});
test("missing history watermark is not current-only as-of evidence", () => {
  const x = example();
  x.knowledgeCompleteThrough = "2026-03-14T00:00:00.000Z";
  rejected(x, "asof_history_completeness_unproven");
});
test("future source alone cannot map", () => {
  const x = example();
  x.context.facts[0]!.evidence.publishedAt = "2026-03-16T00:00:00.000Z";
  source(x)["published_at"] = x.context.facts[0]!.evidence.publishedAt;
  rejected(x, "no_known_rows_mapped");
});
test("source withdrawal blocks regardless of good raw row", () => {
  const x = example();
  x.sourceWithdrawals.push({
    document: x.context.facts[0]!.evidence.document,
    withdrawnAt: "2026-03-16T00:00:00.000Z",
    observedAt: "2026-03-16T01:00:00.000Z",
  });
  rejected(x, "source_withdrawn");
});
test("matching receipt cannot override quarantined raw row", () => {
  const x = example();
  raw(x)["quality_status"] = "quarantined";
  raw(x)["value"] = "SYNTHETIC_SECRET_MUST_NOT_ESCAPE";
  rejected(x, "engine_quality_not_eligible");
  expect(JSON.stringify(bridgeEngineEvidence(x))).not.toContain("SYNTHETIC_SECRET_MUST_NOT_ESCAPE");
});
test("matching row cannot override source-level hold", () => {
  const x = example();
  source(x)["accepted_for_display"] = false;
  rejected(x, "engine_quality_not_eligible");
});
test("matching row cannot override context-level hold", () => {
  const x = example();
  x.context.facts[0]!.availability = "withheld";
  rejected(x, "fact_withheld_or_ineligible");
});
test("frozen inputs are not mutated and raw values are never echoed", () => {
  const x = example();
  raw(x)["value"] = "SYNTHETIC_NOT_A_FINANCIAL_FACT";
  const before = JSON.stringify(x);
  const freeze = (v: unknown): void => {
    if (v && typeof v === "object") {
      Object.values(v).forEach(freeze);
      Object.freeze(v);
    }
  };
  freeze(x);
  const a = bridgeEngineEvidence(x),
    b = bridgeEngineEvidence(x);
  expect(a).toEqual(b);
  expect(JSON.stringify(x)).toBe(before);
  expect(JSON.stringify(a)).not.toContain("SYNTHETIC_NOT_A_FINANCIAL_FACT");
});
test("resolver clones outputs rather than exposing a mutable acceptance cache", async () => {
  const x = example(),
    resolver = createLocalEvidenceResolver(x);
  const claim = {} as Parameters<typeof resolver.resolveContext>[0]; // port does not evaluate claims
  const a = await resolver.resolveContext(claim, x.context.asOf, x.context.evaluatedAt);
  a.facts[0]!.availability = "withheld";
  const b = await resolver.resolveContext(claim, x.context.asOf, x.context.evaluatedAt);
  expect(b.facts[0]!.availability).toBe("present");
});
