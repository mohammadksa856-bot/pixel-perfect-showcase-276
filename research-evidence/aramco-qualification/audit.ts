/** Read-only local audit: stdout contains decisions/references, never copied numeric values. */
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { canonical } from "../v1/contract";
import {
  compareObservation,
  qualificationStatus,
  type AuditObservation,
  type EngineRow,
} from "./qualification";
type Document = {
  key: string;
  url: string;
  sha256: string;
  rights: { status: string; grant_reference: string | null };
};
const root = process.argv[process.argv.indexOf("--private-root") + 1];
if (!root || !process.argv.includes("--private-root")) throw Error("private_root_required");
const catalogue = JSON.parse(
  readFileSync(
    new URL("../../review-delivery/WEB08B02/FINANCIAL-EVIDENCE-REGISTER.json", import.meta.url),
    "utf8",
  ),
);
const documents: Document[] = catalogue.documents;
const locators: {
  labels: Record<string, string>;
  reviewed_pages: Record<string, number[]>;
  printed_page_offsets: Record<string, number>;
} = JSON.parse(
  readFileSync(
    new URL("../../review-delivery/WEB08B02/REVIEWED-LOCATORS.json", import.meta.url),
    "utf8",
  ),
);
const observations: AuditObservation[] = [
  "audit-observations.json",
  "audit-adjusted-observations.json",
].flatMap((n) => JSON.parse(readFileSync(root + "/" + n, "utf8")).rows);
const fixturePath = "tests/fixtures/codex-20261013/2222-page.json.gz";
const compressed = readFileSync(fixturePath),
  bytes = gunzipSync(compressed),
  page = JSON.parse(bytes.toString());
if (page.company?.company_id !== "sa:2222") throw Error("unexpected_snapshot_issuer");
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const rows: EngineRow[] = [];
function walk(v: unknown, path: string) {
  if (Array.isArray(v)) {
    v.forEach((a, i) => walk(a, path + "/" + i));
    return;
  }
  if (!v || typeof v !== "object") return;
  const object = v as Record<string, unknown>;
  if (object["metrics"] && typeof object["metrics"] === "object")
    for (const [metric, list] of Object.entries(object["metrics"])) {
      if (!Array.isArray(list)) throw Error("invalid_snapshot_metrics");
      for (let i = 0; i < list.length; i++)
        rows.push({
          ...(list[i] as EngineRow),
          company_id: page.company.company_id,
          metric,
          path: path + "/metrics/" + metric + "/" + i,
        });
    }
  for (const [k, a] of Object.entries(v)) if (k !== "metrics") walk(a, path + "/" + k);
}
walk(page.sections.financials, "/sections/financials");
const unique = new Map<string, EngineRow>();
for (const r of rows) {
  const { path, ...body } = r,
    key = canonical(body),
    old = unique.get(key);
  if (!path) throw Error("snapshot_pointer_missing");
  if (old) old.paths!.push(path);
  else unique.set(key, { ...body, paths: [path] });
}
const checkedDocuments = documents.map((d) => ({
  ...d,
  local_sha256: sha(readFileSync(root + "/" + d.key + ".pdf")),
}));
const results = observations.map((o) => {
  if (o.identity.companyId !== page.company.company_id) throw Error("observation_issuer_mismatch");
  const d = checkedDocuments.find((d) => d.key === o.source.document_key);
  if (!d) throw Error("unknown_document");
  if (!locators.reviewed_pages[d.key]?.includes(o.source.pdf_page))
    throw Error("page_not_visually_reviewed");
  const c = compareObservation(o, [...unique.values()], d.url);
  const gaps = [...new Set(c.matches.flatMap((m) => m.missing_for_B01))];
  if (!c.matches.length) gaps.push("exact_engine_reference_unresolved");
  if (d.local_sha256 !== d.sha256) gaps.push("local_document_hash_changed");
  // No independent financial certificate or rights grant is fabricated for a visually checked source.
  const q = qualificationStatus(
    gaps,
    { status: d.rights.status, grant_reference: d.rights.grant_reference },
    false,
  );
  return {
    audit_row: o.audit_row,
    identity: o.identity,
    source: {
      ...o.source,
      original_label: locators.labels[o.identity.metric] ?? null,
      printed_page: o.source.pdf_page + (locators.printed_page_offsets[d.key] ?? 0),
    },
    source_file_sha256: d.local_sha256,
    source_observation_digest: sha(canonical(o)),
    source_check: o.source_check,
    ...c,
    qualification: q,
    engine_fact_ref: null,
  };
});
const counts: Record<string, number> = {};
for (const r of results) counts[r.comparison] = (counts[r.comparison] ?? 0) + 1;
const report = {
  schema: "marefa-aramco-qualification-audit/1",
  baseline: "c21535bceddef92878a84ee018d89ca748ed3552",
  engine_snapshot: {
    path: fixturePath,
    compressed_sha256: sha(compressed),
    uncompressed_sha256: sha(bytes),
    generated_at: page.generated_at,
    contract_version: page.contract_version,
    live: false,
    scanned_financial_display_instances: rows.length,
    unique_row_representations: unique.size,
    representation_digest_is_not_engine_fact_id: true,
  },
  documents_verified: checkedDocuments.map((d) => ({
    key: d.key,
    sha256: d.local_sha256,
    expected_sha256: d.sha256,
    match: d.local_sha256 === d.sha256,
  })),
  observations: results.length,
  comparison_counts: counts,
  qualified_for_research: 0,
  approved_for_display: 0,
  summary:
    "All audit observations remain withheld for research; numerical source agreement is not approval. No IDs/versions manufactured.",
  results,
};
const output = process.argv.includes("--output")
  ? process.argv[process.argv.indexOf("--output") + 1]
  : null;
if (output) writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(output ? { ...report, results: undefined, output } : report, null, 2));
