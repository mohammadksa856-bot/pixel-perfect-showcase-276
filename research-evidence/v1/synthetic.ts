/** Synthetic-only resolver fixture. None of these actors, certificates or values are real. */
import { ClaimSchema, ContextSchema, appendReview, type Claim, type Context } from "./contract";
const H = (s: string) => s.repeat(64);
export function fixture(): { claim: Claim; context: Context } {
  const evidence = {
    document: { id: "synthetic-filing", version: 1, sha256: H("a") },
    url: "https://evidence.example.invalid/synthetic-filing-v1",
    publishedAt: "2026-03-01T00:00:00.000Z",
    locator: { page: 1, table: "Synthetic income statement", anchor: null },
  };
  const identity = {
    companyId: "TEST:SYNTH-2222",
    metric: "revenue",
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
  const factRef = { id: "synthetic-revenue", version: 1, sha256: H("b") };
  const grant = { id: "synthetic-rights", version: 1, sha256: H("c") };
  const claim = ClaimSchema.parse({
    schema: "research-claim/1",
    claimId: "synthetic-claim",
    revision: 1,
    topic: "financials",
    contentKind: "published_fact",
    temporalBasis: "actual",
    company: { id: identity.companyId, market: "TEST", symbol: "SYNTH-2222", sector: null },
    identity,
    body: { language: "en", text: "Synthetic revenue is referenced, not stored in this claim." },
    authorId: "synthetic-author",
    createdAt: "2026-03-02T00:00:00.000Z",
    informationPublishedAt: evidence.publishedAt,
    validFrom: "2026-03-02T00:00:00.000Z",
    validUntil: null,
    supersedes: null,
    limitations: ["SYNTHETIC TEST ONLY. No Aramco data or genuine verification."],
    sources: [evidence],
    bindings: [{ id: "revenue", role: "output", fact: factRef, expected: identity, evidence }],
    calculation: null,
    rights: { declared: "permitted", grantRefs: [grant] },
  });
  const context = ContextSchema.parse({
    snapshotId: "synthetic-snapshot-v1",
    asOf: "2026-03-02T00:00:00.000Z",
    evaluatedAt: "2026-03-05T00:00:00.000Z",
    use: "internal_research",
    facts: [
      {
        ref: factRef,
        identity,
        evidence,
        availability: "present",
        technical: "eligible",
        financial: "verified",
        verification: {
          reviewerId: "synthetic-finance",
          reviewedAt: "2026-03-02T00:00:00.000Z",
          reportSha256: H("d"),
          method: "independent_source",
        },
        valueDigest: H("e"),
        supersedes: null,
        lineage: null,
      },
    ],
    documents: [{ evidence, kind: "issuer", originalArtifactVerified: true, supersedes: null }],
    grants: [
      {
        ref: grant,
        document: evidence.document,
        status: "permitted",
        uses: ["internal_research", "derive"],
        validFrom: "2026-03-01T00:00:00.000Z",
        validUntil: null,
        reviewerId: "synthetic-rights",
      },
    ],
    actors: [
      { id: "synthetic-author", roles: ["author"] },
      { id: "synthetic-finance", roles: ["financial_reviewer"] },
      { id: "synthetic-editor", roles: ["editorial_reviewer"] },
      { id: "synthetic-rights", roles: ["rights_reviewer"] },
    ],
    events: [],
  });
  return { claim, context };
}
export function reviewedFixture() {
  const x = fixture();
  x.context.events = appendReview(
    x.claim,
    x.context,
    "financial_review",
    "synthetic-finance",
    "2026-03-03T00:00:00.000Z",
    H("f"),
  );
  x.context.events = appendReview(
    x.claim,
    x.context,
    "editorial_approve",
    "synthetic-editor",
    "2026-03-04T00:00:00.000Z",
    H("f"),
  );
  return x;
}
/** Only the fake original-data service contains a number. Never copied into a claim. */
export const SYNTHETIC_ORIGINAL_DATA = Object.freeze({
  id: "synthetic-revenue",
  version: 1,
  value: 123,
  unit: "SAR",
  currency: "SAR",
  notice: "Synthetic test datum, not a financial fact about any issuer",
});
