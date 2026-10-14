// WEB-05B: الأسواق والقطاعات. منطق خالص + عرض الجدول على الخادم + حراسة من الأرقام والتصنيفات غير الموثقة.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement, type ReactElement } from "react";
import {
  RouterContextProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { searchCatalog, type DirectoryEntry } from "../src/lib/web-v1/catalog";
import {
  boardSummary,
  findSector,
  parseTableQuery,
  queryTable,
  saudiSummary,
  sectorIndex,
  sectorSlug,
  TABLE_DEFAULTS,
  TABLE_PAGE_SIZE,
} from "../src/lib/web-v1/markets";
import { LISTED_COMPANIES } from "../src/lib/web-v1/listed-companies.data";
import { CompanyTable } from "../src/components/web-v1/company-table";
import { I18nProvider } from "../src/lib/i18n";

// كما يبنيها الخادم: هوية من قائمة السوق، والقطاع والصناعة من صفحات المحرك الثلاث فقط (fixtures v5).
const ENGINE: Record<string, { en: string; sector: string; industry: string }> = {
  "2222": {
    en: "Saudi Arabian Oil Company (Aramco)",
    sector: "Energy",
    industry: "Integrated Oil & Gas",
  },
  "1120": { en: "Al Rajhi Bank", sector: "Financials", industry: "Banks" },
  "8010": {
    en: "The Company for Cooperative Insurance (Tawuniya)",
    sector: "Financials",
    industry: "Insurance",
  },
};
const ENTRIES: DirectoryEntry[] = LISTED_COMPANIES.map(([symbol, ar, board]) => {
  const e = ENGINE[symbol];
  return {
    symbol,
    board,
    name: { ar, en: e?.en ?? null },
    sector: e?.sector ?? null,
    industry: e?.industry ?? null,
    dataStatus: e ? "engine_page" : "listed_only",
    readiness: e ? { investorTopics: "not_assessed", operationalCategories: "not_assessed" } : null,
    latestFiling: null,
  };
});
const q = (patch: Partial<typeof TABLE_DEFAULTS>) => ({ ...TABLE_DEFAULTS, ...patch });

describe("markets: counts come from the list, never typed by hand", () => {
  test("Saudi = Main + Nomu = 396; 3 with an engine page", () => {
    const s = saudiSummary(ENTRIES);
    expect(s.count).toBe(LISTED_COMPANIES.length);
    expect(s.main + s.nomu).toBe(s.count);
    expect(s.main).toBe(LISTED_COMPANIES.filter((c) => c[2] === "main").length);
    expect(s.withPages).toBe(3);
  });

  test("board summary: Nomu has no documented sector in the current sources", () => {
    expect(boardSummary(ENTRIES, "nomu").sectors).toEqual([]);
    expect(boardSummary(ENTRIES, "main").classified).toBe(3);
  });
});

describe("sectors: documented only, labels as in the source", () => {
  test("every sector comes from an entry's documented sector; nothing else is invented", () => {
    const idx = sectorIndex(ENTRIES);
    expect(idx.sectors.map((s) => s.name)).toEqual(["Financials", "Energy"]);
    expect(idx.classified).toBe(3);
    expect(idx.unclassified.count).toBe(393);
    expect(idx.sectors[0]!.industries).toEqual([
      { name: "Banks", count: 1 },
      { name: "Insurance", count: 1 },
    ]);
  });

  test("slugs are stable and readable", () => {
    expect(sectorSlug("Financials")).toBe("financials");
    expect(sectorSlug("Communication Services")).toBe("communication-services");
    expect(sectorSlug("Integrated Oil & Gas")).toBe("integrated-oil-and-gas");
  });

  test("findSector: known, unclassified, unknown", () => {
    expect(findSector(ENTRIES, "financials")).toMatchObject({
      kind: "sector",
      sector: { count: 2 },
    });
    expect(findSector(ENTRIES, "unclassified")).toMatchObject({
      kind: "unclassified",
      summary: { count: 393 },
    });
    expect(findSector(ENTRIES, "banks")).toBeNull();
  });

  test("unified search sends a sector result to its sector page", () => {
    const r = searchCatalog(ENTRIES, "Financials");
    expect(r.groups.sectors).toMatchObject({
      state: "results",
      items: [{ href: "/preview/web-v1/sectors/financials" }],
    });
  });
});

describe("company table: search, filters, sort, pages", () => {
  test("filters by sector slug, unclassified, industry, data status, board", () => {
    expect(queryTable(ENTRIES, q({ sector: "financials" })).total).toBe(2);
    expect(queryTable(ENTRIES, q({ sector: "unclassified" })).total).toBe(393);
    expect(
      queryTable(ENTRIES, q({ sector: "financials", industry: "Insurance" })).rows[0]!.symbol,
    ).toBe("8010");
    expect(queryTable(ENTRIES, q({ data: "engine_page" })).total).toBe(3);
    expect(queryTable(ENTRIES, q({ board: "nomu", sector: "financials" })).total).toBe(0);
    // رابط قطاع غير موثق لا يعيد الجدول كله.
    expect(queryTable(ENTRIES, q({ sector: "made-up" })).total).toBe(0);
  });

  test("search uses the directory matching (ticker, Arabic name, documented English)", () => {
    expect(queryTable(ENTRIES, q({ q: "١١٢٠" })).rows[0]!.symbol).toBe("1120");
    expect(queryTable(ENTRIES, q({ q: "الراجحي" })).rows[0]!.symbol).toBe("1120");
    expect(queryTable(ENTRIES, q({ q: "SABIC" })).total).toBe(0);
  });

  test("fixed-size pages, clamped page number, from/to range", () => {
    const p1 = queryTable(ENTRIES, q({}));
    expect(p1.rows).toHaveLength(TABLE_PAGE_SIZE);
    expect([p1.from, p1.to, p1.pages]).toEqual([1, 50, Math.ceil(396 / 50)]);
    const last = queryTable(ENTRIES, q({ page: 999 }));
    expect(last.page).toBe(last.pages);
    expect(last.to).toBe(396);
    const sorted = queryTable(ENTRIES, q({ sort: "name" })).rows.map((e) => e.name.ar);
    expect(sorted).toEqual([...sorted].sort((a, b) => a.localeCompare(b, "ar")));
  });

  test("URL parsing: unknown values fall back to safe defaults; numeric q kept as text", () => {
    expect(parseTableQuery({ board: "x", data: "y", sort: "z", page: "-4", q: 1120 })).toEqual({
      ...TABLE_DEFAULTS,
      q: "1120",
    });
    expect(parseTableQuery({ sector: "", page: "3.7" })).toMatchObject({ sector: "all", page: 3 });
  });
});

describe("rendering and guards", () => {
  const router = createRouter({
    routeTree: createRootRoute(),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  const ssr = (el: ReactElement) =>
    renderToStaticMarkup(
      createElement(RouterContextProvider, { router }, createElement(I18nProvider, null, el)),
    );

  test("table: unclassified cell says so; sector links to its page; only engine pages are links", () => {
    const html = ssr(
      createElement(CompanyTable, {
        entries: ENTRIES,
        query: q({ q: "" }),
        onChange: () => {},
        show: { sector: true },
      }),
    );
    expect(html).toContain('data-table-count="396"');
    expect(html).toContain('data-sector-cell="unclassified"');
    const fin = ssr(
      createElement(CompanyTable, {
        entries: ENTRIES,
        query: q({ sector: "financials" }),
        onChange: () => {},
      }),
    );
    expect(fin).toContain('href="/preview/web-v1/sectors/financials?');
    expect(fin).toContain('data-open-company="1120"');
    expect(fin).not.toContain('data-open-company="1010"');
  });

  test("an empty result explains itself instead of showing an empty table", () => {
    const html = ssr(
      createElement(CompanyTable, {
        entries: ENTRIES,
        query: q({ q: "zzqq" }),
        onChange: () => {},
      }),
    );
    expect(html).toContain("data-table-empty");
    expect(html).not.toContain("data-table-desktop");
  });

  test("new pages carry no prices, percent changes or hand-written sector classification", () => {
    const files = [
      "src/lib/web-v1/markets.ts",
      "src/components/web-v1/company-table.tsx",
      "src/components/web-v1/market-parts.tsx",
      "src/routes/preview.web-v1.markets.index.tsx",
      "src/routes/preview.web-v1.markets.saudi.index.tsx",
      "src/routes/preview.web-v1.markets.saudi.$board.tsx",
      "src/routes/preview.web-v1.sectors.index.tsx",
      "src/routes/preview.web-v1.sectors.$slug.tsx",
    ];
    for (const f of files) {
      const src = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
      // لا أرقام مكتوبة يدويًا لأسعار أو تغيّر أو قيمة سوقية.
      expect(src, f).not.toMatch(/marketCap|\bprice\s*:|change\s*:|toFixed\(|[+-]\d+(\.\d+)?%/);
      // لا قائمة قطاعات مكتوبة (عربية أو إنجليزية): القطاع يأتي من المصدر فقط.
      expect(src, f).not.toMatch(
        /"(Financials|Energy|Materials|Utilities|Real Estate|Health Care|Industrials)"|البنوك|الطاقة|المواد الأساسية|التأمين|الاتصالات/,
      );
    }
  });
});
