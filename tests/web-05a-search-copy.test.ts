// WEB-05A (ملاحظة Codex الوحيدة): نصوص البحث تَعِد بما يدعمه المصدر فقط.
// المصدر: 396 شركة بالاسم العربي والرمز؛ الاسم الإنجليزي موثق فقط لمن له صفحة من المحرك.
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
import {
  englishCoverage,
  isLatinQuery,
  queryDirectory,
  searchCatalog,
  SEARCH_COPY,
  type DirectoryEntry,
} from "../src/lib/web-v1/catalog";
import { LISTED_COMPANIES } from "../src/lib/web-v1/listed-companies.data";
import { SearchResults } from "../src/components/web-v1/site-search";
import { I18nProvider } from "../src/lib/i18n";

const router = createRouter({
  routeTree: createRootRoute(),
  history: createMemoryHistory({ initialEntries: ["/"] }),
});
const ssr = (el: ReactElement) =>
  renderToStaticMarkup(
    createElement(RouterContextProvider, { router }, createElement(I18nProvider, null, el)),
  );

// الأسماء الإنجليزية كما يبنيها الخادم: من صفحات المحرك فقط (الأسماء القانونية في fixtures v5).
const ENGLISH: Record<string, string> = {
  "2222": "Saudi Arabian Oil Company (Aramco)",
  "1120": "Al Rajhi Bank",
  "8010": "The Company for Cooperative Insurance (Tawuniya)",
};
const ENTRIES: DirectoryEntry[] = LISTED_COMPANIES.map(([symbol, ar, board]) => ({
  symbol,
  board,
  name: { ar, en: ENGLISH[symbol] ?? null },
  sector: null,
  industry: null,
  dataStatus: ENGLISH[symbol] ? "engine_page" : "listed_only",
  readiness: null,
  latestFiling: null,
}));
const symbols = (q: string) => queryDirectory(ENTRIES, { q, page: 99 }).items.map((e) => e.symbol);

describe("search behaviour (unchanged algorithm)", () => {
  test("Arabic name: «سابك» finds SABIC (2010)", () => {
    expect(symbols("سابك")).toContain("2010");
  });

  test("ticker: 2010 and Arabic-Indic ١١٢٠ rank the company first", () => {
    expect(symbols("2010")[0]).toBe("2010");
    expect(symbols("١١٢٠")[0]).toBe("1120");
  });

  test("English works where a documented English name exists", () => {
    expect(symbols("Al Rajhi")[0]).toBe("1120");
    expect(symbols("aramco")[0]).toBe("2222");
    expect(symbols("tawuniya")[0]).toBe("8010");
  });

  test("SABIC in English finds nothing: the source has no English name for 2010", () => {
    expect(ENTRIES.find((e) => e.symbol === "2010")!.name.en).toBeNull();
    expect(symbols("SABIC")).toEqual([]);
  });

  test("English coverage is partial and stated as such (3 of 396), never implied to be complete", () => {
    const c = englishCoverage(ENTRIES);
    expect(c.en).toBe(
      "English names are available for 3 of 396 companies; the rest by Arabic name and ticker.",
    );
    expect(c.ar).toContain("3 من 396");
  });
});

describe("search copy is accurate in Arabic and English", () => {
  test("the main prompt is the agreed wording", () => {
    expect(SEARCH_COPY.placeholder.ar).toBe(
      "ابحث باسم الشركة العربي أو رمزها، وبالإنجليزية عند توفر الاسم",
    );
    expect(SEARCH_COPY.placeholder.en).toBe(
      "Search by ticker or Arabic company name. English names are supported where available.",
    );
  });

  test("no copy promises English names for every company", () => {
    for (const text of Object.values(SEARCH_COPY)) {
      expect(text.en).not.toMatch(/arabic or english|english or arabic|company name or ticker/i);
      expect(text.ar).not.toMatch(/العربي أو الإنجليزي|بالعربية أو الإنجليزية/);
    }
  });

  test("the pages and components carry no stale promise", () => {
    const files = [
      "src/components/web-v1/shell.tsx",
      "src/components/web-v1/site-search.tsx",
      "src/routes/preview.web-v1.index.tsx",
      "src/routes/preview.web-v1.companies.index.tsx",
      "src/routes/preview.web-v1.search.tsx",
    ];
    for (const f of files) {
      const src = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
      expect(src, f).not.toMatch(
        /Arabic or English|in Arabic or English|العربي أو الإنجليزي|بالعربية أو الإنجليزية|"Company name or ticker"|"Company name, ticker/,
      );
    }
  });

  test("idle state explains the limit in both languages", () => {
    const html = ssr(createElement(SearchResults, { status: { state: "idle" } }));
    expect(html).toContain(SEARCH_COPY.idle.ar);
  });

  test("a Latin query with no results says English names are limited; an Arabic one does not", () => {
    expect(isLatinQuery("SABIC")).toBe(true);
    expect(isLatinQuery("سابك")).toBe(false);
    expect(isLatinQuery("2010")).toBe(false);
    const latin = ssr(
      createElement(SearchResults, {
        status: { state: "done", response: searchCatalog(ENTRIES, "SABIC") },
      }),
    );
    expect(latin).toContain('data-search-state="empty"');
    expect(latin).toContain(SEARCH_COPY.latinEmpty.ar);
    const arabic = ssr(
      createElement(SearchResults, {
        status: { state: "done", response: searchCatalog(ENTRIES, "زززز") },
      }),
    );
    expect(arabic).toContain(SEARCH_COPY.empty.ar);
    expect(arabic).not.toContain(SEARCH_COPY.latinEmpty.ar);
  });
});
