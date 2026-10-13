// MAREFA-WEB-V1: عقد الجاهزية في الواجهة. نموذجان منفصلان (موضوعات المستثمر / الفئات التشغيلية)،
// ثلاث حالات فقط، والمعيار 95 ثابت. قوالب القبول الثلاثة: أرامكو 2222، الراجحي 1120، التعاونية 8010.
import { describe, expect, test } from "bun:test";
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { buildCompanyPreview, type EnginePage } from "../src/lib/engine/company-preview";
import { normalizeReadiness, READINESS_TARGET } from "../src/lib/engine/readiness";
import { ReadinessCard, TopicSection } from "../src/components/engine-preview";
import { I18nProvider } from "../src/lib/i18n";
import { stripIsolates } from "../src/lib/bidi";
import type { ReactElement } from "react";

const ssr = (el: ReactElement) => renderToStaticMarkup(createElement(I18nProvider, null, el));

const gz = (path: string): EnginePage =>
  JSON.parse(gunzipSync(readFileSync(new URL(path, import.meta.url))).toString());
const V4 = (s: string) => gz(`./fixtures/p02/engine-b70254e_page_SA-${s}.json.gz`);
const V5 = (s: string) => gz(`./fixtures/codex-20261013/${s}-page.json.gz`);
const TEMPLATES = ["2222", "1120", "8010"] as const;

describe("normalizeReadiness: three states, fixed 95 target", () => {
  const ok = { readiness_state: "ready", total_score: "96.2", target_score: "95" };

  test("ready only when the engine says ready, score ≥ 95, target 95 and every gate passed", () => {
    expect(normalizeReadiness(ok, "investor_topics").state).toBe("ready");
    expect(
      normalizeReadiness({ ...ok, hard_gates: { a: { passed: true } } }, "investor_topics").state,
    ).toBe("ready");
  });

  test("engine 'ready' that contradicts score or gates is shown as not ready, with the reason", () => {
    const low = normalizeReadiness({ ...ok, total_score: "94.99" }, "investor_topics");
    expect(low).toMatchObject({ state: "not_ready", score: 94.99 });
    expect(low.reasons).toContain("engine_ready_inconsistent");
    const gate = normalizeReadiness(
      { ...ok, hard_gates: { five_annual_periods: { passed: false } } },
      "investor_topics",
    );
    expect(gate.state).toBe("not_ready");
    expect(gate.reasons).toContain("five_annual_periods");
  });

  test("a different or missing target is never read against our 95 criterion", () => {
    for (const target_score of ["90", null])
      expect(normalizeReadiness({ ...ok, target_score }, "investor_topics")).toMatchObject({
        state: "not_assessed",
        target: READINESS_TARGET,
      });
  });

  test("no free score: a not-applicable category carrying a score blocks the total", () => {
    const r = normalizeReadiness(
      { ...ok, categories: [{ status: "not_applicable", score: "1" }] },
      "investor_topics",
    );
    expect(r.state).toBe("not_assessed");
    expect(r.reasons).toContain("not_applicable_scored");
  });

  test("missing block, null state, null score or unknown state → not assessed, no score", () => {
    for (const raw of [
      undefined,
      null,
      { ...ok, readiness_state: null },
      { ...ok, total_score: null },
      { ...ok, readiness_state: "assessment_ready" },
    ])
      expect(normalizeReadiness(raw, "operational_categories")).toMatchObject({
        state: "not_assessed",
        score: null,
      });
  });
});

describe("acceptance templates: Aramco, Al Rajhi, Tawuniya", () => {
  test("contract v4: investor topics measured and not ready; operational categories not assessed", () => {
    const scores: Record<string, number> = { "2222": 64.75, "1120": 28.74, "8010": 15.44 };
    for (const s of TEMPLATES) {
      const r = buildCompanyPreview(V4(s)).readiness;
      expect(r.investorTopics.state).toBe("not_ready");
      expect(r.investorTopics.score!).toBeCloseTo(scores[s], 2);
      expect(r.operationalCategories).toMatchObject({
        state: "not_assessed",
        score: null,
        reasons: ["not_in_contract"],
      });
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

  test("no template is ever shown as ready", () => {
    for (const s of TEMPLATES)
      for (const p of [V4(s), V5(s)]) {
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
    expect(v.readiness.investorTopics.reasons).toContain("not_applicable_scored");
    expect(v.readiness.investorTopics.state).toBe("not_assessed");
  });
});

describe("rendering", () => {
  const html = (r: Parameters<typeof ReadinessCard>[0]["readiness"]) =>
    ssr(createElement(ReadinessCard, { readiness: r }));

  test("not assessed renders no number and no 'ready' label", () => {
    const out = html(normalizeReadiness(undefined, "operational_categories"));
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
    const measured = buildCompanyPreview(V4("2222")).topics.find((t) => t.score !== null)!;
    expect(
      ssr(
        createElement(TopicSection, {
          topic: measured,
          preview: buildCompanyPreview(V4("2222")),
          peers: null,
        }),
      ),
    ).toContain("تغطية الموضوع في المحرك");
    const v = buildCompanyPreview(V5("2222"));
    for (const topic of v.topics) {
      const out = ssr(createElement(TopicSection, { topic, preview: v, peers: null }));
      expect(out).not.toMatch(/Engine topic coverage|تغطية الموضوع في المحرك/);
    }
  });
});
