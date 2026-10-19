import { expect, test, mock } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { EnginePage } from "../src/lib/engine/company-preview";
import { bindEvidenceOverlay, type EvidenceOverlay } from "../src/lib/engine/evidence-overlay";

/** W0 (QA خاص): ربط أدلة أربع قيم FY2025 بالحمولة المجمدة، بمفتاح كامل وفشل مغلق ودون تغيير أي خلية. */
const fixture = (s: string) =>
  JSON.parse(
    gunzipSync(
      readFileSync(new URL(`./fixtures/codex-20261013/${s}-page.json.gz`, import.meta.url)),
    ).toString(),
  );
const fixturePages = Object.fromEntries(["2222", "1120", "8010"].map((s) => [s, fixture(s)]));
mock.module("virtual:marefa-design-fixtures", () => ({ default: fixturePages }));
const { frozenDesignPreview } = await import("../src/lib/web-v1/design-fixtures.server");
const { buildOverview } = await import("../src/lib/web-v1/company-experience");
const { QaEvidencePanel } = await import("../src/components/web-v1/company-template");

const OVERLAY_PATH = fileURLToPath(
  new URL("../review-delivery/ARAMCO95/W0/evidence-overlay.json", import.meta.url),
);
const overlay = JSON.parse(readFileSync(OVERLAY_PATH, "utf8")) as EvidenceOverlay;
const page = () => structuredClone(fixturePages["2222"]) as EnginePage;
const RECORDS = ["FQ01-OBS-011", "FQ01-OBS-014", "FQ01-OBS-016", "FQ01-OBS-060"];
const ok = (r: ReturnType<typeof frozenDesignPreview>) => {
  if (r.state !== "ok") throw new Error(r.state);
  return r.preview;
};

test("the four FY2025 values bind with the full key; all WITHHELD and reviewer-only", () => {
  const a = bindEvidenceOverlay(page(), overlay);
  expect(a.rejected).toEqual([]);
  expect(a.bound.map((b) => b.evidence.record)).toEqual(RECORDS);
  for (const b of a.bound) {
    expect(b.qualification).toBe("WITHHELD");
    expect(b.display).toBe("reviewer_only");
    expect(b.evidence.sha256).toBe(
      "78bb678e8e45f5c58fa1b2402ab5a29c5ad10adfda8ba5e7ee5f4d1ad76cd227",
    );
  }
});

test("fail-closed: any differing key field rejects that entry, with no fallback to another row", () => {
  const fields: [keyof EvidenceOverlay["entries"][number]["key"], unknown][] = [
    ["valueSar", "1559342000001"],
    ["version", 1],
    ["sourceKey", "file:2db3fec862b11532059c5cf5a122822867153026961f9c0fa13904fc84aee005"],
    ["periodEnd", "2024-12-31"],
    ["periodKind", "quarter"],
    ["metric", "revenue_and_other_income_related_to_sales"],
    ["companyId", "sa:2223"],
  ];
  for (const [field, value] of fields) {
    const o = structuredClone(overlay);
    (o.entries[0]!.key as Record<string, unknown>)[field] = value;
    const a = bindEvidenceOverlay(page(), o);
    expect(a.bound.map((b) => b.evidence.record)).toEqual(RECORDS.slice(1));
    expect(a.rejected.map((r) => r.record)).toEqual(["FQ01-OBS-011"]);
  }
});

test("fail-closed: a different fixture identity rejects every entry", () => {
  const o = structuredClone(overlay);
  o.fixture.generatedAt = "2026-10-14T00:00:00+00:00";
  const a = bindEvidenceOverlay(page(), o);
  expect(a.bound).toEqual([]);
  expect(new Set(a.rejected.map((r) => r.reason))).toEqual(new Set(["fixture_identity_mismatch"]));
});

test("fail-closed: conflicting payload rows for the same identity reject the binding", () => {
  const p = page();
  const snap = (
    p.sections.financials as unknown as Record<string, { metrics: Record<string, unknown[]> }>
  )["annual"]!;
  const row = structuredClone(snap.metrics["revenue"]![0]) as Record<string, unknown>;
  row["value"] = "1559343000000";
  snap.metrics["revenue"]!.push(row);
  const a = bindEvidenceOverlay(p, overlay);
  expect(a.rejected).toEqual([
    expect.objectContaining({ record: "FQ01-OBS-011", reason: "payload_rows_disagree" }),
  ]);
});

test("no overlay path: no evidence on the preview; the live engine path never reads an overlay", () => {
  expect(ok(frozenDesignPreview({ market: "SA", symbol: "2222" })).evidence).toBeUndefined();
  const server = readFileSync(
    new URL("../src/lib/engine/company-preview.server.ts", import.meta.url),
    "utf8",
  );
  expect(server.includes("evidence")).toBe(false);
});

test("the overlay changes nothing on the preview except the separate evidence record", () => {
  const without = ok(frozenDesignPreview({ market: "SA", symbol: "2222" }));
  const withO = ok(
    frozenDesignPreview(
      { market: "SA", symbol: "2222" },
      { MAREFA_QA_EVIDENCE_OVERLAY_PATH: OVERLAY_PATH },
    ),
  );
  expect(withO.evidence?.bound.length).toBe(4);
  const { evidence: _ignored, ...rest } = withO;
  expect(rest).toEqual(without);
});

test("one record for the three pages: Overview key figures, Investor/Data statements read the same cell objects", () => {
  const p = ok(
    frozenDesignPreview(
      { market: "SA", symbol: "2222" },
      { MAREFA_QA_EVIDENCE_OVERLAY_PATH: OVERLAY_PATH },
    ),
  );
  const annual = p.statements.find((v) => v.mode === "annual")!;
  expect(annual.periods[0]!.end).toBe("2025-12-31");
  const overview = buildOverview(p);
  for (const b of p.evidence!.bound) {
    const row = annual.rows.find((r) => r.key === b.key.metric)!;
    const cell = row.cells[0]!;
    // Investor topic 5 and the Data tab both render FinancialExplorer from p.statements: this is that cell.
    expect(cell.state).toBe("value");
    if (cell.state !== "value") continue;
    expect(cell.cell.value).toBe(Number(b.key.valueSar));
    const kf = overview.keyFigures.find((k) => k.key === b.key.metric);
    if (kf && kf.state === "value") expect(kf.cell).toBe(cell.cell); // same object, not a copy
  }
  const kfKeys = overview.keyFigures.filter((k) => k.state === "value").map((k) => k.key);
  expect(kfKeys).toEqual(expect.arrayContaining(["revenue", "net_income", "total_equity"]));
});

test("reviewer panel shows key, document, page and WITHHELD, never an amount", () => {
  const p = ok(
    frozenDesignPreview(
      { market: "SA", symbol: "2222" },
      { MAREFA_QA_EVIDENCE_OVERLAY_PATH: OVERLAY_PATH },
    ),
  );
  const html = renderToStaticMarkup(createElement(QaEvidencePanel, { evidence: p.evidence! }));
  for (const r of RECORDS) expect(html).toContain(r);
  expect(html).toContain("WITHHELD");
  for (const b of p.evidence!.bound) {
    const v = b.key.valueSar;
    for (const s of [v, String(Number(v) / 1e6), (Number(v) / 1e6).toLocaleString("en-US")])
      expect(html.includes(s)).toBe(false);
  }
});

test("the overlay file is not part of the product source tree", () => {
  const walk = (d: string): string[] =>
    readdirSync(d).flatMap((f) =>
      statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)],
    );
  const src = fileURLToPath(new URL("../src", import.meta.url));
  expect(walk(src).filter((f) => f.endsWith("evidence-overlay.json"))).toEqual([]);
  expect(walk(src).some((f) => readFileSync(f, "utf8").includes("ARAMCO95/W0"))).toBe(false);
});
