// MAREFA-WEB-V1 / WEB-06 Visual Polish: approved decisions D1–D13 (display layer only).
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
import { normalizeFactoryCoverage } from "../src/lib/engine/readiness";
import { FROZEN_SAMPLE_TOPIC_REASON_EN } from "../src/lib/web-v1/model";
import { displayLabel, labelVariants, TAXONOMY_AR } from "../src/lib/web-v1/display-labels";
import {
  matchScore,
  queryDirectory,
  searchCatalog,
  type DirectoryEntry,
  type SearchResponse,
} from "../src/lib/web-v1/catalog";
import { FactoryPanel } from "../src/components/web-v1/factory-panel";
import { FinancialExplorer } from "../src/components/web-v1/financial-explorer";
import { CompanyHero, GroupView } from "../src/components/web-v1/company-template";
import { SearchResults } from "../src/components/web-v1/site-search";
import { LanguageMark } from "../src/components/web-v1/display-label";

const fixturePages = Object.fromEntries(
  ["2222", "1120", "8010"].map((s) => [
    s,
    JSON.parse(
      gunzipSync(
        readFileSync(new URL(`./fixtures/codex-20261013/${s}-page.json.gz`, import.meta.url)),
      ).toString(),
    ),
  ]),
);
mock.module("virtual:marefa-design-fixtures", () => ({ default: fixturePages }));
const { frozenDesignPreview } = await import("../src/lib/web-v1/design-fixtures.server");

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const frozen = (s: string) => {
  const r = frozenDesignPreview({ market: "SA", symbol: s });
  if (r.state !== "ok") throw new Error(r.state);
  return r.preview;
};
const router = createRouter({
  routeTree: createRootRoute(),
  history: createMemoryHistory({ initialEntries: ["/"] }),
});
const ssr = (el: ReactElement, locale: "ar" | "en" = "ar") => {
  // I18nProvider reads the stored locale on the client only; SSR renders Arabic by default.
  void locale;
  return renderToStaticMarkup(
    createElement(RouterContextProvider, { router }, createElement(I18nProvider, null, el)),
  );
};

describe("D3: one page-level frozen notice; item states kept", () => {
  test("the display constant matches the reason the frozen fixtures add (Codex file, unchanged)", () => {
    expect(read("src/lib/web-v1/design-fixtures.server.ts")).toContain(
      FROZEN_SAMPLE_TOPIC_REASON_EN,
    );
  });

  test("business tab: one notice, the general reason never repeated per topic, own reasons kept", () => {
    const p = frozen("2222");
    const html = ssr(createElement(GroupView, { p, tab: "business", peers: null }));
    expect(html.match(/data-page-notice/g)).toHaveLength(1);
    expect(html).not.toContain("عينة تطوير مجمدة؛ لا تقييم معتمد");
    // the model still carries the reason (nothing removed from data)
    expect(
      p.topics.every((t) => t.reasons.some((r) => r.en === FROZEN_SAMPLE_TOPIC_REASON_EN)),
    ).toBe(true);
    // topic-specific reasons other than the frozen one are still rendered
    const own = p.topics
      .filter((t) => [1, 2, 10, 11].includes(t.ordinal))
      .flatMap((t) => t.reasons.filter((r) => r.en !== FROZEN_SAMPLE_TOPIC_REASON_EN));
    expect(own.length).toBeGreaterThan(0);
    for (const r of own) expect(html).toContain(r.ar.slice(0, 20));
  });
});

describe("D1/D2: identity links wrap; corporate actions separated", () => {
  test("long URLs are real links (ltr, wrap anywhere), not clipped text", () => {
    const html = ssr(createElement(GroupView, { p: frozen("2222"), tab: "business", peers: null }));
    const links = [...html.matchAll(/<a[^>]*data-fact-link[^>]*>/g)].map((m) => m[0]);
    expect(links.length).toBeGreaterThan(0);
    for (const a of links) {
      expect(a).toMatch(/href="https:\/\//);
      expect(a).toContain('dir="ltr"');
    }
    expect(html).toContain("[overflow-wrap:anywhere]");
  });

  test("every corporate action keeps its title, amount and date as separate labelled fields", () => {
    const p = frozen("2222");
    const rows = p.topics
      .flatMap((t) => t.blocks)
      .flatMap((b) => (b.type === "actions" ? b.rows : []));
    expect(rows.length).toBeGreaterThan(0);
    const html = ssr(createElement(GroupView, { p, tab: "shareholders", peers: null }));
    expect(html.match(/data-action="/g) ?? html.match(/data-action[ >]/g)).toHaveLength(
      rows.length,
    );
    expect(html.match(/data-action-amount/g)).toHaveLength(rows.length);
    expect(html.match(/data-action-date/g)).toHaveLength(rows.length);
    const list = /<ul[^>]*data-actions[\s\S]*?<\/ul>/.exec(html)![0];
    expect(list).not.toMatch(/truncate|line-clamp/);
    for (const r of rows.filter((x) => !x.amount)) void r;
    expect(list).not.toMatch(/<dd[^>]*>—<\/dd>/);
  });
});

describe("D9: sector and industry crumbs link to existing preview routes", () => {
  test("2222: sector page and industry-filtered sector page; labels from the display dictionary", () => {
    const html = ssr(createElement(CompanyHero, { p: frozen("2222") }));
    expect(html).toMatch(/data-crumb-sector="energy"/);
    expect(html).toMatch(/data-crumb-sector="energy" href="\/preview\/web-v1\/sectors\/energy\?/);
    expect(html).toMatch(/industry=Integrated(\+|%20)Oil(\+|%20)%26(\+|%20)Gas/);
    expect(html).toContain("الطاقة");
    expect(html).toContain("النفط والغاز المتكاملة");
  });
});

describe("D5: display dictionary", () => {
  test("translation is display-only and never assigns a sector", () => {
    expect(displayLabel("Banks", "ar")).toEqual({
      text: "البنوك",
      lang: "ar",
      original: "Banks",
      untranslated: false,
    });
    expect(displayLabel("Banks", "en").text).toBe("Banks");
    // unknown labels are shown as-is, marked, never machine-translated
    expect(displayLabel("Semiconductors", "ar")).toEqual({
      text: "Semiconductors",
      lang: "en",
      original: null,
      untranslated: true,
    });
    expect(labelVariants("Semiconductors")).toEqual(["Semiconductors"]);
  });

  test("dictionary keys are exactly the engine labels used by the three preview pages", () => {
    const labels = new Set<string>();
    for (const s of ["2222", "1120", "8010"]) {
      const c = frozen(s).company;
      for (const v of [c.sector, c.industry, c.exchange]) if (v) labels.add(v);
    }
    for (const l of labels) if (!/[؀-ۿ]/.test(l)) expect(TAXONOMY_AR[l]).toBeDefined();
  });

  const E = (o: Partial<DirectoryEntry>): DirectoryEntry =>
    ({
      symbol: "1120",
      name: { ar: "الراجحي", en: "Al Rajhi" },
      board: "main",
      sector: "Financials",
      industry: "Banks",
      dataStatus: "engine_page",
      readiness: null,
      latestFiling: null,
      ...o,
    }) as DirectoryEntry;

  test("Arabic search finds the English source label; the entry itself is unchanged", () => {
    const e = E({});
    const before = JSON.stringify(e);
    expect(matchScore(e, "البنوك")).toBeGreaterThan(0);
    expect(matchScore(E({ sector: null, industry: null }), "البنوك")).toBe(0);
    expect(JSON.stringify(e)).toBe(before);
    // filters still key on the source label / slug
    expect(queryDirectory([e], { q: "", sector: "Financials" }).items).toHaveLength(1);
    const r = searchCatalog([e], "القطاع المالي");
    expect(r.groups.sectors.state).toBe("results");
    if (r.groups.sectors.state === "results") {
      expect(r.groups.sectors.items[0]!.href).toBe("/preview/web-v1/sectors/financials");
      expect(r.groups.sectors.items[0]!.title).toEqual({ ar: "القطاع المالي", en: "Financials" });
    }
  });

  test("no sector literals leak into the guarded market files", () => {
    for (const f of ["src/lib/web-v1/markets.ts", "src/components/web-v1/company-table.tsx"])
      expect(read(f)).not.toMatch(/"Financials"|"Energy"|البنوك|الطاقة|التأمين/);
  });

  test("language marks only on real words, never on dates, codes or numbers", () => {
    for (const x of ["2019-12-11", "1933", "SA14TG012N13", "SAR"])
      expect(ssr(createElement(LanguageMark, { text: x }))).not.toContain("data-language-mark");
    expect(ssr(createElement(LanguageMark, { text: "Saudi joint stock company" }))).toContain(
      'data-language-mark="en"',
    );
  });
});

describe("D6: statements split by section; condensed view removes nothing", () => {
  for (const s of ["2222", "1120", "8010"])
    test(`${s}: every row of every section stays in the DOM`, () => {
      const p = frozen(s);
      const view = p.statements.find((v) => v.status === "available")!;
      const html = ssr(createElement(FinancialExplorer, { views: p.statements, kind: p.kind }));
      expect(html).toContain("data-section-tabs");
      const sections = new Set(view.rows.map((r) => r.section));
      expect(html.match(/<tbody[^>]*data-section=/g)).toHaveLength(sections.size);
      expect(html.match(/<tbody hidden=""/g)?.length ?? 0).toBe(sections.size - 1);
      for (const r of view.rows) expect(html).toContain(`data-row="${r.key}"`);
      // only rows without any shown value are condensed on mobile
      const hidden = [...html.matchAll(/data-row="([^"]+)" data-condensed-hidden="true"/g)].map(
        (m) => m[1],
      );
      const noValue = new Set(
        view.rows.filter((r) => !r.cells.some((c) => c.state === "value")).map((r) => r.key),
      );
      for (const k of hidden) expect(noValue.has(k!)).toBe(true);
      const first = view.rows.filter((r) => r.section === view.rows[0]!.section);
      for (const r of first) if (noValue.has(r.key)) expect(hidden).toContain(r.key);
    });
});

describe("D7: factory panel when not assessed", () => {
  test("one clear summary, 95% rule stated, compact map, detailed table closed", () => {
    const html = ssr(createElement(FactoryPanel, { factory: normalizeFactoryCoverage(undefined) }));
    expect(html).toContain("data-not-assessed-summary");
    expect(html).toContain("لم تُقيّم البيانات بعد");
    expect(html).toContain("95%");
    expect(html).toMatch(/<details[^>]*data-category-table/);
    expect(html).not.toMatch(/<details[^>]*open=""[^>]*data-category-table/);
    expect(html.match(/data-category="/g)).toHaveLength(18);
    const map = /<ol[^>]*data-category-map[\s\S]*?<\/ol>/.exec(html)![0];
    expect(map.match(/<li/g)).toHaveLength(18);
    expect(map).not.toContain("لم يُقيَّم"); // state shown once above, not per tile
    expect(html).not.toContain("data-factory-score");
  });

  test("assessed panels keep the open table (no behaviour change when data exists)", () => {
    const raw = JSON.parse(
      gunzipSync(
        readFileSync(new URL("./fixtures/web-v1/factory-b70254e.json.gz", import.meta.url)),
      ).toString(),
    ).companies["sa:2222"];
    const html = ssr(createElement(FactoryPanel, { factory: normalizeFactoryCoverage(raw) }));
    expect(html).toMatch(/<details[^>]*open=""[^>]*data-category-table/);
    expect(html).not.toContain("data-not-assessed-summary");
  });
});

describe("D12: search states", () => {
  const base = (
    r: SearchResponse["groups"]["research"],
    k: SearchResponse["groups"]["knowledge"],
  ) =>
    ({
      query: "x",
      source: "frozen_catalog",
      groups: {
        companies: {
          state: "results",
          items: [{ id: "1", title: { ar: "أ", en: "A" }, subtitle: null, href: null, badge: "1" }],
        },
        sectors: { state: "empty" },
        research: r,
        knowledge: k,
      },
    }) as SearchResponse;
  const U = { state: "unavailable", reason: { ar: "غير متاح", en: "n/a" } } as const;
  const X = { state: "error", reason: { ar: "خطأ", en: "error" } } as const;

  test("both unavailable: one merged short message", () => {
    const html = ssr(
      createElement(SearchResults, { status: { state: "done", response: base(U, U) } }),
    );
    expect(html.match(/data-search-group="library"/g)).toHaveLength(1);
    expect(html).not.toContain('data-search-group="research"');
    expect(html).not.toContain('data-search-group="knowledge"');
  });

  test("an error is never merged into 'unavailable'", () => {
    const html = ssr(
      createElement(SearchResults, { status: { state: "done", response: base(X, U) } }),
    );
    expect(html).not.toContain('data-search-group="library"');
    expect(html).toContain('data-search-group="research" data-group-state="error"');
    expect(html).toContain('data-search-group="knowledge" data-group-state="unavailable"');
  });
});

describe("D10: deferred features", () => {
  test("recorded as deferred in the scope log, not done and not cancelled", () => {
    const log = read("product-tracking/SCOPE_DEFERRED.md");
    for (const k of ["watchlist", "community", "accounts", "newsletter"])
      expect(log).toMatch(new RegExp("`" + k + "`[^\\n]*DEFERRED"));
    expect(log).not.toMatch(/CANCELLED|COMPLETED/);
  });

  test("allowlist addition is the exact branch name, nothing broader", () => {
    const src = read("src/lib/web-v1/design-review-policy.ts");
    expect(src).toContain('"claude/web-06-visual-polish"');
    expect(src).not.toMatch(/startsWith|RegExp|\*"/);
  });
});
