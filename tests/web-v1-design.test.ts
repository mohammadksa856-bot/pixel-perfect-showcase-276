// MAREFA-WEB-V1 / WEB-02: قالب الشركة بخمس مجموعات، ولوحة تغطية المصنع، وعلم المعاينة.
import { describe, expect, test } from "bun:test";
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement, type ReactElement } from "react";
import { buildCompanyPreview, type EnginePage } from "../src/lib/engine/company-preview";
import { normalizeFactoryCoverage, type RawFactoryReadiness } from "../src/lib/engine/readiness";
import { COMPANY_GROUPS, COMPANY_TABS } from "../src/lib/web-v1/model";
import { webV1PreviewEnabled } from "../src/lib/web-v1/flag.functions";
import { FactoryPanel } from "../src/components/web-v1/factory-panel";
import { I18nProvider } from "../src/lib/i18n";
import { stripIsolates } from "../src/lib/bidi";

const ssr = (el: ReactElement) => renderToStaticMarkup(createElement(I18nProvider, null, el));
const gz = <T>(p: string): T =>
  JSON.parse(gunzipSync(readFileSync(new URL(p, import.meta.url))).toString());
const FACTORY = gz<{ companies: Record<string, NonNullable<RawFactoryReadiness>> }>(
  "./fixtures/web-v1/factory-b70254e.json.gz",
).companies;
const V4 = (s: string) => gz<EnginePage>(`./fixtures/p02/engine-b70254e_page_SA-${s}.json.gz`);

describe("company template: five groups", () => {
  test("the five groups cover the 18 investor topics, each exactly once", () => {
    const all = COMPANY_GROUPS.flatMap((g) => [...g.topics]).sort((a, b) => a - b);
    expect(all).toEqual([...Array(18)].map((_, i) => i + 1));
    expect(COMPANY_GROUPS).toHaveLength(5);
  });

  test("coverage is a separate tab, not a sixth topic group", () => {
    expect(COMPANY_TABS).toEqual([...COMPANY_GROUPS.map((g) => g.id), "coverage"]);
  });

  test("every topic the engine sends lands in a group", () => {
    for (const s of ["2222", "1120", "8010"]) {
      const ordinals = buildCompanyPreview(V4(s)).topics.map((t) => t.ordinal);
      for (const o of ordinals)
        expect(COMPANY_GROUPS.some((g) => (g.topics as readonly number[]).includes(o))).toBe(true);
    }
  });
});

describe("factory coverage panel", () => {
  const panel = (raw: RawFactoryReadiness | undefined) =>
    ssr(createElement(FactoryPanel, { factory: normalizeFactoryCoverage(raw) }));

  test("renders all 18 categories with the five ready conditions", () => {
    const html = panel(FACTORY["sa:2222"]);
    expect(html.match(/data-category="/g)).toHaveLength(18);
    const conditions = html.split("data-conditions")[1]!.split("</ul>")[0]!;
    expect(conditions.match(/data-state="/g)).toHaveLength(5);
    expect(stripIsolates(html)).toContain("56.6");
    expect(html).toContain('data-gate="failed"');
  });

  test("Al Rajhi: excluded category shows its rule and no score; the total is withheld", () => {
    const html = panel(FACTORY["sa:1120"]);
    expect(html).toContain('data-category-status="not_applicable_by_rule"');
    expect(html).toContain("category_overrides.not_applicable_categories");
    expect(html).not.toContain("data-factory-score");
    expect(html).toContain("محجوب");
  });

  test("not assessed: 18 rows, no score anywhere, every condition unknown", () => {
    const html = panel(undefined);
    expect(html.match(/data-category-status="not_assessed"/g)).toHaveLength(18);
    expect(html).not.toContain("data-factory-score");
    expect(html).not.toMatch(/\d+%<\/span>/);
    expect(html).not.toContain('data-state="passed"');
  });
});

describe("preview flag", () => {
  test("off by default; only the exact string 'true' enables it", () => {
    expect(webV1PreviewEnabled({})).toBe(false);
    for (const v of ["1", "TRUE", "yes", " true"])
      expect(webV1PreviewEnabled({ WEB_V1_PREVIEW_ENABLED: v })).toBe(false);
    expect(webV1PreviewEnabled({ WEB_V1_PREVIEW_ENABLED: "true" })).toBe(true);
  });
});
