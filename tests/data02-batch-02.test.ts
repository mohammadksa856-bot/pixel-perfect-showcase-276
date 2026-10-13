import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// DATA-02 batch 02 (companies 6-10 of Codex's BATCH20_GAP_MATRIX). Structural checks on the delivered files; the
// quote-on-page and OCR checks run in product-tracking/tools/data02_verify.py, whose report must be current and passed.
const ROOT = join(import.meta.dir, "..", "product-tracking", "outbox", "DATA-02");
const BATCH = join(ROOT, "batch-02");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
const read = (p: string, base = BATCH): Json => JSON.parse(readFileSync(join(base, p), "utf8"));
const list = (dir: string, base = BATCH) =>
  existsSync(join(base, dir))
    ? readdirSync(join(base, dir))
        .filter((f) => f.endsWith(".json"))
        .sort()
        .map((f) => ({ file: `${dir}/${f}`, json: read(`${dir}/${f}`, base) }))
    : [];

const COMPANIES = ["2082", "2280", "4190", "4004", "4300"];
const manifests = list("manifests");
const candidates = list("numeric-candidates");
const classification = list("classification");
const evidenceFiles = [...manifests, ...list("reviews"), ...candidates, ...classification];
const DOMAINS = [
  "company_attributes",
  "ownership_positions",
  "corporate_actions",
  "disclosures",
] as const;
const ACTION_FIELDS = new Set([
  "action_key",
  "action_type",
  "title",
  "announcement_date",
  "listing_id",
  "ex_date",
  "record_date",
  "eligibility_date",
  "payment_date",
  "effective_date",
  "cash_amount",
  "currency",
  "ratio_numerator",
  "ratio_denominator",
  "status",
  "details",
]);

const metaOf = (item: Json) => item.metadata ?? item.details?.metadata ?? {};
const evidenceOf = (item: Json): Json[] => metaOf(item).evidence ?? [];
const itemsOf = (file: Json): Json[] => [
  ...DOMAINS.flatMap((d) => file[d] ?? []),
  ...(file.codex_key_reviews ?? []),
  ...(file.candidates ?? []),
  ...(file.classifications ?? []),
];

describe("DATA-02 batch-02 scope", () => {
  test("one manifest per company, in the matrix order 6-10, and no company from batch 01", () => {
    expect(manifests.map((m) => m.json.symbol).sort()).toEqual([...COMPANIES].sort());
    const first = list("manifests", join(ROOT, "batch-01")).map((m) => m.json.symbol);
    for (const s of COMPANIES) expect(first).not.toContain(s);
    const sources = read("sources.json");
    expect(sources.company_list_reference.file).toContain("BATCH20_GAP_MATRIX.json");
    expect(sources.company_list_reference.order).toStartWith("2082, 2280, 4190, 4004, 4300");
  });

  test("every source document is pinned to an engine branch blob by SHA-256", () => {
    const sources = read("sources.json");
    for (const { json } of manifests) {
      const doc = sources.documents_used.find((d: Json) => d.company === json.symbol);
      expect(doc.sha256).toBe(json.source_sha256);
      expect(doc.engine_archive_path).toBe(
        `data/raw/SA/${json.symbol}/documents/${json.source_sha256}.pdf`,
      );
      expect(json.source_archive.engine_archive_path).toBe(doc.engine_archive_path);
      expect(doc.engine_ref).toStartWith("origin/claude/data-");
      expect(json.source_archive.on_engine_main).toBe(false);
    }
  });
});

describe("DATA-02 batch-02 manifests", () => {
  for (const { file, json } of manifests) {
    test(`${file}: engine header and no numeric facts`, () => {
      for (const key of [
        "company_id",
        "market",
        "symbol",
        "filing_type",
        "filed_at",
        "filed_at_basis",
        "period_end",
        "source_url",
        "reader",
      ])
        expect(json[key], key).toBeTruthy();
      expect(json.company_id).toBe(`sa:${json.symbol}`);
      expect(json.source_sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(json.facts).toEqual([]);
    });

    test(`${file}: every item has page evidence; OCR evidence is labelled as OCR`, () => {
      const items = DOMAINS.flatMap((d) => json[d] ?? []);
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        const meta = metaOf(item);
        expect(meta.verification.independent_review).toBe(false);
        expect(evidenceOf(item).length).toBeGreaterThan(0);
        const ocr = evidenceOf(item).some((e) => e.text_layer === "ocr");
        expect(meta.verification.status).toBe(
          ocr ? "ocr_quote_on_page" : "extracted_quote_on_page",
        );
        for (const e of evidenceOf(item)) {
          expect(Number.isInteger(e.pdf_page) && e.pdf_page > 0).toBe(true);
          expect(e.quote.trim().length).toBeGreaterThan(0);
        }
      }
      // The Dar Al Arkan filing has no text layer, so all of its evidence must be OCR; the others must not be.
      const allOcr = items.every((i) => evidenceOf(i).every((e) => e.text_layer === "ocr"));
      const noneOcr = items.every((i) => evidenceOf(i).every((e) => e.text_layer !== "ocr"));
      expect(json.symbol === "4300" ? allOcr : noneOcr).toBe(true);
    });

    test(`${file}: corporate actions are securities events that fit publish_corporate_action()`, () => {
      for (const action of json.corporate_actions ?? []) {
        expect([...Object.keys(action)].filter((k) => !ACTION_FIELDS.has(k))).toEqual([]);
        expect(action.announcement_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(["cash_dividend", "bonus_issue"]).toContain(action.action_type);
        expect(action.action_key).toBe(
          `${json.company_id}:${action.action_type}:${action.announcement_date}`,
        );
      }
    });

    test(`${file}: ownership rows carry a stated percentage and date`, () => {
      for (const o of json.ownership_positions ?? []) {
        expect(o.ownership_pct).toBeGreaterThan(0);
        expect(o.ownership_pct).toBeLessThanOrEqual(1);
        expect(o.as_of_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });
  }

  test("no item anywhere claims not-applicable", () => {
    for (const { file, json } of evidenceFiles)
      expect(JSON.stringify(json), file).not.toMatch(/not[_ -]applicable"|"not_applicable/i);
  });

  test("share capital amounts Codex already holds are not re-delivered", () => {
    for (const { json } of manifests)
      for (const a of json.company_attributes) expect(a.attribute_key).not.toBe("share_capital");
    for (const { json } of candidates)
      for (const c of json.candidates)
        expect(["share_capital", "treasury_shares"]).not.toContain(c.metric);
  });
});

describe("DATA-02 batch-02 sector classification", () => {
  test("each company has an evidence-backed proposal and the exchange classification stays unverified", () => {
    expect(classification.map((c) => c.json.symbol).sort()).toEqual([...COMPANIES].sort());
    for (const { json } of classification) {
      const [c] = json.classifications;
      expect(c.proposed.sector && c.proposed.industry).toBeTruthy();
      expect(c.official_exchange_classification.status).toBe("unverified");
      expect(evidenceOf(c).length).toBeGreaterThan(0);
    }
  });
});

describe("DATA-02 batch-02 reports are current and passed", () => {
  test("quote verification passed, covers every evidence entry, and re-ran OCR for the scanned filing", () => {
    const v = read("verification-report.json");
    expect(v.passed).toBe(true);
    const all = evidenceFiles.flatMap(({ json }) => itemsOf(json)).flatMap(evidenceOf);
    expect(v.evidence_checked).toBe(all.length);
    expect(v.ocr_evidence_checked).toBe(all.filter((e) => e.text_layer === "ocr").length);
    expect(v.ocr_engine).toStartWith("tesseract");
    const checked = new Map<string, Json>(v.manifests.map((m: Json) => [m.manifest, m]));
    for (const { file, json } of evidenceFiles) {
      expect(checked.get(file)?.source_sha256, file).toBe(json.source_sha256);
      expect(checked.get(file)?.sha256_recomputed_match, file).toBe(true);
    }
  });

  test("no key collides with engine main, Codex's sector-branch imports or batch 01", () => {
    const c = read("collision-report.json");
    expect(c.passed).toBe(true);
    expect(Object.keys(c.extra_sources_scanned).sort()).toEqual([
      "batch-01/manifests/*.json",
      "codex-branch-imports/*.json",
    ]);
    expect(c.manifests.length).toBe(manifests.length);
  });

  test("merge test: rows added exactly, none changed, idempotent", () => {
    const merge = read("merge-test-report.json");
    expect(merge.passed).toBe(true);
    expect(merge.preflight.integrity).toBe("ok");
    expect(merge.baseline_manifests.length).toBe(5);
    expect(merge.resync_counts.inserted + merge.resync_counts.restated).toBe(0);
    for (const domain of DOMAINS) {
      const expected = manifests.reduce((n, { json }) => n + (json[domain]?.length ?? 0), 0);
      expect(merge.tables[domain].added, domain).toBe(expected);
      expect(merge.tables[domain].pre_existing_rows_changed, domain).toBe(0);
    }
  });
});

describe("DATA-02 batch-02 gap inventory", () => {
  const gaps = read("gaps/gap-inventory.json");
  test("18 topics x 5 companies with known reasons and no not-applicable", () => {
    expect(Object.keys(gaps.companies).sort()).toEqual([...COMPANIES].sort());
    const reasons = new Set(Object.values(gaps.reasons));
    for (const cells of Object.values<Json>(gaps.companies)) {
      expect(Object.keys(cells).sort()).toEqual(gaps.topics.map((t: Json) => t.key).sort());
      for (const cell of Object.values<Json>(cells)) {
        expect(reasons.has(cell.reason)).toBe(true);
        expect(cell.applicability).toBe("applicable");
      }
    }
  });

  test("every key the inventory lists as added exists in a delivered file", () => {
    const delivered = new Set<string>();
    for (const { json } of [...manifests, ...candidates, ...classification]) {
      const s = json.symbol ?? json.company_id.split(":")[1];
      for (const a of json.company_attributes ?? []) delivered.add(`${s}:${a.attribute_key}`);
      for (const o of json.ownership_positions ?? []) delivered.add(`${s}:${o.holder_key}`);
      for (const c of json.corporate_actions ?? []) delivered.add(`${s}:${c.action_key}`);
      for (const d of json.disclosures ?? []) delivered.add(`${s}:${d.disclosure_type}|${d.title}`);
      for (const c of json.candidates ?? []) delivered.add(`${s}:numeric:${c.metric}`);
      for (const c of json.classifications ?? [])
        delivered.add(`${s}:classification:${c.proposed.sector}/${c.proposed.industry}`);
    }
    for (const [s, cells] of Object.entries<Json>(gaps.companies))
      for (const cell of Object.values<Json>(cells))
        for (const key of cell.batch_02_added)
          expect(delivered.has(`${s}:${key}`), `${s}:${key}`).toBe(true);
  });
});
