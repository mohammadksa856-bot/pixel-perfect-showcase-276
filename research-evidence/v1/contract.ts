/** Server-only research metadata contract. No numeric values or financial calculations. */
import { createHash } from "node:crypto";
import { z } from "zod";

export const TOPICS = [
  "identity",
  "business",
  "governance",
  "ownership",
  "financials",
  "earnings_quality",
  "ratios",
  "operations",
  "dividends_actions",
  "industry",
  "competitors",
  "trading",
  "forecasts",
  "analysts",
  "valuation",
  "risks",
  "esg",
  "news",
] as const;
const text = z.string().trim().min(1);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(s);
    return Number.isFinite(+d) && d.toISOString().slice(0, 10) === s;
  }, "invalid_calendar_date");
const time = z
  .string()
  .datetime({ precision: 3 })
  .refine((s) => date.safeParse(s.slice(0, 10)).success, "invalid_calendar_date");
const url = z
  .string()
  .url()
  .refine((s) => {
    const u = new URL(s);
    return u.protocol === "https:" && !u.username && !u.password;
  }, "https_without_credentials_required");
export const RefSchema = z
  .object({ id: text, version: z.number().int().positive(), sha256: hash })
  .strict();
export type Ref = z.infer<typeof RefSchema>;
export const PeriodSchema = z
  .object({
    kind: z.enum(["fy", "quarter", "ytd", "ttm", "instant", "forecast", "non_financial"]),
    start: date.nullable(),
    end: date.nullable(),
    fiscalYear: z.number().int().nullable(),
    fiscalQuarter: z.number().int().min(1).max(4).nullable(),
  })
  .strict()
  .superRefine((p, c) => {
    if (!["instant", "non_financial"].includes(p.kind) && (!p.start || !p.end))
      c.addIssue({ code: "custom", message: "flow_period_requires_start_end" });
    if (p.kind === "instant" && (!p.end || p.start !== null))
      c.addIssue({ code: "custom", message: "instant_requires_end_only" });
    if (p.start && p.end && p.start > p.end)
      c.addIssue({ code: "custom", message: "reversed_period" });
    if (p.kind === "quarter" && (!p.fiscalYear || !p.fiscalQuarter))
      c.addIssue({ code: "custom", message: "quarter_identity_required" });
  });
export const IdentitySchema = z
  .object({
    companyId: text,
    metric: text.nullable(),
    scope: z.enum(["consolidated", "standalone", "segment", "non_financial"]),
    dimensions: z.record(text),
    period: PeriodSchema,
    unit: text.nullable(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .nullable(),
  })
  .strict();
export type Identity = z.infer<typeof IdentitySchema>;
export const EvidenceSchema = z
  .object({
    document: RefSchema,
    url,
    publishedAt: time,
    locator: z
      .object({
        page: z.number().int().positive().nullable(),
        table: text.nullable(),
        anchor: text.nullable(),
      })
      .strict()
      .refine((l) => l.page !== null || l.table !== null || l.anchor !== null, "locator_required"),
  })
  .strict();
export type Evidence = z.infer<typeof EvidenceSchema>;
const BindingSchema = z
  .object({
    id: text,
    role: z.enum(["output", "input", "context"]),
    fact: RefSchema,
    expected: IdentitySchema,
    evidence: EvidenceSchema,
  })
  .strict();
export const ClaimSchema = z
  .object({
    schema: z.literal("research-claim/1"),
    claimId: text,
    revision: z.number().int().positive(),
    topic: z.enum(TOPICS),
    contentKind: z.enum([
      "published_fact",
      "derived_number",
      "research_interpretation",
      "assumption",
      "scenario",
    ]),
    temporalBasis: z.enum(["actual", "issuer_guidance", "analyst_estimate", "assumption"]),
    company: z
      .object({
        id: text,
        market: text,
        symbol: z.string().regex(/^[A-Za-z0-9_-]+$/),
        sector: z
          .object({ id: text, scheme: text, version: text, evidence: EvidenceSchema })
          .strict()
          .nullable(),
      })
      .strict(),
    identity: IdentitySchema,
    body: z.object({ language: z.enum(["ar", "en"]), text }).strict(),
    authorId: text,
    createdAt: time,
    informationPublishedAt: time,
    validFrom: time,
    validUntil: time.nullable(),
    supersedes: z
      .object({ claimId: text, revision: z.number().int().positive() })
      .strict()
      .nullable(),
    limitations: z.array(text).min(1),
    sources: z.array(EvidenceSchema),
    bindings: z.array(BindingSchema),
    calculation: z
      .object({
        methodId: text,
        version: text,
        outputBindingId: text,
        inputBindingIds: z.array(text).min(1),
      })
      .strict()
      .nullable(),
    rights: z
      .object({
        declared: z.enum(["unknown", "restricted", "permitted"]),
        grantRefs: z.array(RefSchema),
      })
      .strict(),
  })
  .strict()
  .superRefine((c, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: "custom", message });
    if (c.company.id !== c.identity.companyId) issue("company_identity_mismatch");
    for (const identity of [c.identity, ...c.bindings.map((b) => b.expected)]) {
      if (
        identity.metric &&
        (!identity.unit || !identity.period.end || identity.period.kind === "non_financial")
      )
        issue("numeric_identity_incomplete");
      const monetary = /^([A-Z]{3})(?:\/|$)/.exec(identity.unit ?? "");
      if (monetary && monetary[1] !== identity.currency) issue("unit_currency_inconsistent");
    }
    if (c.company.id !== `${c.company.market}:${c.company.symbol}`)
      issue("company_market_symbol_mismatch");
    if (c.createdAt < c.informationPublishedAt || c.validFrom < c.createdAt)
      issue("claim_dates_inconsistent");
    if (c.supersedes && (c.supersedes.claimId !== c.claimId || c.supersedes.revision >= c.revision))
      issue("invalid_claim_revision_chain");
    if (c.validUntil && c.validUntil <= c.validFrom) issue("invalid_validity_window");
    if (c.contentKind === "derived_number" && !c.calculation)
      issue("derived_requires_calculation_reference");
    if (c.contentKind !== "derived_number" && c.calculation)
      issue("unexpected_calculation_reference");
    if (
      (c.contentKind === "assumption" || c.contentKind === "scenario") &&
      c.temporalBasis !== "assumption"
    )
      issue("assumption_must_be_labelled");
    if (c.contentKind === "published_fact" && c.temporalBasis === "assumption")
      issue("assumption_not_reported_fact");
    if (new Set(c.bindings.map((b) => b.id)).size !== c.bindings.length)
      issue("duplicate_binding_id");
    const outputs = c.bindings.filter((b) => b.role === "output");
    if (c.identity.metric && outputs.length !== 1) issue("numeric_claim_requires_one_output_ref");
    if (outputs.some((b) => canonical(b.expected) !== canonical(c.identity)))
      issue("output_identity_mismatch");
    if (c.bindings.some((b) => !c.sources.some((s) => canonical(s) === canonical(b.evidence))))
      issue("binding_source_not_declared");
    if (
      c.calculation &&
      (outputs[0]?.id !== c.calculation.outputBindingId ||
        c.calculation.inputBindingIds.some(
          (id) => !c.bindings.some((b) => b.id === id && b.role === "input"),
        ) ||
        new Set(c.calculation.inputBindingIds).size !== c.calculation.inputBindingIds.length)
    )
      issue("calculation_bindings_invalid");
    if (!c.sources.length) issue("source_required_even_for_assumptions");
  });
export type Claim = z.infer<typeof ClaimSchema>;

/** Canonical metadata encoding. Hash is integrity, NOT an authentication signature. */
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v !== null && typeof v === "object")
    return `{${Object.entries(v)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, x]) => `${JSON.stringify(k)}:${canonical(x)}`)
      .join(",")}}`;
  const result = JSON.stringify(v);
  if (result === undefined) throw Error("uncanonicalizable_value");
  return result;
}
export const digest = (v: unknown) => createHash("sha256").update(canonical(v)).digest("hex");
const sameRef = (a: Ref, b: Ref) => canonical(a) === canonical(b);

const VerificationSchema = z
  .object({
    reviewerId: text,
    reviewedAt: time,
    reportSha256: hash,
    method: z.literal("independent_source"),
  })
  .strict();
export const FactSchema = z
  .object({
    ref: RefSchema,
    identity: IdentitySchema,
    evidence: EvidenceSchema,
    availability: z.enum(["present", "unavailable", "withheld"]),
    technical: z.enum(["eligible", "ineligible", "unassessed"]),
    financial: z.enum(["verified", "rejected", "unreviewed"]),
    verification: VerificationSchema.nullable(),
    valueDigest: hash,
    supersedes: RefSchema.nullable(),
    lineage: z
      .object({
        methodId: text,
        version: text,
        status: z.enum(["reproduced", "unverified"]),
        inputs: z.array(RefSchema),
      })
      .strict()
      .nullable(),
  })
  .strict();
export const DocumentSchema = z
  .object({
    evidence: EvidenceSchema,
    verifiedLocators: z.array(EvidenceSchema.shape.locator).default([]),
    kind: z.enum(["issuer", "exchange", "analyst", "other"]),
    originalArtifactVerified: z.boolean(),
    supersedes: RefSchema.nullable(),
  })
  .strict();
export const GrantSchema = z
  .object({
    ref: RefSchema,
    document: RefSchema,
    status: z.enum(["permitted", "restricted", "unknown"]),
    uses: z.array(z.enum(["internal_research", "public_display", "derive"])),
    validFrom: time,
    validUntil: time.nullable(),
    reviewerId: text,
  })
  .strict();
export const EventSchema = z
  .object({
    eventId: text,
    action: z.enum(["financial_review", "editorial_approve", "withdraw"]),
    actorId: text,
    at: time,
    claimDigest: hash,
    basisDigest: hash,
    previousHash: hash.nullable(),
    evidenceReportSha256: hash,
    eventHash: hash,
  })
  .strict();
export type ReviewEvent = z.infer<typeof EventSchema>;
export const ContextSchema = z
  .object({
    snapshotId: text,
    asOf: time,
    evaluatedAt: time,
    use: z.enum(["internal_research", "public_display"]),
    facts: z.array(FactSchema),
    documents: z.array(DocumentSchema),
    grants: z.array(GrantSchema),
    actors: z.array(
      z
        .object({
          id: text,
          roles: z.array(
            z.enum(["author", "financial_reviewer", "editorial_reviewer", "rights_reviewer"]),
          ),
        })
        .strict(),
    ),
    events: z.array(EventSchema),
  })
  .strict()
  .superRefine((x, c) => {
    for (const [name, keys] of [
      ["facts", x.facts.map((f) => `${f.ref.id}|${f.ref.version}`)],
      [
        "documents",
        x.documents.map((d) => `${d.evidence.document.id}|${d.evidence.document.version}`),
      ],
      ["grants", x.grants.map((g) => `${g.ref.id}|${g.ref.version}`)],
      ["actors", x.actors.map((a) => a.id)],
    ] as const)
      if (new Set(keys).size !== keys.length)
        c.addIssue({ code: "custom", message: `duplicate_${name}_identity` });
  });
export type Context = z.infer<typeof ContextSchema>;
export type Verdict = {
  availability: "present" | "unavailable" | "withheld";
  technical: "eligible" | "ineligible";
  financial: "verified" | "rejected" | "unreviewed";
  editorial: "approved" | "unreviewed";
  rights: "permitted" | "blocked";
  workflow: "Draft" | "FinanciallyReviewed" | "EditoriallyApproved" | "Invalidated" | "Withdrawn";
  publication: "eligible" | "blocked";
  reasons: string[];
  claimDigest: string | null;
};

/** Resolve only the proof actually used for a locator; unrelated context is not review input. */
function locatorReceipt(source: z.infer<typeof EvidenceSchema>, claim: Claim, context: Context) {
  const doc = context.documents.find((d) => sameRef(d.evidence.document, source.document));
  if (
    !doc ||
    canonical(doc.evidence.locator) === canonical(source.locator) ||
    doc.verifiedLocators.some((l) => canonical(l) === canonical(source.locator))
  )
    return null;
  return (
    context.facts
      .filter(
        (f) =>
          canonical(f.evidence) === canonical(source) &&
          f.availability === "present" &&
          f.technical === "eligible" &&
          f.financial === "verified" &&
          f.verification &&
          context.actors.some(
            (a) => a.id === f.verification!.reviewerId && a.roles.includes("financial_reviewer"),
          ) &&
          f.verification.reviewerId !== claim.authorId &&
          f.verification.reviewedAt <= context.evaluatedAt &&
          f.verification.reviewedAt >= source.publishedAt,
      )
      .sort((a, b) => {
        const left = canonical(a.ref),
          right = canonical(b.ref);
        return left < right ? -1 : left > right ? 1 : 0;
      })[0] ?? null
  );
}

function reviewFacts(claim: Claim, context: Context) {
  return [
    ...claim.bindings.map((b) => context.facts.find((f) => sameRef(f.ref, b.fact)) ?? null),
    ...claim.sources.map((s) => locatorReceipt(s, claim, context)),
  ];
}

/** Review pins the actual verification receipts and input metadata, not only the text/ref list. */
function reviewBasis(claim: Claim, context: Context): string {
  return digest({
    facts: reviewFacts(claim, context),
    documents: claim.sources.map(
      (s) => context.documents.find((d) => sameRef(d.evidence.document, s.document)) ?? null,
    ),
  });
}

function eventsState(
  claim: Claim,
  context: Context,
): { stage: Verdict["workflow"]; reasons: string[] } {
  let previous: string | null = null;
  let stage: Verdict["workflow"] = "Draft";
  let finActor: string | null = null;
  let lastAt = claim.createdAt;
  let lastFinancialReview: ReviewEvent | null = null;
  const seen = new Set<string>();
  for (const event of context.events) {
    const { eventHash, ...body } = event;
    const roles = context.actors.find((a) => a.id === event.actorId)?.roles ?? [];
    if (
      seen.has(event.eventId) ||
      event.previousHash !== previous ||
      digest(body) !== eventHash ||
      event.at < lastAt ||
      event.at > context.evaluatedAt
    )
      return { stage: "Invalidated", reasons: ["invalid_review_ledger"] };
    if (event.claimDigest !== digest(claim))
      return { stage: "Invalidated", reasons: ["review_digest_mismatch"] };
    if (event.action === "financial_review") {
      if (
        !roles.includes("financial_reviewer") ||
        event.actorId === claim.authorId ||
        stage === "Withdrawn"
      )
        return { stage: "Invalidated", reasons: ["unauthorized_financial_review"] };
      stage = "FinanciallyReviewed";
      finActor = event.actorId;
      lastFinancialReview = event;
    } else if (event.action === "editorial_approve") {
      if (
        stage !== "FinanciallyReviewed" ||
        !roles.includes("editorial_reviewer") ||
        event.actorId === claim.authorId ||
        event.actorId === finActor
      )
        return { stage: "Invalidated", reasons: ["unauthorized_or_out_of_order_editorial_review"] };
      stage = "EditoriallyApproved";
    } else {
      if (
        event.actorId !== claim.authorId &&
        !roles.includes("financial_reviewer") &&
        !roles.includes("editorial_reviewer")
      )
        return { stage: "Invalidated", reasons: ["unauthorized_withdrawal"] };
      stage = "Withdrawn";
    }
    seen.add(event.eventId);
    previous = eventHash;
    lastAt = event.at;
  }
  if (stage === "FinanciallyReviewed" || stage === "EditoriallyApproved") {
    const reviewedAt = lastFinancialReview!.at;
    if (
      reviewFacts(claim, context).some(
        (f) => f?.verification && f.verification.reviewedAt > reviewedAt,
      )
    )
      return { stage: "Invalidated", reasons: ["review_precedes_input_verification"] };
    if (lastFinancialReview!.basisDigest !== reviewBasis(claim, context))
      return { stage: "Invalidated", reasons: ["financial_review_basis_changed"] };
  }
  return { stage, reasons: [] };
}

/** Context must come from trusted server resolvers, not a browser or caller-supplied approval flag. */
export function evaluate(input: unknown, environment: unknown): Verdict {
  const parsed = ClaimSchema.safeParse(input),
    ctx = ContextSchema.safeParse(environment);
  const empty: Verdict = {
    availability: "unavailable",
    technical: "ineligible",
    financial: "unreviewed",
    editorial: "unreviewed",
    rights: "blocked",
    workflow: "Draft",
    publication: "blocked",
    reasons: [],
    claimDigest: null,
  };
  if (!parsed.success || !ctx.success)
    return {
      ...empty,
      reasons: [
        "contract_invalid",
        ...(!parsed.success ? parsed.error.issues.map((x) => x.message) : []),
        ...(!ctx.success ? ctx.error.issues.map((x) => x.message) : []),
      ],
    };
  const c = parsed.data,
    x = ctx.data;
  const reasons: string[] = [];
  let availability: Verdict["availability"] = "present";
  let financialInputs = true;
  const role = (id: string, r: string) =>
    x.actors.some((a) => a.id === id && a.roles.includes(r as never));
  if (x.asOf > x.evaluatedAt || c.createdAt > x.evaluatedAt || c.informationPublishedAt > x.asOf)
    reasons.push("future_information");
  if (c.validFrom > x.evaluatedAt || (c.validUntil && c.validUntil <= x.evaluatedAt))
    reasons.push("analysis_not_valid_at_evaluation");
  if (
    c.temporalBasis === "actual" &&
    c.identity.period.end &&
    c.identity.period.end > x.asOf.slice(0, 10)
  )
    reasons.push("future_actual_period");
  if (
    c.company.sector &&
    !c.sources.some((s) => canonical(s) === canonical(c.company.sector!.evidence))
  )
    reasons.push("sector_evidence_not_declared");
  const sources = c.sources;
  if (
    c.temporalBasis === "issuer_guidance" &&
    !x.documents.some(
      (d) => d.kind === "issuer" && sources.some((s) => sameRef(s.document, d.evidence.document)),
    )
  )
    reasons.push("issuer_guidance_requires_issuer_source");
  if (
    c.temporalBasis === "analyst_estimate" &&
    !x.documents.some(
      (d) => d.kind === "analyst" && sources.some((s) => sameRef(s.document, d.evidence.document)),
    )
  )
    reasons.push("analyst_estimate_requires_analyst_source");
  if (sources.some((s) => s.publishedAt > c.informationPublishedAt))
    reasons.push("claim_publication_precedes_sources");
  for (const source of sources) {
    const doc = x.documents.find((d) => sameRef(d.evidence.document, source.document));
    // File identity is separate from its many page/table locators.
    const sameFile =
      doc && doc.evidence.url === source.url && doc.evidence.publishedAt === source.publishedAt;
    const locatorProved =
      doc &&
      (canonical(doc.evidence.locator) === canonical(source.locator) ||
        doc.verifiedLocators.some((l) => canonical(l) === canonical(source.locator)) ||
        locatorReceipt(source, c, x) !== null);
    if (!sameFile || !locatorProved) {
      availability = "unavailable";
      reasons.push("document_reference_mismatch");
      continue;
    }
    if (!doc.originalArtifactVerified) reasons.push("original_artifact_unverified");
    if (source.publishedAt > x.asOf) reasons.push("future_source");
    if (
      x.documents.some(
        (d) =>
          d.supersedes &&
          sameRef(d.supersedes, source.document) &&
          d.evidence.publishedAt <= x.asOf,
      )
    )
      reasons.push("source_superseded_asof");
  }
  for (const b of c.bindings) {
    const f = x.facts.find((f) => sameRef(f.ref, b.fact));
    if (!f || f.availability === "unavailable") {
      if (availability !== "withheld") availability = "unavailable";
      reasons.push("input_unavailable");
      financialInputs = false;
      continue;
    }
    if (f.availability === "withheld") {
      availability = "withheld";
      reasons.push("input_withheld");
    }
    if (f.technical !== "eligible") reasons.push("input_not_technically_eligible");
    if (canonical(f.identity) !== canonical(b.expected)) reasons.push("input_identity_mismatch");
    if (canonical(f.evidence) !== canonical(b.evidence)) reasons.push("input_source_mismatch");
    if (f.evidence.publishedAt > x.asOf) reasons.push("future_input");
    const candidates = x.facts.filter(
      (other) =>
        canonical(other.identity) === canonical(f.identity) &&
        other.evidence.publishedAt <= x.asOf &&
        other.availability === "present" &&
        other.technical === "eligible",
    );
    const knownAsOf = x.facts.filter((other) => other.evidence.publishedAt <= x.asOf);
    if (knownAsOf.some((other) => other.supersedes && sameRef(other.supersedes, f.ref)))
      reasons.push("fact_superseded_asof");
    const active = candidates.filter(
      (other) => !knownAsOf.some((next) => next.supersedes && sameRef(next.supersedes, other.ref)),
    );
    if (new Set(active.map((other) => other.valueDigest)).size > 1) reasons.push("source_conflict");
    if (
      f.financial !== "verified" ||
      !f.verification ||
      !role(f.verification.reviewerId, "financial_reviewer") ||
      f.verification.reviewerId === c.authorId ||
      f.verification.reviewedAt > x.evaluatedAt ||
      f.verification.reviewedAt < f.evidence.publishedAt
    )
      financialInputs = false;
    if (f.financial === "rejected") reasons.push("financial_input_rejected");
    if (b.role === "output" && f.lineage && c.contentKind === "published_fact")
      reasons.push("derived_fact_not_reported");
  }
  if (!c.bindings.length && c.identity.metric) reasons.push("input_unavailable");
  if (c.calculation) {
    const output = c.bindings.find((b) => b.id === c.calculation!.outputBindingId);
    const fact = output && x.facts.find((f) => sameRef(f.ref, output.fact));
    const expected = c.calculation.inputBindingIds.map(
      (id) => c.bindings.find((b) => b.id === id)!.fact,
    );
    if (
      !fact?.lineage ||
      fact.lineage.status !== "reproduced" ||
      fact.lineage.methodId !== c.calculation.methodId ||
      fact.lineage.version !== c.calculation.version ||
      canonical(fact.lineage.inputs) !== canonical(expected)
    )
      reasons.push("derivation_lineage_mismatch");
  }
  const rightsOK =
    c.rights.declared === "permitted" &&
    sources.every((source) =>
      c.rights.grantRefs.some((ref) =>
        x.grants.some(
          (g) =>
            sameRef(g.ref, ref) &&
            sameRef(g.document, source.document) &&
            g.status === "permitted" &&
            g.uses.includes(x.use) &&
            (!c.calculation || g.uses.includes("derive")) &&
            g.validFrom <= x.evaluatedAt &&
            (!g.validUntil || g.validUntil > x.evaluatedAt) &&
            role(g.reviewerId, "rights_reviewer"),
        ),
      ),
    );
  const technicalOK =
    availability === "present" &&
    reasons.filter((r) => r !== "financial_input_rejected").length === 0;
  const workflow = eventsState(c, x);
  reasons.push(...workflow.reasons);
  let stage = workflow.stage;
  if (!technicalOK && stage !== "Draft" && stage !== "Withdrawn") stage = "Invalidated";
  if (!financialInputs && (stage === "FinanciallyReviewed" || stage === "EditoriallyApproved"))
    stage = "Invalidated";
  const financiallyReviewed =
    technicalOK &&
    financialInputs &&
    (stage === "FinanciallyReviewed" || stage === "EditoriallyApproved");
  const editoriallyApproved = financiallyReviewed && stage === "EditoriallyApproved";
  if (!financialInputs) reasons.push("financial_input_verification_required");
  if (!rightsOK) reasons.push("reuse_not_permitted");
  if (stage === "Withdrawn") reasons.push("analysis_withdrawn");
  return {
    availability,
    technical: technicalOK ? "eligible" : "ineligible",
    financial: reasons.includes("financial_input_rejected")
      ? "rejected"
      : financiallyReviewed
        ? "verified"
        : "unreviewed",
    editorial: editoriallyApproved ? "approved" : "unreviewed",
    rights: rightsOK ? "permitted" : "blocked",
    workflow: stage,
    publication: editoriallyApproved && rightsOK ? "eligible" : "blocked",
    reasons: [...new Set(reasons)],
    claimDigest: digest(c),
  };
}

/** Append-only in-memory PoC; persistence/authentication must be supplied by a trusted server. */
export function appendReview(
  claimInput: Claim,
  contextInput: Context,
  action: ReviewEvent["action"],
  actorId: string,
  at: string,
  reportSha256: string,
): ReviewEvent[] {
  const claim = ClaimSchema.parse(claimInput),
    context = ContextSchema.parse(contextInput);
  const before = evaluate(claim, context);
  if (
    action !== "withdraw" &&
    (before.technical !== "eligible" ||
      before.reasons.includes("financial_input_verification_required"))
  )
    throw Error("review_preconditions_failed");
  const body = {
    eventId: `review-${context.events.length + 1}`,
    action,
    actorId,
    at,
    claimDigest: digest(ClaimSchema.parse(claim)),
    basisDigest: reviewBasis(claim, context),
    previousHash: context.events.at(-1)?.eventHash ?? null,
    evidenceReportSha256: reportSha256,
  };
  const event = EventSchema.parse({ ...body, eventHash: digest(body) });
  const events = [...context.events, event];
  const state = eventsState(claim, { ...context, events });
  if (state.reasons.length) throw Error(state.reasons.join(","));
  return events;
}

/** Exact engine-referenced link intent. WEB07 data route lacks row-focus/version selection. */
export function linkIntent(c: Claim, b: Claim["bindings"][number]) {
  const symbol = encodeURIComponent(c.company.symbol),
    topic = encodeURIComponent(c.topic),
    metric = encodeURIComponent(b.expected.metric ?? "");
  const groups: Record<Claim["topic"], string> = {
    identity: "business",
    business: "business",
    industry: "business",
    competitors: "business",
    financials: "financials",
    earnings_quality: "financials",
    ratios: "financials",
    operations: "financials",
    governance: "shareholders",
    ownership: "shareholders",
    dividends_actions: "shareholders",
    trading: "market",
    valuation: "market",
    forecasts: "market",
    analysts: "market",
    risks: "risks",
    esg: "risks",
    news: "risks",
  };
  return {
    intelligence: `/preview/web-v1/companies/${symbol}/intelligence?topic=${topic}&focus=${metric}`,
    marefaData: `/preview/web-v1/companies/${symbol}?tab=${groups[c.topic]}`,
    exactRef: b.fact,
    document: b.evidence.document,
    locator: b.evidence.locator,
    exactMarefaRowSelectionSupportedByWEB07: false,
  };
}
