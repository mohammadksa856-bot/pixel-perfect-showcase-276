// مواءمة P02 مع حزمة أدلة Codex (company-preview-engine-20261013-v1).
// العينات مجمّدة للاختبار فقط، وليست بيانات إنتاجية. الـ companion يُستخدم هنا كمرجع اختبار
// فقط ولا يُستورد في كود الموقع: اعتماده كعقد ينتظر موافقة Codex.
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { readFileSync, readdirSync } from "node:fs";
import {
  buildCompanyPreview,
  contractProblems,
  type CompanyPreview,
  type EnginePage,
  type MetricGroup,
} from "../src/lib/engine/company-preview";

// sha256 من MANIFEST.json في codex/company-preview-engine-20261013 @ 07f3038 (بايتات Git الدقيقة)
const PINNED: Record<string, string> = {
  "2222-page": "e98863c41faf85069a4562b0d330a77f49863979bc3fb78502912ced5d95c936",
  "2222-preview-evidence": "87f80ffc55873fb4a70a6e218047221344db26e737991b658327cfa2a090ec1f",
  "1120-page": "39c5373abf96399e2e4c23c3728b78c9c2179520544d1053fd6dddface1f0606",
  "1120-preview-evidence": "5cadf02ecf8a356fac9b0fe58fb7a87801198934c033002313396009b7ecf5c4",
  "8010-page": "c0652cc6da3142745513d1acd959753724a9ce0f7a4674e3f37b81df3378108a",
  "8010-preview-evidence": "22debed202eb840e5be0b3b35049e950cd6b481cf91b57ba09cd5dcd01ad74de",
};

const raw = (name: string) =>
  gunzipSync(readFileSync(new URL(`./fixtures/codex-20261013/${name}.json.gz`, import.meta.url)));
const page = (s: string) => JSON.parse(raw(`${s}-page`).toString()) as EnginePage;
type EvidenceRow = {
  metric: string;
  period_kind: string;
  period_end: string;
  scope: string;
  dimensions: Record<string, string>;
  status: "available" | "withheld";
  reasons: string[];
};
const companion = (s: string) =>
  (JSON.parse(raw(`${s}-preview-evidence`).toString()) as { numeric_evidence: EvidenceRow[] })
    .numeric_evidence;
const groups = (v: CompanyPreview): MetricGroup[] =>
  v.topics.flatMap((t) => t.blocks).flatMap((b) => (b.type === "metrics" ? [b.group] : []));

describe("Codex evidence package: integrity", () => {
  for (const [name, sha] of Object.entries(PINNED))
    test(`${name} matches MANIFEST sha256`, () => {
      expect(createHash("sha256").update(raw(name)).digest("hex")).toBe(sha);
    });

  test("site code never imports the companion (not adopted before Codex approval)", () => {
    const walk = (dir: URL): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(new URL(`${e.name}/`, dir)) : [fileURLToPath(new URL(e.name, dir))],
      );
    for (const f of walk(new URL("../src/", import.meta.url)))
      expect(readFileSync(f, "utf8")).not.toMatch(
        /preview-evidence|company-preview-evidence|numeric_evidence/,
      );
  });
});

describe("page v5 is consumed through the base contract only", () => {
  for (const s of ["2222", "1120", "8010"])
    test(`${s}: v5 passes the contract check`, () => {
      expect(page(s).contract_version).toBe(5);
      expect(contractProblems(page(s))).toEqual([]);
    });

  test("legacy readiness missing (2222/1120) → every topic 'not measured', never 100%", () => {
    for (const s of ["2222", "1120"]) {
      const v = buildCompanyPreview(page(s));
      expect(new Set(v.topics.map((t) => t.status))).toEqual(new Set(["not_measured"]));
      expect(v.readiness.score).toBeNull();
    }
  });
});

describe("agreement with the companion verdicts (test oracle)", () => {
  for (const s of ["2222", "1120", "8010"])
    test(`${s}: every value P02 shows is 'available' in the companion`, () => {
      const v = buildCompanyPreview(page(s));
      const verdict = new Map<string, EvidenceRow>();
      for (const r of companion(s))
        if (r.scope === "consolidated" && !Object.keys(r.dimensions ?? {}).length) {
          const k = `${r.metric}|${r.period_kind}|${r.period_end}`;
          if (!verdict.has(k) || r.status === "available") verdict.set(k, r);
        }
      const disagreements: string[] = [];
      for (const g of groups(v))
        for (const c of g.cells) {
          const r = verdict.get(`${c.key}|${c.period.kind}|${c.period.end}`);
          if (!r || r.status !== "available")
            disagreements.push(`${c.key}:${r ? r.reasons.join("+") : "absent"}`);
        }
      expect(disagreements).toEqual([]);
      expect(v.counts.shown).toBeGreaterThan(0);
    });
});

describe("unproven derivatives (lineage not reproduced)", () => {
  test("Aramco/Al Rajhi calculated values are withheld with the lineage reason", () => {
    for (const s of ["2222", "1120"]) {
      const v = buildCompanyPreview(page(s));
      const calcShown = groups(v)
        .flatMap((g) => g.cells)
        .filter((c) => c.proof.kind === "calculated_inputs_reproduced");
      expect(calcShown).toEqual([]);
      const reasons = groups(v).flatMap((g) => g.withheld.map((w) => w.reason));
      expect(reasons).toContain("calculated_inputs_not_reproduced");
    }
  });

  test("Tawuniya calculated values with reproduced inputs are shown, with formula", () => {
    const v = buildCompanyPreview(page("8010"));
    const calc = groups(v)
      .flatMap((g) => g.cells)
      .filter((c) => c.proof.kind === "calculated_inputs_reproduced");
    expect(calc.map((c) => c.key)).toEqual(
      expect.arrayContaining(["income_quality", "accrual_ratio"]),
    );
    for (const c of calc) expect(c.proof.formula).toBeTruthy();
  });

  test("tampered lineage on a reproduced row → withheld", () => {
    const p = page("8010");
    const f = p.sections.financials;
    for (const snap of [f.annual, f.quarter, f.ytd, f.ttm, f.instant])
      for (const rows of Object.values(snap.metrics))
        for (const r of rows)
          if (r.provenance?.derivation?.lineage)
            r.provenance.derivation.lineage.current_inputs_reproduced = false;
    const v = buildCompanyPreview(p);
    expect(
      groups(v)
        .flatMap((g) => g.cells)
        .some((c) => c.proof.kind === "calculated_inputs_reproduced"),
    ).toBe(false);
  });
});

describe("source availability ≠ independent verification ≠ original document", () => {
  test("no value is ever marked independently verified (named-cell reviews are companion-only)", () => {
    for (const s of ["2222", "1120", "8010"])
      for (const c of groups(buildCompanyPreview(page(s))).flatMap((g) => g.cells))
        expect(c.proof.independentlyVerified).toBe(false);
  });

  test("Tawuniya: figures come from an import file, original not archived → labelled and noticed", () => {
    const v = buildCompanyPreview(page("8010"));
    const cells = groups(v).flatMap((g) => g.cells);
    expect(cells.length).toBeGreaterThan(0);
    expect(new Set(cells.map((c) => c.proof.document))).toEqual(new Set(["import_file_only"]));
    expect(v.dataNotices).toHaveLength(1);
    expect(v.dataNotices[0]!.en).toContain("original document is not archived");
  });

  test("Al Rajhi: original PDF/Excel archived; Aramco: not stated → never labelled import file", () => {
    const docs = (x: string) =>
      new Set(
        groups(buildCompanyPreview(page(x)))
          .flatMap((g) => g.cells)
          .map((c) => c.proof.document),
      );
    expect(docs("1120")).toEqual(new Set(["original_document"]));
    expect(docs("2222")).toEqual(new Set(["not_stated"])); // الرد لا يذكر content_type
    for (const x of ["2222", "1120"]) expect(buildCompanyPreview(page(x)).dataNotices).toEqual([]);
  });
});

describe("sector policy: facts retained, no display-level 'not applicable'", () => {
  test("no group exposes a not-applicable list; insurer cash ratios with reproduced inputs are shown", () => {
    const v = buildCompanyPreview(page("8010"));
    expect(JSON.stringify(v)).not.toContain("notApplicable");
    expect(
      groups(v)
        .flatMap((g) => g.cells)
        .map((c) => c.key),
    ).toContain("cash_conversion_of_earnings");
  });
});
