import { test, expect } from "bun:test";
import {
  ClaimSchema,
  ContextSchema,
  TOPICS,
  appendReview,
  canonical,
  digest,
  evaluate,
  type Claim,
} from "./contract";
import { fixture, reviewedFixture } from "./synthetic";
import { legacyWEB07Compatibility, resolveTrail } from "./adapter";
const blocked = (x: ReturnType<typeof fixture>, reason: string) => {
  const r = evaluate(x.claim, x.context);
  expect(r.publication).toBe("blocked");
  expect(r.reasons).toContain(reason);
};

test("metadata-only strict contract refuses duplicated numeric payloads and score", () => {
  const { claim } = fixture();
  for (const field of ["value", "score", "readiness", "calculatedValue"])
    expect(ClaimSchema.safeParse({ ...claim, [field]: 123 }).success).toBe(false);
  expect(TOPICS).toHaveLength(18);
});
test("Draft -> FinanciallyReviewed -> EditoriallyApproved, stages remain separate", () => {
  const x = fixture();
  const before = canonical(x.claim);
  expect(evaluate(x.claim, x.context)).toMatchObject({
    availability: "present",
    technical: "eligible",
    financial: "unreviewed",
    editorial: "unreviewed",
    publication: "blocked",
    workflow: "Draft",
  });
  x.context.events = appendReview(
    x.claim,
    x.context,
    "financial_review",
    "synthetic-finance",
    "2026-03-03T00:00:00.000Z",
    "f".repeat(64),
  );
  expect(evaluate(x.claim, x.context)).toMatchObject({
    workflow: "FinanciallyReviewed",
    financial: "verified",
    editorial: "unreviewed",
    publication: "blocked",
  });
  x.context.events = appendReview(
    x.claim,
    x.context,
    "editorial_approve",
    "synthetic-editor",
    "2026-03-04T00:00:00.000Z",
    "f".repeat(64),
  );
  expect(evaluate(x.claim, x.context)).toMatchObject({
    workflow: "EditoriallyApproved",
    publication: "eligible",
  });
  expect(canonical(x.claim)).toBe(before);
});
test("editorial cannot precede finance and author cannot review own work", () => {
  const x = fixture();
  expect(() =>
    appendReview(
      x.claim,
      x.context,
      "editorial_approve",
      "synthetic-editor",
      "2026-03-03T00:00:00.000Z",
      "f".repeat(64),
    ),
  ).toThrow();
  expect(() =>
    appendReview(
      x.claim,
      x.context,
      "financial_review",
      "synthetic-author",
      "2026-03-03T00:00:00.000Z",
      "f".repeat(64),
    ),
  ).toThrow();
});
test("unavailable and withheld are different from present/qualified", () => {
  const a = reviewedFixture();
  a.context.facts = [];
  blocked(a, "input_unavailable");
  expect(evaluate(a.claim, a.context).availability).toBe("unavailable");
  const b = reviewedFixture();
  b.context.facts[0]!.availability = "withheld";
  blocked(b, "input_withheld");
  expect(evaluate(b.claim, b.context).availability).toBe("withheld");
});
test("technical eligibility is not independent financial verification", () => {
  const x = reviewedFixture();
  x.context.facts[0]!.financial = "unreviewed";
  x.context.facts[0]!.verification = null;
  blocked(x, "financial_input_verification_required");
  expect(evaluate(x.claim, x.context)).toMatchObject({
    technical: "eligible",
    financial: "unreviewed",
    workflow: "Invalidated",
  });
});
for (const [name, mutate] of [
  [
    "period end",
    (c: Claim) => {
      c.bindings[0]!.expected.period.end = "2024-12-31";
      c.bindings[0]!.expected.period.start = "2024-01-01";
    },
  ],
  [
    "same end but quarter",
    (c: Claim) => {
      c.bindings[0]!.expected.period.kind = "quarter";
      c.bindings[0]!.expected.period.start = "2025-10-01";
      c.bindings[0]!.expected.period.fiscalQuarter = 4;
    },
  ],
  [
    "period start",
    (c: Claim) => {
      c.bindings[0]!.expected.period.start = "2025-02-01";
    },
  ],
  [
    "unit",
    (c: Claim) => {
      c.bindings[0]!.expected.unit = "USD";
    },
  ],
  [
    "currency",
    (c: Claim) => {
      c.bindings[0]!.expected.currency = "USD";
    },
  ],
  [
    "scope",
    (c: Claim) => {
      c.bindings[0]!.expected.scope = "standalone";
    },
  ],
  [
    "dimensions",
    (c: Claim) => {
      c.bindings[0]!.expected.dimensions = { segment: "Upstream" };
    },
  ],
] as const)
  test(`identity rejects ${name} mismatch, never silently substitutes`, () => {
    const x = reviewedFixture();
    mutate(x.claim);
    const r = evaluate(x.claim, x.context);
    expect(r.publication).toBe("blocked");
    expect(r.reasons).toContain("output_identity_mismatch");
  });
test("resolver identity mismatch rejected even with unchanged claim", () => {
  const x = reviewedFixture();
  x.context.facts[0]!.identity.unit = "USD";
  blocked(x, "input_identity_mismatch");
});
test("source URL/page/hash/version all pinned", () => {
  for (const field of ["url", "page", "hash", "version"]) {
    const x = reviewedFixture();
    const e = x.context.facts[0]!.evidence;
    if (field === "url") e.url = "https://evidence.example.invalid/other";
    if (field === "page") e.locator.page = 2;
    if (field === "hash") e.document.sha256 = "1".repeat(64);
    if (field === "version") e.document.version = 2;
    blocked(x, "input_source_mismatch");
  }
});
test("contradictory sources for same semantic fact block rather than select first", () => {
  const x = reviewedFixture();
  const other = structuredClone(x.context.facts[0]!);
  other.ref.id = "other-source-fact";
  other.valueDigest = "2".repeat(64);
  x.context.facts.push(other);
  blocked(x, "source_conflict");
  x.context.facts.reverse();
  blocked(x, "source_conflict");
});
test("same meaning/value from two sources is not an invented conflict", () => {
  const x = reviewedFixture();
  const other = structuredClone(x.context.facts[0]!);
  other.ref.id = "other";
  x.context.facts.push(other);
  expect(evaluate(x.claim, x.context).publication).toBe("eligible");
});
test("restatement invalidates present claim but earlier as-of reproduces old result", () => {
  const x = reviewedFixture();
  const old = canonical(evaluate(x.claim, x.context));
  const later = structuredClone(x.context.facts[0]!);
  later.ref = { ...later.ref, version: 2, sha256: "3".repeat(64) };
  later.supersedes = x.context.facts[0]!.ref;
  later.evidence.publishedAt = "2026-03-10T00:00:00.000Z";
  x.context.facts.push(later);
  expect(canonical(evaluate(x.claim, x.context))).toBe(old);
  x.context.asOf = "2026-03-11T00:00:00.000Z";
  x.context.evaluatedAt = "2026-03-11T00:00:00.000Z";
  blocked(x, "fact_superseded_asof");
});
test("document reissue invalidates approval even if numeric digest unchanged", () => {
  const x = reviewedFixture();
  const doc = structuredClone(x.context.documents[0]!);
  doc.evidence.document.version = 2;
  doc.evidence.document.sha256 = "4".repeat(64);
  doc.supersedes = x.context.documents[0]!.evidence.document;
  x.context.documents.push(doc);
  blocked(x, "source_superseded_asof");
});
test("future publication cannot enter historical analysis", () => {
  const x = reviewedFixture();
  x.context.asOf = "2026-02-28T00:00:00.000Z";
  blocked(x, "future_source");
  expect(evaluate(x.claim, x.context).reasons).toContain("future_information");
});
test("future actual period rejected; explicit published guidance can cover future horizon", () => {
  const x = fixture();
  x.claim.identity.period.end = "2027-12-31";
  x.claim.bindings[0]!.expected = structuredClone(x.claim.identity);
  x.context.facts[0]!.identity = structuredClone(x.claim.identity);
  blocked(x, "future_actual_period");
  x.claim.temporalBasis = "issuer_guidance";
  x.claim.identity.period.kind = "forecast";
  x.claim.bindings[0]!.expected = structuredClone(x.claim.identity);
  x.context.facts[0]!.identity = structuredClone(x.claim.identity);
  expect(evaluate(x.claim, x.context).technical).toBe("eligible");
});
test("impossible calendar dates rejected, leap-day accepted", () => {
  const x = fixture();
  for (const end of ["2025-02-29", "2025-02-30", "2025-13-01"]) {
    const c = structuredClone(x.claim);
    c.identity.period.end = end;
    expect(ClaimSchema.safeParse(c).success).toBe(false);
  }
  const c = structuredClone(x.claim);
  c.identity.period.start = "2024-01-01";
  c.identity.period.end = "2024-02-29";
  c.bindings[0]!.expected = structuredClone(c.identity);
  expect(ClaimSchema.safeParse(c).success).toBe(true);
});
test("unsafe source URL, missing locator and malformed timestamp fail closed", () => {
  const x = fixture();
  for (const s of [
    "javascript:alert(1)",
    "http://example.com",
    "https://user:password@example.com",
  ]) {
    const c = structuredClone(x.claim);
    c.sources[0]!.url = s;
    expect(ClaimSchema.safeParse(c).success).toBe(false);
  }
  x.claim.sources[0]!.locator = { page: null, table: null, anchor: null };
  expect(ClaimSchema.safeParse(x.claim).success).toBe(false);
});
test("rights unknown/restricted/expired/public-absent are not financial truth flags", () => {
  for (const kind of ["unknown", "restricted", "expired", "public"]) {
    const x = reviewedFixture();
    if (kind === "unknown") x.claim.rights.declared = "unknown";
    if (kind === "restricted") x.context.grants[0]!.status = "restricted";
    if (kind === "expired") x.context.grants[0]!.validUntil = "2026-03-04T00:00:00.000Z";
    if (kind === "public") x.context.use = "public_display";
    blocked(x, "reuse_not_permitted");
  }
});
test("modifying content revokes prior review digest; old revision remains intact", () => {
  const x = reviewedFixture();
  const old = structuredClone(x);
  x.claim.body.text = "Changed interpretation";
  blocked(x, "review_digest_mismatch");
  expect(evaluate(old.claim, old.context).publication).toBe("eligible");
});
test("ledger tampering and duplicate actor/fact identities rejected", () => {
  const x = reviewedFixture();
  x.context.events[0]!.actorId = "attacker";
  blocked(x, "invalid_review_ledger");
  const y = fixture();
  y.context.actors.push(y.context.actors[0]!);
  expect(ContextSchema.safeParse(y.context).success).toBe(false);
});
test("withdrawal blocks source trail and approval", async () => {
  const x = reviewedFixture();
  x.context.events = appendReview(
    x.claim,
    x.context,
    "withdraw",
    "synthetic-author",
    "2026-03-05T00:00:00.000Z",
    "f".repeat(64),
  );
  expect(evaluate(x.claim, x.context)).toMatchObject({
    workflow: "Withdrawn",
    publication: "blocked",
  });
  const trail = await resolveTrail(
    x.claim,
    { resolveContext: async () => x.context },
    x.context.asOf,
    x.context.evaluatedAt,
  );
  expect(trail.trail).toEqual([]);
});
test("resolver time mismatch cannot substitute a different as-of snapshot", async () => {
  const x = fixture();
  await expect(
    resolveTrail(
      x.claim,
      { resolveContext: async () => x.context },
      "2026-02-01T00:00:00.000Z",
      x.context.evaluatedAt,
    ),
  ).rejects.toThrow("resolver_context_time_mismatch");
});
test("PoC trace points to exact original version without copying any value", async () => {
  const x = reviewedFixture();
  const trail = await resolveTrail(
    x.claim,
    { resolveContext: async () => x.context },
    x.context.asOf,
    x.context.evaluatedAt,
  );
  expect(trail.trail[0]!.exactRef).toEqual(x.claim.bindings[0]!.fact);
  expect(JSON.stringify(trail)).not.toContain('"value":');
  expect(trail.trail[0]!.exactMarefaRowSelectionSupportedByWEB07).toBe(false);
  expect(legacyWEB07Compatibility().readyForLiveResearchClaims).toBe(false);
});
function derivedFixture() {
  const x = fixture();
  x.claim.contentKind = "derived_number";
  x.claim.identity.metric = "free_cash_flow";
  x.claim.bindings[0]!.expected = structuredClone(x.claim.identity);
  x.context.facts[0]!.identity = structuredClone(x.claim.identity);
  for (const [i, key] of ["operating_cash_flow", "capex"].entries()) {
    const b = structuredClone(x.claim.bindings[0]!);
    b.id = key;
    b.role = "input";
    b.expected.metric = key;
    b.fact = { id: key, version: 1, sha256: String(i + 1).repeat(64) };
    x.claim.bindings.push(b);
    const f = structuredClone(x.context.facts[0]!);
    f.ref = b.fact;
    f.identity = b.expected;
    f.valueDigest = String(i + 1).repeat(64);
    x.context.facts.push(f);
  }
  x.claim.calculation = {
    methodId: "synthetic-fcf-no-calculation-performed",
    version: "1",
    outputBindingId: "revenue",
    inputBindingIds: ["operating_cash_flow", "capex"],
  };
  x.context.facts[0]!.lineage = {
    methodId: x.claim.calculation.methodId,
    version: "1",
    status: "reproduced",
    inputs: x.claim.bindings.filter((b) => b.role === "input").map((b) => b.fact),
  };
  // Independent stores must not share references; mutation targets only the resolver snapshot.
  return { claim: structuredClone(x.claim), context: structuredClone(x.context) };
}
test("derived result consumes exact engine lineage refs without computing a number", () => {
  const x = derivedFixture();
  expect(evaluate(x.claim, x.context).technical).toBe("eligible");
  x.context.events = appendReview(
    x.claim,
    x.context,
    "financial_review",
    "synthetic-finance",
    "2026-03-03T00:00:00.000Z",
    "f".repeat(64),
  );
  x.context.events = appendReview(
    x.claim,
    x.context,
    "editorial_approve",
    "synthetic-editor",
    "2026-03-04T00:00:00.000Z",
    "f".repeat(64),
  );
  expect(evaluate(x.claim, x.context).publication).toBe("eligible");
});
test("changed input version, incomplete lineage, method and rights all block derived content", () => {
  for (const mode of ["input-version", "unreproduced", "method", "rights"]) {
    const x = derivedFixture();
    if (mode === "input-version") x.context.facts[0]!.lineage!.inputs[0]!.version = 2;
    if (mode === "unreproduced") x.context.facts[0]!.lineage!.status = "unverified";
    if (mode === "method") x.context.facts[0]!.lineage!.version = "2";
    if (mode === "rights") x.context.grants[0]!.uses = ["internal_research"];
    blocked(x, mode === "rights" ? "reuse_not_permitted" : "derivation_lineage_mismatch");
  }
});
test("derived source cannot masquerade as issuer reported fact", () => {
  const x = derivedFixture();
  x.claim.contentKind = "published_fact";
  x.claim.calculation = null;
  blocked(x, "derived_fact_not_reported");
});
test("rejected financial input stays rejected, missing never becomes complete", () => {
  const x = reviewedFixture();
  x.context.facts[0]!.financial = "rejected";
  expect(evaluate(x.claim, x.context)).toMatchObject({
    financial: "rejected",
    publication: "blocked",
    workflow: "Invalidated",
  });
});
test("content kinds distinguish interpretation/assumption/scenario from reported data", () => {
  for (const contentKind of ["research_interpretation", "assumption", "scenario"] as const) {
    const x = fixture();
    x.claim.contentKind = contentKind;
    if (contentKind !== "research_interpretation") x.claim.temporalBasis = "assumption";
    expect(ClaimSchema.safeParse(x.claim).success).toBe(true);
  }
  const x = fixture();
  x.claim.contentKind = "assumption";
  expect(ClaimSchema.safeParse(x.claim).success).toBe(false);
});
test("claim revision retains supersedes reference and reproducible canonical digest", () => {
  const x = fixture();
  const older = digest(x.claim);
  const next = structuredClone(x.claim);
  next.revision = 2;
  next.supersedes = { claimId: x.claim.claimId, revision: 1 };
  expect(ClaimSchema.safeParse(next).success).toBe(true);
  expect(digest(next)).not.toBe(older);
  expect(digest(JSON.parse(JSON.stringify(x.claim)))).toBe(older);
});
