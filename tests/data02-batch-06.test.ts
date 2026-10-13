import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// DATA-02 batch 06: contextual dossiers for the 165 DATA03 REVIEW records and 18-topic linkage of all 452 records.
const B = join(import.meta.dir, "..", "product-tracking", "outbox", "DATA-02", "batch-06");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
const read = (p: string): Json => JSON.parse(readFileSync(join(B, p), "utf8"));
const dossiers: Json[] = readFileSync(
  join(B, "review-closure", "data03-evidence-dossiers.jsonl"),
  "utf8",
)
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l));

describe("DATA03 contextual dossiers", () => {
  test("one dossier per DATA03 REVIEW record, all still REVIEW", () => {
    expect(dossiers.length).toBe(165);
    expect(new Set(dossiers.map((d) => d.item_id)).size).toBe(165);
    for (const d of dossiers) expect(d.status).toBe("REVIEW");
  });

  test("every quote is checked with MuPDF and pdftotext; MuPDF misses are covered by batch-05 repairs", () => {
    for (const d of dossiers)
      for (const e of d.evidence) {
        expect(Object.keys(e.match).sort()).toEqual([
          "mupdf_ws",
          "pdftotext_layout",
          "pdftotext_ro",
        ]);
        expect(e.mupdf_page_text_sha256).toMatch(/^[0-9a-f]{64}$/);
        if (!e.match.mupdf_ws) expect(d.quote_repairs.length).toBeGreaterThan(0);
        if (e.match.pdftotext_ro || e.match.pdftotext_layout) expect(e.context).toBeTruthy();
      }
  });
});

describe("18-topic linkage", () => {
  const t = read("topics/topic-linkage.json");
  const TOPICS = [
    "identity",
    "business_model",
    "management_governance",
    "ownership",
    "financial_statements",
    "earnings_quality",
    "ratios",
    "operating_kpis",
    "dividends",
    "sector_industry",
    "competitors",
    "trading_liquidity",
    "guidance",
    "analyst_coverage",
    "valuation",
    "risks",
    "sustainability",
    "news_ir",
  ];

  test("all 452 delivered records are linked to a valid topic and found in Codex's reviews", () => {
    expect(t.records).toBe(452);
    expect(t.not_found_in_codex_reviews).toBe(0);
    for (const l of t.links) expect(TOPICS).toContain(l.investor_topic);
  });

  test("status totals match Codex: 71 accepted, 380 review, 1 rejected", () => {
    const count = (s: string) => t.links.filter((l: Json) => l.codex_status === s).length;
    expect([count("ACCEPT"), count("REVIEW"), count("REJECT")]).toEqual([71, 380, 1]);
  });
});
