import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// DATA-02 batch 07: Nahdi (4164) from its official 2025 annual report, downloaded by this session from the
// user-allowed host investors.nahdi.sa (not yet archived in the engine). Companies 16-19 stay blocked (HTTP 403).
const B = join(import.meta.dir, "..", "product-tracking", "outbox", "DATA-02", "batch-07");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
const read = (p: string): Json => JSON.parse(readFileSync(join(B, p), "utf8"));
const m = read("manifests/nahdi-2025-profile.json");
const DOMAINS = ["company_attributes", "ownership_positions", "corporate_actions", "disclosures"];
const items = DOMAINS.flatMap((d) => m[d] ?? []);
const metaOf = (i: Json) => i.metadata ?? i.details?.metadata;

describe("Nahdi manifest", () => {
  test("source is pinned by SHA-256 and flagged as not yet archived in the engine", () => {
    expect(m.source_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(m.source_archive.archived_in_engine).toBe(false);
    expect(m.source_archive.proposed_engine_archive_path).toBe(
      `data/raw/SA/4164/documents/${m.source_sha256}.pdf`,
    );
    expect(m.facts).toEqual([]);
  });

  test("every item has native-text evidence (no OCR) and an honest verification status", () => {
    for (const i of items) {
      expect(metaOf(i).verification.status).toBe("extracted_quote_on_page");
      expect(metaOf(i).verification.independent_review).toBe(false);
      expect(metaOf(i).evidence.length).toBeGreaterThan(0);
      for (const e of metaOf(i).evidence) expect(e.text_layer).toBeUndefined();
    }
  });

  test("source-internal conflicts carry a do-not-accept note", () => {
    const notes = items
      .map((i) => metaOf(i).review_note ?? "")
      .filter(
        (n: string) => n.includes("must not be accepted") || n.includes("Must not be accepted"),
      );
    expect(notes.length).toBeGreaterThanOrEqual(3);
  });

  test("ownership rows have a dated stated percentage; actions are securities events with an announcement date", () => {
    for (const o of m.ownership_positions) expect(o.as_of_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const a of m.corporate_actions) {
      expect(["cash_dividend", "bonus_issue"]).toContain(a.action_type);
      expect(a.announcement_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("batch-07 reports", () => {
  test("both native-text verifiers pass on every quote", () => {
    const v = read("verification-report.json");
    const mu = read("mupdf-check.json");
    expect(v.passed).toBe(true);
    expect(mu.totals.fail + mu.totals.nfkc_only + mu.totals.ocr_no_native_text).toBe(0);
    expect(mu.totals.evidence).toBe(v.evidence_checked);
  });

  test("no collisions with engine main, branch imports or batches 01-03", () => {
    const c = read("collision-report.json");
    expect(c.passed).toBe(true);
    expect(Object.keys(c.extra_sources_scanned).length).toBe(4);
  });

  test("cumulative merge test: exact additions, no existing row changed, idempotent", () => {
    const r = read("merge-test-report.json");
    expect(r.passed).toBe(true);
    expect(r.resync_counts.inserted + r.resync_counts.restated).toBe(0);
    for (const d of DOMAINS) {
      expect(r.tables[d].added).toBe(m[d]?.length ?? 0);
      expect(r.tables[d].pre_existing_rows_changed).toBe(0);
    }
  });

  test("classification: activity evidence only, no invented label; Saudi Exchange access recorded as blocked", () => {
    const [c] = read("classification/4164-sector-industry.json").classifications;
    expect(c.proposed.sector).toBeNull();
    expect(c.status).toBe("activity_evidence_only_no_label_proposed");
    expect(read("sources.json").access["www.saudiexchange.sa"]).toContain("403");
  });

  test("gap inventory: 18 topics, no not-applicable", () => {
    const g = read("gaps/gap-inventory.json");
    expect(Object.keys(g.companies["4164"]).length).toBe(18);
    expect(JSON.stringify(g)).not.toMatch(/"not_applicable"/);
  });
});
