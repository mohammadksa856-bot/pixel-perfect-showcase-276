// MAREFA-WEB-V1 / WEB-07: Company experience (Overview / Company Intelligence / Marefa Data), Aramco first.
import { describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement, type ReactElement } from "react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterContextProvider,
} from "@tanstack/react-router";
import { I18nProvider } from "../src/lib/i18n";

const pages = Object.fromEntries(
  ["2222", "1120"].map((s) => [
    s,
    JSON.parse(
      gunzipSync(
        readFileSync(new URL(`./fixtures/codex-20261013/${s}-page.json.gz`, import.meta.url)),
      ).toString(),
    ),
  ]),
);
mock.module("virtual:marefa-design-fixtures", () => ({ default: pages }));
const { frozenDesignPreview } = await import("../src/lib/web-v1/design-fixtures.server");
const X = await import("../src/lib/web-v1/company-experience");
const { CompanyOverview } = await import("../src/components/web-v1/company-overview");
const { CompanyIntelligence } = await import("../src/components/web-v1/company-intelligence");
const { CompanyLevels } = await import("../src/components/web-v1/company-levels");
const { COMPANY_GROUPS } = await import("../src/lib/web-v1/model");

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const preview = (s: string) => {
  const r = frozenDesignPreview({ market: "SA", symbol: s });
  if (r.state !== "ok") throw new Error(r.state);
  return r.preview;
};
const router = createRouter({
  routeTree: createRootRoute(),
  history: createMemoryHistory({ initialEntries: ["/"] }),
});
const ssr = (el: ReactElement) =>
  renderToStaticMarkup(
    createElement(RouterContextProvider, { router }, createElement(I18nProvider, null, el)),
  );
const p = preview("2222");
const o = X.buildOverview(p);

describe("WEB-07 scope", () => {
  test("experience is built for Aramco only; other companies keep Marefa Data", () => {
    expect(X.EXPERIENCE_SYMBOLS).toEqual(["2222"]);
    expect(X.hasExperience("2222")).toBe(true);
    expect(X.hasExperience("1120")).toBe(false);
  });

  test("three levels in order", () => {
    expect(X.LEVELS.map((l) => l.id)).toEqual(["overview", "intelligence", "data"]);
  });

  test("allowlist addition is the exact branch name", () => {
    expect(read("src/lib/web-v1/design-review-policy.ts")).toContain(
      '"claude/web-07-company-experience"',
    );
  });
});

describe("Overview model: every value is an existing cell, nothing computed or invented", () => {
  const cellsInPage = new Set(
    p.topics.flatMap((t) =>
      t.blocks.flatMap((b) =>
        b.type === "metrics"
          ? b.group.cells.map((c) => `${c.key}|${c.value}|${c.period.end}`)
          : b.type === "segments"
            ? b.rows.map((c) => `${c.key}|${c.value}|${c.period.end}`)
            : [],
      ),
    ),
  );

  test("key figures are the page's key figures, unchanged, each with a deep link to topic 5", () => {
    expect(o.keyFigures.map(({ target: _t, ...k }) => k)).toEqual(p.keyFigures);
    for (const k of o.keyFigures) expect(k.target).toEqual({ topic: "financials", focus: k.key });
    // a withheld figure stays withheld with its reason
    expect(o.keyFigures.find((k) => k.key === "basic_eps")!.state).toBe("withheld");
  });

  test("operating, dividend and revenue-mix values all exist in the topics", () => {
    for (const c of [...o.operations.cells, ...o.dividends.cells])
      expect(cellsInPage.has(`${c.key}|${c.value}|${c.period.end}`)).toBe(true);
    for (const m of o.revenueMix)
      for (const r of m.rows)
        expect(cellsInPage.has(`${r.key}|${r.value}|${r.period.end}`)).toBe(true);
    expect(o.operations.cells).toHaveLength(7);
    expect(o.operations.withheld).toBe(1);
    expect(o.dividends.withheld).toBe(2);
  });

  test("business description is the source text, both languages, with source URL", () => {
    expect(o.description.ar!.key).toBe("business_description_ar");
    expect(o.description.en!.key).toBe("business_description");
    expect(o.description.en!.sourceUrl).toMatch(/^https:\/\//);
  });

  test("valuation: recorded close only, no documented multiples, no forecasts or analysts", () => {
    expect(o.valuation.quote?.observedAt).toBe("2026-09-03");
    expect(o.valuation.hasDocumentedValuation).toBe(false);
    expect(o.valuation.forecasts).toBe(false);
    expect(o.valuation.analysts).toBe(false);
    expect(o.catalysts.documented).toBe(false);
  });

  test("developments newest first, from actions and documents only", () => {
    const dates = o.developments.documents.map((d) => d.date ?? "");
    expect(dates).toEqual([...dates].sort().reverse());
    expect(o.developments.total).toBe(8 + 40);
  });

  test("status keeps investor topics and factory separate; counts are counts", () => {
    expect(o.status.topicsTotal).toBe(18);
    expect(o.status.topicsWithData).toBe(p.topics.filter((t) => t.shownCount > 0).length);
    expect(o.status.investorTopics.model).toBe("investor_topics");
    expect(o.status.factory.model).toBe("operational_categories");
  });
});

describe("Overview render", () => {
  const html = ssr(createElement(CompanyOverview, { p }));
  test("no invented price, multiple, forecast or 95% achievement", () => {
    expect(html).not.toMatch(/P\/E|EV\/EBITDA|مكرر الربحية|السعر المستهدف|target price/i);
    expect(html).not.toMatch(/95\s*%/);
    expect(html).toContain('data-valuation-state="unavailable"');
    expect(html).toContain('data-catalysts="not-documented"');
  });
  test("prominent entry to Company Intelligence and links to Marefa Data", () => {
    expect(html).toContain("data-intel-cta-link");
    expect(html).toMatch(/href="\/preview\/web-v1\/companies\/2222\/intelligence"/);
    expect(html).toMatch(/href="\/preview\/web-v1\/companies\/2222\?tab=coverage"/);
  });
  test("each key figure has a deep link (topic+focus) and its source", () => {
    for (const k of p.keyFigures) {
      expect(html).toContain(`data-intel-link="financials:${k.key}"`);
    }
    const revenue = /<li[^>]*data-overview-figure="revenue"[\s\S]*?<\/li>/.exec(html)![0];
    expect(revenue).toMatch(/intelligence\?topic=financials&amp;focus=revenue/);
    expect(revenue).toContain("data-source-link");
  });
  test("every external link is https and opens in a new tab", () => {
    for (const a of html.matchAll(/<a [^>]*target="_blank"[^>]*>/g))
      expect(a[0]).toMatch(/href="https:\/\//);
  });
});

describe("Company Intelligence", () => {
  test("all 18 topics in the five groups of model.ts, each exactly once", () => {
    const g = X.intelGroups(p);
    expect(g.map((x) => x.id)).toEqual(COMPANY_GROUPS.map((x) => x.id));
    const ords = g.flatMap((x) => x.topics.map((t) => t.ordinal)).sort((a, b) => a - b);
    expect(ords).toEqual([...Array(18)].map((_, i) => i + 1));
  });

  test("search: Arabic and English, every word must match, empty matches all, nothing removed", () => {
    const keys = (q: string) => p.topics.filter((t) => X.topicMatches(t, q)).map((t) => t.key);
    expect(keys("")).toHaveLength(18);
    expect(keys("dividend")).toContain("dividends_actions");
    expect(keys("التوزيعات")).toContain("dividends_actions");
    expect(keys("lifting cost")).toEqual(["operations"]);
    expect(keys("zzzz")).toEqual([]);
  });

  test("render: 18 topic sections, 5 groups, index, search, data links", () => {
    const html = ssr(createElement(CompanyIntelligence, { p, peers: null }));
    expect(html.match(/data-intel-topic="/g)).toHaveLength(18);
    expect(html.match(/data-intel-group="/g)).toHaveLength(5);
    expect(html.match(/id="topic-\d+"/g)).toHaveLength(18);
    expect(html).toContain("data-intel-search");
    expect(html.match(/data-intel-data-link="/g)).toHaveLength(5);
    expect(html).toContain("data-section-tabs"); // statements explorer with periods and charts
    expect(html).toMatch(/data-page-notice/);
  });

  test("render with a search query hides non-matching topics but keeps them in the page", () => {
    const html = ssr(createElement(CompanyIntelligence, { p, peers: null, q: "lifting cost" }));
    expect(html.match(/data-intel-topic="/g)).toHaveLength(18);
    expect(html).toContain('data-intel-count="1"');
  });

  test("deep-link search params are validated", () => {
    expect(X.intelSearch({ topic: "financials", focus: "total_assets", q: "x" })).toEqual({
      topic: "financials",
      focus: "total_assets",
      q: "x",
    });
    expect(X.intelSearch({ topic: "<script>", focus: "a b" })).toEqual({});
  });
});

describe("levels and Marefa Data", () => {
  test("level nav marks the current level with aria-current", () => {
    const html = ssr(createElement(CompanyLevels, { symbol: "2222", level: "intelligence" }));
    expect(html.match(/data-level-link="/g)).toHaveLength(3);
    expect(html).toMatch(
      /aria-current="page"[^>]*data-level-link="intelligence"|data-level-link="intelligence"[^>]*aria-current="page"/,
    );
    expect(html).toContain('href="/preview/web-v1/companies/2222?tab=business"');
  });

  test("Marefa Data page shows the level nav only for experience companies; WEB-06 template unchanged", () => {
    const src = read("src/routes/preview.web-v1.companies.$symbol.tsx");
    expect(src).toContain("hasExperience(p.company.symbol) && <CompanyLevels");
    expect(src).toContain("<CompanyTabs p={p} tab={tab} />");
    expect(src).toContain("<CoverageView p={p} open={open} />");
  });

  test("other companies: Overview/Intelligence show a not-built state, not an invented page", () => {
    expect(read("src/routes/preview.web-v1.companies.$symbol_.overview.tsx")).toContain(
      "<NotBuiltYet symbol={symbol} />",
    );
    expect(read("src/routes/preview.web-v1.companies.$symbol_.intelligence.tsx")).toContain(
      "<NotBuiltYet symbol={symbol} />",
    );
  });
});
