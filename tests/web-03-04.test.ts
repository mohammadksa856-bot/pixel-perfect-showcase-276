// MAREFA-WEB-V1 / WEB-03 (صفحة الشركة) + WEB-04 (لوحة المصنع). القوالب: أرامكو 2222، الراجحي 1120، التعاونية 8010.
import { describe, expect, test } from "bun:test";
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement, type ReactElement } from "react";
import { buildCompanyPreview, type EnginePage } from "../src/lib/engine/company-preview";
import { buildStatements } from "../src/lib/engine/statements";
import {
  FACTORY_CATEGORIES,
  normalizeFactoryCoverage,
  type RawFactoryReadiness,
} from "../src/lib/engine/readiness";
import { FACTORY_CONTRACT_SPEC } from "../src/lib/web-v1/factory-contract.spec";
import { COMPANY_GROUPS, TOPIC_DESIGN } from "../src/lib/web-v1/model";
import { designReviewFixturesEnabled } from "../src/lib/web-v1/design-review-policy";
import { FinancialExplorer } from "../src/components/web-v1/financial-explorer";
import { FactoryPanel } from "../src/components/web-v1/factory-panel";
import { I18nProvider } from "../src/lib/i18n";

const ssr = (el: ReactElement) => renderToStaticMarkup(createElement(I18nProvider, null, el));
const gz = <T>(p: string): T =>
  JSON.parse(gunzipSync(readFileSync(new URL(p, import.meta.url))).toString());
const V5 = (s: string) => gz<EnginePage>(`./fixtures/codex-20261013/${s}-page.json.gz`);
const FACTORY = gz<{ companies: Record<string, NonNullable<RawFactoryReadiness>> }>(
  "./fixtures/web-v1/factory-b70254e.json.gz",
).companies;
const TEMPLATES = ["2222", "1120", "8010"] as const;

describe("WEB-03: multi-period statements", () => {
  test("annual periods come only from engine history, newest first; nothing is invented", () => {
    for (const s of TEMPLATES) {
      const page = V5(s);
      const v = buildCompanyPreview(page);
      const annual = v.statements.find((x) => x.mode === "annual")!;
      const ends = new Set([
        ...page.sections.financials.history.annual.periods.map((p) => p.period_end),
        ...page.sections.financials.history.annual_position.periods.map((p) => p.period_end),
      ]);
      expect(annual.periods.map((p) => p.end)).toEqual([...ends].sort().reverse());
      for (const r of annual.rows) expect(r.cells).toHaveLength(annual.periods.length);
    }
  });

  test("quarterly and YTD views are unavailable with a reason where the engine has none", () => {
    for (const s of ["1120", "8010"]) {
      const v = buildCompanyPreview(V5(s)).statements;
      for (const mode of ["quarter", "ytd"] as const) {
        const x = v.find((y) => y.mode === mode)!;
        expect(x).toMatchObject({ status: "unavailable", periods: [], rows: [] });
        expect(x.reason).toBeTruthy();
      }
    }
    const aramcoQ = buildCompanyPreview(V5("2222")).statements.find((x) => x.mode === "quarter")!;
    expect(aramcoQ.periods.map((p) => p.end)).toEqual(["2026-06-30", "2026-03-31"]);
  });

  test("every shown cell carries a source link; calculated values without reproduced inputs are withheld", () => {
    for (const s of TEMPLATES)
      for (const view of buildCompanyPreview(V5(s)).statements)
        for (const r of view.rows)
          for (const c of r.cells)
            if (c.state === "value") expect(c.cell.proof.sourceUrl).toMatch(/^https?:\/\//);
    const fcf = buildCompanyPreview(V5("2222")).statements[0]!.rows.find(
      (r) => r.key === "free_cash_flow",
    )!;
    expect(fcf.cells.every((c) => c.state === "withheld")).toBe(true);
  });

  test("sector changes the metrics, not the page structure", () => {
    const keys = (s: string) => buildCompanyPreview(V5(s)).keyFigures.map((f) => f.key);
    expect(keys("2222")).toContain("revenue");
    expect(keys("1120")).toContain("net_financing_income");
    expect(keys("8010")).toContain("insurance_revenue");
    for (const s of TEMPLATES) {
      const v = buildCompanyPreview(V5(s));
      expect(v.keyFigures).toHaveLength(6);
      expect(v.statements.map((x) => x.mode)).toEqual(["annual", "quarter", "ytd"]);
      expect(v.topics.map((t) => t.ordinal)).toEqual([...Array(18)].map((_, i) => i + 1));
    }
  });

  test("explorer: unavailable periods are disabled tabs, withheld cells say so, no change ratios", () => {
    const v = buildCompanyPreview(V5("1120"));
    const html = ssr(createElement(FinancialExplorer, { views: v.statements, kind: v.kind }));
    expect(html).toContain("data-period-tabs");
    expect(html.match(/disabled=""/g)).toHaveLength(2);
    expect(html).toContain('data-cell="withheld"');
    expect(html).not.toMatch(/YoY|نسبة التغير السنوي/);
    const fresh = buildStatements(V5("2222"), "ordinary");
    expect(fresh[0]!.sources.length).toBeGreaterThan(0);
  });

  test("each of the 18 topics has a designed component and its data requirement", () => {
    for (let i = 1; i <= 18; i++) {
      expect(TOPIC_DESIGN[i]!.component.ar.length).toBeGreaterThan(5);
      expect(TOPIC_DESIGN[i]!.needs.en.length).toBeGreaterThan(5);
    }
    expect(COMPANY_GROUPS.flatMap((g) => [...g.topics]).sort((a, b) => a - b)).toEqual(
      [...Array(18)].map((_, i) => i + 1),
    );
  });
});

describe("WEB-04: factory contract panel", () => {
  test("contract definitions: 18 categories in contract order, weights sum to 100", () => {
    expect(FACTORY_CONTRACT_SPEC.categories.map((c) => c.key)).toEqual(
      FACTORY_CATEGORIES.map((c) => c.key),
    );
    expect(FACTORY_CONTRACT_SPEC.categories.reduce((n, c) => n + c.weight, 0)).toBe(100);
    expect(FACTORY_CONTRACT_SPEC.overall_completeness_threshold).toBe(0.95);
  });

  test("not assessed: definitions shown (weight, minimum, sources, gates), but no score or field counts", () => {
    const html = ssr(createElement(FactoryPanel, { factory: normalizeFactoryCoverage(undefined) }));
    expect(html.match(/data-weight/g)).toHaveLength(18);
    expect(html).toContain("data-official-sources");
    expect(html).not.toContain("data-score-bar");
    expect(html).not.toContain("data-factory-score");
    expect(html).toContain('data-gate="not_evaluated"');
    expect(html).not.toContain('data-gate="passed"');
  });

  test("assessed (engine b70254e): scores, field counts, gates, last assessment, separation note", () => {
    const html = ssr(
      createElement(FactoryPanel, { factory: normalizeFactoryCoverage(FACTORY["sa:2222"]) }),
    );
    expect(html.match(/data-score-bar/g)).toHaveLength(18);
    expect(html).toContain("data-checked-at");
    expect(html).toContain("2026-10-13");
    expect(html).toContain("data-separation-note");
    expect(html).toContain('data-gate="failed"');
  });

  test("Al Rajhi: excluded category has its rule and no score; total withheld", () => {
    const f = normalizeFactoryCoverage(FACTORY["sa:1120"]);
    const html = ssr(createElement(FactoryPanel, { factory: f }));
    expect(html.match(/data-score-bar/g)).toHaveLength(17);
    expect(html).toContain("category_overrides.not_applicable_categories");
    expect(f.readiness.score).toBeNull();
  });
});

describe("frozen design preview branches", () => {
  const on = {
    MAREFA_DESIGN_FIXTURES: "true",
    VERCEL_ENV: "preview",
    WEB_V1_PREVIEW_ENABLED: "true",
    ENGINE_PREVIEW_ENABLED: "true",
  };
  test("only the two named review branches; never main, production or a pattern", () => {
    for (const b of ["codex/vercel-claude-build-review-20261014", "claude/web-03-04-company-page"])
      expect(designReviewFixturesEnabled({ ...on, VERCEL_GIT_COMMIT_REF: b })).toBe(true);
    for (const b of ["main", "main-fz2efq", "claude/web-03-04", "claude/web-03-04-company-page-x"])
      expect(designReviewFixturesEnabled({ ...on, VERCEL_GIT_COMMIT_REF: b })).toBe(false);
    expect(
      designReviewFixturesEnabled({
        ...on,
        VERCEL_ENV: "production",
        VERCEL_GIT_COMMIT_REF: "claude/web-03-04-company-page",
      }),
    ).toBe(false);
  });
});
