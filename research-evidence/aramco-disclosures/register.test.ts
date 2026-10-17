// WEB-08B03: disclosure/event/claim register over the accepted frozen snapshot — structure and negative cases.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { ContextSchema, TOPICS, evaluate } from "../v1/contract";
import { CLAIM_CURATION, DOCUMENT_CURATION, EVENT_GROUPS, PROJECT_CURATION } from "./curation";
import { buildRegister, loadB02, loadSnapshot, snapshotFrom } from "./register";
import { SOURCE_REVIEW_REF } from "./source-review";
import { bridgeAll, toResearchClaim } from "./contract-bridge";
import { deliverables } from "./build";

const raw = () =>
  JSON.parse(
    gunzipSync(
      readFileSync(
        new URL("../../tests/fixtures/codex-20261013/2222-page.json.gz", import.meta.url),
      ),
    ).toString(),
  );
const b02 = loadB02();
const snap = loadSnapshot();
const r = buildRegister(snap, b02);
const DOCUMENT_TYPES = new Set(["annual_report", "interim_report", "earnings_release"]);

describe("inventory and separation of events from documents", () => {
  test("every disclosure and corporate action in the snapshot is classified; nothing silently dropped", () => {
    expect(snap.disclosures).toHaveLength(15);
    expect(snap.actions).toHaveLength(8);
    expect(r.unclassified).toEqual([]);
    const claimed = new Set(
      r.claims.map((c) =>
        c.record.section === "disclosures" ? `d|${c.record.title}` : `a|${c.record.actionKey}`,
      ),
    );
    const docs = new Set(DOCUMENT_CURATION.map((d) => `d|${d.record.title}`));
    for (const d of snap.disclosures)
      expect(claimed.has(`d|${d.title}`) || docs.has(`d|${d.title}`)).toBe(true);
    for (const a of snap.actions) expect(claimed.has(`a|${a.action_key}`)).toBe(true);
  });

  test("report editions are documents, never events or claims", () => {
    for (const c of r.claims) {
      if (c.record.section === "disclosures") expect(DOCUMENT_TYPES.has(c.record.type)).toBe(false);
    }
    const docUrls = new Set(r.documents.map((d) => d.artifactUrl));
    for (const dc of DOCUMENT_CURATION) {
      const d = snap.disclosures.find((x) => x.title === dc.record.title)!;
      expect(docUrls.has(d.source_url)).toBe(true);
    }
    expect(r.documents.filter((d) => d.family === "annual_report").length).toBeGreaterThanOrEqual(
      4,
    );
  });

  test("one event per real-world event: two records of the buyback / Q4 dividend form one event", () => {
    const ev = new Map(r.events.map((e) => [e.eventId, e]));
    expect(ev.get("evt-buyback-2026")!.records).toHaveLength(2);
    expect(ev.get("evt-q4-2025-base-dividend")!.records).toHaveLength(2);
    // bonus shares and capital increase on the same date are NOT merged without confirmation
    expect(ev.get("evt-bonus-2023")!.records).toHaveLength(1);
    expect(ev.get("evt-capital-increase-2023")!.records).toHaveLength(1);
    expect(
      r.claims
        .filter((c) => c.eventId === "evt-buyback-2026")
        .every((c) => c.qualification.warnings.includes("same_event_multiple_records")),
    ).toBe(true);
  });

  test("retrospective evidence is flagged (event before its source document)", () => {
    for (const id of [
      "aramco-petro-rabigh-stake-2025",
      "aramco-bonus-2022",
      "aramco-capital-increase-2023",
    ])
      expect(r.claims.find((c) => c.id === id)!.qualification.warnings).toContain(
        "evidence_published_after_event",
      );
  });
});

describe("claims: verbatim, sourced, WITHHELD", () => {
  test("every quote is a verbatim substring of the engine text it cites", () => {
    for (const c of r.claims) {
      if (c.quote === null) continue;
      const src =
        c.record.section === "disclosures"
          ? snap.disclosures.find((d) => d.title === (c.record as { title: string }).title)!
          : null;
      const text =
        c.record.section === "disclosures"
          ? c.quoteField === "title"
            ? src!.title
            : src!.body_text!
          : snap.actions.find(
              (a) => a.action_key === (c.record as { actionKey: string }).actionKey,
            )!.title;
      expect(text.includes(c.quote)).toBe(true);
    }
  });

  test("every claim is WITHHELD, never publication-eligible, and lists rights/review/editorial gaps", () => {
    expect(r.claims).toHaveLength(22);
    for (const c of r.claims) {
      expect(c.qualification.status).toBe("WITHHELD");
      expect(c.qualification.publicationEligible).toBe(false);
      for (const g of [
        "document_version_missing",
        "documented_rights_grant_missing",
        "independent_review_receipt_missing",
        "editorial_review_missing",
      ] as const)
        expect(c.qualification.gaps).toContain(g);
      expect(c.evidence.url).toMatch(/^https:\/\//);
    }
  });

  test("PDF hashes come only from B02's pinned downloads, never from engine content_hash", () => {
    const pinned = new Set(b02.documents.map((d) => d.sha256));
    const contentHashes = new Set(snap.officialSources.map((o) => o.content_hash).filter(Boolean));
    for (const d of r.documents) {
      if (d.pdfSha256) {
        expect(pinned.has(d.pdfSha256)).toBe(true);
        expect(contentHashes.has(d.pdfSha256)).toBe(false);
      }
    }
    for (const c of r.claims)
      if (c.evidence.pdfSha256 === null)
        expect(c.qualification.gaps).toContain("original_artifact_sha256_missing");
  });

  test("locators are never claimed as verified: B02 reviewed only statement pages, not these", () => {
    for (const c of r.claims) {
      expect(
        c.qualification.gaps.some((g) => g === "locator_missing" || g === "locator_unverified"),
      ).toBe(true);
    }
  });

  test("figures inside verbatim quotes are flagged, never parsed; statement figures are not quoted at all", () => {
    const flagged = r.claims
      .filter((c) => c.qualification.warnings.includes("quote_contains_disclosed_figure"))
      .map((c) => c.id)
      .sort();
    expect(flagged).toEqual([
      "aramco-buyback-2026",
      "aramco-buyback-2026-action",
      "aramco-capex-guidance-2026",
      "aramco-msc-12mbd",
      "aramco-petro-rabigh-stake-2025",
      "aramco-rig-purchase-commitments",
    ]);
    for (const id of ["aramco-fy2025-results-publication", "aramco-fy2025-dividends-paid"]) {
      const c = r.claims.find((x) => x.id === id)!;
      expect(
        c.quote === null || !/\d[\d.,]*\s*(%|billion|million)|\b(USD|SAR)\s*\d/i.test(c.quote),
      ).toBe(true);
      expect(c.links.marefaData).toMatch(/\?tab=(financials|shareholders)$/);
    }
    for (const c of r.claims) expect(Object.keys(c)).not.toContain("value");
  });

  test("topics are the 18 investor topics; categories are the four allowed; plans carry a plan kind", () => {
    for (const c of r.claims) {
      expect(TOPICS).toContain(c.topic);
      for (const x of c.crossTopics) expect(TOPICS).toContain(x);
      expect(["official_fact", "management_plan", "assumption", "research_opinion"]).toContain(
        c.category,
      );
      if (c.category === "management_plan") expect(c.planKind).not.toBeNull();
      else expect(c.planKind).toBeNull();
    }
  });

  test("guidance, targets and management expectations are never presented as facts", () => {
    const byId = new Map(r.claims.map((c) => [c.id, c]));
    expect(byId.get("aramco-capex-guidance-2026")!.category).toBe("management_plan");
    expect(byId.get("aramco-sales-gas-growth-2030")!.planKind).toBe("management_target");
    expect(byId.get("aramco-contingencies-management-view")!.planKind).toBe(
      "management_expectation",
    );
    // engine type "guidance" on a board-declared dividend is overridden, visibly
    const div = byId.get("aramco-q4-2025-base-dividend")!;
    expect(div.engineType).toBe("guidance");
    expect(div.category).toBe("official_fact");
    expect(div.qualification.warnings).toContain("classification_override");
  });

  test("no parallel financial store: results text is not quoted, no values or amounts in deliverables", () => {
    const results = r.claims.find((c) => c.eventType === "results_publication")!;
    expect(results.quote).toBeNull();
    expect(results.links.marefaData).toMatch(/\?tab=financials$/);
    const all = JSON.stringify(deliverables(r));
    for (const forbidden of [
      '"value"',
      '"cash_amount"',
      '"amount"',
      "1,559.342",
      "350.210",
      "510.798",
      "190.444",
      "320447000000",
    ])
      expect(all.includes(forbidden)).toBe(false);
  });

  test("links point to Company Intelligence topics and Marefa Data groups of the accepted model", () => {
    for (const c of r.claims) {
      expect(c.links.intelligence).toMatch(
        /^\/preview\/web-v1\/companies\/2222\/intelligence\?topic=[a-z_]+$/,
      );
      expect(c.links.marefaData).toMatch(
        /^\/preview\/web-v1\/companies\/2222\?tab=(business|financials|shareholders|market|risks)$/,
      );
    }
  });
});

describe("topic map, projects and the risk/guidance register", () => {
  test("all 18 topics are mapped; topics without disclosures say so instead of being filled", () => {
    expect(r.topicMap.map((t) => t.topic)).toEqual([...TOPICS]);
    const st = new Map(r.topicMap.map((t) => [t.topic, t.status]));
    for (const t of ["valuation", "analysts", "competitors", "trading"] as const)
      expect(st.get(t)).toBe("no_disclosure_in_sample");
    for (const t of [
      "forecasts",
      "risks",
      "dividends_actions",
      "operations",
      "business",
      "news",
    ] as const)
      expect(st.get(t)).toBe("has_disclosures");
  });

  test("projects: no field claims non-disclosure; stated/in-original/not-in-record are distinct; drivers not authored", () => {
    expect(r.projects.map((p) => p.id)).toEqual(PROJECT_CURATION.map((p) => p.id));
    const byId = new Map(r.projects.map((p) => [p.id, p]));
    const inOriginal = (pages: number[]) => ({
      status: "in_original_per_independent_review_not_extracted",
      pdfPages: pages,
      reviewSha: SOURCE_REVIEW_REF.sha,
    });
    const notInRecord = { status: "not_in_engine_record_original_unchecked" };
    for (const id of ["jafurah", "tanajib", "marjan-increment"]) {
      expect(byId.get(id)!.capacity).toEqual(inOriginal([13, 15, 54]));
      expect(byId.get(id)!.timing).toEqual(inOriginal([13, 15, 54]));
    }
    expect(byId.get("sales-gas-growth-2030")!.capacity).toEqual(inOriginal([13, 50, 54]));
    expect(byId.get("msc-12mbd")!.capacity).toEqual({
      status: "stated_in_engine_quote_not_extracted",
      claimId: "aramco-msc-12mbd",
    });
    // the sentence on crude capacity states no year: no inferred 2030
    expect(byId.get("msc-12mbd")!.timing).toEqual(notInRecord);
    for (const p of r.projects) {
      expect(p.cost).toEqual(notInRecord);
      expect(p.economicDrivers.status).toBe("not_authored");
      expect(p.qualification).toBe("WITHHELD");
      for (const m of p.relatedEngineMetrics) expect(m.presentInSnapshot).toBe(true);
      for (const d of p.description) expect(d.quote!.length).toBeGreaterThan(0);
    }
    expect(JSON.stringify(deliverables(r))).not.toContain('"not_disclosed"');
  });

  test("risk/guidance register separates facts and plans; no assumptions or research opinions exist", () => {
    const c = r.riskGuidance.categories;
    expect(c.assumption).toEqual([]);
    expect(c.research_opinion).toEqual([]);
    expect([...c.management_plan].sort()).toEqual(
      [
        "aramco-capex-guidance-2026",
        "aramco-contingencies-management-view",
        "aramco-msc-12mbd",
        "aramco-sales-gas-growth-2030",
      ].sort(),
    );
    expect(c.official_fact).toContain("aramco-hydrocarbon-risk-factors");
    expect(c.official_fact).toContain("aramco-rig-purchase-commitments");
  });
});

describe("WEB-08B01 contract bridge", () => {
  test("no real Aramco claim is constructible: no trusted document identity exists", () => {
    for (const x of bridgeAll(r)) {
      expect(x.result.constructible).toBe(false);
      if (!x.result.constructible) expect(x.result.missing).toContain("trusted_document_identity");
    }
  });

  test("with a SYNTHETIC trusted identity a claim validates, yet evaluate() still blocks publication", () => {
    const c = r.claims.find((x) => x.id === "aramco-jafurah-midstream-contract")!;
    const synthetic = {
      id: "SYNTHETIC-doc-not-real",
      version: 1,
      sha256: c.evidence.pdfSha256!, // must match the B02 pin (R01)
      publishedAt: "2026-03-10T00:00:00.000Z",
    };
    const res = toResearchClaim(c, r.company, synthetic, {
      authorId: "synthetic-author",
      createdAt: "2026-10-17T00:00:00.000Z",
    });
    expect(res.constructible).toBe(true);
    if (!res.constructible) return;
    expect(res.claim.contentKind).toBe("published_fact");
    expect(res.claim.temporalBasis).toBe("actual");
    expect(res.claim.rights.declared).toBe("unknown");
    const ctx = ContextSchema.parse({
      snapshotId: "synthetic",
      asOf: "2026-10-17T00:00:00.000Z",
      evaluatedAt: "2026-10-17T00:00:00.000Z",
      use: "public_display",
      facts: [],
      documents: [
        {
          evidence: res.claim.sources[0],
          kind: "issuer",
          originalArtifactVerified: false,
          supersedes: null,
        },
      ],
      grants: [],
      actors: [{ id: "synthetic-author", roles: ["author"] }],
      events: [],
    });
    const v = evaluate(res.claim, ctx);
    expect(v.publication).toBe("blocked");
    expect(v.rights).toBe("blocked");
    expect(v.editorial).toBe("unreviewed");
    expect(v.workflow).toBe("Draft");
  });

  test("a management plan bridges as issuer guidance, never as an actual", () => {
    const c = r.claims.find((x) => x.id === "aramco-contingencies-management-view")!;
    const res = toResearchClaim(
      c,
      r.company,
      {
        id: "SYNTHETIC",
        version: 1,
        sha256: "1".repeat(64),
        publishedAt: "2026-03-09T00:00:00.000Z",
      },
      { authorId: "a", createdAt: "2026-10-17T00:00:00.000Z" },
    );
    expect(res.constructible).toBe(true);
    if (res.constructible) expect(res.claim.temporalBasis).toBe("issuer_guidance");
  });
});

describe("negative cases (synthetic snapshots)", () => {
  test("an unknown disclosure type is reported as unclassified, not silently mapped", () => {
    const x = raw();
    x.sections.disclosures.push({
      ...x.sections.disclosures[0],
      disclosure_type: "synthetic_new_type",
      title: "SYNTHETIC unknown",
    });
    const reg = buildRegister(snapshotFrom(x), b02);
    expect(reg.unclassified.map((u) => u.record)).toContainEqual(
      expect.objectContaining({ type: "synthetic_new_type" }),
    );
  });

  test("a project field may only cite an engine quote that actually states a figure", () => {
    const bad = structuredClone(PROJECT_CURATION);
    bad.find((p) => p.id === "jafurah")!.capacity = {
      from: "engine_quote",
      claimId: "aramco-project-milestones-2025",
    };
    expect(() => buildRegister(snap, b02, undefined, undefined, bad)).toThrow(
      /project_field_claim_invalid:jafurah/,
    );
  });

  test("a non-verbatim quote is rejected", () => {
    const bad = structuredClone(CLAIM_CURATION);
    bad[0]!.claims[0]!.quote = "Aramco guided 2026 capex of USD 52 billion."; // paraphrase
    expect(() => buildRegister(snap, b02, bad)).toThrow(/quote_not_verbatim/);
  });

  test("a curated record missing from the snapshot, or duplicated in it, fails closed", () => {
    const x = raw();
    x.sections.disclosures = x.sections.disclosures.filter(
      (d: { title: string }) => d.title !== "Share buyback program",
    );
    expect(() => buildRegister(snapshotFrom(x), b02)).toThrow(/record_not_unique_or_missing/);
    const y = raw();
    y.sections.disclosures.push(
      y.sections.disclosures.find((d: { title: string }) => d.title === "Share buyback program"),
    );
    expect(() => buildRegister(snapshotFrom(y), b02)).toThrow(/record_not_unique_or_missing/);
  });

  test("a version change in the engine record does not inherit the curated decision", () => {
    const x = raw();
    const d = x.sections.disclosures.find(
      (d: { title: string }) => d.title === "Share buyback program",
    );
    d.version = 2;
    expect(() => buildRegister(snapshotFrom(x), b02)).toThrow(/record_not_unique_or_missing/);
  });

  test("an http source URL is reported as a gap", () => {
    const x = raw();
    const d = x.sections.disclosures.find(
      (d: { title: string }) => d.title === "Hydrocarbon market and production risks",
    );
    d.provenance.source.source_url = d.provenance.source.source_url.replace("https:", "http:");
    const reg = buildRegister(snapshotFrom(x), b02);
    expect(
      reg.claims.find((c) => c.id === "aramco-hydrocarbon-risk-factors")!.qualification.gaps,
    ).toContain("source_url_not_https");
  });

  test("a PDF hash is attached only on an exact URL match with B02, never by content_hash", () => {
    const fake = {
      ...b02,
      documents: b02.documents.map((d) => ({ ...d, url: d.url + "?synthetic" })),
    };
    const reg = buildRegister(snap, fake);
    expect(reg.claims.every((c) => c.evidence.pdfSha256 === null)).toBe(true);
  });
});

describe("deliverables", () => {
  test("committed review-delivery/WEB08B03 files equal a fresh deterministic build", () => {
    for (const [name, v] of Object.entries(deliverables(r))) {
      const cur = readFileSync(
        new URL(`../../review-delivery/WEB08B03/${name}`, import.meta.url),
        "utf8",
      );
      expect(cur).toBe(JSON.stringify(v, null, 1) + "\n");
    }
  });
});

// ───────── REWORK R01–R04 (Codex review dcdecad). Each block includes the case that previously passed wrongly.
const AUTH = { authorId: "SYNTHETIC-author", createdAt: "2026-10-17T00:00:00.000Z" };
const claim = (id: string) => structuredClone(r.claims.find((c) => c.id === id)!);
const ident = (over: Partial<Parameters<typeof toResearchClaim>[2] & object> = {}) => ({
  id: "SYNTHETIC-doc",
  version: 1,
  sha256: claim("aramco-jafurah-midstream-contract").evidence.pdfSha256!,
  publishedAt: "2026-03-10T00:00:00.000Z",
  ...over,
});
const missingOf = (x: ReturnType<typeof toResearchClaim>) => (x.constructible ? [] : x.missing);

describe("R01 evidence binding", () => {
  const j = claim("aramco-jafurah-midstream-contract");
  test("control: the matching pinned identity constructs", () => {
    expect(toResearchClaim(j, r.company, ident(), AUTH).constructible).toBe(true);
  });
  test("a resolver hash that contradicts the B02 pin is rejected (previously accepted)", () => {
    expect(
      missingOf(toResearchClaim(j, r.company, ident({ sha256: "1".repeat(64) }), AUTH)),
    ).toContain("document_sha256_conflicts_with_pinned");
  });
  test("an earlier publication time cannot backdate knowledge (previously replaced the record)", () => {
    expect(
      missingOf(
        toResearchClaim(j, r.company, ident({ publishedAt: "2020-01-01T00:00:00.000Z" }), AUTH),
      ),
    ).toContain("document_published_at_earlier_than_recorded_filing");
    expect(
      missingOf(toResearchClaim(j, r.company, ident({ publishedAt: "2026-03-10" }), AUTH)),
    ).toContain("document_published_at_invalid");
  });
  test("url, company, id and version must be consistent", () => {
    const m = (o: object) => missingOf(toResearchClaim(j, r.company, ident(o), AUTH));
    expect(m({ url: "https://www.aramco.com/other.pdf" })).toContain("document_url_mismatch");
    expect(m({ url: j.evidence.url })).toEqual([]);
    expect(m({ companyId: "SA:2010" })).toContain("document_company_mismatch");
    expect(m({ id: j.evidence.url })).toContain("document_id_derived_from_url");
    expect(m({ version: 0 })).toContain("document_version_invalid");
    expect(
      missingOf(toResearchClaim({ ...j, companyId: "SA:2010" }, r.company, ident(), AUTH)),
    ).toContain("company_identity_mismatch");
  });
  test("conflicting B02 artifacts for one URL or key are rejected, not first-chosen", () => {
    const f = b02.documents.find((d) => d.key === "FY2025")!;
    const others = b02.documents.filter((d) => d !== f);
    expect(() =>
      buildRegister(snap, { ...b02, documents: [f, { ...f, sha256: "f".repeat(64) }, ...others] }),
    ).toThrow(/b02_conflicting_artifact_identity:FY2025/);
    expect(() =>
      buildRegister(snap, {
        ...b02,
        documents: [f, { ...f, url: "https://www.aramco.com/x.pdf" }, ...others],
      }),
    ).toThrow(/b02_conflicting_artifact_identity:FY2025/);
    expect(() => buildRegister(snap, { ...b02, documents: [f, f, ...others] })).not.toThrow();
  });
  test("real claims still get no identity: nothing synthetic is minted", () => {
    for (const x of bridgeAll(r)) expect(x.result.constructible).toBe(false);
    expect(JSON.stringify(deliverables(r))).not.toContain("SYNTHETIC");
  });
});

describe("R02 claim semantics and periods", () => {
  const j = claim("aramco-jafurah-midstream-contract");
  test("assumption and research_opinion are refused, never mapped to published_fact/actual", () => {
    for (const category of ["assumption", "research_opinion"] as const)
      expect(missingOf(toResearchClaim({ ...j, category }, r.company, ident(), AUTH))).toContain(
        `unsupported_category:${category}`,
      );
  });
  test("FY2026 guidance keeps its year as identity, without an invented reporting period", () => {
    const c = claim("aramco-capex-guidance-2026");
    const x = toResearchClaim(
      { ...c, evidence: { ...c.evidence, page: 1 } },
      r.company,
      ident({ sha256: "0".repeat(64) }),
      AUTH,
    );
    expect(x.constructible).toBe(true);
    if (!x.constructible) return;
    expect(x.claim.identity.period).toEqual({
      kind: "non_financial",
      start: null,
      end: null,
      fiscalYear: 2026,
      fiscalQuarter: null,
    });
    expect(x.claim.temporalBasis).toBe("issuer_guidance");
    expect(x.claim.limitations.join(" ")).toContain("fiscal year 2026");
  });
  test("a target year is not turned into a fiscal-year period; future years are never actuals", () => {
    const g = { ...claim("aramco-sales-gas-growth-2030"), sourceReview: null };
    const x = toResearchClaim(
      { ...g, evidence: { ...g.evidence, page: 1 } },
      r.company,
      ident({ sha256: "0".repeat(64), publishedAt: "2026-03-09T00:00:00.000Z" }),
      AUTH,
    );
    expect(x.constructible).toBe(true);
    if (x.constructible) {
      expect(x.claim.identity.period.fiscalYear).toBeNull();
      expect(x.claim.limitations.join(" ")).toContain("management target year 2030 versus 2021");
    }
    const future = {
      ...j,
      effect: { kind: "fiscal_year" as const, fiscalYear: 2027, note: "SYNTHETIC" },
    };
    expect(missingOf(toResearchClaim(future, r.company, ident(), AUTH))).toContain(
      "future_period_as_actual",
    );
  });
  test("the bridge says the text is engine text, not a verified issuer statement", () => {
    const x = toResearchClaim(j, r.company, ident(), AUTH);
    if (x.constructible)
      expect(x.claim.limitations[0]).toMatch(/engine snapshot text; not verified verbatim/);
  });
});

describe("R03 original-source alignment (review layer, engine untouched)", () => {
  test("gas target: the conflicting 'more than 80%' is never the quote; the full engine text is kept for tracing", () => {
    const g = claim("aramco-sales-gas-growth-2030");
    expect(g.quote).toBe("Aramco targets growth in sales gas production capacity");
    expect(g.engineExcerpt!.text).toContain("more than 80%");
    expect(g.engineExcerpt!.conflictingFragment).toBe("more than 80%");
    expect(g.qualification.gaps).toContain("engine_text_conflicts_with_original");
    expect(
      missingOf(toResearchClaim(g, r.company, ident({ sha256: "0".repeat(64) }), AUTH)),
    ).toContain("source_review:engine_text_conflicts_with_original");
    const bad = structuredClone(CLAIM_CURATION);
    bad[1]!.claims[0]!.quote =
      "Aramco targets growth in sales gas production capacity of more than 80%";
    expect(() => buildRegister(snap, b02, bad)).toThrow(/engine_conflict_curation_invalid/);
  });
  test("a reviewer meaning conflict that the curation ignores fails the build", () => {
    const bad = structuredClone(CLAIM_CURATION);
    const g = bad[1]!.claims[0]!;
    g.quote = g.engineExcerpt!;
    delete g.engineExcerpt;
    delete g.conflictingFragment;
    delete g.engineTextConflict;
    expect(() => buildRegister(snap, b02, bad)).toThrow(/source_conflict_not_handled/);
  });
  test("locator conflicts stay visible: engine pages kept as recorded, reviewer pages beside them", () => {
    const want: Record<string, [number, number]> = {
      "aramco-petro-rabigh-stake-2025": [232, 233],
      "aramco-bonus-2023": [139, 140],
      "aramco-capital-increase-2023": [139, 140],
      "aramco-bonus-2022": [139, 140],
      "aramco-capital-increase-2022": [139, 140],
    };
    for (const [id, [engine, reviewer]] of Object.entries(want)) {
      const c = claim(id);
      expect(c.evidence.page).toBe(engine);
      expect(c.evidence.pageOrigin).toBe("engine_record");
      expect(c.sourceReview!.reviewerPdfPages).toContain(reviewer);
      expect(c.qualification.gaps).toContain("locator_conflicts_with_independent_review");
      expect(c.qualification.gaps).toContain("exact_date_unverified");
      expect(
        missingOf(toResearchClaim(c, r.company, ident({ sha256: "0".repeat(64) }), AUTH)),
      ).toContain("source_review:locator_conflict");
    }
    for (const id of ["aramco-capex-guidance-2026", "aramco-hydrocarbon-risk-factors"])
      expect(claim(id).qualification.gaps).toContain("original_locator_not_found");
    expect(claim("aramco-rig-purchase-commitments").qualification.gaps).toContain(
      "derived_figure_in_engine_text",
    );
  });
  test("engine text is never presented as verified original text; every claim has a review entry", () => {
    for (const c of r.claims) {
      expect(c.qualification.gaps).toContain("engine_text_not_verified_against_original");
      expect(c.qualification.gaps).not.toContain("independent_source_review_missing");
      expect(c.sourceReview!.reviewSha).toBe(SOURCE_REVIEW_REF.sha);
      if (c.quote !== null) expect(c.quoteOrigin).toBe("engine_snapshot_text");
      expect(c.qualification.status).toBe("WITHHELD");
    }
  });
});

describe("R04 identity, event groups and dates", () => {
  test("incompatible claims under one event id are rejected, not merged under the first type", () => {
    const bad = structuredClone(CLAIM_CURATION);
    const all = bad.flatMap((e) => e.claims);
    all[1]!.eventId = all[0]!.eventId;
    all[1]!.eventType = "acquisition";
    expect(() => buildRegister(snap, b02, bad)).toThrow(/event_group_incompatible/);
    const topic = structuredClone(CLAIM_CURATION);
    topic[5]!.claims[2]!.topic = "business";
    expect(() => buildRegister(snap, b02, topic)).toThrow(/event_group_incompatible/);
    const merged = structuredClone(CLAIM_CURATION);
    merged
      .flatMap((e) => e.claims)
      .find((c) => c.id === "aramco-capital-increase-2023")!.eventType = "bonus_shares";
    merged.flatMap((e) => e.claims).find((c) => c.id === "aramco-capital-increase-2023")!.eventId =
      "evt-bonus-2023";
    expect(() => buildRegister(snap, b02, merged)).toThrow(/event_group_basis_mismatch/);
  });
  test("every group is declared; an uncurated group fails", () => {
    const groups = Object.fromEntries(
      Object.entries(EVENT_GROUPS).filter(([k]) => k !== "evt-rig-commitments"),
    );
    expect(() => buildRegister(snap, b02, undefined, undefined, undefined, groups)).toThrow(
      /event_group_uncurated:evt-rig-commitments/,
    );
  });
  test("impossible or malformed dates are rejected", () => {
    for (const effect of [
      { kind: "event_date", date: "2025-02-30", note: "x" },
      { kind: "as_of", date: "2025-13-01", note: "x" },
      { kind: "event_date", date: "2025-1-5", note: "x" },
      { kind: "reporting_period", start: "2025-12-31", end: "2025-01-01", note: "x" },
      { kind: "fiscal_year", fiscalYear: 20260, note: "x" },
      { kind: "through_year", baseYear: 2030, targetYear: 2021, note: "x" },
      { kind: "term", years: null, months: null, start: null, note: "x" },
    ] as const) {
      const bad = structuredClone(CLAIM_CURATION);
      (bad[0]!.claims[0]!.effect as unknown) = effect;
      expect(() => buildRegister(snap, b02, bad)).toThrow(/invalid_effect_period/);
    }
    const leap = structuredClone(CLAIM_CURATION);
    leap[0]!.claims[0]!.effect = { kind: "event_date", date: "2024-02-29", note: "x" };
    expect(() => buildRegister(snap, b02, leap)).not.toThrow();
  });
  test("Aramco curation is refused for another issuer, including via the raw snapshot", () => {
    expect(() =>
      buildRegister({ ...snap, company: { market: "US", symbol: "OTHER" } }, b02),
    ).toThrow(/curation_company_mismatch:US:OTHER/);
    const x = raw();
    x.company = { ...x.company, symbol: "2010" };
    expect(() => buildRegister(snapshotFrom(x), b02)).toThrow(/curation_company_mismatch:SA:2010/);
  });
  test("17 rows are curated record groups, not verified economic events; links are declared both ways", () => {
    expect(r.events).toHaveLength(17);
    expect(r.counting.events).toMatch(/not independently verified unique economic events/);
    for (const e of r.events) expect(e.economicEventVerified).toBe(false);
    const ev = new Map(r.events.map((e) => [e.eventId, e]));
    expect(ev.get("evt-projects-2025")!.basis).toBe("composite_of_distinct_milestones");
    expect(claim("aramco-project-milestones-2025").qualification.warnings).toContain(
      "composite_of_distinct_milestones",
    );
    expect(ev.get("evt-bonus-2023")!.linked.map((x) => x.eventId)).toEqual([
      "evt-capital-increase-2023",
    ]);
    expect(ev.get("evt-capital-increase-2022")!.linked.map((x) => x.eventId)).toEqual([
      "evt-bonus-2022",
    ]);
    // strategy group keeps both effects instead of the first claim's
    expect(
      ev
        .get("evt-strategy-2030")!
        .effects.map((e) => e.kind)
        .sort(),
    ).toEqual(["not_stated_in_record", "through_year"]);
  });
});
