import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// DATA-02 batch 05: review closure for Codex's DATA02 (@239d107) and DATA03 (@5179346) reviews, display map v2,
// entity-type display specs. No new extraction, no status change: every open record stays REVIEW.
const ROOT = join(import.meta.dir, "..", "product-tracking", "outbox", "DATA-02");
const B = join(ROOT, "batch-05");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
const read = (p: string, base = B): Json => JSON.parse(readFileSync(join(base, p), "utf8"));
const lines = (p: string): Json[] =>
  readFileSync(join(B, p), "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));

describe("review closure", () => {
  const index = lines("review-closure/review-record-index.jsonl");

  test("all 380 open records indexed exactly once, none proposed as ACCEPT", () => {
    expect(index.length).toBe(380);
    expect(new Set(index.map((r) => r.item_id)).size).toBe(380);
    for (const r of index) expect(r.status).toBe("REVIEW");
    expect(read("review-closure/review-record-summary.json").never_proposes_accept).toBe(true);
    expect(JSON.stringify(read("review-closure/review-record-summary.json"))).not.toContain(
      '"ACCEPT"',
    );
  });

  test("215 records keep Codex's own groups; 165 new ones use Codex's group names", () => {
    const codexGroups = new Set(
      index.filter((r) => r.group_basis === "codex_assigned").map((r) => r.group),
    );
    expect(index.filter((r) => r.group_basis === "codex_assigned").length).toBe(215);
    for (const r of index.filter((x) => x.group_basis !== "codex_assigned"))
      expect(codexGroups.has(r.group)).toBe(true);
    for (const r of index) {
      expect(r.documents_to_close.length).toBeGreaterThan(20);
      expect(r.item_dates.official_known_at).toBeNull();
    }
  });

  test("every quote failing the MuPDF native check gets a replacement verified by both methods", () => {
    const check = read("review-closure/mupdf-check-batches-01-04.json");
    const failing = Object.values<Json>(check.batches).flatMap((b) => b.non_matching);
    const repairs = read("review-closure/quote-repairs.json").repairs;
    expect(repairs.length).toBe(failing.length);
    for (const r of repairs) expect(r.replacement_quotes.length).toBeGreaterThan(0);
    // the replacements themselves pass both independent tools
    const v = read("verification-report.json");
    const m = read("mupdf-check.json");
    expect(v.passed).toBe(true);
    expect(m.totals.fail + m.totals.nfkc_only).toBe(0);
    expect(v.evidence_checked).toBe(m.totals.evidence);
    expect(v.evidence_checked).toBe(
      repairs.reduce((n: number, r: Json) => n + r.replacement_quotes.length, 0),
    );
  });

  test("number-only fragments are flagged: they do not prove the row label or unit", () => {
    for (const r of read("review-closure/quote-repairs.json").repairs)
      if (r.replacement_quotes.every((q: string) => /^\(?[\d,.]+\)?$/.test(q)))
        expect(r.label_or_unit_not_proven_by_fragments).toBe(true);
  });

  test("document scope sheet: standalone Yamama, unproven scanned filing, graded currency evidence", () => {
    const docs = read("review-closure/document-scope-unit-period.json").documents;
    expect(docs.find((d: Json) => d.company_id === "sa:3020").scope).toBe("standalone");
    expect(docs.find((d: Json) => d.company_id === "sa:4300").scope).toBe(
      "not_established_by_text",
    );
    for (const d of docs)
      expect([
        "explicit_presentation_statement",
        "indirect_mention_not_a_presentation_statement",
        "not_found_in_native_text",
      ]).toContain(d.currency_unit_strength);
  });

  test("numeric candidates: semantics proposals only, held items stay held, no known_at", () => {
    const s = read("review-closure/numeric-candidate-semantics.json");
    expect(s.items.length).toBe(39);
    for (const i of s.items) expect(i.proposal.known_at).toBeNull();
    const yamama = s.items.find(
      (i: Json) => i.codex_independent_verdict === "BLOCKED_SUBSET_UNIT_UNRESOLVED",
    );
    expect(yamama.held_reason_kept).toBe(true);
  });
});

describe("display map v2", () => {
  const map = read("display/display-map-v2.json");

  test("still covers every attribute key delivered in batches 01-03", () => {
    const delivered = new Set<string>();
    for (const b of ["batch-01", "batch-02", "batch-03"])
      for (const f of readdirSync(join(ROOT, b, "manifests")))
        for (const a of read(`manifests/${f}`, join(ROOT, b)).company_attributes)
          delivered.add(a.attribute_key);
    expect(new Set(map.keys.map((k: Json) => k.delivered_key))).toEqual(delivered);
  });

  test("no canonical key mixes period rules; mixed concepts only where a qualifier is carried", () => {
    const groups = new Map<string, Json[]>();
    for (const k of map.keys)
      groups.set(k.canonical_key, [...(groups.get(k.canonical_key) ?? []), k]);
    for (const [canon, members] of groups) {
      expect(new Set(members.map((m) => m.period_rule)).size, canon).toBe(1);
      if (new Set(members.map((m) => m.legal_concept)).size > 1)
        expect(map.invariants.groups_with_qualified_concepts).toContain(canon);
    }
  });

  test("distinctions the v1 map lost are split out", () => {
    const by = (k: string) => map.keys.find((x: Json) => x.delivered_key === k);
    expect(by("registered_office_address").canonical_key).not.toBe(
      by("headquarters_address").canonical_key,
    );
    expect(by("company_objects_fs_note1").canonical_key).not.toBe(
      by("principal_activities").canonical_key,
    );
    expect(by("shareholder_mosaic").period_rule).toBe("event_dated");
    expect(by("treasury_share_programme").investor_topic).toBe("ownership");
  });

  test("all 71 Codex-accepted records are mapped, preview only", () => {
    const acc = read("display/accepted-attribute-mapping.json");
    expect(acc.records).toBe(71);
    for (const a of acc.accepted) expect(a.eligible).toContain("no numeric fallback");
  });
});

describe("entity display specs", () => {
  const spec = read("specs/entity-display-specs.json");

  test("proposal only, and no not-applicable without a cited rule", () => {
    expect(spec.status).toBe("proposal_for_review");
    expect(spec.no_contract_change).toBe(true);
    expect(Object.keys(spec.states)).not.toContain("not_applicable");
    expect(spec.states.not_required_by_cited_rule).toContain("cited rule");
  });

  test("REIT model covers units, manager, NAV, distributions and property valuation; regulatory limits need a citation", () => {
    const reit = spec.profiles.reit;
    const sections = reit.sections.map((s: Json) => s.section);
    for (const s of [
      "fund_identity",
      "fund_governance",
      "unitholders",
      "nav",
      "property_portfolio",
      "distributions",
    ])
      expect(sections).toContain(s);
    expect(reit.unit_of_ownership).toContain("units");
    expect(
      reit.sections.find((s: Json) => s.section === "distributions").rule_source_required,
    ).toContain("CMA");
  });

  test("Nomu: reporting frequency must be cited; a missing quarter is unavailable, not not-applicable", () => {
    const rule = spec.profiles.nomu_company.rules.find(
      (r: Json) => r.rule === "reporting_frequency",
    );
    expect(rule.rule_source_required).toContain("CMA");
    expect(rule.until_cited).toContain("never 'not applicable'");
  });
});
