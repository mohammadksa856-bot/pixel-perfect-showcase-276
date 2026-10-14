// WEB-03/04 acceptance matrix, generated from the same view models the pages render.
// Usage: bun product-tracking/tools/web_03_04_acceptance.ts <out_dir>
import { gunzipSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { buildCompanyPreview, type EnginePage } from "../../src/lib/engine/company-preview";
import { normalizeFactoryCoverage, type RawFactoryReadiness } from "../../src/lib/engine/readiness";
import { COMPANY_GROUPS, TOPIC_DESIGN } from "../../src/lib/web-v1/model";
import { FACTORY_CONTRACT_SPEC } from "../../src/lib/web-v1/factory-contract.spec";

const root = new URL("../../tests/fixtures/", import.meta.url);
const gz = <T>(p: string): T => JSON.parse(gunzipSync(readFileSync(new URL(p, root))).toString());
const S = ["2222", "1120", "8010"] as const;
// Same rule as Codex's frozen preview (src/lib/web-v1/design-fixtures.server.ts): calculated rows are withheld,
// so the matrix counts what the Vercel preview actually shows.
function withholdDerived(v: unknown): void {
  if (!v || typeof v !== "object") return;
  if (Array.isArray(v)) return v.forEach(withholdDerived);
  const row = v as Record<string, unknown>;
  if (row["is_calculated"] === true || row["is_calculated"] === 1) {
    row["quality_status"] = "withheld";
    row["quality_reasons"] = ["design_fixture_derivative_not_approved"];
  }
  Object.values(row).forEach(withholdDerived);
}
const frozen = (s: string) => {
  const raw = gz<EnginePage>(`codex-20261013/${s}-page.json.gz`);
  withholdDerived(raw);
  return buildCompanyPreview(raw);
};
const pages = Object.fromEntries(S.map((s) => [s, frozen(s)]));
const factory = gz<{ companies: Record<string, RawFactoryReadiness> }>(
  "web-v1/factory-b70254e.json.gz",
).companies;

const blockStats = (s: string, ord: number) => {
  const t = pages[s]!.topics.find((x) => x.ordinal === ord)!;
  let withheld = 0;
  for (const b of t.blocks) if (b.type === "metrics") withheld += b.group.withheld.length;
  if (ord === 5)
    for (const v of pages[s]!.statements)
      for (const r of v.rows) for (const c of r.cells) if (c.state === "withheld") withheld++;
  const statementValues =
    ord === 5
      ? pages[s]!.statements.reduce(
          (n, v) =>
            n + v.rows.reduce((m, r) => m + r.cells.filter((c) => c.state === "value").length, 0),
          0,
        )
      : 0;
  return { shown: t.shownCount + statementValues, withheld, engine_status: t.status };
};

const topics = COMPANY_GROUPS.flatMap((g) =>
  (g.topics as readonly number[]).map((ord) => ({
    ordinal: ord,
    group: g.id,
    title: pages["2222"]!.topics.find((x) => x.ordinal === ord)!.title,
    component: TOPIC_DESIGN[ord]!.component,
    needs: TOPIC_DESIGN[ord]!.needs,
    ui: "IMPLEMENTED",
    companies: Object.fromEntries(S.map((s) => [s, blockStats(s, ord)])),
    acceptance: "PENDING_REVIEW",
  })),
).sort((a, b) => a.ordinal - b.ordinal);

const cats = FACTORY_CONTRACT_SPEC.categories.map((c, i) => ({
  ordinal: i + 1,
  key: c.key,
  weight: c.weight,
  threshold: c.threshold,
  official_sources: c.official_sources,
  gates_defined: c.hard_gates.length,
  ui: "IMPLEMENTED",
  companies: Object.fromEntries(
    S.map((s) => {
      const f = normalizeFactoryCoverage(factory[`sa:${s}`] ?? undefined).categories[i]!;
      return [
        s,
        f.status === "not_assessed"
          ? { b70254e: "not_assessed" }
          : {
              b70254e: f.status,
              score: f.score,
              populated: f.fields.populated,
              expected: f.fields.expected,
              gates: f.gates.map((g) => g.status),
            },
      ];
    }),
  ),
  frozen_preview: "not_assessed (Codex design policy)",
  acceptance: "PENDING_REVIEW",
}));

const out = process.argv[2]!;
writeFileSync(
  `${out}/acceptance-matrix.json`,
  JSON.stringify(
    {
      generated_from: {
        pages: "tests/fixtures/codex-20261013 (frozen v5)",
        factory: "tests/fixtures/web-v1/factory-b70254e.json.gz",
        contract: FACTORY_CONTRACT_SPEC.source,
      },
      investor_topics: topics,
      factory_categories: cats,
    },
    null,
    2,
  ) + "\n",
);

const st = (x: { shown: number; withheld: number; engine_status: string }) =>
  `${x.shown} / ${x.withheld}`;
let md =
  "# WEB-03/04: مصفوفة القبول\n\nمولّدة آليًا من نماذج العرض نفسها (`product-tracking/tools/web_03_04_acceptance.ts`). **كل الصفوف بانتظار المراجعة؛ لا شيء معتمد.**\n\n";
md +=
  "## موضوعات المستثمر الـ18 (القيم المعروضة / المحجوبة، كما في معاينة Vercel: عينات v5 المجمّدة مع حجب المشتقات)\n\n| # | المجموعة | الموضوع | الواجهة المصممة | أرامكو 2222 | الراجحي 1120 | التعاونية 8010 | الواجهة | القبول |\n|---|---|---|---|---|---|---|---|---|\n";
for (const t of topics)
  md += `| ${t.ordinal} | ${t.group} | ${t.title.ar} | ${t.component.ar} | ${st(t.companies["2222"])} | ${st(t.companies["1120"])} | ${st(t.companies["8010"])} | ${t.ui} | ${t.acceptance} |\n`;
md += "\n«0 / 0» يعني أن الموضوع يعرض حالته وسببه ووصف واجهته وما تحتاجه، دون أي رقم.\n\n";
md +=
  "## فئات المصنع التشغيلية الـ18 (تقييم المحرك @ b70254e على نسخة معزولة؛ معاينة Vercel تعرضها «لم تُقيَّم»)\n\n| # | الفئة | الوزن | الحد | المصادر | البوابات | أرامكو 2222 | الراجحي 1120 | التعاونية 8010 | الواجهة | القبول |\n|---|---|---|---|---|---|---|---|---|---|---|\n";
const fc = (x: Record<string, unknown>) =>
  x["b70254e"] === "not_assessed"
    ? "لم تُقيَّم"
    : `${x["b70254e"]} ${x["score"] === null ? "(بلا درجة)" : Math.round(Number(x["score"]) * 100) + "%"} · ${x["populated"] ?? "—"}/${x["expected"] ?? "—"} · ${(x["gates"] as string[]).join(",")}`;
for (const c of cats)
  md += `| ${c.ordinal} | ${c.key} | ${c.weight} | ${Math.round(c.threshold * 100)}% | ${c.official_sources.length} | ${c.gates_defined} | ${fc(c.companies["2222"] as Record<string, unknown>)} | ${fc(c.companies["1120"] as Record<string, unknown>)} | ${fc(c.companies["8010"] as Record<string, unknown>)} | ${c.ui} | ${c.acceptance} |\n`;
writeFileSync(`${out}/acceptance-matrix.md`, md);
console.log("topics", topics.length, "categories", cats.length);
