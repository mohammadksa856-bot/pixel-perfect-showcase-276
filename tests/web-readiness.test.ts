// MAREFA-WEB-V1 / WEB-01: عقد الجاهزية في الواجهة. نموذجان منفصلان (موضوعات المستثمر / الفئات التشغيلية)،
// ثلاث حالات فقط، والمعيار 95 ثابت. قوالب القبول الثلاثة: أرامكو 2222، الراجحي 1120، التعاونية 8010.
// عقد المصنع: نتيجة المقيّم الحقيقي في المحرك @ b70254e على نسخة معزولة (tests/fixtures/web-v1).
import { describe, expect, test } from "bun:test";
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement, type ReactElement } from "react";
import { buildCompanyPreview, type EnginePage } from "../src/lib/engine/company-preview";
import {
  FACTORY_CATEGORIES,
  normalizeFactoryCoverage,
  normalizeInvestorReadiness,
  READINESS_TARGET,
  type RawFactoryReadiness,
} from "../src/lib/engine/readiness";
import { ReadinessCard, TopicSection } from "../src/components/engine-preview";
import { I18nProvider } from "../src/lib/i18n";
import { stripIsolates } from "../src/lib/bidi";

const ssr = (el: ReactElement) => renderToStaticMarkup(createElement(I18nProvider, null, el));
const gz = <T>(path: string): T =>
  JSON.parse(gunzipSync(readFileSync(new URL(path, import.meta.url))).toString());
const V4 = (s: string) => gz<EnginePage>(`./fixtures/p02/engine-b70254e_page_SA-${s}.json.gz`);
const V5 = (s: string) => gz<EnginePage>(`./fixtures/codex-20261013/${s}-page.json.gz`);
const FACTORY = gz<{ companies: Record<string, NonNullable<RawFactoryReadiness>> }>(
  "./fixtures/web-v1/factory-b70254e.json.gz",
).companies;
const factory = (s: string) => structuredClone(FACTORY[`sa:${s}`]!);
const TEMPLATES = ["2222", "1120", "8010"] as const;

/** نسخة «مثالية» من تقييم أرامكو: كل الفئات والبوابات ناجحة. تُستخدم لاختبار شروط «جاهز» فقط. */
function perfect(): NonNullable<RawFactoryReadiness> {
  const f = factory("2222");
  f.readiness_state = "ready";
  f.total_score = "97";
  f.all_hard_gates_evaluated = true;
  f.all_hard_gates_passed = true;
  f.blocking_reasons = [];
  for (const c of f.categories!) {
    c.status = "complete";
    c.score = "1";
    c.threshold_passed = true;
    for (const g of c.hard_gates!) g.status = "passed";
  }
  f.assessment_approval = { status: "approved" };
  return f;
}

describe("investor topics readiness", () => {
  const ok = {
    readiness_state: "ready",
    total_score: "96.2",
    target_score: "95",
    hard_gates: { a: { passed: true } },
  };

  test("ready only with engine 'ready', score ≥ 95, target 95 and every gate present and passed", () => {
    expect(normalizeInvestorReadiness(ok).state).toBe("ready");
  });

  test("missing hard gates are not a pass", () => {
    for (const hard_gates of [undefined, null, {}]) {
      const r = normalizeInvestorReadiness({ ...ok, hard_gates });
      expect(r.state).toBe("not_ready");
      expect(r.reasons).toContain("hard_gates_missing");
    }
  });

  test("engine 'ready' contradicted by score or a failed gate → not ready, with the reason", () => {
    const low = normalizeInvestorReadiness({ ...ok, total_score: "94.99" });
    expect(low).toMatchObject({ state: "not_ready", score: 94.99 });
    expect(low.reasons).toContain("score_below_target");
    const gate = normalizeInvestorReadiness({
      ...ok,
      hard_gates: { five_annual_periods: { passed: false } },
    });
    expect(gate.state).toBe("not_ready");
    expect(gate.reasons).toContain("five_annual_periods");
  });

  test("no valid assessment → not assessed and no score", () => {
    for (const raw of [
      undefined,
      null,
      { ...ok, readiness_state: null },
      { ...ok, total_score: null },
      { ...ok, readiness_state: "assessment_ready" },
      { ...ok, target_score: "90" },
      { ...ok, target_score: null },
    ])
      expect(normalizeInvestorReadiness(raw)).toMatchObject({
        state: "not_assessed",
        score: null,
        target: READINESS_TARGET,
      });
  });

  test("no free score: a scored not-applicable category withholds the total", () => {
    const cats = [{ status: "not_applicable", score: "1" }];
    expect(normalizeInvestorReadiness({ ...ok, categories: cats })).toMatchObject({
      state: "not_assessed",
      score: null,
    });
    expect(
      normalizeInvestorReadiness({ ...ok, readiness_state: "not_ready", categories: cats }),
    ).toMatchObject({ state: "not_ready", score: null });
  });
});

describe("factory contract: the 18 operational categories", () => {
  test("always 18 categories in contract order, even when the block is absent", () => {
    for (const raw of [undefined, null, { readiness_state: "not_assessed", categories: [] }]) {
      const f = normalizeFactoryCoverage(raw);
      expect(f.categories.map((c) => c.key)).toEqual(FACTORY_CATEGORIES.map((c) => c.key));
      expect(f.readiness).toMatchObject({ state: "not_assessed", score: null });
      for (const c of f.categories)
        expect(c).toMatchObject({ status: "not_assessed", score: null });
      for (const c of f.conditions) expect(c.state).toBe("unknown");
    }
  });

  test("Aramco @ b70254e: not ready at 56.6, thresholds, gates and missing fields carried through", () => {
    const f = normalizeFactoryCoverage(factory("2222"));
    expect(f.readiness.state).toBe("not_ready");
    expect(f.readiness.score!).toBeCloseTo(56.56, 2);
    const fs = f.categories.find((c) => c.key === "financial_statements")!;
    expect(fs).toMatchObject({ weight: 14, threshold: 0.95, thresholdPassed: false });
    expect(fs.gates[0]).toMatchObject({ id: "financial_statements:1", status: "failed" });
    expect(fs.gates[0]!.details).toContainEqual({ key: "quarter_periods", value: "2" });
    expect(fs.missingFields.length).toBeGreaterThan(0);
    expect(f.conditions.find((c) => c.key === "all_gates_evaluated")!.state).toBe("failed");
    expect(f.conditions.find((c) => c.key === "approved_assessment")!.state).toBe("unknown");
  });

  test("Al Rajhi @ b70254e: not-applicable category shows its rule, no score, and the total is withheld", () => {
    const f = normalizeFactoryCoverage(factory("1120"));
    const op = f.categories.find((c) => c.key === "operational_kpis")!;
    expect(op).toMatchObject({
      status: "not_applicable_by_rule",
      score: null,
      thresholdPassed: null,
    });
    expect(op.exclusionRule).toMatchObject({ pack: "banking" });
    expect(f.readiness).toMatchObject({ state: "not_ready", score: null });
    expect(f.readiness.reasons).toContain("total_includes_not_applicable_credit");
  });

  test("a not-applicable category without a cited rule is labelled as such", () => {
    const raw = factory("1120");
    const op = raw.categories!.find((c) => c.category_key === "operational_kpis")!;
    op.evidence = { ...op.evidence, not_applicable: null };
    const c = normalizeFactoryCoverage(raw).categories.find((x) => x.key === "operational_kpis")!;
    expect(c.status).toBe("not_applicable_without_rule");
    expect(c.reasons).toContain("not_applicable_without_cited_rule");
  });

  test("ready needs every category, threshold and gate, plus an approved assessment", () => {
    expect(normalizeFactoryCoverage(perfect()).readiness).toMatchObject({
      state: "ready",
      score: 97,
    });

    const unapproved = perfect();
    delete unapproved.assessment_approval;
    expect(normalizeFactoryCoverage(unapproved).readiness).toMatchObject({
      state: "not_assessed",
      score: null,
    });

    const oneLow = perfect();
    oneLow.categories![3]!.threshold_passed = false;
    oneLow.categories![3]!.score = "0.5";
    expect(normalizeFactoryCoverage(oneLow).readiness.state).toBe("not_ready");

    const noGates = perfect();
    noGates.categories![5]!.hard_gates = [];
    const ng = normalizeFactoryCoverage(noGates);
    expect(ng.readiness.state).toBe("not_ready");
    expect(ng.categories[5]!.reasons).toContain("hard_gates_missing");

    const unevaluated = perfect();
    unevaluated.categories![7]!.hard_gates![0]!.status = "not_evaluated";
    expect(normalizeFactoryCoverage(unevaluated).readiness.state).toBe("not_ready");

    const missingCat = perfect();
    missingCat.categories!.pop();
    expect(normalizeFactoryCoverage(missingCat).readiness).toMatchObject({
      state: "not_assessed",
      score: null,
    });
  });

  test("an invalid assessment shows no score: wrong model, investor score blended, or target ≠ 95", () => {
    for (const patch of [
      { scoring_model: "18-categories-v1" },
      { legacy_understanding_score_included: true },
      { target_score: "90" },
    ])
      expect(normalizeFactoryCoverage({ ...factory("2222"), ...patch }).readiness).toMatchObject({
        state: "not_assessed",
        score: null,
      });
  });

  test("the investor model is never used as factory evidence", () => {
    const page = V4("2222");
    page.data_quality.understanding.readiness_state = "ready";
    page.data_quality.understanding.total_score = "99";
    const v = buildCompanyPreview(page);
    expect(v.readiness.operationalCategories).toMatchObject({ state: "not_assessed", score: null });
    expect(v.factory.categories.every((c) => c.score === null)).toBe(true);
  });
});

describe("acceptance templates: Aramco, Al Rajhi, Tawuniya", () => {
  test("contract v4: investor topics measured and not ready; factory not in contract", () => {
    const scores: Record<string, number> = { "2222": 64.75, "1120": 28.74, "8010": 15.44 };
    for (const s of TEMPLATES) {
      const r = buildCompanyPreview(V4(s)).readiness;
      expect(r.investorTopics.state).toBe("not_ready");
      expect(r.investorTopics.score!).toBeCloseTo(scores[s]!, 2);
      expect(r.operationalCategories).toMatchObject({ state: "not_assessed", score: null });
    }
  });

  test("contract v5: the two models stay separate and keep the engine's own states", () => {
    const want: Record<string, string> = {
      "2222": "not_assessed",
      "1120": "not_assessed",
      "8010": "not_ready",
    };
    for (const s of TEMPLATES) {
      const r = buildCompanyPreview(V5(s)).readiness;
      expect(r.investorTopics.state).toBe(want[s]);
      expect(r.operationalCategories.state).toBe("not_assessed");
      expect(r.operationalCategories.reasons).toContain("run_factory_contract_readiness");
    }
  });

  test("no template is ever shown as ready, in either contract or with the factory evaluation", () => {
    for (const s of TEMPLATES)
      for (const p of [V4(s), V5(s)]) {
        if (FACTORY[`sa:${s}`]?.readiness_state) p.data_quality.factory_readiness = factory(s);
        const r = buildCompanyPreview(p).readiness;
        expect([r.investorTopics.state, r.operationalCategories.state]).not.toContain("ready");
      }
  });

  test("a topic the engine calls not applicable (no cited rule) is not measured, with no score", () => {
    const p = V4("1120");
    const cat = p.data_quality.understanding.categories.find((c) => c.ordinal === 8)!;
    Object.assign(cat, { status: "not_applicable", score: "1" });
    const v = buildCompanyPreview(p);
    const t = v.topics.find((x) => x.ordinal === 8)!;
    expect(t).toMatchObject({ status: "not_measured", score: null });
    expect(t.reasons.map((r) => r.en).join(" ")).toContain("without a cited rule");
    expect(v.readiness.investorTopics).toMatchObject({ state: "not_ready", score: null });
  });
});

describe("rendering", () => {
  const html = (r: Parameters<typeof ReadinessCard>[0]["readiness"]) =>
    ssr(createElement(ReadinessCard, { readiness: r }));

  test("not assessed renders no score and no 'ready' label", () => {
    const out = html(normalizeFactoryCoverage(undefined).readiness);
    expect(out).toContain('data-readiness-state="not_assessed"');
    expect(out).not.toContain(" من ");
    expect(out).not.toContain(">جاهز<");
  });

  test("not ready renders the engine score against 95", () => {
    const out = html(buildCompanyPreview(V4("2222")).readiness.investorTopics);
    expect(out).toContain('data-readiness-state="not_ready"');
    expect(stripIsolates(out)).toContain("64.8 من 95");
  });

  test("a measured topic shows its coverage; a not-measured topic shows none", () => {
    const v4 = buildCompanyPreview(V4("2222"));
    const measured = v4.topics.find((t) => t.score !== null)!;
    expect(
      ssr(createElement(TopicSection, { topic: measured, preview: v4, peers: null })),
    ).toContain("تغطية الموضوع في المحرك");
    const v = buildCompanyPreview(V5("2222"));
    for (const topic of v.topics) {
      const out = ssr(createElement(TopicSection, { topic, preview: v, peers: null }));
      expect(out).not.toMatch(/Engine topic coverage|تغطية الموضوع في المحرك/);
    }
  });
});
