import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// DATA-02 batch 04: companies 16-20 (no archived filings: inventory + entity type + gaps only) and the evidence pack
// answering Codex's review of batches 01-02. Quote checks run in product-tracking/tools/data02_verify.py.
const ROOT = join(import.meta.dir, "..", "product-tracking", "outbox", "DATA-02");
const BATCH = join(ROOT, "batch-04");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
const read = (p: string, base = BATCH): Json => JSON.parse(readFileSync(join(base, p), "utf8"));
const jsonFiles = (dir: string) =>
  existsSync(join(BATCH, dir))
    ? readdirSync(join(BATCH, dir))
        .filter((f) => f.endsWith(".json"))
        .sort()
        .map((f) => ({ file: `${dir}/${f}`, json: read(`${dir}/${f}`) }))
    : [];
const COMPANIES = ["4340", "4140", "4260", "9510", "4164"];
const reviews = jsonFiles("reviews");
const dossiers: Json[] = readFileSync(
  join(BATCH, "review-support", "evidence-dossiers.jsonl"),
  "utf8",
)
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l));

describe("DATA-02 batch-04 companies 16-20", () => {
  test("nothing is extracted without an archived filing: no manifests and no numeric candidates", () => {
    expect(existsSync(join(BATCH, "manifests"))).toBe(false);
    expect(existsSync(join(BATCH, "numeric-candidates"))).toBe(false);
    expect(read("sources.json").documents_used).toEqual([]);
    for (const s of COMPANIES)
      expect(
        read("sources.json").documents_needed_not_available.some((d: Json) => d.company === s),
      ).toBe(true);
  });

  test("entity type and listing market are indications only, never applied as company assumptions", () => {
    const { entities } = read("companies/entity-type-assessment.json");
    expect(entities.map((e: Json) => e.symbol).sort()).toEqual([...COMPANIES].sort());
    for (const e of entities)
      expect(e.status).toBe("unverified_indication_from_names_and_exchange_labels");
    expect(entities.find((e: Json) => e.symbol === "4340").indicated_type).toContain("REIT");
    expect(entities.find((e: Json) => e.symbol === "9510").listing_market_label).toContain("Nomu");
  });

  test("gap inventory: 18 topics x 5, nothing added, REIT and Nomu topics carry an entity rule, no not-applicable", () => {
    const gaps = read("gaps/gap-inventory.json");
    expect(Object.keys(gaps.companies).sort()).toEqual([...COMPANIES].sort());
    for (const [s, cells] of Object.entries<Json>(gaps.companies)) {
      expect(Object.keys(cells).length).toBe(18);
      for (const cell of Object.values<Json>(cells)) {
        expect(cell.batch_04_added).toEqual([]);
        expect(cell.applicability).toBe("applicable");
        expect(Object.values(gaps.reasons)).toContain(cell.reason);
      }
      if (s === "4340")
        expect(cells.management_governance.entity_rule).toBe("fund_specific_definition_required");
      if (s === "9510")
        expect(cells.financial_statements.entity_rule).toBe("parallel_market_rule_required");
    }
    expect(JSON.stringify(gaps)).not.toMatch(/"not_applicable"/);
  });
});

describe("DATA-02 batch-04 review support for Codex (batches 01-02)", () => {
  const groups = read("review-support/review-groups.json");

  test("every non-accepted Codex record (215 REVIEW + 1 REJECT) has exactly one dossier", () => {
    expect(dossiers.length).toBe(216);
    expect(new Set(dossiers.map((d) => d.item_id)).size).toBe(216);
    expect(dossiers.filter((d) => d.codex_decision === "REVIEW").length).toBe(215);
    const total = Object.values<Json>(groups.groups).reduce((n, g) => n + g.records, 0);
    expect(total).toBe(216);
    expect(groups.input.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  test("dossiers carry context for every quote that matches and a closing-evidence statement", () => {
    for (const d of dossiers) {
      expect(d.closing_evidence_required.length).toBeGreaterThan(20);
      for (const e of d.evidence) {
        const matched = e.match.reading_order_nfkc || e.match.layout_nfkc;
        if (matched) expect(e.context).toContain(e.quote.trim().split(/\s+/)[0]);
        expect(e.page_text_sha256).toMatch(/^[0-9a-f]{64}$/);
      }
    }
  });

  test("the 6 quote-diagnostic failures each get replacements or an explicit visual-check status", () => {
    const { records } = read("review-support/quote-diagnostics.json");
    expect(records.length).toBe(6);
    for (const r of records)
      for (const f of r.fixes)
        expect([
          "already_matches_both_modes",
          "replacement_fragments",
          "no_fragment_matches_both_modes",
        ]).toContain(f.status);
  });

  test("Al Rajhi dividend events reconcile exactly with the filing's cash-flow dividends paid", () => {
    const [row] = groups.dividend_reconciliation["sa:1120"];
    expect(row.reading).toBe("matches");
    expect(row.difference).toBe(0);
  });

  test("display map covers every attribute key delivered in batches 01-03 without claiming independent review", () => {
    const map = read("review-support/display-map.json");
    const delivered = new Set<string>();
    for (const b of ["batch-01", "batch-02", "batch-03"])
      for (const f of readdirSync(join(ROOT, b, "manifests")))
        for (const a of read(`manifests/${f}`, join(ROOT, b)).company_attributes)
          delivered.add(a.attribute_key);
    expect(new Set(map.keys.map((k: Json) => k.delivered_key))).toEqual(delivered);
    for (const k of map.keys) {
      expect(k.label_ar && k.label_en && k.period_text_ar).toBeTruthy();
      expect(k.verification_label_en).toContain("not independent financial verification");
    }
  });

  test("all 7 Codex requests are answered; evidence-bearing answers are verified quote files", () => {
    const r = read("review-support/codex-requests-response.json");
    expect(r.responses.map((x: Json) => x.request)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const v = read("verification-report.json");
    expect(v.passed).toBe(true);
    const evidence = reviews
      .flatMap(({ json }) => json.codex_key_reviews)
      .flatMap((i: Json) => i.metadata.evidence);
    expect(v.evidence_checked).toBe(evidence.length);
    for (const { file, json } of reviews)
      expect(v.manifests.find((m: Json) => m.manifest === file)?.source_sha256).toBe(
        json.source_sha256,
      );
  });

  test("STC: the 0.55 policy is a minimum and actual paid events are separate, without invented dates", () => {
    const stc = reviews.find((r) => r.json.symbol === "7010")!.json.codex_key_reviews;
    expect(stc[0].proposal.policy.is_minimum_not_actual).toBe(true);
    const paid = stc.slice(1).map((i: Json) => i.proposal);
    expect(
      paid.filter((p: Json) => p.kind === "special").map((p: Json) => p.dividend_per_share),
    ).toEqual([2]);
    for (const p of paid) expect(p.announcement_date).toBeNull();
  });

  test("ALBA is re-proposed as a dated disclosure, not a corporate action", () => {
    const [alba] = reviews.find((r) => r.json.symbol === "2010")!.json.codex_key_reviews;
    expect(alba.proposal.replace_domain).toBe("disclosures");
    expect(alba.proposal.event_dates).toEqual({
      agreement_announced: "2024-09-17",
      completion_announced: "2025-02-19",
    });
  });
});
