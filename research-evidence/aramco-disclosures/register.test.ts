// WEB-08B03: disclosure/event/claim register over the accepted frozen snapshot — structure and negative cases.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { ContextSchema, TOPICS, evaluate } from "../v1/contract";
import { CLAIM_CURATION, DOCUMENT_CURATION, PROJECT_CURATION } from "./curation";
import { buildRegister, loadB02, loadSnapshot, snapshotFrom } from "./register";
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
      "aramco-sales-gas-growth-2030",
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

  test("projects: unknown capacity, cost and dates stay unknown; drivers not authored", () => {
    expect(r.projects.map((p) => p.id)).toEqual(PROJECT_CURATION.map((p) => p.id));
    const capacityInQuote = new Map([
      ["sales-gas-growth-2030", "aramco-sales-gas-growth-2030"],
      ["msc-12mbd", "aramco-msc-12mbd"],
    ]);
    for (const p of r.projects) {
      const claimId = capacityInQuote.get(p.id);
      // a capacity stated by a management target stays text in its quote, never a value
      expect(p.capacity).toEqual(
        claimId
          ? { status: "management_target_in_quote_only", claimId }
          : { status: "not_disclosed" },
      );
      expect(p.disclosedCost).toEqual({ status: "not_disclosed" });
      expect(p.economicDrivers.status).toBe("not_authored");
      expect(p.qualification).toBe("WITHHELD");
      for (const m of p.relatedEngineMetrics) expect(m.presentInSnapshot).toBe(true);
      for (const d of p.description) expect(d.quote.length).toBeGreaterThan(0);
    }
    const byId = new Map(r.projects.map((p) => [p.id, p]));
    expect(byId.get("sales-gas-growth-2030")!.targetDate).toEqual({
      status: "management_target",
      year: 2030,
      claimId: "aramco-sales-gas-growth-2030",
    });
    // the sentence on crude capacity states no year: no inferred 2030
    expect(byId.get("msc-12mbd")!.targetDate).toEqual({ status: "not_disclosed" });
    expect(byId.get("jafurah")!.targetDate).toEqual({ status: "not_disclosed" });
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
      sha256: "0".repeat(64),
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

  test("a project capacity may only point at a management-plan quote that states capacity", () => {
    const bad = structuredClone(PROJECT_CURATION);
    bad.find((p) => p.id === "jafurah")!.capacityStatedIn = "aramco-project-milestones-2025";
    expect(() => buildRegister(snap, b02, undefined, undefined, bad)).toThrow(
      /project_capacity_claim_invalid:jafurah/,
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
