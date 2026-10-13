import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// DATA-02 batch 01: structural checks on the delivered files. The quote-on-page check needs the engine's archived
// PDFs and runs in product-tracking/tools/data02_verify.py; here we check that its report is current and passed.
const BATCH = join(import.meta.dir, "..", "product-tracking", "outbox", "DATA-02", "batch-01");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
const read = (p: string): Json => JSON.parse(readFileSync(join(BATCH, p), "utf8"));
const list = (dir: string) =>
  readdirSync(join(BATCH, dir))
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => ({ file: `${dir}/${f}`, json: read(`${dir}/${f}`) }));

const manifests = list("manifests");
const reviews = list("reviews");
const candidates = list("numeric-candidates");
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

function evidenceOf(item: Json): Json[] {
  return (item.metadata ?? item.details?.metadata ?? {}).evidence ?? [];
}
function allItems(file: Json): Json[] {
  return [
    ...DOMAINS.flatMap((d) => file[d] ?? []),
    ...(file.codex_key_reviews ?? []),
    ...(file.candidates ?? []),
  ];
}

describe("DATA-02 batch-01 manifests", () => {
  test("five manifests for the four companies with an archived document", () => {
    expect(manifests.map((m) => m.json.symbol).sort()).toEqual([
      "1120",
      "2010",
      "2222",
      "7010",
      "7010",
    ]);
  });

  for (const { file, json } of manifests) {
    test(`${file}: engine header, content-addressed source, no numeric facts`, () => {
      for (const key of [
        "company_id",
        "market",
        "symbol",
        "filing_type",
        "filed_at",
        "period_end",
        "source_url",
        "reader",
      ])
        expect(json[key], key).toBeTruthy();
      expect(json.company_id).toBe(`sa:${json.symbol}`);
      expect(json.source_sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(json.facts).toEqual([]);
      // The documents carry no publication date; the placeholder must say so.
      expect(json.filed_at_confidence).toBe("unknown");
    });

    test(`${file}: every item has page evidence and an honest verification status`, () => {
      const items = DOMAINS.flatMap((d) => json[d] ?? []);
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        const meta = item.metadata ?? item.details?.metadata;
        expect(meta.verification.status).toBe("extracted_quote_on_page");
        expect(meta.verification.independent_review).toBe(false);
        expect(evidenceOf(item).length).toBeGreaterThan(0);
        for (const e of evidenceOf(item)) {
          expect(Number.isInteger(e.pdf_page) && e.pdf_page > 0).toBe(true);
          expect(e.quote.trim().length).toBeGreaterThan(0);
        }
      }
    });

    test(`${file}: corporate actions fit the engine's publish_corporate_action()`, () => {
      for (const action of json.corporate_actions ?? []) {
        expect([...Object.keys(action)].filter((k) => !ACTION_FIELDS.has(k))).toEqual([]);
        expect(action.announcement_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(action.action_key.startsWith(`${json.company_id}:`)).toBe(true);
      }
    });
  }

  test("no item anywhere claims not-applicable", () => {
    for (const { file, json } of [...manifests, ...reviews, ...candidates])
      expect(JSON.stringify(json), file).not.toMatch(/not[_ -]applicable"|"not_applicable/i);
  });
});

describe("DATA-02 batch-01 reports are current and passed", () => {
  const verification = read("verification-report.json");
  test("quote verification passed and covers every evidence entry in every file", () => {
    expect(verification.passed).toBe(true);
    expect(verification.evidence_failed).toBe(0);
    const total = [...manifests, ...reviews, ...candidates]
      .flatMap(({ json }) => allItems(json))
      .reduce((n, item) => n + evidenceOf(item).length, 0);
    expect(verification.evidence_checked).toBe(total);
    const checked = new Map<string, Json>(verification.manifests.map((m: Json) => [m.manifest, m]));
    for (const { file, json } of [...manifests, ...reviews, ...candidates]) {
      const entry = checked.get(file);
      expect(entry, file).toBeDefined();
      expect(entry.source_sha256).toBe(json.source_sha256);
      expect(entry.sha256_recomputed_match).toBe(true);
    }
  });

  test("no manifest republishes a key Codex already owns", () => {
    const collisions = read("collision-report.json");
    expect(collisions.passed).toBe(true);
    expect(collisions.manifests.map((m: Json) => m.manifest).sort()).toEqual(
      manifests.map((m) => m.file.slice(10)),
    );
  });

  test("merge test: engine sync adds exactly the manifest rows, changes none, and is idempotent", () => {
    const merge = read("merge-test-report.json");
    expect(merge.passed).toBe(true);
    expect(merge.preflight.integrity).toBe("ok");
    expect(merge.resync_counts.inserted + merge.resync_counts.restated).toBe(0);
    for (const domain of DOMAINS) {
      const expected = manifests.reduce((n, { json }) => n + (json[domain]?.length ?? 0), 0);
      expect(merge.tables[domain].added, domain).toBe(expected);
      expect(merge.tables[domain].pre_existing_rows_changed, domain).toBe(0);
    }
  });
});

describe("DATA-02 batch-01 reviews of Codex keys", () => {
  for (const { file, json } of reviews)
    test(`${file}: read-only evidence with a stated finding`, () => {
      expect(json.purpose).toContain("nothing here is ingested");
      for (const r of json.codex_key_reviews) {
        expect(["agrees", "agrees_with_detail", "differs", "partially_supported"]).toContain(
          r.finding,
        );
        expect(r.codex_file).toMatch(/\.json$/);
        expect(evidenceOf(r).length).toBeGreaterThan(0);
      }
    });
});

describe("DATA-02 batch-01 gap inventory", () => {
  const gaps = read("gaps/gap-inventory.json");
  test("18 topics for each of the five named companies, no substitute list", () => {
    expect(Object.keys(gaps.companies).sort()).toEqual(["1120", "2010", "2222", "7010", "8010"]);
    for (const cells of Object.values<Json>(gaps.companies))
      expect(Object.keys(cells).sort()).toEqual(gaps.topics.map((t: Json) => t.key).sort());
  });

  test("every cell has a known reason and none is not-applicable", () => {
    const reasons = new Set(Object.values(gaps.reasons));
    for (const cells of Object.values<Json>(gaps.companies))
      for (const cell of Object.values<Json>(cells)) {
        expect(reasons.has(cell.reason)).toBe(true);
        expect(["available", "partial", "unavailable"]).toContain(cell.state);
        expect(cell.applicability).toBe("applicable");
      }
  });

  test("batch keys listed in the inventory exist in the manifests", () => {
    const delivered = new Set(
      manifests.flatMap(({ json }) => [
        ...(json.company_attributes ?? []).map((a: Json) => `${json.symbol}:${a.attribute_key}`),
        ...(json.corporate_actions ?? []).map((a: Json) => `${json.symbol}:${a.action_key}`),
      ]),
    );
    for (const [symbol, cells] of Object.entries<Json>(gaps.companies))
      for (const cell of Object.values<Json>(cells))
        for (const key of cell.batch_01_added)
          expect(delivered.has(`${symbol}:${key}`), `${symbol}:${key}`).toBe(true);
  });

  test("Tawuniya gets nothing new: no original document was archived to quote from", () => {
    for (const cell of Object.values<Json>(gaps.companies["8010"]))
      expect(cell.batch_01_added).toEqual([]);
    expect(manifests.some(({ json }) => json.symbol === "8010")).toBe(false);
  });
});
