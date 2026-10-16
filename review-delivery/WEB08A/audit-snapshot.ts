// Read-only audit of the accepted frozen rendering model. No imports, writes or financial calculations.
import { mock } from "bun:test";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
const rawBytes = gunzipSync(
  readFileSync(new URL("../../tests/fixtures/codex-20261013/2222-page.json.gz", import.meta.url)),
);
const raw = JSON.parse(rawBytes.toString());
mock.module("virtual:marefa-design-fixtures", () => ({ default: { "2222": raw } }));
const { frozenDesignPreview } = await import("../../src/lib/web-v1/design-fixtures.server");
const { intelGroups, buildOverview } = await import("../../src/lib/web-v1/company-experience");
const result = frozenDesignPreview({ market: "SA", symbol: "2222" });
if (result.state !== "ok") throw Error(result.state);
const p = result.preview;
const proof = (c: any) => ({ key: c.key, period: c.period, unit: c.unit, proof: c.proof });
const topics = p.topics.map((t) => ({
  ordinal: t.ordinal,
  key: t.key,
  title: t.title,
  readiness: t.status,
  score: t.score,
  shownCount: t.shownCount,
  reasons: t.reasons,
  blocks: t.blocks.map((b) => {
    switch (b.type) {
      case "metrics":
        return {
          type: b.type,
          id: b.group.id,
          expectedPeriod: b.group.expectedPeriod,
          cells: b.group.cells.map(proof),
          withheld: b.group.withheld,
          missing: b.group.missing,
        };
      case "facts":
        return {
          type: b.type,
          facts: b.facts.map((f) => ({ key: f.key, asOf: f.asOf, sourceUrl: f.sourceUrl })),
        };
      case "segments":
        return {
          type: b.type,
          title: b.title,
          rows: b.rows.map((r) => ({ ...proof(r), segment: r.segment })),
        };
      case "history":
        return {
          type: b.type,
          series: b.series.map((s) => ({
            key: s.key,
            periodEnds: s.points.map((x) => x.periodEnd),
          })),
        };
      case "market":
        return {
          type: b.type,
          observedAt: b.latest?.observedAt ?? null,
          sourceUrl: b.latest?.sourceUrl ?? null,
          historyCount: b.historyCount,
        };
      case "ownership":
        return {
          type: b.type,
          rows: b.rows.map((r) => ({ asOf: r.asOf, sourceUrl: r.sourceUrl, type: r.type })),
        };
      case "actions":
        return {
          type: b.type,
          rows: b.rows.map((r) => ({
            title: r.title,
            type: r.type,
            date: r.date,
            status: r.status,
            sourceUrl: r.sourceUrl,
          })),
        };
      case "documents":
        return { type: b.type, rows: b.rows };
      default:
        return { type: b.type };
    }
  }),
}));
const statements = p.statements.map((v) => ({
  mode: v.mode,
  status: v.status,
  reason: v.reason,
  currency: v.currency,
  periods: v.periods,
  sources: v.sources,
  cells: v.rows.flatMap((r) =>
    r.cells.map((c, i) => ({
      key: r.key,
      section: r.section,
      periodEnd: v.periods[i]?.end,
      unit: r.unit,
      currency: r.currency,
      state: c.state,
      ...(c.state === "value"
        ? { proof: c.cell.proof }
        : c.state === "withheld"
          ? { reason: c.reason }
          : {}),
    })),
  ),
  review: v.review,
}));
const o = buildOverview(p);
const inventory = {
  schema: "marefa-web08a-frozen-display-inventory/1",
  application_sha: "d7d88c19fee626346b12d961f3a539fc31423f1f",
  fixture_uncompressed_sha256: createHash("sha256").update(rawBytes).digest("hex"),
  contract: raw.contract_version,
  company: p.company,
  counting_policy:
    "Presentation occurrences, not unique financial facts, verified values or coverage%; statement cells keyed by mode+metric+period. Every displayed metric independentlyVerified=false. No financial values are exported here.",
  groups: intelGroups(p).map((g) => ({
    id: g.id,
    title: g.title,
    ordinals: g.topics.map((t) => t.ordinal),
  })),
  topics,
  statements,
  overview: {
    shownMetricOccurrences: o.status.shown,
    withheldMetricOccurrences: o.status.withheld,
    topicsWithData: o.status.topicsWithData,
    topicsTotal: o.status.topicsTotal,
  },
  rawCapabilities: raw.capabilities,
  profileKeys: Object.keys(raw.sections.profile),
  officialSourceMetadata: raw.sections.official_sources.map((s: any) =>
    Object.fromEntries(
      Object.entries(s).filter(([k]) =>
        /^(id|source_url|filing_type|filed_at|content_type|sha256|content_sha256|checksum|document_hash)$/.test(
          k,
        ),
      ),
    ),
  ),
};
const sourceUrls: string[] = [];
function intern(v: any): any {
  if (typeof v === "string" && /^https?:\/\//.test(v)) {
    let i = sourceUrls.indexOf(v);
    if (i < 0) {
      i = sourceUrls.length;
      sourceUrls.push(v);
    }
    return `SRC-${i + 1}`;
  }
  if (Array.isArray(v)) return v.map(intern);
  if (v && typeof v === "object")
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, intern(x)]));
  return v;
}
const compact = intern(inventory);
console.log(
  JSON.stringify({
    ...compact,
    source_registry: Object.fromEntries(sourceUrls.map((u, i) => [`SRC-${i + 1}`, u])),
  }),
);
