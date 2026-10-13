import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// DATA-02 batch 03 (companies 11-15 of Codex's BATCH20_GAP_MATRIX). Structural checks on the delivered files; the
// quote-on-page and OCR checks run in product-tracking/tools/data02_verify.py, whose report must be current and passed.
const ROOT = join(import.meta.dir, "..", "product-tracking", "outbox", "DATA-02");
const BATCH = join(ROOT, "batch-03");
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

const COMPANIES = ["4030", "3020", "1211", "7203"]; // with an archived filing
const ALL = [...COMPANIES, "1214"]; // Shaker: no archived filing in any published engine branch
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

describe("DATA-02 batch-03 scope", () => {
  test("one manifest per company with a filing, matrix order 11-15, none from earlier batches", () => {
    expect(manifests.map((m) => m.json.symbol).sort()).toEqual([...COMPANIES].sort());
    for (const earlier of ["batch-01", "batch-02"]) {
      const symbols = list("manifests", join(ROOT, earlier)).map((m) => m.json.symbol);
      for (const s of ALL) expect(symbols).not.toContain(s);
    }
    const sources = read("sources.json");
    expect(sources.company_list_reference.file).toContain("BATCH20_GAP_MATRIX.json");
    expect(sources.company_list_reference.order).toStartWith("4030, 3020, 1211, 7203, 1214");
  });

  test("every source document is pinned to an engine blob (main or sector branch) by SHA-256", () => {
    const sources = read("sources.json");
    for (const { json } of manifests) {
      const doc = sources.documents_used.find((d: Json) => d.company === json.symbol);
      expect(doc.sha256).toBe(json.source_sha256);
      expect(doc.engine_archive_path).toBe(
        `data/raw/SA/${json.symbol}/documents/${json.source_sha256}.pdf`,
      );
      expect(json.source_archive.engine_archive_path).toBe(doc.engine_archive_path);
      // 3020 and 7203 are archived on engine main; 4030 and 1211 only on unmerged sector branches.
      expect(doc.on_engine_main).toBe(doc.engine_ref === null);
      if (!doc.on_engine_main) expect(doc.engine_ref).toStartWith("origin/claude/data-");
      expect(json.source_archive.on_engine_main).toBe(doc.on_engine_main);
      expect(doc.ocr_used).toBe(false);
    }
  });
});

describe("DATA-02 batch-03 manifests", () => {
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

    test(`${file}: every item has native-text page evidence (no OCR in this batch)`, () => {
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
      // No fact in this batch may rest on OCR alone.
      expect(items.every((i) => evidenceOf(i).every((e) => e.text_layer !== "ocr"))).toBe(true);
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

describe("DATA-02 batch-03 review flags", () => {
  test("Shaker has no manifest and nothing added: no archived filing exists to quote", () => {
    expect(manifests.some(({ json }) => json.symbol === "1214")).toBe(false);
    const gaps = read("gaps/gap-inventory.json");
    for (const cell of Object.values<Json>(gaps.companies["1214"]))
      expect(cell.batch_03_added).toEqual([]);
    expect(
      read("sources.json").documents_needed_not_available.some((d: Json) => d.company === "1214"),
    ).toBe(true);
  });

  test("values the source contradicts carry a do-not-accept note", () => {
    const notes = [...manifests, ...candidates]
      .flatMap(({ json }) => itemsOf(json))
      .map((i) => metaOf(i).review_note ?? "")
      .filter(
        (n: string) =>
          n.includes("must not be accepted") || n.includes("not for DATA-01 acceptance"),
      );
    expect(notes.length).toBeGreaterThanOrEqual(2); // Yamama CWIP unit conflict, Ma'aden sukuk size conflict
  });

  test("the comparison limits against Codex's unpublished engine state are documented", () => {
    const limits = read("sources.json").comparison_limits;
    expect(limits.codex_engine_commit_available_on_github).toBe(false);
    expect(limits.not_compared.length).toBeGreaterThan(0);
  });
});

describe("DATA-02 batch-03 sector classification", () => {
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

describe("DATA-02 batch-03 reports are current and passed", () => {
  test("quote verification passed and covers every evidence entry, none via OCR", () => {
    const v = read("verification-report.json");
    expect(v.passed).toBe(true);
    const all = evidenceFiles.flatMap(({ json }) => itemsOf(json)).flatMap(evidenceOf);
    expect(v.evidence_checked).toBe(all.length);
    expect(v.ocr_evidence_checked).toBeUndefined();
    const checked = new Map<string, Json>(v.manifests.map((m: Json) => [m.manifest, m]));
    for (const { file, json } of evidenceFiles) {
      expect(checked.get(file)?.source_sha256, file).toBe(json.source_sha256);
      expect(checked.get(file)?.sha256_recomputed_match, file).toBe(true);
    }
  });

  test("no key collides with engine main, Codex's branch imports, batch 01 or batch 02", () => {
    const c = read("collision-report.json");
    expect(c.passed).toBe(true);
    expect(Object.keys(c.extra_sources_scanned).sort()).toEqual([
      "batch-01/manifests/*.json",
      "batch-02/manifests/*.json",
      "codex-branch-imports/*.json",
    ]);
    expect(c.manifests.length).toBe(manifests.length);
  });

  test("cumulative merge test: on top of Codex imports + batches 01-02, rows added exactly, none changed, idempotent", () => {
    const merge = read("merge-test-report.json");
    expect(merge.passed).toBe(true);
    expect(merge.preflight.integrity).toBe("ok");
    expect(merge.baseline_manifests.length).toBe(14); // 4 Codex imports + 5 batch-01 + 5 batch-02
    expect(merge.resync_counts.inserted + merge.resync_counts.restated).toBe(0);
    for (const domain of DOMAINS) {
      const expected = manifests.reduce((n, { json }) => n + (json[domain]?.length ?? 0), 0);
      expect(merge.tables[domain].added, domain).toBe(expected);
      expect(merge.tables[domain].pre_existing_rows_changed, domain).toBe(0);
    }
  });
});

describe("DATA-02 batch-03 gap inventory", () => {
  const gaps = read("gaps/gap-inventory.json");
  test("18 topics x 5 companies with known reasons and no not-applicable", () => {
    expect(Object.keys(gaps.companies).sort()).toEqual([...ALL].sort());
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
        for (const key of cell.batch_03_added)
          expect(delivered.has(`${s}:${key}`), `${s}:${key}`).toBe(true);
  });
});
